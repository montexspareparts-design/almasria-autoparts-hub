import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAYMOB_BASE = "https://accept.paymob.com";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // --- Auth: verify caller ---
    const authHeader = req.headers.get("Authorization");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");

    if (!authHeader || !anonKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    let userId: string | undefined;
    try {
      const { data: claimsData } = await authClient.auth.getClaims();
      userId = claimsData?.claims?.sub as string | undefined;
    } catch { /* fallback */ }
    if (!userId) {
      const { data: { user } } = await authClient.auth.getUser();
      userId = user?.id;
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Parse body ---
    const body = await req.json().catch(() => null);
    const orderId = typeof body?.order_id === "string" ? body.order_id : "";
    const returnUrl = typeof body?.return_url === "string" ? body.return_url : "";

    if (!orderId) {
      return new Response(JSON.stringify({ error: "order_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Secrets ---
    const paymobApiKey = Deno.env.get("PAYMOB_API_KEY");
    const integrationId = Deno.env.get("PAYMOB_INTEGRATION_ID");
    const iframeId = Deno.env.get("PAYMOB_IFRAME_ID");

    if (!paymobApiKey) throw new Error("PAYMOB_API_KEY is not configured");
    if (!integrationId) throw new Error("PAYMOB_INTEGRATION_ID is not configured");

    // --- Fetch order from DB ---
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, user_id, total_amount, order_number, shipping_address, shipping_governorate, order_items(quantity, unit_price, products(name_ar, sku))")
      .eq("id", orderId)
      .single();

    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.user_id !== userId) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Fetch profile ---
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", order.user_id)
      .single();

    const nameParts = (profile?.full_name || "Customer").split(" ");
    const firstName = nameParts[0] || "Customer";
    const lastName = nameParts.slice(1).join(" ") || "User";
    const amountCents = Math.round(order.total_amount * 100);

    // ========================================
    // Step 1: Authenticate with Paymob
    // ========================================
    console.log("Step 1: Authenticating with Paymob...");
    const authRes = await fetch(`${PAYMOB_BASE}/api/auth/tokens`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: paymobApiKey }),
    });

    const authData = await authRes.json();
    if (!authRes.ok || !authData.token) {
      console.error("Paymob auth failed:", authData);
      throw new Error("Failed to authenticate with Paymob");
    }
    const authToken = authData.token;
    console.log("Step 1: ✅ Auth token obtained");

    // ========================================
    // Step 2: Create order on Paymob
    // ========================================
    console.log("Step 2: Creating Paymob order...");
    const items = (order.order_items || []).map((item: any) => ({
      name: item.products?.name_ar || item.products?.sku || "منتج",
      amount_cents: Math.round(item.unit_price * 100),
      quantity: item.quantity,
      description: item.products?.sku || "",
    }));

    const orderRes = await fetch(`${PAYMOB_BASE}/api/ecommerce/orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: authToken,
        delivery_needed: false,
        amount_cents: amountCents,
        currency: "EGP",
        merchant_order_id: order.order_number,
        items,
      }),
    });

    const orderData = await orderRes.json();
    if (!orderRes.ok || !orderData.id) {
      console.error("Paymob order creation failed:", orderData);
      throw new Error("Failed to create Paymob order");
    }
    const paymobOrderId = orderData.id;
    console.log("Step 2: ✅ Paymob order created:", paymobOrderId);

    // ========================================
    // Step 3: Generate payment key
    // ========================================
    console.log("Step 3: Generating payment key...");
    const paymentKeyRes = await fetch(`${PAYMOB_BASE}/api/acceptance/payment_keys`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: authToken,
        amount_cents: amountCents,
        expiration: 3600,
        order_id: paymobOrderId,
        billing_data: {
          first_name: firstName,
          last_name: lastName,
          email: profile?.email || "customer@example.com",
          phone_number: profile?.phone || "01000000000",
          country: "EG",
          city: order.shipping_governorate || "Cairo",
          state: order.shipping_governorate || "Cairo",
          street: order.shipping_address || "NA",
          building: "NA",
          floor: "NA",
          apartment: "NA",
          shipping_method: "NA",
          postal_code: "NA",
        },
        currency: "EGP",
        integration_id: parseInt(integrationId),
        lock_order_when_paid: true,
      }),
    });

    const paymentKeyData = await paymentKeyRes.json();
    if (!paymentKeyRes.ok || !paymentKeyData.token) {
      console.error("Paymob payment key failed:", paymentKeyData);
      throw new Error("Failed to generate payment key");
    }
    const paymentKey = paymentKeyData.token;
    console.log("Step 3: ✅ Payment key generated");

    // Build iframe URL
    const iframeUrl = iframeId
      ? `${PAYMOB_BASE}/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey}`
      : null;

    // ========================================
    // Return response
    // ========================================
    return new Response(
      JSON.stringify({
        payment_key: paymentKey,
        iframe_url: iframeUrl,
        iframe_id: iframeId || null,
        paymob_order_id: paymobOrderId,
        order_number: order.order_number,
        amount_cents: amountCents,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("create-payment error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
