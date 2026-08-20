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
  provider: z.enum(["paymob", "geidea"]).default("geidea"),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization");
    if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "Unavailable" }, 503);

    let userId: string | null = null;
    if (authHeader) {
      const authClient = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: { user } } = await authClient.auth.getUser();
      userId = user?.id ?? null;
    }
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const parsed = RequestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: "Invalid request" }, 400);

    const { order_number: orderNumber } = parsed.data;
    const admin = createClient(supabaseUrl, serviceRoleKey);
    const orderQuery = admin
      .from("orders")
      .select("id, user_id, order_number, status, total_amount")
      .eq("order_number", orderNumber)
      .eq("user_id", userId);
    const { data: order } = await orderQuery.maybeSingle();

    if (!order) return json({ error: "Order not found" }, 404);
    if (["processing", "shipped", "delivered"].includes(String(order.status))) {
      return json({ status: "success" });
    }

    const { data: verifiedPayment } = await admin
      .from("payment_logs")
      .select("amount, status, raw_response")
      .eq("provider", "geidea")
      .eq("event_type", "webhook")
      .eq("order_number", orderNumber)
      .eq("signature_valid", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const payload = verifiedPayment?.raw_response as Record<string, any> | null;
    const orderPayload = (payload?.order ?? payload) as Record<string, any> | null;
    const payTx = Array.isArray(orderPayload?.transactions)
      ? orderPayload?.transactions.find((item: any) => item?.type === "Pay")
      : null;
    const responseCode = String(
      orderPayload?.detailedResponseCode ?? orderPayload?.responseCode ??
        payTx?.codes?.detailedResponseCode ?? payTx?.codes?.responseCode ?? "",
    );
    const providerStatus = String(orderPayload?.status ?? verifiedPayment?.status ?? "").toLowerCase();
    const paid = ["paid", "success"].includes(providerStatus) || responseCode === "000";
    const amountMatches = verifiedPayment &&
      Math.abs(Number(verifiedPayment.amount) - Number(order.total_amount)) < 0.01;

    if (paid && amountMatches) {
      const { error: updateError } = await admin
        .from("orders")
        .update({ status: "processing" })
        .eq("id", order.id);
      if (updateError) throw updateError;
      return json({ status: "success" });
    }
    return json({ status: "pending" });
  } catch (error) {
    console.error("verify-payment-status error", error instanceof Error ? error.message : error);
    return json({ status: "pending" });
  }
});
