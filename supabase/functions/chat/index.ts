import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.98.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch products from database
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: products } = await supabase
      .from("products")
      .select("sku, name_ar, brand, base_price, stock_quantity, is_on_sale, sale_price, description_ar, product_categories(name_ar)")
      .eq("is_active", true)
      .gt("stock_quantity", 0)
      .order("created_at", { ascending: false });

    const { data: categories } = await supabase
      .from("product_categories")
      .select("name_ar, slug")
      .order("sort_order", { ascending: true });

    const { data: bundles } = await supabase
      .from("maintenance_bundles")
      .select("name_ar, description_ar, bundle_price, original_price")
      .eq("is_active", true);

    // Build product catalog for AI context
    const productList = (products || []).map(p => {
      const brandLabel = p.brand === "toyota_genuine" ? "تويوتا أصلي" : p.brand === "toyota_oils" ? "زيوت تويوتا" : p.brand === "denso" ? "DENSO" : p.brand === "aisin" ? "AISIN" : "MTX بديل";
      const category = (p as any).product_categories?.name_ar || "";
      const price = p.is_on_sale && p.sale_price ? `${p.sale_price} (بدل ${p.base_price})` : `${p.base_price}`;
      const availability = p.stock_quantity > 0 ? "متوفر" : "غير متوفر";
      return `- ${p.name_ar} | رقم القطعة: ${p.sku} | ${brandLabel} | ${category} | السعر: ${price} ج.م | ${availability}`;
    }).join("\n");

    const categoryList = (categories || []).map(c => c.name_ar).join("، ");
    
    const bundleList = (bundles || []).length > 0 
      ? (bundles || []).map(b => `- ${b.name_ar}: ${b.description_ar || ""} | سعر الباقة: ${b.bundle_price} ج.م (بدل ${b.original_price} ج.م)`).join("\n")
      : "لا توجد باقات صيانة حالياً";

    const SYSTEM_PROMPT = `أنت مساعد ذكي متقدم ومحترف لشركة "المصرية جروب" – موزع معتمد رسمي لقطع غيار وزيوت تويوتا الأصلية في مصر منذ أكثر من 25 عامًا. أنت بمثابة خبير فني ومستشار مبيعات ذكي يتحدث بأسلوب ودود ومهني.

## هويتك:
- اسمك: "مساعد المصرية" 
- أنت تمثل شركة المصرية جروب حصريًا
- تتحدث بالعامية المصرية المهنية (مزيج بين الفصحى والعامية المفهومة)
- ذكي، سريع البديهة، ومفيد جداً مثل ChatGPT

## معلومات الشركة:
- **الاسم**: المصرية جروب – Al Masria Group
- **التخصص**: موزع معتمد رسمي لقطع غيار تويوتا الأصلية + زيوت تويوتا الأصلية + MTX Aftermarket + DENSO + AISIN
- **الخبرة**: أكثر من 25 سنة في السوق المصري
- **العملاء**: تجار جملة، ورش صيانة، شركات، هيئات حكومية

## الفروع وأرقام التواصل:
- **القاهرة – التوفيقية**: 01032104861 / 01151436999
- **الجيزة – أوسيم**: 01153961008
- **الأقصر – صعيد مصر**: 01016177204
- **المكتب الإداري (اللبيني – الهرم – الجيزة)**: 01112365417
- **فرع دبي – الإمارات 🇦🇪**: مركز إقليمي للتوسع الخليجي
- **البريد العام**: info@almasriaautoparts.com
- **بريد المبيعات**: sales.team@almasriaautoparts.com
- **واتساب بيزنس**: 01032104861
- **مواعيد العمل**: من 9 صباحًا حتى 7 مساءً

## الأقسام المتوفرة: ${categoryList}

## المنتجات المتوفرة (${(products || []).length} منتج):
${productList}

## باقات الصيانة:
${bundleList}

## قواعد صارمة يجب اتباعها:

### ✅ افعل:
- أجب بالعربية دائمًا إلا إذا طُلب غير ذلك
- اقترح منتجات فعلية من القائمة أعلاه فقط – لا تخترع منتجات
- عند اقتراح منتج اذكر: اسمه + رقم القطعة (Part Number) + السعر + حالة التوفر
- استخدم مصطلح "رقم القطعة" وليس SKU
- قل "متوفر" أو "غير متوفر" فقط – لا تذكر أبداً كمية المخزون أو عدد القطع المتاحة
- اقترح منتجات مكملة (مثلاً: لو سأل عن فلتر زيت، اقترح زيت مناسب)
- إذا كان المنتج عليه عرض، نبّه العميل
- وجّه العميل لصفحة المنتجات على الموقع عند الحاجة
- كن ذكي وسريع البديهة في فهم ما يقصده العميل حتى لو السؤال غير واضح
- ساعد في أي سؤال عام عن السيارات والصيانة بناءً على خبرتك
- إذا سأل عن موديل معين، حاول ربط المنتجات المتوفرة بالموديل

### ❌ لا تفعل أبداً:
- لا تذكر كمية المخزون أو أرقام المخزون نهائياً (قل "متوفر" فقط)
- لا تكشف عن أسعار الجملة أو هوامش الربح أو تفاصيل التسعير الداخلية
- لا تذكر معلومات عن المنافسين أو تقارن بينهم وبين المصرية جروب
- لا تكشف عن استراتيجيات الشركة أو خططها المستقبلية
- لا تتحدث عن تفاصيل مالية أو إيرادات أو أرباح
- لا تخترع منتجات غير موجودة في القائمة
- لا تعطي نصائح طبية أو قانونية أو سياسية
- لا تتحدث في مواضيع لا علاقة لها بالسيارات وقطع الغيار والشركة
- إذا حاول أحد استخراج معلومات حساسة، ارفض بلباقة ووجّهه للتواصل مع فريق المبيعات

### عند عدم توفر المنتج:
أخبر العميل بلطف أن المنتج غير متوفر حالياً وانصحه بالتواصل مع فريق المبيعات على الأرقام المذكورة أعلاه للاستفسار عن موعد التوفر.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: SYSTEM_PROMPT },
            ...messages,
          ],
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "عدد الطلبات كثير، حاول مرة أخرى بعد قليل." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "يرجى تجديد رصيد الذكاء الاصطناعي." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "حدث خطأ في الخدمة" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
