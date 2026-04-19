import { useState } from "react";
import { Tag, Loader2, X, CheckCircle2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface CouponInputProps {
  subtotal: number;
  onApply: (discount: number, code: string) => void;
  onRemove: () => void;
  appliedCode: string | null;
  appliedDiscount: number;
}

const CouponInput = ({ subtotal, onApply, onRemove, appliedCode, appliedDiscount }: CouponInputProps) => {
  const { user } = useAuth();
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleApply = async () => {
    if (!code.trim()) return;
    if (!user) {
      toast.error("يجب تسجيل الدخول أولاً");
      return;
    }

    setLoading(true);
    try {
      const trimmed = code.trim().toUpperCase();

      // Validate via secure RPC (only returns coupon if code is valid & active)
      const { data: coupons, error } = await supabase.rpc("validate_coupon", { _code: trimmed });
      const coupon = Array.isArray(coupons) ? coupons[0] : null;

      if (error || !coupon) {
        toast.error("كود الخصم غير صالح أو منتهي");
        return;
      }

      // Check min order
      if (coupon.min_order_amount && subtotal < Number(coupon.min_order_amount)) {
        toast.error(`الحد الأدنى للطلب ${Number(coupon.min_order_amount).toLocaleString("ar-EG")} ج.م`);
        return;
      }

      // Check if user already used this coupon
      const { count } = await supabase
        .from("coupon_usage")
        .select("id", { count: "exact", head: true })
        .eq("coupon_id", coupon.id)
        .eq("user_id", user.id);

      if (count && count > 0) {
        toast.error("لقد استخدمت هذا الكود من قبل");
        return;
      }

      // Calculate discount
      let discountAmount = 0;
      if (coupon.discount_type === "percentage") {
        discountAmount = subtotal * (Number(coupon.discount_value) / 100);
        if (coupon.max_discount_amount) {
          discountAmount = Math.min(discountAmount, Number(coupon.max_discount_amount));
        }
      } else {
        discountAmount = Number(coupon.discount_value);
      }

      discountAmount = Math.min(discountAmount, subtotal);

      onApply(discountAmount, trimmed);
      toast.success(`تم تطبيق كود الخصم — وفرت ${discountAmount.toLocaleString("ar-EG")} ج.م`);
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء التحقق من الكود");
    } finally {
      setLoading(false);
    }
  };

  if (appliedCode) {
    return (
      <div className="bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg p-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <div>
            <p className="text-sm font-bold text-green-700 dark:text-green-400">
              كود: {appliedCode}
            </p>
            <p className="text-xs text-green-600 dark:text-green-500">
              خصم {appliedDiscount.toLocaleString("ar-EG")} ج.م
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            onRemove();
            setCode("");
          }}
          className="text-green-600 hover:text-red-500 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="flex gap-2">
      <div className="relative flex-1">
        <Tag className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="كود الخصم"
          className="pr-10 text-sm font-mono"
          dir="ltr"
          onKeyDown={(e) => e.key === "Enter" && handleApply()}
        />
      </div>
      <Button
        variant="outline"
        size="sm"
        onClick={handleApply}
        disabled={loading || !code.trim()}
        className="shrink-0"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "تطبيق"}
      </Button>
    </div>
  );
};

export default CouponInput;
