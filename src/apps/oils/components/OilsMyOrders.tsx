import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CreditCard, PackageCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

type OrderRow = { id: string; order_number: string; total_amount: number; status: string; created_at: string };

const STATUS: Record<string, { label: string; tone: string }> = {
  awaiting_payment: { label: "في انتظار الدفع", tone: "38 92% 45%" },
  pending: { label: "قيد المراجعة", tone: "38 92% 45%" },
  processing: { label: "قيد التجهيز", tone: "210 80% 45%" },
  shipped: { label: "تم الشحن", tone: "262 60% 50%" },
  delivered: { label: "تم التسليم", tone: "145 63% 35%" },
  cancelled: { label: "ملغي", tone: "0 70% 50%" },
};

/** طلباتي في تطبيق الزيوت — حالة كل طلب + إكمال دفع الطلبات المعلّقة. */
const OilsMyOrders = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState<OrderRow[] | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    void supabase
      .from("orders")
      .select("id, order_number, total_amount, status, created_at")
      .eq("user_id", user.id)
      .eq("source", "oils")
      .order("created_at", { ascending: false })
      .limit(10)
      .then(({ data }) => { if (active) setOrders((data as OrderRow[]) || []); });
    return () => { active = false; };
  }, [user]);

  return (
    <section>
      <div className="oils-section-title"><span><PackageCheck /> طلباتي</span></div>
      {orders === null ? (
        <div className="space-y-2.5">{[0, 1].map((i) => <div key={i} className="oils-skeleton h-[58px]" />)}</div>
      ) : orders.length === 0 ? (
        <p className="text-[11.5px] text-center py-6" style={{ color: "hsl(var(--oils-muted))" }}>لسه مفيش طلبات.</p>
      ) : (
        <div className="space-y-2.5">
          {orders.map((o) => {
            const st = STATUS[String(o.status).toLowerCase()] || { label: o.status, tone: "220 10% 45%" };
            const canPay = String(o.status).toLowerCase() === "awaiting_payment";
            return (
              <div key={o.id} className="oils-invoice-row">
                <div className="oils-invoice-icon"><PackageCheck /></div>
                <div>
                  <p className="oils-num" dir="ltr">{o.order_number}</p>
                  <span style={{ color: `hsl(${st.tone})`, fontWeight: 800 }}>{st.label}</span>
                </div>
                <div className="text-left">
                  <strong className="oils-num" dir="ltr">{Number(o.total_amount).toLocaleString("en-US", { maximumFractionDigits: 0 })} ج</strong>
                  {canPay && (
                    <button type="button" className="oils-chip mt-1 flex items-center gap-1" onClick={() => navigate(`/oils/payment/${o.id}`)}>
                      <CreditCard className="w-3 h-3" /> ادفع الآن
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};

export default OilsMyOrders;
