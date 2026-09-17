import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Check, Clock3, Loader2, RotateCcw, ShieldCheck, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDealerCart } from "@/hooks/useDealerCart";
import { pushOrderToERP } from "@/lib/erpSync";
import { normalizePaymobOrderReference } from "@/lib/payment-return";

type ResultState = "loading" | "pending" | "success" | "failed";

const OilsPaymentResult = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clearCart } = useDealerCart();
  const [status, setStatus] = useState<ResultState>("loading");
  const [orderId, setOrderId] = useState<string | null>(null);
  const completed = useRef(false);
  const orderNumber = normalizePaymobOrderReference(params.get("merchant_order_id") || params.get("order"));

  useEffect(() => {
    let cancelled = false;
    let timer: number | undefined;
    let attempts = 0;
    const verify = async () => {
      if (!user || !orderNumber) {
        if (!cancelled) setStatus("failed");
        return;
      }
      const { data: verification } = await supabase.functions.invoke("verify-payment-status", {
        body: { order_number: orderNumber, provider: "geidea" },
      });
      const { data: order } = await supabase.from("orders").select("id, status").eq("order_number", orderNumber).eq("user_id", user.id).maybeSingle();
      if (!order || cancelled) return;
      setOrderId(order.id);
      const current = String(order.status || "").toLowerCase();
      if (verification?.status === "success" || ["processing", "shipped", "delivered"].includes(current)) {
        setStatus("success");
        return;
      }
      if (verification?.status === "failed" || current === "cancelled") {
        setStatus("failed");
        return;
      }
      setStatus("pending");
      attempts += 1;
      if (attempts < 60) timer = window.setTimeout(() => void verify(), 3000);
    };
    void verify();
    return () => { cancelled = true; if (timer) window.clearTimeout(timer); };
  }, [orderNumber, user]);

  useEffect(() => {
    if (status !== "success" || !orderId || completed.current) return;
    completed.current = true;
    void clearCart();
    localStorage.removeItem("oils_pending_payment_order");
    void supabase.functions.invoke("notify-warehouse-order", { body: { order_id: orderId } });
    void supabase.from("orders").select("erp_order_code").eq("id", orderId).maybeSingle().then(({ data }) => {
      if (!data?.erp_order_code) void pushOrderToERP(orderId);
    });
  }, [status, orderId, clearCart]);

  const retry = () => orderId ? navigate(`/oils/payment/${orderId}`) : navigate("/oils/cart");
  const config = {
    loading: { icon: Loader2, eyebrow: "التحقق الآمن", title: "نتأكد من عملية الدفع", text: "لحظات ونراجع التأكيد مباشرة مع جيديا." },
    pending: { icon: Clock3, eyebrow: "الدفع قيد التأكيد", title: "استلمنا طلب التحقق", text: "المحافظ الإلكترونية قد تحتاج دقائق قليلة. سنحدّث النتيجة تلقائيًا." },
    success: { icon: Check, eyebrow: "تم الدفع بنجاح", title: "طلبيتك دخلت التجهيز", text: "تم تأكيد الدفع وإرسال تفاصيل الطلب للمخزن والفيصل." },
    failed: { icon: X, eyebrow: "لم يتم تأكيد الدفع", title: "الطلب ما زال محفوظًا", text: "لم نؤكد خصم المبلغ. يمكنك المحاولة مجددًا بأمان." },
  }[status];
  const Icon = config.icon;

  return (
    <main className={`oils-screen oils-result oils-result--${status}`} dir="rtl">
      <section className="oils-result-card">
        <div className="oils-result-icon"><Icon className={status === "loading" ? "animate-spin" : ""} /></div>
        <span>{config.eyebrow}</span>
        <h1>{config.title}</h1>
        <p>{config.text}</p>
        {orderNumber && <div className="oils-result-order"><span>رقم الطلب</span><b dir="ltr">{orderNumber}</b></div>}
        {status === "success" ? (
          <button type="button" className="oils-btn-primary" onClick={() => navigate("/oils/account")}>متابعة الطلب من حسابي</button>
        ) : status === "failed" ? (
          <button type="button" className="oils-btn-primary" onClick={retry}><RotateCcw /> إعادة محاولة الدفع</button>
        ) : null}
        <button type="button" className="oils-result-home" onClick={() => navigate("/oils")}>العودة للرئيسية</button>
      </section>
      <p className="oils-payment-trust"><ShieldCheck /> النتيجة معتمدة بعد التحقق من الخادم، وليست من رابط المتصفح.</p>
    </main>
  );
};

export default OilsPaymentResult;