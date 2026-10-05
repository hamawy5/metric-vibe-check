import { createMiddleware } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { appDb, APP_DB_ANON_KEY, APP_DB_URL } from "./client";

/** Browser side: attach the app-project access token to server function calls. */
export const attachAppAuth = createMiddleware({ type: "function" }).client(async ({ next }) => {
  const { data } = await appDb.auth.getSession();
  const token = data.session?.access_token;
  return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
});

/** Server side: verify the token against the app project and expose a user-scoped client. */
export const requireAppAuth = createMiddleware({ type: "function" }).server(async ({ next }) => {
  const header = getRequest()?.headers.get("authorization") ?? "";
  if (!header.startsWith("Bearer ")) throw new Error("Unauthorized");
  const token = header.slice(7);
  const supabase = createClient(APP_DB_URL, APP_DB_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) throw new Error("Unauthorized");
  return next({
    context: { supabase, userId: data.user.id, claims: { email: data.user.email } },
  });
});
