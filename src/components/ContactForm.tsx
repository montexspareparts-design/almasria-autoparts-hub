import { motion } from "framer-motion";
import { Send, User, Building2, Phone, Mail, MessageSquare, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { cn } from "@/lib/utils";

// Egyptian phone: starts with 01, 11 digits total
const phoneRegex = /^01[0125][0-9]{8}$/;

const contactSchema = z.object({
  name: z.string().trim().min(2, "الاسم قصير جداً").max(100, "الاسم طويل جداً"),
  company: z.string().trim().max(100).optional(),
  phone: z.string().trim().regex(phoneRegex, "رقم موبايل مصري غير صحيح (يبدأ بـ 01 و11 رقم)"),
  email: z
    .string()
    .trim()
    .max(255)
    .email("بريد إلكتروني غير صحيح")
    .optional()
    .or(z.literal("")),
  message: z.string().trim().min(5, "الرسالة قصيرة جداً").max(1000, "الرسالة طويلة جداً"),
});

type FieldKey = "name" | "company" | "phone" | "email" | "message";

const ContactForm = () => {
  const [form, setForm] = useState({ name: "", company: "", phone: "", email: "", message: "" });
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [isSending, setIsSending] = useState(false);

  const validateField = (key: FieldKey, value: string) => {
    const partial = { ...form, [key]: value };
    const result = contactSchema.safeParse(partial);
    if (result.success) {
      setErrors((p) => ({ ...p, [key]: undefined }));
      return;
    }
    const issue = result.error.issues.find((i) => i.path[0] === key);
    setErrors((p) => ({ ...p, [key]: issue?.message }));
  };

  const handleChange = (key: FieldKey, value: string) => {
    setForm((f) => ({ ...f, [key]: value }));
    if (touched[key]) validateField(key, value);
  };

  const handleBlur = (key: FieldKey) => {
    setTouched((t) => ({ ...t, [key]: true }));
    validateField(key, form[key]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = contactSchema.safeParse(form);
    if (!result.success) {
      const newErrors: Partial<Record<FieldKey, string>> = {};
      result.error.issues.forEach((i) => {
        newErrors[i.path[0] as FieldKey] = i.message;
      });
      setErrors(newErrors);
      setTouched({ name: true, company: true, phone: true, email: true, message: true });
      toast.error("يرجى تصحيح الحقول المظللة بالأحمر");
      return;
    }
    setIsSending(true);
    setTimeout(() => {
      toast.success("تم إرسال رسالتك بنجاح! سنتواصل معك قريبًا.");
      setForm({ name: "", company: "", phone: "", email: "", message: "" });
      setErrors({});
      setTouched({});
      setIsSending(false);
    }, 800);
  };

  const fieldClass = (key: FieldKey) =>
    cn(
      "h-12 ps-10 rounded-xl bg-background/50 transition-all duration-200 text-base",
      "focus:shadow-[0_0_20px_hsl(355_90%_48%/0.1)] focus:border-primary/40",
      errors[key] && touched[key] ? "border-destructive/60 focus:border-destructive" : "border-border/80"
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="bg-card border border-border rounded-2xl p-5 sm:p-6 md:p-8 relative overflow-hidden"
    >
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
            <Send className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-lg text-foreground">أرسل لنا رسالة</h3>
            <p className="text-xs text-muted-foreground">سنرد عليك خلال ساعات العمل</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4" noValidate>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Name */}
            <FieldWrap label="الاسم" required error={touched.name ? errors.name : undefined}>
              <div className="relative">
                <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={form.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  onBlur={() => handleBlur("name")}
                  placeholder="الاسم بالكامل"
                  autoComplete="name"
                  maxLength={100}
                  className={fieldClass("name")}
                />
              </div>
            </FieldWrap>

            {/* Company */}
            <FieldWrap label="الشركة" error={touched.company ? errors.company : undefined}>
              <div className="relative">
                <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={form.company}
                  onChange={(e) => handleChange("company", e.target.value)}
                  onBlur={() => handleBlur("company")}
                  placeholder="اسم الشركة (اختياري)"
                  autoComplete="organization"
                  maxLength={100}
                  className={fieldClass("company")}
                />
              </div>
            </FieldWrap>

            {/* Phone */}
            <FieldWrap label="الموبايل" required error={touched.phone ? errors.phone : undefined}>
              <div className="relative">
                <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={form.phone}
                  onChange={(e) => handleChange("phone", e.target.value.replace(/\D/g, "").slice(0, 11))}
                  onBlur={() => handleBlur("phone")}
                  placeholder="01xxxxxxxxx"
                  type="tel"
                  inputMode="numeric"
                  autoComplete="tel"
                  className={cn(fieldClass("phone"), "font-mono")}
                />
              </div>
            </FieldWrap>

            {/* Email */}
            <FieldWrap label="البريد الإلكتروني" error={touched.email ? errors.email : undefined}>
              <div className="relative">
                <Mail className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                <Input
                  value={form.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                  onBlur={() => handleBlur("email")}
                  placeholder="example@email.com (اختياري)"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  maxLength={255}
                  dir="ltr"
                  className={cn(fieldClass("email"), "text-left")}
                />
              </div>
            </FieldWrap>
          </div>

          {/* Message */}
          <FieldWrap label="الرسالة" required error={touched.message ? errors.message : undefined}>
            <div className="relative">
              <MessageSquare className="absolute right-3 top-3 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Textarea
                value={form.message}
                onChange={(e) => handleChange("message", e.target.value)}
                onBlur={() => handleBlur("message")}
                placeholder="أخبرنا بما تحتاج..."
                rows={4}
                maxLength={1000}
                className={cn(
                  "ps-10 rounded-xl bg-background/50 transition-all duration-200 text-base resize-none",
                  "focus:shadow-[0_0_20px_hsl(355_90%_48%/0.1)] focus:border-primary/40",
                  errors.message && touched.message
                    ? "border-destructive/60 focus:border-destructive"
                    : "border-border/80"
                )}
              />
            </div>
            <div className="flex justify-end mt-1">
              <span className="text-[10px] text-muted-foreground/60">{form.message.length} / 1000</span>
            </div>
          </FieldWrap>

          <Button
            type="submit"
            size="lg"
            className="w-full gap-2.5 text-base font-bold rounded-xl h-12 red-glow group"
            disabled={isSending}
          >
            <motion.div animate={isSending ? { rotate: 360 } : {}} transition={{ duration: 0.8, repeat: isSending ? Infinity : 0 }}>
              <Send className="w-5 h-5" />
            </motion.div>
            {isSending ? "جاري الإرسال..." : "إرسال الرسالة"}
          </Button>
        </form>
      </div>
    </motion.div>
  );
};

// Reusable field wrapper with label + inline error
const FieldWrap = ({
  label,
  required,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  children: React.ReactNode;
}) => (
  <div>
    <Label className="text-sm font-semibold text-foreground mb-1.5 flex items-center gap-1">
      {label}
      {required && <span className="text-destructive">*</span>}
    </Label>
    {children}
    {error && (
      <motion.p
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-1.5 text-xs text-destructive flex items-center gap-1"
      >
        <AlertCircle className="w-3 h-3 shrink-0" />
        {error}
      </motion.p>
    )}
  </div>
);

export default ContactForm;
