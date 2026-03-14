import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const paymobApiKey = Deno.env.get("PAYMOB_API_KEY");
    const paymobIntegrationId = Deno.env.get("PAYMOB_INTEGRATION_ID");
    const paymobIframeId = Deno.env.get("PAYMOB_IFRAME_ID");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!paymobApiKey) {
      throw new Error("PAYMOB_API_KEY is not configured");
    }
    if (!paymobIntegrationId) {
      throw new Error("PAYMOB_INTEGRATION_ID is not configured");
    }
    if (!paymobIframeId) {
      throw new Error("PAYMOB_IFRAME_ID is not configured");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { order_id, return_url } = await req.json();

    if (!order_id) {
      return new Response(
        JSON.stringify({ error: "order_id is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch order details
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*, order_items(*, products(name_ar, sku))")
      .eq("id", order_id)
      .single();

    if (orderErr || !order) {
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user profile for billing data
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", order.user_id)
      .single();

    // Step 1: Auth request to get token
    const authRes = await fetch("https://accept.paymob.com/api/auth/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: paymobApiKey }),
    });
    const authData = await authRes.json();
    if (!authRes.ok || !authData.token) {
      console.error("Paymob auth failed:", authData);
      throw new Error("Failed to authenticate with Paymob");
    }
    const token = authData.token;

    // Step 2: Register order
    const amountCents = Math.round(order.total_amount * 100);
    const items = (order.order_items || []).map((item: any) => ({
      name: item.products?.name_ar || item.products?.sku || "منتج",
      amount_cents: Math.round(item.unit_price * 100).toString(),
      quantity: item.quantity.toString(),
      description: item.products?.sku || "",
    }));

    const orderRegRes = await fetch("https://accept.paymob.com/api/ecommerce/orders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: token,
        delivery_needed: false,
        amount_cents: amountCents,
        currency: "EGP",
        merchant_order_id: order.order_number,
        items,
      }),
    });
    const orderRegData = await orderRegRes.json();
    if (!orderRegRes.ok || !orderRegData.id) {
      console.error("Paymob order registration failed:", orderRegData);
      throw new Error("Failed to register order with Paymob");
    }

    // Step 3: Payment key request
    const nameParts = (profile?.full_name || "Customer").split(" ");
    const firstName = nameParts[0] || "Customer";
    const lastName = nameParts.slice(1).join(" ") || "User";

    const paymentKeyRes = await fetch("https://accept.paymob.com/api/acceptance/payment_keys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: token,
        amount_cents: amountCents,
        expiration: 3600,
        order_id: orderRegData.id,
        billing_data: {
          first_name: firstName,
          last_name: lastName,
          email: profile?.email || "customer@example.com",
          phone_number: profile?.phone || "01000000000",
          apartment: "NA",
          floor: "NA",
          street: order.shipping_address || "NA",
          building: "NA",
          shipping_method: "NA",
          postal_code: "NA",
          city: order.shipping_governorate || "Cairo",
          country: "EG",
          state: order.shipping_governorate || "Cairo",
        },
        currency: "EGP",
        integration_id: parseInt(paymobIntegrationId),
      }),
    });
    const paymentKeyData = await paymentKeyRes.json();
    if (!paymentKeyRes.ok || !paymentKeyData.token) {
      console.error("Paymob payment key failed:", paymentKeyData);
      throw new Error("Failed to generate payment key");
    }

    // Build the iframe URL
    const iframeUrl = `https://accept.paymob.com/api/acceptance/iframes/${paymobIntegrationId}?payment_token=${paymentKeyData.token}`;

    // Also return the payment token so frontend can use hosted checkout
    return new Response(
      JSON.stringify({
        payment_token: paymentKeyData.token,
        iframe_url: iframeUrl,
        paymob_order_id: orderRegData.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Create Paymob intention error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
