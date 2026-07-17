import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";
import { Lock, UserPlus, CheckCircle2, Building2, Users, ShoppingBag, Loader2, Eye, EyeOff } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { SIGNUP_MESSAGES, mapAuthError, logSignupError } from "@/lib/signupErrors";

const governorates = [
  "القاهرة", "الجيزة", "الإسكندرية", "الشرقية", "الدقهلية", "البحيرة",
  "المنوفية", "الغربية", "كفر الشيخ", "القليوبية", "الفيوم", "بني سويف",
  "المنيا", "أسيوط", "سوهاج", "قنا", "الأقصر", "أسوان", "البحر الأحمر",
  "الوادي الجديد", "مطروح", "شمال سيناء", "جنوب سيناء", "بورسعيد",
  "الإسماعيلية", "السويس", "دمياط",
];

const clientTypes = [
  { value: "wholesale", label: "عميل جملة", icon: ShoppingBag, desc: "تجار الجملة وموزعي قطع الغيار" },
  { value: "company", label: "شركة / هيئة حكومية", icon: Building2, desc: "شركات خاصة أو جهات حكومية" },
  { value: "distributor", label: "عميل قطاعي", icon: Users, desc: "ورش صيانة ومراكز خدمة" },
] as const;

const ADMIN_WHATSAPP = "201034806288";

const formSchema = z.object({
  fullName: z.string().trim().min(3, "الاسم يجب أن يكون 3 أحرف على الأقل").max(100),
  phone: z.string().trim().min(10, "رقم الهاتف يجب أن يكون 11 رقم على الأقل").max(20).regex(/^01[0-9]{9}$/, "رقم هاتف مصري غير صحيح (يبدأ بـ 01)"),
  businessName: z.string().trim().min(2, "اسم الشركة مطلوب").max(200),
  governorate: z.string().min(1, "يرجى اختيار المحافظة"),
  email: z.string().trim().email("بريد إلكتروني غير صحيح").min(1, "البريد الإلكتروني مطلوب").max(255),
  password: z.string().min(6, "كلمة المرور يجب أن تكون 6 أحرف على الأقل").max(100),
  clientType: z.enum(["wholesale", "company", "distributor"], { required_error: "يرجى اختيار نوع العميل" }),
});

type FormData = z.infer<typeof formSchema>;

