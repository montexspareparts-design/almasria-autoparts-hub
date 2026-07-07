import { motion } from "framer-motion";
import { Phone, Mail, MapPin, MessageCircle, Send, Clock, Building2, Globe } from "lucide-react";
import CarQuiz from "./CarQuiz";
import SpeedometerDashboard from "./SpeedometerDashboard";
import ContactForm from "./ContactForm";
import ContactInfoCard from "./ContactInfoCard";
import BranchCard from "./BranchCard";
import ProductCompare from "./ProductCompare";

const contactInfo = [
  { icon: Mail, label: "البريد العام", value: "info@almasriaautoparts.com", href: "mailto:info@almasriaautoparts.com" },
  { icon: Mail, label: "بريد المبيعات", value: "sales.team@almasriaautoparts.com", href: "mailto:sales.team@almasriaautoparts.com" },
  { icon: MessageCircle, label: "واتساب بيزنس", value: "01032104861", href: "https://wa.me/201034806288" },
  { icon: Clock, label: "مواعيد العمل", value: "من 9 صباحًا حتى 7 مساءً", href: undefined },
];

const branches = [
  { name: "القاهرة – التوفيقية", detail: "سوق التوفيقية لقطع غيار السيارات", phones: ["01032104861", "01151436999"], icon: Building2 },
  { name: "الجيزة – أوسيم", detail: "أوسيم – الجيزة", phones: ["01153961008"], icon: Building2 },
  { name: "الأقصر", detail: "صعيد مصر", phones: ["01016177204"], icon: Building2 },
  { name: "المكتب الإداري", detail: "اللبيني – الهرم – الجيزة", phones: ["01112365417"], icon: Building2 },
  { name: "دبي – الإمارات 🇦🇪", detail: "مركز إقليمي للتوسع الخليجي", phones: [], icon: Globe },
];

const ContactSection = () => {
  return (
    <section id="contact" className="relative py-20 md:py-28 overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-secondary/20 pointer-events-none" />
      <div className="absolute top-0 left-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-primary/3 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.5 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-bold mb-5 backdrop-blur-sm"
          >
            <MessageCircle className="w-4 h-4" />
            تواصل معنا
          </motion.span>
          <h2 className="text-3xl md:text-5xl font-black text-foreground mb-4">
            نحن هنا <span className="shimmer-text">لخدمتك</span>
          </h2>
          <p className="text-muted-foreground text-lg max-w-xl mx-auto">
            اطلب عرض سعر أو تقدم بطلب حساب تاجر — فريقنا جاهز للرد عليك
          </p>
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: "6rem" }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="h-1 bg-gradient-to-l from-primary to-primary/40 mx-auto mt-5 rounded-full"
          />
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-10 xl:gap-14">
          {/* Right Column - Form + Interactive */}
          <div className="space-y-8 order-2 lg:order-1">
            <ContactForm />
            <CarQuiz />
            <SpeedometerDashboard />
            <ProductCompare />
          </div>

          {/* Left Column - Info + Branches */}
          <div className="space-y-6 order-1 lg:order-2">
            {/* Contact Info Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {contactInfo.map((c, i) => (
                <ContactInfoCard key={c.label} {...c} index={i} />
              ))}
            </div>

            {/* Branches */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              className="bg-secondary rounded-2xl p-6 border border-border/50 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent pointer-events-none" />
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                    <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                      <MapPin className="w-5 h-5 text-primary" />
                    </motion.div>
                  </div>
                  <div>
                    <h4 className="font-bold text-lg text-secondary-foreground">فروعنا</h4>
                    <p className="text-xs text-secondary-foreground/60">تغطية شاملة في مصر والخليج</p>
                  </div>
                </div>
                <div className="space-y-2.5">
                  {branches.map((b, i) => (
                    <BranchCard key={b.name} {...b} index={i} />
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Map placeholder / CTA */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="bg-card border border-border rounded-2xl p-6 text-center relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              <div className="relative z-10">
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
                  <MessageCircle className="w-7 h-7 text-primary" />
                </div>
                <h4 className="font-bold text-foreground text-lg mb-2">تواصل سريع عبر واتساب</h4>
                <p className="text-muted-foreground text-sm mb-4">احصل على رد فوري من فريق المبيعات</p>
                <motion.a
                  href="https://wa.me/201034806288"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[hsl(142,70%,40%)] text-white font-bold rounded-xl hover:bg-[hsl(142,70%,35%)] transition-colors"
                  whileHover={{ scale: 1.03 }}
                  whileTap={{ scale: 0.97 }}
                >
                  <MessageCircle className="w-5 h-5" />
                  ابدأ محادثة الآن
                </motion.a>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
