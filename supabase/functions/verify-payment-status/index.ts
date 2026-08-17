import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const RequestSchema = z.object({
  order_number: z.string().min(1).max(80),
  transaction_id: z.string().regex(/^\d+$/).optional(),
  provider: z.enum(["paymob", "geidea"]).default("paymob"),
});

const PAYMOB_ATTEMPT_SEPARATOR = "--pm--";
const normalizeOrderReference = (value?: string | null) =>
  value ? value.split(PAYMOB_ATTEMPT_SEPARATOR)[0] : null;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization");
    if (!supabaseUrl || !anonKey || !serviceRoleKey || !authHeader) {
      return json({ error: "Unauthorized" }, 401);
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const parsed = RequestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "Invalid request" }, 400);

    const { order_number: orderNumber, transaction_id: transactionId, provider } = parsed.data;
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const { data: order } = await admin
      .from("orders")
      .select("id, user_id, order_number, status, total_amount")
      .eq("order_number", orderNumber)
      .eq("user_id", user.id)
      .maybeSingle();

    if (!order) return json({ error: "Order not found" }, 404);
    if (["processing", "shipped", "delivered"].includes(String(order.status))) {
      return json({ status: "success" });
    }

    if (provider === "geidea" || !transactionId) {
      return json({ status: "pending" });
    }

    const paymobApiKey = Deno.env.get("PAYMOB_API_KEY");
    if (!paymobApiKey) return json({ status: "pending" });

    const authRes = await fetch("https://accept.paymob.com/api/auth/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: paymobApiKey }),
    });
    const authData = await authRes.json().catch(() => ({}));
    if (!authRes.ok || !authData.token) return json({ status: "pending" });

    const txRes = await fetch(`https://accept.paymob.com/api/acceptance/transactions/${transactionId}`, {
      headers: { Authorization: `Bearer ${authData.token}` },
    });
    const tx = await txRes.json().catch(() => ({}));
    if (!txRes.ok) return json({ status: "pending" });

    const txOrderNumber = normalizeOrderReference(tx?.order?.merchant_order_id ?? tx?.merchant_order_id);
    const amountMatches = Number(tx?.amount_cents) === Math.round(Number(order.total_amount) * 100);
    if (txOrderNumber !== order.order_number || !amountMatches) {
      console.error("Payment reconciliation mismatch", { orderNumber, transactionId });
      return json({ status: "pending" });
    }

    const success = tx?.success === true && tx?.pending !== true;
    const failed = tx?.success === false && tx?.pending !== true;
    const reconciledStatus = success ? "success" : failed ? "failed" : "pending";

    const { data: existingTx } = await admin
      .from("payment_transactions")
      .select("id")
      .eq("paymob_transaction_id", transactionId)
      .maybeSingle();

    const txRecord = {
      order_id: order.id,
      order_number: order.order_number,
      paymob_transaction_id: transactionId,
      amount_cents: Number(tx.amount_cents),
      currency: tx.currency || "EGP",
      status: reconciledStatus,
      payment_method: tx.source_data?.type || null,
      card_last_four: tx.source_data?.pan || null,
      card_brand: tx.source_data?.sub_type || null,
      is_refunded: tx.is_refunded === true,
      is_voided: tx.is_voided === true,
      error_message: failed ? (tx.data?.message || tx.txn_response_code || null) : null,
      raw_payload: { reconciliation: true, obj: tx },
    };

    if (existingTx?.id) {
      await admin.from("payment_transactions").update(txRecord).eq("id", existingTx.id);
    } else {
      await admin.from("payment_transactions").insert(txRecord);
    }

    if (success && ["awaiting_payment", "confirmed", "pending"].includes(String(order.status))) {
      const { error: updateError } = await admin
        .from("orders")
        .update({ status: "processing" })
        .eq("id", order.id);
      if (updateError) throw updateError;
    }

    return json({ status: reconciledStatus });
  } catch (error) {
    console.error("verify-payment-status error", error instanceof Error ? error.message : error);
    return json({ status: "pending" });
  }
});