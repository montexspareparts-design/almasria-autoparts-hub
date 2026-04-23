import { useCallback, useRef, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProductListing } from "@/hooks/useProductListing";
import ProductListingSection from "@/components/ProductListingSection";
import CategoryBrowseSlider from "@/components/CategoryBrowseSlider";
import DealerBestSellers from "@/components/dealer/DealerBestSellers";
import { toast } from "@/hooks/use-toast";
import { useDealerCart } from "@/hooks/useDealerCart";
import { ShoppingCart, ArrowLeft, Home, X, ChevronLeft } from "lucide-react";
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

  const handleCategorySelect = useCallback((categoryId: string, _categoryName: string) => {
    listing.setFilters((prev: any) => ({ ...prev, categoryId, search: "", brandKey: null }));
    // Smooth scroll to products grid after a short delay to let the filter apply
    setTimeout(() => {
      productsAnchorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, [listing.setFilters]);

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
            className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95vw] max-w-[520px]"
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
                <div className="text-right min-w-0">
                  <p className="text-sm font-black leading-tight">أكمل الطلبية</p>
                  <p className="text-[11px] opacity-85 mt-0.5">
                    {cart.items.length} صنف · {cart.itemCount} قطعة
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <div className="text-left">
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
