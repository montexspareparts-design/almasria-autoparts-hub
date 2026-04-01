import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useProductListing } from "@/hooks/useProductListing";
import ProductListingSection from "@/components/ProductListingSection";
import CategoryBrowseSlider from "@/components/CategoryBrowseSlider";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import {
  ShoppingCart, Save, Loader2, Trash2, X, FileText, Minus, Plus, Package,
} from "lucide-react";

interface QuoteItem {
  product: any;
  quantity: number;
  unit_price: number;
}

interface DealerProductSearchProps {
  onNavigateToOrders?: () => void;
}

const DealerProductSearch = ({ onNavigateToOrders }: DealerProductSearchProps) => {
  const listing = useProductListing();
  const { user } = useAuth();
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [showQuotePanel, setShowQuotePanel] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleAddToQuote = useCallback((product: any) => {
    setQuoteItems(prev => {
      const existing = prev.find(q => q.product.id === product.id);
      if (existing) {
        toast({ title: "تم تحديث الكمية", description: product.name_ar });
        return prev.map(q =>
          q.product.id === product.id ? { ...q, quantity: q.quantity + 1 } : q
        );
      }
      toast({ title: "✅ تمت الإضافة لعرض الأسعار", description: product.name_ar });
      return [...prev, {
        product,
        quantity: product.min_order_qty || 1,
        unit_price: listing.getProductPrice(product),
      }];
    });
  }, [listing.getProductPrice]);

  const updateQty = (productId: string, delta: number) => {
    setQuoteItems(prev =>
      prev.map(q => {
        if (q.product.id !== productId) return q;
        const newQty = Math.max(1, q.quantity + delta);
        return { ...q, quantity: newQty };
      })
    );
  };

  const removeItem = (productId: string) => {
    setQuoteItems(prev => prev.filter(q => q.product.id !== productId));
  };

  const totalAmount = quoteItems.reduce((s, q) => s + q.unit_price * q.quantity, 0);

  const handleSaveQuote = async () => {
    if (!user || quoteItems.length === 0) return;
    setSaving(true);
    try {
      const quoteNumber = `QT-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.floor(Math.random() * 9000 + 1000)}`;

      const { data: quote, error: quoteError } = await supabase
        .from("dealer_quotes")
        .insert({
          user_id: user.id,
          quote_number: quoteNumber,
          status: "draft",
          total_amount: totalAmount,
          notes: null,
        })
        .select("id")
        .single();

      if (quoteError) throw quoteError;

      const itemsToInsert = quoteItems.map(q => ({
        quote_id: quote.id,
        product_id: q.product.id,
        quantity: q.quantity,
        unit_price: q.unit_price,
        total_price: q.unit_price * q.quantity,
      }));

      const { error: itemsError } = await supabase
        .from("dealer_quote_items")
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      toast({ title: "✅ تم حفظ عرض الأسعار", description: `رقم العرض: ${quoteNumber} — ${quoteItems.length} صنف` });
      setQuoteItems([]);
      setShowQuotePanel(false);
    } catch (e: any) {
      toast({ title: "خطأ في الحفظ", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4 relative">
      <ProductListingSection
        filters={listing.filters}
        setFilters={listing.setFilters}
        viewMode={listing.viewMode}
        setViewMode={listing.setViewMode}
        hasMore={listing.hasMore}
        loadMore={listing.loadMore}
        products={listing.products}
        isLoading={listing.isLoading}
        filteredProducts={listing.filteredProducts}
        paginatedProducts={listing.paginatedProducts}
        visibleCategories={listing.visibleCategories}
        categoryCounts={listing.categoryCounts}
        user={listing.user}
        isDealer={listing.isDealer}
        viewedProductIds={listing.viewedProductIds}
        dailyViewCount={listing.dailyViewCount}
        limitReached={listing.limitReached}
        dailyLimit={listing.DAILY_LIMIT}
        getProductPrice={listing.getProductPrice}
        handleAddToCart={handleAddToQuote}
        handleLoginRequired={listing.handleLoginRequired}
        recordView={listing.recordView}
        selectedProduct={listing.selectedProduct}
        setSelectedProduct={listing.setSelectedProduct}
        getDialogPrice={listing.getDialogPrice}
        getDialogPriceLabel={listing.getDialogPriceLabel}
        canAddToCartDialog={listing.canAddToCartDialog}
        sidebarOpen={listing.sidebarOpen}
        setSidebarOpen={listing.setSidebarOpen}
        commandPaletteOpen={listing.commandPaletteOpen}
        setCommandPaletteOpen={listing.setCommandPaletteOpen}
        showBrands
        sectionTitle={
          <h2 className="text-lg font-bold text-foreground">ابحث عن القطعة</h2>
        }
        beforeGrid={<CategoryBrowseSlider />}
      />

      {/* Floating Quote Bar */}
      <AnimatePresence>
        {quoteItems.length > 0 && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95vw] max-w-[600px]"
          >
            <div className="bg-card border border-primary/30 rounded-2xl shadow-2xl shadow-primary/10 p-3 flex items-center justify-between gap-3">
              <button
                onClick={() => setShowQuotePanel(!showQuotePanel)}
                className="flex items-center gap-2 flex-1 min-w-0"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-primary" />
                </div>
                <div className="text-right min-w-0">
                  <p className="text-sm font-bold text-foreground">
                    عرض أسعار ({quoteItems.length} صنف)
                  </p>
                  <p className="text-xs text-muted-foreground">
                    الإجمالي: {totalAmount.toLocaleString("ar-EG")} ج.م
                  </p>
                </div>
              </button>
              <div className="flex items-center gap-2 shrink-0">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => { setQuoteItems([]); setShowQuotePanel(false); }}
                  className="h-9 w-9 p-0 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveQuote}
                  disabled={saving}
                  className="gap-1.5 text-xs h-9"
                >
                  {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                  حفظ العرض
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Quote Items Panel */}
      <AnimatePresence>
        {showQuotePanel && quoteItems.length > 0 && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60]"
              onClick={() => setShowQuotePanel(false)}
            />
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-[61] bg-card border-t border-border rounded-t-2xl max-h-[70vh] flex flex-col"
            >
              {/* Panel Header */}
              <div className="flex items-center justify-between p-4 border-b border-border shrink-0">
                <div className="flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  <h3 className="text-sm font-bold text-foreground">
                    عرض الأسعار — {quoteItems.length} صنف
                  </h3>
                </div>
                <button onClick={() => setShowQuotePanel(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Items */}
              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {quoteItems.map(item => (
                  <div
                    key={item.product.id}
                    className="flex items-center gap-3 p-2.5 rounded-xl border border-border/50 bg-muted/20"
                  >
                    <div className="w-10 h-10 rounded-lg bg-white border border-border overflow-hidden shrink-0">
                      {item.product.image_url ? (
                        <img src={item.product.image_url} alt="" className="w-full h-full object-contain p-1" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-4 h-4 text-muted-foreground/20" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-foreground truncate">{item.product.name_ar}</p>
                      <p className="text-[10px] font-mono text-muted-foreground">{item.product.sku}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => updateQty(item.product.id, -1)}
                        className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-foreground hover:bg-muted-foreground/20"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.product.id, 1)}
                        className="w-6 h-6 rounded-md bg-muted flex items-center justify-center text-foreground hover:bg-muted-foreground/20"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-left shrink-0 w-20">
                      <p className="text-xs font-bold text-primary">
                        {(item.unit_price * item.quantity).toLocaleString("ar-EG")} ج.م
                      </p>
                    </div>
                    <button
                      onClick={() => removeItem(item.product.id)}
                      className="text-muted-foreground hover:text-destructive shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

              {/* Panel Footer */}
              <div className="p-4 border-t border-border shrink-0 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">الإجمالي</p>
                  <p className="text-lg font-black text-foreground">
                    {totalAmount.toLocaleString("ar-EG")} ج.م
                  </p>
                </div>
                <Button onClick={handleSaveQuote} disabled={saving} className="gap-2">
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  حفظ عرض الأسعار
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DealerProductSearch;
