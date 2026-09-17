import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// نفس منطق كتالوج الزيوت في src/lib/oils/useOilsCatalog.ts
const PINNED_OIL_PART_NUMBERS = ["08880-84132", "08889-80500", "08889-80602"];
const EXCLUDED_OIL_SKUS = new Set(["11364", "20295"]);
const OIL_LUBRICANT_REGEX = /^\s*زيت\s/;
const NON_LUBRICANT_REGEX = /فلتر|حشوة|سيل|طبة|ساعة|جوان|طلمبة|غطاء|خرطوم|مبين/;

const isOilProduct = (nameAr?: string | null, nameEn?: string | null, partNumber?: string | null) => {
  if (partNumber && PINNED_OIL_PART_NUMBERS.includes(partNumber.trim())) return true;
  const ar = nameAr || "";
  if (NON_LUBRICANT_REGEX.test(ar)) return false;
  if (OIL_LUBRICANT_REGEX.test(ar)) return true;
  return /\boil\b/i.test(nameEn || "") && !/filter|seal|pump|gasket/i.test(nameEn || "");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ── مصادقة اختيارية (الزائر يقدر يسأل، والتاجر بيوصله بياناته) ──
    const authHeader = req.headers.get("Authorization");
    let userId: string | null = null;
    let dealerTier: string | null = null;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (authHeader?.startsWith("Bearer ")) {
      try {
        const anon = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
          global: { headers: { Authorization: authHeader } },
        });
        const token = authHeader.replace("Bearer ", "");
        const { data: claimsData } = await anon.auth.getClaims(token);
        userId = (claimsData?.claims?.sub as string) || null;
        if (userId) {
          const { data: da } = await supabase
            .from("dealer_accounts")
            .select("tier")
            .eq("user_id", userId)
            .eq("is_active", true)
            .maybeSingle();
          dealerTier = da?.tier ?? null;
        }
      } catch {
        /* زائر */
      }
    }

    // ── حد معدل الطلبات ──
    const rateLimitId = userId || req.headers.get("x-forwarded-for") || "unknown";
    const { data: allowed } = await supabase.rpc("check_rate_limit", {
      _identifier: rateLimitId,
      _action: "oils_chat",
      _max_requests: 20,
      _window_seconds: 60,
    });
    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "محاولات كتير، استنى دقيقة وجرب تاني." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { messages } = await req.json();
    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(JSON.stringify({ error: "لا توجد رسائل" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── كتالوج الزيوت + أسعار شريحة التاجر + خصومات الكمية + آخر الطلبات ──
    const { data: allProducts } = await supabase
      .from("products")
      .select("id, name_ar, name_en, sku, erp_item_code, part_number, base_price, sale_price, stock_quantity, brand, min_order_qty, is_on_sale")
      .eq("is_active", true)
      .order("name_ar");

    const oils = (allProducts || []).filter(
      (p: any) => !EXCLUDED_OIL_SKUS.has(p.sku) && isOilProduct(p.name_ar, p.name_en, p.part_number)
    );

    const oilIds = oils.map((p: any) => p.id);
    const tierMap = new Map<string, number>();
    if (dealerTier && oilIds.length > 0) {
      const { data: tierPrices } = await supabase
        .from("product_tier_prices")
        .select("product_id, price")
        .eq("tier", dealerTier)
        .in("product_id", oilIds);
      (tierPrices || []).forEach((tp: any) => tierMap.set(tp.product_id, Number(tp.price)));
    }

    const { data: discounts } = await supabase
      .from("quantity_discounts")
      .select("product_id, brand, min_quantity, discount_type, discount_value")
      .eq("is_active", true)
      .order("min_quantity", { ascending: true });

    const catalogLines = oils.map((p: any) => {
      const base = Number(p.sale_price && p.is_on_sale ? p.sale_price : p.base_price);
      const tierPrice = tierMap.get(p.id);
      const price = tierPrice ?? base;
      const stock = Number(p.stock_quantity) > 0 ? `${p.stock_quantity} وحدة` : "نافد حاليًا";
      return `- ${p.name_ar}${p.name_en ? ` (${p.name_en})` : ""} | بارت نمبر: ${p.part_number || p.erp_item_code || "—"} | كود الصنف: ${p.sku} | السعر: ${price.toLocaleString("ar-EG")} ج.م | المتاح: ${stock}${p.min_order_qty > 1 ? ` | أقل كمية للطلب: ${p.min_order_qty}` : ""}`;
    }).join("\n");

    const discountLines = (discounts || []).map((d: any) => {
      const scope = d.product_id ? `صنف محدد` : d.brand ? `ماركة ${d.brand}` : "كل الأصناف";
      const val = d.discount_type === "percentage" ? `${d.discount_value}%` : `${d.discount_value} ج.م`;
      return `- ${scope}: من ${d.min_quantity} وحدة → خصم ${val}`;
    }).join("\n");

    let ordersContext = "";
    if (userId) {
      const { data: recentOrders } = await supabase
        .from("orders")
        .select("order_number, status, total_amount, created_at, payment_status")
        .eq("user_id", userId)
        .neq("status", "cancelled")
        .order("created_at", { ascending: false })
        .limit(3);
      if (recentOrders && recentOrders.length > 0) {
        const statusLabels: Record<string, string> = {
          pending: "قيد الانتظار", confirmed: "تم التأكيد", processing: "جاري التجهيز",
          shipped: "جاري الشحن", delivered: "تم التسليم",
        };
        ordersContext = `\n## 📦 آخر طلبات العميل:\n${recentOrders.map((o: any) =>
          `- ${o.order_number} | ${statusLabels[o.status] || o.status} | دفع: ${o.payment_status === "paid" ? "مدفوع" : o.payment_status === "pending" ? "لسه مدفوعش" : o.payment_status || "—"} | ${Number(o.total_amount).toLocaleString("ar-EG")} ج.م`
        ).join("\n")}`;
      }
    }

    const pricePolicy = userId
      ? "العميل مسجل تاجر — اعرض الأسعار بثقة واشجعه يعمل طلبية."
      : "العميل زائر غير مسجل — ممنوع منعًا باتًا تعرض أي أسعار. قوله بلطف: «سجل حساب جملة عشان تشوف أسعار الجملة» وجهه لزر «انضم كبائع جملة» في شاشة الدخول.";

    const SYSTEM_PROMPT = `أنتِ "زوجة" — المساعدة الذكية لتطبيق "المصرية للزيوت" (موزع معتمد لزيوت وسوائل تويوتا الأصلية بالجملة في مصر).
اسمك "زوجة" وده اسم حميمي بناديك بيه — اتعاملي بأسلوب زوجة مهتمة بعيلتها وبتدبر عليها. بتتكلمي بالمصري البسيط، بأسلوب ودود وسريع وواثق، وبتختصري — ردود قصيرة على قد السؤال.

## قواعد أساسية:
1. ${pricePolicy}
2. الكتالوج المتاح بين إيديك تحته — ممنوع منعًا باتًا تخترع صنف أو سعر مش موجود فيه.
3. لو السؤال خارج نطاق الزيوت أو محتاج تدخل بشري، وجّهه للواتساب: 01039313427 (إدارة الزيت).
4. لو العميل سأل عن صنف نافد، اعرض عليه الأصناف المتاحة المشابهة من الكتالوج.

## معلومات التطبيق:
- الاستلام من الفرع: مجاني — العميل يختار الفرع من السلة.
- الشحن: للعنوان المسجل في حسابه، ورسوم الشحن بتتدفع لشركة الشحن عند الاستلام (مش في الطلب).
- الدفع: إلكتروني آمن عبر بوابة جيديا (بطاقات بنكية + محافظ إلكترونية) — الدفع بيتم قبل إنشاء الطلب.
- الطلب بيتبني في السلة → المتابعة للدفع → تأكيد الدفع → التجهيز والشحن. العميل يتابع طلبه من «حسابي».
- أعداد الكراتين: زيت 4 لتر = 6 عبوات/كرتونة، 6 لتر = 4 عبوات، 1 لتر = 24 عبوة، سائل الفرامل = 12 عبوة، مياه ردياتير 1 لتر = 12 عبوة، 4 لتر = 4 عبوات.
- التسجيل: زر «انضم كبائع جملة» في شاشة الدخول، والحساب بيتراجع خلال 48 ساعة.
${ordersContext}

## كتالوج الزيوت (الأسعار بالجنيه المصري):
${catalogLines || "لا توجد أصناف متاحة حاليًا"}

${discountLines ? `## خصومات الكمية النشطة:\n${discountLines}` : ""}`;

    // ── استدعاء بوابة Lovable AI (Responses API — streaming) ──
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY is not configured");

    const history = messages.slice(-14).map((m: { role: string; content: string }) => ({
      role: m.role,
      content: [{ type: m.role === "assistant" ? "output_text" : "input_text", text: String(m.content || "").slice(0, 4000) }],
    }));

    const gatewayRes = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": apiKey,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: "openai/gpt-6-astra",
        instructions: SYSTEM_PROMPT,
        input: history,
        stream: true,
        reasoning: { effort: "low", summary: "auto" },
        include: ["reasoning.encrypted_content"],
        store: false,
      }),
    });

    if (!gatewayRes.ok || !gatewayRes.body) {
      const errText = await gatewayRes.text().catch(() => "");
      console.error("AI gateway error:", gatewayRes.status, errText.slice(0, 500));
      const friendly =
        gatewayRes.status === 402
          ? "رصيد المساعدة الذكية خلص مؤقتًا — جرب تاني بعد شوية."
          : gatewayRes.status === 429
            ? "ضغط عالي على المساعدة حاليًا — استنى لحظة وجرب تاني."
            : "المساعدة مش متاحة حاليًا، جرب تاني بعد شوية أو كلمنا واتساب 01039313427 (إدارة الزيت).";
      return new Response(JSON.stringify({ error: friendly }), {
        status: gatewayRes.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(gatewayRes.body, {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("oils-chat error:", e);
    return new Response(
      JSON.stringify({ error: "حصلت مشكلة، جرب تاني أو كلمنا واتساب 01039313427 (إدارة الزيت)." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
