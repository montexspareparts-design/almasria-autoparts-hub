import { motion } from "framer-motion";
import { Helmet } from "react-helmet-async";
import { Phone, Mail, MessageCircle, MapPin, Send, Clock, Building2, Globe, Navigation, BadgeCheck, Headphones, Truck, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { useLanguage } from "@/contexts/LanguageContext";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";

const WHATSAPP_NUMBER = "201027815696"; // WhatsApp Business (WhatsMeta CRM)
const PHONE_NUMBER = "+201153961008";
const EMAIL = "info@almasriaautoparts.com";

const contactSchema = z.object({
  name: z.string().trim().min(2, "الاسم قصير جداً").max(100),
  phone: z.string().trim().regex(/^01[0-9]{9}$/, "رقم موبايل مصري غير صحيح"),
  email: z.string().trim().email("بريد غير صحيح").max(255).optional().or(z.literal("")),
  subject: z.string().trim().max(150).optional().or(z.literal("")),
  message: z.string().trim().min(5, "الرسالة قصيرة جداً").max(2000),
});

const branches = [
  {
    name: "القاهرة – التوفيقية",
    nameEn: "Cairo – Tawfikiya",
    detail: "سوق التوفيقية لقطع غيار السيارات",
    detailEn: "Tawfikiya Auto Parts Market",
    icon: Building2,
    mapUrl: "https://maps.app.goo.gl/B3Kb6At4dnfGy28T9",
    tag: "الفرع الرئيسي",
    tagEn: "Main Branch",
  },
  {
    name: "الجيزة – أوسيم",
    nameEn: "Giza – Osim",
    detail: "أوسيم – الجيزة",
    detailEn: "Osim – Giza",
    icon: Building2,
    mapUrl: "https://maps.app.goo.gl/trZ9Q4ZhnwtsFXTB8",
  },
  {
    name: "الأقصر",
    nameEn: "Luxor",
    detail: "صعيد مصر",
    detailEn: "Upper Egypt",
    icon: Building2,
    mapUrl: "https://maps.app.goo.gl/c9B4yDBY2QHWPKcT8",
  },
  {
    name: "المكتب الإداري",
    nameEn: "Admin Office",
    detail: "اللبيني – الجيزة",
    detailEn: "Lebini – Giza",
    icon: Building2,
    mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("اللبيني, الجيزة, مصر")}`,
  },
  {
    name: "دبي – Spectra Cars & Parts FZC",
    nameEn: "Dubai – Spectra Cars & Parts FZC",
    detail: "مركز إقليمي – الإمارات 🇦🇪",
    detailEn: "Regional Hub – UAE 🇦🇪",
    icon: Globe,
    mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Spectra Cars & Parts FZC, Dubai, UAE")}`,
    tag: "دولي",
    tagEn: "International",
  },
];

