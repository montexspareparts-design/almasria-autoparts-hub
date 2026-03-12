import { useState } from "react";
import { motion } from "framer-motion";
import { Shield, TrendingUp, Users, Award, CheckCircle, ArrowLeft, FileText, UserCheck, Clock, Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import DealerAuthDialog from "@/components/DealerAuthDialog";

const benefits = [
{ icon: TrendingUp, title: "أسعار جملة تنافسية", desc: "احصل على تسعير خاص حسب فئتك كتاجر معتمد" },
{ icon: Shield, title: "حماية السوق", desc: "نلتزم بسياسات تسعير صارمة لحماية شركائنا من المنافسة غير العادلة" },
{ icon: Users, title: "شبكة توزيع منظمة", desc: "انضم لشبكة تضم أكثر من 500 تاجر موزع في مصر" },
{ icon: Award, title: "منتجات أصلية مضمونة", desc: "قطع غيار تويوتا الأصلية وزيوت أصلية 100%" }];

const requirements = [
"سجل تجاري ساري",
"بطاقة ضريبية",
"صورة بطاقة الرقم القومي",
"خبرة لا تقل عن سنة في مجال قطع الغيار",
"محل أو مخزن ثابت"];

const policies = [
"الالتزام بسياسة التسعير المحددة من المصرية جروب",
"عدم كسر الأسعار أو البيع بأقل من السعر المحدد",
"الالتزام بسياسة الاسترجاع والاستبدال",
"الحفاظ على سمعة العلامة التجارية",
"عدم بيع منتجات مقلدة تحت اسم الشركة"];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.15 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: 30 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.5, ease: "easeOut" as const } }
};

const DealerApply = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-16 bg-hero-gradient text-center overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          >
            <motion.h1
              className="text-3xl md:text-5xl font-black text-secondary-foreground mb-4"
              initial={{ opacity: 0, y: -30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.2 }}
            >
              طلب فتح حساب <span className="text-gradient-red">تاجر معتمد</span>
            </motion.h1>
            <motion.p
              className="text-secondary-foreground/60 text-lg max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.5 }}
            >
              انضم للمصرية جروب واستفد من أقوى أسعار الجملة لقطع غيار تويوتا الأصلية
            </motion.p>
            <motion.div
              className="w-20 h-1 bg-primary mx-auto mt-4"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ duration: 0.8, delay: 0.7 }}
            />
          </motion.div>
        </div>
      </section>

      {/* Welcome & Steps */}
      <section className="py-16 bg-background overflow-hidden">
        <div className="container mx-auto px-4 max-w-4xl">
          <motion.div
            className="bg-secondary/60 border border-primary/20 rounded-2xl p-8 md:p-10 mb-10"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-xl md:text-2xl font-bold text-secondary-foreground mb-3">
              👋 أهلاً بك في عائلة <span className="text-gradient-red">المصرية جروب</span>
            </h2>
            <p className="text-secondary-foreground/70 leading-relaxed">
              نسعد بانضمامك كشريك معتمد في شبكة توزيع قطع غيار تويوتا الأصلية الأكبر في مصر. 
              عملية التقديم بسيطة وسريعة — اتبع الخطوات التالية وهنتواصل معاك في أقرب وقت.
            </p>
          </motion.div>

          <motion.h2
            className="text-2xl font-bold text-foreground text-center mb-10"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            خطوات التقديم
          </motion.h2>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 relative">
            <div className="hidden md:block absolute top-10 left-[12.5%] right-[12.5%] h-0.5 bg-primary/20" />
            {[
              { icon: FileText, step: "١", title: "أنشئ حساب", desc: "سجّل ببياناتك الأساسية (الإيميل وكلمة المرور)" },
              { icon: UserCheck, step: "٢", title: "قدّم طلبك", desc: "أرفق السجل التجاري والبطاقة الضريبية وبيانات النشاط" },
              { icon: Clock, step: "٣", title: "مراجعة الطلب", desc: "فريقنا يراجع طلبك ويتواصل معك خلال ٤٨ ساعة عمل" },
              { icon: Rocket, step: "٤", title: "ابدأ الشراء", desc: "بمجرد الموافقة، تقدر تطلب بأسعار الجملة فوراً" },
            ].map((s, i) => (
              <motion.div
                key={i}
                className="flex flex-col items-center text-center"
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
              >
                <div className="relative z-10 w-20 h-20 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mb-4">
                  <s.icon className="w-8 h-8 text-primary" />
                  <span className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-black flex items-center justify-center">
                    {s.step}
                  </span>
                </div>
                <h3 className="font-bold text-foreground mb-1">{s.title}</h3>
                <p className="text-sm text-muted-foreground">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 bg-dark-section overflow-hidden">
        <div className="container mx-auto px-4">
          <motion.h2
            className="text-2xl md:text-3xl font-bold text-dark-section-foreground text-center mb-12"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            مميزات الانضمام لـ<span className="text-gradient-red">المصرية جروب</span>
          </motion.h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {benefits.map((b, i) =>
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 40, scale: 0.9 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.5, ease: "easeOut" }}
              whileHover={{ y: -8, boxShadow: "0 20px 40px -15px hsl(var(--primary) / 0.3)" }}
              className="bg-secondary/50 border border-primary/20 rounded-lg p-6 text-center cursor-default transition-colors hover:border-primary/50"
            >
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15 + 0.3, type: "spring", stiffness: 200 }}
              >
                <b.icon className="w-12 h-12 text-primary mx-auto mb-4" />
              </motion.div>
              <h3 className="font-bold text-secondary-foreground mb-2">{b.title}</h3>
              <p className="text-sm text-secondary-foreground/60">{b.desc}</p>
            </motion.div>
            )}
          </div>
        </div>
      </section>

      {/* Requirements & Policies */}
      <section className="py-16 bg-background overflow-hidden">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 max-w-4xl mx-auto">
            {/* Requirements */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={containerVariants}
            >
              <motion.h3
                className="text-xl font-bold text-foreground mb-6"
                variants={itemVariants}
              >
                شروط الاعتماد
              </motion.h3>
              <ul className="space-y-3">
                {requirements.map((r, i) =>
                <motion.li
                  key={i}
                  variants={itemVariants}
                  className="flex items-start gap-3"
                >
                  <CheckCircle className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <span className="text-foreground/80">{r}</span>
                </motion.li>
                )}
              </ul>
            </motion.div>

            {/* Policies */}
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={containerVariants}
            >
              <motion.h3
                className="text-xl font-bold text-foreground mb-6"
                variants={itemVariants}
              >
                سياسة حماية السوق
              </motion.h3>
              <ul className="space-y-3">
                {policies.map((p, i) =>
                <motion.li
                  key={i}
                  variants={itemVariants}
                  className="flex items-start gap-3"
                >
                  <Shield className="w-5 h-5 text-primary mt-0.5 shrink-0" />
                  <span className="text-foreground/80">{p}</span>
                </motion.li>
                )}
              </ul>
            </motion.div>
          </div>

          {/* CTA */}
          <motion.div
            className="text-center mt-12"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.97 }}
            >
              <Button
                size="lg"
                className="gap-2 red-glow text-lg px-10"
                onClick={() => navigate("/dealer-register")}
              >
                ابدأ التسجيل الآن
                <ArrowLeft className="w-5 h-5" />
              </Button>
            </motion.div>
            <motion.p
              className="text-muted-foreground text-sm mt-3"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
            >
              لديك حساب بالفعل؟{" "}
              <button onClick={() => navigate("/auth")} className="text-primary hover:underline">
                سجل دخول
              </button>
            </motion.p>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default DealerApply;
