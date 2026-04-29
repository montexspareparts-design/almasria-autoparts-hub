// edge function: تولّد رسالة تحفيزية يومية لكل موظف (cache مرة واحدة في اليوم)
// hybrid: AI أولاً (Lovable AI / Gemini)، ولو فشل يستخدم قوالب جاهزة
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

const today = () => new Date().toISOString().slice(0, 10);
const yesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
};
const monthStart = () => {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().slice(0, 10);
};

function classifyTier(score: number): "excellent" | "good" | "average" | "low" | "new" {
  if (score >= 80) return "excellent";
  if (score >= 50) return "good";
  if (score >= 25) return "average";
  if (score > 0) return "low";
  return "new";
}

// قوالب fallback — متنوعة، تختلف حسب الأداء + اليوم + الاسم
const TEMPLATES: Record<string, string[]> = {
  excellent: [
    "{name} 🔥 امبارح كنت نار! {score} نقطة في يوم واحد. النهاردة محتاج تكسر الرقم ده 💪",
    "بطل يا {name} 🏆 أداء امبارح ({score} نقطة) كان فوق المتوقع. خليك على نفس الإيقاع.",
    "{name} ⭐ شغل امبارح علامة كاملة. الشهر ده انت في مقدمة الفريق ({month_score} نقطة) 🚀",
    "{name} 👑 لما الواحد بيشتغل بضمير زيك، النتائج بتتكلم. كمّل وفرحنا اليوم كمان!",
    "ولا أحلى يا {name}! ({score} امبارح) — العميل اللي هيكلمك النهاردة محظوظ 🎯",
  ],
  good: [
    "{name} 👏 امبارح كان كويس ({score} نقطة). النهاردة فرصة تطلع الأحسن بقا.",
    "تمام يا {name}! ({score} امبارح) — لو ضفت مكالمة أو اتنين النهاردة هتوصل للممتاز 💪",
    "{name} ✨ شغل امبارح محترم. خلي بالك من الـ Follow-ups، فيهم فلوس ضايعة.",
    "نص الطريق خلصته يا {name}! ({month_score} نقطة الشهر ده) — الأسبوع الجاي تكون في القمة 🎯",
    "{name} كمّل كده 🚀 — ركّز النهاردة على تحويل عرض لطلب فعلي.",
  ],
  average: [
    "{name} 💡 امبارح كان متوسط. النهاردة جرّب تبدأ بالمكالمات اللي مهمة بدري.",
    "صباح الفل يا {name} ☕ — في فريقك ناس بتشتغل أكتر. عاوزك تسبقهم النهاردة!",
    "{name} 🎯 أداء امبارح يحتاج push. ابدأ بـ 5 مكالمات قبل الساعة 11 — هيغير اليوم كله.",
    "{name} تذكّر: كل عرض سعر = فرصة. النهاردة طلّع 3 على الأقل وحوّل واحد.",
    "خليها تحدي يا {name} 💪 — خلي تقرير النهاردة أحسن من تقرير امبارح.",
  ],
  low: [
    "{name} 🌅 يوم جديد، فرصة جديدة. سيب امبارح ورا وابدأ بمكالمة واحدة دلوقتي.",
    "{name} ❤️ الكل بيعدي بأيام صعبة. المهم مش تقع، المهم تقوم. النهاردة بداية جديدة.",
    "صباح الخير يا {name} ☀️ — لو محتاج مساعدة قول للمدير. إحنا فريق واحد.",
    "{name} 💪 ركّز النهاردة على Follow-up العملاء القدام. دول أقرب واحد للبيع.",
    "{name} 🎯 خطة بسيطة للنهاردة: 10 مكالمات + 3 عروض. يلا!",
  ],
  new: [
    "أهلاً يا {name} 👋 — أول يوم في التقرير! املأ كل الأرقام بدقة وأرسل قبل المغرب.",
    "{name} 🌟 يوم جديد، ابدأ بقوة! لو محتاج أي مساعدة في النظام كلّم الإدارة.",
    "صباح الخير يا {name} ☕ — دلوقتي نبدأ نسجّل شغلك. كل رقم مهم!",
    "{name} 🚀 خلي يومك إنتاج. كل تقرير بتمليه بيخليك أحسن.",
  ],
};

function pickTemplate(tier: string, name: string, score: number, monthScore: number): string {
  const list = TEMPLATES[tier] || TEMPLATES.new;
  // اختيار حتمي حسب اليوم + الـ user عشان كل موظف ياخد رسالة مختلفة عن التاني
  const seed = Math.abs(hash(name + today())) % list.length;
  return list[seed]
    .replaceAll("{name}", name.split(" ")[0] || name)
    .replaceAll("{score}", String(score))
    .replaceAll("{month_score}", String(monthScore));
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h << 5) - h + s.charCodeAt(i);
  return h;
}

