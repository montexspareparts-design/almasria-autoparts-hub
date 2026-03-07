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
    const { messages, action } = await req.json();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Handle callback request action from frontend
    if (action === "request_callback") {
      const { customerPhone, customerName, notes } = await req.json().catch(() => ({}));
      // Already parsed above, get from the original body
      const body = JSON.parse(await req.text().catch(() => "{}"));
      // Re-parse since we already consumed the body
    }

    // If this is a callback request (separate endpoint-like action)
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

### ✅ عرض المنتجات - قاعدة مهمة جداً:
- **عند سؤال العميل عن أي قطعة غيار، يجب عرض الخيارات المتوفرة من جميع الماركات** (تويوتا أصلي + MTX بديل + DENSO + AISIN) إن وُجدت
- قدّم المقارنة بوضوح: "الأصلي" مقابل "البديل MTX" مع ذكر الفرق في السعر
- مثال: "عندنا فلتر زيت لكورولا:
  🔴 **أصلي تويوتا**: [الاسم] | رقم القطعة: XXX | السعر: XXX ج.م ✅ متوفر
  🔵 **MTX بديل**: [الاسم] | رقم القطعة: XXX | السعر: XXX ج.م ✅ متوفر
  الأصلي أضمن والبديل MTX جودة ممتازة وسعر أوفر 💡"
- لا تعرض ماركة واحدة فقط إذا كان هناك بدائل متوفرة من ماركات أخرى

### ✅ افعل:
- أجب بالعربية دائمًا إلا إذا طُلب غير ذلك
- اقترح منتجات فعلية من القائمة أعلاه فقط – لا تخترع منتجات
- عند اقتراح منتج اذكر: اسمه + رقم القطعة (Part Number) + السعر + حالة التوفر
- استخدم مصطلح "رقم القطعة" وليس SKU
- قل "متوفر" أو "غير متوفر" فقط – لا تذكر أبداً كمية المخزون أو عدد القطع المتاحة
- اقترح منتجات مكملة (مثلاً: لو سأل عن فلتر زيت، اقترح زيت مناسب)
- إذا كان المنتج عليه عرض، نبّه العميل
- كن ذكي وسريع البديهة في فهم ما يقصده العميل حتى لو السؤال غير واضح
- ساعد في أي سؤال عام عن السيارات والصيانة بناءً على خبرتك
- إذا سأل عن موديل معين، حاول ربط المنتجات المتوفرة بالموديل

### 📞 طلب التواصل مع المبيعات:
- إذا طلب العميل أن يتواصل معه أحد من فريق المبيعات أو قال "عايز حد يكلمني" أو ما شابه:
  1. اطلب منه رقم هاتفه واسمه
  2. بعد ما يعطيك الرقم، استخدم أداة request_callback لإرسال بياناته للإدارة
  3. أخبره أنه تم إرسال طلبه وسيتواصل معه فريق المبيعات في أقرب وقت

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

### 📸 التعرف على الصور:
- إذا أرسل العميل صورة لقطعة غيار، حلّل الصورة وحاول التعرف على:
  1. نوع القطعة (فلتر زيت، فلتر هواء، طرمبة مياه، إلخ)
  2. إذا ظهر رقم القطعة (Part Number) في الصورة، استخدمه للبحث في المنتجات
  3. إذا ظهرت ماركة معينة على القطعة، اذكرها
  4. اقترح المنتجات المتوفرة المشابهة من قائمة المنتجات (الأصلي + البديل MTX)
- مثال: "من الصورة دي، القطعة دي فلتر زيت لتويوتا كورولا. عندنا البدائل دي:
  🔴 **أصلي تويوتا**: ... 
  🔵 **MTX بديل**: ..."
- إذا لم تتمكن من التعرف بدقة، اسأل العميل عن تفاصيل أكثر (موديل السيارة، نوع القطعة)

### عند عدم توفر المنتج:
أخبر العميل بلطف أن المنتج غير متوفر حالياً وانصحه بالتواصل مع فريق المبيعات على الأرقام المذكورة أعلاه للاستفسار عن موعد التوفر.`;

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

    // We need to intercept the stream to handle tool calls
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let fullContent = "";
    let toolCalls: any[] = [];
    let currentToolCall: any = null;

    // Read the entire stream to check for tool calls
    let rawBuffer = "";
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      rawBuffer += decoder.decode(value, { stream: true });
    }

    // Parse SSE events
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

            // Find admin users
            const { data: adminRoles } = await supabase
              .from("user_roles")
              .select("user_id")
              .eq("role", "admin");

            if (adminRoles && adminRoles.length > 0) {
              const notifications = adminRoles.map((admin: any) => ({
                user_id: admin.user_id,
                title: "📞 طلب تواصل من الشات بوت",
                message: `العميل "${name}" يطلب التواصل معه\n📱 الرقم: ${phone}\n📝 ${notes}`,
                type: "info",
              }));
              await supabase.from("notifications").insert(notifications);
            }

            // Now make a second AI call to generate the response to user
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
                  model: "google/gemini-3-flash-preview",
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

      // Fallback if tool call processing failed
      const fallbackContent = fullContent || "تم إرسال طلبك لفريق المبيعات وسيتواصلون معك في أقرب وقت! 📞";
      const fallbackSSE = `data: ${JSON.stringify({ choices: [{ delta: { content: fallbackContent }, finish_reason: "stop" }] })}\n\ndata: [DONE]\n\n`;
      return new Response(fallbackSSE, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // No tool calls - return the content as SSE stream
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
