import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  PORT: z.coerce.number().int().positive().default(4000),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  DATABASE_URL: z.string().min(1),

  // Email-sync (Gmail OAuth + AI auto-registration of transactions)
  GOOGLE_CLIENT_ID: z.string().min(1),
  GOOGLE_CLIENT_SECRET: z.string().min(1),
  GOOGLE_OAUTH_REDIRECT_URI: z.string().url(),
  ANTHROPIC_API_KEY: z.string().min(1),
  EMAIL_SYNC_ENCRYPTION_KEY: z.string().min(1), // 32 bytes, base64-encoded
  EMAIL_SYNC_LLM_MODEL: z.string().default("claude-haiku-4-5"),
  EMAIL_SYNC_MIN_CONFIDENCE: z.coerce.number().min(0).max(1).default(0.7),
  EMAIL_SYNC_MAX_MESSAGES_PER_RUN: z.coerce.number().int().positive().default(50),
});

export const config = envSchema.parse(process.env);
