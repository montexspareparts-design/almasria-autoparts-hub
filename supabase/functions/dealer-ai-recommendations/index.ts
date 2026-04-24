import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const SEASON = (() => {
  const m = new Date().getMonth() + 1;
  if (m >= 6 && m <= 9) return "صيف (تكييف، فريون، فلاتر هواء)";
  if (m >= 12 || m <= 2) return "شتاء (بطاريات، شموع إشعال، مساحات)";
  return "موسم معتدل";
})();

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { user_id, force_refresh } = await req.json();
    if (!user_id) {
      return new Response(JSON.stringify({ error: "user_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Check cache (unless force_refresh)
    if (!force_refresh) {
      const { data: cached } = await supabase
        .from("dealer_ai_recommendations")
        .select("recommendations, expires_at")
        .eq("user_id", user_id)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (cached?.recommendations && Array.isArray(cached.recommendations) && cached.recommendations.length > 0) {
        return new Response(JSON.stringify({ recommendations: cached.recommendations, cached: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // 2. Gather dealer context
    const ninetyDaysAgo = new Date(Date.now() - 90 * 86400000).toISOString();

    const [{ data: dealer }, { data: orders }, { data: views }] = await Promise.all([
      supabase.from("dealer_accounts").select("tier, vehicle_types").eq("user_id", user_id).maybeSingle(),
      supabase.from("orders").select("id, created_at, order_items(product_id, quantity, products(sku, name_ar, brand, category_id))")
        .eq("user_id", user_id).gte("created_at", ninetyDaysAgo).limit(50),
      supabase.from("dealer_price_views").select("product_id, viewed_at, products(sku, name_ar, brand)")
        .eq("user_id", user_id).gte("viewed_at", ninetyDaysAgo).order("viewed_at", { ascending: false }).limit(30),
    ]);

    const purchasedProducts = new Map<string, any>();
    (orders || []).forEach((o: any) => {
      (o.order_items || []).forEach((it: any) => {
        if (it.products) {
          const existing = purchasedProducts.get(it.product_id);
          purchasedProducts.set(it.product_id, {
            ...it.products,
            id: it.product_id,
            total_qty: (existing?.total_qty || 0) + it.quantity,
            last_order: o.created_at,
          });
        }
      });
    });

    const viewedProducts = (views || []).filter((v: any) => v.products).map((v: any) => ({
      id: v.product_id, ...v.products, viewed_at: v.viewed_at,
    }));

    // 3. Get candidate pool: in-stock, active, not recently purchased
    const purchasedIds = Array.from(purchasedProducts.keys());
    let candidateQuery = supabase
      .from("products")
      .select("id, sku, name_ar, brand, category_id, base_price, stock_quantity, is_on_sale, sale_price")
      .eq("is_active", true)
      .gt("stock_quantity", 0)
      .limit(60);

    const { data: candidates } = await candidateQuery;
    const candidatePool = (candidates || []).map((p: any) => ({
      id: p.id, sku: p.sku, name: p.name_ar, brand: p.brand,
      category_id: p.category_id, price: p.base_price, in_stock: p.stock_quantity,
      on_sale: p.is_on_sale,
    }));

    // 4. Build AI prompt
    const dealerContext = {
      tier: dealer?.tier || "retail",
      vehicle_types: dealer?.vehicle_types || [],
      season: SEASON,
      purchased_history: Array.from(purchasedProducts.values()).slice(0, 15).map((p: any) => ({
        sku: p.sku, name: p.name_ar, brand: p.brand, qty: p.total_qty,
        days_ago: Math.floor((Date.now() - new Date(p.last_order).getTime()) / 86400000),
      })),
      recently_viewed: viewedProducts.slice(0, 10).map((v: any) => ({
        sku: v.sku, name: v.name_ar, brand: v.brand,
      })),
    };

    const systemPrompt = `أنت محلل ذكي لقطع غيار السيارات في شركة "المصرية جروب". مهمتك: اقتراح 4 منتجات مخصصة لتاجر بناءً على سلوكه الفعلي.

قواعد:
- اختر بالضبط 4 منتجات من candidate_pool
- نوّع: 1 لإعادة الطلب (مشتراه قبل كده)، 1 مكمل (يكمّل اللي اشتراه)، 1 موسمي، 1 فرصة جديدة (لم يشترها من قبل)
- لا تقترح منتجات مكررة
- أرجع فقط IDs من candidate_pool

الموسم الحالي: ${SEASON}`;

    const userPrompt = `بيانات التاجر:
${JSON.stringify(dealerContext, null, 2)}

candidate_pool (اختر منهم 4 فقط):
${JSON.stringify(candidatePool, null, 2)}

اقترح 4 منتجات.`;

    // 5. Call Lovable AI with tool calling for structured output
    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        tools: [{
          type: "function",
          function: {
            name: "recommend_products",
            description: "Return 4 personalized product recommendations",
            parameters: {
              type: "object",
              properties: {
                recommendations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      product_id: { type: "string", description: "UUID from candidate_pool" },
                      reason_type: { type: "string", enum: ["reorder", "complementary", "seasonal", "opportunity"] },
                    },
                    required: ["product_id", "reason_type"],
                  },
                },
              },
              required: ["recommendations"],
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "recommend_products" } },
      }),
    });

    // Helper: build fallback recs from top candidate pool (no AI needed)
    const buildFallbackRecs = () => {
      const reasons = ["reorder", "complementary", "seasonal", "opportunity"];
      const purchasedSet = new Set(purchasedIds);
      const sorted = [...candidatePool].sort((a: any, b: any) => {
        // Prefer on-sale + in-stock
        if (a.on_sale !== b.on_sale) return a.on_sale ? -1 : 1;
        return (b.in_stock || 0) - (a.in_stock || 0);
      });
      return sorted.slice(0, 4).map((p: any, i: number) => ({
        ...p,
        reason_type: purchasedSet.has(p.id) ? "reorder" : reasons[i] || "opportunity",
      }));
    };

    let aiPicks: { product_id: string; reason_type: string }[] = [];
    let usedFallback = false;

    if (!aiResp.ok) {
      const errText = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, errText);
      // For 402 (credits), 429 (rate limit), or any AI failure: fall back to candidate pool
      // so the dealer always sees recommendations instead of a blank screen.
      usedFallback = true;
    } else {
      const aiData = await aiResp.json();
      const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
      if (toolCall) {
        try {
          const parsed = JSON.parse(toolCall.function.arguments);
          aiPicks = parsed.recommendations || [];
        } catch (parseErr) {
          console.error("Failed to parse AI tool call:", parseErr);
          usedFallback = true;
        }
      } else {
        console.error("No tool call in AI response");
        usedFallback = true;
      }
    }

    // 6. Hydrate full product info from candidates (or use fallback)
    const candidateMap = new Map(candidatePool.map((p: any) => [p.id, p]));
    let finalRecs: any[] = [];

    if (!usedFallback && aiPicks.length > 0) {
      finalRecs = aiPicks
        .map(pick => {
          const product = candidateMap.get(pick.product_id);
          if (!product) return null;
          return { ...product, reason_type: pick.reason_type };
        })
        .filter(Boolean)
        .slice(0, 4);
    }

    // Fill from candidate pool if AI returned fewer than 4 (or fully fell back)
    if (finalRecs.length < 4) {
      const fallbackPicks = buildFallbackRecs();
      const usedIds = new Set(finalRecs.map((r: any) => r.id));
      for (const p of fallbackPicks) {
        if (finalRecs.length >= 4) break;
        if (!usedIds.has(p.id)) finalRecs.push(p);
      }
    }

    // 7. Cache results — 24h for AI results, 1h for fallback (so we retry AI sooner)
    const cacheHours = usedFallback ? 1 : 24;
    const expiresAt = new Date(Date.now() + cacheHours * 3600 * 1000).toISOString();
    await supabase.from("dealer_ai_recommendations").upsert({
      user_id,
      recommendations: finalRecs,
      generated_at: new Date().toISOString(),
      expires_at: expiresAt,
    }, { onConflict: "user_id" });

    return new Response(JSON.stringify({ recommendations: finalRecs, cached: false, fallback: usedFallback }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("dealer-ai-recommendations error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
