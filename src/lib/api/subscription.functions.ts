import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireAppAuth } from "@/integrations/app-db/auth";

/** Plan catalogue — prices in ETB. */
export const PLANS = {
  monthly: { id: "monthly", label: "Monthly", amount: 150, months: 1 },
  term: { id: "term", label: "Term (3 months)", amount: 380, months: 3 },
} as const;

export type PlanId = keyof typeof PLANS;

export type AccessState = {
  promoEndDate: string | null;
  /** Launch promo running: everyone gets full access for free. */
  promoActive: boolean;
  /** Whole days left in the promo (0 when not active). */
  promoDaysLeft: number;
  trialEndsAt: string | null;
  trialActive: boolean;
  subscriptionActive: boolean;
  subscriptionExpiresAt: string | null;
  plan: string | null;
  hasAccess: boolean;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const TRIAL_DAYS = 30;

/**
 * Single source of truth for "can this user use the app".
 * Promo window (when set and still running) beats everything else; otherwise
 * 30-day trial from trial_start_date, then an active, unexpired subscription.
 */
export const getAccessState = createServerFn({ method: "GET" })
  .middleware([requireAppAuth])
  .handler(async ({ context }): Promise<AccessState> => {
    const { supabase, userId } = context;

    const [{ data: settings }, { data: profile }] = await Promise.all([
      supabase.from("app_settings").select("promo_end_date").limit(1).maybeSingle(),
      supabase
        .from("profiles")
        .select("trial_start_date, subscription_status, subscription_expires_at, plan")
        .eq("id", userId)
        .maybeSingle(),
    ]);

    const now = Date.now();
    const promoEndDate = settings?.promo_end_date ?? null;
    const promoEnd = promoEndDate ? new Date(promoEndDate).getTime() : null;
    const promoActive = promoEnd != null && Number.isFinite(promoEnd) && now < promoEnd;
    const promoDaysLeft = promoActive && promoEnd ? Math.ceil((promoEnd - now) / DAY_MS) : 0;

    const trialStart = profile?.trial_start_date ? new Date(profile.trial_start_date).getTime() : null;
    const trialEnd = trialStart != null ? trialStart + TRIAL_DAYS * DAY_MS : null;
    const trialActive = trialEnd != null && now < trialEnd;

    const expiresAt = profile?.subscription_expires_at ?? null;
    const expiresMs = expiresAt ? new Date(expiresAt).getTime() : null;
    const subscriptionActive =
      profile?.subscription_status === "active" && expiresMs != null && now < expiresMs;

    return {
      promoEndDate,
      promoActive,
      promoDaysLeft,
      trialEndsAt: trialEnd != null ? new Date(trialEnd).toISOString() : null,
      trialActive,
      subscriptionActive,
      subscriptionExpiresAt: expiresAt,
      plan: profile?.plan ?? null,
      hasAccess: promoActive || trialActive || subscriptionActive,
    };
  });

/** Creates a Chapa checkout session and returns the hosted checkout URL. */
export const createChapaCheckout = createServerFn({ method: "POST" })
  .middleware([requireAppAuth])
  .inputValidator(
    z.object({
      plan: z.enum(["monthly", "term"]),
      origin: z.string().url(),
    }),
  )
  .handler(async ({ data, context }) => {
    const secretKey = process.env["CHAPA_SECRET_KEY"]?.trim();
    if (!secretKey) {
      console.error("[chapa] CHAPA_SECRET_KEY is not available to the server");
      throw new Error("Payments are not configured yet.");
    }

    const plan = PLANS[data.plan as PlanId];
    const { userId, claims } = context;
    const email = (claims as { email?: string }).email ?? `user-${userId}@matricpulse.app`;
    const txRef = `mp-${data.plan}-${userId.slice(0, 8)}-${Date.now()}`;

    const origin = new URL(data.origin).origin;
    const callbackUrl =
      process.env["CHAPA_CALLBACK_URL"] ??
      "https://project--d0587f0a-40f6-4f03-b2b1-930389da4c1c.lovable.app/api/public/chapa-webhook";

    const { getAppAdmin } = await import("@/integrations/app-db/admin.server");
    const supabaseAdmin = getAppAdmin();
    const { error: insertError } = await supabaseAdmin.from("payments").insert({
      user_id: userId,
      tx_ref: txRef,
      plan: data.plan,
      amount: plan.amount,
      currency: "ETB",
      status: "pending",
    });
    if (insertError) {
      console.error("[chapa] failed to record payment", insertError.message);
      throw new Error("Could not start checkout. Please try again.");
    }

    const response = await fetch("https://api.chapa.co/v1/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: String(plan.amount),
        currency: "ETB",
        email,
        tx_ref: txRef,
        callback_url: callbackUrl,
        return_url: `${origin}/payment-pending?tx_ref=${encodeURIComponent(txRef)}`,
        customization: {
          title: "MatricPulse AI",
          description: `${plan.label} subscription`.replace(/[^A-Za-z0-9 ._-]/g, ""),
        },
      }),
    });

    const payload = (await response.json().catch(() => null)) as
      | { status?: string; message?: unknown; data?: { checkout_url?: string } }
      | null;

    if (!response.ok || !payload?.data?.checkout_url) {
      console.error("[chapa] initialize failed", response.status, payload?.message);
      const detail = payload?.message
        ? typeof payload.message === "string" ? payload.message : JSON.stringify(payload.message)
        : "";
      throw new Error(`Chapa could not start this payment (${response.status})${detail ? `: ${detail}` : "."}`);
    }

    return { checkoutUrl: payload.data.checkout_url, txRef };
  });

/** Lets the pending screen poll whether the webhook has activated the plan. */
export const getPaymentStatus = createServerFn({ method: "GET" })
  .middleware([requireAppAuth])
  .inputValidator(z.object({ txRef: z.string().min(1) }))
  .handler(async ({ data, context }) => {
    const { data: payment } = await context.supabase
      .from("payments")
      .select("status, plan")
      .eq("tx_ref", data.txRef)
      .maybeSingle();
    return { status: payment?.status ?? "unknown", plan: payment?.plan ?? null };
  });
