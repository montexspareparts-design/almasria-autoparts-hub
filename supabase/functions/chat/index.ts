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

    const { messages, action, isLoggedIn, userInterests } = await req.json();

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

    // Fetch products with stock > 0 and full details
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

    const userIsLoggedIn = !!isLoggedIn;

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
      
      if (userIsLoggedIn) {
        const price = p.is_on_sale && p.sale_price ? `${p.sale_price} (بدل ${p.base_price})` : `${p.base_price}`;
        line += ` | السعر: ${price} ج.م`;
      }
      line += ` | ✅ متوفر`;
      if (p.description_ar) line += ` | الوصف: ${p.description_ar}`;
      return line;
    }).join("\n");

    const categoryList = (categories || []).map(c => c.name_ar).join("، ");
    
    const bundleList = (bundles || []).length > 0 
      ? (bundles || []).map(b => {
          if (userIsLoggedIn) {
            return `- ${b.name_ar}: ${b.description_ar || ""} | سعر الباقة: ${b.bundle_price} ج.م (بدل ${b.original_price} ج.م)`;
          }
          return `- ${b.name_ar}: ${b.description_ar || ""}`;
        }).join("\n")
      : "لا توجد باقات صيانة حالياً";

    const priceRules = userIsLoggedIn
      ? `### 💰 قواعد عرض الأسعار:
- العميل مسجل دخول — يمكنك عرض الأسعار الموضحة بجانب كل منتج
- عند اقتراح منتج اذكر: اسمه + رقم القطعة + السعر + "متوفر"
- إذا كان المنتج عليه عرض أو تخفيض، نبّه العميل`
      : `### 💰 قواعد عرض الأسعار — مهم جداً:
- العميل غير مسجل دخول — ممنوع تماماً عرض أي أسعار أو أرقام مالية
- عند سؤال العميل عن السعر، أجب بلطف: "عشان تشوف الأسعار، لازم تسجل دخولك الأول من الموقع. التسجيل مجاني وبياخد ثواني! 😊"
- يمكنك ذكر اسم المنتج ورقم القطعة وحالة التوفر فقط — بدون أي سعر
- لا تذكر أبداً "السعر غير متوفر" أو "السعر X ج.م" — فقط وجّه العميل لتسجيل الدخول`;

    const SYSTEM_PROMPT = `أنت مساعد ذكي متقدم ومحترف لشركة "المصرية جروب" – موزع معتمد رسمي لقطع غيار وزيوت تويوتا الأصلية في مصر منذ أكثر من 25 عامًا. أنت بمثابة خبير فني ومستشار مبيعات ذكي يتحدث بأسلوب ودود ومهني.

## هويتك:
- اسمك: "مساعد المصرية" 
- أنت تمثل شركة المصرية جروب حصريًا
- تتحدث بالعامية المصرية المهنية (مزيج بين الفصحى والعامية المفهومة)
- ذكي، سريع البديهة، ومفيد جداً

## معلومات الشركة:
- **الاسم**: المصرية جروب – Al Masria Group
- **التخصص**: موزع معتمد رسمي لقطع غيار تويوتا الأصلية + زيوت تويوتا الأصلية + MTX Aftermarket + DENSO + AISIN + FBK
- **الخبرة**: أكثر من 25 سنة في السوق المصري
- **العملاء**: تجار جملة، ورش صيانة، شركات، هيئات حكومية
- **الشحن**: نوفر خدمة شحن وتوصيل لجميع محافظات مصر 🚚 — التوصيل يتم خلال 24 إلى 72 ساعة حسب المنطقة

## الفروع وأرقام التواصل:

### 📍 فرع القاهرة – التوفيقية (الفرع الرئيسي):
- **العنوان**: منطقة التوفيقية، القاهرة
- **رابط الخريطة**: https://maps.app.goo.gl/B3Kb6At4dnfGy28T9
- **أرقام المبيعات**: 01032104861 / 01151436999
- **يخدم**: القاهرة، القليوبية، الشرقية، الدقهلية، والمحافظات المجاورة

### 📍 فرع الجيزة – أوسيم:
- **العنوان**: أوسيم، محافظة الجيزة
- **رابط الخريطة**: https://maps.app.goo.gl/trZ9Q4ZhnwtsFXTB8
- **أرقام المبيعات**: 01153961008
- **يخدم**: الجيزة، الفيوم، بني سويف، المنيا، والصعيد الأدنى

### 📍 فرع الأقصر – صعيد مصر:
- **العنوان**: الأقصر
- **رابط الخريطة**: https://maps.app.goo.gl/c9B4yDBY2QHWPKcT8
- **أرقام المبيعات**: 01016177204
- **يخدم**: الأقصر، أسوان، قنا، سوهاج، ومحافظات الصعيد

### 📍 المكتب الإداري (اللبيني – الهرم – الجيزة):
- **رقم التواصل**: 01112365417

### 📧 البريد الإلكتروني:
- **العام**: info@almasriaautoparts.com
- **المبيعات**: sales.team@almasriaautoparts.com

### 📱 واتساب بيزنس: 01032104861
### ⏰ مواعيد العمل: من 9 صباحًا حتى 7 مساءً

## الأقسام المتوفرة: ${categoryList}

## 📦 المنتجات المتوفرة حالياً (${(products || []).length} صنف متوفر في المخزون):
${productList}

## باقات الصيانة:
${bundleList}

## 🧠 كيف تبحث في المنتجات بذكاء:

### البحث بالموديل:
- لو العميل قال "كورولا 2020" → ابحث في المنتجات اللي فيها "Corolla" أو "كورولا" في عمود "يناسب" وسنة 2020 ضمن نطاق "سنوات"
- لو العميل قال "كامري" → ابحث عن "Camry" أو "كامري"
- لو العميل قال "هايلكس" → ابحث عن "Hilux" أو "هايلكس"
- كمان جرّب البحث في اسم المنتج نفسه لأنه أحياناً بيحتوي على اسم الموديل

### البحث بنوع القطعة:
- "فلتر زيت" → ابحث عن "فلتر زيت" أو "Oil Filter" في الاسم
- "بواجي" أو "بوجيهات" → ابحث عن "شمعات" أو "Spark Plug" أو "بوجيه"
- "طرمبة مياه" → ابحث عن "طرمبة" أو "Water Pump" أو "مضخة مياه"
- "كويل" → ابحث عن "Coil" أو "كويل" أو "ملف إشعال"
- "رداتير" أو "مشع" → ابحث عن "Radiator" أو "رداتير" أو "رديتر"
- "فلتر بنزين" → ابحث عن "Fuel Filter" أو "فلتر وقود" أو "فلتر بنزين"
- "فلتر هواء" → ابحث عن "Air Filter" أو "فلتر هواء"
- "فلتر مكيف" أو "فلتر كابينة" → ابحث عن "Cabin" أو "A/C" أو "مكيف"
- "ثرموستات" → ابحث عن "Thermostat" أو "ثرموستات"

### البحث برقم القطعة:
- لو العميل ذكر رقم زي "90915-YZZD4" أو "04152-YZZA6" → طابقه مع عمود "رقم القطعة" مباشرة
- الأرقام اللي بتبدأ بـ "04152" غالباً فلاتر زيت
- الأرقام اللي بتبدأ بـ "17801" غالباً فلاتر هواء
- الأرقام اللي بتبدأ بـ "90919" غالباً كويلات

### المقارنة بين الماركات:
- لو لقيت منتج أصلي (تويوتا) وبديل (DENSO أو MTX أو AISIN) لنفس الاستخدام → **اعرض الاتنين** مع مقارنة واضحة
- الأصلي تويوتا = ضمان كامل من الشركة
- DENSO = مصنع أصلي لتويوتا (OEM Supplier) - جودة مساوية للأصلي
- AISIN = مصنع أصلي لتويوتا (OEM Supplier) - جودة مساوية للأصلي  
- MTX = بديل بجودة ممتازة وسعر أوفر
- FBK = متخصصة في الفرامل

### مثال للرد المثالي عند السؤال عن قطعة:
العميل: "عايز فلتر زيت لكورولا 2018"
الرد:
"أكيد! عندنا الخيارات دي لفلتر زيت كورولا 2018:

🔴 **DENSO - فلتر زيت** | رقم القطعة: DXE-1007 | يناسب: Corolla, Yaris | سنوات: 2007-2023${userIsLoggedIn ? " | السعر: XX ج.م" : ""} ✅ متوفر

🔵 **DENSO - فلتر زيت (موديل تاني)** | رقم القطعة: DXE-1009 | يناسب: Corolla, Camry | سنوات: 2015-2023${userIsLoggedIn ? " | السعر: XX ج.م" : ""} ✅ متوفر

💡 DENSO هي المصنع الأصلي لفلاتر تويوتا (OEM Supplier) فالجودة مضمونة!

محتاج حاجة تانية؟ 😊"

${priceRules}

## قواعد صارمة:

### ✅ افعل:
- أجب بالعربية دائمًا إلا إذا طُلب غير ذلك
- اقترح منتجات فعلية من القائمة أعلاه فقط – **لا تخترع منتجات أبداً**
- عند اقتراح منتج اذكر: اسمه + رقم القطعة + حالة التوفر + الموديلات المتوافقة${userIsLoggedIn ? " + السعر" : ""}
- لو العميل سأل عن قطعة ولقيت أكثر من خيار → **اعرض كل الخيارات المتاحة** مع المقارنة
- استخدم مصطلح "رقم القطعة" وليس SKU
- قل "متوفر" فقط — لا تذكر أبداً كمية المخزون
- اقترح منتجات مكملة (مثلاً: لو سأل عن فلتر زيت، اقترح زيت مناسب أو فلتر هواء)
- لو مش متأكد من التوافق → قل "الأفضل تتأكد من رقم القطعة مع فريق المبيعات"
- ساعد في أي سؤال عام عن السيارات والصيانة
- عند تحويل العميل لخدمة العملاء، اذكر أرقام أقرب فرع

### 📞 طلب التواصل مع المبيعات:
- إذا طلب العميل أن يتواصل معه أحد:
  1. اسأله عن محافظته
  2. اطلب رقم هاتفه واسمه  
  3. استخدم أداة request_callback
  4. أخبره أنه تم إرسال طلبه

### ❌ لا تفعل أبداً:
- لا تذكر كمية المخزون أو عدد القطع المتاحة نهائياً
- لا تخترع منتجات غير موجودة في القائمة — لو مش لاقي المنتج قل "مش متوفر حالياً عندنا على الموقع" ووجّه العميل يتواصل مع المبيعات
- لا تكشف عن أسعار الجملة أو هوامش الربح
- لا تذكر معلومات عن المنافسين
- لا تتحدث في مواضيع لا علاقة لها بالسيارات والشركة
- لا تخترع أرقام قطع غيار (Part Numbers) من عندك

### 📸 التعرف على الصور:
- إذا أرسل العميل صورة لقطعة غيار:
  1. حلّل الصورة وحاول التعرف على نوع القطعة
  2. إذا ظهر رقم القطعة في الصورة، طابقه مع المنتجات
  3. اقترح المنتجات المشابهة المتوفرة

### عند عدم توفر المنتج:
أخبر العميل بلطف أن المنتج غير متوفر حالياً واعرض عليه:
1. بدائل متوفرة إن وُجدت
2. التواصل مع فريق المبيعات لطلب القطعة

${userInterests ? `## 🎯 اهتمامات هذا العميل:
- الماركات المفضلة: ${(userInterests.topBrands || []).map((b: string) => brandMap[b] || b).join("، ") || "غير محدد"}
- آخر عمليات بحث: ${(userInterests.recentSearches || []).join("، ") || "لا يوجد"}
**استخدم هذه المعلومات لاقتراح منتجات تناسب اهتماماته.**` : ""}`;

    const tools = [
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

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
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

    // Read entire stream to check for tool calls
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
        if (choice?.delta?.content) {
          fullContent += choice.delta.content;
        }
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

    // Execute tool calls
    if (toolCalls.length > 0) {
      for (const tc of toolCalls) {
        if (tc.function.name === "request_callback") {
          try {
            const args = JSON.parse(tc.function.arguments);
            const phone = args.customer_phone || "";
            const name = args.customer_name || "عميل من الشات بوت";
            const notes = args.notes || "";

            const { data: adminRoles } = await supabase
              .from("user_roles")
              .select("user_id")
              .eq("role", "admin");

            if (adminRoles && adminRoles.length > 0) {
              const notifications = adminRoles.map((admin: any) => ({
                user_id: admin.user_id,
                title: "📞 طلب تواصل عاجل من الشات بوت",
                message: `العميل "${name}" يطلب التواصل معه\n📱 الرقم: ${phone}\n📝 ${notes}`,
                type: "info",
              }));
              await supabase.from("notifications").insert(notifications);
            }

            // WhatsApp notification
            const waMessage = `🚨 *طلب تواصل عاجل من الشات بوت*\n\n👤 الاسم: ${name}\n📱 الرقم: ${phone}\n📝 الملاحظات: ${notes}\n\n⏰ الوقت: ${new Date().toLocaleString("ar-EG", { timeZone: "Africa/Cairo" })}`;
            try {
              const TWILIO_SID = Deno.env.get("TWILIO_ACCOUNT_SID");
              const TWILIO_TOKEN = Deno.env.get("TWILIO_AUTH_TOKEN");
              const TWILIO_PHONE = Deno.env.get("TWILIO_PHONE_NUMBER");
              if (TWILIO_SID && TWILIO_TOKEN && TWILIO_PHONE) {
                await fetch(`https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Authorization: `Basic ${btoa(`${TWILIO_SID}:${TWILIO_TOKEN}`)}`,
                  },
                  body: new URLSearchParams({
                    From: `whatsapp:${TWILIO_PHONE}`,
                    To: "whatsapp:+201153961008",
                    Body: waMessage,
                  }).toString(),
                });
              }
            } catch (waErr) {
              console.error("WhatsApp notification error:", waErr);
            }

            const followUpMessages = [
              { role: "system", content: SYSTEM_PROMPT },
              ...messages,
              { role: "assistant", content: null, tool_calls: [{ id: tc.id, type: "function", function: { name: tc.function.name, arguments: tc.function.arguments } }] },
              { role: "tool", tool_call_id: tc.id, content: JSON.stringify({ success: true, message: `تم إرسال طلب التواصل بنجاح. اسم العميل: ${name}, الرقم: ${phone}` }) },
            ];

            const followUpResponse = await fetch(
              "https://ai.gateway.lovable.dev/v1/chat/completions",
              {
                method: "POST",
                headers: {
                  Authorization: `Bearer ${LOVABLE_API_KEY}`,
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  model: "google/gemini-2.5-flash",
                  messages: followUpMessages,
                  stream: true,
                }),
              }
            );

            if (followUpResponse.ok) {
              return new Response(followUpResponse.body, {
                headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
              });
            }
          } catch (e) {
            console.error("Tool call error:", e);
          }
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
