import type { EmailBackfillJob } from "@finanzas/shared";
import { config } from "../../config";
import { sql } from "../../db";
import { getMessage, GoogleTokenError, listAllMessages } from "../../lib/gmail-client";
import { HttpError } from "../../middleware/error-handler";
import { listCategories } from "../categories/categories.service";
import { getEmailConnectionRow } from "../email-connections/email-connections.service";
import { createTransaction, DuplicateSourceMessageError } from "../transactions/transactions.service";
import { extractBankTransaction } from "./email-extraction";
import { getValidAccessToken } from "./email-sync.service";
import { resolveCategoryId, resolveEmailDate } from "./email-sync-helpers";

// Gmail's after:/before: operators work at day granularity. `to` is exclusive, so it's
// pushed one day forward to include the full last day of the requested range.
function toEpochSeconds(dateStr: string): number {
  return Math.floor(new Date(`${dateStr}T00:00:00Z`).getTime() / 1000);
}

function toExclusiveEndEpochSeconds(dateStr: string): number {
  const d = new Date(`${dateStr}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return Math.floor(d.getTime() / 1000);
}

export async function startBackfill(
  userId: string,
  from: string,
  to: string
): Promise<{ jobId: string }> {
  const connection = await getEmailConnectionRow(userId);
  if (!connection || connection.status !== "active") {
    throw new HttpError(409, "No active Gmail connection", "no_connection");
  }

  const [existingRunning] = await sql<{ id: string }[]>`
    SELECT id FROM email_backfill_jobs WHERE user_id = ${userId} AND status = 'running'
  `;
  if (existingRunning) {
    throw new HttpError(409, "A backfill job is already running", "job_already_running");
  }

  const [job] = await sql<{ id: string }[]>`
    INSERT INTO email_backfill_jobs (user_id, date_from, date_to)
    VALUES (${userId}, ${from}, ${to})
    RETURNING id
  `;

  // Fire-and-forget: the HTTP response returns the jobId immediately, the caller polls
  // GET /email-sync/backfill/:jobId for progress. This process is single-instance (no
  // hosting/cron here), so running it in-process is enough — see PLAN.md "Riesgos".
  void runBackfill(job.id).catch((err) => {
    console.error("email-backfill: unhandled error in runBackfill", job.id, err);
  });

  return { jobId: job.id };
}

export async function runBackfill(jobId: string): Promise<void> {
  const [job] = await sql<{ id: string; user_id: string; date_from: string; date_to: string }[]>`
    SELECT id, user_id, date_from, date_to FROM email_backfill_jobs WHERE id = ${jobId}
  `;
  if (!job) return;

  const userId = job.user_id;

  try {
    const connectionRow = await getEmailConnectionRow(userId);
    if (!connectionRow || connectionRow.status !== "active") {
      await sql`
        UPDATE email_backfill_jobs
        SET status = 'failed', last_error = 'No active Gmail connection', finished_at = now()
        WHERE id = ${jobId}
      `;
      return;
    }

    const accessToken = await getValidAccessToken(connectionRow);

    const afterEpoch = toEpochSeconds(job.date_from);
    const beforeEpoch = toExclusiveEndEpochSeconds(job.date_to);
    const query = `after:${afterEpoch} before:${beforeEpoch} -category:promotions -category:social`;

    const messageRefs = await listAllMessages(accessToken, query);

    await sql`
      UPDATE email_backfill_jobs SET total_messages = ${messageRefs.length} WHERE id = ${jobId}
    `;

    if (messageRefs.length === 0) {
      await sql`
        UPDATE email_backfill_jobs SET status = 'completed', finished_at = now() WHERE id = ${jobId}
      `;
      return;
    }

    // Cheap upfront dedupe: skip messages already imported by a previous (possibly
    // interrupted) run of this same range without paying for a Claude call again.
    const messageIds = messageRefs.map((ref) => ref.id);
    const alreadyImportedRows = await sql<{ source_message_id: string }[]>`
      SELECT source_message_id FROM transactions
      WHERE user_id = ${userId} AND source_message_id = ANY(${messageIds})
    `;
    const alreadyImported = new Set(alreadyImportedRows.map((r) => r.source_message_id));

    const categories = await listCategories(userId);

    let processed = 0;
    let imported = 0;
    let skipped = 0;
    let errors = 0;

    for (const ref of messageRefs) {
      try {
        if (alreadyImported.has(ref.id)) {
          skipped++;
          continue;
        }

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

        const categoryId = resolveCategoryId(categories, extraction);
        if (!categoryId) {
          skipped++;
          continue;
        }

        const date = resolveEmailDate(email.date);

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
          console.error("email-backfill: failed to process message", ref.id, err);
          errors++;
        }
      } finally {
        // Updated after every message (not batched at the end) so the mobile polling UI
        // shows real progress on long-running ranges.
        processed++;
        await sql`
          UPDATE email_backfill_jobs
          SET processed = ${processed}, imported = ${imported}, skipped = ${skipped}, errors = ${errors}
          WHERE id = ${jobId}
        `;
      }
    }

    await sql`
      UPDATE email_backfill_jobs SET status = 'completed', finished_at = now() WHERE id = ${jobId}
    `;
  } catch (err) {
    // A failed access-token refresh (e.g. revoked grant) or a Gmail listing failure ends
    // the whole job — rate-limit/extraction errors on individual messages are handled
    // per-message above and don't fail the job (see PLAN.md "Riesgos").
    const message =
      err instanceof GoogleTokenError
        ? err.message
        : err instanceof Error
          ? err.message
          : "Unknown error";
    console.error("email-backfill: job failed", jobId, err);
    await sql`
      UPDATE email_backfill_jobs
      SET status = 'failed', last_error = ${message}, finished_at = now()
      WHERE id = ${jobId}
    `;
  }
}

export async function getBackfillStatus(userId: string, jobId: string): Promise<EmailBackfillJob> {
  const [job] = await sql<EmailBackfillJob[]>`
    SELECT * FROM email_backfill_jobs WHERE id = ${jobId} AND user_id = ${userId}
  `;
  if (!job) {
    throw new HttpError(404, "Backfill job not found", "not_found");
  }
  return job;
}
