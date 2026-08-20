import { useState } from "react";
import { Banknote, CheckCircle2, Inbox, Loader2, Lock, Package, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import GeideaCheckout from "@/components/GeideaCheckout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { buildPaymobReturnUrl } from "@/lib/paymob";

type PaymentMethod = "cod" | "geidea";

const PAYMENT_METHODS = [
  {
    id: "cod" as const,
    label: "الدفع عند الاستلام",
    description: "ادفع عند استلام الطلب",
    icon: Banknote,
  },
  {
    id: "geidea" as const,
    label: "الدفع بالفيزا أو المحفظة",
    description: "Visa / Mastercard / Meeza / محافظ إلكترونية عبر جيديا",
    icon: ShieldCheck,
  },
];

interface DealerPaymentProps {
  targetOrderId?: string;
  targetOrderNumber?: string;
  targetOrderAmount?: number;
  onNavigateToOrders?: () => void;
  onNavigateToCart?: () => void;
}

const DealerPayment = ({
  targetOrderId,
  targetOrderNumber,
  targetOrderAmount,
  onNavigateToOrders,
  onNavigateToCart,
}: DealerPaymentProps) => {
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>("cod");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!targetOrderId) {
    return (
      <div className="flex flex-col items-center justify-center py-24 px-6 text-center">
        <div className="w-20 h-20 rounded-2xl bg-secondary/5 flex items-center justify-center mb-6 border border-border">
          <Package className="w-9 h-9 text-muted-foreground/30" />
        </div>
        <h3 className="text-lg font-bold text-foreground mb-1">لا توجد طلبات لتدفعها</h3>
        <p className="text-sm text-muted-foreground max-w-[280px] mb-5">اختر طلباً قائماً أو أنشئ طلبية جديدة لبدء الدفع</p>
        <div className="flex flex-col gap-2 w-full max-w-[220px]">
          <Button onClick={() => (onNavigateToCart || onNavigateToOrders)?.()} className="gap-2 h-11">
            <Package className="w-4 h-4" />
            ابدأ طلبية جديدة
          </Button>
          <Button variant="outline" onClick={onNavigateToOrders} className="gap-2 h-10 text-xs">
            <Inbox className="w-3.5 h-3.5" />
            عرض طلباتي
          </Button>
        </div>
      </div>
    );
  }

  const confirmCashOnDelivery = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from("orders")
        .update({ payment_method: "cod" })
        .eq("id", targetOrderId);
      if (updateError) throw updateError;
      toast({ title: "تم اختيار الدفع عند الاستلام" });
      onNavigateToOrders?.();
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : "تعذر حفظ طريقة الدفع");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto space-y-5">
      <div className="rounded-2xl bg-secondary p-5 text-secondary-foreground">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs opacity-60">رقم الطلب</p>
            <p className="font-mono text-sm mt-1" dir="ltr">{targetOrderNumber || "—"}</p>
          </div>
          {targetOrderAmount != null && targetOrderAmount > 0 && (
            <div className="text-end">
              <p className="text-xs opacity-60">الإجمالي</p>
              <p className="font-black text-xl mt-1" dir="ltr">{targetOrderAmount.toLocaleString("en-US")} ج.م</p>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-3">
        <p className="text-xs font-bold text-muted-foreground">اختر طريقة الدفع</p>
        {PAYMENT_METHODS.map((method) => {
          const Icon = method.icon;
          const selected = selectedMethod === method.id;
          return (
            <Button
              key={method.id}
              type="button"
              variant="outline"
              onClick={() => { setSelectedMethod(method.id); setError(null); }}
              className={`w-full h-auto min-h-[72px] justify-start gap-3 px-4 py-3 text-start ${selected ? "border-primary bg-primary/5" : ""}`}
            >
              <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${selected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                <Icon className="w-5 h-5" />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block font-bold text-sm text-foreground">{method.label}</span>
                <span className="block text-[11px] text-muted-foreground mt-1 whitespace-normal">{method.description}</span>
              </span>
              {selected && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
            </Button>
          );
        })}
      </div>

      {error && <p className="text-sm font-bold text-destructive bg-destructive/5 border border-destructive/20 rounded-xl p-3">{error}</p>}

      {selectedMethod === "geidea" ? (
        <GeideaCheckout orderId={targetOrderId} currency="EGP" returnUrl={buildPaymobReturnUrl()} />
      ) : (
        <Button
          className="w-full h-13 gap-2 font-black"
          disabled={loading}
          onClick={confirmCashOnDelivery}
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Banknote className="w-5 h-5" />}
          {loading ? "جاري التجهيز..." : "تأكيد الدفع عند الاستلام"}
        </Button>
      )}

      <div className="flex items-center justify-center gap-1.5 pt-1">
        <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground" />
        <span className="text-[10px] text-muted-foreground">معاملات دفع آمنة ومشفرة عبر جيديا</span>
      </div>
    </div>
  );
};

export default DealerPayment;
