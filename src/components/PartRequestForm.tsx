import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Send, MessageCircle, Upload, X, Car, Hash, Calendar, User, Phone, CheckCircle, AlertCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { trackLeadFormSubmit, trackClickWhatsApp } from "@/lib/analytics";
import { cn } from "@/lib/utils";

interface PartRequestFormProps {
  defaultModel?: string;
  compact?: boolean;
}

const toyotaModels = [
  "Hiace", "Coaster", "Hilux", "Land Cruiser", "Land Cruiser 300",
  "Yaris", "RAV4", "Fortuner", "Rush", "Corolla", "Camry",
  "Prado", "Avanza", "Innova", "Prius", "C-HR", "أخرى"
];

const phoneRegex = /^01[0125][0-9]{8}$/;
const currentYear = new Date().getFullYear();

const requestSchema = z.object({
  name: z.string().trim().min(2, "الاسم قصير جداً").max(100, "الاسم طويل جداً"),
  phone: z.string().trim().regex(phoneRegex, "رقم موبايل مصري غير صحيح (يبدأ بـ 01 و11 رقم)"),
  model: z.string().max(50).optional().or(z.literal("")),
  year: z
    .string()
    .optional()
    .refine(
      (v) => !v || (Number(v) >= 1990 && Number(v) <= currentYear + 1),
      `السنة بين 1990 و ${currentYear + 1}`
    ),
  vin: z
    .string()
    .optional()
    .refine((v) => !v || v.length === 17, "رقم الشاسيه يجب أن يكون 17 حرف/رقم"),
  notes: z.string().max(500, "الملاحظات طويلة جداً").optional().or(z.literal("")),
});

type FieldKey = "name" | "phone" | "model" | "year" | "vin" | "notes";

