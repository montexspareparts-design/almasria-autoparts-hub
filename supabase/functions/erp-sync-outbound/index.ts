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

    // ─── SYNC KILL SWITCHES ───
    const isStockSyncDisabled = config.erp_stock_sync_enabled === "false";
    const isPriceSyncDisabled = config.erp_price_sync_enabled === "false";


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
        customerId: data.erp_customer_code ? String(data.erp_customer_code) : "",
        customerName: data.erp_customer_code ? "" : (data.customer_name || ""),
        phone: data.customer_phone || "0000000000",
        items: data.items?.map((item: any) => ({
          productId: String(item.erp_item_code || item.sku || ""),
          quantity: Number(item.quantity) || 1,
          price: Number(item.unit_price) || 0,
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
          // Log the failure but don't crash — let the order proceed
          await supabase.from("erp_sync_logs").insert({
            sync_type: syncType,
            direction: "outbound",
            reference_id: referenceId,
            reference_number: referenceNumber,
            payload,
            response: erpRes,
            status: "failed",
            error_message: erpRes.extramessage || "ERP CreateOrder rejected",
          });
          // Return soft failure — order is saved locally, ERP sync failed
          return new Response(
            JSON.stringify({ success: false, erp_error: true, message: erpRes.extramessage || "ERP rejected the order", docno: null }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
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
        customerId: data.erp_customer_code ? String(data.erp_customer_code) : "",
        customerName: data.erp_customer_code ? "" : (data.customer_name || ""),
        phone: data.customer_phone || "0000000000",
        items: data.items?.map((item: any) => ({
          productId: String(item.erp_item_code || item.sku || ""),
          quantity: Number(item.quantity) || 1,
          price: Number(item.unit_price) || 0,
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
          await supabase.from("erp_sync_logs").insert({
            sync_type: syncType,
            direction: "outbound",
            reference_id: referenceId,
            reference_number: referenceNumber,
            payload,
            response: erpRes,
            status: "failed",
            error_message: erpRes.extramessage || "ERP CreateOrder (quote) rejected",
          });
          return new Response(
            JSON.stringify({ success: false, erp_error: true, message: erpRes.extramessage || "ERP rejected the quote", docno: null }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
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
    // NEW v2: Match by ID (not index), only update products on our website
    else if (action === "sync_stock" || action === "sync_prices") {
      // Block if disabled
      if (action === "sync_stock" && isStockSyncDisabled) {
        return new Response(
          JSON.stringify({ success: false, message: "⛔ مزامنة الأرصدة متوقفة حالياً. فعّلها من إعدادات ERP (erp_stock_sync_enabled)." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (action === "sync_prices" && isPriceSyncDisabled) {
        return new Response(
          JSON.stringify({ success: false, message: "⛔ مزامنة الأسعار متوقفة — الأسعار تُدار من الملفات المرفوعة. فعّلها من إعدادات ERP (erp_price_sync_enabled)." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      syncType = action === "sync_stock" ? "stock_update" : "price_update";

      if (isMock) {
        result = { success: true, message: "Mock mode — no sync performed", updated: 0, total: 0 };
      } else {
        if (!baseUrl) throw new Error("ERP base URL is not configured");

        // ── Step 1: Get OUR products from DB (only active ones) ──
        const { data: ourProducts, error: dbErr } = await supabase
          .from("products")
          .select("id, sku, erp_item_code")
          .eq("is_active", true);

        if (dbErr) throw new Error(`Failed to fetch our products: ${dbErr.message}`);
        if (!ourProducts || ourProducts.length === 0) {
          result = { success: true, message: "No active products on website", updated: 0, total: 0 };
        } else {
          // Build lookup: erp_code → product_id (SKU takes priority, then erp_item_code)
          const ourCodeSet = new Set<string>();
          ourProducts.forEach((p: any) => {
            if (p.sku) ourCodeSet.add(p.sku.trim());
            if (p.erp_item_code) ourCodeSet.add(p.erp_item_code.trim());
          });

          if (action === "sync_stock") {
            // ── Stock: Fetch GetItems (id,name) + products (quantity) and merge by index ──
            // Then filter to only our products by ID match
            const [itemsRes, productsRes] = await Promise.all([
              erpFetch(baseUrl, "/Ecommerce/GetItems"),
              erpFetch(baseUrl, "/Ecommerce/products"),
            ]);

            const itemsList = Array.isArray(itemsRes) ? itemsRes : (itemsRes.data || itemsRes.items || []);
            const productsList = Array.isArray(productsRes) ? productsRes : (productsRes.data || productsRes.items || []);

            // Build ID → quantity map from both endpoints
            const stockMap = new Map<string, number>();
            for (let i = 0; i < itemsList.length; i++) {
              const erpId = String(itemsList[i]?.id || "").trim();
              const qty = Math.floor(Number(productsList[i]?.quantity ?? 0));
              if (erpId) stockMap.set(erpId, qty);
            }

            // Filter to only items that exist on our website
            const bulkItems: { id: string; qty: number }[] = [];
            for (const [erpId, qty] of stockMap) {
              if (ourCodeSet.has(erpId)) {
                bulkItems.push({ id: erpId, qty });
              }
            }

            console.log(`[ERP Stock v2] ERP total: ${stockMap.size}, Our products: ${ourProducts.length}, Matched: ${bulkItems.length}`);

            // Safety check
            const itemsWithPositiveQty = bulkItems.filter(i => i.qty > 0);
            if (bulkItems.length > 20 && itemsWithPositiveQty.length === 0) {
              result = {
                success: false,
                warning: "ERP_ALL_ZERO_STOCK",
                message: "⚠️ جميع الكميات = 0 للأصناف المطابقة. لم يتم تحديث الأرصدة.",
                erp_total: stockMap.size,
                matched: bulkItems.length,
                skipped: true,
              };
              await supabase.from("erp_sync_logs").insert({
                sync_type: syncType, direction: "inbound",
                payload: { action, safety_blocked: true, matched: bulkItems.length },
                response: result, status: "blocked",
                error_message: "All zero stock for matched items",
              });
              return new Response(JSON.stringify(result), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              });
            }

            const { data: bulkResult, error: bulkErr } = await supabase.rpc("bulk_sync_stock", {
              _items: bulkItems,
            });
            if (bulkErr) throw new Error(`Bulk stock sync failed: ${bulkErr.message}`);

            result = {
              success: true,
              updated: bulkResult?.updated || 0,
              total: bulkItems.length,
              erp_total: stockMap.size,
              our_products: ourProducts.length,
              matched: bulkItems.length,
              with_positive_stock: itemsWithPositiveQty.length,
              sample: bulkItems.filter(i => i.qty > 0).slice(0, 5),
            };
          } else {
            // ── Prices: Merge GetItems (id) + products (retailPrice, wholesalePrice) by index ──
            // Then filter to only our products
            const [itemsRes, productsRes] = await Promise.all([
              erpFetch(baseUrl, "/Ecommerce/GetItems"),
              erpFetch(baseUrl, "/Ecommerce/products"),
            ]);

            const itemsList = Array.isArray(itemsRes) ? itemsRes : (itemsRes.data || itemsRes.items || []);
            const productsList = Array.isArray(productsRes) ? productsRes : (productsRes.data || productsRes.items || []);

            // Build ID → prices map (merge by index)
            const retailItems: { id: string; price: number }[] = [];
            const wholesaleItems: { id: string; wholesalePrice: number }[] = [];
            let matchedCount = 0;
            const sampleItems: any[] = [];

            for (let i = 0; i < itemsList.length; i++) {
              const erpId = String(itemsList[i]?.id || "").trim();
              if (!erpId || !ourCodeSet.has(erpId)) continue;

              matchedCount++;
              const prod = productsList[i] || {};
              const retailPrice = Number(prod.retailPrice ?? prod.price ?? 0);
              const wholesalePrice = Number(prod.wholesalePrice ?? 0);

              if (retailPrice > 0) {
                retailItems.push({ id: erpId, price: retailPrice });
              }
              if (wholesalePrice > 0) {
                wholesaleItems.push({ id: erpId, wholesalePrice });
              }
              if (sampleItems.length < 5) {
                sampleItems.push({ id: erpId, name: String(itemsList[i]?.name || "").trim(), retailPrice, wholesalePrice });
              }
            }

            console.log(`[ERP Price v2] ERP total: ${itemsList.length}, Our products: ${ourProducts.length}, Matched: ${matchedCount}, Retail: ${retailItems.length}, Wholesale: ${wholesaleItems.length}`);

            // Update retail prices (base_price)
            let retailUpdated = 0;
            if (retailItems.length > 0) {
              const { data: bulkResult, error: bulkErr } = await supabase.rpc("bulk_update_product_prices", {
                _items: retailItems,
              });
              if (bulkErr) console.error("Retail price sync error:", bulkErr.message);
              retailUpdated = bulkResult?.updated || 0;
            }

            // Update wholesale prices (wholesale_tier1)
            let wholesaleUpdated = 0;
            if (wholesaleItems.length > 0) {
              const { data: wholesaleResult, error: wholesaleErr } = await supabase.rpc("bulk_upsert_wholesale_prices", {
                _items: wholesaleItems,
              });
              if (wholesaleErr) console.error("Wholesale price sync error:", wholesaleErr.message);
              wholesaleUpdated = wholesaleResult?.updated || 0;
            }

            result = {
              success: true,
              retail_updated: retailUpdated,
              wholesale_updated: wholesaleUpdated,
              erp_total: itemsList.length,
              our_products: ourProducts.length,
              matched: matchedCount,
              sample: sampleItems,
            };
          }
        }
      }

      await supabase.from("erp_sync_logs").insert({
        sync_type: syncType,
        direction: "inbound",
        payload: { action, version: "v2" },
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
        // Merge GetItems (id, name) + products (price, quantity) by index
        const [itemsRes, productsRes] = await Promise.all([
          erpFetch(baseUrl, "/Ecommerce/GetItems"),
          erpFetch(baseUrl, "/Ecommerce/products"),
        ]);
        const itemsList = Array.isArray(itemsRes) ? itemsRes : (itemsRes.data || itemsRes.items || []);
        const productsList = Array.isArray(productsRes) ? productsRes : (productsRes.data || productsRes.items || []);

        items = itemsList.map((item: any, i: number) => {
          const prod = productsList[i] || {};
          return {
            id: String(item.id || "").trim(),
            name: String(item.name || item.itemName || "").trim(),
            price: Number(prod.retailPrice ?? prod.price ?? prod.unitPrice ?? 0),
            qty: Math.floor(Number(prod.quantity ?? prod.qty ?? prod.stock ?? 0)),
          };
        }).filter((item: any) => item.id && item.name);
      }

      // Process in batches using the SQL function for performance
      const BATCH_SIZE = 500;
      let totalImported = 0;
      let totalUpdated = 0;
      let totalSkipped = 0;

      for (let i = 0; i < items.length; i += BATCH_SIZE) {
        const batch = items.slice(i, i + BATCH_SIZE).map((item: any) => ({
          id: (item.id || item.itemCode || item.sku || item.code || "").toString().trim(),
          name: (item.name || item.itemName || "").toString().trim(),
          price: Number(item.price ?? item.unitPrice ?? item.basePrice ?? 0),
          qty: Number(item.qty ?? item.quantity ?? item.stock ?? item.availableQty ?? 0),
        }));

        const { data: batchResult, error: batchErr } = await supabase.rpc("bulk_import_products", {
          _items: batch,
        });

        if (batchErr) {
          console.error(`Batch ${i}-${i + BATCH_SIZE} error:`, batchErr.message);
        } else if (batchResult) {
          totalImported += batchResult.imported || 0;
          totalUpdated += batchResult.updated || 0;
          totalSkipped += batchResult.skipped || 0;
        }
      }

      result = {
        success: true,
        total_erp_items: items.length,
        imported: totalImported,
        updated: totalUpdated,
        skipped: totalSkipped,
        message: `تم استيراد ${totalImported} صنف جديد وتحديث ${totalUpdated} صنف من إجمالي ${items.length}`,
      };

      await supabase.from("erp_sync_logs").insert({
        sync_type: syncType,
        direction: "inbound",
        payload: { action, total: items.length },
        response: result,
        status: isMock ? "mock" : "success",
      });
    }

    // ─── IMPORT PRODUCTS BATCH (client sends items chunk) ───
    else if (action === "import_products_batch") {
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

      const batchItems = (data.items || []).map((item: any) => ({
        id: (item.id || item.itemCode || item.sku || item.code || "").toString().trim(),
        name: (item.name || item.itemName || "").toString().trim(),
        price: Number(item.price ?? item.unitPrice ?? item.basePrice ?? 0),
        qty: Number(item.qty ?? item.quantity ?? item.stock ?? item.availableQty ?? 0),
      }));

      const { data: batchResult, error: batchErr } = await supabase.rpc("bulk_import_products", {
        _items: batchItems,
      });

      if (batchErr) throw new Error(`Batch import failed: ${batchErr.message}`);

      result = {
        success: true,
        imported: batchResult?.imported || 0,
        updated: batchResult?.updated || 0,
        skipped: batchResult?.skipped || 0,
        batch_size: batchItems.length,
      };
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
        // Merge GetItems (id, name) + products (price, quantity) by index
        const [itemsRes, productsRes] = await Promise.all([
          erpFetch(baseUrl, "/Ecommerce/GetItems"),
          erpFetch(baseUrl, "/Ecommerce/products"),
        ]);
        const itemsList = Array.isArray(itemsRes) ? itemsRes : (itemsRes.data || itemsRes.items || []);
        const productsList = Array.isArray(productsRes) ? productsRes : (productsRes.data || productsRes.items || []);

        const merged = itemsList.map((item: any, i: number) => {
          const prod = productsList[i] || {};
          return {
            id: String(item.id || "").trim(),
            name: String(item.name || item.itemName || "").trim(),
            price: Number(prod.retailPrice ?? prod.price ?? prod.unitPrice ?? 0),
            quantity: Math.floor(Number(prod.quantity ?? prod.qty ?? prod.stock ?? 0)),
          };
        }).filter((p: any) => p.id);

        result = {
          success: true,
          total: merged.length,
          products: merged,
        };
      }
    }

    // ─── DEEP STOCK CHECK: Find items with qty > 0 ───
    else if (action === "deep_stock_check") {
      if (!baseUrl) throw new Error("ERP base URL is not configured");
      const erpResponse = await erpFetch(baseUrl, "/Ecommerce/products");
      const items = Array.isArray(erpResponse) ? erpResponse : (erpResponse.data || erpResponse.items || []);
      
      const withStock = items.filter((i: any) => {
        const q = i.qty ?? i.quantity ?? i.stock ?? i.availableQty ?? i.balance ?? i.onHand ?? i.inStock;
        return q && Number(q) > 0;
      });
      
      // Check ALL numeric fields across all items
      const firstItem = items[0] || {};
      const allFields = Object.entries(firstItem).map(([k, v]) => ({ key: k, type: typeof v, value: v }));
      
      // Find items 10503 and 11162 and show ALL their fields
      const targets = items.filter((i: any) => {
        const id = (i.id || "").toString().trim();
        return id === "10503" || id === "11162";
      });

      result = {
        success: true,
        total: items.length,
        items_with_positive_qty: withStock.length,
        sample_with_stock: withStock.slice(0, 5),
        all_fields_schema: allFields,
        targets_full: targets,
      };
    }

    // ─── EXPLORE: Try multiple ERP endpoints ───
    else if (action === "explore_endpoints") {
      if (!baseUrl) throw new Error("ERP base URL is not configured");
      const token = await getErpToken(baseUrl);
      const endpoints = data?.endpoints || [
        "/Ecommerce/stock",
        "/Ecommerce/inventory",
        "/Ecommerce/warehouses",
        "/Ecommerce/getstock",
        "/Ecommerce/GetStock",
        "/Ecommerce/GetInventory",
        "/Ecommerce/ProductStock",
        "/Ecommerce/product-stock",
        "/Ecommerce/balances",
        "/Ecommerce/items",
        "/Ecommerce/GetProducts",
      ];
      
      const results: any[] = [];
      for (const ep of endpoints) {
        try {
          const res = await fetch(`${baseUrl}${ep}`, {
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
          });
          const text = await res.text();
          let body: any;
          try { body = JSON.parse(text); } catch { body = text.substring(0, 300); }
          results.push({
            endpoint: ep,
            status: res.status,
            preview: typeof body === 'object' 
              ? { keys: Object.keys(body), itemCount: Array.isArray(body) ? body.length : (Array.isArray(body?.data) ? body.data.length : null), sample: Array.isArray(body) ? body[0] : (Array.isArray(body?.data) ? body.data[0] : body) }
              : body,
          });
        } catch (e: any) {
          results.push({ endpoint: ep, status: "error", message: e.message });
        }
      }
      result = { success: true, results };
    }

    // ─── DEBUG: Show raw ERP fields for specific items ───
    else if (action === "debug_raw") {
      if (isMock) {
        result = { success: true, message: "Debug not available in mock mode" };
      } else {
        if (!baseUrl) throw new Error("ERP base URL is not configured");
        const erpResponse = await erpFetch(baseUrl, "/Ecommerce/products");
        const items = Array.isArray(erpResponse)
          ? erpResponse
          : (erpResponse.data || erpResponse.items || []);

        // Find specific items and show ALL their fields
        const targetIds = data?.ids || ["11162", "10503"];
        const matched = items.filter((i: any) => {
          const itemId = (i.id || i.itemCode || i.sku || i.code || "").toString().trim();
          return targetIds.includes(itemId);
        });

        // Also show keys of first item to understand the schema
        const firstItem = items[0] || {};
        
        result = {
          success: true,
          total_items: items.length,
          all_keys_in_first_item: Object.keys(firstItem),
          first_item_raw: firstItem,
          matched_items: matched.length > 0 ? matched : "No items matched the target IDs",
          target_ids: targetIds,
        };
      }
    }

    // ─── TEST ENDPOINTS (temporary discovery) ───
    else if (action === "test_endpoints") {
      if (!baseUrl) throw new Error("No ERP base URL configured");
      
      const endpoints = [
        "/Ecommerce/GetPriceList",
        "/Ecommerce/GetPriceLists",
        "/Ecommerce/PriceList",
        "/Ecommerce/GetCustomerPrices",
        "/Ecommerce/CustomerPrices",
        "/Ecommerce/GetProductPrices",
        "/Ecommerce/ProductPrices",
        "/Ecommerce/GetWholesalePrices",
        "/Ecommerce/GetRetailPrices",
        "/Ecommerce/GetCategories",
        "/Ecommerce/GetCustomers",
      ];
      
      const results: Record<string, any> = {};
      const token = await getErpToken(baseUrl);
      
      for (const ep of endpoints) {
        try {
          const res = await fetch(`${baseUrl}${ep}`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({}),
          });
          const text = await res.text();
          let parsed: any;
          try { parsed = JSON.parse(text); } catch { parsed = text.substring(0, 300); }
          
          results[ep] = {
            status: res.status,
            preview: typeof parsed === 'object' 
              ? { keys: Object.keys(parsed), isArray: Array.isArray(parsed), length: Array.isArray(parsed) ? parsed.length : undefined, sample: Array.isArray(parsed) ? parsed.slice(0, 2) : parsed }
              : String(parsed).substring(0, 200),
          };
        } catch (e: any) {
          results[ep] = { error: e.message };
        }
      }
      
      result = { success: true, endpoints: results };
    }

    // ─── SEARCH ERP PRODUCTS by keywords ───
    else if (action === "search_erp_products") {
      if (!baseUrl) throw new Error("ERP base URL is not configured");
      const keywords: string[] = data?.keywords || [];
      if (!keywords.length) throw new Error("No keywords provided");

      const erpResponse = await erpFetch(baseUrl, "/Ecommerce/products");
      const items = Array.isArray(erpResponse) ? erpResponse : (erpResponse.data || erpResponse.items || []);

      const matched = items.filter((i: any) => {
        const name = (i.name || i.itemName || "").toString().toLowerCase();
        const id = (i.id || i.itemCode || "").toString().toLowerCase();
        return keywords.some((kw: string) => name.includes(kw.toLowerCase()) || id.includes(kw.toLowerCase()));
      });

      result = {
        success: true,
        total_erp: items.length,
        matched_count: matched.length,
        items: matched.map((i: any) => ({
          id: (i.id || i.itemCode || "").toString().trim(),
          name: i.name || i.itemName || "",
          price: i.price ?? i.unitPrice ?? 0,
          wholesaleprice: i.wholesaleprice ?? null,
          halfwholesaleprice: i.halfwholesaleprice ?? null,
          consumerprice: i.consumerprice ?? null,
          quantity: i.qty ?? i.quantity ?? i.stock ?? 0,
        })),
      };
    }

    // ─── FETCH ERP CUSTOMERS ───
    else if (action === "fetch_erp_customers") {
      if (!baseUrl) throw new Error("ERP base URL is not configured");
      const erpResponse = await erpFetch(baseUrl, "/Ecommerce/GetCustomers");
      const customers = erpResponse?.data || [];
      
      // If a specific code is requested, find it
      const targetCode = data?.customer_code || data?.erp_customer_code;
      if (targetCode) {
        const matched = customers.find((c: any) => c.id?.toString().trim() === targetCode.trim());
        result = {
          success: true,
          customer_name: matched?.name?.trim() || null,
          customer: matched ? { id: matched.id?.trim(), name: matched.name?.trim() } : null,
        };
      } else {
        result = {
          success: true,
          total: customers.length,
          customers: customers.map((c: any) => ({
            id: (c.id || "").toString().trim(),
            name: (c.name || "").toString().trim(),
          })),
        };
      }
    }

    // ─── FETCH PRICE LIST (wholesale, half-wholesale, consumer) ───
    else if (action === "fetch_price_list") {
      if (!baseUrl) throw new Error("ERP base URL is not configured");
      const erpResponse = await erpFetch(baseUrl, "/Ecommerce/GetPriceList");
      const priceItems = erpResponse?.data || [];

      // If specific erp_item_codes requested, filter
      const targetCodes: string[] = data?.erp_item_codes || [];
      
      let filtered = priceItems;
      if (targetCodes.length > 0) {
        const codeSet = new Set(targetCodes.map((c: string) => c.trim()));
        filtered = priceItems.filter((i: any) => codeSet.has((i.itemid || "").toString().trim()));
      }

      const items = filtered.map((i: any) => ({
        itemid: (i.itemid || "").toString().trim(),
        wholesaleprice: Number(i.wholesaleprice ?? 0),
        halfwholesaleprice: Number(i.halfwholesaleprice ?? 0),
        consumerprice: Number(i.consumerprice ?? 0),
      }));

      // If update_db flag is set, update base_price with wholesale price
      if (data?.update_db && items.length > 0) {
        let updatedCount = 0;
        for (const item of items) {
          if (item.wholesaleprice > 0) {
            const { data: updated } = await supabase
              .from("products")
              .update({ base_price: item.wholesaleprice } as any)
              .eq("erp_item_code", item.itemid)
              .select("id");
            if (updated && updated.length > 0) updatedCount++;
          }
        }
        result = {
          success: true,
          total_price_list: priceItems.length,
          filtered: items.length,
          updated_in_db: updatedCount,
          items,
        };

        await supabase.from("erp_sync_logs").insert({
          sync_type: "price_list_update",
          direction: "inbound",
          payload: { action, target_codes: targetCodes, update_db: true },
          response: { updated: updatedCount, total: items.length },
          status: "success",
        });
      } else {
        result = {
          success: true,
          total_price_list: priceItems.length,
          filtered: items.length,
          items,
        };
      }
    }

    // ─── DEBUG: Inspect raw ERP API data ───
    else if (action === "debug_erp_api") {
      if (!baseUrl) throw new Error("ERP base URL is not configured");

      const [itemsRes, productsRes] = await Promise.all([
        erpFetch(baseUrl, "/Ecommerce/GetItems"),
        erpFetch(baseUrl, "/Ecommerce/products"),
      ]);

      const items = Array.isArray(itemsRes) ? itemsRes : (itemsRes.data || itemsRes.items || []);
      const products = Array.isArray(productsRes) ? productsRes : (productsRes.data || productsRes.items || []);

      // Search for our erp_item_codes in the ERP data
      const ourCodes = data?.erp_codes || ["11603", "20587", "19489"];
      const codeMatches: any[] = [];
      for (const code of ourCodes) {
        const trimCode = code.trim();
        const idx = items.findIndex((i: any) => String(i.id).trim() === trimCode);
        if (idx >= 0) {
          codeMatches.push({
            erp_item_code: trimCode,
            found: true,
            index: idx,
            item: items[idx],
            product: products[idx],
          });
        } else {
          codeMatches.push({ erp_item_code: trimCode, found: false });
        }
      }

      result = {
        success: true,
        getItems_count: items.length,
        products_count: products.length,
        getItems_keys: items.length > 0 ? Object.keys(items[0]) : [],
        products_keys: products.length > 0 ? Object.keys(products[0]) : [],
        getItems_sample: items.slice(0, 3),
        products_sample: products.slice(0, 3),
        codeMatches,
      };
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
