import { type ReactNode } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Lock, Sparkles } from "lucide-react";

import { getAccessState } from "@/lib/api/subscription.functions";

/** Screens that must stay reachable even when access has lapsed. */
const ALWAYS_ALLOWED = ["/subscribe", "/payment-pending"];

export function useAccessState() {
  const fetchAccess = useServerFn(getAccessState);
  return useQuery({
    queryKey: ["access-state"],
    queryFn: () => fetchAccess(),
    staleTime: 60_000,
  });
}

/** Banner shown in the final 3 days of the free launch promo. */
export function PromoBanner() {
  const { data } = useAccessState();
  if (!data?.promoActive || data.promoDaysLeft > 3) return null;
  const days = Math.max(1, data.promoDaysLeft);
  return (
    <div className="mx-5 mt-4 rounded-2xl border border-amber-400/40 bg-amber-50 p-4 dark:border-amber-300/20 dark:bg-amber-400/10">
      <p className="text-sm font-semibold text-amber-900 dark:text-amber-200">
        Free access ends in {days} {days === 1 ? "day" : "days"} — subscribe now to lock in your
        streak!
      </p>
      <Link
        to="/subscribe"
        className="mt-3 inline-flex items-center gap-2 rounded-full bg-[image:var(--gradient-primary)] px-4 py-2 text-xs font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
      >
        <Sparkles className="h-3.5 w-3.5" />
        See plans
      </Link>
    </div>
  );
}

/** Blocks the app when the trial is over and there is no active subscription. */
export function AccessGate({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data, isLoading } = useAccessState();

  if (ALWAYS_ALLOWED.some((p) => pathname.startsWith(p))) return <>{children}</>;
  if (isLoading || !data) return <>{children}</>;
  if (data.hasAccess) return <>{children}</>;

  return (
    <div className="px-5 pt-16">
      <div className="rounded-3xl border border-white/5 bg-card p-6 text-center shadow-xl">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)]">
          <Lock className="h-6 w-6" />
        </div>
        <h1 className="mt-5 text-xl font-bold">Your free week is over</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Subscribe to keep your streak, readings, quizzes and the AI tutor.
        </p>
        <Link
          to="/subscribe"
          className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-[image:var(--gradient-primary)] px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
        >
          View plans
        </Link>
      </div>
    </div>
  );
}
