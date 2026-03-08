import { motion } from "framer-motion";
import { Phone, Mail, MessageCircle, MapPin, Send, Clock } from "lucide-react";
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

              <a href="tel:+201153961008" className="flex items-start gap-4 p-4 bg-card border border-border rounded-xl hover:border-primary/30 transition-colors group">
                <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-foreground mb-1">الهاتف</h3>
                  <p className="text-muted-foreground text-sm" dir="ltr">+20 1153961008</p>
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

              {/* Static Map Placeholder */}
              <div className="rounded-xl border border-border overflow-hidden bg-muted aspect-video flex items-center justify-center relative">
                <MapPin className="w-10 h-10 text-primary/30" />
                <p className="absolute bottom-4 text-xs text-muted-foreground">
                  اللبيني، الجيزة — المقر الإداري
                </p>
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

      <Footer />
    </div>
  );
};

export default ContactPage;
