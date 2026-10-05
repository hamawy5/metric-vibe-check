import { createClient } from "@supabase/supabase-js";
import { APP_DB_URL } from "./client";

/** Service-role client for the app project. Server only; bypasses RLS. */
export function getAppAdmin() {
  const key = process.env["MY_SUPABASE_SERVICE_ROLE_KEY"]?.trim();
  if (!key) throw new Error("MY_SUPABASE_SERVICE_ROLE_KEY is not set");
  return createClient(APP_DB_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
