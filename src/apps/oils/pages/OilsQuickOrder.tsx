import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Boxes, Check, Layers, PackageSearch, ScanSearch, ShieldCheck, Sparkles, Trash2, Zap } from "lucide-react";
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

  const addProduct = (found: OilProduct) => {
    void haptic("medium");
    setRows((prev) => {
      const existing = prev.find((r) => r.product.id === found.id);
      if (existing) {
        return prev.map((r) => (r.product.id === found.id ? { ...r, qty: r.qty + 1 } : r));
      }
      return [...prev, { product: found, qty: Math.max(1, found.min_order_qty || 1) }];
    });
    setCode("");
    setNotFound(false);
  };

  const handleAddCode = () => {
    const found = findByCode(code);
    setNotFound(!found && code.trim().length > 0);
    if (!found) return;
    addProduct(found);
  };

  /** اقتراحات فورية أثناء الكتابة — كود الصنف / البارت نمبر / الاسم */
  const suggestions = useMemo(() => {
    const q = code.trim().toLowerCase();
    if (q.length < 2) return [] as OilProduct[];
    return products
      .filter(
        (p) =>
          p.erp_item_code?.toLowerCase().includes(q) ||
          p.sku?.toLowerCase().includes(q) ||
          p.part_number?.toLowerCase().includes(q) ||
          p.name_ar?.toLowerCase().includes(q),
      )
      .slice(0, 5);
  }, [code, products]);

  const totalUnits = useMemo(() => rows.reduce((s, r) => s + r.qty, 0), [rows]);
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
      navigate("/oils/cart");
    } finally {
      setAdding(false);
    }
  };

  return (
    <main className="oils-screen oils-quick" dir="rtl">
      <header className="oils-page-header">
        <div>
          <span className="oils-eyebrow">اطلب في ثواني</span>
          <h1>طلب سريع</h1>
        </div>
        <div className="oils-header-symbol"><Zap /></div>
      </header>

      {/* لوحة الإدخال الفاخرة */}
      <section className="oils-qo-console">
        <div className="oils-qo-console-top">
          <span className="oils-qo-console-mark"><ScanSearch /></span>
          <div>
            <small>إدخال مباشر</small>
            <h2>كود الصنف أو البارت نمبر</h2>
          </div>
          <span className="oils-qo-live"><i />جاهز</span>
        </div>

        <div className="oils-qo-field">
          <PackageSearch />
          <input
            className="oils-qo-input oils-num"
            dir="ltr"
            placeholder="12918  ·  KS086300-2720"
            value={code}
            onChange={(e) => { setCode(e.target.value); setNotFound(false); }}
            onKeyDown={(e) => e.key === "Enter" && handleAddCode()}
            aria-label="كود الصنف أو البارت نمبر"
          />
          <button type="button" className="oils-qo-add" onClick={handleAddCode} aria-label="أضف">
            <Check />
          </button>
        </div>

        {suggestions.length > 0 && (
          <ul className="oils-qo-suggestions">
            {suggestions.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => addProduct(p)}>
                  <span className="oils-qo-sg-code oils-num" dir="ltr">{p.erp_item_code || p.sku}</span>
                  <span className="oils-qo-sg-name">{p.name_ar}</span>
                  <ArrowLeft />
                </button>
              </li>
            ))}
          </ul>
        )}

        {notFound && (
          <p className="oils-qo-error">الصنف غير موجود في كتالوج الزيوت — راجع الكود.</p>
        )}

        <div className="oils-qo-hints">
          <span><Sparkles />اكتب أول حرفين ويظهر الاقتراح</span>
          <span><ShieldCheck />أسعار جملة محدثة لحظيًا</span>
        </div>
      </section>

      {/* الأسطر */}
      {rows.length > 0 && (
        <div className="oils-qo-list-head">
          <h3><Layers />الأصناف المضافة</h3>
          <span className="oils-num">{rows.length} صنف · {totalUnits} قطعة</span>
        </div>
      )}

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
          <div className="oils-qo-empty">
            <span className="oils-qo-empty-mark"><Boxes /></span>
            <h4>ابدأ بإدخال أول كود</h4>
            <p>اكتب كود الصنف أو البارت نمبر، وهيتضاف فورًا بالسعر والكمية.</p>
            <button type="button" className="oils-qo-empty-link" onClick={() => navigate("/oils/catalog")}>
              تصفّح كتالوج الزيوت
              <ArrowLeft />
            </button>
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <button type="button" className="oils-qo-clear" onClick={() => setRows([])}>
          <Trash2 />مسح القائمة
        </button>
      )}

      {/* الإجمالي */}
      {rows.length > 0 && (
        <div className="oils-qo-total">
          <div className="oils-qo-total-copy">
            <span>إجمالي الطلب</span>
            <strong className="oils-num">
              {total.toLocaleString("en-US", { maximumFractionDigits: 0 })} <small>ج.م</small>
            </strong>
          </div>
          <button type="button" className="oils-qo-confirm" disabled={adding} onClick={() => void confirmToCart()}>
            {adding ? "جاري الإضافة…" : "تأكيد وإضافة للسلة"}
            <ArrowLeft />
          </button>
        </div>
      )}
    </main>
  );
};

export default OilsQuickOrder;
