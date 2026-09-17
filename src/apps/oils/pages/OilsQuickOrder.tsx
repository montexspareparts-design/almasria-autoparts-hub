import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ScanSearch, ShoppingCart, Zap } from "lucide-react";
import { useOilsCatalog, type OilProduct } from "@/lib/oils/useOilsCatalog";
import QuickOrderRow from "../components/QuickOrderRow";
import { useDealerCart } from "@/hooks/useDealerCart";
import { haptic } from "@/lib/haptics";

interface Row {
  product: OilProduct;
  qty: number;
}

/**
 * طلب سريع — إدخال كود الصنف / البارت نمبر مباشرة + كميات، وإجمالي متحدث لحظيًا.
 */
const OilsQuickOrder = () => {
  const navigate = useNavigate();
  const { products, priceAtQty, isDealer } = useOilsCatalog();
  const { addItem, fetchCart } = useDealerCart();

  const [code, setCode] = useState("");
  const [rows, setRows] = useState<Row[]>([]);
  const [adding, setAdding] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const findByCode = (raw: string): OilProduct | undefined => {
    const q = raw.trim().toLowerCase();
    if (!q) return undefined;
    return products.find(
      (p) =>
        p.erp_item_code?.toLowerCase() === q ||
        p.sku?.toLowerCase() === q ||
        p.part_number?.toLowerCase() === q,
    );
  };

  const handleAddCode = () => {
    const found = findByCode(code);
    setNotFound(!found && code.trim().length > 0);
    if (!found) return;
    void haptic("medium");
    setRows((prev) => {
      const existing = prev.find((r) => r.product.id === found.id);
      if (existing) {
        return prev.map((r) => (r.product.id === found.id ? { ...r, qty: r.qty + 1 } : r));
      }
      return [...prev, { product: found, qty: Math.max(1, found.min_order_qty || 1) }];
    });
    setCode("");
  };

  const total = useMemo(
    () => rows.reduce((s, r) => s + priceAtQty(r.product, r.qty) * r.qty, 0),
    [rows, priceAtQty],
  );

  const confirmToCart = async () => {
    if (rows.length === 0) return;
    setAdding(true);
    try {
      for (const r of rows) {
        await addItem(r.product.id, r.qty);
      }
      await fetchCart();
      void haptic("heavy");
      setRows([]);
      navigate("/dealer?tab=cart");
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="px-4 pt-5 space-y-4" dir="rtl">
      <h1 className="text-[18px] font-extrabold flex items-center gap-2">
        <Zap className="w-5 h-5" style={{ color: "hsl(var(--oils-accent))" }} />
        طلب سريع
      </h1>
      <p className="text-[11.5px] -mt-2" style={{ color: "hsl(var(--oils-muted))" }}>
        اكتب كود الصنف أو البارت نمبر مباشرة — بدون بحث طويل.
      </p>

      {/* إدخال الكود */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <ScanSearch className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "hsl(var(--oils-muted))" }} />
          <input
            className="oils-input !pr-10 oils-num"
            dir="ltr"
            placeholder="12918 أو KS086300-2720"
            value={code}
            onChange={(e) => { setCode(e.target.value); setNotFound(false); }}
            onKeyDown={(e) => e.key === "Enter" && handleAddCode()}
            aria-label="كود الصنف أو البارت نمبر"
          />
        </div>
        <button type="button" className="oils-btn-primary !w-auto !px-5" onClick={handleAddCode}>
          أضف
        </button>
      </div>
      {notFound && (
        <p className="text-[11.5px] font-bold" style={{ color: "hsl(var(--oils-danger))" }}>
          الصنف غير موجود في كتالوج الزيوت — تأكد من الكود.
        </p>
      )}

      {/* الأسطر */}
      <div className="space-y-2.5">
        {rows.map((r) => (
          <QuickOrderRow
            key={r.product.id}
            product={r.product}
            qty={r.qty}
            unitPrice={isDealer ? priceAtQty(r.product, r.qty) : 0}
            onQtyChange={(qty) => setRows((prev) => prev.map((x) => (x.product.id === r.product.id ? { ...x, qty } : x)))}
            onRemove={() => setRows((prev) => prev.filter((x) => x.product.id !== r.product.id))}
          />
        ))}
        {rows.length === 0 && (
          <div className="oils-card p-8 text-center">
            <ShoppingCart className="w-8 h-8 mx-auto mb-2" style={{ color: "hsl(var(--oils-muted))" }} />
            <p className="text-[12px]" style={{ color: "hsl(var(--oils-muted))" }}>
              لسه مفيش أصناف — ابدأ بإدخال أول كود.
            </p>
          </div>
        )}
      </div>

      {/* الإجمالي */}
      {rows.length > 0 && (
        <div className="oils-card-hi p-4 sticky bottom-[92px]">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[12px] font-bold" style={{ color: "hsl(var(--oils-muted))" }}>
              {rows.length} صنف · {rows.reduce((s, r) => s + r.qty, 0)} قطعة
            </span>
            <span className="oils-num text-[18px] font-extrabold" style={{ color: "hsl(var(--oils-accent))" }}>
              {total.toLocaleString("en-US", { maximumFractionDigits: 0 })} <span className="text-[11px]">ج.م</span>
            </span>
          </div>
          <button type="button" className="oils-btn-primary" disabled={adding} onClick={() => void confirmToCart()}>
            {adding ? "جاري الإضافة…" : "تأكيد وإضافة للسلة"}
          </button>
        </div>
      )}
    </div>
  );
};

export default OilsQuickOrder;
