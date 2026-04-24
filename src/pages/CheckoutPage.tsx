import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
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
import {
  buildPaymobReturnUrl,
  isValidPaymobPublicKey,
} from "@/lib/paymob";
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

const shippingOptions = [
  { id: "standard", label: "شحن عادي", desc: "3-5 أيام عمل", cost: 50, icon: Truck },
  { id: "express", label: "شحن سريع", desc: "1-2 يوم عمل", cost: 100, icon: Zap },
  { id: "pickup", label: "استلام من الفرع", desc: "القاهرة - المعادي", cost: 0, icon: Store },
];

const paymentMethods = [
  { id: "cod", label: "الدفع عند الاستلام", icon: Banknote },
  { id: "paymob", label: "بطاقات بنكية عبر Paymob", icon: CreditCard },
  { id: "instapay", label: "InstaPay", icon: Smartphone },
  { id: "bank_transfer", label: "تحويل بنكي", icon: Building2 },
  { id: "wallet", label: "محفظة إلكترونية", icon: Wallet },
  { id: "fawry", label: "Fawry", icon: Store },
];

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, subtotal, vat, discount, couponCode, couponDiscount, total, clearCart, setShippingCost } = useCart();
  const { user, loading: authLoading } = useAuth();

  const [shipping, setShipping] = useState("standard");
  const [payment, setPayment] = useState("cod");
  const [submitting, setSubmitting] = useState(false);
  const [paymobClientSecret, setPaymobClientSecret] = useState<string | null>(null);
  const [paymobOrderId, setPaymobOrderId] = useState<string | null>(null);
  const [paymobPublicKey, setPaymobPublicKey] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    governorate: "",
    city: "",
    address: "",
    notes: "",
  });

  const selectedShipping = shippingOptions.find((s) => s.id === shipping)!;
  const orderTotal = total;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const handleShippingChange = (val: string) => {
    setShipping(val);
    const opt = shippingOptions.find((s) => s.id === val);
    setShippingCost(opt?.cost ?? 0);
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
          .from("coupons")
          .select("id")
          .eq("code", couponCode)
          .single();
        if (couponData) {
          await supabase.from("coupon_usage").insert({
            coupon_id: couponData.id,
            user_id: user.id,
            order_id: order.id,
            discount_applied: couponDiscount,
          });
          await supabase
            .from("coupons")
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
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-12">
          <div className="container mx-auto px-4 max-w-lg text-center">
            <h1 className="text-2xl font-black text-foreground mb-6">💳 إتمام الدفع</h1>
            <div className="bg-card border border-border rounded-2xl p-6">
              <PaymobCheckout clientSecret={paymobClientSecret} publicKey={paymobPublicKey} />
            </div>
            <p className="text-xs text-muted-foreground mt-4">أكمل الدفع داخل النافذة، ثم ستعود تلقائياً لصفحة التأكيد.</p>
            {paymobOrderId && (
              <Button variant="outline" className="mt-4" onClick={() => navigate(`/?highlight=${paymobOrderId}`)}>العودة للرئيسية</Button>
            )}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const sectionCard = (delay: number, children: React.ReactNode) => (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, type: "spring", stiffness: 300, damping: 30 }}
      className="relative rounded-2xl bg-card overflow-hidden"
      style={{ boxShadow: '0 1px 3px 0 hsl(var(--border) / 0.6), 0 8px 24px -8px hsl(var(--primary) / 0.06)' }}
    >
      {children}
    </motion.div>
  );

  const sectionHeader = (icon: React.ReactNode, title: string, subtitle: string, stepNum: number) => (
    <div className="relative px-6 py-5 border-b border-border/50">
      {/* Subtle gradient accent */}
      <div className="absolute inset-0 bg-gradient-to-l from-primary/[0.03] via-transparent to-transparent" />
      <div className="relative flex items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center shadow-md">
            {icon}
          </div>
          <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center shadow-sm">{stepNum}</span>
        </div>
        <div>
          <h2 className="text-[15px] font-black text-foreground tracking-tight">{title}</h2>
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-20">
        <div className="container mx-auto px-4 max-w-6xl">

          {/* ── Hero Header ── */}
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-12">
            <Link to="/cart" className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-semibold transition-colors group">
              <ArrowRight className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              العودة للسلة
            </Link>

            <div className="mt-4 flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-secondary to-secondary/80 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-7 h-7 text-secondary-foreground" />
                </div>
                <div>
                  <h1 className="text-3xl md:text-4xl font-black text-foreground tracking-tight">إتمام الطلب</h1>
                  <p className="text-sm text-muted-foreground mt-1">أكمل بياناتك لإنهاء عملية الشراء بأمان</p>
                </div>
              </div>

              {/* Progress Steps - minimal elegant */}
              <div className="flex items-center gap-1 overflow-x-auto">
                {[
                  { n: 1, l: "البيانات" },
                  { n: 2, l: "الشحن" },
                  { n: 3, l: "الدفع" },
                ].map((s, idx) => (
                  <div key={s.n} className="flex items-center gap-1 shrink-0">
                    <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-full bg-card border border-border">
                      <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-black flex items-center justify-center">{s.n}</span>
                      <span className="text-[11px] font-bold text-foreground">{s.l}</span>
                    </div>
                    {idx < 2 && <div className="w-3 sm:w-4 h-px bg-border" />}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
            {/* ── Left Column: Form ── */}
            <div className="lg:col-span-3 space-y-8">

              {/* ─── 1. Shipping Info ─── */}
              {sectionCard(0, <>
                {sectionHeader(
                  <MapPin className="w-5 h-5 text-secondary-foreground" />,
                  "بيانات الشحن",
                  "أدخل عنوان التوصيل",
                  1
                )}
                <div className="p-6 md:p-8">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-5 gap-y-6">
                    {/* Name */}
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <User className="w-3 h-3" /> الاسم الكامل <span className="text-primary">*</span>
                      </Label>
                      <Input
                        value={form.name}
                        onChange={(e) => setForm({ ...form, name: e.target.value })}
                        placeholder="محمد أحمد"
                        className="h-[52px] rounded-xl bg-muted/30 border-transparent focus:bg-card focus:border-primary/50 focus:shadow-sm transition-all text-sm font-medium"
                      />
                    </div>
                    {/* Phone */}
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Phone className="w-3 h-3" /> رقم الهاتف <span className="text-primary">*</span>
                      </Label>
                      <Input
                        value={form.phone}
                        onChange={(e) => setForm({ ...form, phone: e.target.value })}
                        placeholder="01xxxxxxxxx"
                        dir="ltr"
                        className="h-[52px] rounded-xl bg-muted/30 border-transparent focus:bg-card focus:border-primary/50 focus:shadow-sm transition-all text-sm font-medium"
                      />
                    </div>
                    {/* Email */}
                    <div className="sm:col-span-2 space-y-2">
                      <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Mail className="w-3 h-3" /> البريد الإلكتروني
                      </Label>
                      <Input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm({ ...form, email: e.target.value })}
                        placeholder="example@email.com"
                        dir="ltr"
                        className="h-[52px] rounded-xl bg-muted/30 border-transparent focus:bg-card focus:border-primary/50 focus:shadow-sm transition-all text-sm font-medium"
                      />
                    </div>
                    {/* Governorate */}
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <MapPin className="w-3 h-3" /> المحافظة <span className="text-primary">*</span>
                      </Label>
                      <div className="relative">
                        <select
                          value={form.governorate}
                          onChange={(e) => setForm({ ...form, governorate: e.target.value })}
                          className="appearance-none flex h-[52px] w-full rounded-xl bg-muted/30 border-transparent px-4 py-2 text-sm font-medium ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus:bg-card focus:border-primary/50 transition-all"
                        >
                          <option value="">اختر المحافظة</option>
                          {governorates.map((g) => <option key={g} value={g}>{g}</option>)}
                        </select>
                        <ChevronDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
                      </div>
                    </div>
                    {/* City */}
                    <div className="space-y-2">
                      <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">المدينة</Label>
                      <Input
                        value={form.city}
                        onChange={(e) => setForm({ ...form, city: e.target.value })}
                        placeholder="المدينة / الحي"
                        className="h-[52px] rounded-xl bg-muted/30 border-transparent focus:bg-card focus:border-primary/50 focus:shadow-sm transition-all text-sm font-medium"
                      />
                    </div>
                    {/* Address */}
                    <div className="sm:col-span-2 space-y-2">
                      <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <FileText className="w-3 h-3" /> العنوان التفصيلي <span className="text-primary">*</span>
                      </Label>
                      <Input
                        value={form.address}
                        onChange={(e) => setForm({ ...form, address: e.target.value })}
                        placeholder="الشارع - المبنى - الطابق"
                        className="h-[52px] rounded-xl bg-muted/30 border-transparent focus:bg-card focus:border-primary/50 focus:shadow-sm transition-all text-sm font-medium"
                      />
                    </div>
                    {/* Notes */}
                    <div className="sm:col-span-2 space-y-2">
                      <Label className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">ملاحظات</Label>
                      <Textarea
                        value={form.notes}
                        onChange={(e) => setForm({ ...form, notes: e.target.value })}
                        placeholder="ملاحظات إضافية على الطلب..."
                        className="rounded-xl bg-muted/30 border-transparent focus:bg-card focus:border-primary/50 focus:shadow-sm transition-all text-sm font-medium min-h-[90px]"
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              </>)}

              {/* ─── 2. Shipping Method ─── */}
              {sectionCard(0.08, <>
                {sectionHeader(
                  <Truck className="w-5 h-5 text-secondary-foreground" />,
                  "طريقة الشحن",
                  "اختر الأنسب لك",
                  2
                )}
                <div className="p-6 md:p-8">
                  <RadioGroup value={shipping} onValueChange={handleShippingChange} className="space-y-3">
                    {shippingOptions.map((opt) => {
                      const active = shipping === opt.id;
                      return (
                        <label
                          key={opt.id}
                          className={`relative flex items-center justify-between p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                            active
                              ? "border-primary bg-primary/[0.04]"
                              : "border-transparent bg-muted/30 hover:bg-muted/50"
                          }`}
                          style={active ? { boxShadow: '0 0 0 1px hsl(var(--primary) / 0.15), 0 4px 16px -4px hsl(var(--primary) / 0.12)' } : {}}
                        >
                          {active && <div className="absolute top-0 right-0 left-0 h-[2px] rounded-t-2xl bg-gradient-to-l from-primary/60 via-primary to-primary/60" />}
                          <div className="flex items-center gap-4">
                            <RadioGroupItem value={opt.id} className="sr-only" />
                            <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${active ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'}`}>
                              <opt.icon className="w-5 h-5" />
                            </div>
                            <div>
                              <p className="font-bold text-sm text-foreground">{opt.label}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`font-black text-sm ${active ? 'text-primary' : 'text-foreground'}`}>
                              {opt.cost === 0 ? "مجاني" : `${opt.cost} ج.م`}
                            </span>
                            {active && <CheckCircle2 className="w-5 h-5 text-primary" />}
                          </div>
                        </label>
                      );
                    })}
                  </RadioGroup>
                </div>
              </>)}

              {/* ─── 3. Payment Method ─── */}
              {sectionCard(0.16, <>
                {sectionHeader(
                  <CreditCard className="w-5 h-5 text-secondary-foreground" />,
                  "وسيلة الدفع",
                  "جميع المعاملات مؤمنة ومشفرة",
                  3
                )}
                <div className="p-6 md:p-8">
                  <RadioGroup value={payment} onValueChange={setPayment} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {paymentMethods.map((method) => {
                      const active = payment === method.id;
                      return (
                        <label
                          key={method.id}
                          className={`relative flex items-center gap-3.5 p-4 rounded-2xl border-2 cursor-pointer transition-all duration-300 ${
                            active
                              ? "border-primary bg-primary/[0.04]"
                              : "border-transparent bg-muted/30 hover:bg-muted/50"
                          }`}
                          style={active ? { boxShadow: '0 0 0 1px hsl(var(--primary) / 0.15), 0 4px 16px -4px hsl(var(--primary) / 0.12)' } : {}}
                        >
                          <RadioGroupItem value={method.id} className="sr-only" />
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${active ? 'bg-primary text-primary-foreground shadow-md' : 'bg-muted text-muted-foreground'}`}>
                            <method.icon className="w-4.5 h-4.5" />
                          </div>
                          <span className="font-bold text-sm text-foreground flex-1">{method.label}</span>
                          {active && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
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

            {/* ── Right Column: Summary ── */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 300, damping: 30 }}
                className="rounded-2xl overflow-hidden sticky top-24"
                style={{ boxShadow: '0 1px 3px 0 hsl(var(--border) / 0.6), 0 16px 48px -12px hsl(var(--primary) / 0.1)' }}
              >
                {/* Dark premium header */}
                <div className="relative bg-secondary text-secondary-foreground px-6 py-6 overflow-hidden">
                  <div className="absolute inset-0 opacity-[0.07]" style={{
                    backgroundImage: `radial-gradient(circle at 20% 40%, hsl(var(--primary)) 0%, transparent 50%), radial-gradient(circle at 80% 80%, hsl(var(--gold-accent)) 0%, transparent 40%)`
                  }} />
                  <div className="relative flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center border border-primary/20">
                      <Sparkles className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <h2 className="text-lg font-black">ملخص الطلب</h2>
                      <p className="text-xs opacity-60 mt-0.5">{items.length} منتج</p>
                    </div>
                  </div>
                </div>

                <div className="bg-card">
                  {/* Items */}
                  <div className="p-5 space-y-3 max-h-64 overflow-y-auto border-b border-border/50">
                    {items.map((item) => (
                      <div key={item.id} className="flex gap-3.5 items-center">
                        <div className="w-14 h-14 rounded-xl bg-white border border-border/60 overflow-hidden shrink-0 p-1.5 shadow-sm">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name_ar} className="w-full h-full object-contain" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-muted-foreground/20" /></div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-bold truncate text-card-foreground">{item.name_ar}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{item.quantity} × {item.unit_price.toLocaleString("ar-EG")} ج.م</p>
                        </div>
                        <span className="text-[13px] font-black text-foreground whitespace-nowrap">{(item.quantity * item.unit_price).toLocaleString("ar-EG")} ج.م</span>
                      </div>
                    ))}
                  </div>

                  {/* Breakdown */}
                  <div className="px-6 py-5 space-y-3.5 text-sm border-b border-border/50">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">المنتجات</span>
                      <span className="font-bold">{subtotal.toLocaleString("ar-EG")} ج.م</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-green-600 flex items-center gap-1 text-xs font-semibold"><BadgeCheck className="w-3.5 h-3.5" /> خصم</span>
                        <span className="text-green-600 font-bold">- {discount.toLocaleString("ar-EG")} ج.م</span>
                      </div>
                    )}
                    {couponDiscount > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-green-600 flex items-center gap-1 text-xs font-semibold"><BadgeCheck className="w-3.5 h-3.5" /> كوبون ({couponCode})</span>
                        <span className="text-green-600 font-bold">- {couponDiscount.toLocaleString("ar-EG")} ج.م</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">الضريبة (14%)</span>
                      <span className="font-bold">{vat.toLocaleString("ar-EG")} ج.م</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">الشحن</span>
                      <span className="font-bold">{selectedShipping.cost === 0 ? "مجاني ✨" : `${selectedShipping.cost} ج.م`}</span>
                    </div>
                  </div>

                  {/* Grand Total */}
                  <div className="px-6 py-5">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-black text-foreground">الإجمالي</span>
                      <div className="text-left">
                        <motion.span
                          key={orderTotal}
                          initial={{ scale: 1.15, opacity: 0.7 }}
                          animate={{ scale: 1, opacity: 1 }}
                          className="text-3xl font-black text-primary inline-block tracking-tight"
                        >
                          {orderTotal.toLocaleString("ar-EG")}
                        </motion.span>
                        <span className="text-sm font-bold text-primary mr-1">ج.م</span>
                      </div>
                    </div>

                    {/* Security */}
                    <div className="mt-5 flex items-center gap-2.5 text-xs text-muted-foreground bg-muted/30 rounded-xl py-3 px-4 border border-border/50">
                      <Lock className="w-4 h-4 text-green-600 shrink-0" />
                      <span className="font-medium">بياناتك محمية بتشفير SSL 256-bit</span>
                    </div>

                    {/* CTA */}
                    <motion.div whileTap={{ scale: 0.98 }} className="mt-5">
                      <Button
                        className="w-full h-[56px] text-[15px] font-black rounded-xl transition-all duration-300"
                        style={{ boxShadow: '0 4px 14px -3px hsl(var(--primary) / 0.4)' }}
                        size="lg"
                        onClick={handleSubmit}
                        disabled={submitting}
                      >
                        {submitting ? (
                          <><Loader2 className="w-5 h-5 animate-spin ml-2" /> جاري إنشاء الطلب...</>
                        ) : (
                          <><ShieldCheck className="w-5 h-5 ml-2" /> تأكيد الطلب والدفع</>
                        )}
                      </Button>
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
      <Footer />
    </div>
  );
};

export default CheckoutPage;
