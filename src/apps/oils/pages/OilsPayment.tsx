import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight, CreditCard, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import GeideaCheckout from "@/components/GeideaCheckout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { isNativePlatform, publicWebOrigin } from "@/lib/native";

interface PaymentOrder {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
}

const OilsPayment = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState<PaymentOrder | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!orderId || !user) return;
      const { data } = await supabase.from("orders").select("id, order_number, total_amount, status").eq("id", orderId).eq("user_id", user.id).maybeSingle();
      if (active) {
        setOrder(data as PaymentOrder | null);
        setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [orderId, user]);

  if (loading) return <main className="oils-screen oils-payment-loading"><Loader2 /></main>;
  if (!order) {
    return <main className="oils-screen oils-cart-empty" dir="rtl"><h1>الطلب غير متاح</h1><button type="button" className="oils-btn-primary" onClick={() => navigate("/oils/cart")}>العودة للسلة</button></main>;
  }

  const base = isNativePlatform() ? publicWebOrigin() : window.location.origin;
  const returnUrl = `${base}/oils/payment-result?provider=geidea&merchant_order_id=${encodeURIComponent(order.order_number)}`;

  return (
    <main className="oils-screen oils-payment" dir="rtl">
      <button type="button" className="oils-payment-back" onClick={() => navigate("/oils/cart")}><ArrowRight /> العودة للسلة</button>
      <section className="oils-payment-hero">
        <div className="oils-payment-shield"><ShieldCheck /></div>
        <span>دفع مشفّر وآمن</span>
        <h1>أكمل دفع طلبيتك</h1>
        <p>اختر البطاقة أو المحفظة داخل نافذة جيديا الآمنة.</p>
      </section>
      <section className="oils-payment-order">
        <div><span>رقم الطلب</span><b className="oils-num" dir="ltr">{order.order_number}</b></div>
        <div className="oils-payment-amount"><span>المبلغ المطلوب</span><strong className="oils-num">{Number(order.total_amount).toLocaleString("en-US", { maximumFractionDigits: 2 })} ج.م</strong></div>
      </section>
      <section className="oils-payment-methods">
        <h2>طرق الدفع المتاحة</h2>
        <div><span><CreditCard /> Visa · Mastercard · Meeza</span><b>بطاقات بنكية</b></div>
        <div><span><Smartphone /> Vodafone Cash وغيرها</span><b>محافظ إلكترونية</b></div>
      </section>
      <div className="oils-payment-action">
        <GeideaCheckout orderId={order.id} currency="EGP" returnUrl={returnUrl} callbackPath="/oils/payment-result" />
      </div>
      <p className="oils-payment-trust"><ShieldCheck /> بيانات الدفع لا تُحفظ داخل تطبيق المصرية.</p>
    </main>
  );
};

export default OilsPayment;