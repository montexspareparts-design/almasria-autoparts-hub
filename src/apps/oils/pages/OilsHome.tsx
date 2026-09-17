import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { BadgePercent, Droplets, Flame, Repeat2, Zap, ChevronLeft, Bell } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { useOilsCatalog } from "@/lib/oils/useOilsCatalog";
import { useReorder } from "@/lib/oils/useReorder";
import OilProductCard from "../components/OilProductCard";
import { useDealerCart } from "@/hooks/useDealerCart";
import { haptic } from "@/lib/haptics";

const OilsHome = () => {
  const navigate = useNavigate();
  const { profile, dealerAccount } = useAuth();
  const { products, loading, discountsFor, isDealer } = useOilsCatalog();
  const { lastOrder, lastOrderItems, reorder } = useReorder();
  const { addItem } = useDealerCart();

  const offers = useMemo(() => products.filter((p) => p.is_on_sale).slice(0, 6), [products]);
  const suggested = useMemo(
    () => products.filter((p) => p.stock_quantity > 0 && !p.is_on_sale).slice(0, 8),
    [products],
  );

  const handleAdd = async (product: (typeof products)[number], qty: number) => {
    await addItem(product.id, qty);
  };

  return (
    <div className="px-4 pt-5 space-y-6" dir="rtl">
      {/* الترويسة */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div
            className="w-10 h-10 rounded-xl grid place-items-center"
            style={{ background: "linear-gradient(135deg, hsl(var(--oils-accent)), hsl(var(--oils-accent-2)))" }}
          >
            <Droplets className="w-5 h-5" style={{ color: "hsl(210 62% 9%)" }} />
          </div>
          <div>
            <p className="text-[11px]" style={{ color: "hsl(var(--oils-muted))" }}>أهلًا بك</p>
            <p className="text-[14px] font-extrabold leading-tight">
              {profile?.full_name || "شريكنا في الجملة"}
            </p>
          </div>
        </div>
        <button type="button" aria-label="الإشعارات" className="oils-card !rounded-xl w-10 h-10 grid place-items-center" onClick={() => navigate("/oils/account")}>
          <Bell className="w-[18px] h-[18px]" style={{ color: "hsl(var(--oils-muted))" }} />
        </button>
      </div>

      {/* بانر العروض */}
      <motion.button
        type="button"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        onClick={() => navigate("/oils/catalog?offers=1")}
        className="w-full text-right rounded-[20px] p-5 relative overflow-hidden"
        style={{
          background: "linear-gradient(120deg, hsl(37 91% 55% / 0.22), hsl(22 95% 52% / 0.12)), hsl(var(--oils-card))",
          border: "1px solid hsl(var(--oils-accent) / 0.35)",
        }}
      >
        <Flame className="w-8 h-8 mb-2" style={{ color: "hsl(var(--oils-accent))" }} />
        <p className="text-[16px] font-extrabold">عروض الجملة الأسبوعية</p>
        <p className="text-[11.5px] mt-1" style={{ color: "hsl(var(--oils-muted))" }}>
          خصومات إضافية على الكراتين والدرام للزيوت المختارة
        </p>
        <span className="oils-chip oils-chip--accent mt-3">
          {offers.length > 0 ? `${offers.length} عرض نشط` : "تصفّح العروض"} <ChevronLeft className="w-3 h-3" />
        </span>
      </motion.button>

      {/* إعادة طلب */}
      {lastOrder && lastOrderItems.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="oils-card p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Repeat2 className="w-4 h-4" style={{ color: "hsl(var(--oils-accent))" }} />
              <p className="text-[13px] font-extrabold">آخر طلبية</p>
            </div>
            <span className="oils-num text-[10.5px]" style={{ color: "hsl(var(--oils-muted))" }} dir="ltr">
              {lastOrder.order_number}
            </span>
          </div>
          <p className="text-[11.5px] mt-1.5" style={{ color: "hsl(var(--oils-muted))" }}>
            {lastOrderItems.length} صنف — بإجمالي {Number(lastOrder.total_amount).toLocaleString("en-US", { maximumFractionDigits: 0 })} ج.م
          </p>
          <button
            type="button"
            className="oils-btn-ghost w-full mt-3 !text-[12px]"
            onClick={() => { void haptic("medium"); void reorder().then(() => navigate("/oils/quick")); }}
          >
            <Zap className="w-4 h-4" style={{ color: "hsl(var(--oils-accent))" }} />
            إعادة نفس الطلبية بضغطة واحدة
          </button>
        </motion.div>
      )}

      {/* أصناف مقترحة */}
      <section>
        <div className="oils-section-title mb-3">
          <span className="flex items-center gap-2">
            <BadgePercent className="w-4 h-4" style={{ color: "hsl(var(--oils-accent))" }} />
            زيوت مقترحة لنشاطك
          </span>
          <button type="button" className="text-[11px] font-bold" style={{ color: "hsl(var(--oils-accent))" }} onClick={() => navigate("/oils/catalog")}>
            الكل
          </button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[0, 1, 2].map((i) => <div key={i} className="oils-skeleton h-[130px]" />)}
          </div>
        ) : (
          <div className="space-y-3">
            {suggested.map((p) => (
              <OilProductCard key={p.id} product={p} discounts={discountsFor(p)} canSeePrice={isDealer} onAdd={handleAdd} />
            ))}
            {suggested.length === 0 && (
              <p className="text-center text-[12px] py-8" style={{ color: "hsl(var(--oils-muted))" }}>
                لا توجد أصناف متاحة حاليًا.
              </p>
            )}
          </div>
        )}
      </section>

      {dealerAccount?.min_order_amount ? (
        <p className="text-[10.5px] text-center pb-2" style={{ color: "hsl(var(--oils-muted))" }}>
          الحد الأدنى للطلبية: {Number(dealerAccount.min_order_amount).toLocaleString("en-US")} ج.م
        </p>
      ) : null}
    </div>
  );
};

export default OilsHome;
