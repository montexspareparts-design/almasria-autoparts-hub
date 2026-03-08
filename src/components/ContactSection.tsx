import { motion, AnimatePresence } from "framer-motion";
import { Phone, Mail, MapPin, MessageCircle, Send, Clock } from "lucide-react";
import CarQuiz from "./CarQuiz";
import SpeedometerDashboard from "./SpeedometerDashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(1, "الاسم مطلوب").max(100),
  company: z.string().trim().max(100).optional(),
  phone: z.string().trim().min(1, "رقم الهاتف مطلوب").max(20),
  email: z.string().trim().email("بريد إلكتروني غير صحيح").max(255).optional().or(z.literal("")),
  message: z.string().trim().min(1, "الرسالة مطلوبة").max(1000),
});

const inputVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" as const },
  }),
};

const ContactSection = () => {
  const [form, setForm] = useState({ name: "", company: "", phone: "", email: "", message: "" });
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = contactSchema.safeParse(form);
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }
    setIsSending(true);
    setTimeout(() => {
      toast.success("تم إرسال رسالتك بنجاح! سنتواصل معك قريبًا.");
      setForm({ name: "", company: "", phone: "", email: "", message: "" });
      setIsSending(false);
    }, 800);
  };

  const contactInfo = [
    { icon: Mail, label: "البريد العام", value: "info@almasriaautoparts.com", href: "mailto:info@almasriaautoparts.com" },
    { icon: Mail, label: "بريد المبيعات", value: "sales.team@almasriaautoparts.com", href: "mailto:sales.team@almasriaautoparts.com" },
    { icon: MessageCircle, label: "واتساب بيزنس", value: "01032104861", href: "https://wa.me/201032104861" },
    { icon: Clock, label: "مواعيد العمل", value: "من 9 صباحًا حتى 7 مساءً", href: undefined },
  ];

  const branches = [
    { name: "القاهرة – التوفيقية", detail: "سوق التوفيقية لقطع غيار السيارات", phones: ["01032104861", "01151436999"] },
    { name: "الجيزة – أوسيم", detail: "أوسيم – الجيزة", phones: ["01153961008"] },
    { name: "الأقصر", detail: "صعيد مصر", phones: ["01016177204"] },
    { name: "المكتب الإداري", detail: "اللبيني – الهرم – الجيزة", phones: ["01112365417"] },
    { name: "دبي – الإمارات 🇦🇪", detail: "مركز إقليمي للتوسع الخليجي", phones: [] },
  ];

  return (
    <section id="contact" className="py-20 md:py-28 bg-background overflow-hidden">
      <div className="container mx-auto px-4">
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
            className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-4"
          >
            تواصل معنا
          </motion.span>
          <h2 className="text-3xl md:text-5xl font-black text-foreground mb-4">
            تواصل <span className="text-gradient-red">معنا</span>
          </h2>
          <p className="text-muted-foreground text-lg">اطلب عرض سعر أو تقدم بطلب حساب تاجر</p>
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: "5rem" }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="h-1 bg-primary mx-auto mt-4 rounded-full"
          />
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Form + Lucky Wheel */}
          <div className="space-y-8">
          {/* Form */}
          <motion.form
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, type: "spring", stiffness: 60 }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "الاسم *", key: "name", placeholder: "الاسم بالكامل", i: 0 },
                { label: "الشركة", key: "company", placeholder: "اسم الشركة", i: 1 },
              ].map((field) => (
                <motion.div key={field.key} custom={field.i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={inputVariants}>
                  <label className="text-sm font-medium text-foreground mb-1 block">{field.label}</label>
                  <Input
                    value={form[field.key as keyof typeof form]}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="text-right transition-shadow duration-300 focus:shadow-[0_0_15px_hsl(355_90%_48%/0.15)]"
                  />
                </motion.div>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { label: "الهاتف *", key: "phone", placeholder: "رقم الهاتف", i: 2 },
                { label: "البريد الإلكتروني", key: "email", placeholder: "البريد الإلكتروني", i: 3 },
              ].map((field) => (
                <motion.div key={field.key} custom={field.i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={inputVariants}>
                  <label className="text-sm font-medium text-foreground mb-1 block">{field.label}</label>
                  <Input
                    value={form[field.key as keyof typeof form]}
                    onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="text-right transition-shadow duration-300 focus:shadow-[0_0_15px_hsl(355_90%_48%/0.15)]"
                  />
                </motion.div>
              ))}
            </div>
            <motion.div custom={4} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={inputVariants}>
              <label className="text-sm font-medium text-foreground mb-1 block">الرسالة *</label>
              <Textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="أخبرنا بما تحتاج..."
                rows={5}
                className="text-right transition-shadow duration-300 focus:shadow-[0_0_15px_hsl(355_90%_48%/0.15)]"
              />
            </motion.div>
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
              <Button type="submit" size="lg" className="w-full gap-2 text-lg red-glow group" disabled={isSending}>
                <motion.div animate={isSending ? { rotate: 360 } : {}} transition={{ duration: 0.8, repeat: isSending ? Infinity : 0 }}>
                  <Send className="w-5 h-5 transition-transform group-hover:-translate-x-1 group-hover:-translate-y-1" />
                </motion.div>
                {isSending ? "جاري الإرسال..." : "إرسال الرسالة"}
              </Button>
            </motion.div>
          </motion.form>

          {/* Car Quiz */}
          <CarQuiz />
          <SpeedometerDashboard />
          </div>

          <motion.div
            initial={{ opacity: 0, x: 40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, type: "spring", stiffness: 60 }}
            className="space-y-4"
          >
            {contactInfo.map((c, i) => {
              const Wrapper = c.href ? 'a' : 'div';
              return (
                <motion.div
                  key={c.label}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.1 }}
                  whileHover={{ x: -5, boxShadow: "0 8px 25px hsl(355 90% 48% / 0.08)" }}
                >
                  <Wrapper
                    {...(c.href ? { href: c.href } : {})}
                    className="flex items-center gap-4 bg-card border border-border rounded-lg p-4 transition-all duration-300 hover:border-primary/30 block"
                  >
                    <motion.div
                      className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0"
                      whileHover={{ rotate: [0, -5, 5, 0], scale: 1.1 }}
                      transition={{ duration: 0.4 }}
                    >
                      <c.icon className="w-6 h-6 text-primary" />
                    </motion.div>
                    <div>
                      <div className="text-sm text-muted-foreground">{c.label}</div>
                      <div className="font-bold text-card-foreground">{c.value}</div>
                    </div>
                  </Wrapper>
                </motion.div>
              );
            })}

            {/* Branches */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="bg-secondary text-secondary-foreground rounded-lg p-6"
            >
              <div className="flex items-center gap-3 mb-4">
                <motion.div animate={{ y: [0, -3, 0] }} transition={{ duration: 2, repeat: Infinity }}>
                  <MapPin className="w-6 h-6 text-primary" />
                </motion.div>
                <h4 className="font-bold text-lg">فروعنا</h4>
              </div>
              <div className="space-y-3">
                {branches.map((b, i) => (
                  <motion.div
                    key={b.name}
                    initial={{ opacity: 0, x: 15 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 + i * 0.08 }}
                    whileHover={{ scale: 1.02 }}
                    className="bg-secondary-foreground/10 rounded-md p-4 transition-colors hover:bg-secondary-foreground/15"
                  >
                    <div className="font-bold">{b.name}</div>
                    <div className="text-sm text-secondary-foreground/70">{b.detail}</div>
                    {b.phones.length > 0 && (
                      <div className="flex gap-3 mt-1">
                        {b.phones.map((p) => (
                          <a key={p} href={`tel:${p}`} className="text-sm text-primary hover:underline flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {p}
                          </a>
                        ))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
