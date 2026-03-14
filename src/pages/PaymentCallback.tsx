import { useEffect, useState } from "react";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { CheckCircle2, XCircle, Loader2, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const PaymentCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<"loading" | "success" | "failed">("loading");

  const success = searchParams.get("success");
  const orderId = searchParams.get("order") || searchParams.get("merchant_order_id");
  const txnId = searchParams.get("id");

  useEffect(() => {
    if (success === "true") {
      setStatus("success");
    } else {
      setStatus("failed");
    }
  }, [success]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12 flex items-center justify-center">
        <div className="max-w-md w-full mx-auto px-4 text-center space-y-6">
          {status === "loading" && (
            <div className="space-y-4">
              <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto" />
              <h1 className="text-xl font-bold">جاري التحقق من الدفع...</h1>
            </div>
          )}

          {status === "success" && (
            <div className="space-y-4">
              <div className="w-20 h-20 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h1 className="text-2xl font-black text-foreground">تم الدفع بنجاح! 🎉</h1>
              <p className="text-muted-foreground">
                تم استلام الدفع وسيتم تجهيز طلبك في أقرب وقت.
              </p>
              {orderId && (
                <p className="text-sm text-muted-foreground">
                  رقم الطلب: <span className="font-bold text-foreground">{orderId}</span>
                </p>
              )}
              <Button onClick={() => navigate("/my-orders")} className="gap-2">
                <ArrowRight className="w-4 h-4" />
                عرض طلباتي
              </Button>
            </div>
          )}

          {status === "failed" && (
            <div className="space-y-4">
              <div className="w-20 h-20 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto">
                <XCircle className="w-10 h-10 text-red-600" />
              </div>
              <h1 className="text-2xl font-black text-foreground">لم تتم عملية الدفع</h1>
              <p className="text-muted-foreground">
                حدثت مشكلة أثناء عملية الدفع. يمكنك المحاولة مرة أخرى من صفحة الطلبات.
              </p>
              <div className="flex flex-col gap-2">
                <Button onClick={() => navigate("/my-orders")} className="gap-2">
                  <ArrowRight className="w-4 h-4" />
                  عرض طلباتي
                </Button>
                <Button variant="outline" onClick={() => navigate("/")} className="gap-2">
                  العودة للرئيسية
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PaymentCallback;
