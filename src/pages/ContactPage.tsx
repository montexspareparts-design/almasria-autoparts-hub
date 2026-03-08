import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Phone, Mail, MessageCircle, MapPin, Send, Clock, Building2, Globe, Navigation } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const ContactPage = () => {
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.message) {
      toast.error("يرجى ملء الحقول المطلوبة");
      return;
    }
    setSending(true);
    // Simulate send
    await new Promise((r) => setTimeout(r, 1200));
    toast.success("تم إرسال رسالتك بنجاح! سنتواصل معك قريبًا.");
    setForm({ name: "", phone: "", email: "", message: "" });
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>اتصل بنا | المصرية جروب — موزع قطع غيار تويوتا</title>
        <meta name="description" content="تواصل مع المصرية جروب عبر الهاتف أو البريد أو واتساب. فروعنا في القاهرة والجيزة والأقصر ودبي." />
      </Helmet>
      <Navbar />

      {/* Hero */}
      <section className="pt-28 pb-14 bg-dark-section relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-3xl md:text-5xl font-black text-secondary-foreground mb-4"
          >
            تواصل <span className="text-gradient-red">معنا</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-secondary-foreground/60 max-w-lg mx-auto"
          >
            فريقنا جاهز لخدمتك والرد على جميع استفساراتك حول قطع غيار تويوتا الأصلية والزيوت
          </motion.p>
        </div>
      </section>

      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 max-w-5xl mx-auto">
            {/* Contact Info */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              <h2 className="text-2xl font-bold text-foreground mb-6">معلومات التواصل</h2>

              <a href="tel:+201020412358" className="flex items-start gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary/30 transition-colors group">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1">الهاتف</h3>
                  <p className="text-muted-foreground text-sm" dir="ltr">+20 1020412358</p>
                </div>
              </a>

              <a href="mailto:info@almasriaautoparts.com" className="flex items-start gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary/30 transition-colors group">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1">البريد الإلكتروني</h3>
                  <p className="text-muted-foreground text-sm break-all">info@almasriaautoparts.com</p>
                </div>
              </a>

              <a href="https://wa.me/201020412358" target="_blank" rel="noopener noreferrer" className="flex items-start gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary/30 transition-colors group">
                <div className="w-12 h-12 bg-[hsl(142,70%,40%)]/10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <MessageCircle className="w-5 h-5 text-[hsl(142,70%,40%)]" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1">واتساب</h3>
                  <p className="text-muted-foreground text-sm">تواصل فوري على مدار الساعة</p>
                </div>
              </a>

              <div className="flex items-start gap-4 p-4 bg-card border border-border rounded-xl">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1">ساعات العمل</h3>
                  <p className="text-muted-foreground text-sm">السبت – الخميس: 9 صباحًا – 6 مساءً</p>
                </div>
              </div>

            </motion.div>

            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h2 className="text-2xl font-bold text-foreground mb-6">أرسل لنا رسالة</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">الاسم *</label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="الاسم بالكامل"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">رقم الهاتف *</label>
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                    placeholder="01xxxxxxxxx"
                    dir="ltr"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">البريد الإلكتروني</label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                    placeholder="email@example.com"
                    dir="ltr"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">الرسالة *</label>
                  <Textarea
                    value={form.message}
                    onChange={(e) => setForm({ ...form, message: e.target.value })}
                    placeholder="اكتب رسالتك هنا..."
                    rows={5}
                    required
                  />
                </div>
                <Button type="submit" size="lg" className="w-full gap-2 font-bold" disabled={sending}>
                  <Send className="w-4 h-4" />
                  {sending ? "جارِ الإرسال..." : "إرسال الرسالة"}
                </Button>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Branches with Google Maps */}
      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-4">
              <MapPin className="w-4 h-4 inline ml-1" />
              مواقعنا
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-foreground mb-2">
              زُر أقرب <span className="text-primary">فرع</span>
            </h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">اضغط على الفرع لفتح الموقع مباشرة على خرائط جوجل</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[
              { name: "القاهرة – التوفيقية", detail: "سوق التوفيقية لقطع غيار السيارات", icon: Building2, mapUrl: "https://maps.app.goo.gl/B3Kb6At4dnfGy28T9" },
              { name: "الجيزة – أوسيم", detail: "أوسيم – الجيزة", icon: Building2, mapUrl: "https://maps.app.goo.gl/trZ9Q4ZhnwtsFXTB8" },
              { name: "الأقصر", detail: "صعيد مصر", icon: Building2, mapUrl: "https://maps.app.goo.gl/c9B4yDBY2QHWPKcT8" },
              { name: "المكتب الإداري", detail: "اللبيني – الجيزة", icon: Building2, mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("اللبيني, الجيزة, مصر")}` },
              { name: "دبي – Spectra Cars & Parts FZC", detail: "مركز إقليمي – الإمارات 🇦🇪", icon: Globe, mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Spectra Cars & Parts FZC, Dubai, UAE")}` },
            ].map((b, i) => (
              <motion.a
                key={b.name}
                href={b.mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ scale: 1.03, y: -3 }}
                className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 group cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <b.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-bold text-foreground text-sm">{b.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{b.detail}</p>
                    <span className="inline-flex items-center gap-1.5 mt-2.5 text-xs font-semibold text-primary">
                      <Navigation className="w-3.5 h-3.5" />
                      افتح على خرائط جوجل
                    </span>
                  </div>
                </div>
              </motion.a>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ContactPage;
