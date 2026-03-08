import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Send, MessageCircle, Upload, X, Car, Hash, Calendar, User, Phone, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { trackLeadFormSubmit, trackClickWhatsApp } from "@/lib/analytics";

interface PartRequestFormProps {
  defaultModel?: string;
  compact?: boolean;
}

const toyotaModels = [
  "Hiace", "Coaster", "Hilux", "Land Cruiser", "Land Cruiser 300",
  "Yaris", "RAV4", "Fortuner", "Rush", "Corolla", "Camry",
  "Prado", "Avanza", "Innova", "Prius", "C-HR", "أخرى"
];

const PartRequestForm = ({ defaultModel, compact }: PartRequestFormProps) => {
  const [form, setForm] = useState({
    name: "",
    phone: "",
    model: defaultModel || "",
    year: "",
    vin: "",
    notes: "",
  });
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

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
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("يرجى إدخال الاسم ورقم الموبايل");
      return;
    }
    if (form.phone.trim().length < 10) {
      toast.error("رقم الموبايل غير صحيح");
      return;
    }
    setSending(true);

    try {
      // Save to database
      const { error } = await supabase.from("part_requests" as any).insert({
        name: form.name.trim(),
        phone: form.phone.trim(),
        model: form.model || null,
        year: form.year || null,
        vin: form.vin || null,
        notes: form.notes || null,
      });

      if (error) throw error;

      // Track conversion
      trackLeadFormSubmit("part_request", form.model);

      setSubmitted(true);
      toast.success("تم إرسال طلبك بنجاح! سنتواصل معك قريبًا.");
      setForm({ name: "", phone: "", model: defaultModel || "", year: "", vin: "", notes: "" });
      removeImage();

      // Reset success state after 8 seconds
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
        className="bg-card border border-primary/20 rounded-2xl p-8 md:p-10 shadow-lg text-center"
      >
        <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-primary" />
        </div>
        <h3 className="text-xl font-bold text-foreground mb-2">تم استلام طلبك بنجاح ✓</h3>
        <p className="text-muted-foreground text-sm mb-6">فريقنا سيتواصل معك خلال ساعات عمل قليلة لتأكيد توفر القطعة والسعر.</p>
        <Button
          variant="outline"
          className="gap-2 border-green-500/30 text-green-600"
          asChild
        >
          <a href={`https://wa.me/201020412358?text=${whatsappMessage}`} target="_blank" rel="noopener noreferrer" onClick={() => trackClickWhatsApp("form_success")}>
            <MessageCircle className="w-4 h-4" />
            تواصل عبر واتساب للاستعجال
          </a>
        </Button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-lg"
    >
      <div className="text-center mb-6">
        <h3 className="text-xl md:text-2xl font-bold text-foreground mb-2">
          اطلب قطعة الغيار
        </h3>
        <p className="text-muted-foreground text-sm">
          أرسل بيانات سيارتك وسنوفر لك القطعة المطلوبة خلال 48 ساعة
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Name + Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="req-name" className="text-sm font-medium flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-primary" />
              الاسم <span className="text-destructive">*</span>
            </Label>
            <Input
              id="req-name"
              placeholder="اسمك الكامل"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              maxLength={100}
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="req-phone" className="text-sm font-medium flex items-center gap-1.5">
              <Phone className="w-3.5 h-3.5 text-primary" />
              رقم الموبايل <span className="text-destructive">*</span>
            </Label>
            <Input
              id="req-phone"
              placeholder="01xxxxxxxxx"
              type="tel"
              value={form.phone}
              onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
              maxLength={15}
              required
            />
          </div>
        </div>

        {/* Model + Year */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="req-model" className="text-sm font-medium flex items-center gap-1.5">
              <Car className="w-3.5 h-3.5 text-primary" />
              الموديل
            </Label>
            <select
              id="req-model"
              value={form.model}
              onChange={e => setForm(f => ({ ...f, model: e.target.value }))}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">اختر الموديل</option>
              {toyotaModels.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="req-year" className="text-sm font-medium flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-primary" />
              سنة الصنع
            </Label>
            <Input
              id="req-year"
              placeholder="مثال: 2022"
              type="number"
              min="1990"
              max="2026"
              value={form.year}
              onChange={e => setForm(f => ({ ...f, year: e.target.value }))}
            />
          </div>
        </div>

        {/* VIN */}
        <div className="space-y-1.5">
          <Label htmlFor="req-vin" className="text-sm font-medium flex items-center gap-1.5">
            <Hash className="w-3.5 h-3.5 text-primary" />
            رقم الشاسيه (VIN)
          </Label>
          <Input
            id="req-vin"
            placeholder="17 حرف/رقم — يساعدنا في تحديد القطعة المطابقة بدقة"
            value={form.vin}
            onChange={e => setForm(f => ({ ...f, vin: e.target.value.toUpperCase() }))}
            maxLength={17}
            className="font-mono tracking-wider"
          />
        </div>

        {/* Notes */}
        {!compact && (
          <div className="space-y-1.5">
            <Label htmlFor="req-notes" className="text-sm font-medium">ملاحظات إضافية</Label>
            <Textarea
              id="req-notes"
              placeholder="اكتب اسم القطعة أو أي تفاصيل إضافية..."
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              maxLength={500}
              rows={3}
            />
          </div>
        )}

        {/* Image Upload */}
        {!compact && (
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1.5">
              <Upload className="w-3.5 h-3.5 text-primary" />
              صورة القطعة (اختياري)
            </Label>
            {imagePreview ? (
              <div className="relative inline-block">
                <img src={imagePreview} alt="معاينة صورة القطعة المطلوبة" className="h-24 w-24 object-cover rounded-lg border border-border" />
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-0.5"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="w-full border-2 border-dashed border-border rounded-xl py-6 text-center text-muted-foreground hover:border-primary/40 hover:text-primary transition-colors"
              >
                <Upload className="w-6 h-6 mx-auto mb-1" />
                <span className="text-sm">اضغط لرفع صورة (حد أقصى 5 ميجا)</span>
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
          </div>
        )}

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <Button
            type="submit"
            size="lg"
            className="flex-1 gap-2 font-bold"
            disabled={sending}
          >
            <Send className="w-4 h-4" />
            {sending ? "جاري الإرسال..." : "اطلب القطعة الآن"}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="flex-1 gap-2 font-bold border-green-500/30 text-green-600 hover:bg-green-50 dark:hover:bg-green-950/20"
            asChild
          >
            <a
              href={`https://wa.me/201020412358?text=${whatsappMessage}`}
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

export default PartRequestForm;