const PartRequestForm = ({ defaultModel, compact }: PartRequestFormProps) => {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    model: defaultModel || "",
    year: "",
    vin: "",
    notes: "",
  });
  const [errors, setErrors] = useState<Partial<Record<FieldKey, string>>>({});
  const [touched, setTouched] = useState<Partial<Record<FieldKey, boolean>>>({});
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const validateField = (key: FieldKey, value: string) => {
    const partial = { ...form, [key]: value };
    const result = requestSchema.safeParse(partial);
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

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("حجم الصورة يجب ألا يتجاوز 5 ميجا");
        return;
      }
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImage(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = requestSchema.safeParse(form);
    if (!result.success) {
      const newErrors: Partial<Record<FieldKey, string>> = {};
      result.error.issues.forEach((i) => {
        newErrors[i.path[0] as FieldKey] = i.message;
      });
      setErrors(newErrors);
      setTouched({ name: true, phone: true, model: true, year: true, vin: true, notes: true });
      toast.error("يرجى تصحيح الحقول المظللة بالأحمر");
      return;
    }
    setSending(true);

    try {
      const { error } = await supabase.from("part_requests" as any).insert({
        name: form.name.trim(),
        phone: form.phone.trim(),
        model: form.model || null,
        year: form.year || null,
        vin: form.vin || null,
        notes: form.notes || null,
      });

      if (error) throw error;

      trackLeadFormSubmit("part_request", form.model);

      setSubmitted(true);
      toast.success("تم إرسال طلبك بنجاح! سنتواصل معك قريبًا.");
      setForm({ name: "", phone: "", model: defaultModel || "", year: "", vin: "", notes: "" });
      setErrors({});
      setTouched({});
      removeImage();

      setTimeout(() => setSubmitted(false), 8000);
    } catch (err) {
      console.error("Error submitting part request:", err);
      toast.error("حدث خطأ أثناء الإرسال. يرجى المحاولة مرة أخرى أو التواصل عبر واتساب.");
    } finally {
      setSending(false);
    }
  };

  const whatsappMessage = encodeURIComponent(
    `مرحبًا، أريد طلب قطعة غيار:\n` +
    `الموديل: ${form.model || "—"}\n` +
    `السنة: ${form.year || "—"}\n` +
    `رقم الشاسيه: ${form.vin || "—"}\n` +
    `ملاحظات: ${form.notes || "—"}`
  );

  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-card border border-primary/20 rounded-2xl p-6 sm:p-8 md:p-10 shadow-lg text-center"
      >
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">تم استلام طلبك بنجاح ✓</h3>
        <p className="text-muted-foreground text-sm mb-6">فريقنا سيتواصل معك خلال ساعات عمل قليلة لتأكيد توفر القطعة والسعر.</p>
        <Button variant="outline" className="gap-2 border-green-500/30 text-green-600 h-12" asChild>
          <a href={`https://wa.me/201153961008?text=${whatsappMessage}`} target="_blank" rel="noopener noreferrer" onClick={() => trackClickWhatsApp("form_success")}>
            <MessageCircle className="w-4 h-4" />
            تواصل عبر واتساب للاستعجال
          </a>
        </Button>
      </motion.div>
    );
  }

  const inputCls = (key: FieldKey, extra?: string) =>
    cn(
      "h-12 ps-10 rounded-xl bg-background/50 text-base transition-all",
      "focus:border-primary/40",
      errors[key] && touched[key] ? "border-destructive/60 focus:border-destructive" : "border-border/80",
      extra
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="bg-card border border-border rounded-2xl p-5 sm:p-6 md:p-8 shadow-lg"
    >
      <div className="text-center mb-6">
        <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">اطلب قطعة الغيار</h3>
        <p className="text-muted-foreground text-sm">أرسل بيانات سيارتك وسنوفر لك القطعة المطلوبة خلال 48 ساعة</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        {/* Name + Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldWrap label="الاسم" required error={touched.name ? errors.name : undefined}>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="اسمك الكامل"
                value={form.name}
                onChange={(e) => handleChange("name", e.target.value)}
                onBlur={() => handleBlur("name")}
                autoComplete="name"
                maxLength={100}
                className={inputCls("name")}
              />
            </div>
          </FieldWrap>

          <FieldWrap label="رقم الموبايل" required error={touched.phone ? errors.phone : undefined}>
            <div className="relative">
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="01xxxxxxxxx"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value.replace(/\D/g, "").slice(0, 11))}
                onBlur={() => handleBlur("phone")}
                className={inputCls("phone", "font-mono")}
              />
            </div>
          </FieldWrap>
        </div>

        {/* Model + Year */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FieldWrap label="الموديل">
            <div className="relative">
              <Car className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none z-10" />
              <select
                value={form.model}
                onChange={(e) => handleChange("model", e.target.value)}
                className="flex h-12 w-full rounded-xl border border-border/80 bg-background/50 ps-10 pe-3 text-base appearance-none focus:outline-none focus:border-primary/40 focus:ring-2 focus:ring-primary/10"
              >
                <option value="">اختر الموديل</option>
                {toyotaModels.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </FieldWrap>

          <FieldWrap label="سنة الصنع" error={touched.year ? errors.year : undefined}>
            <div className="relative">
              <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="مثال: 2022"
                type="number"
                inputMode="numeric"
                min="1990"
                max={currentYear + 1}
                value={form.year}
                onChange={(e) => handleChange("year", e.target.value)}
                onBlur={() => handleBlur("year")}
                className={inputCls("year", "font-mono")}
              />
            </div>
          </FieldWrap>
        </div>

        {/* VIN */}
        <FieldWrap label="رقم الشاسيه (VIN)" error={touched.vin ? errors.vin : undefined}>
          <div className="relative">
            <Hash className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="17 حرف/رقم — يساعدنا في تحديد القطعة بدقة"
              value={form.vin}
              onChange={(e) => handleChange("vin", e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 17))}
              onBlur={() => handleBlur("vin")}
              maxLength={17}
              autoCapitalize="characters"
              className={inputCls("vin", "font-mono tracking-wider")}
            />
          </div>
          {form.vin && (
            <span className="text-[10px] text-muted-foreground/60 mt-1 block text-end">{form.vin.length} / 17</span>
          )}
        </FieldWrap>

        {/* Notes */}
        {!compact && (
          <FieldWrap label="ملاحظات إضافية" error={touched.notes ? errors.notes : undefined}>
            <div className="relative">
              <FileText className="absolute right-3 top-3 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Textarea
                placeholder="اكتب اسم القطعة أو أي تفاصيل إضافية..."
                value={form.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                onBlur={() => handleBlur("notes")}
                maxLength={500}
                rows={3}
                className={cn(
                  "ps-10 rounded-xl bg-background/50 text-base resize-none transition-all",
                  errors.notes && touched.notes
                    ? "border-destructive/60 focus:border-destructive"
                    : "border-border/80 focus:border-primary/40"
                )}
              />
            </div>
            <span className="text-[10px] text-muted-foreground/60 mt-1 block text-end">{form.notes.length} / 500</span>
          </FieldWrap>
        )}

        {/* Image Upload */}
        {!compact && (
          <FieldWrap label="صورة القطعة (اختياري)">
            {imagePreview ? (
              <div className="relative inline-block">
                <img src={imagePreview} alt="معاينة صورة القطعة" className="h-24 w-24 object-cover rounded-lg border border-border" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1 shadow-md"
                  aria-label="حذف الصورة"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-xl py-6 text-center text-muted-foreground hover:border-primary/40 hover:text-primary active:scale-[0.99] transition-all touch-manipulation"
              >
                <Upload className="w-6 h-6 mx-auto mb-1" />
                <span className="text-sm">اضغط لرفع صورة (حد أقصى 5 ميجا)</span>
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
          </FieldWrap>
        )}

        {/* Buttons — stacked on mobile, side-by-side on sm+ */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button type="submit" size="lg" className="flex-1 gap-2 font-bold h-12 rounded-xl" disabled={sending}>
            <Send className="w-4 h-4" />
            {sending ? "جاري الإرسال..." : "اطلب القطعة الآن"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="flex-1 gap-2 font-bold h-12 rounded-xl border-green-500/30 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20"
            asChild
          >
            <a
              href={`https://wa.me/201153961008?text=${whatsappMessage}`}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackClickWhatsApp("part_request_form")}
            >
              <MessageCircle className="w-4 h-4" />
              تحدث عبر واتساب
            </a>
          </Button>
        </div>
      </form>
    </motion.div>
  );
};

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

export default PartRequestForm;