// score: محولة×3 + عملاء جدد×2 + مكالمات + متابعات − طلبات غير مكتملة
function performanceScore(r: any): number {
  if (!r) return 0;
  return Math.max(
    0,
    Number(r.offers_converted_count || 0) * 3 +
      Number(r.new_customers_count || 0) * 2 +
      Number(r.calls_count || 0) +
      Number(r.followups_count || 0) -
      Number(r.incomplete_orders_count || 0),
  );
}

async function generateAI(name: string, yScore: number, mScore: number, mReports: number, tier: string): Promise<string | null> {
  if (!LOVABLE_API_KEY) return null;
  try {
    const prompt = `اكتب رسالة تحفيزية قصيرة (سطرين كحد أقصى) باللهجة المصرية لموظف مبيعات اسمه "${name}".
البيانات:
- تقرير امبارح: ${yScore} نقطة أداء
- إجمالي الشهر: ${mScore} نقطة في ${mReports} تقرير
- التصنيف: ${tier === "excellent" ? "ممتاز" : tier === "good" ? "كويس" : tier === "average" ? "متوسط" : tier === "low" ? "ضعيف" : "بدون بيانات سابقة"}

شروط الرسالة:
- مختصرة (سطر أو سطرين فقط)
- لهجة مصرية ودودة بدون تكلّف
- تذكر اسمه الأول
- تحفيزية مش هجومية لو الأداء ضعيف
- ممكن تستخدم emoji واحد أو اتنين كحد أقصى
- لا تستخدم علامات اقتباس
- ابدأ مباشرة بالرسالة بدون مقدمات

اكتب الرسالة فقط:`;

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "أنت مدرب مبيعات مصري بتكتب رسائل قصيرة وملهمة." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!resp.ok) {
      console.warn("AI gateway returned", resp.status);
      return null;
    }
    const json = await resp.json();
    const text = json?.choices?.[0]?.message?.content?.trim();
    if (!text || text.length < 5 || text.length > 400) return null;
    return text.replace(/^["']|["']$/g, "");
  } catch (e) {
    console.error("AI error:", e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const auth = req.headers.get("Authorization");
    if (!auth) return new Response(JSON.stringify({ error: "no auth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // identify the calling user
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: userResp } = await userClient.auth.getUser();
    const user = userResp?.user;
    if (!user) return new Response(JSON.stringify({ error: "unauth" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });

    // Use service role for DB writes/reads bypassing RLS where needed
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // 1) Check cache for today
    const { data: cached } = await admin
      .from("reporter_motivational_messages")
      .select("message, source, performance_tier")
      .eq("user_id", user.id)
      .eq("message_date", today())
      .maybeSingle();
    if (cached) {
      return new Response(JSON.stringify({ message: cached.message, source: cached.source, tier: cached.performance_tier, cached: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2) Gather performance data
    const { data: prof } = await admin.from("profiles").select("full_name, email").eq("user_id", user.id).maybeSingle();
    const name = prof?.full_name || prof?.email?.split("@")[0] || "زميلنا";

    const { data: yRow } = await admin
      .from("reporter_daily_reports")
      .select("*")
      .eq("user_id", user.id)
      .eq("report_date", yesterday())
      .maybeSingle();

    const { data: monthRows } = await admin
      .from("reporter_daily_reports")
      .select("*")
      .eq("user_id", user.id)
      .gte("report_date", monthStart())
      .lte("report_date", today());

    const yScore = performanceScore(yRow);
    const mScore = (monthRows || []).reduce((a: number, r: any) => a + performanceScore(r), 0);
    const mReports = (monthRows || []).length;
    const tier = yRow ? classifyTier(yScore) : mReports > 0 ? classifyTier(mScore / Math.max(1, mReports)) : "new";

    // 3) Try AI, then fallback to template
    let message = await generateAI(name, yScore, mScore, mReports, tier);
    let source = "ai";
    if (!message) {
      message = pickTemplate(tier, name, yScore, mScore);
      source = "template";
    }

    // 4) Cache it
    await admin.from("reporter_motivational_messages").insert({
      user_id: user.id,
      message_date: today(),
      message,
      source,
      performance_tier: tier,
    });

    return new Response(JSON.stringify({ message, source, tier, cached: false }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("motivational error:", e);
    return new Response(JSON.stringify({ error: e?.message || "unknown" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
