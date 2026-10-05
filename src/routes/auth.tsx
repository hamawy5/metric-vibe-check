import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Mail, Lock, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { appDb as supabase } from "@/integrations/app-db/client";
import {
  initNativeOAuthListener,
  isNativeApp,
  signInWithGoogleNative,
} from "@/integrations/app-db/native-oauth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — MatricPulse AI" },
      {
        name: "description",
        content:
          "Create your MatricPulse AI account to track streaks, take mock exams, and study with the AI tutor.",
      },
      { property: "og:title", content: "Sign in — MatricPulse AI" },
      {
        property: "og:description",
        content: "Create your MatricPulse AI account and start studying for the national exam.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

type Mode = "login" | "signup";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [awaitingConfirm, setAwaitingConfirm] = useState(false);

  // If a session already exists (or arrives via OAuth), go Home.
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (active && data.session) navigate({ to: "/", replace: true });
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (session) navigate({ to: "/", replace: true });
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        if (!data.session) {
          setAwaitingConfirm(true);
          return;
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    setBusy(true);
    if (isNativeApp()) {
      try {
        await signInWithGoogleNative();
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Google sign-in failed");
      } finally {
        setBusy(false);
      }
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth` },
    });
    if (error) {
      toast.error(error.message || "Google sign-in failed");
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col justify-center px-5 pb-10 pt-14">
      <div className="mb-8 text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)]">
          <Sparkles className="h-7 w-7" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight">
          Matric<span className="bg-[image:var(--gradient-primary)] bg-clip-text text-transparent">Pulse AI</span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "login" ? "Welcome back — sign in to keep your streak." : "Create your account and start your free trial."}
        </p>
      </div>

      {awaitingConfirm ? (
        <div className="rounded-3xl border border-white/5 bg-card p-6 text-center shadow-xl">
          <Mail className="mx-auto h-8 w-8 text-primary" />
          <h2 className="mt-3 text-lg font-semibold">Check your email</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            We sent a confirmation link to <span className="font-medium text-foreground">{email}</span>. Tap it to
            activate your account, then come back and sign in.
          </p>
          <button
            type="button"
            onClick={() => {
              setAwaitingConfirm(false);
              setMode("login");
            }}
            className="mt-5 w-full rounded-2xl border border-slate-200/80 bg-card px-4 py-3 text-sm font-semibold transition hover:border-primary/40 dark:border-white/10"
          >
            Back to sign in
          </button>
        </div>
      ) : (
        <div className="rounded-3xl border border-white/5 bg-card p-5 shadow-xl">
          <form onSubmit={submit} className="space-y-3">
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Email
              </span>
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-secondary/40 px-3 dark:border-white/10">
                <Mail className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Password
              </span>
              <div className="flex items-center gap-2 rounded-2xl border border-slate-200/80 bg-secondary/40 px-3 dark:border-white/10">
                <Lock className="h-4 w-4 shrink-0 text-muted-foreground" />
                <input
                  type="password"
                  required
                  minLength={6}
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
                />
              </div>
            </label>

            <button
              type="submit"
              disabled={busy}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl bg-[image:var(--gradient-primary)] px-4 py-3.5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-glow)] transition disabled:opacity-60"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {mode === "login" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div className="my-4 flex items-center gap-3">
            <div className="h-px flex-1 bg-slate-200/80 dark:bg-white/10" />
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground">or</span>
            <div className="h-px flex-1 bg-slate-200/80 dark:bg-white/10" />
          </div>

          <button
            type="button"
            onClick={google}
            disabled={busy}
            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-slate-200/80 bg-card px-4 py-3.5 text-sm font-semibold transition hover:border-primary/40 disabled:opacity-60 dark:border-white/10"
          >
            <GoogleIcon />
            {mode === "login" ? "Sign in with Google" : "Sign up with Google"}
          </button>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            {mode === "login" ? "New to MatricPulse?" : "Already have an account?"}{" "}
            <button
              type="button"
              onClick={() => setMode(mode === "login" ? "signup" : "login")}
              className="font-semibold text-primary underline-offset-2 hover:underline"
            >
              {mode === "login" ? "Create an account" : "Sign in"}
            </button>
          </p>
        </div>
      )}
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9 3.5l6.7-6.7C35.6 2.4 30.2 0 24 0 14.6 0 6.5 5.4 2.6 13.2l7.8 6.1C12.3 13.2 17.6 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.1 24.5c0-1.6-.1-2.8-.4-4.1H24v8.4h12.4c-.3 2.1-1.6 5.2-4.7 7.3l7.6 5.9c4.5-4.2 6.8-10.3 6.8-17.5z"
      />
      <path
        fill="#FBBC05"
        d="M10.4 28.7A14.6 14.6 0 0 1 9.6 24c0-1.6.3-3.2.8-4.7l-7.8-6.1A24 24 0 0 0 0 24c0 3.9.9 7.5 2.6 10.8l7.8-6.1z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.6-5.9c-2 1.4-4.7 2.4-8.3 2.4-6.4 0-11.7-3.7-13.6-9.1l-7.8 6.1C6.5 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}
