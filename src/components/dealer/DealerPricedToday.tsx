import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { generateQuotePdf } from "@/lib/generateQuotePdf";
import ProductDetailDialog from "@/components/ProductDetailDialog";
import { useDealerCart } from "@/hooks/useDealerCart";
import {
  Eye, Loader2, Download, ShoppingCart, MessageCircle,
  Package, CheckCircle2, XCircle, Clock, FileText, Info,
  Minus, Plus
} from "lucide-react";

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
  };
  tier_price?: number | null;
  quantity: number;
}

interface DealerPricedTodayProps {
  onConvertToOrder: () => void;
}

const DealerPricedToday = ({ onConvertToOrder }: DealerPricedTodayProps) => {
  const { user, dealerAccount } = useAuth();
  const { addItem: addToCart } = useDealerCart();
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

    if (!views || views.length === 0) {
      setItems([]);
      setLoading(false);
      return;
    }

    const productIds = views.map(v => v.product_id);

    const { data: products } = await supabase
      .from("products")
      .select("id, name_ar, name_en, sku, base_price, sale_price, is_on_sale, image_url, stock_quantity, brand")
      .in("id", productIds);

    let tierPricesMap: Record<string, number> = {};
    if (dealerAccount?.tier) {
      const { data: tierPrices } = await supabase
        .from("product_tier_prices")
        .select("product_id, price")
        .eq("tier", dealerAccount.tier as any)
        .in("product_id", productIds);

      if (tierPrices) {
        tierPrices.forEach(tp => { tierPricesMap[tp.product_id] = tp.price; });
      }
    }

    const productsMap = new Map((products || []).map(p => [p.id, p]));

    const merged: PricedProduct[] = views
      .filter(v => productsMap.has(v.product_id))
      .map(v => ({
        id: v.id,
        product_id: v.product_id,
        viewed_at: v.viewed_at,
        product: productsMap.get(v.product_id)!,
        tier_price: tierPricesMap[v.product_id] || null,
        quantity: 1,
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
    if (selectedIds.size === items.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(items.map(i => i.product_id)));
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.product_id !== productId) return item;
      const newQty = Math.max(1, item.quantity + delta);
      return { ...item, quantity: newQty };
    }));
  };

  const getEffectivePrice = (item: PricedProduct) => {
    if (item.tier_price) return item.tier_price;
    if (item.product.is_on_sale && item.product.sale_price) return item.product.sale_price;
    return item.product.base_price;
  };

  const selectedItems = items.filter(i => selectedIds.has(i.product_id));
  const selectedTotal = selectedItems.reduce((sum, i) => sum + getEffectivePrice(i) * i.quantity, 0);

  const handleAddToCart = async (product: any, quantity: number = 1) => {
    await addToCart(product.id, quantity);
    toast({
      title: "✅ تمت الإضافة للسلة",
      description: `${product.name_ar} × ${quantity}`,
    });
  };

  const handleConvertToOrder = async () => {
    if (selectedItems.length === 0) {
      toast({ title: "اختر أصناف أولاً", variant: "destructive" });
      return;
    }
    setConverting(true);

    for (const item of selectedItems) {
      await addToCart(item.product_id, item.quantity);
    }

    toast({
      title: "✅ تمت إضافة الأصناف للسلة",
      description: `${selectedItems.length} صنف — يمكنك إتمام الطلب الآن`,
    });
    setConverting(false);
    onConvertToOrder();
  };

  const handleShareWhatsApp = () => {
    const itemsToShare = selectedItems.length > 0 ? selectedItems : items;
    if (itemsToShare.length === 0) return;

    const lines = [
      "📋 *عرض سعر — المصرية جروب*",
      `التاريخ: ${new Date().toLocaleDateString("ar-EG")}`,
      "",
      "━━━━━━━━━━━━━━━━━━━━━━",
    ];

    itemsToShare.forEach((item, idx) => {
      const price = getEffectivePrice(item);
      lines.push(
        `${idx + 1}. ${item.product.name_ar}`,
        `   رقم القطعة: ${item.product.sku}`,
        `   الكمية: ${item.quantity}`,
        `   السعر: ${(price * item.quantity).toLocaleString("en-US")} ج.م`,
      );
    });

    const total = itemsToShare.reduce((s, i) => s + getEffectivePrice(i) * i.quantity, 0);
    lines.push(
      "━━━━━━━━━━━━━━━━━━━━━━",
      `💰 *الإجمالي: ${total.toLocaleString("en-US")} ج.م*`,
      "",
      "— المصرية جروب لقطع غيار وزيوت تويوتا"
    );

    window.open(`https://wa.me/?text=${encodeURIComponent(lines.join("\n"))}`, "_blank");
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
        items: itemsToExport.map(item => ({
          name: item.product.name_ar,
          sku: item.product.sku,
          quantity: item.quantity,
          unitPrice: getEffectivePrice(item),
          totalPrice: getEffectivePrice(item) * item.quantity,
        })),
        totalAmount,
      });
      toast({ title: "✅ تم تحميل عرض السعر PDF" });
    } catch {
      toast({ title: "خطأ في تحميل PDF", variant: "destructive" });
    } finally {
      setDownloadingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground mr-2">جاري التحميل...</span>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-20 space-y-3">
        <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
          <Eye className="w-8 h-8 text-muted-foreground/40" />
        </div>
        <h3 className="text-lg font-bold text-foreground">لم يتم تسعير أي صنف اليوم</h3>
        <p className="text-sm text-muted-foreground">ابحث عن قطع الغيار وسعّرها لتظهر هنا</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header & Actions Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-foreground">عرض سعر</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {items.length} صنف تم تسعيره — {new Date().toLocaleDateString("ar-EG")}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" onClick={handleShareWhatsApp} className="gap-1.5 text-xs">
            <MessageCircle className="w-3.5 h-3.5 text-green-600" />
            واتساب
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPdf} disabled={downloadingPdf} className="gap-1.5 text-xs">
            {downloadingPdf ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            تحميل PDF
          </Button>
          <Button
            size="sm"
            onClick={handleConvertToOrder}
            disabled={selectedIds.size === 0 || converting}
            className="gap-1.5 text-xs"
          >
            {converting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShoppingCart className="w-3.5 h-3.5" />}
            أضف للسلة ({selectedIds.size})
          </Button>
        </div>
      </div>

      {/* Select All */}
      <div className="flex items-center gap-3 px-1">
        <button
          onClick={toggleSelectAll}
          className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${
            selectedIds.size === items.length
              ? "bg-primary border-primary"
              : "border-muted-foreground/30"
          }`}>
            {selectedIds.size === items.length && (
              <CheckCircle2 className="w-3 h-3 text-primary-foreground" />
            )}
          </div>
          تحديد الكل
        </button>
        {selectedIds.size > 0 && (
          <span className="text-xs text-primary font-bold">
            {selectedIds.size} محدد — إجمالي: {selectedTotal.toLocaleString("ar-EG")} ج.م
          </span>
        )}
      </div>

      {/* Items List */}
      <div className="space-y-2">
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
                transition={{ delay: idx * 0.03 }}
                className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                  isSelected
                    ? "border-primary/30 bg-primary/5 shadow-sm"
                    : "border-border/50 bg-card hover:bg-muted/30"
                }`}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleSelect(item.product_id)}
                  className="shrink-0"
                >
                  <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
                    isSelected ? "bg-primary border-primary" : "border-muted-foreground/25"
                  }`}>
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />}
                  </div>
                </button>

                {/* Image */}
                <div className="w-12 h-12 rounded-lg bg-muted/50 overflow-hidden shrink-0">
                  {item.product.image_url ? (
                    <img src={item.product.image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-5 h-5 text-muted-foreground/30" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-foreground truncate">{item.product.name_ar}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] font-mono text-muted-foreground">{item.product.sku}</span>
                    <span className={`inline-flex items-center gap-0.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      inStock ? "text-emerald-700 bg-emerald-500/10" : "text-destructive bg-destructive/10"
                    }`}>
                      {inStock ? <CheckCircle2 className="w-2.5 h-2.5" /> : <XCircle className="w-2.5 h-2.5" />}
                      {inStock ? "متوفر" : "نفد"}
                    </span>
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    onClick={() => updateQuantity(item.product_id, -1)}
                    className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-foreground hover:bg-muted-foreground/20 transition-colors"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-sm font-bold w-7 text-center text-foreground">{item.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.product_id, 1)}
                    className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-foreground hover:bg-muted-foreground/20 transition-colors"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                {/* Price, Time & Actions */}
                <div className="text-left shrink-0 space-y-1">
                  <p className="text-sm font-black text-primary">{(price * item.quantity).toLocaleString("ar-EG")} ج.م</p>
                  <div className="flex items-center gap-2 justify-end">
                    <span className="flex items-center gap-1 text-[9px] text-muted-foreground">
                      <Clock className="w-2.5 h-2.5" />
                      {viewedTime}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDetailProduct(item.product);
                      }}
                      className="text-[10px] text-primary hover:text-primary/80 font-semibold flex items-center gap-0.5 transition-colors"
                    >
                      <Info className="w-3 h-3" />
                      التفاصيل
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {/* Summary Footer */}
      <div className="rounded-xl bg-muted/50 border border-border/50 p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground">إجمالي جميع الأصناف</p>
          <p className="text-lg font-black text-foreground mt-0.5">
            {items.reduce((s, i) => s + getEffectivePrice(i) * i.quantity, 0).toLocaleString("ar-EG")} ج.م
          </p>
        </div>
        <Badge variant="secondary" className="text-xs gap-1">
          <Eye className="w-3 h-3" />
          {items.length} / 20 صنف
        </Badge>
      </div>

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
