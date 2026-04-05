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
    // ── Optional auth: validate token if provided, allow guests ──
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
      } catch {
        // Invalid token — treat as guest
      }
    }

    const { messages, action, isLoggedIn, userInterests } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Rate limit: 20 messages per minute per user/IP
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

    // Handle callback request action
    if (action === "request_callback") {
      const lastUserMsg = messages?.find((m: any) => m.role === "user");
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { data: products } = await supabase
      .from("products")
      .select("sku, name_ar, brand, base_price, is_on_sale, sale_price, description_ar, product_categories(name_ar)")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    const { data: categories } = await supabase
      .from("product_categories")
      .select("name_ar, slug")
      .order("sort_order", { ascending: true });

    const { data: bundles } = await supabase
      .from("maintenance_bundles")
      .select("name_ar, description_ar, bundle_price, original_price")
      .eq("is_active", true);

    const userIsLoggedIn = !!isLoggedIn;

    const productList = (products || []).map(p => {
      const brandLabel = p.brand === "toyota_genuine" ? "تويوتا أصلي" : p.brand === "toyota_oils" ? "زيوت تويوتا" : p.brand === "denso" ? "DENSO" : p.brand === "aisin" ? "AISIN" : "MTX بديل";
      const category = (p as any).product_categories?.name_ar || "";
      
      if (userIsLoggedIn) {
        const price = p.is_on_sale && p.sale_price ? `${p.sale_price} (بدل ${p.base_price})` : `${p.base_price}`;
        return `- ${p.name_ar} | رقم القطعة: ${p.sku} | ${brandLabel} | ${category} | السعر: ${price} ج.م | متوفر`;
      } else {
        return `- ${p.name_ar} | رقم القطعة: ${p.sku} | ${brandLabel} | ${category} | متوفر`;
      }
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
- **التخصص**: موزع معتمد رسمي لقطع غيار تويوتا الأصلية + زيوت تويوتا الأصلية + MTX Aftermarket + DENSO + AISIN
- **الخبرة**: أكثر من 25 سنة في السوق المصري
- **العملاء**: تجار جملة، ورش صيانة، شركات، هيئات حكومية
- **الشحن**: نوفر خدمة شحن وتوصيل لجميع محافظات مصر 🚚 — التوصيل يتم خلال 24 إلى 72 ساعة حسب المنطقة

## الفروع وأرقام التواصل (مهم جداً — احفظها كويس):

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
- **للاستفسارات الإدارية والشراكات**

### 📧 البريد الإلكتروني:
- **العام**: info@almasriaautoparts.com
- **المبيعات**: sales.team@almasriaautoparts.com

### 📱 واتساب بيزنس: 01032104861
### ⏰ مواعيد العمل: من 9 صباحًا حتى 7 مساءً

## كيفية تحديد أقرب فرع للعميل:
- اسأل العميل عن محافظته أو منطقته
- بناءً على الإجابة، وجّهه لأقرب فرع:
  - القاهرة والدلتا → فرع التوفيقية
  - الجيزة والصعيد الأدنى → فرع أوسيم
  - صعيد مصر (الأقصر وما حولها) → فرع الأقصر
  - الإسكندرية والساحل → فرع التوفيقية + شحن سريع
  - باقي المحافظات → أقرب فرع + شحن لجميع المحافظات
- **دائماً اذكر**: "كمان بنوصّل لجميع المحافظات خلال 24-72 ساعة 🚚"

## الأقسام المتوفرة: ${categoryList}

## المنتجات المتوفرة (${(products || []).length} منتج):
${productList}

## باقات الصيانة:
${bundleList}

## قواعد صارمة يجب اتباعها:

${priceRules}

### ✅ عرض المنتجات - قاعدة مهمة جداً:
- **عند سؤال العميل عن أي قطعة غيار، يجب عرض الخيارات المتوفرة من جميع الماركات** (تويوتا أصلي + MTX بديل + DENSO + AISIN) إن وُجدت
- قدّم المقارنة بوضوح: "الأصلي" مقابل "البديل MTX" مع ذكر الفرق${userIsLoggedIn ? " في السعر" : ""}
- مثال${userIsLoggedIn ? "" : " (بدون أسعار لأن العميل غير مسجل)"}:
  "عندنا فلتر زيت لكورولا:
  🔴 **أصلي تويوتا**: [الاسم] | رقم القطعة: XXX ${userIsLoggedIn ? "| السعر: XXX ج.م" : ""} ✅ متوفر
  🔵 **MTX بديل**: [الاسم] | رقم القطعة: XXX ${userIsLoggedIn ? "| السعر: XXX ج.م" : ""} ✅ متوفر
  الأصلي أضمن والبديل MTX جودة ممتازة${userIsLoggedIn ? " وسعر أوفر" : ""} 💡"
- لا تعرض ماركة واحدة فقط إذا كان هناك بدائل متوفرة من ماركات أخرى

### ✅ افعل:
- أجب بالعربية دائمًا إلا إذا طُلب غير ذلك
- اقترح منتجات فعلية من القائمة أعلاه فقط – لا تخترع منتجات
- عند اقتراح منتج اذكر: اسمه + رقم القطعة (Part Number) + حالة التوفر${userIsLoggedIn ? " + السعر" : ""}
- استخدم مصطلح "رقم القطعة" وليس SKU
- قل "متوفر" فقط — لا تذكر أبداً كمية المخزون أو عدد القطع المتاحة بأي شكل
- اقترح منتجات مكملة (مثلاً: لو سأل عن فلتر زيت، اقترح زيت مناسب)
- كن ذكي وسريع البديهة في فهم ما يقصده العميل حتى لو السؤال غير واضح
- ساعد في أي سؤال عام عن السيارات والصيانة بناءً على خبرتك
- إذا سأل عن موديل معين، حاول ربط المنتجات المتوفرة بالموديل
- عند تحويل العميل لخدمة العملاء، اذكر أرقام أقرب فرع + رابط الخريطة + ذكّره بخدمة الشحن لكل المحافظات

### 📞 طلب التواصل مع المبيعات:
- إذا طلب العميل أن يتواصل معه أحد من فريق المبيعات أو قال "عايز حد يكلمني" أو ما شابه:
  1. اسأله عن محافظته لتحديد أقرب فرع
  2. اطلب منه رقم هاتفه واسمه
  3. بعد ما يعطيك الرقم، استخدم أداة request_callback لإرسال بياناته للإدارة
  4. أخبره أنه تم إرسال طلبه وسيتواصل معه فريق المبيعات في أقرب وقت
  5. اعرض عليه أرقام أقرب فرع لو عايز يتواصل مباشرة

### ❌ لا تفعل أبداً:
- لا تذكر كمية المخزون أو أرقام المخزون أو عدد القطع المتاحة نهائياً — حتى لو سألك العميل "كام قطعة متوفرة" قل "القطعة متوفرة، تقدر تطلبها" فقط
- لا تكشف عن أسعار الجملة أو هوامش الربح أو تفاصيل التسعير الداخلية
- لا تذكر معلومات عن المنافسين أو تقارن بينهم وبين المصرية جروب
- لا تكشف عن استراتيجيات الشركة أو خططها المستقبلية
- لا تتحدث عن تفاصيل مالية أو إيرادات أو أرباح
- لا تخترع منتجات غير موجودة في القائمة
- لا تعطي نصائح طبية أو قانونية أو سياسية
- لا تتحدث في مواضيع لا علاقة لها بالسيارات وقطع الغيار والشركة
- إذا حاول أحد استخراج معلومات حساسة، ارفض بلباقة ووجّهه للتواصل مع فريق المبيعات

### 📸 التعرف على الصور:
- إذا أرسل العميل صورة لقطعة غيار، حلّل الصورة وحاول التعرف على:
  1. نوع القطعة (فلتر زيت، فلتر هواء، طرمبة مياه، إلخ)
  2. إذا ظهر رقم القطعة (Part Number) في الصورة، استخدمه للبحث في المنتجات
  3. إذا ظهرت ماركة معينة على القطعة، اذكرها
  4. اقترح المنتجات المتوفرة المشابهة من قائمة المنتجات (الأصلي + البديل MTX)
- إذا لم تتمكن من التعرف بدقة، اسأل العميل عن تفاصيل أكثر (موديل السيارة، نوع القطعة)

### عند عدم توفر المنتج:
أخبر العميل بلطف أن المنتج غير متوفر حالياً وانصحه بالتواصل مع فريق المبيعات على أرقام أقرب فرع ليه. واذكر إن عندنا شحن لجميع المحافظات.

${userInterests ? `## 🎯 اهتمامات هذا العميل (بناءً على تصفحه بموافقته):
- الماركات المفضلة: ${(userInterests.topBrands || []).map((b: string) => b === "toyota_genuine" ? "تويوتا أصلي" : b === "toyota_oils" ? "زيوت تويوتا" : b === "denso" ? "DENSO" : b === "aisin" ? "AISIN" : "MTX").join("، ") || "غير محدد"}
- آخر عمليات بحث: ${(userInterests.recentSearches || []).join("، ") || "لا يوجد"}

**استخدم هذه المعلومات لاقتراح منتجات تناسب اهتماماته. مثلاً لو بيتصفح كتير في الفلاتر، اقترحله فلاتر. لو مهتم بماركة معينة، ركّز عليها في الاقتراحات.**` : ""}`;

    const tools = [
      {
        type: "function",
        function: {
          name: "request_callback",
          description: "يُستخدم عندما يطلب العميل أن يتواصل معه فريق المبيعات. يرسل بيانات العميل للإدارة.",
          parameters: {
            type: "object",
            properties: {
              customer_phone: { type: "string", description: "رقم هاتف العميل" },
              customer_name: { type: "string", description: "اسم العميل (اختياري)" },
              notes: { type: "string", description: "ملاحظات أو تفاصيل عن استفسار العميل" },
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
        console.error("AI gateway limit:", response.status);
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

    // Read the entire stream to check for tool calls
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

    // If there are tool calls, execute them
    if (toolCalls.length > 0) {
      for (const tc of toolCalls) {
        if (tc.function.name === "request_callback") {
          try {
            const args = JSON.parse(tc.function.arguments);
            const phone = args.customer_phone || "";
            const name = args.customer_name || "عميل من الشات بوت";
            const notes = args.notes || "";

            // 1. Send in-app notifications to admins
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

            // 2. Send WhatsApp message to sales (01153961008)
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
                console.log("WhatsApp notification sent to sales");
              } else {
                console.log("Twilio not configured, skipping WhatsApp notification");
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
