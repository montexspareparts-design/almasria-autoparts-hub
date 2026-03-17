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
    const paymobSecretKey = Deno.env.get("PAYMOB_SECRET_KEY");
    const paymobIntegrationId = Deno.env.get("PAYMOB_INTEGRATION_ID");
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    if (!paymobSecretKey) {
      throw new Error("PAYMOB_SECRET_KEY is not configured");
    }
    if (!paymobIntegrationId) {
      throw new Error("PAYMOB_INTEGRATION_ID is not configured");
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // ─── Authentication Check ───────────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    // ─── End Auth Check ─────────────────────────────────────────────────

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
      console.error("Order fetch error:", orderErr);
      return new Response(
        JSON.stringify({ error: "Order not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user owns the order
    if (order.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: "Forbidden" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch user profile for billing data
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("user_id", order.user_id)
      .single();

    // Build items array
    const amountCents = Math.round(order.total_amount * 100);
    const items = (order.order_items || []).map((item: any) => ({
      name: item.products?.name_ar || item.products?.sku || "منتج",
      amount: Math.round(item.unit_price * 100),
      quantity: item.quantity,
      description: item.products?.sku || "",
    }));

    // Build billing data
    const nameParts = (profile?.full_name || "Customer").split(" ");
    const firstName = nameParts[0] || "Customer";
    const lastName = nameParts.slice(1).join(" ") || "User";

    // Use accept.paymob.com as the unified API endpoint
    const apiBase = "https://accept.paymob.com";

    const intentionUrl = `${apiBase}/v1/intention/`;

    const requestBody = {
      amount: amountCents,
      currency: "EGP",
      payment_methods: [parseInt(paymobIntegrationId)],
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
      items,
      extras: {
        order_id: order.id,
        order_number: order.order_number,
      },
      redirection_url: return_url || "",
      notification_url: `${supabaseUrl}/functions/v1/paymob-webhook`,
    };

    console.log("Creating Paymob intention at:", intentionUrl);
    console.log("Request body:", JSON.stringify(requestBody));

    // Create intention using Paymob v1 Intention API
    const intentionRes = await fetch(intentionUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Token ${paymobSecretKey}`,
      },
      body: JSON.stringify(requestBody),
    });

    const intentionText = await intentionRes.text();
    console.log("Paymob response status:", intentionRes.status);
    console.log("Paymob response body:", intentionText);

    let intentionData;
    try {
      intentionData = JSON.parse(intentionText);
    } catch {
      throw new Error(`Paymob returned non-JSON response: ${intentionText.slice(0, 500)}`);
    }

    if (!intentionRes.ok || !intentionData.client_secret) {
      console.error("Paymob intention creation failed:", intentionData);
      throw new Error(`Failed to create Paymob intention: ${JSON.stringify(intentionData).slice(0, 500)}`);
    }

    return new Response(
      JSON.stringify({
        client_secret: intentionData.client_secret,
        intention_id: intentionData.id,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Create Paymob intention error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
