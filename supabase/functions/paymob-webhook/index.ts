import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const paymobSecretKey = Deno.env.get("PAYMOB_SECRET_KEY");
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();

    // Paymob sends transaction callback
    const transaction = body.obj || body;
    const orderId = transaction.order?.merchant_order_id || transaction.merchant_order_id;
    const success = transaction.success === true || transaction.success === "true";
    const isPending = transaction.pending === true || transaction.pending === "true";

    // ─── HMAC Verification (REQUIRED) ───────────────────────────────────
    if (!paymobSecretKey) {
      console.error("PAYMOB_SECRET_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.hmac) {
      console.error("Missing HMAC in Paymob callback");
      return new Response(
        JSON.stringify({ error: "Missing HMAC" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build HMAC data string from transaction fields (Paymob's specified order)
    const hmacData = [
      transaction.amount_cents,
      transaction.created_at,
      transaction.currency,
      transaction.error_occured,
      transaction.has_parent_transaction,
      transaction.id,
      transaction.integration_id,
      transaction.is_3d_secure,
      transaction.is_auth,
      transaction.is_capture,
      transaction.is_refunded,
      transaction.is_standalone_payment,
      transaction.is_voided,
      transaction.order?.id,
      transaction.owner,
      transaction.pending,
      transaction.source_data?.pan,
      transaction.source_data?.sub_type,
      transaction.source_data?.type,
      transaction.success,
    ].join("");

    // Compute HMAC-SHA512 and compare
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(paymobSecretKey),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(hmacData));
    const computedHmac = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (computedHmac !== body.hmac) {
      console.error("HMAC mismatch — possible forged callback");
      return new Response(
        JSON.stringify({ error: "Invalid HMAC" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("HMAC verified for order:", orderId, "success:", success);
    // ─── End HMAC Verification ──────────────────────────────────────────

    if (!orderId) {
      console.error("No order ID in Paymob callback");
      return new Response(
        JSON.stringify({ error: "Missing order ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const orderNumber = orderId;

    if (success && !isPending) {
      const { data: order, error: fetchErr } = await supabase
        .from("orders")
        .select("id, status, user_id")
        .eq("order_number", orderNumber)
        .maybeSingle();

      if (fetchErr || !order) {
        console.error("Order not found:", orderNumber, fetchErr);
        return new Response(
          JSON.stringify({ error: "Order not found" }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (["awaiting_payment", "confirmed", "pending"].includes(order.status)) {
        await supabase
          .from("orders")
          .update({ status: "processing" })
          .eq("id", order.id);

        console.log(`Order ${orderNumber} moved to processing after successful payment`);
      }
    } else {
      console.log(`Payment not successful for order ${orderNumber}. success=${success}, pending=${isPending}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Paymob webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
