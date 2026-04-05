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

  const results: any = { steps: [] };

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Get ERP config
    const { data: configs } = await supabase.from("erp_config").select("key, value");
    const config: Record<string, string> = {};
    configs?.forEach((c: any) => (config[c.key] = c.value));

    results.erp_mode = config.erp_mode;
    results.erp_base_url = config.erp_base_url;

    const baseUrl = config.erp_base_url;
    const username = Deno.env.get("ERP_FAISAL_USERNAME");
    const password = Deno.env.get("ERP_FAISAL_PASSWORD");

    results.steps.push({
      step: "1. Check Credentials",
      username_set: !!username,
      password_set: !!password,
      base_url: baseUrl || "NOT SET",
    });

    if (!username || !password || !baseUrl) {
      results.error = "Missing credentials or base URL";
      return new Response(JSON.stringify(results, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: Authenticate
    const authStart = Date.now();
    const authRes = await fetch(`${baseUrl}/Ecommerce/Authenticate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const authText = await authRes.text();
    let authData: any;
    try {
      authData = JSON.parse(authText);
    } catch {
      authData = { raw: authText.substring(0, 500) };
    }

    results.steps.push({
      step: "2. Authenticate",
      status: authRes.status,
      duration_ms: Date.now() - authStart,
      has_token: !!authData?.token,
      response_preview: typeof authData === "object"
        ? { ...authData, token: authData?.token ? authData.token.substring(0, 20) + "..." : null }
        : authData,
    });

    if (!authRes.ok || !authData?.token) {
      results.error = `Authentication failed (status ${authRes.status})`;
      return new Response(JSON.stringify(results, null, 2), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 3: Fetch products
    const prodStart = Date.now();
    const prodRes = await fetch(`${baseUrl}/Ecommerce/products`, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authData.token}`,
      },
    });

    const prodText = await prodRes.text();
    let prodData: any;
    try {
      prodData = JSON.parse(prodText);
    } catch {
      prodData = { raw: prodText.substring(0, 500) };
    }

    const items = Array.isArray(prodData) ? prodData : (prodData?.items || prodData?.data || []);

    results.steps.push({
      step: "3. Fetch Products",
      status: prodRes.status,
      duration_ms: Date.now() - prodStart,
      total_items: items.length,
      sample_item: items.length > 0 ? items[0] : null,
      response_type: Array.isArray(prodData) ? "array" : typeof prodData,
      response_keys: typeof prodData === "object" && !Array.isArray(prodData) ? Object.keys(prodData) : undefined,
    });

    // Step 4: Match with local products
    if (items.length > 0) {
      const sampleSku = items[0].itemCode || items[0].sku || items[0].code || "N/A";
      const { data: localProduct } = await supabase
        .from("products")
        .select("id, sku, name_ar, stock_quantity, base_price")
        .eq("sku", sampleSku)
        .maybeSingle();

      results.steps.push({
        step: "4. Match Sample SKU",
        erp_sku: sampleSku,
        local_match: localProduct ? {
          id: localProduct.id,
          name: localProduct.name_ar,
          current_stock: localProduct.stock_quantity,
          current_price: localProduct.base_price,
        } : "NO MATCH FOUND",
      });
    }

    results.success = true;
    results.summary = `✅ Connected! Found ${items.length} products from Al Faisal ERP`;

    return new Response(JSON.stringify(results, null, 2), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    results.error = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify(results, null, 2), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
