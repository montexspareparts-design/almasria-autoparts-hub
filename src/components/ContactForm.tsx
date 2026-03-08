import { motion } from "framer-motion";
import { Send } from "lucide-react";
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
  hidden: { opacity: 0, y: 15 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: "easeOut" as const },
  }),
};

const ContactForm = () => {
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

  const fields = [
    { label: "الاسم *", key: "name", placeholder: "الاسم بالكامل" },
    { label: "الشركة", key: "company", placeholder: "اسم الشركة (اختياري)" },
    { label: "الهاتف *", key: "phone", placeholder: "رقم الهاتف" },
    { label: "البريد الإلكتروني", key: "email", placeholder: "البريد الإلكتروني (اختياري)" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="bg-card border border-border rounded-2xl p-6 md:p-8 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Send className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">أرسل لنا رسالة</h3>
            <p className="text-xs text-muted-foreground">سنرد عليك خلال ساعات العمل</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map((field, i) => (
              <motion.div key={field.key} custom={i} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={inputVariants}>
                <label className="text-sm font-semibold text-foreground mb-1.5 block">{field.label}</label>
                <Input
                  value={form[field.key as keyof typeof form]}
                  onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                  placeholder={field.placeholder}
                  className="text-right h-11 rounded-xl border-border/80 bg-background/50 transition-all duration-300 focus:shadow-[0_0_20px_hsl(355_90%_48%/0.1)] focus:border-primary/40"
                />
              </motion.div>
            ))}
          </div>

          <motion.div custom={4} initial="hidden" whileInView="visible" viewport={{ once: true }} variants={inputVariants}>
            <label className="text-sm font-semibold text-foreground mb-1.5 block">الرسالة *</label>
            <Textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
              placeholder="أخبرنا بما تحتاج..."
              rows={4}
              className="text-right rounded-xl border-border/80 bg-background/50 transition-all duration-300 focus:shadow-[0_0_20px_hsl(355_90%_48%/0.1)] focus:border-primary/40 resize-none"
            />
          </motion.div>

          <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}>
            <Button type="submit" size="lg" className="w-full gap-2.5 text-base font-bold rounded-xl h-12 red-glow group" disabled={isSending}>
              <motion.div animate={isSending ? { rotate: 360 } : {}} transition={{ duration: 0.8, repeat: isSending ? Infinity : 0 }}>
                <Send className="w-5 h-5 transition-transform group-hover:-translate-x-1 group-hover:-translate-y-1" />
              </motion.div>
              {isSending ? "جاري الإرسال..." : "إرسال الرسالة"}
            </Button>
          </motion.div>
        </form>
      </div>
    </motion.div>
  );
};

export default ContactForm;
