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
  Package, CheckCircle2, XCircle, Clock, Info,
  Minus, Plus, X
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

interface SavedQuote {
  id: string;
  quote_number: string;
  status: string;
  total_amount: number;
  notes: string | null;
  created_at: string;
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
  const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>([]);
  const [loadingQuotes, setLoadingQuotes] = useState(true);
  const [convertingQuoteId, setConvertingQuoteId] = useState<string | null>(null);
  const [expandedQuoteId, setExpandedQuoteId] = useState<string | null>(null);
  const [expandedQuoteItems, setExpandedQuoteItems] = useState<any[]>([]);
  const [loadingQuoteItems, setLoadingQuoteItems] = useState(false);

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
      .select("id, name_ar, name_en, sku, base_price, sale_price, is_on_sale, image_url, stock_quantity, brand")
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

  const fetchSavedQuotes = useCallback(async () => {
    if (!user) return;
    setLoadingQuotes(true);
    const { data } = await supabase
      .from("dealer_quotes").select("*").eq("user_id", user.id)
      .order("created_at", { ascending: false }).limit(20);
    setSavedQuotes((data as SavedQuote[]) || []);
    setLoadingQuotes(false);
  }, [user]);

  useEffect(() => { fetchPricedToday(); fetchSavedQuotes(); }, [fetchPricedToday, fetchSavedQuotes]);

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

