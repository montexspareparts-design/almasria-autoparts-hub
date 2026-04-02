import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Truck, Zap, Store, CreditCard, Banknote, Smartphone, Building2,
  Wallet, ShieldCheck, Package, Loader2, MapPin, User, Phone, Mail, FileText,
  Sparkles, CheckCircle2, Lock
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

const stepIndicator = [
  { num: 1, label: "بيانات الشحن" },
  { num: 2, label: "طريقة الشحن" },
  { num: 3, label: "وسيلة الدفع" },
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
              <Button variant="outline" className="mt-4" onClick={() => navigate(`/?highlight=${paymobOrderId}`)}>
                العودة للرئيسية
              </Button>
            )}
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-6xl">

          {/* Luxury Header */}
          <motion.div initial={{ y: -15, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-10">
            <Link to="/cart" className="inline-flex items-center gap-1.5 text-sm text-primary hover:text-primary/80 font-semibold transition-colors group mb-4">
              <ArrowRight className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              العودة للسلة
            </Link>

            <div className="flex items-center gap-3 mt-2">
              <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-3xl font-black text-foreground">إتمام الطلب</h1>
                <p className="text-sm text-muted-foreground mt-0.5">خطوة واحدة لإكمال طلبك</p>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-1">
              {stepIndicator.map((step, idx) => (
                <div key={step.num} className="flex items-center gap-2">
                  <div className="flex items-center gap-2 bg-card border border-border rounded-full px-4 py-2">
                    <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">{step.num}</span>
                    <span className="text-xs font-semibold text-foreground whitespace-nowrap">{step.label}</span>
                  </div>
                  {idx < stepIndicator.length - 1 && <div className="w-6 h-px bg-border hidden sm:block" />}
                </div>
              ))}
            </div>
          </motion.div>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Form Column */}
            <div className="lg:col-span-3 space-y-6">

              {/* Shipping Info - Luxury Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                <div className="bg-secondary text-secondary-foreground px-6 py-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
                    <MapPin className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold">بيانات الشحن</h2>
                    <p className="text-xs opacity-60">أدخل بيانات التوصيل الخاصة بك</p>
                  </div>
                </div>

                <div className="bg-card p-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                        <User className="w-3.5 h-3.5" /> الاسم الكامل *
                      </Label>
                      <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="محمد أحمد" className="h-12 rounded-xl border-border/80 focus:border-primary" />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                        <Phone className="w-3.5 h-3.5" /> رقم الهاتف *
                      </Label>
                      <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01xxxxxxxxx" className="h-12 rounded-xl border-border/80 focus:border-primary" dir="ltr" />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                        <Mail className="w-3.5 h-3.5" /> البريد الإلكتروني
                      </Label>
                      <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="example@email.com" className="h-12 rounded-xl border-border/80 focus:border-primary" dir="ltr" />
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                        <MapPin className="w-3.5 h-3.5" /> المحافظة *
                      </Label>
                      <select
                        value={form.governorate}
                        onChange={(e) => setForm({ ...form, governorate: e.target.value })}
                        className="flex h-12 w-full rounded-xl border border-border/80 bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="">اختر المحافظة</option>
                        {governorates.map((g) => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <Label className="text-xs font-semibold text-muted-foreground mb-2 block">المدينة</Label>
                      <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="المدينة / الحي" className="h-12 rounded-xl border-border/80 focus:border-primary" />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5 mb-2">
                        <FileText className="w-3.5 h-3.5" /> العنوان التفصيلي *
                      </Label>
                      <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="الشارع - المبنى - الطابق" className="h-12 rounded-xl border-border/80 focus:border-primary" />
                    </div>
                    <div className="sm:col-span-2">
                      <Label className="text-xs font-semibold text-muted-foreground mb-2 block">ملاحظات</Label>
                      <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="ملاحظات إضافية على الطلب..." className="rounded-xl border-border/80 focus:border-primary min-h-[80px]" rows={3} />
                    </div>
                  </div>
                </div>
              </motion.div>

              {/* Shipping Method */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                <div className="bg-secondary text-secondary-foreground px-6 py-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Truck className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold">طريقة الشحن</h2>
                    <p className="text-xs opacity-60">اختر طريقة التوصيل المناسبة</p>
                  </div>
                </div>

                <div className="bg-card p-6">
                  <RadioGroup value={shipping} onValueChange={handleShippingChange} className="space-y-3">
                    {shippingOptions.map((opt) => (
                      <label
                        key={opt.id}
                        className={`flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                          shipping === opt.id
                            ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                            : "border-border hover:border-primary/30 hover:bg-muted/30"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <RadioGroupItem value={opt.id} />
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${shipping === opt.id ? 'bg-primary/10' : 'bg-muted'}`}>
                            <opt.icon className={`w-5 h-5 ${shipping === opt.id ? 'text-primary' : 'text-muted-foreground'}`} />
                          </div>
                          <div>
                            <p className="font-bold text-sm">{opt.label}</p>
                            <p className="text-xs text-muted-foreground">{opt.desc}</p>
                          </div>
                        </div>
                        <span className={`font-black text-sm ${shipping === opt.id ? 'text-primary' : 'text-foreground'}`}>
                          {opt.cost === 0 ? "مجاني" : `${opt.cost} ج.م`}
                        </span>
                      </label>
                    ))}
                  </RadioGroup>
                </div>
              </motion.div>

              {/* Payment Method */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow duration-300"
              >
                <div className="bg-secondary text-secondary-foreground px-6 py-4 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
                    <Wallet className="w-5 h-5 text-primary-foreground" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold">وسيلة الدفع</h2>
                    <p className="text-xs opacity-60">اختر طريقة الدفع المفضلة</p>
                  </div>
                </div>

                <div className="bg-card p-6">
                  <RadioGroup value={payment} onValueChange={setPayment} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {paymentMethods.map((method) => (
                      <label
                        key={method.id}
                        className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all duration-300 ${
                          payment === method.id
                            ? "border-primary bg-primary/5 shadow-sm shadow-primary/10"
                            : "border-border hover:border-primary/30 hover:bg-muted/30"
                        }`}
                      >
                        <RadioGroupItem value={method.id} />
                        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${payment === method.id ? 'bg-primary/10' : 'bg-muted'}`}>
                          <method.icon className={`w-4 h-4 ${payment === method.id ? 'text-primary' : 'text-muted-foreground'}`} />
                        </div>
                        <span className="font-semibold text-sm">{method.label}</span>
                      </label>
                    ))}
                  </RadioGroup>
                  {["instapay", "wallet", "bank_transfer"].includes(payment) && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
                      <PaymentInstructionsBanner
                        paymentMethod={payment}
                        orderNumber="(سيتم تحديده بعد التأكيد)"
                        totalAmount={orderTotal}
                        compact
                      />
                    </motion.div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Summary Sidebar */}
            <div className="lg:col-span-2">
              <motion.div
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="rounded-2xl overflow-hidden sticky top-24 border border-border shadow-lg shadow-primary/5"
              >
                {/* Premium Header */}
                <div className="relative bg-secondary text-secondary-foreground px-6 py-5">
                  <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 30% 50%, hsl(var(--primary)) 0%, transparent 60%)' }} />
                  <div className="relative flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center">
                      <Sparkles className="w-5 h-5 text-primary-foreground" />
                    </div>
                    <div>
                      <h2 className="text-base font-bold">ملخص الطلب</h2>
                      <p className="text-xs opacity-70 mt-0.5">{items.length} منتج</p>
                    </div>
                  </div>
                </div>

                <div className="bg-card p-6">
                  {/* Items preview */}
                  <div className="space-y-3 max-h-64 overflow-y-auto mb-5 pr-1">
                    {items.map((item) => (
                      <div key={item.id} className="flex gap-3 items-center group">
                        <div className="w-14 h-14 rounded-xl bg-white border border-border overflow-hidden shrink-0 p-1.5">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name_ar} className="w-full h-full object-contain" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-5 h-5 text-muted-foreground/20" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate text-card-foreground">{item.name_ar}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{item.quantity} × {item.unit_price.toLocaleString("ar-EG")} ج.م</p>
                        </div>
                        <span className="text-xs font-black text-foreground">{(item.quantity * item.unit_price).toLocaleString("ar-EG")} ج.م</span>
                      </div>
                    ))}
                  </div>

                  {/* Breakdown */}
                  <div className="border-t border-border pt-4 space-y-3 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">المنتجات</span>
                      <span className="font-bold">{subtotal.toLocaleString("ar-EG")} ج.م</span>
                    </div>
                    {discount > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> خصم</span>
                        <span className="text-green-600 font-bold">- {discount.toLocaleString("ar-EG")} ج.م</span>
                      </div>
                    )}
                    {couponDiscount > 0 && (
                      <div className="flex justify-between items-center">
                        <span className="text-green-600 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> كوبون ({couponCode})</span>
                        <span className="text-green-600 font-bold">- {couponDiscount.toLocaleString("ar-EG")} ج.م</span>
                      </div>
                    )}
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">الضريبة (14%)</span>
                      <span className="font-bold">{vat.toLocaleString("ar-EG")} ج.م</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">الشحن</span>
                      <span className="font-bold">{selectedShipping.cost === 0 ? "مجاني" : `${selectedShipping.cost} ج.م`}</span>
                    </div>
                  </div>

                  {/* Grand Total */}
                  <div className="mt-5 pt-5 border-t border-border">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-black text-foreground">الإجمالي</span>
                      <div className="text-left">
                        <motion.span
                          key={orderTotal}
                          initial={{ scale: 1.1 }}
                          animate={{ scale: 1 }}
                          className="text-3xl font-black text-primary inline-block"
                        >
                          {orderTotal.toLocaleString("ar-EG")}
                        </motion.span>
                        <span className="text-sm font-bold text-primary mr-1">ج.م</span>
                      </div>
                    </div>
                  </div>

                  {/* Security badge */}
                  <div className="mt-5 flex items-center justify-center gap-2 text-xs text-muted-foreground bg-muted/40 rounded-xl py-2.5 px-3">
                    <Lock className="w-4 h-4 text-green-600" />
                    <span className="font-medium">معاملة آمنة ومشفرة بالكامل</span>
                  </div>

                  {/* CTA Button */}
                  <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }} className="mt-5">
                    <Button
                      className="w-full h-14 text-base font-black rounded-xl shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300"
                      size="lg"
                      onClick={handleSubmit}
                      disabled={submitting}
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin ml-2" />
                          جاري إنشاء الطلب...
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-5 h-5 ml-2" />
                          تأكيد الطلب والدفع
                        </>
                      )}
                    </Button>
                  </motion.div>

                  {/* Trust Section */}
                  <div className="mt-6 pt-5 border-t border-border">
                    <div className="flex items-center justify-center gap-6">
                      <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                        <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center">
                          <ShieldCheck className="w-4 h-4 text-primary/70" />
                        </div>
                        <span className="text-[10px] font-medium">دفع آمن</span>
                      </div>
                      <div className="w-px h-8 bg-border" />
                      <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                        <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center">
                          <Truck className="w-4 h-4 text-primary/70" />
                        </div>
                        <span className="text-[10px] font-medium">شحن سريع</span>
                      </div>
                      <div className="w-px h-8 bg-border" />
                      <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                        <div className="w-8 h-8 rounded-full bg-primary/5 flex items-center justify-center">
                          <CheckCircle2 className="w-4 h-4 text-primary/70" />
                        </div>
                        <span className="text-[10px] font-medium">أصلي 100%</span>
                      </div>
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
