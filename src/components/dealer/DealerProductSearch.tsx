import { useCallback, useRef, useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProductListing } from "@/hooks/useProductListing";
import ProductListingSection from "@/components/ProductListingSection";
import CategoryBrowseSlider from "@/components/CategoryBrowseSlider";
import DealerBestSellers from "@/components/dealer/DealerBestSellers";
import { toast } from "@/hooks/use-toast";
import { useDealerCart } from "@/hooks/useDealerCart";
import { ShoppingCart, ArrowLeft, Home, X, ChevronLeft, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ToastAction } from "@/components/ui/toast";
interface DealerProductSearchProps {
  onNavigateToOrders?: () => void;
  onNavigateToCart?: () => void;
  sharedCart?: ReturnType<typeof useDealerCart>;
}

const DealerProductSearch = ({ onNavigateToOrders, onNavigateToCart, sharedCart }: DealerProductSearchProps) => {
  const listing = useProductListing();
  const fallbackCart = useDealerCart();
  const cart = sharedCart || fallbackCart;
  const productsAnchorRef = useRef<HTMLDivElement>(null);
  const [pendingCategoryId, setPendingCategoryId] = useState<string | null>(null);

  const handleCategorySelect = useCallback((categoryId: string, _categoryName: string) => {
    setPendingCategoryId(categoryId);
    listing.setFilters((prev: any) => ({ ...prev, categoryId, search: "", brandKey: null }));
    // Smooth scroll to products grid after a short delay to let the filter apply
    setTimeout(() => {
      productsAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, [listing.setFilters]);

  // Clear pending indicator once the filter actually applies (or after a short safety timeout)
  useEffect(() => {
    if (!pendingCategoryId) return;
    if (listing.filters?.categoryId === pendingCategoryId && !listing.isLoading) {
      const t = setTimeout(() => setPendingCategoryId(null), 250);
      return () => clearTimeout(t);
    }
    const safety = setTimeout(() => setPendingCategoryId(null), 2500);
    return () => clearTimeout(safety);
  }, [pendingCategoryId, listing.filters?.categoryId, listing.isLoading]);

  const handleAddToCart = useCallback(async (product: any) => {
    try {
      await cart.addItem(product.id, product.min_order_qty || 1);
      toast({
        title: "✅ تمت الإضافة للطلبية",
        description: product.name_ar,
        action: onNavigateToCart ? (
          <ToastAction altText="فتح السلة" onClick={onNavigateToCart}>
            فتح السلة
          </ToastAction>
        ) : undefined,
      });
    } catch {
      toast({ title: "خطأ في الإضافة", variant: "destructive" });
    }
  }, [cart.addItem, onNavigateToCart]);

  const activeCategoryId = listing.filters?.categoryId || null;
  const activeCategoryName = useMemo(() => {
    if (!activeCategoryId) return null;
    const c = (listing.visibleCategories || []).find((x: any) => x.id === activeCategoryId);
    return c?.name_ar || null;
  }, [activeCategoryId, listing.visibleCategories]);

  const clearCategory = useCallback(() => {
    listing.setFilters((prev: any) => ({ ...prev, categoryId: null }));
  }, [listing.setFilters]);

  return (
    <div className="space-y-4 relative">
      {/* Top progress bar — shows while a category filter is being applied */}
      <AnimatePresence>
        {pendingCategoryId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[60] h-0.5 bg-primary/20 overflow-hidden"
          >
            <motion.div
              initial={{ x: "-40%" }}
              animate={{ x: "120%" }}
              transition={{ duration: 1, repeat: Infinity, ease: "easeInOut" }}
              className="h-full w-2/5 bg-primary shadow-[0_0_8px_hsl(var(--primary))]"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active category breadcrumb — appears when a category is selected */}
      <AnimatePresence>
        {activeCategoryName && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="container mx-auto px-4"
          >
            <nav
              dir="rtl"
              aria-label="مسار التصفح"
              className="flex items-center gap-2 text-xs sm:text-sm bg-primary/5 border border-primary/20 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 shadow-sm"
            >
              <button
                onClick={clearCategory}
                className="flex items-center gap-1 text-muted-foreground hover:text-primary transition-colors font-medium"
              >
                <Home className="w-3.5 h-3.5" />
                <span>كل الفئات</span>
              </button>
              <ChevronLeft className="w-3.5 h-3.5 text-muted-foreground/60 shrink-0" />
              <span className="font-extrabold text-primary truncate flex-1">{activeCategoryName}</span>
              {pendingCategoryId && (
                <span className="flex items-center gap-1 text-[10px] sm:text-xs text-primary/80 font-semibold shrink-0">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  جاري التحميل…
                </span>
              )}
              <button
                onClick={clearCategory}
                aria-label="إزالة الفلتر"
                className="shrink-0 w-6 h-6 rounded-full bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

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
        isRetailTier={listing.isRetailTier}
        viewedProductIds={listing.viewedProductIds}
        dailyViewCount={listing.dailyViewCount}
        limitReached={listing.limitReached}
        dailyLimit={listing.DAILY_LIMIT}
        getProductPrice={listing.getProductPrice}
        handleAddToCart={handleAddToCart}
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
        beforeGrid={
          <>
            <CategoryBrowseSlider
              onCategorySelect={handleCategorySelect}
              activeCategoryId={activeCategoryId}
              pendingCategoryId={pendingCategoryId}
            />
            <div ref={productsAnchorRef} aria-hidden className="scroll-mt-24" />
          </>
        }
      />

      {/* الأكثر طلباً — يظهر دائماً في الأسفل لتسهيل الوصول السريع للأصناف الرائجة */}
      <div className="container mx-auto px-4">
        <DealerBestSellers
          isRTL={true}
          onAddToOrder={(p) => handleAddToCart({ ...p, min_order_qty: 1 })}
        />
      </div>

      {/* Floating Cart Bar — with running total */}
      <AnimatePresence>
        {cart.itemCount > 0 && onNavigateToCart && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom)+0.5rem)] lg:bottom-6 left-1/2 -translate-x-1/2 z-40 w-[94vw] max-w-[520px] px-2"
          >
            <button
              onClick={onNavigateToCart}
              className="w-full bg-primary text-primary-foreground rounded-2xl shadow-2xl shadow-primary/30 p-3.5 flex items-center justify-between gap-3 hover:bg-primary/90 transition-all hover:scale-[1.01] active:scale-[0.99]"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-xl bg-primary-foreground/15 flex items-center justify-center shrink-0 relative">
                  <ShoppingCart className="w-5 h-5" />
                  <Badge className="absolute -top-1.5 -right-1.5 bg-primary-foreground text-primary text-[10px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center font-black">
                    {cart.itemCount}
                  </Badge>
                </div>
                <div className="text-end min-w-0">
                  <p className="text-sm font-black leading-tight">أكمل الطلبية</p>
                  <p className="text-[11px] opacity-85 mt-0.5">
                    {cart.items.length} صنف · {cart.itemCount} قطعة
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-start">
                  <p className="text-[10px] opacity-75 leading-none mb-0.5">إجمالي</p>
                  <p className="text-sm font-black tabular-nums">
                    {cart.items.reduce((s: number, i: any) => s + i.product.base_price * i.quantity, 0).toLocaleString("ar-EG")} ج.م
                  </p>
                </div>
                <ArrowLeft className="w-5 h-5 opacity-70" />
              </div>
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DealerProductSearch;
