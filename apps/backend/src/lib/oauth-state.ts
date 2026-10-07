import { createHmac, timingSafeEqual } from "node:crypto";
import { config } from "../config";

interface StatePayload {
  uid: string;
  exp: number; // unix seconds
}

// Signs the OAuth `state` param instead of persisting it server-side — this dev backend
// restarts often (tsx watch), so an in-memory store would drop in-flight OAuth attempts.
// Reuses EMAIL_SYNC_ENCRYPTION_KEY as the HMAC key: it's already a secret only this
// backend holds, and a state token isn't a separate trust boundary from the refresh
// tokens that key already protects.
function sign(payload: string): string {
  return createHmac("sha256", config.EMAIL_SYNC_ENCRYPTION_KEY).update(payload).digest("base64url");
}

export function signState(input: { uid: string }): string {
  const payload: StatePayload = { uid: input.uid, exp: Math.floor(Date.now() / 1000) + 600 };
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString("base64url");
  const signature = sign(payloadB64);
  return `${payloadB64}.${signature}`;
}

export function verifyState(token: string): { uid: string } | null {
  const [payloadB64, signature] = token.split(".");
  if (!payloadB64 || !signature) return null;

  const expectedSignature = sign(payloadB64);
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  let payload: StatePayload;
  try {
    payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
  } catch {
    return null;
  }

  if (typeof payload.uid !== "string" || typeof payload.exp !== "number") return null;
  if (payload.exp < Math.floor(Date.now() / 1000)) return null;

  return { uid: payload.uid };
}
