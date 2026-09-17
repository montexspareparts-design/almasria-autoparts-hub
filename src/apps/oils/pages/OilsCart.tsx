import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Minus, Plus, ShoppingBag, Trash2, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDealerCart } from "@/hooks/useDealerCart";
import { useOilsCatalog } from "@/lib/oils/useOilsCatalog";
import { generateOrderNumber } from "@/lib/orderNumber";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { haptic } from "@/lib/haptics";
import TransparentProductImage from "../components/TransparentProductImage";

const PICKUP_BRANCHES = [
  { value: "ossim", label: "فرع أوسيم" },
  { value: "luxor", label: "فرع الأقصر" },
  { value: "tawfiqia", label: "فرع التوفيقية" },
] as const;

const OilsCart = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const cart = useDealerCart();
  const { products, loading: catalogLoading, priceAtQty } = useOilsCatalog();
  const [pickupBranch, setPickupBranch] = useState(() => localStorage.getItem("oils_pickup_branch") || "");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const productMap = useMemo(() => new Map(products.map((product) => [product.id, product])), [products]);
  const items = useMemo(
    () => cart.items.flatMap((item) => {
      const product = productMap.get(item.product_id);
      return product ? [{ ...item, oilProduct: product }] : [];
    }),
    [cart.items, productMap],
  );
  const total = useMemo(
    () => items.reduce((sum, item) => sum + priceAtQty(item.oilProduct, item.quantity) * item.quantity, 0),
    [items, priceAtQty],
  );

  const changeQuantity = async (productId: string, requested: number) => {
    const item = items.find((entry) => entry.product_id === productId);
    if (!item) return;
    const available = Math.max(0, item.product.stock_quantity - item.product.safety_stock);
    const cap = item.product.max_order_cap ? Math.min(available, item.product.max_order_cap) : available;
    const minimum = Math.max(1, item.product.min_order_qty || 1);
    const quantity = Math.max(minimum, Math.min(requested, cap));
    if (cap <= 0) {
      toast({ title: "الصنف غير متاح حاليًا", variant: "destructive" });
      return;
    }
    await cart.updateQuantity(productId, quantity);
    void haptic("light");
  };

  const createOrderAndPay = async () => {
    if (!user || items.length === 0 || submitting) return;
    if (!pickupBranch) {
      toast({ title: "اختر فرع الاستلام أولًا", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const orderNumber = await generateOrderNumber();
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert({
          user_id: user.id,
          order_number: orderNumber,
          total_amount: total,
          status: "awaiting_payment",
          payment_method: "geidea",
          pickup_branch: pickupBranch,
          notes: notes.trim() || null,
          shipping_cost: 0,
        })
        .select("id, order_number")
        .single();
      if (orderError || !order) throw orderError || new Error("ORDER_CREATE_FAILED");

      const { error: itemsError } = await supabase.from("order_items").insert(
        items.map((item) => {
          const unitPrice = priceAtQty(item.oilProduct, item.quantity);
          return {
            order_id: order.id,
            product_id: item.product_id,
            quantity: item.quantity,
            unit_price: unitPrice,
            total_price: unitPrice * item.quantity,
          };
        }),
      );
      if (itemsError) {
        await supabase.from("orders").delete().eq("id", order.id).eq("user_id", user.id);
        throw itemsError;
      }

      localStorage.setItem("oils_pickup_branch", pickupBranch);
      localStorage.setItem("oils_pending_payment_order", order.id);
      navigate(`/oils/payment/${order.id}`);
    } catch (error) {
      console.error("Oils order creation failed", error);
      toast({ title: "تعذر تجهيز الطلب", description: "لم يتم خصم أي مبلغ. حاول مرة أخرى.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (cart.loading || catalogLoading) {
    return <main className="oils-screen oils-cart-loading" aria-label="جاري تحميل السلة"><ShoppingBag /></main>;
  }

  if (items.length === 0) {
    return (
      <main className="oils-screen oils-cart-empty" dir="rtl">
        <div className="oils-cart-empty-mark"><ShoppingBag /></div>
        <span>سلتك جاهزة لأول طلبية</span>
        <h1>اختر الزيوت المناسبة لنشاطك</h1>
        <p>أضف الأصناف من الكتالوج، ثم راجع الكميات والأسعار هنا قبل الدفع.</p>
        <button type="button" className="oils-btn-primary" onClick={() => navigate("/oils/catalog")}>تصفّح الكتالوج <ChevronLeft /></button>
        <button type="button" className="oils-cart-quick-link" onClick={() => navigate("/oils/quick")}><Zap /> طلب سريع بالكود</button>
      </main>
    );
  }

  return (
    <main className="oils-screen oils-cart" dir="rtl">
      <header className="oils-page-header">
        <div><span className="oils-eyebrow">مراجعة الطلبية</span><h1>السلة</h1></div>
        <button type="button" className="oils-circle-button oils-cart-clear" aria-label="تفريغ السلة" onClick={() => void cart.clearCart()}><Trash2 /></button>
      </header>

      <section className="oils-cart-items" aria-label="أصناف السلة">
        {items.map((item) => {
          const unitPrice = priceAtQty(item.oilProduct, item.quantity);
          return (
            <article className="oils-cart-item" key={item.id}>
              <div className="oils-cart-item-image">
                {item.oilProduct.image_url ? <TransparentProductImage src={item.oilProduct.image_url} alt={item.oilProduct.name_ar} /> : <ShoppingBag />}
              </div>
              <div className="oils-cart-item-main">
                <h2>{item.oilProduct.name_ar}</h2>
                <div className="oils-cart-codes">
                  <span>كود الصنف <b dir="ltr">{item.oilProduct.erp_item_code || item.oilProduct.sku}</b></span>
                  <span>بارت نمبر <b dir="ltr">{item.oilProduct.part_number || "—"}</b></span>
                </div>
                <strong className="oils-num">{unitPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })} <small>ج.م / قطعة</small></strong>
              </div>
              <button type="button" className="oils-cart-remove" aria-label={`حذف ${item.oilProduct.name_ar}`} onClick={() => void cart.removeItem(item.product_id)}><Trash2 /></button>
              <div className="oils-cart-item-footer">
                <div className="oils-cart-stepper">
                  <button type="button" aria-label="تقليل الكمية" onClick={() => void changeQuantity(item.product_id, item.quantity - 1)}><Minus /></button>
                  <b className="oils-num">{item.quantity}</b>
                  <button type="button" aria-label="زيادة الكمية" onClick={() => void changeQuantity(item.product_id, item.quantity + 1)}><Plus /></button>
                </div>
                <strong className="oils-num">{(unitPrice * item.quantity).toLocaleString("en-US", { maximumFractionDigits: 2 })} ج.م</strong>
              </div>
            </article>
          );
        })}
      </section>

      <section className="oils-checkout-panel">
        <h2>الاستلام والدفع</h2>
        <label className="oils-label" htmlFor="oils-branch">فرع الاستلام</label>
        <div className="oils-branch-options" id="oils-branch">
          {PICKUP_BRANCHES.map((branch) => (
            <button key={branch.value} type="button" className={pickupBranch === branch.value ? "is-active" : ""} onClick={() => setPickupBranch(branch.value)}>{branch.label}</button>
          ))}
        </div>
        <label className="oils-label" htmlFor="oils-notes">ملاحظات للمخزن (اختياري)</label>
        <textarea id="oils-notes" className="oils-cart-notes" value={notes} maxLength={500} onChange={(event) => setNotes(event.target.value)} placeholder="أي تفاصيل مهمة للتجهيز…" />
        <div className="oils-order-summary">
          <div><span>قيمة الأصناف</span><b className="oils-num">{total.toLocaleString("en-US", { maximumFractionDigits: 2 })} ج.م</b></div>
          <div><span>الضريبة</span><b>لا توجد</b></div>
          <div className="oils-order-total"><span>الإجمالي</span><strong className="oils-num">{total.toLocaleString("en-US", { maximumFractionDigits: 2 })} ج.م</strong></div>
        </div>
        <button type="button" className="oils-btn-primary oils-pay-button" disabled={submitting} onClick={() => void createOrderAndPay()}>
          {submitting ? "جاري تجهيز الدفع…" : "المتابعة للدفع الآمن"} <ChevronLeft />
        </button>
        <p className="oils-secure-note">لن تُفرغ السلة ولن يُؤكد الطلب إلا بعد نجاح الدفع.</p>
      </section>
    </main>
  );
};

export default OilsCart;