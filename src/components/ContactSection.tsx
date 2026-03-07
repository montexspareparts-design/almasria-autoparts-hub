import { motion } from "framer-motion";
import { Phone, Mail, MapPin, MessageCircle, Send, Clock } from "lucide-react";
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

const ContactSection = () => {
  const [form, setForm] = useState({ name: "", company: "", phone: "", email: "", message: "" });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = contactSchema.safeParse(form);
    if (!result.success) {
      toast.error(result.error.issues[0].message);
      return;
    }
    toast.success("تم إرسال رسالتك بنجاح! سنتواصل معك قريبًا.");
    setForm({ name: "", company: "", phone: "", email: "", message: "" });
  };

  const branches = [
    { name: "القاهرة – التوفيقية", detail: "سوق التوفيقية لقطع غيار السيارات", phones: ["01032104861", "01151436999"] },
    { name: "الجيزة – أوسيم", detail: "أوسيم – الجيزة", phones: ["01153961008"] },
    { name: "الأقصر", detail: "صعيد مصر", phones: ["01016177204"] },
    { name: "المكتب الإداري", detail: "اللبيني – الهرم – الجيزة", phones: ["01112365417"] },
    { name: "دبي – الإمارات 🇦🇪", detail: "مركز إقليمي للتوسع الخليجي", phones: [] },
  ];

  return (
    <section id="contact" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-black text-foreground mb-4">
            تواصل <span className="text-gradient-red">معنا</span>
          </h2>
          <p className="text-muted-foreground text-lg">اطلب عرض سعر أو تقدم بطلب حساب تاجر</p>
          <div className="w-20 h-1 bg-primary mx-auto mt-4" />
        </motion.div>

        <div className="grid md:grid-cols-2 gap-12">
          {/* Form */}
          <motion.form
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            onSubmit={handleSubmit}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">الاسم *</label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="الاسم بالكامل"
                  className="text-right"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">الشركة</label>
                <Input
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                  placeholder="اسم الشركة"
                  className="text-right"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">الهاتف *</label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="رقم الهاتف"
                  className="text-right"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground mb-1 block">البريد الإلكتروني</label>
                <Input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="البريد الإلكتروني"
                  className="text-right"
                />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">الرسالة *</label>
              <Textarea
                value={form.message}
                onChange={(e) => setForm({ ...form, message: e.target.value })}
                placeholder="أخبرنا بما تحتاج..."
                rows={5}
                className="text-right"
              />
            </div>
            <Button type="submit" size="lg" className="w-full gap-2 text-lg red-glow">
              <Send className="w-5 h-5" />
              إرسال الرسالة
            </Button>
          </motion.form>

          {/* Contact Info */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="space-y-4"
          >
            {[
              { icon: Mail, label: "البريد العام", value: "info@almasriaautoparts.com", href: "mailto:info@almasriaautoparts.com" },
              { icon: Mail, label: "بريد المبيعات", value: "sales.team@almasriaautoparts.com", href: "mailto:sales.team@almasriaautoparts.com" },
              { icon: MessageCircle, label: "واتساب بيزنس", value: "01032104861", href: "https://wa.me/201032104861" },
              { icon: Clock, label: "مواعيد العمل", value: "من 9 صباحًا حتى 7 مساءً", href: undefined },
            ].map((c) => {
              const Wrapper = c.href ? 'a' : 'div';
              return (
                <Wrapper
                  key={c.label}
                  {...(c.href ? { href: c.href } : {})}
                  className="flex items-center gap-4 bg-card border border-border rounded-lg p-4 card-hover block"
                >
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <c.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">{c.label}</div>
                    <div className="font-bold text-card-foreground">{c.value}</div>
                  </div>
                </Wrapper>
              );
            })}

            {/* Branches */}
            <div className="bg-secondary text-secondary-foreground rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <MapPin className="w-6 h-6 text-primary" />
                <h4 className="font-bold text-lg">فروعنا</h4>
              </div>
              <div className="space-y-3">
                {branches.map((b) => (
                  <div key={b.name} className="bg-secondary-foreground/10 rounded-md p-4">
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
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
