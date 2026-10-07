import { config } from "../config";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GMAIL_API_BASE = "https://gmail.googleapis.com/gmail/v1/users/me";
const GMAIL_READONLY_SCOPE = "https://www.googleapis.com/auth/gmail.readonly";

export class GoogleTokenError extends Error {
  constructor(
    message: string,
    public code: string
  ) {
    super(message);
  }
}

export function getAuthorizationUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: config.GOOGLE_CLIENT_ID,
    redirect_uri: config.GOOGLE_OAUTH_REDIRECT_URI,
    response_type: "code",
    scope: GMAIL_READONLY_SCOPE,
    access_type: "offline",
    prompt: "consent",
    state,
  });
  return `${GOOGLE_AUTH_URL}?${params.toString()}`;
}

interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type?: string;
}

async function postToken(body: Record<string, string>): Promise<TokenResponse> {
  const res = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body).toString(),
  });

  if (!res.ok) {
    const errorBody = (await res.json().catch(() => null)) as
      | { error?: string; error_description?: string }
      | null;
    const code = errorBody?.error ?? "unknown_error";
    throw new GoogleTokenError(errorBody?.error_description ?? "Google token request failed", code);
  }

  return (await res.json()) as TokenResponse;
}

export async function exchangeCodeForTokens(
  code: string
): Promise<{ access_token: string; refresh_token: string; expires_in: number }> {
  const tokens = await postToken({
    code,
    client_id: config.GOOGLE_CLIENT_ID,
    client_secret: config.GOOGLE_CLIENT_SECRET,
    redirect_uri: config.GOOGLE_OAUTH_REDIRECT_URI,
    grant_type: "authorization_code",
  });

  if (!tokens.refresh_token) {
    // Google only returns a refresh_token on the first consent (or when prompt=consent
    // forces re-consent, which getAuthorizationUrl always sets) — if it's still missing
    // here, something about the OAuth client config is off (e.g. access_type not offline).
    throw new GoogleTokenError(
      "Google did not return a refresh_token — check access_type=offline/prompt=consent",
      "missing_refresh_token"
    );
  }

  return {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in,
  };
}

export async function refreshAccessToken(
  refreshToken: string
): Promise<{ access_token: string; expires_in: number }> {
  try {
    const tokens = await postToken({
      refresh_token: refreshToken,
      client_id: config.GOOGLE_CLIENT_ID,
      client_secret: config.GOOGLE_CLIENT_SECRET,
      grant_type: "refresh_token",
    });
    return { access_token: tokens.access_token, expires_in: tokens.expires_in };
  } catch (err) {
    if (err instanceof GoogleTokenError) throw err;
    throw new GoogleTokenError("Failed to refresh Google access token", "unknown_error");
  }
}

interface GmailMessageRef {
  id: string;
}

export async function listMessages(
  accessToken: string,
  query: string,
  maxResults: number
): Promise<GmailMessageRef[]> {
  const params = new URLSearchParams({ q: query, maxResults: String(maxResults) });
  const res = await fetch(`${GMAIL_API_BASE}/messages?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Gmail listMessages failed: ${res.status} ${await res.text()}`);
  }

  const body = (await res.json()) as { messages?: GmailMessageRef[] };
  return body.messages ?? [];
}

export async function getProfile(accessToken: string): Promise<{ emailAddress: string }> {
  const res = await fetch(`${GMAIL_API_BASE}/profile`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Gmail getProfile failed: ${res.status} ${await res.text()}`);
  }

  return (await res.json()) as { emailAddress: string };
}

export interface GmailMessage {
  id: string;
  from: string;
  subject: string;
  date: string;
  bodyText: string;
}

interface GmailPayloadPart {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPayloadPart[];
}

function decodeBase64Url(data: string): string {
  return Buffer.from(data, "base64url").toString("utf8");
}

function stripHtmlTags(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findPart(
  part: GmailPayloadPart | undefined,
  mimeType: string
): GmailPayloadPart | undefined {
  if (!part) return undefined;
  if (part.mimeType === mimeType && part.body?.data) return part;
  for (const child of part.parts ?? []) {
    const found = findPart(child, mimeType);
    if (found) return found;
  }
  return undefined;
}

const MAX_BODY_LENGTH = 4000;

export async function getMessage(accessToken: string, id: string): Promise<GmailMessage> {
  const res = await fetch(`${GMAIL_API_BASE}/messages/${id}?format=full`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!res.ok) {
    throw new Error(`Gmail getMessage failed: ${res.status} ${await res.text()}`);
  }

  const body = (await res.json()) as {
    payload?: GmailPayloadPart & { headers?: { name: string; value: string }[] };
  };
  const headers = body.payload?.headers ?? [];
  const getHeader = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? "";

  const plainPart = findPart(body.payload, "text/plain");
  const htmlPart = findPart(body.payload, "text/html");

  let bodyText = "";
  if (plainPart?.body?.data) {
    bodyText = decodeBase64Url(plainPart.body.data);
  } else if (htmlPart?.body?.data) {
    bodyText = stripHtmlTags(decodeBase64Url(htmlPart.body.data));
  }

  return {
    id,
    from: getHeader("From"),
    subject: getHeader("Subject"),
    date: getHeader("Date"),
    bodyText: bodyText.slice(0, MAX_BODY_LENGTH),
  };
}
