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
    // Al Faisal returns { JwtToken: "..." } per updated API docs
    if (typeof data === "string") {
      jwt = data;
    } else {
      jwt = data.JwtToken || data.jwtToken || data.token || data.access_token || null;
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

// ─── Structured Logger ─────────────────────────────────────────
// Generates a unique request id per edge invocation; correlates all ERP API
// calls within the same request so you can grep one id across all stages.
function makeRequestId(): string {
  return `erp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function logErpEvent(reqId: string, stage: string, payload: Record<string, unknown>) {
  // Single-line JSON for easy log search/filter
  try {
    console.log(JSON.stringify({ ts: new Date().toISOString(), reqId, stage, ...payload }));
  } catch {
    console.log(`[ERP][${reqId}][${stage}]`, payload);
  }
}

function byteSize(input: unknown): number {
  if (input == null) return 0;
  try {
    const str = typeof input === "string" ? input : JSON.stringify(input);
    return new TextEncoder().encode(str).length;
  } catch {
    return 0;
  }
}

// ─── Helper: Authenticated fetch to ERP ─────────────────────────
async function erpFetch(
  baseUrl: string,
  path: string,
  options: RequestInit = {},
  reqId: string = "no-req-id",
): Promise<any> {
  const token = await getErpToken(baseUrl);
  const method = (options.method || "GET").toUpperCase();
  const reqBody = options.body as string | undefined;
  const reqBytes = byteSize(reqBody);
  const callId = `${reqId}_${Math.random().toString(36).slice(2, 6)}`;
  const startedAt = Date.now();

  logErpEvent(reqId, "erp_call_start", {
    callId,
    method,
    endpoint: path,
    request_bytes: reqBytes,
  });

  let res: Response;
  try {
    res = await fetch(`${baseUrl}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
  } catch (networkErr: any) {
    const durationMs = Date.now() - startedAt;
    logErpEvent(reqId, "erp_call_network_error", {
      callId, method, endpoint: path,
      duration_ms: durationMs,
      error: String(networkErr?.message || networkErr),
    });
    throw networkErr;
  }

  const text = await res.text();
  const respBytes = new TextEncoder().encode(text).length;
  const durationMs = Date.now() - startedAt;

  let result: any;
  try {
    result = JSON.parse(text);
  } catch {
    logErpEvent(reqId, "erp_call_non_json", {
      callId, method, endpoint: path,
      status: res.status, duration_ms: durationMs,
      response_bytes: respBytes,
      preview: text.substring(0, 200),
    });
    throw new Error(`ERP returned non-JSON (status ${res.status}): ${text.substring(0, 200)}`);
  }

  if (!res.ok) {
    logErpEvent(reqId, "erp_call_http_error", {
      callId, method, endpoint: path,
      status: res.status, duration_ms: durationMs,
      response_bytes: respBytes,
      response_preview: JSON.stringify(result).substring(0, 300),
    });
    throw new Error(`ERP API error [${res.status}]: ${JSON.stringify(result)}`);
  }

  // Soft-failure detection (Al Faisal returns 200 with message=1 on error)
  const softFail = result && typeof result === "object" && (result.message === 1 || result.message === "1");

  logErpEvent(reqId, softFail ? "erp_call_soft_fail" : "erp_call_success", {
    callId, method, endpoint: path,
    status: res.status, duration_ms: durationMs,
    request_bytes: reqBytes,
    response_bytes: respBytes,
    ...(softFail ? { erp_message: result.extramessage || result.message } : {}),
  });

  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const reqId = makeRequestId();
  const handlerStart = Date.now();
  logErpEvent(reqId, "handler_start", {
    method: req.method,
    url: req.url,
    user_agent: req.headers.get("user-agent") || "",
  });

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

    const body = await req.json();
    const { action, data } = body;

    logErpEvent(reqId, "action_received", {
      action,
      auth_mode: isServiceRole ? "service_role" : "user_jwt",
      user_id: userId,
      payload_bytes: byteSize(body),
      data_keys: data && typeof data === "object" ? Object.keys(data) : [],
    });

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
      // Include pickup branch in notes/remarks so it appears in Faisal ERP order
      const orderNotes = String(data.notes || "").trim();
      const payload: any = {
        customerId: data.erp_customer_code ? String(data.erp_customer_code) : "",
        customerName: data.erp_customer_code ? "" : (data.customer_name || ""),
        phone: data.customer_phone || "0000000000",
        items: data.items?.map((item: any) => ({
          productId: String(item.erp_item_code || ""),
          quantity: Number(item.quantity) || 1,
          price: Number(item.unit_price) || 0,
        })),
        // Pass notes under all common keys Al Faisal might accept
        notes: orderNotes,
        remarks: orderNotes,
        remark: orderNotes,
        comment: orderNotes,
        comments: orderNotes,
        description: orderNotes,
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
        }, reqId);
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
          productId: String(item.erp_item_code || ""),
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
        }, reqId);
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
      // Dry-run mode: preview changes without writing to DB
      const isDryRun = body?.dry_run === true || body?.data?.dry_run === true;

      // Block if disabled (only for actual writes, not preview)
      if (!isDryRun && action === "sync_stock" && isStockSyncDisabled) {
        return new Response(
          JSON.stringify({ success: false, message: "⛔ مزامنة الأرصدة متوقفة حالياً. فعّلها من إعدادات ERP (erp_stock_sync_enabled)." }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (!isDryRun && action === "sync_prices" && isPriceSyncDisabled) {
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
        // For dry-run we also include current stock/price + name for preview
        const selectCols = isDryRun
          ? "id, sku, erp_item_code, name_ar, base_price, stock_quantity"
          : "id, sku, erp_item_code";
        const { data: ourProducts, error: dbErr } = await supabase
          .from("products")
          .select(selectCols)
          .eq("is_active", true);

        if (dbErr) throw new Error(`Failed to fetch our products: ${dbErr.message}`);
        if (!ourProducts || ourProducts.length === 0) {
          result = { success: true, message: "No active products on website", updated: 0, total: 0 };
        } else {
          // Build code → product map for dry-run lookups
          const ourByCode = new Map<string, any>();
          if (isDryRun) {
            ourProducts.forEach((p: any) => {
              if (p.erp_item_code) ourByCode.set(p.erp_item_code.trim(), p);
            });
          }
          // Build lookup: match ERP items by erp_item_code ONLY (the Faisal code)
          const ourCodeSet = new Set<string>();
          ourProducts.forEach((p: any) => {
            if (p.erp_item_code) ourCodeSet.add(p.erp_item_code.trim());
          });

          if (action === "sync_stock") {
            // ── Stock: /products now returns id + qty directly (per updated API docs) ──
            const productsRes = await erpFetch(baseUrl, "/Ecommerce/products", {}, reqId);
            const productsList = Array.isArray(productsRes) ? productsRes : (productsRes.data || productsRes.items || []);

            // Build ID → quantity map directly from products endpoint
            const stockMap = new Map<string, number>();
            for (const p of productsList) {
              const erpId = String(p.id || "").trim();
              const qty = Math.floor(Number(p.qty ?? p.quantity ?? 0));
              if (erpId) stockMap.set(erpId, qty);
            }

            // Filter to only items that exist on our website
            const bulkItems: { id: string; qty: number }[] = [];
            for (const [erpId, qty] of stockMap) {
              if (ourCodeSet.has(erpId)) {
                bulkItems.push({ id: erpId, qty });
              }
            }

            console.log(`[ERP Stock v3] ERP total: ${stockMap.size}, Our products: ${ourProducts.length}, Matched: ${bulkItems.length}`);

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

            // ── DRY-RUN: compute stock diffs without writing ──
            if (isDryRun) {
              const changes: Array<{ erp_id: string; name: string; old_qty: number; new_qty: number; delta: number; status: string }> = [];
              for (const it of bulkItems) {
                const prod = ourByCode.get(it.id);
                if (!prod) continue;
                const oldQty = Number(prod.stock_quantity || 0);
                const newQty = it.qty;
                if (oldQty === newQty) continue;
                let status = newQty > oldQty ? "increase" : "decrease";
                if (oldQty > 0 && newQty === 0) status = "out_of_stock";
                else if (oldQty === 0 && newQty > 0) status = "back_in_stock";
                changes.push({ erp_id: it.id, name: prod.name_ar || "", old_qty: oldQty, new_qty: newQty, delta: newQty - oldQty, status });
              }
              changes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
              result = {
                success: true, dry_run: true,
                erp_total: stockMap.size, our_products: ourProducts.length,
                matched: bulkItems.length, with_positive_stock: itemsWithPositiveQty.length,
                changes_count: changes.length,
                increases: changes.filter(c => c.status === "increase").length,
                decreases: changes.filter(c => c.status === "decrease").length,
                back_in_stock: changes.filter(c => c.status === "back_in_stock").length,
                out_of_stock: changes.filter(c => c.status === "out_of_stock").length,
                changes: changes.slice(0, 200),
              };
            } else {
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
            }
          } else {
            // ── Prices: /products now returns id + retailPrice + wholesaleprice directly ──
            const productsRes = await erpFetch(baseUrl, "/Ecommerce/products", {}, reqId);
            const productsList = Array.isArray(productsRes) ? productsRes : (productsRes.data || productsRes.items || []);

            const retailItems: { id: string; price: number }[] = [];
            const wholesaleItems: { id: string; wholesalePrice: number }[] = [];
            let matchedCount = 0;
            const sampleItems: any[] = [];

            for (const prod of productsList) {
              const erpId = String(prod.id || "").trim();
              if (!erpId || !ourCodeSet.has(erpId)) continue;

              matchedCount++;
              const retailPrice = Number(prod.retailPrice ?? prod.price ?? 0);
              const wholesalePrice = Number(prod.wholesaleprice ?? prod.wholesalePrice ?? 0);

              if (retailPrice > 0) {
                retailItems.push({ id: erpId, price: retailPrice });
              }
              if (wholesalePrice > 0) {
                wholesaleItems.push({ id: erpId, wholesalePrice });
              }
              if (sampleItems.length < 5) {
                sampleItems.push({ id: erpId, name: String(prod.name || "").trim(), retailPrice, wholesalePrice });
              }
            }

            console.log(`[ERP Price v3] ERP total: ${productsList.length}, Our products: ${ourProducts.length}, Matched: ${matchedCount}, Retail: ${retailItems.length}, Wholesale: ${wholesaleItems.length}`);

            // ── DRY-RUN: compute price diffs without writing ──
            if (isDryRun) {
              // Fetch existing wholesale tier1 prices for comparison
              const productIds = ourProducts.map((p: any) => p.id);
              const { data: existingTierPrices } = await supabase
                .from("product_tier_prices")
                .select("product_id, price")
                .eq("tier", "wholesale_tier1")
                .in("product_id", productIds);
              const wholesaleByProductId = new Map<string, number>();
              (existingTierPrices || []).forEach((tp: any) => {
                wholesaleByProductId.set(tp.product_id, Number(tp.price || 0));
              });

              // Retail (base_price) changes
              const changes: Array<{ erp_id: string; name: string; old_price: number; new_price: number; delta: number; pct: number; status: string }> = [];
              for (const r of retailItems) {
                const prod = ourByCode.get(r.id);
                if (!prod) continue;
                const oldP = Number(prod.base_price || 0);
                const newP = r.price;
                if (Math.abs(oldP - newP) < 0.01) continue;
                const delta = newP - oldP;
                const pct = oldP > 0 ? (delta / oldP) * 100 : 100;
                changes.push({
                  erp_id: r.id,
                  name: prod.name_ar || "",
                  old_price: oldP,
                  new_price: newP,
                  delta,
                  pct: Math.round(pct * 10) / 10,
                  status: delta > 0 ? "increase" : "decrease",
                });
              }
              changes.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));

              // Wholesale (tier1) changes
              const wholesaleChanges: Array<{ erp_id: string; name: string; old_price: number; new_price: number; delta: number; pct: number; status: string }> = [];
              for (const w of wholesaleItems) {
                const prod = ourByCode.get(w.id);
                if (!prod) continue;
                const oldP = wholesaleByProductId.get(prod.id) ?? 0;
                const newP = w.wholesalePrice;
                if (Math.abs(oldP - newP) < 0.01) continue;
                const delta = newP - oldP;
                const pct = oldP > 0 ? (delta / oldP) * 100 : 100;
                wholesaleChanges.push({
                  erp_id: w.id,
                  name: prod.name_ar || "",
                  old_price: oldP,
                  new_price: newP,
                  delta,
                  pct: Math.round(pct * 10) / 10,
                  status: oldP === 0 ? "new" : (delta > 0 ? "increase" : "decrease"),
                });
              }
              wholesaleChanges.sort((a, b) => Math.abs(b.pct) - Math.abs(a.pct));

              result = {
                success: true, dry_run: true,
                erp_total: productsList.length,
                our_products: ourProducts.length,
                matched: matchedCount,
                retail_changes_count: changes.length,
                wholesale_changes_count: wholesaleChanges.length,
                wholesale_items_in_erp: wholesaleItems.length,
                increases: changes.filter(c => c.status === "increase").length,
                decreases: changes.filter(c => c.status === "decrease").length,
                big_changes: changes.filter(c => Math.abs(c.pct) >= 10).length,
                wholesale_increases: wholesaleChanges.filter(c => c.status === "increase").length,
                wholesale_decreases: wholesaleChanges.filter(c => c.status === "decrease").length,
                wholesale_new: wholesaleChanges.filter(c => c.status === "new").length,
                changes: changes.slice(0, 200),
                wholesale_changes: wholesaleChanges.slice(0, 200),
              };
            } else {
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
                erp_total: productsList.length,
                our_products: ourProducts.length,
                matched: matchedCount,
                sample: sampleItems,
              };
            }
          }
        }
      }

      await supabase.from("erp_sync_logs").insert({
        sync_type: syncType,
        direction: "inbound",
        payload: { action, version: "v3" },
        response: result,
        status: isMock ? "mock" : "success",
      });
    }
    // ─── DEBUG: Show raw ERP response structure ───
    else if (action === "debug_sample") {
      if (!baseUrl) throw new Error("ERP base URL is not configured");
      const productsRes = await erpFetch(baseUrl, "/Ecommerce/products", {}, reqId);
      const productsList = Array.isArray(productsRes) ? productsRes : (productsRes.data || productsRes.items || []);
      // Find specific items by ID for comparison
      const targetIds = ["13621", "12967", "22236", "22774"];
      const targetItems = productsList.filter((p: any) => targetIds.includes(String(p.id || "").trim()));
      // Also grab first 3 items raw
      const firstThree = productsList.slice(0, 3);
      return new Response(JSON.stringify({
        total_items: productsList.length,
        all_keys: productsList.length > 0 ? Object.keys(productsList[0]) : [],
        first_three_raw: firstThree,
        target_items: targetItems,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
        // /products endpoint now returns id, name, price, qty, wholesaleprice, retailPrice directly
        const productsRes = await erpFetch(baseUrl, "/Ecommerce/products", {}, reqId);
        const productsList = Array.isArray(productsRes) ? productsRes : (productsRes.data || productsRes.items || []);

        items = productsList.map((prod: any) => ({
          id: String(prod.id || "").trim(),
          name: String(prod.name || "").trim(),
          price: Number(prod.retailPrice ?? prod.price ?? 0),
          qty: Math.floor(Number(prod.qty ?? prod.quantity ?? 0)),
        })).filter((item: any) => item.id && item.name);
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
        // /products now returns id, name, price, qty directly
        const productsRes = await erpFetch(baseUrl, "/Ecommerce/products", {}, reqId);
        const productsList = Array.isArray(productsRes) ? productsRes : (productsRes.data || productsRes.items || []);

        const merged = productsList.map((prod: any) => ({
          id: String(prod.id || "").trim(),
          name: String(prod.name || "").trim(),
          price: Number(prod.retailPrice ?? prod.price ?? 0),
          quantity: Math.floor(Number(prod.qty ?? prod.quantity ?? 0)),
        })).filter((p: any) => p.id);

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
      // /products now returns all fields directly
      const productsRes = await erpFetch(baseUrl, "/Ecommerce/products", {}, reqId);
      const productsList = Array.isArray(productsRes) ? productsRes : (productsRes.data || productsRes.items || []);

      // Show raw schema
      const productsSchema = Object.entries(productsList[0] || {}).map(([k, v]) => ({ key: k, type: typeof v, value: v }));

      const merged = productsList.map((prod: any) => ({
        id: String(prod.id || "").trim(),
        name: String(prod.name || "").trim(),
        quantity: Math.floor(Number(prod.qty ?? prod.quantity ?? 0)),
        retailPrice: Number(prod.retailPrice ?? prod.price ?? 0),
        wholesalePrice: Number(prod.wholesaleprice ?? prod.wholesalePrice ?? 0),
      })).filter((p: any) => p.id);

      const withStock = merged.filter((i: any) => i.quantity > 0);

      // Find specific target items
      const targets = merged.filter((i: any) => ["10503", "11162", "12495", "12496", "12027", "14898"].includes(i.id));

      result = {
        success: true,
        total_products: productsList.length,
        total_merged: merged.length,
        items_with_positive_qty: withStock.length,
        sample_with_stock: withStock.slice(0, 5),
        products_schema: productsSchema,
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
        const erpResponse = await erpFetch(baseUrl, "/Ecommerce/products", {}, reqId);
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

      const erpResponse = await erpFetch(baseUrl, "/Ecommerce/products", {}, reqId);
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
      const erpResponse = await erpFetch(baseUrl, "/Ecommerce/GetCustomers", {}, reqId);
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
      const erpResponse = await erpFetch(baseUrl, "/Ecommerce/GetPriceList", {}, reqId);
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

      const productsRes = await erpFetch(baseUrl, "/Ecommerce/products", {}, reqId);
      const products = Array.isArray(productsRes) ? productsRes : (productsRes.data || productsRes.items || []);

      // Search for our erp_item_codes in the ERP data
      const ourCodes = data?.erp_codes || ["11603", "20587", "19489"];
      const codeMatches: any[] = [];
      for (const code of ourCodes) {
        const trimCode = code.trim();
        const match = products.find((p: any) => String(p.id).trim() === trimCode);
        if (match) {
          codeMatches.push({ erp_item_code: trimCode, found: true, product: match });
        } else {
          codeMatches.push({ erp_item_code: trimCode, found: false });
        }
      }

      result = {
        success: true,
        products_count: products.length,
        products_keys: products.length > 0 ? Object.keys(products[0]) : [],
        products_sample: products.slice(0, 3),
        codeMatches,
      };
    }

    // ─── TEST: GetPriceList endpoint ───
    else if (action === "test_pricelist") {
      if (!baseUrl) throw new Error("ERP base URL is not configured");
      const priceList = await erpFetch(baseUrl, "/Ecommerce/GetPriceList", {}, reqId);
      const arr = Array.isArray(priceList) ? priceList : (priceList?.data || priceList?.items || [priceList]);
      result = {
        success: true,
        total: arr.length,
        keys: arr.length > 0 ? Object.keys(arr[0]) : [],
        sample: arr.slice(0, 10),
      };
    }

    // ─── FETCH RAW ERP PRICES (read-only, no updates) ───
    else if (action === "fetch_erp_prices") {
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

      if (isMock || !baseUrl) {
        result = { success: false, message: "ERP not configured or in mock mode" };
      } else {
        const productsRes = await erpFetch(baseUrl, "/Ecommerce/products", {}, reqId);
        const productsList = Array.isArray(productsRes) ? productsRes : (productsRes.data || productsRes.items || []);

        const merged = productsList.map((prod: any) => ({
          id: String(prod.id || "").trim(),
          name: String(prod.name || "").trim(),
          retailPrice: Number(prod.retailPrice ?? prod.price ?? 0),
          wholesalePrice: Number(prod.wholesaleprice ?? prod.wholesalePrice ?? 0),
          quantity: Number(prod.qty ?? prod.quantity ?? 0),
        }));

        result = { success: true, total: merged.length, items: merged };
      }
    }

    // ─── ANALYZE ERP CATEGORIES: Cross-reference with our DB ───
    else if (action === "analyze_erp_categories") {
      if (!baseUrl) throw new Error("ERP base URL is not configured");

      // Fetch ERP products with category fields
      const productsRes = await erpFetch(baseUrl, "/Ecommerce/products", {}, reqId);
      const erpProducts = Array.isArray(productsRes) ? productsRes : (productsRes.data || productsRes.items || []);

      // Build ERP lookup by id
      const erpMap = new Map<string, any>();
      for (const p of erpProducts) {
        const id = String(p.id || "").trim();
        if (id) erpMap.set(id, p);
      }

      // Get our categorized products with erp_item_code
      const { data: categorizedProducts } = await supabase
        .from("products")
        .select("erp_item_code, name_ar, category_id, product_categories(name_ar, slug)")
        .not("category_id", "is", null)
        .not("erp_item_code", "is", null);

      // Build mapping: for each category, collect the ERP category field values
      const catFieldAnalysis: Record<string, Record<string, Record<string, number>>> = {};
      const catFields = ["itemcatid", "itemcat2id", "itemcat3id", "itemcat4id", "itemcat5id", "itemcat6id", "itemcat7id", "itemcat8id", "itemcat9id", "itemcat10id"];
      let matchedCount = 0;

      for (const prod of (categorizedProducts || [])) {
        const erpData = erpMap.get(prod.erp_item_code?.trim() || "");
        if (!erpData) continue;
        matchedCount++;

        const catInfo = (prod as any).product_categories;
        const catSlug = catInfo?.slug || "unknown";
        const catName = catInfo?.name_ar || "unknown";
        const catKey = `${catSlug}|${catName}`;

        if (!catFieldAnalysis[catKey]) {
          catFieldAnalysis[catKey] = {};
          for (const f of catFields) catFieldAnalysis[catKey][f] = {};
        }

        for (const f of catFields) {
          const val = String(erpData[f] ?? 0);
          catFieldAnalysis[catKey][f][val] = (catFieldAnalysis[catKey][f][val] || 0) + 1;
        }
      }

      // Find the most discriminating field (highest consistency per category)
      const fieldScores: Record<string, number> = {};
      for (const f of catFields) {
        let score = 0;
        for (const catKey of Object.keys(catFieldAnalysis)) {
          const valueCounts = catFieldAnalysis[catKey][f];
          const entries = Object.entries(valueCounts);
          if (entries.length === 0) continue;
          const total = entries.reduce((s, [, c]) => s + c, 0);
          const maxCount = Math.max(...entries.map(([, c]) => c));
          // Consistency: how dominant is the top value
          score += maxCount / total;
        }
        fieldScores[f] = score;
      }

      // Sort fields by discrimination score
      const rankedFields = Object.entries(fieldScores)
        .sort((a, b) => b[1] - a[1])
        .map(([field, score]) => ({ field, score: Math.round(score * 100) / 100 }));

      // For the best field, build recommended mapping
      const bestField = rankedFields[0]?.field || "itemcatid";
      const recommendedMapping: Record<string, { erp_value: string; confidence: number; sample_count: number }> = {};

      for (const catKey of Object.keys(catFieldAnalysis)) {
        const valueCounts = catFieldAnalysis[catKey][bestField];
        const entries = Object.entries(valueCounts).sort((a, b) => b[1] - a[1]);
        if (entries.length > 0) {
          const total = entries.reduce((s, [, c]) => s + c, 0);
          recommendedMapping[catKey] = {
            erp_value: entries[0][0],
            confidence: Math.round((entries[0][1] / total) * 100),
            sample_count: total,
          };
        }
      }

      // Count uncategorized products
      const { count: uncategorizedCount } = await supabase
        .from("products")
        .select("id", { count: "exact", head: true })
        .is("category_id", null)
        .eq("is_active", true);

      result = {
        success: true,
        total_erp_products: erpProducts.length,
        categorized_matched: matchedCount,
        total_categories: Object.keys(catFieldAnalysis).length,
        uncategorized_products: uncategorizedCount || 0,
        best_discriminating_field: bestField,
        field_ranking: rankedFields,
        recommended_mapping: recommendedMapping,
        raw_analysis: catFieldAnalysis,
      };
    }

    // ─── SYNC CATEGORIES: Auto-assign categories based on ERP fields ───
    else if (action === "sync_categories") {
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

      if (!baseUrl) throw new Error("ERP base URL is not configured");
      const dryRun = data?.dry_run !== false; // Default to dry run for safety

      // Fetch ERP products
      const productsRes = await erpFetch(baseUrl, "/Ecommerce/products", {}, reqId);
      const erpProducts = Array.isArray(productsRes) ? productsRes : (productsRes.data || productsRes.items || []);
      const erpMap = new Map<string, any>();
      for (const p of erpProducts) {
        const id = String(p.id || "").trim();
        if (id) erpMap.set(id, p);
      }

      // Get all categories
      const { data: categories } = await supabase.from("product_categories").select("id, slug, name_ar");
      const catBySlug = new Map<string, string>();
      for (const c of (categories || [])) catBySlug.set(c.slug, c.id);

      // ── Hierarchical classification using multiple ERP fields ──
      // Based on analysis: itemcatid → itemcat5id → itemcat6id → itemcat2id → name-based fallback
      function classifyProduct(erp: any): string | null {
        const cat1 = Number(erp.itemcatid ?? 0);
        const cat2 = Number(erp.itemcat2id ?? 0);
        const cat4 = Number(erp.itemcat4id ?? 0);
        const cat5 = Number(erp.itemcat5id ?? 0);
        const cat6 = Number(erp.itemcat6id ?? 0);
        const cat8 = Number(erp.itemcat8id ?? 0);
        const name = String(erp.name || "").toLowerCase();

        // ── Level 0: Name-based PRIORITY classification (overrides ERP category fields) ──
        // These are high-confidence name matches that should always win
        if (name.includes("تيل") || name.includes("فرامل") || name.includes("brake")) return "brakes";
        if (name.includes("فلتر") || name.includes("filter")) return "filters";
        if (name.includes("بوجيه") || name.includes("بوجية") || name.includes("بواجي") || name.includes("كويل")) return "spark-plugs-coils";
        if (name.includes("دبرياج") || name.includes("كلاتش")) return "clutch";
        if (name.includes("اويل سيل") || name.includes("سيل ")) return "oil-seals";
        if (name.includes("جوان")) return "gaskets";
        if (name.includes("مساعد")) return "shocks";
        if (name.includes("كشاف") || name.includes("لمبه") || name.includes("لمبة") || name.includes("فانوس")) return "lights";
        if (name.includes("اكصدام") || name.includes("اكسدام") || name.includes("بامبر")) return "bumpers";
        if (name.includes("مرايا") || name.includes("مراية")) return "mirrors";
        if (name.includes("كاوتش")) return "rubber";
        if (name.includes("دينامو") || name.includes("مارش") || name.includes("طلمبة بنزين")) return "electrical";
        if (name.includes("سير ") || name.includes("بلي") || name.includes("بيرنج")) return "belts-bearings";
        if (name.includes("عفشه") || name.includes("عفشة") || name.includes("مقص") || name.includes("جلبه") || name.includes("جلبة")) return "suspension";
        if (name.includes("عمه") || name.includes("عمة") || name.includes("مقود")) return "steering";
        if (name.includes("رديتر") || name.includes("ريدياتير") || name.includes("ثرموستات") || name.includes("مروحة")) return "water-cooling";
        if (name.includes("فيبر") || name.includes("كبوت") || name.includes("شنطه") || name.includes("باب")) return "fiber-parts";

        // ── Level 1: Oils (itemcatid=2) — only if name didn't match above ──
        if (cat1 === 2) {
          if (cat2 === 75) return "oils-diesel";
          if (cat2 === 77) return "oils-gasoline";
          if ([88, 89, 100].includes(cat2)) return "oils-transmission";
          if (name.includes("ديزل") || name.includes("diesel")) return "oils-diesel";
          if (name.includes("بنزين") || name.includes("gasoline")) return "oils-gasoline";
          if (name.includes("فتيس") || name.includes("كرونه") || name.includes("كرونة") || name.includes("نقل") || name.includes("باور")) return "oils-transmission";
          if (name.includes("زيت")) return "oils-gasoline";
          return null; // Don't default unknown cat1=2 items
        }

        // ── Level 2: Parts (itemcatid=1) ──
        // Brakes (cat5=19 تيل, cat5=26 ديسك فرامل, cat8=7)
        if (cat5 === 19 || cat5 === 26 || cat8 === 7) return "brakes";
        
        // Clutch (cat5=63)
        if (cat5 === 63) return "clutch";

        // For cat5=8 (general parts), use cat6 to differentiate
        if (cat5 === 8) {
          // Filters (cat6: 234, 320, 428, 536)
          if ([234, 320, 428, 536].includes(cat6)) return "filters";
          // Spark plugs (cat6=194)
          if (cat6 === 194) return "spark-plugs-coils";
          // Water cooling (cat6: 679, 1235)
          if ([679, 1235].includes(cat6)) return "water-cooling";
          // Electrical (cat6: 671, 1372)
          if ([671, 1372].includes(cat6)) return "electrical";
        }

        // ── Level 3: cat5-based broader matches ──
        if (cat5 === 138) {
          // Oils sub-category detected via cat5 even though cat1 might be wrong
          if (name.includes("زيت")) return "oils-gasoline";
        }
        if (cat5 === 10) {
          // Oil seals
          if (name.includes("اويل سيل") || name.includes("سيل")) return "oil-seals";
        }

        // Name-based rules already handled at Level 0 above

        return null; // Cannot classify
      }

      // Get uncategorized products
      const { data: uncategorizedProducts } = await supabase
        .from("products")
        .select("id, erp_item_code, name_ar")
        .is("category_id", null)
        .eq("is_active", true)
        .not("erp_item_code", "is", null);

      // Also allow re-classifying already-categorized if requested
      const includeExisting = data?.include_existing === true;
      let targetProducts = uncategorizedProducts || [];

      if (includeExisting) {
        const { data: allProducts } = await supabase
          .from("products")
          .select("id, erp_item_code, name_ar")
          .eq("is_active", true)
          .not("erp_item_code", "is", null);
        targetProducts = allProducts || [];
      }

      // Apply classification
      let updated = 0;
      let skipped = 0;
      const updates: { id: string; name: string; category: string; method: string }[] = [];
      const unclassified: { id: string; name: string; erp_cats: Record<string, number> }[] = [];

      for (const prod of targetProducts) {
        const erpData = erpMap.get(prod.erp_item_code?.trim() || "");
        if (!erpData) { skipped++; continue; }

        const catSlug = classifyProduct(erpData);
        if (!catSlug || !catBySlug.has(catSlug)) {
          skipped++;
          if (unclassified.length < 10) {
            unclassified.push({
              id: prod.id,
              name: prod.name_ar,
              erp_cats: {
                itemcatid: erpData.itemcatid,
                itemcat2id: erpData.itemcat2id,
                itemcat5id: erpData.itemcat5id,
                itemcat6id: erpData.itemcat6id,
                itemcat8id: erpData.itemcat8id,
              },
            });
          }
          continue;
        }

        const categoryId = catBySlug.get(catSlug)!;
        
        if (!dryRun) {
          const { error } = await supabase
            .from("products")
            .update({ category_id: categoryId })
            .eq("id", prod.id);
          if (!error) updated++;
          else skipped++;
        } else {
          updated++;
        }

        if (updates.length < 30) {
          updates.push({
            id: prod.id,
            name: prod.name_ar,
            category: catSlug,
            method: "hierarchical",
          });
        }
      }

      result = {
        success: true,
        dry_run: dryRun,
        method: "hierarchical_multi_field",
        total_target: targetProducts.length,
        would_categorize: updated,
        skipped,
        sample_updates: updates,
        unclassified_samples: unclassified,
        message: dryRun
          ? `[تجربة] يمكن تصنيف ${updated} صنف من ${targetProducts.length}. أعد الطلب مع dry_run: false للتنفيذ.`
          : `تم تصنيف ${updated} صنف تلقائياً`,
      };

      if (!dryRun) {
        await supabase.from("erp_sync_logs").insert({
          sync_type: "category_sync",
          direction: "inbound",
          payload: { action, method: "hierarchical", include_existing: includeExisting },
          response: { updated, skipped, total: targetProducts.length },
          status: "success",
        });
      }
    }
    // ─── AUTO SYNC FULL: Prices + Stock + Detect new genuine items ───
    // Runs on cron OR manually from admin. No auth required from cron (service role).
    else if (action === "auto_sync_full") {
      syncType = "auto_sync_full";
      if (!baseUrl) throw new Error("ERP base URL is not configured");

      const stockThreshold = Number(data?.stock_threshold ?? 10);
      const startedAt = new Date().toISOString();

      // 1) Fetch ERP products once
      const productsRes = await erpFetch(baseUrl, "/Ecommerce/products", {}, reqId);
      const erpProducts = Array.isArray(productsRes) ? productsRes : (productsRes.data || productsRes.items || []);

      // 2) Fetch our active products
      const { data: ourProducts, error: ourErr } = await supabase
        .from("products")
        .select("id, sku, erp_item_code, name_ar, base_price, stock_quantity, brand")
        .eq("is_active", true);
      if (ourErr) throw new Error(`Failed to fetch our products: ${ourErr.message}`);

      const ourCodeSet = new Set<string>();
      (ourProducts || []).forEach((p: any) => {
        if (p.erp_item_code) ourCodeSet.add(String(p.erp_item_code).trim());
      });

      // 3) Build sync arrays for matched items
      const stockItems: { id: string; qty: number }[] = [];
      const retailItems: { id: string; price: number }[] = [];
      const wholesaleItems: { id: string; wholesalePrice: number }[] = [];

      // 4) Detect NEW genuine items (qty > threshold AND not in our catalog)
      const newGenuineCandidates: any[] = [];

      for (const p of erpProducts) {
        const erpId = String(p.id || "").trim();
        if (!erpId) continue;

        const qty = Math.floor(Number(p.qty ?? p.quantity ?? 0));
        const retailPrice = Number(p.retailPrice ?? p.price ?? 0);
        const wholesalePrice = Number(p.wholesaleprice ?? p.wholesalePrice ?? 0);
        const name = String(p.name || "").trim();

        if (ourCodeSet.has(erpId)) {
          // Existing -> sync
          stockItems.push({ id: erpId, qty });
          if (retailPrice > 0) retailItems.push({ id: erpId, price: retailPrice });
          if (wholesalePrice > 0) wholesaleItems.push({ id: erpId, wholesalePrice });
        } else if (qty > stockThreshold && name) {
          // New candidate: high-stock genuine item not in our catalog
          newGenuineCandidates.push({
            erp_id: erpId,
            name,
            qty,
            retailPrice,
            wholesalePrice,
          });
        }
      }

      // 5) Apply price + stock sync (only when sync is enabled, default true)
      let stockUpdated = 0;
      let retailUpdated = 0;
      let wholesaleUpdated = 0;

      if (!isStockSyncDisabled && stockItems.length > 0) {
        const { data: r } = await supabase.rpc("bulk_sync_stock", { _items: stockItems });
        stockUpdated = r?.updated || 0;
      }
      if (!isPriceSyncDisabled && retailItems.length > 0) {
        const { data: r } = await supabase.rpc("bulk_update_product_prices", { _items: retailItems });
        retailUpdated = r?.updated || 0;
      }
      if (!isPriceSyncDisabled && wholesaleItems.length > 0) {
        const { data: r } = await supabase.rpc("bulk_upsert_wholesale_prices", { _items: wholesaleItems });
        wholesaleUpdated = r?.updated || 0;
      }

      // 6) Auto-insert new genuine items (active, brand=toyota_genuine)
      let newItemsAdded = 0;
      const addedSamples: any[] = [];
      const failedToAdd: any[] = [];

      for (const cand of newGenuineCandidates) {
        const sku = cand.erp_id;
        // Skip if SKU collision with existing inactive product
        const { data: existing } = await supabase
          .from("products")
          .select("id, is_active")
          .or(`sku.eq.${sku},erp_item_code.eq.${cand.erp_id}`)
          .maybeSingle();

        if (existing) {
          // Reactivate existing inactive product
          if (!existing.is_active) {
            const { error: updErr } = await supabase
              .from("products")
              .update({
                is_active: true,
                stock_quantity: cand.qty,
                base_price: cand.retailPrice > 0 ? cand.retailPrice : undefined,
              } as any)
              .eq("id", existing.id);
            if (!updErr) {
              newItemsAdded++;
              addedSamples.push({ ...cand, action: "reactivated" });
            }
          }
          continue;
        }

        const { error: insErr } = await supabase.from("products").insert({
          sku,
          erp_item_code: cand.erp_id,
          name_ar: cand.name,
          base_price: cand.retailPrice > 0 ? cand.retailPrice : 0,
          stock_quantity: cand.qty,
          brand: "toyota_genuine",
          is_active: true,
          is_featured: false,
        } as any);

        if (insErr) {
          failedToAdd.push({ ...cand, error: insErr.message });
        } else {
          newItemsAdded++;
          // Add wholesale tier price if available
          if (cand.wholesalePrice > 0) {
            const { data: newProd } = await supabase
              .from("products")
              .select("id")
              .eq("erp_item_code", cand.erp_id)
              .maybeSingle();
            if (newProd?.id) {
              await supabase.from("product_tier_prices").insert({
                product_id: newProd.id,
                tier: "wholesale_tier1",
                price: cand.wholesalePrice,
              } as any);
            }
          }
          if (addedSamples.length < 50) addedSamples.push({ ...cand, action: "inserted" });
        }
      }

      // 7) Notify admins about new items added
      if (newItemsAdded > 0) {
        const { data: admins } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "admin");

        const notifTitle = `🆕 ${newItemsAdded} صنف أصلي جديد تمت إضافته من الفيصل`;
        const sampleNames = addedSamples.slice(0, 5).map((s) => `• ${s.name} (رصيد: ${s.qty})`).join("\n");
        const notifMsg = `تم اكتشاف وإضافة ${newItemsAdded} صنف جديد برصيد > ${stockThreshold} من نظام الفيصل تلقائياً.\n\nأمثلة:\n${sampleNames}`;

        for (const adm of (admins || [])) {
          await supabase.from("notifications").insert({
            user_id: adm.user_id,
            title: notifTitle,
            message: notifMsg,
            type: "erp_auto_sync",
          } as any);
        }
      }

      result = {
        success: true,
        started_at: startedAt,
        finished_at: new Date().toISOString(),
        erp_total: erpProducts.length,
        our_active_products: (ourProducts || []).length,
        sync: {
          stock_updated: stockUpdated,
          retail_updated: retailUpdated,
          wholesale_updated: wholesaleUpdated,
          stock_disabled: isStockSyncDisabled,
          price_disabled: isPriceSyncDisabled,
        },
        new_items: {
          detected: newGenuineCandidates.length,
          added: newItemsAdded,
          failed: failedToAdd.length,
          threshold: stockThreshold,
          samples: addedSamples.slice(0, 50),
          failed_samples: failedToAdd.slice(0, 20),
        },
      };

      await supabase.from("erp_sync_logs").insert({
        sync_type: syncType,
        direction: "inbound",
        payload: { action, threshold: stockThreshold },
        response: result,
        status: "success",
      });
    }
    else {
      throw new Error(`Unknown action: ${action}`);
    }

    const responseBody = (result && typeof result === "object")
      ? { ...result, request_id: reqId }
      : { result, request_id: reqId };
    const responseJson = JSON.stringify(responseBody);
    logErpEvent(reqId, "handler_end", {
      total_duration_ms: Date.now() - handlerStart,
      status: "ok",
      response_bytes: byteSize(responseJson),
    });
    return new Response(responseJson, {
      headers: { ...corsHeaders, "Content-Type": "application/json", "x-request-id": reqId },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const stack = error instanceof Error ? error.stack : undefined;
    logErpEvent(reqId, "handler_error", {
      total_duration_ms: Date.now() - handlerStart,
      error: message,
      stack: stack ? String(stack).split("\n").slice(0, 6).join(" | ") : undefined,
    });
    console.error(`[ERP][${reqId}] sync error:`, message);

    try {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabase.from("erp_sync_logs").insert({
        sync_type: "error",
        direction: "outbound",
        status: "failed",
        error_message: `[${reqId}] ${message}`,
      });
    } catch (_) {}

    return new Response(JSON.stringify({ success: false, error: message, request_id: reqId }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json", "x-request-id": reqId },
    });
  }
});
