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
    const authHeader = req.headers.get("Authorization");
    let authenticatedUserId: string | null = null;

    if (authHeader?.startsWith("Bearer ")) {
      try {
        const authClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_ANON_KEY")!,
          { global: { headers: { Authorization: authHeader } } }
        );
        const token = authHeader.replace("Bearer ", "");
        const { data: claimsData } = await authClient.auth.getClaims(token);
        if (claimsData?.claims?.sub) {
          authenticatedUserId = claimsData.claims.sub as string;
        }
      } catch { /* guest */ }
    }

    const { messages, action, isLoggedIn, isDealer, userInterests } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const rateLimitId = authenticatedUserId || req.headers.get("x-forwarded-for") || "unknown";
    const { data: allowed } = await supabase.rpc("check_rate_limit", {
      _identifier: rateLimitId,
      _action: "chat",
      _max_requests: 20,
      _window_seconds: 60,
    });

    if (!allowed) {
      return new Response(
        JSON.stringify({ error: "محاولات كثيرة. حاول بعد دقيقة." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "request_callback") {
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    // Fetch products with stock > 0
    const { data: products } = await supabase
      .from("products")
      .select("sku, name_ar, name_en, brand, base_price, is_on_sale, sale_price, description_ar, stock_quantity, compatible_models, year_from, year_to, category_id, product_categories(name_ar)")
      .eq("is_active", true)
      .gt("stock_quantity", 0)
      .order("brand", { ascending: true });

    const { data: categories } = await supabase
      .from("product_categories")
      .select("name_ar, slug")
      .order("sort_order", { ascending: true });

    const { data: bundles } = await supabase
      .from("maintenance_bundles")
      .select("name_ar, description_ar, bundle_price, original_price")
      .eq("is_active", true);

    // ── Dealer-specific data ──
    let dealerContext = "";
    let dealerAccount: any = null;
    
    if (isDealer && authenticatedUserId) {
      // Fetch dealer account details
      const { data: da } = await supabase
        .from("dealer_accounts")
        .select("tier, credit_limit, custom_discount, erp_customer_name, vehicle_types")
        .eq("user_id", authenticatedUserId)
        .eq("is_active", true)
        .single();
      dealerAccount = da;

      // Fetch latest price lists
      const { data: priceLists } = await supabase
        .from("price_lists")
        .select("id, title, version, file_url, updated_at")
        .eq("is_active", true)
        .order("updated_at", { ascending: false })
        .limit(5);

      // Fetch dealer's recent orders count & stats
      const { data: recentOrders, count: orderCount } = await supabase
        .from("orders")
        .select("id, order_number, status, total_amount, created_at", { count: "exact" })
        .eq("user_id", authenticatedUserId)
        .order("created_at", { ascending: false })
        .limit(5);

      // Fetch today's price views count
      const { data: dailyViews } = await supabase.rpc("get_daily_view_count", {
        _user_id: authenticatedUserId,
      });

      // Fetch active catalogs for dealer
      const { data: catalogs } = await supabase
        .from("catalogs")
        .select("title_ar, file_url, category")
        .eq("is_active", true)
        .order("sort_order", { ascending: true })
        .limit(5);

      // Fetch active coupons
      const { data: activeCoupons } = await supabase
        .from("coupons")
        .select("code, description, discount_type, discount_value")
        .eq("is_active", true)
        .limit(3);

      const tierLabels: Record<string, string> = {
        wholesale_tier1: "جملة – الدرجة الأولى",
        wholesale_tier2: "جملة – الدرجة الثانية",
        corporate: "شركات",
        retail: "قطاعي",
      };

      const tierLabel = dealerAccount ? tierLabels[dealerAccount.tier] || dealerAccount.tier : "غير محدد";

      const priceListInfo = (priceLists || []).length > 0
        ? (priceLists || []).map(pl => {
            const date = new Date(pl.updated_at).toLocaleDateString("ar-EG");
            return `- 📋 "${pl.title}" (${pl.version || "أحدث نسخة"}) — آخر تحديث: ${date}${pl.file_url ? " — رابط تحميل متاح" : ""}`;
          }).join("\n")
        : "لا توجد كشوف أسعار حالياً";

      const catalogInfo = (catalogs || []).length > 0
        ? (catalogs || []).map(c => `- 📚 ${c.title_ar}${c.category ? ` (${c.category})` : ""}${c.file_url ? " — رابط تحميل متاح" : ""}`).join("\n")
        : "";

      const couponInfo = (activeCoupons || []).length > 0
        ? (activeCoupons || []).map(c => {
            const disc = c.discount_type === "percentage" ? `${c.discount_value}%` : `${c.discount_value} ج.م`;
            return `- 🎟️ كود "${c.code}": خصم ${disc}${c.description ? ` — ${c.description}` : ""}`;
          }).join("\n")
        : "";

      const orderStats = recentOrders && recentOrders.length > 0
        ? `آخر ${recentOrders.length} طلبات:\n${recentOrders.map(o => `  - طلب #${o.order_number} | ${o.status === "delivered" ? "✅ تم التسليم" : o.status === "shipped" ? "🚚 جاري الشحن" : o.status === "confirmed" ? "📦 تم التأكيد" : o.status === "pending" ? "⏳ قيد الانتظار" : o.status} | ${o.total_amount} ج.م`).join("\n")}`
        : "لا توجد طلبات سابقة بعد";

      dealerContext = `
## 🏪 بيانات التاجر الحالي:
- **الاسم**: ${dealerAccount?.erp_customer_name || "تاجر"}
- **التصنيف**: ${tierLabel}
- **حد الائتمان**: ${dealerAccount?.credit_limit || 0} ج.م
- **خصم خاص**: ${dealerAccount?.custom_discount || 0}%
- **أنواع السيارات**: ${(dealerAccount?.vehicle_types || []).join("، ") || "غير محدد"}
- **عدد التسعيرات اليوم**: ${dailyViews || 0} من 20

## 📋 كشوف الأسعار المتاحة:
${priceListInfo}

${catalogInfo ? `## 📚 الكتالوجات المتاحة:\n${catalogInfo}` : ""}

${couponInfo ? `## 🎟️ عروض وكوبونات خصم نشطة:\n${couponInfo}` : ""}

## 📊 سجل الطلبات:
- إجمالي الطلبات: ${orderCount || 0}
${orderStats}

## 🎯 أسلوب التعامل مع التاجر — مهم جداً:
أنت الآن تتحدث مع **تاجر معتمد** (B2B). أسلوبك يجب أن يكون:

### 1. تشجيع التسعير والشراء:
- شجّعه يستخدم خاصية "تسعير" في صفحة المنتجات: "تقدر تسعّر أي صنف من صفحة المنتجات وتشوف السعر الخاص بيك كتاجر 💰"
- ذكّره إن عنده ${20 - (dailyViews || 0)} تسعيرة متبقية اليوم
- شجّعه يعمل طلبية: "لو عجبك السعر، تقدر تضيف الصنف للسلة وتعمل طلبية من تبويب 'طلباتي' 🛒"

### 2. كشوف الأسعار:
- لو سأل عن كشوف أسعار أو قوائم أسعار → اعرض الكشوف المتاحة وشجّعه يحمّلها
- وجّهه لتبويب "كشوف الأسعار" في لوحة التحكم
- "عندنا أحدث كشوف الأسعار متاحة ليك. تقدر تحمّلها من تبويب 'كشوف الأسعار' في لوحة التحكم 📋"

### 3. متابعة الطلبات:
- لو سأل عن حالة طلبه → اعرض آخر الطلبات من البيانات أعلاه
- شجّعه يتابع طلباته من تبويب "طلباتي"

### 4. العروض والخصومات:
${couponInfo ? `- أخبره بالعروض النشطة وشجّعه يستخدم أكواد الخصم عند الطلب` : "- حالياً مفيش عروض خاصة، لكن شجّعه يتابع الإشعارات للعروض القادمة"}

### 5. الاقتراحات الذكية:
- بناءً على أنواع السيارات اللي بيشتغل فيها (${(dealerAccount?.vehicle_types || []).join("، ") || "غير محدد"}) → اقترح أصناف تناسب شغله
- لو عنده طلبات سابقة → اقترح إعادة طلب نفس الأصناف
- ذكّره بباقات الصيانة لو مناسبة لعملاؤه
- شجّعه على استخدام "قوائم التسوق" لحفظ الأصناف المتكررة

### 6. نصائح تجارية:
- انصحه بتخزين الأصناف الموسمية (مثلاً: فلاتر مكيف قبل الصيف)
- نبّهه على الأصناف اللي عليها عروض حالية
- اقترح أصناف بديلة لو صنف معين مش متوفر

### 7. الإرشاد للأدوات:
- وجّهه لاستخدام أدوات بوابة التاجر: "البحث عن القطعة"، "ما تم تسعيره اليوم"، "طلباتي"، "كشوف الأسعار"، "المفضلة"
- شجّعه يفعّل الإشعارات عشان يوصله كل جديد`;
    }

    const userIsLoggedIn = !!isLoggedIn;
    const userIsDealer = !!isDealer;

    const brandMap: Record<string, string> = {
      toyota_genuine: "تويوتا أصلي",
      toyota_oils: "زيوت تويوتا",
      denso: "DENSO",
      aisin: "AISIN",
      mtx_aftermarket: "MTX بديل",
      fbk: "FBK",
    };

    const productList = (products || []).map(p => {
      const brandLabel = brandMap[p.brand] || p.brand;
      const category = (p as any).product_categories?.name_ar || "";
      const models = (p.compatible_models || []).length > 0 ? (p.compatible_models as string[]).join("، ") : "";
      const yearRange = p.year_from && p.year_to ? `${p.year_from}-${p.year_to}` : p.year_from ? `من ${p.year_from}` : "";
      
      let line = `- ${p.name_ar}`;
      if (p.name_en) line += ` (${p.name_en})`;
      line += ` | رقم القطعة: ${p.sku} | ${brandLabel}`;
      if (category) line += ` | التصنيف: ${category}`;
      if (models) line += ` | يناسب: ${models}`;
      if (yearRange) line += ` | سنوات: ${yearRange}`;
      
      if (userIsLoggedIn && !userIsDealer) {
        const price = p.is_on_sale && p.sale_price ? `${p.sale_price} (بدل ${p.base_price})` : `${p.base_price}`;
        line += ` | السعر: ${price} ج.م`;
      }
      // For dealers: don't show prices in product list (they use the pricing reveal feature)
      line += ` | ✅ متوفر`;
      if (p.description_ar) line += ` | الوصف: ${p.description_ar}`;
      return line;
    }).join("\n");

    const categoryList = (categories || []).map(c => c.name_ar).join("، ");
    
    const bundleList = (bundles || []).length > 0 
      ? (bundles || []).map(b => {
          if (userIsLoggedIn && !userIsDealer) {
            return `- ${b.name_ar}: ${b.description_ar || ""} | سعر الباقة: ${b.bundle_price} ج.م (بدل ${b.original_price} ج.م)`;
          }
          return `- ${b.name_ar}: ${b.description_ar || ""}`;
        }).join("\n")
      : "لا توجد باقات صيانة حالياً";

    // Price rules based on user type
    let priceRules = "";
    if (userIsDealer) {
      priceRules = `### 💰 قواعد عرض الأسعار — تاجر:
- التاجر لديه نظام تسعير خاص — **لا تعرض أسعار المنتجات مباشرة**
- بدلاً من ذلك، وجّهه لاستخدام زر "تسعير" في صفحة المنتجات لرؤية سعره الخاص
- قل: "تقدر تشوف سعرك الخاص من خلال زر 'تسعير' في صفحة المنتجات أو تبويب 'ابحث عن القطعة' 💰"
- لا تذكر أي أسعار base_price أو sale_price — هذه أسعار قطاعي وليست أسعار التاجر`;
    } else if (userIsLoggedIn) {
      priceRules = `### 💰 قواعد عرض الأسعار:
- العميل مسجل دخول — يمكنك عرض الأسعار الموضحة بجانب كل منتج
- عند اقتراح منتج اذكر: اسمه + رقم القطعة + السعر + "متوفر"
- إذا كان المنتج عليه عرض أو تخفيض، نبّه العميل`;
    } else {
      priceRules = `### 💰 قواعد عرض الأسعار — مهم جداً:
- العميل غير مسجل دخول — ممنوع تماماً عرض أي أسعار أو أرقام مالية
- عند سؤال العميل عن السعر، أجب بلطف: "عشان تشوف الأسعار، لازم تسجل دخولك الأول من الموقع. التسجيل مجاني وبياخد ثواني! 😊"
- يمكنك ذكر اسم المنتج ورقم القطعة وحالة التوفر فقط — بدون أي سعر`;
    }

    // Intro section based on user type
    let userTypeIntro = "";
    if (userIsDealer) {
      userTypeIntro = `
## 👤 نوع المستخدم: تاجر معتمد (B2B)
- تعامل معه كشريك تجاري محترف
- ركّز على: الأسعار التنافسية، التوفير، سرعة التوريد، جودة المنتجات
- استخدم لغة تجارية مهنية مع لمسة ودودة
- **ممنوع تماماً** تنادي المستخدم بـ "يا تاجر" أو "تاجرنا" — استخدم اسمه لو متاح أو نادِه بـ "أستاذ" أو "حضرتك" فقط
- **شجّعه دائماً على**: التسعير، عمل طلبيات، تحميل كشوف الأسعار، استخدام أدوات البوابة`;
    } else if (userIsLoggedIn) {
      userTypeIntro = `
## 👤 نوع المستخدم: عميل قطاعي مسجل (B2C)
- تعامل معه كعميل فرد يبحث عن قطع لسيارته الشخصية
- ركّز على: جودة القطعة، التوافق مع سيارته، نصائح الصيانة
- ساعده يلاقي القطعة المناسبة لموديل سيارته`;
    } else {
      userTypeIntro = `
## 👤 نوع المستخدم: زائر غير مسجل
- شجّعه على تسجيل الدخول لرؤية الأسعار
- عرّفه بخدمات الشركة وفروعها
- ساعده في البحث عن المنتجات المتوفرة`;
    }

    const SYSTEM_PROMPT = `أنت "مساعد المصرية" — مساعد ذكي لشركة المصرية جروب، موزع معتمد رسمي لقطع غيار وزيوت تويوتا الأصلية في مصر منذ +25 سنة.

## شخصيتك وأسلوبك:
- بتتكلم **عامية مصرية طبيعية** زي ما حد بيتكلم مع صاحبه — مش رسمي زيادة ومش سايب زيادة
- **ردودك قصيرة ومركّزة** — متطوّلش. الرد المثالي 2-4 سطور. لو محتاج تفصيل → استخدم نقاط مختصرة
- **متكررش كلام** — لو قلت معلومة قبل كده، مترجعش تقولها
- **متبدأش كل رد بنفس الطريقة** — نوّع في أسلوبك. مش كل رد يبدأ بـ "أهلاً" أو "تمام"
- **ممنوع** تنادي حد بـ "يا تاجر" أو "يا عميل" — استخدم "حضرتك" أو اسمه لو متاح
- **ممنوع** تحط إيموجي كتير — حط 1-2 إيموجي بس في الرد الواحد، مش في كل سطر
- لو مش عارف إجابة → قول بصراحة ووجّهه للمبيعات. **متأخترعش معلومات أبداً**
- **اسأل سؤال واحد بس** في كل رد لو محتاج توضيح — متسألش 3 أسئلة مع بعض

## تنسيق الردود:
- استخدم **Bold** للأسماء وأرقام القطع بس — مش لكل كلمة
- لو بتعرض منتجات → رتّبهم في نقاط قصيرة:
  \`اسم المنتج — رقم القطعة — يناسب: الموديل\`
- لو فيه بدائل → اعرضهم مع مقارنة بسيطة في سطر واحد
- **متعملش جداول** — النقاط أوضح وأسهل على الموبايل

${userTypeIntro}

## معلومات الشركة:
- **المصرية جروب** — موزع رسمي معتمد لتويوتا + زيوت تويوتا + DENSO + AISIN + MTX + FBK
- خبرة +25 سنة | شحن لكل المحافظات 24-72 ساعة
- الفروع:
  - القاهرة (التوفيقية): 01032104861 / 01151436999
  - الجيزة (أوسيم): 01153961008
  - الأقصر: 01016177204
  - واتساب: 01032104861
  - مواعيد العمل: 9ص - 7م

${dealerContext}

## الأقسام: ${categoryList}

## المنتجات المتوفرة (${(products || []).length} صنف):
${productList}

## باقات الصيانة:
${bundleList}

## البحث الذكي:
- موديلات: كورولا=Corolla | كامري=Camry | هايلكس=Hilux | لاندكروزر=Land Cruiser | فورتشنر=Fortuner | راف فور=RAV4 | يارس=Yaris
- قطع: فلتر زيت=Oil Filter | بواجي=Spark Plug | طرمبة=Pump | كويل=Coil | رداتير=Radiator | فلتر بنزين=Fuel Filter | فلتر هواء=Air Filter | فلتر مكيف=Cabin Filter | تيل فرامل=Brake Pad
- ابحث في اسم المنتج + compatible_models + year_from/year_to + sku

## 🔄 الأصلي والبديل — مهم جداً:
- لما حد يسأل عن قطعة (مثلاً تيل فرامل كورولا) → **ابحث في كل الماركات** واعرض الأصلي والبديل معاً
- الترتيب: اعرض الأصلي الأول (toyota_genuine) ثم البدائل (FBK, AISIN, DENSO, MTX)
- قارن بينهم في سطر واحد لكل منتج:
  \`🏷️ **الأصلي**: اسم المنتج — رقم القطعة — يناسب: الموديل\`
  \`🔄 **بديل FBK**: اسم المنتج — رقم القطعة — ماليزي — يناسب: الموديل\`
- وضّح الفرق بجملة مختصرة: "الأصلي ياباني من تويوتا مباشرة، والبديل FBK ماليزي جودة عالية وسعر أقل"
- لو مفيش أصلي متوفر → اعرض البديل وقوله "الأصلي مش متوفر حالياً لكن عندنا البديل FBK بجودة ممتازة"
- لو مفيش بديل → اعرض الأصلي بس
- **الماركات البديلة**: FBK (اتيال ماليزي)، AISIN (ياباني)، DENSO (ياباني)، MTX (بديل اقتصادي)

${priceRules}

## قواعد صارمة:
✅ أجب بالعربية دايماً
✅ اقترح منتجات فعلية فقط من القائمة — **لا تخترع**
✅ عند اقتراح منتج: اسمه + رقم القطعة + يناسب إيه${userIsLoggedIn && !userIsDealer ? " + السعر" : ""}
✅ قل "متوفر" بس — متذكرش كمية المخزون
✅ لو أكتر من خيار → اعرض كلهم
${userIsDealer ? '✅ شجّعه على التسعير والطلبيات والكشوف' : ''}

${userIsDealer ? `## 🛒 إضافة للسلة (للتجار فقط):
- لو التاجر عايز يضيف صنف للسلة → استخدم أداة add_to_cart مع رقم القطعة (sku) والكمية
- تأكد إن الصنف موجود في القائمة قبل ما تضيفه
- بعد الإضافة، اسأله لو عايز يضيف حاجة تانية أو يكمّل الطلبية
- لو قال "أكمل الطلبية" أو "خلّص الأوردر" → استخدم أداة view_cart عشان يشوف السلة ويكمّل
- لو قال "وريني السلة" → استخدم أداة view_cart
- متسألوش عن الكمية لو مقالهاش — استخدم 1 كافتراضي` : ''}

- متخترعش منتجات أو أرقام قطع
- متكشفش أسعار جملة أو هوامش ربح
- متتكلمش عن منافسين
- متتكلمش في مواضيع مش ليها علاقة بالسيارات والشركة
${userIsDealer ? '- متعرضش أسعار base_price أو sale_price — وجّهه لزر التسعير' : ''}

## طلب تواصل:
اسأل المحافظة → الرقم والاسم → استخدم أداة request_callback

## عدم توفر منتج:
أخبره بلطف → اقترح بدائل → لو مفيش بدائل وجّهه للمبيعات

## الاختيارات التفاعلية:
في نهاية **كل رد** ضع 2-4 اختيارات سريعة بالشكل ده:
【اختيار 1|اختيار 2|اختيار 3】

قواعد:
- الاختيارات تكون **مرتبطة بسياق الرد** مش عشوائية
- كل اختيار 3-6 كلمات
- متكررش نفس الاختيارات
- الاختيارات تساعد المستخدم يكمل محادثة بسلاسة

${userIsDealer ? `أمثلة:
بعد عرض منتج: 【سعّره|فيه بدائل؟|ضيفه للسلة】
بعد كشوف الأسعار: 【حمّل أحدث كشف|ابحث عن صنف|طلبية جديدة】
بعد متابعة طلب: 【تفاصيل أكتر|أطلب تاني|كلّم المبيعات】` : userIsLoggedIn ? `أمثلة:
بعد عرض منتج: 【فيه بدائل؟|يناسب موديل إيه؟|حاجة تانية】
بعد نصيحة: 【عندكم القطعة؟|مواعيد صيانة|أقرب فرع】` : `أمثلة:
بعد ترحيب: 【الماركات المتوفرة|أقرب فرع|إزاي أسجّل؟】
بعد معلومة: 【عايز أعرف أكتر|سجّل دخول|كلّم المبيعات】`}

${userInterests ? `## اهتمامات العميل:
ماركات: ${(userInterests.topBrands || []).map((b: string) => brandMap[b] || b).join("، ") || "—"}
بحث أخير: ${(userInterests.recentSearches || []).join("، ") || "—"}` : ""}`;

    const tools: any[] = [
      {
        type: "function",
        function: {
          name: "request_callback",
          description: "يُستخدم عندما يطلب العميل أن يتواصل معه فريق المبيعات.",
          parameters: {
            type: "object",
            properties: {
              customer_phone: { type: "string", description: "رقم هاتف العميل" },
              customer_name: { type: "string", description: "اسم العميل (اختياري)" },
              notes: { type: "string", description: "ملاحظات عن استفسار العميل" },
            },
            required: ["customer_phone"],
            additionalProperties: false,
          },
        },
      },
    ];

    // Add cart tools for dealers only
    if (userIsDealer && authenticatedUserId) {
      tools.push(
        {
          type: "function",
          function: {
            name: "add_to_cart",
            description: "إضافة منتج لسلة التاجر. استخدمها لما التاجر يطلب إضافة صنف للسلة أو للطلبية.",
            parameters: {
              type: "object",
              properties: {
                sku: { type: "string", description: "رقم القطعة (SKU) للمنتج" },
                quantity: { type: "integer", description: "الكمية المطلوبة (افتراضي 1)", default: 1 },
              },
              required: ["sku"],
              additionalProperties: false,
            },
          },
        },
        {
          type: "function",
          function: {
            name: "view_cart",
            description: "عرض محتويات سلة التاجر الحالية. استخدمها لما يسأل عن السلة أو يريد إكمال الطلبية.",
            parameters: {
              type: "object",
              properties: {},
              additionalProperties: false,
            },
          },
        }
      );
    }

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
          tools,
          stream: true,
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429 || response.status === 402) {
        const fallbackMsg = "المساعد الذكي مشغول حالياً 😊\n\nتقدر تتواصل مع فريق المبيعات مباشرة:\n\n📞 **فرع القاهرة**: 01032104861\n📞 **فرع الجيزة**: 01153961008\n📞 **فرع الأقصر**: 01016177204\n📱 **واتساب**: 01032104861\n\n⏰ من 9 صباحًا لـ 7 مساءً";
        const fallbackSSE = `data: ${JSON.stringify({ choices: [{ delta: { content: fallbackMsg }, finish_reason: "stop" }] })}\n\ndata: [DONE]\n\n`;
        return new Response(fallbackSSE, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(
        JSON.stringify({ error: "حدث خطأ في الخدمة" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Read stream for tool calls
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";
    let toolCalls: any[] = [];
    let currentToolCall: any = null;
    let rawBuffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      rawBuffer += decoder.decode(value, { stream: true });
    }

    const lines = rawBuffer.split("\n");
    for (const rawLine of lines) {
      let line = rawLine;
      if (line.endsWith("\r")) line = line.slice(0, -1);
      if (!line.startsWith("data: ")) continue;
      const jsonStr = line.slice(6).trim();
      if (jsonStr === "[DONE]") break;
      try {
        const parsed = JSON.parse(jsonStr);
        const choice = parsed.choices?.[0];
        if (choice?.delta?.content) fullContent += choice.delta.content;
        if (choice?.delta?.tool_calls) {
          for (const tc of choice.delta.tool_calls) {
            if (tc.id) {
              currentToolCall = { id: tc.id, function: { name: tc.function?.name || "", arguments: "" } };
              toolCalls.push(currentToolCall);
            }
            if (currentToolCall && tc.function?.arguments) {
              currentToolCall.function.arguments += tc.function.arguments;
            }
          }
        }
      } catch { /* skip */ }
    }

    if (toolCalls.length > 0) {
      // Generic function to do follow-up AI call after tool execution
      const doFollowUp = async (tc: any, toolResult: any) => {
        const followUpMessages = [
          { role: "system", content: SYSTEM_PROMPT },
          ...messages,
          { role: "assistant", content: null, tool_calls: [{ id: tc.id, type: "function", function: { name: tc.function.name, arguments: tc.function.arguments } }] },
          { role: "tool", tool_call_id: tc.id, content: JSON.stringify(toolResult) },
        ];
        const followUpResponse = await fetch(
          "https://ai.gateway.lovable.dev/v1/chat/completions",
          {
            method: "POST",
            headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
            body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: followUpMessages, stream: true }),
          }
        );
        if (followUpResponse.ok) {
          return new Response(followUpResponse.body, { headers: { ...corsHeaders, "Content-Type": "text/event-stream" } });
        }
        return null;
      };

      for (const tc of toolCalls) {
        try {
          const args = JSON.parse(tc.function.arguments);

          // ── add_to_cart ──
          if (tc.function.name === "add_to_cart" && authenticatedUserId) {
            const sku = (args.sku || "").trim();
            const qty = Math.max(1, args.quantity || 1);

            // Find product by SKU
            const { data: product } = await supabase
              .from("products")
              .select("id, name_ar, sku, stock_quantity")
              .eq("sku", sku)
              .eq("is_active", true)
              .maybeSingle();

            if (!product) {
              const resp = await doFollowUp(tc, { success: false, error: `لم يتم العثور على منتج برقم القطعة "${sku}"` });
              if (resp) return resp;
              continue;
            }

            if (product.stock_quantity < qty) {
              const resp = await doFollowUp(tc, { success: false, error: `الكمية المطلوبة (${qty}) غير متوفرة حالياً للمنتج "${product.name_ar}"` });
              if (resp) return resp;
              continue;
            }

            // Check if already in cart
            const { data: existing } = await supabase
              .from("dealer_cart_items")
              .select("id, quantity")
              .eq("user_id", authenticatedUserId)
              .eq("product_id", product.id)
              .maybeSingle();

            if (existing) {
              await supabase
                .from("dealer_cart_items")
                .update({ quantity: existing.quantity + qty })
                .eq("id", existing.id);
            } else {
              await supabase
                .from("dealer_cart_items")
                .insert({ user_id: authenticatedUserId, product_id: product.id, quantity: qty });
            }

            const resp = await doFollowUp(tc, {
              success: true,
              message: `تم إضافة "${product.name_ar}" (${product.sku}) × ${qty} للسلة بنجاح`,
              product_name: product.name_ar,
              sku: product.sku,
              quantity: qty,
            });
            if (resp) return resp;
          }

          // ── view_cart ──
          if (tc.function.name === "view_cart" && authenticatedUserId) {
            const { data: cartItems } = await supabase
              .from("dealer_cart_items")
              .select("quantity, product_id, products(name_ar, sku)")
              .eq("user_id", authenticatedUserId);

            const items = (cartItems || []).map((ci: any) => ({
              name: ci.products?.name_ar || "—",
              sku: ci.products?.sku || "—",
              quantity: ci.quantity,
            }));

            const resp = await doFollowUp(tc, {
              success: true,
              items,
              total_items: items.length,
              message: items.length > 0
                ? `السلة فيها ${items.length} صنف. يمكنك إكمال الطلبية من تبويب "طلباتي" في لوحة التحكم.`
                : "السلة فاضية حالياً.",
              navigate_action: items.length > 0 ? "orders" : null,
            });
            if (resp) return resp;
          }

          // ── request_callback ──
          if (tc.function.name === "request_callback") {
            const phone = args.customer_phone || "";
            const name = args.customer_name || "عميل من الشات بوت";
            const notes = args.notes || "";

            const { data: adminRoles } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
            if (adminRoles && adminRoles.length > 0) {
              const notifications = adminRoles.map((admin: any) => ({
                user_id: admin.user_id,
                title: "📞 طلب تواصل عاجل من الشات بوت",
                message: `العميل "${name}" يطلب التواصل معه\n📱 الرقم: ${phone}\n📝 ${notes}`,
                type: "info",
              }));
              await supabase.from("notifications").insert(notifications);
            }

            try {
              const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
              const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
              const TWILIO_PHONE = Deno.env.get("TWILIO_PHONE_NUMBER");
              if (TWILIO_SID && TWILIO_TOKEN && TWILIO_PHONE) {
                const waMessage = `🚨 *طلب تواصل من الشات بوت*\n\n👤 ${name}\n📱 ${phone}\n📝 ${notes}\n⏰ ${new Date().toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })}`;
                await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
                  method: "POST",
                  headers: { "Content-Type": "application/x-www-form-urlencoded", Authorization: `Basic ${btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)}` },
                  body: new URLSearchParams({ From: `whatsapp:${TWILIO_PHONE}`, To: "whatsapp:+201153961008", Body: waMessage }).toString(),
                });
              }
            } catch (waErr) { console.error("WhatsApp error:", waErr); }

            const resp = await doFollowUp(tc, { success: true, message: `تم إرسال طلب التواصل. اسم: ${name}, رقم: ${phone}` });
            if (resp) return resp;
          }
        } catch (e) {
          console.error("Tool call error:", e);
        }
      }

      const fallbackContent = fullContent || "تم إرسال طلبك لفريق المبيعات وسيتواصلون معك في أقرب وقت! 📞";
      const fallbackSSE = `data: ${JSON.stringify({ choices: [{ delta: { content: fallbackContent }, finish_reason: "stop" }] })}\n\ndata: [DONE]\n\n`;
      return new Response(fallbackSSE, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const contentSSE = `data: ${JSON.stringify({ choices: [{ delta: { content: fullContent }, finish_reason: "stop" }] })}\n\ndata: [DONE]\n\n`;
    return new Response(contentSSE, {
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
