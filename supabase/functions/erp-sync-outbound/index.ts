import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── Al Faisal ERP Authentication ───────────────────────────────
let cachedToken: string | null = null;
let tokenExpiry = 0;

async function getErpToken(baseUrl: string): Promise<string> {
  // Reuse token if still valid (with 5 min buffer)
  if (cachedToken && Date.now() < tokenExpiry - 300_000) {
    return cachedToken;
  }

  const username = Deno.env.get("ERP_FAISAL_USERNAME");
  const password = Deno.env.get("ERP_FAISAL_PASSWORD");

  if (!username || !password) {
    throw new Error("ERP credentials (username/password) are not configured");
  }

  const res = await fetch(`${baseUrl}/Ecommerce/Authenticate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });

  const text = await res.text();
  let data: any;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`ERP Auth returned non-JSON (status ${res.status}): ${text.substring(0, 200)}`);
  }

  // Al Faisal returns "jwtToken" not "token"
  const jwt = data.jwtToken || data.token;
  if (!res.ok || !jwt) {
    throw new Error(`ERP Authentication failed [${res.status}]: ${JSON.stringify(data)}`);
  }

  cachedToken = jwt;
  // Token validity from API response, default 24 hours
  tokenExpiry = Date.now() + (data.expiresIn ? data.expiresIn * 1000 : 24 * 60 * 60 * 1000);

  return cachedToken!;
}

// ─── Helper: Authenticated fetch to ERP ─────────────────────────
async function erpFetch(baseUrl: string, path: string, options: RequestInit = {}): Promise<any> {
  const token = await getErpToken(baseUrl);

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let result: any;
  try {
    result = JSON.parse(text);
  } catch {
    throw new Error(`ERP returned non-JSON (status ${res.status}): ${text.substring(0, 200)}`);
  }

  if (!res.ok) {
    throw new Error(`ERP API error [${res.status}]: ${JSON.stringify(result)}`);
  }

  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // ─── Authentication Check ─────────────────────────────────────
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const token = authHeader.replace("Bearer ", "");
    const userClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claimsData, error: authError } = await userClient.auth.getClaims(token);

    if (authError || !claimsData?.claims?.sub) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;

    const { action, data } = await req.json();

    // Admin-only actions
    if (action === "sync_stock" || action === "sync_prices") {
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: "Forbidden — admin only" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fetch ERP config
    const { data: configs } = await supabase
      .from("erp_config")
      .select("key, value");

    const config: Record<string, string> = {};
    configs?.forEach((c: any) => (config[c.key] = c.value));

    const isMock = config.erp_mode === "mock";
    const baseUrl = config.erp_base_url || "";

    let result: any = null;
    let syncType = "";
    let referenceId = "";
    let referenceNumber = "";

    // ─── PUSH ORDER TO ERP (CreateOrder) ───
    if (action === "push_order") {
      syncType = "order_push";
      referenceId = data.order_id;
      referenceNumber = data.order_number;

      // Map to Al Faisal CreateOrder format
      const payload = {
        orderNumber: data.order_number,
        customerCode: data.erp_customer_code || "",
        customerName: data.customer_name,
        customerPhone: data.customer_phone,
        customerTier: data.customer_tier || "retail",
        shippingAddress: data.shipping_address || "",
        shippingGovernorate: data.shipping_governorate || "",
        paymentMethod: data.payment_method || "",
        notes: data.notes || "",
        totalAmount: data.total_amount,
        items: data.items?.map((item: any) => ({
          itemCode: item.erp_item_code || item.sku,
          itemName: item.name_ar,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          totalPrice: item.total_price,
        })),
      };

      if (isMock) {
        result = {
          success: true,
          erp_order_id: `ERP-O-${Date.now()}`,
          message: "Order created in ERP (MOCK MODE)",
        };
      } else {
        if (!baseUrl) throw new Error("ERP base URL is not configured");
        result = await erpFetch(baseUrl, "/Ecommerce/CreateOrder", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      await supabase.from("erp_sync_logs").insert({
        sync_type: syncType,
        direction: "outbound",
        reference_id: referenceId,
        reference_number: referenceNumber,
        payload,
        response: result,
        status: isMock ? "mock" : "success",
      });
    }

    // ─── PUSH QUOTE TO ERP ───
    else if (action === "push_quote") {
      syncType = "quote_push";
      referenceId = data.quote_id;
      referenceNumber = data.quote_number;

      const payload = {
        quoteNumber: data.quote_number,
        customerCode: data.erp_customer_code || "",
        customerName: data.customer_name,
        customerTier: data.customer_tier || "retail",
        notes: data.notes || "",
        totalAmount: data.total_amount,
        items: data.items?.map((item: any) => ({
          itemCode: item.erp_item_code || item.sku,
          itemName: item.name_ar,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          totalPrice: item.total_price,
        })),
      };

      if (isMock) {
        result = {
          success: true,
          erp_quote_id: `ERP-Q-${Date.now()}`,
          message: "Quote created in ERP (MOCK MODE)",
        };
      } else {
        if (!baseUrl) throw new Error("ERP base URL is not configured");
        // Use CreateOrder for quotes too if no separate endpoint
        result = await erpFetch(baseUrl, "/Ecommerce/CreateOrder", {
          method: "POST",
          body: JSON.stringify(payload),
        });
      }

      await supabase.from("erp_sync_logs").insert({
        sync_type: syncType,
        direction: "outbound",
        reference_id: referenceId,
        reference_number: referenceNumber,
        payload,
        response: result,
        status: isMock ? "mock" : "success",
      });
    }

    // ─── SYNC PRODUCTS (Stock + Prices) FROM ERP ───
    else if (action === "sync_stock" || action === "sync_prices") {
      syncType = action === "sync_stock" ? "stock_update" : "price_update";

      if (isMock) {
        const { data: products } = await supabase
          .from("products")
          .select("id, sku, stock_quantity, base_price")
          .eq("is_active", true)
          .limit(10);

        if (action === "sync_stock") {
          const updates = (products || []).map((p: any) => ({
            sku: p.sku,
            old_qty: p.stock_quantity,
            new_qty: Math.floor(Math.random() * 100) + 5,
          }));
          for (const u of updates) {
            await supabase
              .from("products")
              .update({ stock_quantity: u.new_qty })
              .eq("sku", u.sku);
          }
          result = {
            success: true,
            updated_count: updates.length,
            updates,
            message: "Stock synced from ERP (MOCK MODE)",
          };
        } else {
          const updates = (products || []).map((p: any) => ({
            sku: p.sku,
            old_price: p.base_price,
            new_price: Math.round(p.base_price * (0.9 + Math.random() * 0.2)),
          }));
          for (const u of updates) {
            await supabase
              .from("products")
              .update({ base_price: u.new_price })
              .eq("sku", u.sku);
          }
          result = {
            success: true,
            updated_count: updates.length,
            updates,
            message: "Prices synced from ERP (MOCK MODE)",
          };
        }
      } else {
        if (!baseUrl) throw new Error("ERP base URL is not configured");

        // Fetch all products from Al Faisal API
        // Response format: { message, data: [{ id, name, price, qty, itemcatid, ... }] }
        const erpResponse = await erpFetch(baseUrl, "/Ecommerce/products");

        const items = Array.isArray(erpResponse)
          ? erpResponse
          : (erpResponse.data || erpResponse.items || []);

        let updated = 0;
        let matched = 0;

        for (const item of items) {
          // Al Faisal uses "id" as item code, trim whitespace
          const erpId = (item.id || item.itemCode || item.sku || item.code || "").toString().trim();
          if (!erpId) continue;

          if (action === "sync_stock") {
            const qty = item.qty ?? item.quantity ?? item.stock ?? item.availableQty;
            if (qty !== undefined) {
              const { count } = await supabase
                .from("products")
                .update({ stock_quantity: Number(qty) })
                .eq("erp_item_code", erpId)
                .select("id", { count: "exact", head: true });
              if (count && count > 0) { updated++; matched++; }
            }
          } else {
            const price = item.price ?? item.unitPrice ?? item.basePrice;
            if (price !== undefined) {
              const { count } = await supabase
                .from("products")
                .update({ base_price: Number(price) })
                .eq("erp_item_code", erpId)
                .select("id", { count: "exact", head: true });
              if (count && count > 0) { updated++; matched++; }
            }
          }
        }

        result = {
          success: true,
          updated_count: updated,
          total_erp_items: items.length,
          matched_items: matched,
          sample: items.slice(0, 3).map((i: any) => ({
            id: (i.id || "").toString().trim(),
            name: i.name,
            price: i.price,
            quantity: i.quantity,
          })),
        };
      }

      await supabase.from("erp_sync_logs").insert({
        sync_type: syncType,
        direction: "inbound",
        payload: { action },
        response: result,
        status: isMock ? "mock" : "success",
      });
    }

    // ─── FETCH ERP PRODUCTS LIST (for mapping) ───
    else if (action === "fetch_erp_products") {
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: userId,
        _role: "admin",
      });
      if (!isAdmin) {
        return new Response(
          JSON.stringify({ error: "Forbidden — admin only" }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (isMock) {
        result = {
          success: true,
          products: [
            { id: "10001", name: "فلتر زيت كورولا", price: 120, quantity: 50 },
            { id: "10002", name: "فلتر هواء كامري", price: 85, quantity: 30 },
            { id: "10003", name: "بواجي يارس", price: 45, quantity: 100 },
          ],
        };
      } else {
        if (!baseUrl) throw new Error("ERP base URL is not configured");
        const erpResponse = await erpFetch(baseUrl, "/Ecommerce/products");
        const items = Array.isArray(erpResponse)
          ? erpResponse
          : (erpResponse.data || erpResponse.items || []);

        result = {
          success: true,
          total: items.length,
          products: items.map((i: any) => ({
            id: (i.id || i.itemCode || "").toString().trim(),
            name: i.name || i.itemName || "",
            price: i.price ?? i.unitPrice ?? 0,
            quantity: i.qty ?? i.quantity ?? i.stock ?? 0,
          })),
        };
      }
    }

    else {
      throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("ERP sync error:", message);

    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabase.from("erp_sync_logs").insert({
        sync_type: "error",
        direction: "outbound",
        status: "failed",
        error_message: message,
      });
    } catch (_) {}

    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
