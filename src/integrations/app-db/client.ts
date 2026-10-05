// Browser client for the app's own project (auth, profiles, payments, questions).
// Publishable (anon) key — safe in client code.
import { createClient } from "@supabase/supabase-js";

export const APP_DB_URL = "https://xskunuxjjiuzgcnuafzo.supabase.co";
export const APP_DB_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhza3VudXhqaml1emdjbnVhZnpvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzNDE3MTUsImV4cCI6MjA5NjkxNzcxNX0.v2P63WwO5cm0LvhnsTTI9HJD9U46HaJfxpzEirvyaAQ";

type Client = ReturnType<typeof createClient>;
let _client: Client | undefined;

function make(): Client {
  const browser = typeof window !== "undefined";
  return createClient(APP_DB_URL, APP_DB_ANON_KEY, {
    auth: {
      storage: browser ? window.localStorage : undefined,
      persistSession: browser,
      autoRefreshToken: browser,
      detectSessionInUrl: browser,
      storageKey: "mp-app-auth",
    },
  });
}

export const appDb = new Proxy({} as Client, {
  get(_, prop, receiver) {
    if (!_client) _client = make();
    return Reflect.get(_client, prop, receiver);
  },
});
