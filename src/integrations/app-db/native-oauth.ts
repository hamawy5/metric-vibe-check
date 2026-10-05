// Google sign-in for the Capacitor-wrapped native app.
// The web flow can't work there: Google opens in the system browser, whose storage
// is separate from the app WebView. Instead we open the in-app browser tab, Google
// redirects to our custom URL scheme, the OS hands that link back to the app, and we
// exchange the PKCE code for a session inside the WebView.
import { Capacitor } from "@capacitor/core";
import { appDb } from "./client";

/** Must match the URL scheme registered in AndroidManifest / Info.plist. */
export const NATIVE_SCHEME = "com.matricpulse.app";
export const NATIVE_REDIRECT = `${NATIVE_SCHEME}://auth-callback`;

export const isNativeApp = () =>
  typeof window !== "undefined" && Capacitor.isNativePlatform();

export async function signInWithGoogleNative() {
  const { Browser } = await import("@capacitor/browser");
  const { data, error } = await appDb.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: NATIVE_REDIRECT, skipBrowserRedirect: true },
  });
  if (error || !data?.url) throw error ?? new Error("Could not start Google sign-in");
  await Browser.open({ url: data.url, presentationStyle: "popover" });
}

let listening = false;

/** Call once at startup: captures the deep link and finishes the session in-app. */
export async function initNativeOAuthListener() {
  if (listening || !isNativeApp()) return;
  listening = true;
  const { App } = await import("@capacitor/app");
  const { Browser } = await import("@capacitor/browser");
  await App.addListener("appUrlOpen", async ({ url }) => {
    if (!url.startsWith(NATIVE_REDIRECT)) return;
    try {
      const parsed = new URL(url);
      const code = parsed.searchParams.get("code");
      if (code) {
        await appDb.auth.exchangeCodeForSession(code);
      } else {
        // Fallback for implicit-flow links: tokens arrive in the hash.
        const hash = new URLSearchParams(parsed.hash.replace(/^#/, ""));
        const access_token = hash.get("access_token");
        const refresh_token = hash.get("refresh_token");
        if (access_token && refresh_token) {
          await appDb.auth.setSession({ access_token, refresh_token });
        }
      }
    } catch (e) {
      console.error("[native-oauth] failed to complete sign-in", e);
    } finally {
      await Browser.close().catch(() => undefined);
    }
  });
}
