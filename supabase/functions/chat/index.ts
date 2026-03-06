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
      const brandLabel = p.brand === "toyota_genuine" ? "تويوتا أصلي" : p.brand === "toyota_oils" ? "زيوت تويوتا" : "MTX بديل";
      const category = (p as any).product_categories?.name_ar || "";
      const price = p.is_on_sale && p.sale_price ? `${p.sale_price} (بدل ${p.base_price})` : `${p.base_price}`;
      return `- ${p.name_ar} | SKU: ${p.sku} | ${brandLabel} | ${category} | السعر: ${price} ج.م | المخزون: ${p.stock_quantity}`;
    }).join("\n");

    const categoryList = (categories || []).map(c => c.name_ar).join("، ");
    
    const bundleList = (bundles || []).length > 0 
      ? (bundles || []).map(b => `- ${b.name_ar}: ${b.description_ar || ""} | سعر الباقة: ${b.bundle_price} ج.م (بدل ${b.original_price} ج.م)`).join("\n")
      : "لا توجد باقات صيانة حالياً";

    const SYSTEM_PROMPT = `أنت مساعد ذكي متخصص في قطع غيار السيارات لشركة "المصرية جروب". مهمتك مساعدة العملاء في إيجاد قطع الغيار المناسبة لسياراتهم من المنتجات المتوفرة فعلياً في المخزون.

معلومات عن الشركة:
- متخصصون في قطع غيار تويوتا الأصلية وزيوت تويوتا وقطع MTX البديلة
- نخدم تجار الجملة وورش الصيانة والشركات

الأقسام المتوفرة: ${categoryList}

المنتجات المتوفرة حالياً في المخزون (${(products || []).length} منتج):
${productList}

باقات الصيانة:
${bundleList}

قواعد مهمة:
- أجب دائماً بالعربية إلا إذا طلب العميل غير ذلك
- اقترح منتجات فعلية من القائمة أعلاه فقط - لا تخترع منتجات غير موجودة
- عند اقتراح منتج، اذكر اسمه ورقم القطعة (SKU) والسعر
- إذا سأل العميل عن منتج غير موجود في القائمة، أخبره بذلك وانصحه بالتواصل مع فريق المبيعات
- اقترح منتجات مرتبطة (مثلاً: لو سأل عن فلتر زيت، اقترح زيت مناسب أيضاً)
- إذا كان المنتج عليه عرض (is_on_sale)، نبّه العميل للعرض
- وجّه العميل لصفحة المنتجات المناسبة على الموقع
- كن مختصراً وودوداً واستخدم إيموجي باعتدال
- إذا لم تكن متأكداً من توافقية قطعة، انصح بالتواصل مع فريق المبيعات`;

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
