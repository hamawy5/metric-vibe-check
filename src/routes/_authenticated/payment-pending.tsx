import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { CheckCircle2, Clock, Loader2 } from "lucide-react";
import { z } from "zod";

import { getPaymentStatus } from "@/lib/api/subscription.functions";
import { useAccessState } from "@/components/AccessGate";

export const Route = createFileRoute("/_authenticated/payment-pending")({
  validateSearch: z.object({ tx_ref: z.string().optional() }),
  head: () => ({
    meta: [
      { title: "Confirming payment — MatricPulse AI" },
      {
        name: "description",
        content: "We are confirming your Chapa payment and activating your MatricPulse plan.",
      },
      { property: "og:title", content: "Confirming payment — MatricPulse AI" },
      {
        property: "og:description",
        content: "Your MatricPulse subscription activates as soon as Chapa confirms the payment.",
      },
    ],
  }),
  component: PaymentPendingPage,
});

function PaymentPendingPage() {
  const { tx_ref: txRef } = Route.useSearch();
  const fetchStatus = useServerFn(getPaymentStatus);
  const { refetch: refetchAccess } = useAccessState();

  const { data } = useQuery({
    queryKey: ["payment-status", txRef],
    queryFn: async () => {
      const result = await fetchStatus({ data: { txRef: txRef! } });
      if (result.status === "paid") await refetchAccess();
      return result;
    },
    enabled: Boolean(txRef),
    refetchInterval: (query) => (query.state.data?.status === "paid" ? false : 4000),
  });

  const paid = data?.status === "paid";

  return (
    <div className="px-5 pt-16">
      <div className="rounded-3xl border border-white/5 bg-card p-6 text-center shadow-xl dark:border-white/10">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[image:var(--gradient-primary)] text-primary-foreground shadow-[var(--shadow-glow)]">
          {paid ? <CheckCircle2 className="h-6 w-6" /> : <Clock className="h-6 w-6" />}
        </div>

        <h1 className="mt-5 text-xl font-bold">
          {paid ? "You're all set!" : "Confirming your payment"}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {paid
            ? "Your subscription is active. Jump back in and keep your streak going."
            : "Chapa is confirming your payment. This usually takes a few seconds — you can keep this screen open."}
        </p>

        {!paid ? (
          <div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Waiting for confirmation…
          </div>
        ) : null}

        <Link
          to="/"
          className="mt-6 inline-flex w-full items-center justify-center rounded-2xl bg-[image:var(--gradient-primary)] px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[var(--shadow-glow)]"
        >
          Go to Home
        </Link>

        {!paid ? (
          <Link
            to="/subscribe"
            className="mt-3 inline-flex w-full items-center justify-center rounded-2xl border border-slate-200/80 px-5 py-3 text-sm font-medium text-muted-foreground dark:border-white/10"
          >
            Back to plans
          </Link>
        ) : null}
      </div>
    </div>
  );
}
