import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Boxes, Building2, ChevronLeft, MapPin, MessageSquareText, Minus, PackageCheck, Plus, ReceiptText, ShieldCheck, ShoppingBag, Sparkles, Tag, Trash2, Truck, Zap } from "lucide-react";
import { cartonLabel, unitsPerCarton } from "@/lib/oils/cartons";
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

type FulfillmentMethod = "pickup" | "shipping";

type RegisteredAddress = {
  governorate: string;
  detailedAddress: string;
};

const OilsCart = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const cart = useDealerCart();
  const { products, loading: catalogLoading, priceAtQty } = useOilsCatalog();
  const [fulfillmentMethod, setFulfillmentMethod] = useState<FulfillmentMethod>(() => localStorage.getItem("oils_fulfillment_method") === "shipping" ? "shipping" : "pickup");
  const [pickupBranch, setPickupBranch] = useState(() => localStorage.getItem("oils_pickup_branch") || "");
  const [registeredAddress, setRegisteredAddress] = useState<RegisteredAddress | null>(null);
  const [addressLoading, setAddressLoading] = useState(false);
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

  useEffect(() => {
    if (!user) {
      setRegisteredAddress(null);
      return;
    }

    let active = true;
    setAddressLoading(true);
    void supabase
      .from("dealer_applications")
      .select("governorate, detailed_address")
      .eq("user_id", user.id)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        const governorate = data?.governorate?.trim();
        const detailedAddress = data?.detailed_address?.trim();
        setRegisteredAddress(governorate && detailedAddress ? { governorate, detailedAddress } : null);
        setAddressLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user]);

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
    if (fulfillmentMethod === "pickup" && !pickupBranch) {
      toast({ title: "اختر فرع الاستلام أولًا", variant: "destructive" });
      return;
    }
    if (fulfillmentMethod === "shipping" && !registeredAddress) {
      toast({ title: "العنوان المسجل غير متاح", description: "يرجى استكمال عنوان حسابك قبل اختيار الشحن.", variant: "destructive" });
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
          pickup_branch: fulfillmentMethod === "pickup" ? pickupBranch : null,
          shipping_address: fulfillmentMethod === "shipping" ? registeredAddress?.detailedAddress : null,
          shipping_governorate: fulfillmentMethod === "shipping" ? registeredAddress?.governorate : null,
          notes: notes.trim() || null,
          shipping_cost: 0,
          source: "oils",
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

      if (couponCode.trim()) {
        const { data: couponResult } = await supabase.rpc("apply_oils_coupon", {
          _order_id: order.id,
          _code: couponCode.trim(),
        });
        const result = (couponResult || {}) as { ok?: boolean; error?: string; discount?: number };
        if (result.ok) {
          toast({ title: "تم تطبيق كود الخصم", description: `وفّرت ${Number(result.discount || 0).toLocaleString("en-US")} ج.م` });
        } else {
          toast({ title: COUPON_ERRORS[result.error || ""] || "كود الخصم غير صالح", description: "الطلب اتجهز بدون خصم.", variant: "destructive" });
        }
      }

      localStorage.setItem("oils_fulfillment_method", fulfillmentMethod);
      if (fulfillmentMethod === "pickup") localStorage.setItem("oils_pickup_branch", pickupBranch);
      localStorage.setItem("oils_pending_payment_order", order.id);
      if (order.order_number) localStorage.setItem("oils_pending_payment_order_number", String(order.order_number));
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
        <div><span className="oils-eyebrow">مراجعة الطلبية</span><h1>السلة</h1><p className="oils-cart-count-label">{items.length} {items.length === 1 ? "صنف" : "أصناف"} جاهزة للمراجعة</p></div>
        <button type="button" className="oils-circle-button oils-cart-clear" aria-label="تفريغ السلة" onClick={() => void cart.clearCart()}><Trash2 /></button>
      </header>

      <ol className="oils-cart-steps" aria-label="خطوات الطلب">
        <li className="is-done"><i>1</i>المراجعة</li>
        <li className="is-active"><i>2</i>الاستلام</li>
        <li><i>3</i>الدفع</li>
      </ol>

      <section className="oils-cart-boost" aria-live="polite">
        <div className="oils-cart-boost-bar"><i style={{ width: `${Math.min(100, (total / FREE_SHIPPING_THRESHOLD) * 100)}%` }} /></div>
        <p>
          {freeShippingReached
            ? "مبروك — طلبيتك وصلت حد الشحن المجاني 🎉"
            : `ناقصك ${(FREE_SHIPPING_THRESHOLD - total).toLocaleString("en-US", { maximumFractionDigits: 0 })} ج.م للشحن المجاني`}
        </p>
        {nextDiscountHint ? <span className="oils-cart-boost-hint"><Sparkles /> {nextDiscountHint}</span> : null}
      </section>

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
                <div className="oils-cart-line-total"><span>إجمالي الصنف</span><strong className="oils-num">{(unitPrice * item.quantity).toLocaleString("en-US", { maximumFractionDigits: 2 })} ج.م</strong></div>
              </div>
              {(() => {
                const perCarton = unitsPerCarton(item.oilProduct.name_ar, item.oilProduct.name_en);
                const label = cartonLabel(item.quantity, perCarton);
                return (
                  <div className="oils-cart-carton">
                    <span className="oils-cart-carton-info"><Boxes /> {label ? label : `الكرتونة = ${perCarton} عبوة`}</span>
                    <div className="oils-cart-carton-actions">
                      <button type="button" onClick={() => void changeQuantity(item.product_id, item.quantity - perCarton)}>− كرتونة</button>
                      <button type="button" onClick={() => void changeQuantity(item.product_id, item.quantity + perCarton)}>+ كرتونة</button>
                    </div>
                  </div>
                );
              })()}
            </article>
          );
        })}
      </section>

      <section className="oils-checkout-panel">
        <div className="oils-checkout-title"><span><PackageCheck /></span><div><small>الخطوة الأخيرة</small><h2>الاستلام والدفع</h2></div></div>
        <label className="oils-label oils-label--icon"><MapPin /> طريقة استلام الطلب</label>
        <div className="oils-fulfillment-options" role="radiogroup" aria-label="طريقة استلام الطلب">
          <button type="button" role="radio" aria-checked={fulfillmentMethod === "pickup"} className={fulfillmentMethod === "pickup" ? "is-active" : ""} onClick={() => setFulfillmentMethod("pickup")}>
            <span><Building2 /></span><b>استلام من الفرع</b><small>تختار الفرع الأنسب لك</small>
          </button>
          <button type="button" role="radio" aria-checked={fulfillmentMethod === "shipping"} className={fulfillmentMethod === "shipping" ? "is-active" : ""} onClick={() => setFulfillmentMethod("shipping")}>
            <span><Truck /></span><b>شحن إلى عنواني</b><small>تدفع الشحن للشركة عند الاستلام</small>
          </button>
        </div>
        {fulfillmentMethod === "pickup" ? (
          <div className="oils-fulfillment-detail">
            <label className="oils-label oils-label--icon" htmlFor="oils-branch"><Building2 /> اختر فرع الاستلام</label>
            <div className="oils-branch-options" id="oils-branch">
              {PICKUP_BRANCHES.map((branch) => (
                <button key={branch.value} type="button" className={pickupBranch === branch.value ? "is-active" : ""} onClick={() => setPickupBranch(branch.value)}>{branch.label}</button>
              ))}
            </div>
          </div>
        ) : (
          <div className="oils-shipping-address" aria-live="polite">
            <span><MapPin /></span>
            <div>
              <small>العنوان المسجل</small>
              {addressLoading ? <p>جاري تحميل العنوان…</p> : registeredAddress ? <><b>{registeredAddress.governorate}</b><p>{registeredAddress.detailedAddress}</p></> : <p className="is-missing">لا يوجد عنوان مسجل مكتمل في حسابك.</p>}
            </div>
          </div>
        )}
        <label className="oils-label oils-label--icon" htmlFor="oils-notes"><MessageSquareText /> ملاحظات للمخزن <span>(اختياري)</span></label>
        <textarea id="oils-notes" className="oils-cart-notes" value={notes} maxLength={500} onChange={(event) => setNotes(event.target.value)} placeholder="أي تفاصيل مهمة للتجهيز…" />

        <label className="oils-label oils-label--icon" htmlFor="oils-coupon"><Tag /> كود خصم <span>(اختياري)</span></label>
        <div className="oils-coupon-row">
          <input
            id="oils-coupon"
            className="oils-coupon-input"
            dir="ltr"
            value={couponCode}
            maxLength={32}
            placeholder="MASRIA10"
            onChange={(event) => setCouponCode(event.target.value.toUpperCase())}
          />
          {couponCode ? <button type="button" className="oils-coupon-clear" onClick={() => setCouponCode("")}>مسح</button> : null}
        </div>
        <p className="oils-coupon-hint">الكود بيتفعّل ويتخصم تلقائيًا قبل صفحة الدفع.</p>

        <div className="oils-order-summary">
          <div className="oils-summary-heading"><span><ReceiptText /> ملخص الطلب</span><ShieldCheck /></div>
          <div><span>قيمة الأصناف</span><b className="oils-num">{total.toLocaleString("en-US", { maximumFractionDigits: 2 })} ج.م</b></div>
          <div><span>عدد الكراتين</span><b className="oils-num">{totalCartons > 0 ? totalCartons : "—"}</b></div>
          <div><span>الشحن</span><b>{fulfillmentMethod === "shipping" ? (freeShippingReached ? "مجاني ✅" : "يُدفع لشركة الشحن") : "استلام من الفرع"}</b></div>
          <div><span>الضريبة</span><b>لا توجد</b></div>
          <div className="oils-order-total"><span>الإجمالي</span><strong className="oils-num">{total.toLocaleString("en-US", { maximumFractionDigits: 2 })} ج.م</strong></div>
        </div>
        <button type="button" className="oils-btn-primary oils-pay-button" disabled={submitting} onClick={() => void createOrderAndPay()}>
          <ShieldCheck /> <span>{submitting ? "جاري تجهيز الدفع…" : "المتابعة للدفع الآمن"}</span> <span className="oils-pay-arrow"><ArrowLeft /></span>
        </button>
        <p className="oils-secure-note">لن تُفرغ السلة ولن يُؤكد الطلب إلا بعد نجاح الدفع.</p>
      </section>
    </main>
  );
};

export default OilsCart;