  const updateQuantity = (productId: string, delta: number) => {
    setItems(prev => prev.map(item => item.product_id !== productId ? item : { ...item, quantity: Math.max(1, item.quantity + delta) }));
  };

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(item => item.product_id !== productId));
    setSelectedIds(prev => { const next = new Set(prev); next.delete(productId); return next; });
    toast({ title: "تم إزالة الصنف" });
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
    toast({ title: "✅ تمت الإضافة للسلة", description: `${product.name_ar} × ${quantity}` });
  };

  const handleConvertToOrder = async () => {
    if (selectedItems.length === 0) { toast({ title: "اختر أصناف أولاً", variant: "destructive" }); return; }
    setConverting(true);
    for (const item of selectedItems) await addToCart(item.product_id, item.quantity);
    toast({ title: "✅ تمت إضافة الأصناف للسلة", description: `${selectedItems.length} صنف` });
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
        items: itemsToExport.map(item => ({ name: item.product.name_ar, sku: item.product.sku, quantity: item.quantity, unitPrice: getEffectivePrice(item), totalPrice: getEffectivePrice(item) * item.quantity })),
        totalAmount,
      });
      toast({ title: "✅ تم تحميل عرض السعر PDF" });
    } catch { toast({ title: "خطأ في تحميل PDF", variant: "destructive" }); }
    finally { setDownloadingPdf(false); }
  };

  // === Saved Quotes ===
  const handleConvertQuoteToOrder = async (quote: SavedQuote) => {
    if (!user) return;
    setConvertingQuoteId(quote.id);
    const { data: qItems } = await supabase.from("dealer_quote_items").select("product_id, quantity, unit_price, total_price").eq("quote_id", quote.id);
    if (!qItems || qItems.length === 0) { toast({ title: "العرض فارغ", variant: "destructive" }); setConvertingQuoteId(null); return; }
    for (const item of qItems) await addToCart(item.product_id, item.quantity);
    await supabase.from("dealer_quotes").update({ status: "converted" }).eq("id", quote.id);
    toast({ title: "✅ تم إضافة أصناف العرض للسلة", description: `${qItems.length} صنف من عرض ${quote.quote_number}` });
    setConvertingQuoteId(null);
    fetchSavedQuotes();
    onConvertToOrder();
  };

  const handleDeleteQuote = async (quoteId: string) => {
    await supabase.from("dealer_quote_items").delete().eq("quote_id", quoteId);
    await supabase.from("dealer_quotes").delete().eq("id", quoteId);
    toast({ title: "تم حذف العرض" });
    if (expandedQuoteId === quoteId) { setExpandedQuoteId(null); setExpandedQuoteItems([]); }
    fetchSavedQuotes();
  };

  const toggleExpandQuote = async (quoteId: string) => {
    if (expandedQuoteId === quoteId) { setExpandedQuoteId(null); setExpandedQuoteItems([]); return; }
    setExpandedQuoteId(quoteId);
    setLoadingQuoteItems(true);
    const { data: qItems } = await supabase.from("dealer_quote_items").select("id, product_id, quantity, unit_price, total_price").eq("quote_id", quoteId);
    if (!qItems || qItems.length === 0) { setExpandedQuoteItems([]); setLoadingQuoteItems(false); return; }
    const productIds = qItems.map(i => i.product_id);
    const { data: products } = await supabase.from("products").select("id, name_ar, sku, image_url").in("id", productIds);
    const productMap = new Map((products || []).map(p => [p.id, p]));
    setExpandedQuoteItems(qItems.map(qi => ({ ...qi, product: productMap.get(qi.product_id) })));
    setLoadingQuoteItems(false);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "converted": return <Badge className="bg-emerald-500/10 text-emerald-700 text-[10px]">تم التحويل لطلبية</Badge>;
      case "sent": return <Badge className="bg-blue-500/10 text-blue-700 text-[10px]">تم الإرسال</Badge>;
      default: return <Badge className="bg-yellow-500/10 text-yellow-700 text-[10px]">مسودة</Badge>;
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

  return (
    <div className="space-y-8">
      {/* === Today's Priced Items === */}
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
          <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm pb-3 border-b border-border/40">
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
                  className="gap-1.5 text-xs h-8 mr-auto"
                >
                  {converting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShoppingCart className="w-3.5 h-3.5" />}
                  أضف للسلة ({selectedIds.size})
                </Button>
              </div>

              {/* Select All */}
              <div className="flex items-center gap-3">
                <button onClick={toggleSelectAll} className="flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
                  <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ${selectedIds.size === items.length ? "bg-primary border-primary" : "border-muted-foreground/30"}`}>
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

          {/* Items List */}
          <div className="divide-y divide-border/30">
            <AnimatePresence>
              {items.map((item, idx) => {
                const price = getEffectivePrice(item);
                const isSelected = selectedIds.has(item.product_id);
                const inStock = item.product.stock_quantity > 0;
                const viewedTime = new Date(item.viewed_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });

                return (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: 80, height: 0 }}
                    transition={{ delay: idx * 0.02 }}
                    className="py-3 first:pt-0"
                  >
                    <div className="flex items-start gap-3">
                      {/* Right side: Image */}
                      <div className="w-14 h-14 rounded-xl bg-muted/40 overflow-hidden shrink-0 border border-border/30">
                        {item.product.image_url ? (
                          <img src={item.product.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-muted-foreground/25" />
                          </div>
                        )}
                      </div>

                      {/* Middle: Info */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <p className="text-sm font-bold text-foreground leading-tight">{item.product.name_ar}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-[11px] font-mono text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">{item.product.sku}</span>
                          <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${inStock ? "text-emerald-600" : "text-destructive"}`}>
                            {inStock ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                            {inStock ? "متوفر" : "نفد"}
                          </span>
                        </div>

                        {/* Quantity + Actions row */}
                        <div className="flex items-center gap-3 flex-wrap">
                          {/* Quantity */}
                          <div className="flex items-center gap-1 bg-muted/50 rounded-lg p-0.5">
                            <button onClick={() => updateQuantity(item.product_id, 1)} className="w-7 h-7 rounded-md bg-background flex items-center justify-center text-foreground hover:bg-accent transition-colors shadow-sm">
                              <Plus className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-bold w-8 text-center text-foreground">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.product_id, -1)} className="w-7 h-7 rounded-md bg-background flex items-center justify-center text-foreground hover:bg-accent transition-colors shadow-sm">
                              <Minus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Time */}
                          <span className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <Clock className="w-3 h-3" /> {viewedTime}
                          </span>

                          {/* Details */}
                          <button
                            onClick={() => setDetailProduct(item.product)}
                            className="text-[11px] text-primary hover:text-primary/80 font-semibold flex items-center gap-0.5 transition-colors"
                          >
                            <Info className="w-3 h-3" /> التفاصيل
                          </button>
                        </div>
                      </div>

                      {/* Left side: Price + Checkbox + Delete */}
                      <div className="shrink-0 flex flex-col items-end gap-2">
                        <div className="flex items-center gap-2">
                          {/* Delete */}
                          <button
                            onClick={() => removeItem(item.product_id)}
                            className="w-7 h-7 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                            title="إزالة الصنف"
                          >
                            <X className="w-4 h-4" />
                          </button>
                          {/* Checkbox */}
                          <button onClick={() => toggleSelect(item.product_id)}>
                            <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${isSelected ? "bg-primary border-primary" : "border-muted-foreground/25"}`}>
                              {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-primary-foreground" />}
                            </div>
                          </button>
                        </div>
                        <p className="text-sm font-black text-primary whitespace-nowrap">
                          {(price * item.quantity).toLocaleString("ar-EG")} ج.م
                        </p>
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

      {/* === Saved Quotes Section === */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-black text-foreground">عروض الأسعار المحفوظة</h2>
        </div>

        {loadingQuotes ? (
          <div className="flex items-center justify-center py-8"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
        ) : savedQuotes.length === 0 ? (
          <div className="text-center py-8 border border-border/50 rounded-xl bg-muted/20">
            <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">لا توجد عروض أسعار محفوظة</p>
          </div>
        ) : (
          <div className="space-y-2">
            {savedQuotes.map((quote) => (
              <motion.div key={quote.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border/50 bg-card overflow-hidden">
                <div className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/30 transition-colors" onClick={() => toggleExpandQuote(quote.id)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-foreground">{quote.quote_number}</span>
                      {getStatusBadge(quote.status)}
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-[10px] text-muted-foreground">{new Date(quote.created_at).toLocaleDateString("ar-EG")}</span>
                      <span className="text-xs font-bold text-primary">{Number(quote.total_amount).toLocaleString("ar-EG")} ج.م</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {quote.status !== "converted" && (
                      <Button size="sm" variant="default" className="gap-1 text-[10px] h-7 px-2" disabled={convertingQuoteId === quote.id} onClick={(e) => { e.stopPropagation(); handleConvertQuoteToOrder(quote); }}>
                        {convertingQuoteId === quote.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowRight className="w-3 h-3" />}
                        تحويل لطلبية
                      </Button>
                    )}
                    {quote.status === "draft" && (
                      <Button size="sm" variant="ghost" className="text-destructive h-7 w-7 p-0" onClick={(e) => { e.stopPropagation(); handleDeleteQuote(quote.id); }}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                <AnimatePresence>
                  {expandedQuoteId === quote.id && (
                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="border-t border-border/30 overflow-hidden">
                      {loadingQuoteItems ? (
                        <div className="flex items-center justify-center py-4"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>
                      ) : expandedQuoteItems.length === 0 ? (
                        <p className="text-xs text-muted-foreground p-3 text-center">العرض فارغ</p>
                      ) : (
                        <div className="p-2 space-y-1">
                          {expandedQuoteItems.map((qi: any) => (
                            <div key={qi.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/20">
                              <div className="w-8 h-8 rounded bg-muted/50 overflow-hidden shrink-0">
                                {qi.product?.image_url ? <img src={qi.product.image_url} alt="" className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><Package className="w-3.5 h-3.5 text-muted-foreground/30" /></div>}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-semibold text-foreground truncate">{qi.product?.name_ar || qi.product_id}</p>
                                <span className="text-[10px] font-mono text-muted-foreground">{qi.product?.sku || "—"}</span>
                              </div>
                              <span className="text-[10px] text-muted-foreground">×{qi.quantity}</span>
                              <span className="text-xs font-bold text-primary">{Number(qi.total_price).toLocaleString("ar-EG")} ج.م</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
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
