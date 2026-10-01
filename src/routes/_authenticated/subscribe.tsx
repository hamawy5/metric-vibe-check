import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { createChapaCheckout, PLANS, type PlanId } from "@/lib/api/subscription.functions";
import { useAccessState } from "@/components/AccessGate";

export const Route = createFileRoute("/_authenticated/subscribe")({
  head: () => ({
    meta: [
      { title: "Subscribe — MatricPulse AI" },
      {
        name: "description",
        content: "Choose a MatricPulse AI plan: 150 ETB monthly or 380 ETB for three months.",
      },
      { property: "og:title", content: "Subscribe — MatricPulse AI" },
      {
        property: "og:description",
        content: "Keep your streak with a MatricPulse AI monthly or term subscription.",
      },
    ],
  }),
  component: SubscribePage,
});

const PLAN_LIST: { id: PlanId; perks: string[]; badge?: string }[] = [
  {
    id: "monthly",
    perks: ["All grades & subjects", "Unit mastery exams", "AI tutor in the Lounge"],
  },
  {
    id: "term",
    badge: "Best value",
    perks: ["Everything in Monthly", "3 months of access", "Save 70 ETB"],
  },
];

function SubscribePage() {
  const startCheckout = useServerFn(createChapaCheckout);
  const [loading, setLoading] = useState<PlanId | null>(null);
  const { data: access } = useAccessState();

  const handleSubscribe = async (plan: PlanId) => {
    setLoading(plan);
    try {
      const { checkoutUrl } = await startCheckout({
        data: { plan, origin: window.location.origin },
      });
      window.location.href = checkoutUrl;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start payment.");
      setLoading(null);
    }
  };

  return (
    <div className="px-5 pt-12">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground"
      >
        <ArrowLeft className="h-4 w-4" />
        Home
      </Link>

      <h1 className="mt-5 text-2xl font-bold tracking-tight">
        Unlock{" "}
        <span className="bg-[image:var(--gradient-primary)] bg-clip-text text-transparent">
          full access
        </span>
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Pay securely with Chapa — telebirr, CBE Birr, cards and bank transfer.
      </p>

      {access?.subscriptionActive && access.subscriptionExpiresAt ? (
        <p className="mt-4 rounded-2xl border border-emerald-400/40 bg-emerald-50 p-3 text-xs font-medium text-emerald-800 dark:border-emerald-300/20 dark:bg-emerald-400/10 dark:text-emerald-200">
          Your {access.plan ?? "subscription"} plan is active until{" "}
          {new Date(access.subscriptionExpiresAt).toLocaleDateString()}.
        </p>
      ) : null}

      <div className="mt-6 space-y-4 pb-10">
        {PLAN_LIST.map(({ id, perks, badge }) => {
          const plan = PLANS[id];
          return (
            <section
              key={id}
              className="rounded-3xl border border-white/5 bg-card p-5 shadow-xl dark:border-white/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold">{plan.label}</p>
                  <p className="mt-1 text-3xl font-black tracking-tight">
                    {plan.amount}{" "}
                    <span className="text-base font-semibold text-muted-foreground">ETB</span>
                  </p>
                </div>
                {badge ? (
                  <span className="rounded-full bg-[image:var(--gradient-primary)] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary-foreground">
                    {badge}
                  </span>
                ) : null}
              </div>

              <ul className="mt-4 space-y-2">
                {perks.map((perk) => (
                  <li key={perk} className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Check className="h-3.5 w-3.5 text-primary" />
                    {perk}
                  </li>
                ))}
              </ul>

              <button
                type="button"
                onClick={() => handleSubscribe(id)}
                disabled={loading !== null}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-[image:var(--gradient-primary)] px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)] disabled:opacity-60"
              >
                {loading === id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {loading === id ? "Opening Chapa…" : `Subscribe · ${plan.amount} ETB`}
              </button>
            </section>
          );
        })}
      </div>
    </div>
  );
}
