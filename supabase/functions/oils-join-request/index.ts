import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const CLIENT_TYPES = ["wholesale", "company", "workshop", "distributor"];

/**
 * طلب انضمام تاجر زيوت — عام (بدون تسجيل دخول مسبق).
 * ينشئ حساب المستخدم ثم يسجل طلب الانضمام في dealer_applications بحالة pending.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const b = await req.json().catch(() => null);
    if (!b) return json({ error: "بيانات غير صالحة" }, 400);

    const str = (v: unknown, max = 200) => (typeof v === "string" ? v.trim().slice(0, max) : "");
    const email = str(b.email, 160).toLowerCase();
    const password = typeof b.password === "string" ? b.password : "";
    const phone = str(b.phone, 20).replace(/\D/g, "");
    const business_name = str(b.business_name, 120);
    const legal_name = str(b.legal_name, 120) || business_name;
    const governorate = str(b.governorate, 60);
    const detailed_address = str(b.detailed_address, 300);
    const client_type = CLIENT_TYPES.includes(b.client_type) ? b.client_type : "workshop";
    const avg_monthly_purchase = str(b.avg_monthly_purchase, 60) || null;
    const years_in_business = Number.isFinite(Number(b.years_in_business))
      ? Math.max(0, Math.min(99, Math.trunc(Number(b.years_in_business))))
      : 0;
    const commercial_register_no = str(b.commercial_register_no, 60);
    const tax_card_no = str(b.tax_card_no, 60);

    const errors: Record<string, string> = {};
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.email = "بريد إلكتروني غير صحيح";
    if (password.length < 8) errors.password = "كلمة المرور 8 أحرف على الأقل";
    if (!/^01[0-9]{9}$/.test(phone)) errors.phone = "رقم موبايل مصري غير صحيح";
    if (business_name.length < 2) errors.business_name = "اسم النشاط مطلوب";
    if (!governorate) errors.governorate = "المحافظة مطلوبة";
    if (detailed_address.length < 5) errors.detailed_address = "العنوان التفصيلي مطلوب";
    if (b.agreed_terms !== true) errors.agreed_terms = "الموافقة على الشروط مطلوبة";
    if (Object.keys(errors).length) return json({ error: "بيانات ناقصة", fields: errors }, 400);

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // منع التكرار قبل إنشاء أي حساب
    const { data: dup } = await admin
      .from("dealer_applications")
      .select("id, status")
      .or(`email.eq.${email},phone.eq.${phone}`)
      .maybeSingle();
    if (dup) {
      return json(
        { error: "عندك طلب انضمام مسجّل بالفعل بنفس البريد أو رقم الموبايل — تواصل معنا للمتابعة." },
        409,
      );
    }

    // إنشاء حساب المستخدم (أو استخدام الحساب الموجود)
    let userId: string | null = null;
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: business_name, phone, source: "oils_app" },
    });

    if (createErr) {
      const msg = String(createErr.message || "").toLowerCase();
      if (msg.includes("already")) {
        return json(
          { error: "البريد ده مسجّل عندنا بالفعل — سجّل دخولك من شاشة الدخول." },
          409,
        );
      }
      console.error("createUser failed:", createErr.message);
      return json({ error: "تعذّر إنشاء الحساب، حاول تاني." }, 500);
    }
    userId = created.user?.id ?? null;
    if (!userId) return json({ error: "تعذّر إنشاء الحساب، حاول تاني." }, 500);

    const { error: insErr } = await admin.from("dealer_applications").insert({
      user_id: userId,
      business_name,
      legal_name,
      commercial_register_no: commercial_register_no || "غير متوفر",
      tax_card_no: tax_card_no || "غير متوفر",
      phone,
      email,
      governorate,
      detailed_address,
      client_type,
      years_in_business,
      avg_monthly_purchase,
      agreed_pricing_policy: true,
      agreed_market_protection: true,
      agreed_return_policy: true,
      agreed_terms: true,
      status: "pending",
    });

    if (insErr) {
      console.error("insert application failed:", insErr.message);
      await admin.auth.admin.deleteUser(userId).catch(() => {});
      return json({ error: "تعذّر تسجيل الطلب، حاول تاني." }, 500);
    }

    return json({ success: true });
  } catch (e) {
    console.error("oils-join-request error:", e);
    return json({ error: "خطأ غير متوقع" }, 500);
  }
});