const DealerRegister = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [form, setForm] = useState<FormData>({
    fullName: "",
    phone: "",
    businessName: "",
    governorate: "",
    email: user?.email || "",
    password: "",
    clientType: "" as any,
  });

  const notifyAdminWhatsApp = (appData: FormData) => {
    const clientLabel = clientTypes.find(c => c.value === appData.clientType)?.label || appData.clientType;
    const message = `🆕 طلب تسجيل تاجر جديد\n\n👤 الاسم: ${appData.fullName}\n🏢 الشركة: ${appData.businessName}\n📞 الهاتف: ${appData.phone}\n📍 المحافظة: ${appData.governorate}\n📋 النوع: ${clientLabel}\n\nادخل لوحة التحكم للموافقة على الطلب.`;
    const url = `https://wa.me/${ADMIN_WHATSAPP}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = formSchema.safeParse(form);
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }

    setLoading(true);

    try {
      // Check for duplicate phone/email
      const { data: dupCheck } = await supabase.rpc("check_dealer_application_exists", {
        _phone: form.phone,
        _email: form.email,
      });
      const dupResult = dupCheck as any;
      if (dupResult?.phone_exists) {
        toast.error("رقم الهاتف مسجل بالفعل في طلب سابق. يرجى تسجيل الدخول.");
        setLoading(false);
        return;
      }
      if (dupResult?.email_exists) {
        toast.error("البريد الإلكتروني مسجل بالفعل في طلب سابق. يرجى تسجيل الدخول.");
        setLoading(false);
        return;
      }

      let userId = user?.id;

      if (!userId) {
        const { data: authData, error: authError } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { full_name: form.fullName, phone: form.phone, email: form.email } },
        });
        if (authError) {
          if (authError.message.includes("already registered")) {
            toast.error("هذا البريد أو الرقم مسجل بالفعل. يرجى تسجيل الدخول.");
          } else {
            toast.error("حدث خطأ أثناء إنشاء الحساب: " + authError.message);
          }
          setLoading(false);
          return;
        }
        userId = authData.user?.id;
      }

      if (!userId) {
        toast.error("حدث خطأ. يرجى المحاولة مرة أخرى.");
        setLoading(false);
        return;
      }

      const { error: appError } = await supabase.from("dealer_applications").insert({
        user_id: userId,
        business_name: form.businessName,
        legal_name: form.fullName,
        commercial_register_no: "pending",
        tax_card_no: "pending",
        phone: form.phone,
        email: form.email || "",
        governorate: form.governorate,
        detailed_address: form.governorate,
        client_type: form.clientType as any,
        agreed_terms: true,
        agreed_pricing_policy: true,
        agreed_market_protection: true,
        agreed_return_policy: true,
      });

      if (appError) {
        if (appError.message.includes("row-level security")) {
          toast.error("يرجى تسجيل الدخول أولاً أو المحاولة مرة أخرى.");
        } else {
          toast.error("حدث خطأ أثناء إرسال الطلب.");
        }
        setLoading(false);
        return;
      }

      // Notify admin via in-app notification (real-time)
      supabase.functions.invoke("notify-admin-new-application", {
        body: {
          fullName: form.fullName,
          businessName: form.businessName,
          phone: form.phone,
          governorate: form.governorate,
          clientType: form.clientType,
        },
      }).catch(console.error);

      // Notify admin via WhatsApp
      notifyAdminWhatsApp(form);
      setSubmitted(true);
    } catch {
      toast.error("حدث خطأ غير متوقع. يرجى المحاولة لاحقاً.");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 md:pt-28 pb-16 md:pb-20">
          <div className="container mx-auto px-3 sm:px-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="max-w-lg mx-auto text-center bg-card border border-border rounded-xl p-6 sm:p-10 shadow-lg"
            >
              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-card-foreground mb-3">تم استلام طلبك بنجاح!</h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                سيتم التواصل معك خلال وقت قصير لتفعيل الحساب.
                <br />
                شكراً لاختيارك المصرية جروب.
              </p>
              <div className="bg-muted rounded-lg p-4 text-sm text-muted-foreground mb-6">
                <strong className="text-foreground">حالة الطلب:</strong> قيد المراجعة
              </div>
              <Button onClick={() => navigate("/")} variant="outline" className="gap-2">
                العودة للرئيسية
              </Button>
            </motion.div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero */}
      <section className="pt-24 md:pt-28 pb-8 md:pb-12 bg-dark-section">
        <div className="container mx-auto px-4 text-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="inline-flex items-center gap-2 bg-primary/15 border border-primary/30 rounded-full px-3 py-1.5 mb-3 md:mb-4">
              <UserPlus className="w-4 h-4 text-primary" />
              <span className="text-xs sm:text-sm font-semibold text-primary">تسجيل عميل جديد</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-5xl font-black text-dark-section-foreground mb-2 md:mb-3">
              فتح حساب <span className="text-gradient-red">عميل معتمد</span>
            </h1>
            <p className="text-dark-section-foreground/60 text-sm sm:text-base md:text-lg max-w-xl mx-auto">
              المصرية جروب – خبرة 25 عامًا في سوق قطع غيار تويوتا في مصر
            </p>
            <div className="w-16 md:w-20 h-1 bg-primary mx-auto mt-3 md:mt-4" />
          </motion.div>
        </div>
      </section>

      {/* Form */}
      <section className="py-8 md:py-12">
        <div className="container mx-auto px-3 sm:px-4">
          <div className="max-w-2xl mx-auto">

            {/* Price Notice */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-muted border border-primary/20 rounded-lg p-4 mb-8 flex items-center gap-3"
            >
              <Lock className="w-5 h-5 text-primary shrink-0" />
              <p className="text-foreground text-sm">
                <strong>الأسعار متاحة للعملاء المعتمدين فقط</strong> بعد مراجعة البيانات وتفعيل الحساب.
              </p>
            </motion.div>

            <motion.form
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              onSubmit={handleSubmit}
              className="bg-card border border-border rounded-xl p-4 sm:p-6 md:p-8 shadow-sm space-y-5 md:space-y-6"
            >
              <h2 className="text-xl font-bold text-card-foreground mb-2">البيانات الأساسية</h2>

              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName">الاسم الكامل <span className="text-primary">*</span></Label>
                <Input
                  id="fullName"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="أدخل اسمك الكامل"
                  className="text-right"
                  required
                />
              </div>

              {/* Phone */}
              <div className="space-y-2">
                <Label htmlFor="phone">رقم الهاتف <span className="text-primary">*</span></Label>
                <Input
                  id="phone"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="01xxxxxxxxx"
                  className="text-right"
                  required
                />
              </div>

              {/* Business Name */}
              <div className="space-y-2">
                <Label htmlFor="businessName">اسم الشركة أو النشاط <span className="text-primary">*</span></Label>
                <Input
                  id="businessName"
                  value={form.businessName}
                  onChange={(e) => setForm({ ...form, businessName: e.target.value })}
                  placeholder="اسم النشاط التجاري"
                  className="text-right"
                  required
                />
              </div>

              {/* Governorate */}
              <div className="space-y-2">
                <Label>المحافظة <span className="text-primary">*</span></Label>
                <Select
                  value={form.governorate}
                  onValueChange={(val) => setForm({ ...form, governorate: val })}
                >
                  <SelectTrigger className="text-right">
                    <SelectValue placeholder="اختر المحافظة" />
                  </SelectTrigger>
                  <SelectContent>
                    {governorates.map((gov) => (
                      <SelectItem key={gov} value={gov}>{gov}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="email">البريد الإلكتروني <span className="text-primary">*</span></Label>
                <Input
                  id="email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="example@email.com"
                  className="text-right"
                  required
                />
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="reg-password">كلمة المرور <span className="text-primary">*</span></Label>
                <div className="relative">
                  <Input
                    id="reg-password"
                    type={showPassword ? "text" : "password"}
                    value={form.password}
                    onChange={(e) => setForm({ ...form, password: e.target.value })}
                    placeholder="أدخل كلمة مرور (6 أحرف على الأقل)"
                    dir="ltr"
                    className="pl-10"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-xs text-muted-foreground">ستحتاج كلمة المرور لتسجيل الدخول لاحقاً</p>
              </div>

              {/* Client Type */}
              <div className="space-y-3">
                <Label>نوع العميل <span className="text-primary">*</span></Label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {clientTypes.map((type) => {
                    const isSelected = form.clientType === type.value;
                    return (
                      <button
                        key={type.value}
                        type="button"
                        onClick={() => setForm({ ...form, clientType: type.value })}
                        className={`relative rounded-lg border-2 p-4 text-center transition-all duration-200 ${
                          isSelected
                            ? "border-primary bg-primary/5 shadow-sm"
                            : "border-border bg-card hover:border-primary/40"
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 left-2">
                            <CheckCircle2 className="w-4 h-4 text-primary" />
                          </div>
                        )}
                        <type.icon className={`w-8 h-8 mx-auto mb-2 ${isSelected ? "text-primary" : "text-muted-foreground"}`} />
                        <div className={`font-bold text-sm ${isSelected ? "text-primary" : "text-card-foreground"}`}>{type.label}</div>
                        <div className="text-xs text-muted-foreground mt-1">{type.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                size="lg"
                className="w-full gap-2 text-lg red-glow"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    جاري الإرسال...
                  </>
                ) : (
                  <>
                    <UserPlus className="w-5 h-5" />
                    إرسال طلب فتح الحساب
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground text-center">
                بإرسال هذا الطلب، أنت توافق على سياسة التسعير وحماية السوق الخاصة بالمصرية جروب.
              </p>
            </motion.form>

            {/* Already have account */}
            <div className="text-center mt-6">
              <p className="text-muted-foreground text-sm">
                لديك حساب بالفعل؟{" "}
                <button onClick={() => navigate("/dealer-login")} className="text-primary font-semibold hover:underline">
                  تسجيل الدخول
                </button>
              </p>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default DealerRegister;
