import { motion } from "framer-motion";
import { Shield, TrendingUp, Users, Award, CheckCircle, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const benefits = [
  { icon: TrendingUp, title: "أسعار جملة تنافسية", desc: "احصل على تسعير خاص حسب فئتك كتاجر معتمد" },
  { icon: Shield, title: "حماية السوق", desc: "نلتزم بسياسات تسعير صارمة لحماية شركائنا من المنافسة غير العادلة" },
  { icon: Users, title: "شبكة توزيع منظمة", desc: "انضم لشبكة تضم أكثر من 500 تاجر موزع في مصر" },
  { icon: Award, title: "منتجات أصلية مضمونة", desc: "قطع غيار تويوتا الأصلية وزيوت أصلية 100%" },
];

const requirements = [
  "سجل تجاري ساري",
  "بطاقة ضريبية",
  "صورة بطاقة الرقم القومي",
  "خبرة لا تقل عن سنة في مجال قطع الغيار",
  "محل أو مخزن ثابت",
];

const policies = [
  "الالتزام بسياسة التسعير المحددة من المصرية جروب",
  "عدم كسر الأسعار أو البيع بأقل من السعر المحدد",
  "الالتزام بسياسة الاسترجاع والاستبدال",
  "الحفاظ على سمعة العلامة التجارية",
  "عدم بيع منتجات مقلدة تحت اسم الشركة",
];

const DealerApply = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-16 bg-hero-gradient text-center">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <h1 className="text-3xl md:text-5xl font-black text-secondary-foreground mb-4">
              طلب فتح حساب <span className="text-gradient-red">تاجر معتمد</span>
            </h1>
            <p className="text-secondary-foreground/60 text-lg max-w-2xl mx-auto">
              انضم لشبكة المصرية جروب واستفد من أقوى أسعار الجملة لقطع غيار تويوتا الأصلية
            </p>
            <div className="w-20 h-1 bg-primary mx-auto mt-4" />
          </motion.div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-dark-section">
        <div className="container mx-auto px-4">
          <h2 className="text-2xl md:text-3xl font-bold text-dark-section-foreground text-center mb-12">
            مميزات الانضمام لشبكة <span className="text-gradient-red">المصرية جروب</span>
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((b, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1 }}
                className="bg-secondary/50 border border-primary/20 rounded-lg p-6 text-center"
              >
                <b.icon className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="font-bold text-secondary-foreground mb-2">{b.title}</h3>
                <p className="text-sm text-secondary-foreground/60">{b.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Requirements & Policies */}
      <section className="py-16 bg-background">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
            {/* Requirements */}
            <div>
              <h3 className="text-xl font-bold text-foreground mb-6">شروط الاعتماد</h3>
              <ul className="space-y-3">
                {requirements.map((r, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <CheckCircle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <span className="text-foreground/80">{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Policies */}
            <div>
              <h3 className="text-xl font-bold text-foreground mb-6">سياسة حماية السوق</h3>
              <ul className="space-y-3">
                {policies.map((p, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                    <span className="text-foreground/80">{p}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>


          {/* CTA */}
          <div className="text-center mt-12">
            <Button
              size="lg"
              className="gap-2 red-glow text-lg px-10"
              onClick={() => navigate("/dealer-register")}
            >
              ابدأ التسجيل الآن
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <p className="text-muted-foreground text-sm mt-3">
              لديك حساب بالفعل؟{" "}
              <button onClick={() => navigate("/auth")} className="text-primary hover:underline">
                سجل دخول
              </button>
            </p>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default DealerApply;
