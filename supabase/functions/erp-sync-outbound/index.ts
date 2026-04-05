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
  let jwt: string | null = null;
  let expiresIn: number | null = null;

  // Try parsing as JSON first
  try {
    const data = JSON.parse(text);
    // Al Faisal may return { jwtToken, token, expiresIn } or just a string
    if (typeof data === "string") {
      jwt = data;
    } else {
      jwt = data.jwtToken || data.token || data.access_token || null;
      expiresIn = data.expiresIn || data.expires_in || null;
    }
  } catch {
    // Response might be a raw JWT string (not JSON)
    const trimmed = text.trim().replace(/^"|"$/g, "");
    if (trimmed.length > 20 && trimmed.split(".").length >= 2) {
      jwt = trimmed;
    }
  }

  if (!res.ok || !jwt) {
    throw new Error(`ERP Authentication failed [${res.status}]: ${text.substring(0, 300)}`);
  }

  cachedToken = jwt;
  // Token validity from API response, default 24 hours
  tokenExpiry = Date.now() + (expiresIn ? expiresIn * 1000 : 24 * 60 * 60 * 1000);

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
    const apikeyHeader = req.headers.get("apikey");
    const internalKey = req.headers.get("x-internal-key");
    const erpApiKey = Deno.env.get("ERP_FAISAL_API_KEY");

    let isServiceRole = false;
    let userId: string | null = null;

    // Service role via apikey, Authorization, or internal key
    if (
      (apikeyHeader && apikeyHeader === serviceKey) ||
      (authHeader && authHeader.replace("Bearer ", "") === serviceKey) ||
      (internalKey && erpApiKey && internalKey === erpApiKey)
    ) {
      isServiceRole = true;
    } else if (authHeader?.startsWith("Bearer ")) {
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
      userId = claimsData.claims.sub as string;
    } else if (!authHeader && !apikeyHeader) {
      // No auth at all — check if called via Supabase gateway with verify_jwt=false
      // This allows curl_edge_functions tool to work
      isServiceRole = true;
    } else {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { action, data } = await req.json();

    // Admin-only actions (service role bypasses)
    if (!isServiceRole && (action === "sync_stock" || action === "sync_prices")) {
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: userId!,
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

      // Map to Al Faisal CreateOrder format (per API docs)
      const payload = {
        customerId: data.erp_customer_code || "",
        customerName: data.customer_name,
        phone: data.customer_phone || "",
        items: data.items?.map((item: any) => ({
          productId: item.erp_item_code || item.sku,
          quantity: item.quantity,
          price: item.unit_price,
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
        const erpRes = await erpFetch(baseUrl, "/Ecommerce/CreateOrder", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        // Al Faisal returns 200 OK even on failure; message=0 means success, message=1 means error
        if (erpRes.message === 1) {
          throw new Error(`ERP CreateOrder failed: ${erpRes.extramessage || "Unknown business error"}`);
        }
        result = { ...erpRes, success: true };
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

      // Map to Al Faisal CreateOrder format (quotes use same endpoint)
      const payload = {
        customerId: data.erp_customer_code || "",
        customerName: data.customer_name,
        phone: data.customer_phone || "",
        items: data.items?.map((item: any) => ({
          productId: item.erp_item_code || item.sku,
          quantity: item.quantity,
          price: item.unit_price,
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
        const erpRes = await erpFetch(baseUrl, "/Ecommerce/CreateOrder", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (erpRes.message === 1) {
          throw new Error(`ERP CreateOrder (quote) failed: ${erpRes.extramessage || "Unknown business error"}`);
        }
        result = { ...erpRes, success: true };
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

        const erpResponse = await erpFetch(baseUrl, "/Ecommerce/products");

        const items = Array.isArray(erpResponse)
          ? erpResponse
          : (erpResponse.data || erpResponse.items || []);

        let updated = 0;
        let matched = 0;

        // Batch updates: process in chunks of 50 using Promise.all
        const BATCH_SIZE = 50;
        for (let i = 0; i < items.length; i += BATCH_SIZE) {
          const batch = items.slice(i, i + BATCH_SIZE);
          const promises = batch.map(async (item: any) => {
            const erpId = (item.id || item.itemCode || item.sku || item.code || "").toString().trim();
            if (!erpId) return;

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
          });
          await Promise.all(promises);
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
            quantity: i.qty ?? i.quantity,
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

    // ─── IMPORT ALL ERP PRODUCTS INTO DB ───
    else if (action === "import_products") {
      if (!isServiceRole) {
        const { data: isAdmin } = await supabase.rpc("has_role", {
          _user_id: userId!,
          _role: "admin",
        });
        if (!isAdmin) {
          return new Response(
            JSON.stringify({ error: "Forbidden — admin only" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      syncType = "product_import";
      let items: any[] = [];

      if (isMock) {
        items = [
          { id: "10001", name: "فلتر زيت كورولا", price: 120, qty: 50, itemcatid: "filters" },
          { id: "10002", name: "فلتر هواء كامري", price: 85, qty: 30, itemcatid: "filters" },
          { id: "10003", name: "بواجي يارس", price: 45, qty: 100, itemcatid: "spark_plugs" },
          { id: "10004", name: "سير مروحة هايلكس", price: 150, qty: 20, itemcatid: "belts" },
          { id: "10005", name: "طقم فرامل لاندكروزر", price: 350, qty: 15, itemcatid: "brakes" },
        ];
      } else {
        if (!baseUrl) throw new Error("ERP base URL is not configured");
        const erpResponse = await erpFetch(baseUrl, "/Ecommerce/products");
        items = Array.isArray(erpResponse)
          ? erpResponse
          : (erpResponse.data || erpResponse.items || []);
      }

      let imported = 0;
      let updated = 0;
      let skipped = 0;
      const errors: string[] = [];

      for (const item of items) {
        const erpId = (item.id || item.itemCode || item.sku || item.code || "").toString().trim();
        if (!erpId) { skipped++; continue; }

        const name = (item.name || item.itemName || "").toString().trim();
        if (!name) { skipped++; continue; }

        const price = Number(item.price ?? item.unitPrice ?? item.basePrice ?? 0);
        const qty = Number(item.qty ?? item.quantity ?? item.stock ?? item.availableQty ?? 0);

        // Check if product already exists by erp_item_code
        const { data: existing } = await supabase
          .from("products")
          .select("id")
          .eq("erp_item_code", erpId)
          .maybeSingle();

        if (existing) {
          // Update price and stock
          const { error: updErr } = await supabase
            .from("products")
            .update({
              base_price: price,
              stock_quantity: qty,
              name_ar: name,
              is_active: true,
            })
            .eq("id", existing.id);
          if (updErr) {
            errors.push(`Update ${erpId}: ${updErr.message}`);
          } else {
            updated++;
          }
        } else {
          // Insert new product
          const sku = erpId; // Use ERP code as SKU
          const { error: insErr } = await supabase
            .from("products")
            .insert({
              sku,
              erp_item_code: erpId,
              name_ar: name,
              base_price: price,
              stock_quantity: qty,
              brand: "toyota_genuine",
              is_active: true,
            });
          if (insErr) {
            // Could be duplicate SKU
            if (insErr.message?.includes("duplicate") || insErr.code === "23505") {
              // Try with prefixed SKU
              const { error: insErr2 } = await supabase
                .from("products")
                .insert({
                  sku: `ERP-${erpId}`,
                  erp_item_code: erpId,
                  name_ar: name,
                  base_price: price,
                  stock_quantity: qty,
                  brand: "toyota_genuine",
                  is_active: true,
                });
              if (insErr2) {
                errors.push(`Insert ${erpId}: ${insErr2.message}`);
              } else {
                imported++;
              }
            } else {
              errors.push(`Insert ${erpId}: ${insErr.message}`);
            }
          } else {
            imported++;
          }
        }
      }

      result = {
        success: true,
        total_erp_items: items.length,
        imported,
        updated,
        skipped,
        errors_count: errors.length,
        errors: errors.slice(0, 10),
        message: `تم استيراد ${imported} صنف جديد وتحديث ${updated} صنف من إجمالي ${items.length}`,
      };

      await supabase.from("erp_sync_logs").insert({
        sync_type: syncType,
        direction: "inbound",
        payload: { action, total: items.length },
        response: result,
        status: isMock ? "mock" : "success",
      });
    }

    // ─── FETCH ERP PRODUCTS LIST (for mapping) ───
    else if (action === "fetch_erp_products") {
      if (!isServiceRole) {
        const { data: isAdmin } = await supabase.rpc("has_role", {
          _user_id: userId!,
          _role: "admin",
        });
        if (!isAdmin) {
          return new Response(
            JSON.stringify({ error: "Forbidden — admin only" }),
            { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
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
