import { createClient } from "@supabase/supabase-js";
import { config } from "../config";

// Service-role client used server-side only, to verify user access tokens.
// Never expose this client or its key to the mobile app.
export const supabaseAdmin = createClient(
  config.SUPABASE_URL,
  config.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);
