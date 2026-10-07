import type { EmailConnection } from "@finanzas/shared";
import { sql } from "../../db";
import { encrypt } from "../../lib/crypto";
import { exchangeCodeForTokens, getAuthorizationUrl, getProfile } from "../../lib/gmail-client";
import { signState, verifyState } from "../../lib/oauth-state";
import { HttpError } from "../../middleware/error-handler";

export interface EmailConnectionRow {
  user_id: string;
  email: string;
  refresh_token_encrypted: string;
  access_token_encrypted: string | null;
  access_token_expires_at: string | null;
  status: "active" | "error" | "revoked";
  last_error: string | null;
  last_synced_at: string | null;
  sync_in_progress: boolean;
  sync_started_at: string | null;
  created_at: string;
}

export async function getEmailConnectionRow(
  userId: string
): Promise<EmailConnectionRow | undefined> {
  const [row] = await sql<EmailConnectionRow[]>`
    SELECT * FROM email_connections WHERE user_id = ${userId}
  `;
  return row;
}

export async function getEmailConnection(userId: string): Promise<EmailConnection> {
  const row = await getEmailConnectionRow(userId);
  if (!row) {
    return { connected: false, email: null, status: null, last_synced_at: null, last_error: null };
  }
  return {
    connected: true,
    email: row.email,
    status: row.status,
    last_synced_at: row.last_synced_at,
    last_error: row.last_error,
  };
}

export function startGoogleConnection(userId: string): { authorizeUrl: string } {
  const state = signState({ uid: userId });
  return { authorizeUrl: getAuthorizationUrl(state) };
}

export async function handleGoogleCallback(
  code: string | undefined,
  state: string | undefined
): Promise<{ status: "success" | "error" }> {
  if (!code || !state) return { status: "error" };

  const verified = verifyState(state);
  if (!verified) return { status: "error" };

  try {
    const tokens = await exchangeCodeForTokens(code);
    const profile = await getProfile(tokens.access_token);
    const accessTokenExpiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

    await sql`
      INSERT INTO email_connections (
        user_id, email, refresh_token_encrypted, access_token_encrypted,
        access_token_expires_at, status, last_error
      )
      VALUES (
        ${verified.uid}, ${profile.emailAddress}, ${encrypt(tokens.refresh_token)},
        ${encrypt(tokens.access_token)}, ${accessTokenExpiresAt}, 'active', null
      )
      ON CONFLICT (user_id) DO UPDATE SET
        email = excluded.email,
        refresh_token_encrypted = excluded.refresh_token_encrypted,
        access_token_encrypted = excluded.access_token_encrypted,
        access_token_expires_at = excluded.access_token_expires_at,
        status = 'active',
        last_error = null
    `;

    return { status: "success" };
  } catch (err) {
    console.error("email-connections: google callback failed", err);
    return { status: "error" };
  }
}

export async function disconnectEmailConnection(userId: string): Promise<void> {
  const result = await sql`DELETE FROM email_connections WHERE user_id = ${userId}`;
  if (result.count === 0) {
    throw new HttpError(404, "No email connection found", "not_found");
  }
}
