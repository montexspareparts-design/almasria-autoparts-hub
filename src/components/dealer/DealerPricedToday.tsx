import { useState, useEffect, useCallback, useMemo } from "react";
import { openWhatsApp } from "@/lib/native";
import { LazyImage } from "@/components/ui/lazy-image";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { generateQuotePdf } from "@/lib/generateQuotePdf";
import ProductDetailDialog from "@/components/ProductDetailDialog";
import { useDealerCart } from "@/hooks/useDealerCart";
import {
  Eye, Loader2, Download, ShoppingCart, MessageCircle,
  Package, CheckCircle2, XCircle, Clock, Info,
  Minus, Plus, Trash2, Flame, AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface PricedProduct {
  id: string;
  product_id: string;
  viewed_at: string;
  product: {
    id: string;
    name_ar: string;
    name_en: string | null;
    sku: string;
    base_price: number;
    sale_price: number | null;
    is_on_sale: boolean;
    image_url: string | null;
    stock_quantity: number;
    brand: string;
    safety_stock: number;
    max_order_cap: number | null;
  };
  tier_price?: number | null;
  quantity: number;
}

interface DealerPricedTodayProps {
  onConvertToOrder: () => void;
  sharedCart?: ReturnType<typeof useDealerCart>;
}

const DealerPricedToday = ({ onConvertToOrder, sharedCart }: DealerPricedTodayProps) => {
  const { user, dealerAccount } = useAuth();
  const fallbackCart = useDealerCart();
  const { addItem: addToCart } = sharedCart || fallbackCart;
  const [items, setItems] = useState<PricedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [converting, setConverting] = useState(false);
  const [detailProduct, setDetailProduct] = useState<any>(null);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const fetchPricedToday = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const today = new Date().toISOString().split("T")[0];
    const { data: views } = await supabase
      .from("dealer_price_views")
      .select("id, product_id, viewed_at")
      .eq("user_id", user.id)
      .eq("view_date", today)
      .order("viewed_at", { ascending: false });

    if (!views || views.length === 0) { setItems([]); setLoading(false); return; }

    const productIds = views.map(v => v.product_id);
    const { data: products } = await supabase
      .from("products")
      .select("id, name_ar, name_en, sku, base_price, sale_price, is_on_sale, image_url, stock_quantity, brand, safety_stock, max_order_cap")
      .in("id", productIds);

    let tierPricesMap: Record<string, number> = {};
    if (dealerAccount?.tier) {
      const { data: tierPrices } = await supabase
        .from("product_tier_prices")
        .select("product_id, price")
        .eq("tier", dealerAccount.tier as any)
        .in("product_id", productIds);
      if (tierPrices) tierPrices.forEach(tp => { tierPricesMap[tp.product_id] = tp.price; });
    }

    const productsMap = new Map((products || []).map(p => [p.id, p]));
    const merged: PricedProduct[] = views
      .filter(v => productsMap.has(v.product_id))
      .map(v => ({
        id: v.id, product_id: v.product_id, viewed_at: v.viewed_at,
        product: productsMap.get(v.product_id)!,
        tier_price: tierPricesMap[v.product_id] || null, quantity: 1,
      }));
    setItems(merged);
    setLoading(false);
  }, [user, dealerAccount]);

  useEffect(() => { fetchPricedToday(); }, [fetchPricedToday]);

  const toggleSelect = (productId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(productId) ? next.delete(productId) : next.add(productId);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelectedIds(selectedIds.size === items.length ? new Set() : new Set(items.map(i => i.product_id)));
  };

  const [qtyDir, setQtyDir] = useState<Record<string, 'up' | 'down'>>({});

  // Fetch max order percentage
  const { data: maxOrderPct } = useQuery({
    queryKey: ["site_settings", "max_order_percentage"],
    queryFn: async () => {
      const { data } = await supabase.from("site_settings").select("value").eq("key", "max_order_percentage").maybeSingle();
      return parseInt(data?.value || "25") || 25;
    },
  });

  // Compute max allowed per item
  const maxAllowedMap = useMemo(() => {
    const pct = maxOrderPct || 25;
    const map: Record<string, number> = {};
    for (const item of items) {
      const available = Math.max(0, (item.product.stock_quantity || 0) - (item.product.safety_stock || 0));
      const pctCap = Math.max(1, Math.floor(available * pct / 100));
      map[item.product_id] = item.product.max_order_cap ? Math.min(pctCap, item.product.max_order_cap) : pctCap;
    }
    return map;
  }, [items, maxOrderPct]);

  const updateQuantity = (productId: string, delta: number) => {
    setQtyDir(prev => ({ ...prev, [productId]: delta > 0 ? 'up' : 'down' }));
    setItems(prev => prev.map(item => {
      if (item.product_id !== productId) return item;
      const max = maxAllowedMap[productId] || 999;
      const newQty = Math.max(1, item.quantity + delta);
      if (newQty > max) {
        toast({ title: `الحد الأقصى ${max} قطعة`, description: item.product.name_ar });
        return { ...item, quantity: max };
      }
      return { ...item, quantity: newQty };
    }));
  };

  const setQuantity = (productId: string, newQty: number) => {
    const max = maxAllowedMap[productId] || 999;
    const clamped = Math.min(Math.max(1, newQty), max);
    if (newQty > max) {
      const item = items.find(i => i.product_id === productId);
      if (item) toast({ title: `الحد الأقصى ${max} قطعة`, description: item.product.name_ar });
    }
    setItems(prev => prev.map(item => item.product_id !== productId ? item : { ...item, quantity: clamped }));
  };

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(item => item.product_id !== productId));
    setSelectedIds(prev => { const next = new Set(prev); next.delete(productId); return next; });
    toast({ title: "🗑️ تم إزالة الصنف" });
  };

  const getEffectivePrice = (item: PricedProduct) => {
    if (item.tier_price) return item.tier_price;
    if (item.product.is_on_sale && item.product.sale_price) return item.product.sale_price;
    return item.product.base_price;
  };

  const selectedItems = items.filter(i => selectedIds.has(i.product_id));
  const selectedTotal = selectedItems.reduce((sum, i) => sum + getEffectivePrice(i) * i.quantity, 0);
  const allTotal = items.reduce((s, i) => s + getEffectivePrice(i) * i.quantity, 0);

  const handleAddToCart = async (product: any, quantity: number = 1) => {
    await addToCart(product.id, quantity);
    toast({
      title: "✅ تمت الإضافة للسلة",
      description: `${product.name_ar} × ${quantity}`,
      action: <button onClick={onConvertToOrder} className="text-xs font-bold text-primary hover:underline whitespace-nowrap">فتح السلة ←</button>,
    });
  };

  const handleConvertToOrder = async () => {
    if (selectedItems.length === 0) { toast({ title: "اختر أصناف أولاً", variant: "destructive" }); return; }
    setConverting(true);
    for (const item of selectedItems) await addToCart(item.product_id, item.quantity);
    toast({
      title: "✅ تمت إضافة الأصناف للسلة",
      description: `${selectedItems.length} صنف`,
      action: <button onClick={onConvertToOrder} className="text-xs font-bold text-primary hover:underline whitespace-nowrap">فتح السلة ←</button>,
    });
    setConverting(false);
    onConvertToOrder();
  };

  const handleShareWhatsApp = () => {
    const itemsToShare = selectedItems.length > 0 ? selectedItems : items;
    if (itemsToShare.length === 0) return;
    const lines = ["📋 *عرض سعر — المصرية جروب*", `التاريخ: ${new Date().toLocaleDateString("ar-EG")}`, "", "━━━━━━━━━━━━━━━━━━━━━━"];
    itemsToShare.forEach((item, idx) => {
      const price = getEffectivePrice(item);
      lines.push(`${idx + 1}. ${item.product.name_ar}`, `   رقم القطعة: ${item.product.sku}`, `   الكمية: ${item.quantity}`, `   السعر: ${(price * item.quantity).toLocaleString("en-US")} ج.م`);
    });
    const total = itemsToShare.reduce((s, i) => s + getEffectivePrice(i) * i.quantity, 0);
    lines.push("━━━━━━━━━━━━━━━━━━━━━━", `💰 *الإجمالي: ${total.toLocaleString("en-US")} ج.م*`, "", "— المصرية جروب لقطع غيار وزيوت تويوتا");
    openWhatsApp(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`);
  };

  const handleDownloadPdf = async () => {
    const itemsToExport = selectedItems.length > 0 ? selectedItems : items;
    if (itemsToExport.length === 0) return;
    setDownloadingPdf(true);
    try {
      const totalAmount = itemsToExport.reduce((s, i) => s + getEffectivePrice(i) * i.quantity, 0);
      await generateQuotePdf({
        quoteNumber: `QP-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}`,
        date: new Date().toLocaleDateString("ar-EG"),
        items: itemsToExport.map(item => ({ name: item.product.name_ar, sku: item.product.sku, quantity: item.quantity, unitPrice: getEffectivePrice(item), totalPrice: getEffectivePrice(item) * item.quantity })),
        totalAmount,
      });
      toast({ title: "✅ تم تحميل عرض السعر PDF" });
    } catch { toast({ title: "خطأ في تحميل PDF", variant: "destructive" }); }
    finally { setDownloadingPdf(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground me-2">جاري التحميل...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {items.length === 0 ? (
        <div className="text-center py-16 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
            <Eye className="w-8 h-8 text-muted-foreground/40" />
          </div>
          <h3 className="text-lg font-bold text-foreground">لم يتم تسعير أي صنف اليوم</h3>
          <p className="text-sm text-muted-foreground">ابحث عن قطع الغيار وسعّرها لتظهر هنا</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Sticky Header */}
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-4 border-b border-border/40">
            <div className="flex flex-col gap-3">
              {/* Title Row */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-black text-foreground">عرض سعر</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {items.length} صنف تم تسعيره — {new Date().toLocaleDateString("ar-EG")}
                  </p>
                </div>
                <Badge variant="secondary" className="text-[11px] gap-1 h-7">
                  <Eye className="w-3.5 h-3.5" />
                  {items.length} / 20 صنف
                </Badge>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <Button variant="outline" size="sm" onClick={handleShareWhatsApp} className="gap-1.5 text-xs h-8">
                  <MessageCircle className="w-3.5 h-3.5 text-green-600" />
                  واتساب
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={downloadingPdf} className="gap-1.5 text-xs h-8">
                  {downloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                  تحميل PDF
                </Button>
                <Button
                  size="sm"
                  onClick={handleConvertToOrder}
                  disabled={selectedIds.size === 0 || converting}
                  className="gap-1.5 text-xs h-8 me-auto"
                >
                  {converting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShoppingCart className="w-3.5 h-3.5" />}
                  أضف للسلة ({selectedIds.size})
                </Button>
              </div>

              {/* Select All */}
              <div className="flex items-center gap-3">
                <button onClick={toggleSelectAll} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <div className={cn(
                    "w-4 h-4 rounded border-2 flex items-center justify-center transition-colors",
                    selectedIds.size === items.length ? "bg-primary border-primary" : "border-muted-foreground/30"
                  )}>
                    {selectedIds.size === items.length && <CheckCircle2 className="w-3 h-3 text-primary-foreground" />}
                  </div>
                  تحديد الكل
                </button>
                {selectedIds.size > 0 && (
                  <span className="text-xs text-primary font-bold">
                    {selectedIds.size} محدد — {selectedTotal.toLocaleString("ar-EG")} ج.م
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Items List — Redesigned Cards */}
          <div className="space-y-3">
            <AnimatePresence>
              {items.map((item, idx) => {
                const price = getEffectivePrice(item);
                const isSelected = selectedIds.has(item.product_id);
                const inStock = item.product.stock_quantity > 0;
                const viewedTime = new Date(item.viewed_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 80, height: 0, marginBottom: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className={cn(
                      "rounded-xl border bg-card p-3 sm:p-4 transition-all duration-200 cursor-pointer",
                      isSelected
                        ? "border-primary/30 bg-primary/[0.02] shadow-sm"
                        : "border-border/40 hover:border-border/60"
                    )}
                    onClick={() => toggleSelect(item.product_id)}
                  >
                    <div className="flex gap-3">
                      {/* Checkbox */}
                      <button onClick={(e) => { e.stopPropagation(); toggleSelect(item.product_id); }} className="shrink-0 mt-1">
                        <div className={cn(
                          "w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all",
                          isSelected
                            ? "bg-primary border-primary scale-105"
                            : "border-muted-foreground/25 hover:border-muted-foreground/50"
                        )}>
                          {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />}
                        </div>
                      </button>

                      {/* Image */}
                      <LazyImage
                        src={item.product.image_url}
                        alt={item.product.name_ar}
                        wrapperClassName="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-muted/40 shrink-0 border border-border/30"
                        className="w-full h-full object-cover"
                      />

                      {/* Info */}
                      <div className="flex-1 min-w-0 space-y-2">
                        {/* Title + Delete */}
                        <div className="flex items-start justify-between gap-2">
                          <h3 className="text-sm font-bold text-foreground leading-snug line-clamp-2">{item.product.name_ar}</h3>
                          
                          {/* Delete Button — Prominent Trash Icon */}
                          <button
                            onClick={(e) => { e.stopPropagation(); removeItem(item.product_id); }}
                            className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-muted-foreground/50 hover:text-destructive hover:bg-destructive/10 active:scale-95 transition-all"
                            title="حذف الصنف"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>

                        {/* SKU + Stock + Velocity */}
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">{item.product.sku}</span>
                          <span className={cn(
                            "inline-flex items-center gap-0.5 text-[10px] font-semibold",
                            inStock ? "text-emerald-600" : "text-destructive"
                          )}>
                            {inStock ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {inStock ? "متوفر" : "نفد"}
                          </span>
                          {/* Stock Velocity Badge — urgency indicator */}
                          {inStock && item.product.stock_quantity > 0 && item.product.stock_quantity <= 5 && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-destructive/10 text-destructive border border-destructive/30 animate-pulse">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              آخر {item.product.stock_quantity} قطع
                            </span>
                          )}
                          {inStock && item.product.stock_quantity > 5 && item.product.stock_quantity <= 15 && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/30">
                              <Flame className="w-2.5 h-2.5" />
                              سريع البيع
                            </span>
                          )}
                        </div>

                        {/* Bottom Row: Price + Quantity + Actions */}
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          {/* Price */}
                          <p className="text-base font-black text-primary whitespace-nowrap">
                            {(price * item.quantity).toLocaleString("ar-EG")} ج.م
                          </p>

                          <div className="flex items-center gap-2">
                            {/* Time */}
                            <span className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground">
                              <Clock className="w-3 h-3" /> {viewedTime}
                            </span>

                            {/* Details */}
                            <button
                              onClick={(e) => { e.stopPropagation(); setDetailProduct(item.product); }}
                              className="text-[11px] text-primary hover:text-primary/80 font-semibold flex items-center gap-0.5 transition-colors"
                            >
                              <Info className="w-3 h-3" /> التفاصيل
                            </button>

                            {/* Quantity */}
                            <div className="flex items-center bg-muted/50 rounded-full overflow-hidden border border-border/50">
                              <button
                                onClick={(e) => { e.stopPropagation(); updateQuantity(item.product_id, -1); }}
                                className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all active:scale-90"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <div className="w-10 h-8 border-x border-border/50 overflow-hidden relative">
                                <AnimatePresence mode="popLayout" initial={false}>
                                  <motion.div
                                    key={`qty-${item.product_id}-${item.quantity}`}
                                    initial={{ y: (qtyDir[item.product_id] || 'up') === 'up' ? 10 : -10, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: (qtyDir[item.product_id] || 'up') === 'up' ? -10 : 10, opacity: 0 }}
                                    transition={{ type: "spring", stiffness: 500, damping: 30, mass: 0.5 }}
                                    className="absolute inset-0 flex items-center justify-center"
                                  >
                                    <input
                                      type="number"
                                      value={item.quantity}
                                      onClick={(e) => e.stopPropagation()}
                                      onChange={(e) => {
                                        e.stopPropagation();
                                        const val = parseInt(e.target.value);
                                        if (!isNaN(val)) setQuantity(item.product_id, val);
                                      }}
                                      className="w-full h-full text-center text-sm font-bold text-foreground bg-transparent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none focus:outline-none"
                                    />
                                  </motion.div>
                                </AnimatePresence>
                              </div>
                              <button
                                onClick={(e) => { e.stopPropagation(); updateQuantity(item.product_id, 1); }}
                                className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all active:scale-90"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {/* Summary Footer */}
          <div className="rounded-xl bg-muted/30 border border-border/40 p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground">إجمالي جميع الأصناف</p>
              <p className="text-lg font-black text-foreground mt-0.5">{allTotal.toLocaleString("ar-EG")} ج.م</p>
            </div>
          </div>
        </div>
      )}

      {/* Product Detail Dialog */}
      <ProductDetailDialog
        product={detailProduct}
        open={!!detailProduct}
        onOpenChange={(open) => { if (!open) setDetailProduct(null); }}
        price={detailProduct ? getEffectivePrice({ product: detailProduct, tier_price: items.find(i => i.product_id === detailProduct.id)?.tier_price, quantity: 1 } as PricedProduct) : null}
        priceLabel="سعر الجملة الخاص بك"
        canAddToCart
        isLoggedIn={!!user}
        isDealer={!!dealerAccount}
        onAddToCart={(product) => {
          const item = items.find(i => i.product_id === product.id);
          handleAddToCart(product, item?.quantity || 1);
          setDetailProduct(null);
        }}
      />
    </div>
  );
};

export default DealerPricedToday;
