import { config } from "../../config";
import { sql } from "../../db";
import { decrypt } from "../../lib/crypto";
import {
  getMessage,
  GoogleTokenError,
  listMessages,
  refreshAccessToken,
} from "../../lib/gmail-client";
import { listCategories } from "../categories/categories.service";
import {
  type EmailConnectionRow,
  getEmailConnectionRow,
} from "../email-connections/email-connections.service";
import { createTransaction, DuplicateSourceMessageError } from "../transactions/transactions.service";
import { extractBankTransaction } from "./email-extraction";

export interface EmailSyncResult {
  status:
    | "synced"
    | "skipped_no_connection"
    | "skipped_in_progress"
    | "revoked"
    | "error";
  imported: number;
  skipped: number;
  errors: number;
}

const STALE_LOCK_MS = 2 * 60 * 1000;
const FIRST_SYNC_LOOKBACK_MS = 7 * 24 * 60 * 60 * 1000;

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

async function getValidAccessToken(row: EmailConnectionRow): Promise<string> {
  const expiresAt = row.access_token_expires_at ? new Date(row.access_token_expires_at) : null;
  const stillValid = row.access_token_encrypted && expiresAt && expiresAt.getTime() > Date.now() + 30_000;

  if (stillValid) {
    return decrypt(row.access_token_encrypted as string);
  }

  const refreshToken = decrypt(row.refresh_token_encrypted);
  const refreshed = await refreshAccessToken(refreshToken);
  const expiresAtIso = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  await sql`
    UPDATE email_connections
    SET access_token_encrypted = ${refreshed.access_token}, access_token_expires_at = ${expiresAtIso}
    WHERE user_id = ${row.user_id}
  `;

  return refreshed.access_token;
}

export async function checkAndSync(userId: string): Promise<EmailSyncResult> {
  const row = await getEmailConnectionRow(userId);

  if (!row || row.status !== "active") {
    return { status: "skipped_no_connection", imported: 0, skipped: 0, errors: 0 };
  }

  const isStale =
    row.sync_started_at && Date.now() - new Date(row.sync_started_at).getTime() > STALE_LOCK_MS;

  if (row.sync_in_progress && !isStale) {
    return { status: "skipped_in_progress", imported: 0, skipped: 0, errors: 0 };
  }

  const syncStartedAt = new Date();
  await sql`
    UPDATE email_connections
    SET sync_in_progress = true, sync_started_at = ${syncStartedAt.toISOString()}
    WHERE user_id = ${userId}
  `;

  let imported = 0;
  let skipped = 0;
  let errors = 0;

  try {
    const accessToken = await getValidAccessToken(row);

    const since = row.last_synced_at ? new Date(row.last_synced_at) : new Date(new Date(row.created_at).getTime() - FIRST_SYNC_LOOKBACK_MS);
    const afterEpochSeconds = Math.floor(since.getTime() / 1000);
    const query = `after:${afterEpochSeconds} -category:promotions -category:social`;

    const messageRefs = await listMessages(accessToken, query, config.EMAIL_SYNC_MAX_MESSAGES_PER_RUN);
    const categories = await listCategories(userId);

    for (const ref of messageRefs) {
      try {
        const email = await getMessage(accessToken, ref.id);
        const extraction = await extractBankTransaction(email, categories);

        if (!extraction.is_bank_transaction || extraction.confidence < config.EMAIL_SYNC_MIN_CONFIDENCE) {
          skipped++;
          continue;
        }

        if (extraction.amount === null || extraction.type === null) {
          skipped++;
          continue;
        }

        let categoryId = extraction.category_id;
        if (!categoryId || !categories.some((c) => c.id === categoryId)) {
          const fallbackName = extraction.type === "expense" ? "Otros gastos" : "Otros ingresos";
          const fallback = categories.find((c) => c.is_default && c.name === fallbackName);
          categoryId = fallback?.id ?? null;
        }

        if (!categoryId) {
          skipped++;
          continue;
        }

        const emailDate = new Date(email.date);
        const date = Number.isNaN(emailDate.getTime()) ? toISODate(new Date()) : toISODate(emailDate);

        await createTransaction(
          userId,
          {
            category_id: categoryId,
            amount: extraction.amount,
            type: extraction.type,
            date,
            note: extraction.note,
          },
          { source: "email-ai", sourceMessageId: email.id }
        );
        imported++;
      } catch (err) {
        if (err instanceof DuplicateSourceMessageError) {
          skipped++;
        } else {
          console.error("email-sync: failed to process message", ref.id, err);
          errors++;
        }
      }
    }

    // Only move the watermark forward when every message in this window was actually
    // resolved (imported or skipped). A message that errored (e.g. a transient Gemini
    // 503) must stay inside the next run's window — advancing past it here would lose it
    // permanently. Re-scanning already-imported messages next run is safe and cheap: the
    // unique source_message_id index turns them into a no-op skip, not a duplicate.
    if (errors === 0) {
      await sql`
        UPDATE email_connections
        SET last_synced_at = ${syncStartedAt.toISOString()}, sync_in_progress = false
        WHERE user_id = ${userId}
      `;
    } else {
      await sql`
        UPDATE email_connections
        SET sync_in_progress = false
        WHERE user_id = ${userId}
      `;
    }

    return { status: "synced", imported, skipped, errors };
  } catch (err) {
    if (err instanceof GoogleTokenError && err.code === "invalid_grant") {
      await sql`
        UPDATE email_connections
        SET status = 'revoked', last_error = ${err.message}, sync_in_progress = false
        WHERE user_id = ${userId}
      `;
      return { status: "revoked", imported, skipped, errors };
    }

    const message = err instanceof Error ? err.message : "Unknown error";
    await sql`
      UPDATE email_connections
      SET last_error = ${message}, sync_in_progress = false
      WHERE user_id = ${userId}
    `;
    console.error("email-sync: sync failed", err);
    return { status: "error", imported, skipped, errors: errors + 1 };
  }
}
