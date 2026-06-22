import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Truck, Zap, Store, CreditCard, Banknote, Smartphone, Building2,
  Wallet, ShieldCheck, Package, Loader2, MapPin, User, Phone, Mail, FileText,
  Sparkles, CheckCircle2, Lock, ChevronDown, BadgeCheck
} from "lucide-react";
import PaymobCheckout from "@/components/PaymobCheckout";
import PaymentInstructionsBanner from "@/components/PaymentInstructionsBanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { pushOrderToERP } from "@/lib/erpSync";
import { generateOrderNumber } from "@/lib/orderNumber";
import { notifyNewOrderWhatsApp } from "@/lib/whatsapp";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AuthorizedDistributorBadges from "@/components/AuthorizedDistributorBadges";

const governorates = [
  "القاهرة", "الجيزة", "الإسكندرية", "القليوبية", "الشرقية", "الدقهلية",
  "البحيرة", "المنوفية", "الغربية", "كفر الشيخ", "دمياط", "بورسعيد",
  "الإسماعيلية", "السويس", "شمال سيناء", "جنوب سيناء", "الفيوم", "بني سويف",
  "المنيا", "أسيوط", "سوهاج", "قنا", "الأقصر", "أسوان", "البحر الأحمر",
  "الوادي الجديد", "مطروح",
];

// Arabic governorate → Bosta city name (English) for pricing API
const BOSTA_CITY_MAP: Record<string, string> = {
  "القاهرة": "Cairo", "الجيزة": "Giza", "الإسكندرية": "Alexandria",
  "القليوبية": "Qalyubia", "الشرقية": "Sharqia", "الدقهلية": "Dakahlia",
  "البحيرة": "Beheira", "المنوفية": "Monufia", "الغربية": "Gharbia",
  "كفر الشيخ": "Kafr El Sheikh", "دمياط": "Damietta", "بورسعيد": "Port Said",
  "الإسماعيلية": "Ismailia", "السويس": "Suez", "شمال سيناء": "North Sinai",
  "جنوب سيناء": "South Sinai", "الفيوم": "Fayoum", "بني سويف": "Beni Suef",
  "المنيا": "Minya", "أسيوط": "Assiut", "سوهاج": "Sohag",
  "قنا": "Qena", "الأقصر": "Luxor", "أسوان": "Aswan",
  "البحر الأحمر": "Red Sea", "الوادي الجديد": "New Valley", "مطروح": "Matrouh",
};

const PICKUP_OPTION = { id: "pickup", label: "استلام من الفرع", desc: "القاهرة - المعادي", cost: 0, icon: Store };

const paymentMethods = [
  { id: "cod", label: "الدفع عند الاستلام", icon: Banknote },
  { id: "paymob", label: "بطاقات بنكية عبر Paymob", icon: CreditCard },
  { id: "instapay", label: "InstaPay", icon: Smartphone },
  { id: "bank_transfer", label: "تحويل بنكي", icon: Building2 },
  { id: "wallet", label: "محفظة إلكترونية", icon: Wallet },
  { id: "fawry", label: "Fawry", icon: Store },
];

/**
 * Luxury Checkout — matches Hero theme (Carbon / Gold / Red).
 * Reusable input class for consistent premium feel on dark.
 */
