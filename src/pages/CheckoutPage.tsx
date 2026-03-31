import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Truck, Zap, Store, CreditCard, Banknote, Smartphone, Building2,
  Wallet, ShieldCheck, Package, Loader2
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

const CheckoutPage = () => {
  const navigate = useNavigate();
  const { items, subtotal, vat, discount, couponCode, couponDiscount, total, clearCart, setShippingCost } = useCart();
  const { user } = useAuth();

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

      // Push order to Al Faisal ERP (fire-and-forget)
      pushOrderToERP(order.id);

      // Record coupon usage if applied
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
          // Increment used_count manually
          await supabase
            .from("coupons")
            .update({ used_count: (couponData as any).used_count + 1 } as any)
            .eq("id", couponData.id);
        }
      }

      clearCart();

      if (payment === "paymob") {
        // Redirect to dedicated payment page
        navigate(`/payment?order_id=${order.id}&amount=${orderTotal}`);
        return;
      }

      toast({ title: "تم تقديم طلبك بنجاح! ✅", description: `رقم الطلب: ${orderNumber}` });
      navigate(`/my-orders?highlight=${order.id}`);
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

  // Show Paymob Flash Checkout if client_secret is available
  if (paymobClientSecret && paymobPublicKey) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-12">
          <div className="container mx-auto px-4 max-w-lg text-center">
            <h1 className="text-2xl font-black text-foreground mb-6">💳 إتمام الدفع</h1>
            <div className="bg-card border border-border rounded-lg p-6">
              <PaymobCheckout clientSecret={paymobClientSecret} publicKey={paymobPublicKey} />
            </div>
            <p className="text-xs text-muted-foreground mt-4">أكمل الدفع داخل النافذة، ثم ستعود تلقائياً لصفحة التأكيد.</p>
            {paymobOrderId && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => navigate(`/my-orders?highlight=${paymobOrderId}`)}
              >
                العودة إلى طلباتي
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
      <div className="pt-24 pb-12">
        <div className="container mx-auto px-4 max-w-5xl">
          <Link to="/cart" className="inline-flex items-center gap-1 text-sm text-primary hover:underline mb-6">
            <ArrowRight className="w-4 h-4" />
            العودة للسلة
          </Link>

          <h1 className="text-2xl md:text-3xl font-black text-foreground mb-8">إتمام الطلب</h1>

          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Form */}
            <div className="lg:col-span-3 space-y-8">
              {/* Shipping Info */}
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-bold text-card-foreground mb-5 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-primary" />
                  بيانات الشحن
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <Label>الاسم الكامل *</Label>
                    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="محمد أحمد" className="mt-1" />
                  </div>
                  <div>
                    <Label>رقم الهاتف *</Label>
                    <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="01xxxxxxxxx" className="mt-1" dir="ltr" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>البريد الإلكتروني</Label>
                    <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="example@email.com" className="mt-1" dir="ltr" />
                  </div>
                  <div>
                    <Label>المحافظة *</Label>
                    <select
                      value={form.governorate}
                      onChange={(e) => setForm({ ...form, governorate: e.target.value })}
                      className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      <option value="">اختر المحافظة</option>
                      {governorates.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label>المدينة</Label>
                    <Input value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} placeholder="المدينة / الحي" className="mt-1" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>العنوان التفصيلي *</Label>
                    <Input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="الشارع - المبنى - الطابق" className="mt-1" />
                  </div>
                  <div className="sm:col-span-2">
                    <Label>ملاحظات</Label>
                    <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="ملاحظات إضافية على الطلب..." className="mt-1" rows={3} />
                  </div>
                </div>
              </motion.div>

              {/* Shipping Method */}
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-bold text-card-foreground mb-5 flex items-center gap-2">
                  <Zap className="w-5 h-5 text-primary" />
                  طريقة الشحن
                </h2>

                <RadioGroup value={shipping} onValueChange={handleShippingChange} className="space-y-3">
                  {shippingOptions.map((opt) => (
                    <label
                      key={opt.id}
                      className={`flex items-center justify-between p-4 rounded-lg border cursor-pointer transition-all ${
                        shipping === opt.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <RadioGroupItem value={opt.id} />
                        <opt.icon className="w-5 h-5 text-muted-foreground" />
                        <div>
                          <p className="font-semibold text-sm">{opt.label}</p>
                          <p className="text-xs text-muted-foreground">{opt.desc}</p>
                        </div>
                      </div>
                      <span className="font-bold text-sm text-primary">
                        {opt.cost === 0 ? "مجاني" : `${opt.cost} ج.م`}
                      </span>
                    </label>
                  ))}
                </RadioGroup>
              </motion.div>

              {/* Payment Method */}
              <motion.div initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-card border border-border rounded-lg p-6">
                <h2 className="text-lg font-bold text-card-foreground mb-5 flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-primary" />
                  وسيلة الدفع
                </h2>

                <RadioGroup value={payment} onValueChange={setPayment} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {paymentMethods.map((method) => (
                    <label
                      key={method.id}
                      className={`flex items-center gap-3 p-4 rounded-lg border cursor-pointer transition-all ${
                        payment === method.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30"
                      }`}
                    >
                      <RadioGroupItem value={method.id} />
                      <method.icon className="w-5 h-5 text-muted-foreground" />
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
              </motion.div>
            </div>

            {/* Summary Sidebar */}
            <div className="lg:col-span-2">
              <div className="bg-card border border-border rounded-lg p-6 sticky top-24">
                <h2 className="text-lg font-bold text-card-foreground mb-5">ملخص الطلب</h2>

                {/* Items preview */}
                <div className="space-y-3 max-h-60 overflow-y-auto mb-5">
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3 items-center">
                      <div className="w-12 h-12 rounded bg-muted overflow-hidden shrink-0">
                        {item.image_url ? (
                          <img src={item.image_url} alt={item.name_ar} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-5 h-5 text-muted-foreground/20" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{item.name_ar}</p>
                        <p className="text-[11px] text-muted-foreground">{item.quantity} × {item.unit_price.toLocaleString("ar-EG")} ج.م</p>
                      </div>
                      <span className="text-xs font-bold">{(item.quantity * item.unit_price).toLocaleString("ar-EG")} ج.م</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-4 space-y-2.5 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">المنتجات</span>
                    <span>{subtotal.toLocaleString("ar-EG")} ج.م</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>الخصم</span>
                      <span>- {discount.toLocaleString("ar-EG")} ج.م</span>
                    </div>
                  )}
                  {couponDiscount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>كوبون ({couponCode})</span>
                      <span>- {couponDiscount.toLocaleString("ar-EG")} ج.م</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الضريبة (14%)</span>
                    <span>{vat.toLocaleString("ar-EG")} ج.م</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الشحن</span>
                    <span>{selectedShipping.cost === 0 ? "مجاني" : `${selectedShipping.cost} ج.م`}</span>
                  </div>

                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between text-lg font-black">
                      <span>الإجمالي</span>
                      <span className="text-primary">{orderTotal.toLocaleString("ar-EG")} ج.م</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground">
                  <ShieldCheck className="w-4 h-4 text-green-600" />
                  <span>معاملة آمنة ومشفرة</span>
                </div>

                <Button className="w-full mt-6" size="lg" onClick={handleSubmit} disabled={submitting}>
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      جاري إنشاء الطلب...
                    </>
                  ) : (
                    <>
                      <CreditCard className="w-5 h-5" />
                      ادفع الآن
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default CheckoutPage;
