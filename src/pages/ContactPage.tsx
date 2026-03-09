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
import { useLanguage } from "@/contexts/LanguageContext";

const ContactPage = () => {
  const { t, isAr } = useLanguage();
  const [form, setForm] = useState({ name: "", phone: "", email: "", message: "" });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.phone || !form.message) {
      toast.error(t("contact.error"));
      return;
    }
    setSending(true);
    await new Promise((r) => setTimeout(r, 1200));
    toast.success(t("contact.success"));
    setForm({ name: "", phone: "", email: "", message: "" });
    setSending(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>اتصل بنا | المصرية جروب — موزع قطع غيار تويوتا</title>
        <meta name="description" content="تواصل مع المصرية جروب عبر الهاتف أو البريد أو واتساب." />
        <link rel="canonical" href="https://almasriaautoparts.com/contact" />
      </Helmet>
      <Navbar />

      <section className="pt-20 md:pt-28 pb-10 md:pb-14 bg-dark-section relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-2xl md:text-5xl font-black text-secondary-foreground mb-3 md:mb-4">
            {t("contact.title")} <span className="text-gradient-red">{t("contact.title_highlight")}</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="text-secondary-foreground/60 max-w-lg mx-auto text-sm md:text-base">
            {t("contact.subtitle")}
          </motion.p>
        </div>
      </section>

      <section className="py-10 md:py-16">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-8 md:gap-12 max-w-5xl mx-auto">
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="space-y-6">
              <h2 className="text-2xl font-bold text-foreground mb-6">{t("contact.info_title")}</h2>

              <a href="tel:+201153961008" className="flex items-start gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary/30 transition-colors group">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1">{t("contact.phone")}</h3>
                  <p className="text-muted-foreground text-sm" dir="ltr">+20 1153961008</p>
                </div>
              </a>

              <a href="mailto:info@almasriaautoparts.com" className="flex items-start gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary/30 transition-colors group">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1">{t("contact.email")}</h3>
                  <p className="text-muted-foreground text-sm break-all">info@almasriaautoparts.com</p>
                </div>
              </a>

              <a href="https://wa.me/201153961008" target="_blank" rel="noopener noreferrer" className="flex items-start gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary/30 transition-colors group">
                <div className="w-12 h-12 bg-[hsl(142,70%,40%)]/10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <MessageCircle className="w-5 h-5 text-[hsl(142,70%,40%)]" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1">{t("contact.whatsapp")}</h3>
                  <p className="text-muted-foreground text-sm">{t("contact.whatsapp_desc")}</p>
                </div>
              </a>

              <div className="flex items-start gap-4 p-4 bg-card border border-border rounded-xl">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1">{t("contact.hours")}</h3>
                  <p className="text-muted-foreground text-sm">{t("contact.hours_desc")}</p>
                </div>
              </div>
            </motion.div>

            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }}>
              <h2 className="text-2xl font-bold text-foreground mb-6">{t("contact.form_title")}</h2>
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">{t("contact.name")}</label>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={t("contact.name_placeholder")} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">{t("contact.phone_label")}</label>
                  <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01xxxxxxxxx" dir="ltr" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">{t("contact.email_label")}</label>
                  <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="email@example.com" dir="ltr" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1.5">{t("contact.message")}</label>
                  <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder={t("contact.message_placeholder")} rows={5} required />
                </div>
                <Button type="submit" size="lg" className="w-full gap-2 font-bold" disabled={sending}>
                  <Send className="w-4 h-4" />
                  {sending ? t("contact.sending") : t("contact.send")}
                </Button>
              </form>
            </motion.div>
          </div>
        </div>
      </section>

      <section className="py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} className="text-center mb-10">
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-4">
              <MapPin className="w-4 h-4 inline ml-1" />{t("contact.locations")}
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-foreground mb-2">
              {t("contact.visit_branch")} <span className="text-primary">{t("contact.visit_branch_highlight")}</span>
            </h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">{t("contact.map_hint")}</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
            {[
              { name: "القاهرة – التوفيقية", nameEn: "Cairo – Tawfikiya", detail: "سوق التوفيقية لقطع غيار السيارات", detailEn: "Tawfikiya Auto Parts Market", icon: Building2, mapUrl: "https://maps.app.goo.gl/B3Kb6At4dnfGy28T9" },
              { name: "الجيزة – أوسيم", nameEn: "Giza – Osim", detail: "أوسيم – الجيزة", detailEn: "Osim – Giza", icon: Building2, mapUrl: "https://maps.app.goo.gl/trZ9Q4ZhnwtsFXTB8" },
              { name: "الأقصر", nameEn: "Luxor", detail: "صعيد مصر", detailEn: "Upper Egypt", icon: Building2, mapUrl: "https://maps.app.goo.gl/c9B4yDBY2QHWPKcT8" },
              { name: "المكتب الإداري", nameEn: "Admin Office", detail: "اللبيني – الجيزة", detailEn: "Lebini – Giza", icon: Building2, mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("اللبيني, الجيزة, مصر")}` },
              { name: "دبي – Spectra Cars & Parts FZC", nameEn: "Dubai – Spectra Cars & Parts FZC", detail: "مركز إقليمي – الإمارات 🇦🇪", detailEn: "Regional Hub – UAE 🇦🇪", icon: Globe, mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Spectra Cars & Parts FZC, Dubai, UAE")}` },
            ].map((b, i) => (
                <motion.a key={b.name} href={b.mapUrl} target="_blank" rel="noopener noreferrer" initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }} whileHover={{ scale: 1.03, y: -3 }} className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 group cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                      <b.icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-foreground text-sm">{isAr ? b.name : b.nameEn}</h4>
                      <p className="text-xs text-muted-foreground mt-1">{isAr ? b.detail : b.detailEn}</p>
                      <span className="inline-flex items-center gap-1.5 mt-2.5 text-xs font-semibold text-primary">
                        <Navigation className="w-3.5 h-3.5" />{t("contact.open_maps")}
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
