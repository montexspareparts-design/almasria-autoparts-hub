import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Check, Loader2, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/lib/haptics";
import logoAsset from "@/assets/almasria-oils-logo.jpg.asset.json";

/**
 * طلب انضمام تاجر زيوت — صفحة مستقلة تمامًا داخل تطبيق الزيوت.
 * لا تخرج المستخدم للموقع، وتسجّل الطلب عبر edge function عامة.
 */

const CLIENT_TYPES = [
  { key: "workshop", label: "مركز تغيير زيوت" },
  { key: "wholesale", label: "تاجر جملة" },
  { key: "distributor", label: "موزّع" },
  { key: "company", label: "شركة / أسطول" },
] as const;

const GOVERNORATES = [
  "القاهرة", "الجيزة", "القليوبية", "الإسكندرية", "الشرقية", "الدقهلية", "المنوفية",
  "الغربية", "البحيرة", "كفر الشيخ", "دمياط", "بورسعيد", "الإسماعيلية", "السويس",
  "الفيوم", "بني سويف", "المنيا", "أسيوط", "سوهاج", "قنا", "الأقصر", "أسوان",
  "البحر الأحمر", "مطروح", "شمال سيناء", "جنوب سيناء", "الوادي الجديد",
];

const VOLUMES = ["أقل من 20 ألف", "20 – 50 ألف", "50 – 150 ألف", "أكثر من 150 ألف"];

