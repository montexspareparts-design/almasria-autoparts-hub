import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { verifyGeideaSignature } from "../_shared/geidea.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, signature",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  let body: Record<string, unknown> = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid payload" }, 400);
  }

  const orderObj = (body.order ?? body) as Record<string, any>;
  const signature = (body.signature as string) ??
    (orderObj.signature as string) ??
    req.headers.get("signature");

  const orderNumber: string | null = orderObj.merchantReferenceId ?? null;
  const amount = Number(orderObj.amount ?? 0);
  const currency: string = orderObj.currency ?? "EGP";
  const status: string = orderObj.status ?? "";
  const detailedStatus: string = orderObj.detailedStatus ?? "";
  const payTx = Array.isArray(orderObj.transactions)
    ? orderObj.transactions.find((t: any) => t?.type === "Pay")
    : null;
  const responseCode: string = orderObj.detailedResponseCode ?? orderObj.responseCode ??
    payTx?.codes?.detailedResponseCode ?? payTx?.codes?.responseCode ?? "";


  const signatureValid = await verifyGeideaSignature({
    signature,
    orderId: orderObj.orderId ?? null,
    amount,
    currency,
    timestamp: (body.timeStamp as string) ?? (body.timestamp as string) ?? orderObj.timeStamp ??
      orderObj.timestamp ?? null,
    responseCode,
    status,
    merchantReferenceId: orderNumber,
  }).catch(() => false);


  const { data: order } = orderNumber
    ? await supabase
      .from("orders")
      .select("id, status, total_amount")
      .eq("order_number", orderNumber)
      .maybeSingle()
    : { data: null };

  await supabase.from("payment_logs").insert({
    provider: "geidea",
    event_type: "webhook",
    order_id: order?.id ?? null,
    order_number: orderNumber,
    provider_order_id: orderObj.orderId ?? null,
    session_id: orderObj.sessionId ?? null,
    amount,
    currency,
    status: status || responseCode || null,
    signature_valid: signatureValid,
    raw_response: body,
  });

  if (!signatureValid) {
    console.error("Geidea webhook signature mismatch for order:", orderNumber);
    return json({ error: "Invalid signature" }, 401);
  }

  if (!order) return json({ error: "Order not found" }, 404);

  // Only a signature-verified, paid, amount-matching callback confirms an order.
  const paid = ["paid", "success"].includes(String(status).toLowerCase()) ||
    String(detailedStatus).toLowerCase() === "paid" ||
    responseCode === "000";

  const amountMatches = Math.abs(Number(order.total_amount) - amount) < 0.01;

  if (paid && amountMatches) {
    if (["awaiting_payment", "confirmed", "pending"].includes(order.status)) {
      await supabase.from("orders").update({ status: "processing" }).eq("id", order.id);
      console.log(`Geidea: order ${orderNumber} confirmed and moved to processing`);
    }
  } else {
    console.log(`Geidea: order ${orderNumber} not confirmed (status=${status}, code=${responseCode})`);
  }

  return json({ received: true });
});
