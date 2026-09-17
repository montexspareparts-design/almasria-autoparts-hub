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
    <main className="oils-screen oils-quick" dir="rtl">
      <header className="oils-page-header"><div><span className="oils-eyebrow">اطلب في ثواني</span><h1>طلب سريع</h1></div><div className="oils-header-symbol"><Zap /></div></header>
      <p className="oils-page-intro">أدخل كود الصنف أو البارت نمبر، وحدد الكمية فقط.</p>

      {/* إدخال الكود */}
      <div className="oils-quick-entry">
        <div className="oils-quick-input-wrap">
          <ScanSearch />
          <input
            className="oils-quick-input oils-num"
            dir="ltr"
            placeholder="12918 أو KS086300-2720"
            value={code}
            onChange={(e) => { setCode(e.target.value); setNotFound(false); }}
            onKeyDown={(e) => e.key === "Enter" && handleAddCode()}
            aria-label="كود الصنف أو البارت نمبر"
          />
        </div>
        <button type="button" className="oils-quick-add" onClick={handleAddCode}>
          أضف
        </button>
      </div>
      {notFound && (
        <p className="oils-form-error">
          الصنف غير موجود في كتالوج الزيوت — تأكد من الكود.
        </p>
      )}

      {/* الأسطر */}
      <div className="oils-quick-list">
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
          <div className="oils-empty-state">
            <ShoppingCart />
            <p>
              لسه مفيش أصناف — ابدأ بإدخال أول كود.
            </p>
          </div>
        )}
      </div>

      {/* الإجمالي */}
      {rows.length > 0 && (
        <div className="oils-sticky-total">
          <div>
            <span>
              {rows.length} صنف · {rows.reduce((s, r) => s + r.qty, 0)} قطعة
            </span>
            <strong className="oils-num">
              {total.toLocaleString("en-US", { maximumFractionDigits: 0 })} <span className="text-[11px]">ج.م</span>
            </strong>
          </div>
          <button type="button" className="oils-btn-primary" disabled={adding} onClick={() => void confirmToCart()}>
            {adding ? "جاري الإضافة…" : "تأكيد وإضافة للسلة"}
          </button>
        </div>
      )}
    </main>
  );
};

export default OilsQuickOrder;
