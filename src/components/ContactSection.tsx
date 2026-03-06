import { motion } from "framer-motion";
import { Phone, Mail, MapPin, MessageCircle, Send } from "lucide-react";
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
            <div className="grid grid-cols-2 gap-4">
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
            <div className="grid grid-cols-2 gap-4">
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
            className="space-y-6"
          >
            {[
              { icon: Phone, label: "الهاتف", value: "+20 123 456 7890", href: "tel:+201234567890" },
              { icon: MessageCircle, label: "واتساب بيزنس", value: "+20 123 456 7890", href: "https://wa.me/201234567890" },
              { icon: Mail, label: "البريد الإلكتروني", value: "info@almasriagroup.com", href: "mailto:info@almasriagroup.com" },
            ].map((c) => (
              <a
                key={c.label}
                href={c.href}
                className="flex items-center gap-4 bg-card border border-border rounded-lg p-5 card-hover block"
              >
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                  <c.icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <div className="text-sm text-muted-foreground">{c.label}</div>
                  <div className="font-bold text-card-foreground">{c.value}</div>
                </div>
              </a>
            ))}

            {/* Locations */}
            <div className="bg-secondary text-secondary-foreground rounded-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <MapPin className="w-6 h-6 text-primary" />
                <h4 className="font-bold text-lg">فروعنا</h4>
              </div>
              <div className="space-y-3">
                <div className="bg-secondary-foreground/10 rounded-md p-4">
                  <div className="font-bold">القاهرة – التوفيقية</div>
                  <div className="text-sm text-secondary-foreground/70">المقر الرئيسي</div>
                </div>
                <div className="bg-secondary-foreground/10 rounded-md p-4">
                  <div className="font-bold">الأقصر</div>
                  <div className="text-sm text-secondary-foreground/70">فرع صعيد مصر</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default ContactSection;