const OilsJoin = () => {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [form, setForm] = useState({
    business_name: "",
    client_type: "workshop" as (typeof CLIENT_TYPES)[number]["key"],
    governorate: "",
    detailed_address: "",
    years_in_business: "",
    avg_monthly_purchase: "",
    commercial_register_no: "",
    tax_card_no: "",
    phone: "",
    email: "",
    password: "",
    agreed_terms: false,
  });

  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const stepValid =
    step === 0
      ? form.business_name.trim().length >= 2 && !!form.governorate && form.detailed_address.trim().length >= 5
      : form.email.trim().length > 4 &&
        form.password.length >= 8 &&
        /^01[0-9]{9}$/.test(form.phone.replace(/\D/g, "")) &&
        form.agreed_terms;

  const submit = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnErr } = await supabase.functions.invoke("oils-join-request", {
        body: { ...form, phone: form.phone.replace(/\D/g, "") },
      });
      const payload = (data ?? {}) as { success?: boolean; error?: string };
      if (fnErr || !payload.success) {
        setError(payload.error || "تعذّر إرسال الطلب، حاول تاني أو كلّمنا على 01034806288");
        return;
      }
      void haptic("medium");
      setDone(true);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <main className="oils-join" dir="rtl">
        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} className="oils-join-card oils-join-success">
          <div className="oils-join-tick"><Check /></div>
          <h2>وصلنا طلبك</h2>
          <p>
            فريق الجملة هيراجع بياناتك ويتواصل معاك خلال 48 ساعة.
            بعد الاعتماد تقدر تدخل بنفس البريد وكلمة المرور وتشوف أسعار الجملة مباشرة.
          </p>
          <button type="button" className="oils-btn-primary mt-4" onClick={() => navigate("/oils", { replace: true })}>
            رجوع لشاشة الدخول
          </button>
        </motion.div>
      </main>
    );
  }

  return (
    <main className="oils-join" dir="rtl">
      <div className="oils-join-top">
        <button type="button" className="oils-join-back" aria-label="رجوع" onClick={() => (step === 0 ? navigate("/oils") : setStep(0))}>
          <ArrowRight />
        </button>
        <img src={logoAsset.url} alt="المصرية لزيوت تويوتا" className="w-10 h-10 rounded-xl object-contain bg-white" />
      </div>

      <section className="oils-join-hero">
        <span>ALMASRIA WHOLESALE</span>
        <h1>انضم لشبكة تجار<br />زيوت المصرية</h1>
        <p>أسعار جملة مخصصة لنشاطك، مخزون لحظي من الفيصل، وطلب أسرع من التطبيق.</p>
      </section>

      <div className="oils-join-steps">
        <i className="is-on" />
        <i className={step === 1 ? "is-on" : ""} />
      </div>

      {step === 0 ? (
        <motion.section key="s1" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="oils-join-card">
          <h2>بيانات النشاط</h2>
          <p>عرّفنا على شغلك علشان نحدد شريحة السعر المناسبة.</p>

          <div className="oils-join-field">
            <label className="oils-label" htmlFor="j-name">اسم النشاط / المحل</label>
            <input id="j-name" className="oils-input" value={form.business_name} onChange={(e) => set("business_name", e.target.value)} placeholder="مثال: مركز النور لتغيير الزيوت" />
          </div>

          <div className="oils-join-field">
            <span className="oils-label">نوع النشاط</span>
            <div className="oils-join-chips">
              {CLIENT_TYPES.map((t) => (
                <button key={t.key} type="button" className={`oils-join-chip ${form.client_type === t.key ? "is-on" : ""}`} onClick={() => set("client_type", t.key)}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="oils-join-field">
            <label className="oils-label" htmlFor="j-gov">المحافظة</label>
            <select id="j-gov" className="oils-input" value={form.governorate} onChange={(e) => set("governorate", e.target.value)}>
              <option value="">اختر المحافظة</option>
              {GOVERNORATES.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>

          <div className="oils-join-field">
            <label className="oils-label" htmlFor="j-addr">العنوان التفصيلي</label>
            <input id="j-addr" className="oils-input" value={form.detailed_address} onChange={(e) => set("detailed_address", e.target.value)} placeholder="الشارع، المنطقة، أقرب علامة مميزة" />
          </div>

          <div className="oils-join-grid">
            <div className="oils-join-field">
              <label className="oils-label" htmlFor="j-years">سنوات الخبرة</label>
              <input id="j-years" className="oils-input" inputMode="numeric" value={form.years_in_business} onChange={(e) => set("years_in_business", e.target.value.replace(/\D/g, "").slice(0, 2))} placeholder="5" />
            </div>
            <div className="oils-join-field">
              <label className="oils-label" htmlFor="j-vol">مشترياتك الشهرية</label>
              <select id="j-vol" className="oils-input" value={form.avg_monthly_purchase} onChange={(e) => set("avg_monthly_purchase", e.target.value)}>
                <option value="">اختياري</option>
                {VOLUMES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>

          <button type="button" className="oils-btn-primary" disabled={!stepValid} onClick={() => { void haptic("light"); setStep(1); }}>
            التالي
          </button>
        </motion.section>
      ) : (
        <motion.section key="s2" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="oils-join-card">
          <h2>بيانات التواصل والحساب</h2>
          <p>هننشئ لك حساب دخول بنفس البيانات دي بعد الاعتماد.</p>

          <div className="oils-join-field">
            <label className="oils-label" htmlFor="j-phone">رقم الموبايل (واتساب)</label>
            <input id="j-phone" className="oils-input text-left" dir="ltr" inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value.replace(/\D/g, "").slice(0, 11))} placeholder="01XXXXXXXXX" />
          </div>

          <div className="oils-join-field">
            <label className="oils-label" htmlFor="j-email">البريد الإلكتروني</label>
            <input id="j-email" className="oils-input text-left" dir="ltr" type="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="name@example.com" />
          </div>

          <div className="oils-join-field">
            <label className="oils-label" htmlFor="j-pass">كلمة المرور</label>
            <input id="j-pass" className="oils-input text-left" dir="ltr" type="password" autoComplete="new-password" value={form.password} onChange={(e) => set("password", e.target.value)} placeholder="8 أحرف على الأقل" />
          </div>

          <div className="oils-join-grid">
            <div className="oils-join-field">
              <label className="oils-label" htmlFor="j-cr">السجل التجاري</label>
              <input id="j-cr" className="oils-input" value={form.commercial_register_no} onChange={(e) => set("commercial_register_no", e.target.value)} placeholder="اختياري" />
            </div>
            <div className="oils-join-field">
              <label className="oils-label" htmlFor="j-tax">البطاقة الضريبية</label>
              <input id="j-tax" className="oils-input" value={form.tax_card_no} onChange={(e) => set("tax_card_no", e.target.value)} placeholder="اختياري" />
            </div>
          </div>

          <label className="oils-join-terms">
            <input type="checkbox" checked={form.agreed_terms} onChange={(e) => set("agreed_terms", e.target.checked)} />
            <span>أوافق على سياسة الأسعار وحماية السوق وسياسة الاسترجاع الخاصة بتجار المصرية.</span>
          </label>

          {error && <p className="oils-form-error">{error}</p>}

          <div className="oils-join-actions">
            <button type="button" className="oils-btn-ghost" onClick={() => setStep(0)}>رجوع</button>
            <button type="button" className="oils-btn-primary" disabled={!stepValid || loading} onClick={() => void submit()}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
              إرسال الطلب
            </button>
          </div>
        </motion.section>
      )}
    </main>
  );
};

export default OilsJoin;
