import { useEffect, useState } from "react";
import { TrendingDown, Bell, BellOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface Props {
  productId: string;
  currentPrice: number;
  variant?: "icon" | "full";
}

const PriceDropAlertButton = ({ productId, currentPrice, variant = "full" }: Props) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [active, setActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!user || !productId) { setChecked(true); return; }
    (async () => {
      const { data } = await supabase
        .from("price_drop_alerts")
        .select("id, active")
        .eq("user_id", user.id)
        .eq("product_id", productId)
        .maybeSingle();
      setActive(!!data?.active);
      setChecked(true);
    })();
  }, [user, productId]);

  const toggle = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!user) {
      toast.info("سجل دخولك لتفعيل تنبيهات الأسعار");
      navigate("/auth");
      return;
    }
    setLoading(true);
    try {
      if (active) {
        await supabase
          .from("price_drop_alerts")
          .update({ active: false })
          .eq("user_id", user.id)
          .eq("product_id", productId);
        setActive(false);
        toast.success("تم إلغاء التنبيه");
      } else {
        await supabase.from("price_drop_alerts").upsert(
          { user_id: user.id, product_id: productId, reference_price: currentPrice, active: true, last_notified_price: null },
          { onConflict: "user_id,product_id" }
        );
        setActive(true);
        toast.success("📉 سنخبرك فور انخفاض السعر");
      }
    } catch {
      toast.error("حدث خطأ");
    } finally {
      setLoading(false);
    }
  };

  if (!checked) return null;

  if (variant === "icon") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        title={active ? "إلغاء تنبيه السعر" : "نبهني عند انخفاض السعر"}
        className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
          active ? "bg-emerald-500/15 text-emerald-600" : "bg-muted/50 text-muted-foreground hover:bg-muted"
        }`}
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : active ? <Bell className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
      </button>
    );
  }

  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={toggle}
      disabled={loading}
      className="gap-1.5"
    >
      {loading ? (
        <Loader2 className="w-3.5 h-3.5 animate-spin" />
      ) : active ? (
        <><BellOff className="w-3.5 h-3.5" /> إلغاء تنبيه السعر</>
      ) : (
        <><TrendingDown className="w-3.5 h-3.5" /> نبهني عند انخفاض السعر</>
      )}
    </Button>
  );
};

export default PriceDropAlertButton;