const inputCls =
  "h-[52px] rounded-xl bg-white/[0.04] border border-[hsl(var(--gold)/0.25)] text-white placeholder:text-white/30 focus:bg-white/[0.07] focus:border-[hsl(var(--gold)/0.6)] focus:ring-2 focus:ring-toyota-red/30 transition-all text-sm font-medium";

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, subtotal, discount, couponCode, couponDiscount, total, clearCart, setShippingCost } = useCart();
  const { user, loading: authLoading } = useAuth();

  const [shipping, setShipping] = useState<"bosta" | "pickup">("bosta");
  const [payment, setPayment] = useState("cod");
  const [submitting, setSubmitting] = useState(false);
  const [paymobClientSecret] = useState<string | null>(null);
  const [paymobOrderId] = useState<string | null>(null);
  const [paymobPublicKey] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "", phone: "", email: "", governorate: "", city: "", address: "", notes: "",
  });

  const [bostaFee, setBostaFee] = useState<number | null>(null);
  const [bostaLoading, setBostaLoading] = useState(false);
  const [bostaError, setBostaError] = useState<string | null>(null);

  // Auto-calc Bosta fee whenever governorate changes (or shipping switches to bosta)
  useEffect(() => {
    if (shipping !== "bosta") { setShippingCost(0); return; }
    if (!form.governorate) { setBostaFee(null); setShippingCost(0); return; }
    const dropOffCity = BOSTA_CITY_MAP[form.governorate];
    if (!dropOffCity) { setBostaError("المحافظة غير مدعومة"); setBostaFee(null); return; }
    let cancelled = false;
    setBostaLoading(true); setBostaError(null);
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("bosta-calc-pricing", {
          body: { dropOffCity, cod: payment === "cod" ? total : 0 },
        });
        if (cancelled) return;
        if (error || (data as any)?.error) throw new Error((data as any)?.error || error?.message);
        const fee = Number((data as any)?.fee);
        if (!isFinite(fee) || fee <= 0) throw new Error("لم نتمكن من حساب التكلفة");
        setBostaFee(fee);
        setShippingCost(fee);
      } catch (e: any) {
        if (!cancelled) { setBostaError(e?.message || "فشل حساب الشحن"); setBostaFee(null); setShippingCost(0); }
      } finally {
        if (!cancelled) setBostaLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [shipping, form.governorate, payment, total, setShippingCost]);

  const orderTotal = total;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-carbon">
        <Loader2 className="w-8 h-8 animate-spin text-toyota-red" />
      </div>
    );
  }

  const handleShippingChange = (val: string) => {
    setShipping(val as "bosta" | "pickup");
    if (val === "pickup") setShippingCost(0);
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({ title: "يجب تسجيل الدخول أولاً", variant: "destructive" });
      navigate("/auth");
      return;
    }
    if (!form.name || !form.phone || !form.governorate || !form.address) {
      toast({ title: "يرجى ملء جميع الحقول المطلوبة", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const orderNumber = await generateOrderNumber();
      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          order_number: orderNumber,
          total_amount: orderTotal,
          status: payment !== "cod" ? "awaiting_payment" : "pending",
          payment_method: payment,
          shipping_governorate: form.governorate,
          shipping_address: `${form.name} - ${form.phone}\n${form.city}, ${form.governorate}\n${form.address}`,
          notes: form.notes || null,
          coupon_code: couponCode || null,
          coupon_discount: couponDiscount || 0,
        } as any)
        .select("id")
        .single();
      if (orderErr) throw orderErr;

      const orderItems = items.map((item) => ({
        order_id: order.id,
        product_id: item.id,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.unit_price * item.quantity,
      }));
      const { error: itemsErr } = await supabase.from("order_items").insert(orderItems);
      if (itemsErr) throw itemsErr;

      pushOrderToERP(order.id);
      const paymentUrl = payment !== "cod"
        ? `${window.location.origin}/payment?order_id=${order.id}&amount=${orderTotal}`
        : undefined;
      notifyNewOrderWhatsApp(orderNumber, orderTotal, form.phone, paymentUrl);

      if (couponCode) {
        const { data: couponData } = await supabase
          .from("coupons").select("id").eq("code", couponCode).single();
        if (couponData) {
          await supabase.from("coupon_usage").insert({
            coupon_id: couponData.id,
            user_id: user.id,
            order_id: order.id,
            discount_applied: couponDiscount,
          });
          await supabase.from("coupons")
            .update({ used_count: (couponData as any).used_count + 1 } as any)
            .eq("id", couponData.id);
        }
      }

      clearCart();
      if (payment === "paymob") {
        navigate(`/payment?order_id=${order.id}&amount=${orderTotal}`);
        return;
      }
      toast({ title: "تم تقديم طلبك بنجاح! ✅", description: `رقم الطلب: ${orderNumber}` });
      navigate(`/?highlight=${order.id}`);
    } catch (err: any) {
      console.error(err);
      toast({ title: "حدث خطأ أثناء تقديم الطلب", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (items.length === 0 && !paymobClientSecret) {
    navigate("/cart");
    return null;
  }

  if (paymobClientSecret && paymobPublicKey) {
    return (
      <div className="min-h-screen bg-carbon">
        <Navbar />
        <div className="pt-24 pb-12">
          <div className="container mx-auto px-4 max-w-lg text-center">
            <h1 className="text-2xl font-black text-white mb-6 font-tajawal">💳 إتمام الدفع</h1>
            <div className="bg-card border border-[hsl(var(--gold)/0.3)] rounded-2xl p-6">
              <PaymobCheckout clientSecret={paymobClientSecret} publicKey={paymobPublicKey} />
            </div>
            <p className="text-xs text-soft mt-4">أكمل الدفع داخل النافذة، ثم ستعود تلقائياً لصفحة التأكيد.</p>
            {paymobOrderId && (
              <Button variant="outline" className="mt-4" onClick={() => navigate(`/?highlight=${paymobOrderId}`)}>العودة للرئيسية</Button>
            )}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Premium luxury card wrapper
  const sectionCard = (delay: number, children: React.ReactNode) => (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 300, damping: 30 }}
      className="relative rounded-2xl overflow-hidden bg-gradient-to-br from-[hsl(0_0%_8%)] to-[hsl(0_0%_5%)] border border-white/10 shadow-[0_20px_50px_-20px_hsl(var(--toyota-red)/0.25)]"
    >
      {/* Top gold hairline */}
      <span aria-hidden className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[hsl(var(--gold)/0.5)] to-transparent" />
      {/* Corner brackets */}
      <span aria-hidden className="absolute top-2 left-2 w-3 h-3 border-t border-l border-[hsl(var(--gold)/0.5)]" />
      <span aria-hidden className="absolute top-2 right-2 w-3 h-3 border-t border-r border-[hsl(var(--gold)/0.5)]" />
      <span aria-hidden className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-[hsl(var(--gold)/0.5)]" />
      <span aria-hidden className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-[hsl(var(--gold)/0.5)]" />
      {children}
    </motion.div>
  );

  const sectionHeader = (icon: React.ReactNode, title: string, subtitle: string, stepNum: number) => (
    <div className="relative px-6 py-5 border-b border-[hsl(var(--gold)/0.2)]">
      <div aria-hidden className="absolute inset-0 lux-grid-bg opacity-10" />
      <div aria-hidden className="absolute inset-0 opacity-50" style={{ background: 'radial-gradient(circle at 100% 50%, hsl(var(--toyota-red) / 0.18) 0%, transparent 60%)' }} />
      <div className="relative flex items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-carbon border border-[hsl(var(--gold)/0.4)] flex items-center justify-center shadow-red-glow">
            {icon}
          </div>
          <span className="absolute -top-1.5 -right-1.5 w-6 h-6 rounded-full bg-toyota-red text-white text-[11px] font-black flex items-center justify-center shadow-[0_0_10px_hsl(var(--toyota-red)/0.7)] border border-[hsl(var(--gold)/0.5)]">{stepNum}</span>
        </div>
        <div>
          <h2 className="font-tajawal text-base font-black text-white tracking-tight">{title}</h2>
          <p className="text-[11px] text-gold/80 mt-1 font-display tracking-[0.15em] uppercase">{subtitle}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-carbon relative overflow-hidden">
      {/* Animated grid + ambient */}
      <div aria-hidden className="absolute inset-0 lux-grid-bg animate-lux-grid-pan opacity-25 pointer-events-none" />
      <div aria-hidden className="absolute inset-0 opacity-40 pointer-events-none" style={{ background: "radial-gradient(ellipse 70% 50% at 50% 15%, hsl(353 92% 48% / 0.18) 0%, transparent 60%)" }} />
      <div aria-hidden className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at center, transparent 50%, hsl(0 0% 0% / 0.65) 100%)" }} />
      <div className="absolute top-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-toyota-red to-transparent opacity-80" />

      <Navbar />
      <div className="relative pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-6xl">

          {/* ── Hero Header ── */}
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-10">
            <Link to="/cart" className="inline-flex items-center gap-1.5 text-sm text-gold hover:text-white font-tajawal font-bold transition-colors group">
              <ArrowRight className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              العودة للسلة
            </Link>

            <div className="mt-5 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="relative w-14 h-14 rounded-2xl bg-carbon border border-[hsl(var(--gold)/0.5)] flex items-center justify-center shadow-red-glow">
                  <Sparkles className="w-7 h-7 text-gold" />
                </div>
                <div>
                  <h1 className="font-tajawal text-3xl md:text-4xl font-black text-white tracking-tight">
                    إتمام <span className="text-toyota-red">الطلب</span>
                  </h1>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="h-px w-8 bg-gradient-to-l from-transparent to-toyota-red/70" />
                    <p className="text-xs text-soft font-tajawal tracking-wide">أكمل بياناتك لإنهاء عملية الشراء بأمان</p>
                  </div>
                </div>
              </div>

              {/* Progress Steps */}
              <div className="flex items-center gap-1 overflow-x-auto">
                {[
                  { n: 1, l: "البيانات" },
                  { n: 2, l: "الشحن" },
                  { n: 3, l: "الدفع" },
                ].map((s, idx) => (
                  <div key={s.n} className="flex items-center gap-1 shrink-0">
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-carbon border border-[hsl(var(--gold)/0.35)]">
                      <span className="w-5 h-5 rounded-full bg-toyota-red text-white text-[10px] font-black flex items-center justify-center shadow-red-glow">{s.n}</span>
                      <span className="text-[11px] font-bold text-white font-tajawal">{s.l}</span>
                    </div>
                    {idx < 2 && <div className="w-4 h-px bg-gradient-to-r from-gold/40 to-transparent" />}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* ── Left: Form ── */}
            <div className="lg:col-span-3 space-y-6">

              {/* 1. Shipping Info */}
              {sectionCard(0, <>
                {sectionHeader(<MapPin className="w-5 h-5 text-gold" />, "بيانات الشحن", "أدخل عنوان التوصيل", 1)}
                <div className="p-6 md:p-7">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-5">
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-gold/80 uppercase tracking-wider flex items-center gap-1.5 font-display">
                        <User className="w-3 h-3" /> الاسم الكامل <span className="text-toyota-red">*</span>
                      </Label>
                      <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="محمد أحمد" className={inputCls} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-gold/80 uppercase tracking-wider flex items-center gap-1.5 font-display">
                        <Phone className="w-3 h-3" /> رقم الهاتف <span className="text-toyota-red">*</span>
                      </Label>
                      <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01xxxxxxxxx" dir="ltr" className={inputCls} />
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <Label className="text-[11px] font-bold text-gold/80 uppercase tracking-wider flex items-center gap-1.5 font-display">
                        <Mail className="w-3 h-3" /> البريد الإلكتروني
                      </Label>
                      <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="example@email.com" dir="ltr" className={inputCls} />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-gold/80 uppercase tracking-wider flex items-center gap-1.5 font-display">
                        <MapPin className="w-3 h-3" /> المحافظة <span className="text-toyota-red">*</span>
                      </Label>
                      <div className="relative">
                        <select
                          value={form.governorate}
                          onChange={(e) => setForm({ ...form, governorate: e.target.value })}
                          className={`appearance-none flex w-full px-4 py-2 ${inputCls}`}
                        >
                          <option value="" className="bg-carbon">اختر المحافظة</option>
                          {governorates.map((g) => <option key={g} value={g} className="bg-carbon">{g}</option>)}
                        </select>
                        <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gold/70 pointer-events-none" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-gold/80 uppercase tracking-wider font-display">المدينة</Label>
                      <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="المدينة / الحي" className={inputCls} />
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <Label className="text-[11px] font-bold text-gold/80 uppercase tracking-wider flex items-center gap-1.5 font-display">
                        <FileText className="w-3 h-3" /> العنوان التفصيلي <span className="text-toyota-red">*</span>
                      </Label>
                      <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="الشارع - المبنى - الطابق - الشقة" className={inputCls} />
                    </div>
                    <div className="sm:col-span-2 space-y-2">
                      <Label className="text-[11px] font-bold text-gold/80 uppercase tracking-wider font-display">ملاحظات</Label>
                      <Textarea
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        placeholder="ملاحظات إضافية على الطلب..."
                        className={`${inputCls} h-auto min-h-[90px] py-3`}
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              </>)}

              {/* 2. Shipping Method */}
              {sectionCard(0.08, <>
                {sectionHeader(<Truck className="w-5 h-5 text-gold" />, "طريقة الشحن", "اختر الأنسب لك", 2)}
                <div className="p-6 md:p-7">
                  <RadioGroup value={shipping} onValueChange={handleShippingChange} className="space-y-3">
                    {[
                      {
                        id: "bosta" as const,
                        label: "شحن للمنزل عبر Bosta",
                        desc: form.governorate
                          ? (bostaLoading ? "جاري حساب التكلفة..." : (bostaError || `التوصيل إلى ${form.governorate}`))
                          : "اختر المحافظة لحساب التكلفة",
                        cost: bostaFee,
                        icon: Truck,
                      },
                      { id: PICKUP_OPTION.id as "pickup", label: PICKUP_OPTION.label, desc: PICKUP_OPTION.desc, cost: 0, icon: PICKUP_OPTION.icon },
                    ].map((opt) => {
                      const active = shipping === opt.id;
                      const isBostaPending = opt.id === "bosta" && (bostaLoading || opt.cost == null);
                      return (
                        <label
                          key={opt.id}
                          className={`relative flex items-center justify-between p-4 rounded-2xl border cursor-pointer transition-all duration-300 ${
                            active
                              ? "border-[hsl(var(--gold)/0.6)] bg-toyota-red/10 shadow-[0_0_20px_-5px_hsl(var(--toyota-red)/0.5)]"
                              : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20"
                          }`}
                        >
                          {active && <div aria-hidden className="absolute top-0 right-0 left-0 h-[2px] rounded-t-2xl bg-gradient-to-r from-transparent via-gold to-transparent" />}
                          <div className="flex items-center gap-4">
                            <RadioGroupItem value={opt.id} className="sr-only" />
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-all ${active ? 'bg-toyota-red text-white shadow-red-glow' : 'bg-white/5 text-white/60'}`}>
                              <opt.icon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-tajawal font-bold text-sm text-white">{opt.label}</p>
                              <p className="text-xs text-soft mt-0.5">{opt.desc}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-black text-sm ${active ? 'text-toyota-red' : 'text-white'}`}>
                              {opt.cost === 0 ? "مجاني" : isBostaPending ? "—" : `${opt.cost} ج.م`}
                            </span>
                            {active && !isBostaPending && <CheckCircle2 className="w-5 h-5 text-gold" />}
                            {isBostaPending && active && <Loader2 className="w-4 h-4 text-gold animate-spin" />}
                          </div>
                        </label>
                      );
                    })}
                  </RadioGroup>
                </div>
              </>)}

              {/* 3. Payment Method */}
              {sectionCard(0.16, <>
                {sectionHeader(<CreditCard className="w-5 h-5 text-gold" />, "وسيلة الدفع", "جميع المعاملات مؤمنة ومشفرة", 3)}
                <div className="p-6 md:p-7">
                  <RadioGroup value={payment} onValueChange={setPayment} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {paymentMethods.map((method) => {
                      const active = payment === method.id;
                      return (
                        <label
                          key={method.id}
                          className={`relative flex items-center gap-3.5 p-4 rounded-2xl border cursor-pointer transition-all duration-300 ${
                            active
                              ? "border-[hsl(var(--gold)/0.6)] bg-toyota-red/10 shadow-[0_0_20px_-5px_hsl(var(--toyota-red)/0.5)]"
                              : "border-white/10 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20"
                          }`}
                        >
                          <RadioGroupItem value={method.id} className="sr-only" />
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${active ? 'bg-toyota-red text-white shadow-red-glow' : 'bg-white/5 text-white/60'}`}>
                            <method.icon className="w-4 h-4" />
                          </div>
                          <span className="font-tajawal font-bold text-sm text-white flex-1">{method.label}</span>
                          {active && <CheckCircle2 className="w-5 h-5 text-gold shrink-0" />}
                        </label>
                      );
                    })}
                  </RadioGroup>
                  {["instapay", "wallet", "bank_transfer"].includes(payment) && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-5">
                      <PaymentInstructionsBanner
                        paymentMethod={payment}
                        orderNumber="(سيتم تحديده بعد التأكيد)"
                        totalAmount={orderTotal}
                        compact
                      />
                    </motion.div>
                  )}
                </div>
              </>)}
            </div>

            {/* ── Right: Summary ── */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 30 }}
                className="relative rounded-2xl overflow-hidden sticky top-24 border border-[hsl(var(--gold)/0.4)] shadow-[0_30px_60px_-20px_hsl(var(--toyota-red)/0.4)]"
              >
                {/* Corner brackets */}
                <span aria-hidden className="pointer-events-none absolute top-2 left-2 w-4 h-4 border-t border-l border-[hsl(var(--gold)/0.7)] z-20" />
                <span aria-hidden className="pointer-events-none absolute top-2 right-2 w-4 h-4 border-t border-r border-[hsl(var(--gold)/0.7)] z-20" />
                <span aria-hidden className="pointer-events-none absolute bottom-2 left-2 w-4 h-4 border-b border-l border-[hsl(var(--gold)/0.7)] z-20" />
                <span aria-hidden className="pointer-events-none absolute bottom-2 right-2 w-4 h-4 border-b border-r border-[hsl(var(--gold)/0.7)] z-20" />

                {/* Dark premium header */}
                <div className="relative bg-carbon text-white px-6 py-5 border-b border-[hsl(var(--gold)/0.3)] overflow-hidden">
                  <div aria-hidden className="absolute inset-0 lux-grid-bg opacity-20" />
                  <div aria-hidden className="absolute inset-0 opacity-70" style={{ background: 'radial-gradient(circle at 30% 50%, hsl(var(--toyota-red) / 0.25) 0%, transparent 60%)' }} />
                  <div className="relative flex items-center gap-3">
                    <div className="w-11 h-11 rounded-2xl bg-toyota-red/20 border border-[hsl(var(--gold)/0.5)] flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-gold" />
                    </div>
                    <div>
                      <h2 className="font-tajawal text-base font-black tracking-wide">ملخص الطلب</h2>
                      <p className="text-[11px] text-gold/80 mt-0.5 font-display tracking-[0.2em] uppercase">{items.length} ITEM</p>
                    </div>
                  </div>
                </div>

                <div className="relative bg-gradient-to-br from-[hsl(0_0%_8%)] to-[hsl(0_0%_5%)]">
                  {/* Items */}
                  <div className="p-5 space-y-3 max-h-64 overflow-y-auto border-b border-[hsl(var(--gold)/0.2)]">
                    {items.map((item) => (
                      <div key={item.id} className="flex gap-3.5 items-center">
                        <div className="w-14 h-14 rounded-xl bg-white border border-[hsl(var(--gold)/0.3)] overflow-hidden shrink-0 p-1.5 shadow-sm">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name_ar} className="w-full h-full object-contain" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-muted-foreground/30" /></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold truncate text-white font-tajawal">{item.name_ar}</p>
                          <p className="text-[11px] text-soft mt-0.5">
                            <span className="text-gold font-bold">{item.quantity}×</span> {item.unit_price.toLocaleString("ar-EG")} ج.م
                          </p>
                        </div>
                        <span className="text-[13px] font-black text-white whitespace-nowrap">
                          {(item.quantity * item.unit_price).toLocaleString("ar-EG")} <span className="text-[10px] text-gold">ج.م</span>
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Breakdown */}
                  <div className="px-6 py-5 space-y-3.5 text-sm border-b border-[hsl(var(--gold)/0.2)] font-tajawal">
                    <div className="flex justify-between items-center">
                      <span className="text-soft">المنتجات</span>
                      <span className="font-bold text-white">{subtotal.toLocaleString("ar-EG")} ج.م</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-green-400 flex items-center gap-1 text-xs font-semibold"><BadgeCheck className="w-3.5 h-3.5" /> خصم</span>
                        <span className="text-green-400 font-bold">- {discount.toLocaleString("ar-EG")} ج.م</span>
                      </div>
                    )}
                    {couponDiscount > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-green-400 flex items-center gap-1 text-xs font-semibold"><BadgeCheck className="w-3.5 h-3.5" /> كوبون ({couponCode})</span>
                        <span className="text-green-400 font-bold">- {couponDiscount.toLocaleString("ar-EG")} ج.م</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-soft">الشحن</span>
                      <span className="font-bold text-white/90">{shipping === "pickup" ? "مجاني ✨" : (bostaLoading ? "جاري الحساب..." : bostaFee != null ? `${bostaFee} ج.م` : "—")}</span>
                    </div>
                  </div>

                  {/* Grand Total */}
                  <div className="px-6 py-5">
                    <div className="flex items-center gap-3 mb-4">
                      <span className="flex-1 h-px bg-gradient-to-l from-transparent to-[hsl(var(--gold)/0.4)]" />
                      <span className="w-1.5 h-1.5 rounded-full bg-toyota-red shadow-red-glow" />
                      <span className="flex-1 h-px bg-gradient-to-r from-transparent to-[hsl(var(--gold)/0.4)]" />
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="font-tajawal text-lg font-black text-white">الإجمالي</span>
                      <div className="text-left">
                        <motion.span
                          key={orderTotal}
                          initial={{ scale: 1.15, opacity: 0.7 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="text-3xl font-black text-toyota-red inline-block font-display tracking-tight"
                          style={{ textShadow: "0 0 18px hsl(var(--toyota-red) / 0.55)" }}
                        >
                          {orderTotal.toLocaleString("ar-EG")}
                        </motion.span>
                        <span className="text-sm font-bold text-gold mr-1">ج.م</span>
                      </div>
                    </div>

                    {/* Security */}
                    <div className="mt-5 flex items-center gap-2.5 text-xs bg-white/[0.04] rounded-xl py-3 px-4 border border-[hsl(var(--gold)/0.25)]">
                      <Lock className="w-4 h-4 text-green-400 shrink-0" />
                      <span className="font-medium text-white/80">بياناتك محمية بتشفير <span className="text-gold font-bold">SSL 256-bit</span></span>
                    </div>

                    {/* CTA — Hero-style shimmer */}
                    <motion.div whileTap={{ scale: 0.98 }} className="mt-5">
                      <button
                        disabled={submitting}
                        onClick={handleSubmit}
                        className="group relative w-full h-14 rounded-xl bg-toyota-red text-white font-tajawal font-black text-base overflow-hidden animate-lux-red-pulse transition-all duration-300 hover:scale-[1.01] disabled:opacity-60 disabled:cursor-not-allowed disabled:animate-none flex items-center justify-center gap-2 border border-[hsl(var(--gold)/0.45)]"
                      >
                        <span aria-hidden className="absolute inset-y-0 -inset-x-4 bg-gradient-to-r from-transparent via-white/35 to-transparent animate-lux-shimmer-sweep pointer-events-none" style={{ width: "40%" }} />
                        {submitting ? (
                          <><Loader2 className="relative w-5 h-5 animate-spin" /> <span className="relative">جاري إنشاء الطلب...</span></>
                        ) : (
                          <><ShieldCheck className="relative w-5 h-5" /> <span className="relative">تأكيد الطلب والدفع</span></>
                        )}
                        <span aria-hidden className="absolute inset-0 rounded-xl ring-1 ring-white/25 pointer-events-none" />
                      </button>
                    </motion.div>

                    {/* Authorized Distributor Trust Badges */}
                    <div className="mt-6">
                      <AuthorizedDistributorBadges variant="full" />
                    </div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom red hairline */}
      <div className="absolute bottom-0 inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-toyota-red to-transparent opacity-80" />
      <Footer />
    </div>
  );
};

export default CheckoutPage;
