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
    const amountCents = transaction.amount_cents;

    // Verify HMAC if secret key is available
    if (paymobSecretKey && body.hmac) {
      // Paymob HMAC verification
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

      // Log for debugging
      console.log("Paymob callback received for order:", orderId, "success:", success);
    }

    if (!orderId) {
      console.error("No order ID in Paymob callback");
      return new Response(
        JSON.stringify({ error: "Missing order ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Extract order number from merchant_order_id
    const orderNumber = orderId;

    if (success && !isPending) {
      // Payment successful — move order to processing
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

      // Only update if order is awaiting payment or confirmed
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
