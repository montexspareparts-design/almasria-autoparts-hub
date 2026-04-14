import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useProductListing } from "@/hooks/useProductListing";
import ProductListingSection from "@/components/ProductListingSection";
import CategoryBrowseSlider from "@/components/CategoryBrowseSlider";
import { toast } from "@/hooks/use-toast";
import { useDealerCart } from "@/hooks/useDealerCart";
import { ShoppingCart, ArrowLeft } from "lucide-react";
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
          <CategoryBrowseSlider
            onCategorySelect={(categoryName) => {
              listing.setFilters((prev: any) => ({ ...prev, search: categoryName, categoryId: null, brandKey: null }));
            }}
          />
        }
      />

      {/* Floating Cart Bar */}
      <AnimatePresence>
        {cart.itemCount > 0 && onNavigateToCart && (
          <motion.div
            initial={{ y: 80, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 80, opacity: 0 }}
            className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 z-50 w-[95vw] max-w-[500px]"
          >
            <button
              onClick={onNavigateToCart}
              className="w-full bg-primary text-primary-foreground rounded-2xl shadow-2xl shadow-primary/20 p-3.5 flex items-center justify-between gap-3 hover:bg-primary/90 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary-foreground/15 flex items-center justify-center shrink-0 relative">
                  <ShoppingCart className="w-5 h-5" />
                  <Badge className="absolute -top-1.5 -right-1.5 bg-primary-foreground text-primary text-[10px] px-1.5 py-0 h-4 min-w-4 flex items-center justify-center">
                    {cart.itemCount}
                  </Badge>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">أكمل الطلبية</p>
                  <p className="text-xs opacity-80">{cart.itemCount} صنف في السلة</p>
                </div>
              </div>
              <ArrowLeft className="w-5 h-5 opacity-70" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default DealerProductSearch;
