import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@3.25.76";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PAYMOB_BASE = "https://accept.paymob.com";
const PAYMOB_ATTEMPT_SEPARATOR = "--pm--";

const RequestSchema = z.object({
  dry_run: z.boolean().optional(),
  order_id: z.string().uuid().optional(),
  payment_method: z.enum(["card", "wallet", "kiosk"]).optional(),
  wallet_phone: z.string().min(8).max(20).optional(),
  return_url: z.string().url().optional(),
});

const buildMerchantOrderReference = (orderNumber: string) =>
  `${orderNumber}${PAYMOB_ATTEMPT_SEPARATOR}${crypto.randomUUID().slice(0, 8)}`;

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

    // Rate limit: max 10 payment attempts per user per 10 minutes
    const serviceRoleKeyRL = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseRL = createClient(supabaseUrl, serviceRoleKeyRL);
    const { data: allowed } = await supabaseRL.rpc("check_rate_limit", {
      _identifier: userId,
      _action: "create_payment",
      _max_requests: 10,
      _window_seconds: 600,
    });

    if (!allowed) {
      return new Response(JSON.stringify({ error: "Too many payment attempts. Try again later." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Parse body ---
    const rawBody = await req.json().catch(() => null);
    const parsedBody = RequestSchema.safeParse(rawBody);

    if (!parsedBody.success) {
      return new Response(JSON.stringify({ error: parsedBody.error.flatten() }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = parsedBody.data;

    // --- Secrets ---
    const paymobApiKey = Deno.env.get("PAYMOB_API_KEY");
    const cardIntegrationId = Deno.env.get("PAYMOB_INTEGRATION_ID");
    const walletIntegrationId = Deno.env.get("PAYMOB_WALLET_INTEGRATION_ID");
    const kioskIntegrationId = Deno.env.get("PAYMOB_KIOSK_INTEGRATION_ID");
    const iframeId = Deno.env.get("PAYMOB_IFRAME_ID");
    const paymobPublicKey = Deno.env.get("PAYMOB_PUBLIC_KEY");

    // Dry-run mode: return key status for admin health checks
    if (body?.dry_run === true) {
      return new Response(
        JSON.stringify({
          public_key: paymobPublicKey || null,
          methods: {
            card: !!cardIntegrationId,
            wallet: !!walletIntegrationId,
            kiosk: !!kioskIntegrationId,
          },
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const orderId = body.order_id || "";
    const paymentMethod = body.payment_method || "card";

    if (!orderId) {
      return new Response(JSON.stringify({ error: "order_id is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!paymobApiKey) throw new Error("PAYMOB_API_KEY is not configured");

    // Determine integration ID based on payment method
    let activeIntegrationId: string | undefined;
    switch (paymentMethod) {
      case "wallet":
        activeIntegrationId = walletIntegrationId;
        if (!activeIntegrationId) throw new Error("PAYMOB_WALLET_INTEGRATION_ID is not configured");
        break;
      case "kiosk":
        activeIntegrationId = kioskIntegrationId;
        if (!activeIntegrationId) throw new Error("PAYMOB_KIOSK_INTEGRATION_ID is not configured");
        break;
      case "card":
      default:
        activeIntegrationId = cardIntegrationId;
        if (!activeIntegrationId) throw new Error("PAYMOB_INTEGRATION_ID is not configured");
        break;
    }

    // --- Fetch order from DB ---
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("id, user_id, total_amount, order_number, status, shipping_address, shipping_governorate, order_items(quantity, unit_price, products(name_ar, sku))")
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

    if (!["awaiting_payment", "confirmed", "pending"].includes(order.status ?? "awaiting_payment")) {
      return new Response(JSON.stringify({ error: "Order is not eligible for a new payment attempt" }), {
        status: 400,
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
    const merchantOrderReference = buildMerchantOrderReference(order.order_number);

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
    const items = (order.order_items || []).map((item: {
      quantity: number;
      unit_price: number;
      products?: { name_ar?: string | null; sku?: string | null } | null;
    }) => ({
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
        merchant_order_id: merchantOrderReference,
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
    console.log(`Step 3: Generating payment key for method: ${paymentMethod}...`);

    // Forward the client-supplied return URL to Paymob so the iframe/wallet
    // redirects back to our canonical HTTPS callback (which iOS then picks
    // up as a Universal Link and hands to the app). Falls back to the
    // per-integration URL configured in the Paymob dashboard.
    const redirectionUrl = body.return_url || undefined;

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
        integration_id: parseInt(activeIntegrationId),
        lock_order_when_paid: true,
        ...(redirectionUrl ? { redirection_url: redirectionUrl } : {}),
      }),
    });

    const paymentKeyData = await paymentKeyRes.json();
    if (!paymentKeyRes.ok || !paymentKeyData.token) {
      console.error("Paymob payment key failed:", paymentKeyData);
      throw new Error("Failed to generate payment key");
    }
    const paymentKey = paymentKeyData.token;
    console.log("Step 3: ✅ Payment key generated");

    // ========================================
    // Build response based on payment method
    // ========================================
    let iframeUrl: string | null = null;
    let walletRedirectUrl: string | null = null;
    let kioskBillReference: string | null = null;

    if (paymentMethod === "card") {
      // Always build the iframe URL using our IFRAME_ID + payment key
      // Do NOT use orderData.order_url — it may reference the wrong integration
      if (iframeId) {
        iframeUrl = `${PAYMOB_BASE}/api/acceptance/iframes/${iframeId}?payment_token=${paymentKey}`;
      } else {
        console.error("PAYMOB_IFRAME_ID is not configured — cannot build card redirect URL");
      }
    } else if (paymentMethod === "wallet") {
      // For wallet, we need to call the wallet pay endpoint
        const walletPhone = body.wallet_phone || profile?.phone || "01000000000";
      console.log("Step 4: Initiating wallet payment...");
      const walletRes = await fetch(`${PAYMOB_BASE}/api/acceptance/payments/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: {
            identifier: walletPhone,
            subtype: "WALLET",
          },
          payment_token: paymentKey,
        }),
      });
      const walletData = await walletRes.json();
      console.log("Wallet response:", JSON.stringify(walletData));
      walletRedirectUrl = walletData?.redirect_url || walletData?.iframe_redirection_url || null;
    } else if (paymentMethod === "kiosk") {
      // For kiosk, call the pay endpoint to get bill reference
      console.log("Step 4: Creating kiosk bill...");
      const kioskRes = await fetch(`${PAYMOB_BASE}/api/acceptance/payments/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source: {
            identifier: "AGGREGATOR",
            subtype: "AGGREGATOR",
          },
          payment_token: paymentKey,
        }),
      });
      const kioskData = await kioskRes.json();
      console.log("Kiosk response:", JSON.stringify(kioskData));
      kioskBillReference = kioskData?.data?.bill_reference?.toString() || kioskData?.id?.toString() || null;
    }

    return new Response(
      JSON.stringify({
        payment_key: paymentKey,
        payment_method: paymentMethod,
        iframe_url: iframeUrl,
        iframe_id: iframeId || null,
        wallet_redirect_url: walletRedirectUrl,
        kiosk_bill_reference: kioskBillReference,
        paymob_order_id: paymobOrderId,
        merchant_order_reference: merchantOrderReference,
        order_number: order.order_number,
        amount_cents: amountCents,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("create-payment error:", message);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