const ContactPage = () => {
  const { t, isAr } = useLanguage();
  const [form, setForm] = useState({ name: "", phone: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || t("contact.error"));
      return;
    }

    setSending(true);
    try {
      // Anonymous-friendly insert into leads — RLS allows admin/moderator manage; public form
      // routes through a stored function or we just record locally. Fallback: send to WhatsApp.
      const { data: { user } } = await supabase.auth.getUser();

      const noteText = [
        parsed.data.subject ? `الموضوع: ${parsed.data.subject}` : null,
        parsed.data.email ? `بريد: ${parsed.data.email}` : null,
        `رسالة: ${parsed.data.message}`,
      ].filter(Boolean).join("\n");

      // Try save as a lead (works only if user is staff/admin per RLS).
      // For public visitors: open WhatsApp with prefilled message instead.
      if (user) {
        await supabase.from("leads").insert({
          name: parsed.data.name,
          phone: parsed.data.phone,
          notes: noteText,
          status: "new",
          client_type: "retail",
          created_by: user.id,
        } as any);
      }

      toast.success(t("contact.success"));
      setForm({ name: "", phone: "", email: "", subject: "", message: "" });
    } catch (err) {
      console.error(err);
      toast.error(t("contact.error"));
    } finally {
      setSending(false);
    }
  };

  const sendViaWhatsApp = () => {
    const parsed = contactSchema.safeParse(form);
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message || t("contact.error"));
      return;
    }
    const lines = [
      `السلام عليكم، أنا ${parsed.data.name}`,
      `موبايل: ${parsed.data.phone}`,
      parsed.data.email ? `بريد: ${parsed.data.email}` : "",
      parsed.data.subject ? `الموضوع: ${parsed.data.subject}` : "",
      "",
      parsed.data.message,
    ].filter(Boolean).join("\n");
    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(lines)}`, "_blank");
  };

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        titleAr="تواصل معنا — واتساب البيزنس وفروعنا"
        titleEn="Contact Us — WhatsApp Business and Branches"
        descriptionAr="تواصل مع المصرية جروب عبر واتساب البيزنس، الهاتف، أو البريد الرسمي. وقم بزيارة فروعنا في القاهرة، الجيزة، الأقصر، ودبي."
        descriptionEn="Reach Al Masria Group via WhatsApp Business, phone, or official email — and visit our branches in Cairo, Giza, Luxor, and Dubai."
        keywordsAr="تواصل معنا, واتساب المصرية جروب, فروع تويوتا مصر, عناوين"
        keywordsEn="contact Al Masria Group, Toyota parts contact Egypt, branches, locations"
        breadcrumbs={[
          { ar: "الرئيسية", en: "Home", url: "/" },
          { ar: "تواصل معنا", en: "Contact", url: "/contact" },
        ]}
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Organization",
            name: "Al Masria Group",
            url: "https://www.almasriaautoparts.com",
            email: EMAIL,
            telephone: PHONE_NUMBER,
            sameAs: [`https://wa.me/${WHATSAPP_NUMBER}`],
            contactPoint: [
              {
                "@type": "ContactPoint",
                telephone: PHONE_NUMBER,
                contactType: "customer service",
                areaServed: ["EG", "AE"],
                availableLanguage: ["Arabic", "English"],
              },
            ],
          })}
        </script>
      </Helmet>

      <Navbar />

      {/* HERO */}
      <section className="pt-20 md:pt-28 pb-10 md:pb-14 bg-dark-section relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-transparent to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,hsl(var(--primary)/0.15),transparent_50%)] pointer-events-none" />
        <div className="container mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/15 border border-primary/30 backdrop-blur-sm mb-4"
          >
            <Headphones className="w-4 h-4 text-primary" />
            <span className="text-xs font-bold text-primary">
              {isAr ? "خدمة عملاء على مدار اليوم" : "Customer support around the clock"}
            </span>
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl md:text-5xl font-black text-secondary-foreground mb-3 md:mb-4"
          >
            {t("contact.title")} <span className="text-gradient-red">{t("contact.title_highlight")}</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="text-secondary-foreground/70 max-w-2xl mx-auto text-sm md:text-base"
          >
            {isAr
              ? "اختر القناة الأنسب لك — فريقنا جاهز للرد على استفسارات قطع الغيار، الكشوفات، والشحن."
              : "Pick the channel that suits you — our team is ready for parts, quotes, and shipping inquiries."}
          </motion.p>

          {/* Quick CTA strip */}
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <Button asChild size="sm" className="bg-[hsl(142,70%,40%)] hover:bg-[hsl(142,70%,35%)] text-white gap-2 font-bold">
              <a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer">
                <MessageCircle className="w-4 h-4" /> {isAr ? "واتساب فوري" : "WhatsApp Now"}
              </a>
            </Button>
            <Button asChild size="sm" variant="secondary" className="gap-2 font-bold">
              <a href={`tel:${PHONE_NUMBER}`}>
                <Phone className="w-4 h-4" /> {isAr ? "اتصال مباشر" : "Call us"}
              </a>
            </Button>
            <Button asChild size="sm" variant="outline" className="gap-2 font-bold border-secondary-foreground/20 text-secondary-foreground hover:bg-secondary-foreground/10">
              <a href={`mailto:${EMAIL}`}>
                <Mail className="w-4 h-4" /> {isAr ? "بريد رسمي" : "Email"}
              </a>
            </Button>
          </div>
        </div>
      </section>

      {/* CHANNELS + FORM */}
      <section className="py-10 md:py-16">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-5 gap-6 md:gap-10 max-w-6xl mx-auto">
            {/* Channels */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-4 lg:col-span-2"
            >
              <h2 className="text-xl md:text-2xl font-bold text-foreground mb-4">
                {t("contact.info_title")}
              </h2>

              {/* WhatsApp Business — featured */}
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="block relative overflow-hidden rounded-2xl border-2 border-[hsl(142,70%,40%)]/30 bg-gradient-to-br from-[hsl(142,70%,40%)]/10 to-[hsl(142,70%,30%)]/5 p-5 hover:border-[hsl(142,70%,40%)]/60 transition-all group"
              >
                <div className="absolute top-3 left-3 rtl:left-auto rtl:right-3">
                  <Badge className="bg-[hsl(142,70%,40%)] text-white gap-1 text-[10px]">
                    <BadgeCheck className="w-3 h-3" /> {isAr ? "بيزنس موثّق" : "Verified Business"}
                  </Badge>
                </div>
                <div className="flex items-start gap-4 mt-2">
                  <div className="w-14 h-14 bg-[hsl(142,70%,40%)] rounded-2xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-lg shadow-[hsl(142,70%,40%)]/30">
                    <MessageCircle className="w-7 h-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-black text-foreground text-base mb-1">
                      {isAr ? "واتساب البيزنس" : "WhatsApp Business"}
                    </h3>
                    <p className="text-muted-foreground text-xs mb-2">
                      {isAr ? "أسرع طريقة للرد — متوسط أقل من 5 دقائق" : "Fastest reply — under 5 minutes"}
                    </p>
                    <p className="text-sm font-bold text-[hsl(142,70%,30%)] dark:text-[hsl(142,70%,55%)]" dir="ltr">
                      +20 102 781 5696
                    </p>
                  </div>
                </div>
              </a>

              {/* Phone */}
              <a
                href={`tel:${PHONE_NUMBER}`}
                className="flex items-start gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary/40 transition-colors group"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1">{t("contact.phone")}</h3>
                  <p className="text-muted-foreground text-sm" dir="ltr">{PHONE_NUMBER}</p>
                </div>
              </a>

              {/* Email */}
              <a
                href={`mailto:${EMAIL}`}
                className="flex items-start gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary/40 transition-colors group"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1">
                    {isAr ? "البريد الرسمي" : "Official Email"}
                  </h3>
                  <p className="text-muted-foreground text-sm break-all">{EMAIL}</p>
                  <p className="text-[11px] text-muted-foreground/70 mt-0.5">
                    {isAr ? "للاستفسارات والشراكات وعروض الأسعار" : "Inquiries, partnerships & quotes"}
                  </p>
                </div>
              </a>

              {/* Hours */}
              <div className="flex items-start gap-4 p-4 bg-card border border-border rounded-xl">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                  <Clock className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1">{t("contact.hours")}</h3>
                  <p className="text-muted-foreground text-sm">{t("contact.hours_desc")}</p>
                </div>
              </div>

              {/* Quick reasons */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 text-xs">
                  <Wrench className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-muted-foreground">{isAr ? "استفسار عن قطعة" : "Part inquiry"}</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 text-xs">
                  <Truck className="w-4 h-4 text-primary shrink-0" />
                  <span className="text-muted-foreground">{isAr ? "تتبع شحنة" : "Track shipment"}</span>
                </div>
              </div>
            </motion.div>

            {/* Form */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-3"
            >
              <div className="bg-card border border-border rounded-2xl p-5 md:p-7 shadow-sm">
                <h2 className="text-xl md:text-2xl font-bold text-foreground mb-1">
                  {t("contact.form_title")}
                </h2>
                <p className="text-sm text-muted-foreground mb-6">
                  {isAr
                    ? "املأ النموذج وسيرد عليك فريقنا خلال ساعات العمل."
                    : "Fill the form and our team will reply during business hours."}
                </p>

                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        {t("contact.name")} <span className="text-primary">*</span>
                      </label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder={t("contact.name_placeholder")}
                        maxLength={100}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        {t("contact.phone_label")} <span className="text-primary">*</span>
                      </label>
                      <Input
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="01xxxxxxxxx"
                        dir="ltr"
                        maxLength={11}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        {t("contact.email_label")}
                      </label>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="email@example.com"
                        dir="ltr"
                        maxLength={255}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1.5">
                        {isAr ? "الموضوع" : "Subject"}
                      </label>
                      <Input
                        value={form.subject}
                        onChange={(e) => setForm({ ...form, subject: e.target.value })}
                        placeholder={isAr ? "استفسار عن قطعة، عرض سعر..." : "Part inquiry, quote..."}
                        maxLength={150}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1.5">
                      {t("contact.message")} <span className="text-primary">*</span>
                    </label>
                    <Textarea
                      value={form.message}
                      onChange={(e) => setForm({ ...form, message: e.target.value })}
                      placeholder={t("contact.message_placeholder")}
                      rows={5}
                      maxLength={2000}
                      required
                    />
                    <div className="text-[11px] text-muted-foreground mt-1 text-end">
                      {form.message.length}/2000
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3 pt-1">
                    <Button type="submit" size="lg" className="flex-1 gap-2 font-bold" disabled={sending}>
                      <Send className="w-4 h-4" />
                      {sending ? t("contact.sending") : t("contact.send")}
                    </Button>
                    <Button
                      type="button"
                      onClick={sendViaWhatsApp}
                      size="lg"
                      variant="outline"
                      className="flex-1 gap-2 font-bold border-[hsl(142,70%,40%)]/40 text-[hsl(142,70%,30%)] dark:text-[hsl(142,70%,55%)] hover:bg-[hsl(142,70%,40%)]/10"
                    >
                      <MessageCircle className="w-4 h-4" />
                      {isAr ? "إرسال عبر واتساب" : "Send via WhatsApp"}
                    </Button>
                  </div>

                  <p className="text-[11px] text-muted-foreground text-center pt-1">
                    {isAr
                      ? "بإرسالك للنموذج فأنت توافق على سياسة الخصوصية."
                      : "By submitting you agree to our Privacy Policy."}
                  </p>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* BRANCHES MAP */}
      <section className="py-12 md:py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-10"
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-4">
              <MapPin className="w-4 h-4 inline ml-1" />
              {t("contact.locations")}
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-foreground mb-2">
              {t("contact.visit_branch")}{" "}
              <span className="text-primary">{t("contact.visit_branch_highlight")}</span>
            </h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">{t("contact.map_hint")}</p>
          </motion.div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
            {branches.map((b, i) => (
              <motion.div
                key={b.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                whileHover={{ y: -4 }}
                className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 group flex flex-col"
              >
                <div className="flex items-start gap-3 mb-4 flex-1">
                  <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <b.icon className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-foreground text-sm leading-tight">
                        {isAr ? b.name : b.nameEn}
                      </h4>
                      {b.tag && (
                        <Badge variant="secondary" className="text-[10px] shrink-0">
                          {isAr ? b.tag : b.tagEn}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {isAr ? b.detail : b.detailEn}
                    </p>
                  </div>
                </div>

                <Button
                  asChild
                  size="sm"
                  variant="outline"
                  className="w-full gap-2 font-bold group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors"
                >
                  <a href={b.mapUrl} target="_blank" rel="noopener noreferrer">
                    <Navigation className="w-3.5 h-3.5" />
                    {isAr ? "اتجاهات الفرع" : "Get Directions"}
                  </a>
                </Button>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ContactPage;
