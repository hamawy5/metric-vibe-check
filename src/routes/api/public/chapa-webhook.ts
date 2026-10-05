import { createFileRoute } from "@tanstack/react-router";
import { createHmac, timingSafeEqual } from "node:crypto";

const PLAN_MONTHS: Record<string, number> = { monthly: 1, term: 3 };

function safeEqualHex(a: string, b: string) {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}

function addMonths(from: Date, months: number) {
  const d = new Date(from.getTime());
  d.setMonth(d.getMonth() + months);
  return d;
}

/**
 * Chapa payment webhook. Public endpoint — the signature check is the security
 * boundary. Never throws: Chapa retries on non-2xx, so failures are logged and
 * answered explicitly.
 */
export const Route = createFileRoute("/api/public/chapa-webhook")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const encryptionKey = process.env["CHAPA_ENCRYPTION_KEY"];
          if (!encryptionKey) {
            console.error("[chapa-webhook] CHAPA_ENCRYPTION_KEY missing");
            return new Response("Not configured", { status: 500 });
          }

          const body = await request.text();
          const headerSignature =
            request.headers.get("chapa-signature") ??
            request.headers.get("x-chapa-signature") ??
            "";

          // Chapa signs either the raw payload or the secret itself, depending
          // on which header it sends — accept both documented variants.
          const payloadHash = createHmac("sha256", encryptionKey).update(body).digest("hex");
          const keyHash = createHmac("sha256", encryptionKey).update(encryptionKey).digest("hex");

          if (
            !headerSignature ||
            (!safeEqualHex(headerSignature, payloadHash) && !safeEqualHex(headerSignature, keyHash))
          ) {
            console.error("[chapa-webhook] invalid signature");
            return new Response("Invalid signature", { status: 401 });
          }

          const event = JSON.parse(body) as {
            tx_ref?: string;
            status?: string;
            event?: string;
          };
          const txRef = event.tx_ref;
          if (!txRef) {
            console.error("[chapa-webhook] missing tx_ref");
            return new Response("Missing tx_ref", { status: 400 });
          }

          const { getAppAdmin } = await import("@/integrations/app-db/admin.server");
          const supabaseAdmin = getAppAdmin();
          const { data: payment } = await supabaseAdmin
            .from("payments")
            .select("id, user_id, plan, status")
            .eq("tx_ref", txRef)
            .maybeSingle();

          if (!payment) {
            console.error("[chapa-webhook] unknown tx_ref", txRef);
            return new Response("Unknown transaction", { status: 200 });
          }

          const succeeded = event.status === "success" || event.event === "charge.success";
          if (!succeeded) {
            await supabaseAdmin
              .from("payments")
              .update({ status: "failed" })
              .eq("id", payment.id);
            return new Response("ok");
          }

          if (payment.status === "paid") return new Response("ok");

          const months = PLAN_MONTHS[payment.plan] ?? 1;
          const expiresAt = addMonths(new Date(), months).toISOString();

          const { error: profileError } = await supabaseAdmin
            .from("profiles")
            .update({
              subscription_status: "active",
              plan: payment.plan,
              subscription_expires_at: expiresAt,
            })
            .eq("id", payment.user_id);

          if (profileError) {
            console.error("[chapa-webhook] profile update failed", profileError.message);
            return new Response("Profile update failed", { status: 500 });
          }

          await supabaseAdmin.from("payments").update({ status: "paid" }).eq("id", payment.id);

          return new Response("ok");
        } catch (error) {
          console.error("[chapa-webhook] unexpected error", error);
          return new Response("Webhook error", { status: 500 });
        }
      },
    },
  },
});
