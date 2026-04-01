import { Link, useSearchParams } from "react-router-dom";
import { toast } from "@/hooks/use-toast";
import { ShieldCheck, Eye, Package, Grid3X3, List, ChevronLeft, SlidersHorizontal, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProductCard from "@/components/ProductCard";
import ProductFilterSidebar from "@/components/ProductFilterSidebar";
import ProductSearchAutocomplete from "@/components/ProductSearchAutocomplete";
import ProductCommandPalette from "@/components/ProductCommandPalette";
import ProductDetailDialog from "@/components/ProductDetailDialog";
import { ProductFilters } from "@/components/AdvancedProductFilter";

interface ProductListingSectionProps {
  // From useProductListing hook
  filters: ProductFilters;
  setFilters: (filters: ProductFilters | ((prev: ProductFilters) => ProductFilters)) => void;
  viewMode: "grid" | "list";
  setViewMode: (mode: "grid" | "list") => void;
  hasMore: boolean;
  loadMore: () => void;
  products: any[] | undefined;
  isLoading: boolean;
  filteredProducts: any[];
  paginatedProducts: any[];
  visibleCategories: any[] | undefined;
  categoryCounts: Record<string, number>;
  user: any;
  isDealer: boolean;
  viewedProductIds: string[];
  dailyViewCount: number;
  limitReached: boolean;
  dailyLimit: number;
  getProductPrice: (product: any) => number;
  handleAddToCart: (product: any) => void;
  handleLoginRequired: () => void;
  recordView: (productId: string) => void;
  selectedProduct: any;
  setSelectedProduct: (product: any) => void;
  getDialogPrice: (product: any) => number | null;
  getDialogPriceLabel: (product: any) => string | undefined;
  canAddToCartDialog: (product: any) => boolean;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  commandPaletteOpen: boolean;
  setCommandPaletteOpen: (open: boolean) => void;
  /** Show brand filter in sidebar */
  showBrands?: boolean;
  /** Additional content before the product grid (e.g., PersonalizedProducts) */
  beforeGrid?: React.ReactNode;
  /** Section heading */
  sectionTitle?: React.ReactNode;
  /** Section ID for anchor links */
  sectionId?: string;
  /** Section className override */
  sectionClassName?: string;
}

const ProductListingSection = ({
  filters, setFilters, viewMode, setViewMode,
  hasMore, loadMore,
  products, isLoading, filteredProducts, paginatedProducts,
  visibleCategories, categoryCounts,
  user, isDealer, viewedProductIds, dailyViewCount, limitReached, dailyLimit,
  getProductPrice, handleAddToCart, handleLoginRequired, recordView,
  selectedProduct, setSelectedProduct,
  getDialogPrice, getDialogPriceLabel, canAddToCartDialog,
  sidebarOpen, setSidebarOpen, commandPaletteOpen, setCommandPaletteOpen,
  showBrands = false, beforeGrid, sectionTitle, sectionId, sectionClassName,
}: ProductListingSectionProps) => {
  const clearFilters = () => {
    setFilters({
      search: "", model: null, year: null, chassisNumber: "", partNumber: "",
      categoryId: null, brandKey: null, priceMin: "", priceMax: "", sortBy: "newest",
    });
  };

  return (
    <>
      {/* Command Palette */}
      <ProductCommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        products={products as any}
        onProductSelect={(p) => setSelectedProduct(p)}
      />

      <section id={sectionId} className={sectionClassName || "py-3 md:py-5 bg-background"}>
        <div className="container mx-auto px-4">
          {/* Premium toolbar */}
          <div
            className="flex items-center gap-2.5 mb-4 p-2.5 rounded-2xl bg-card/80 backdrop-blur-sm border border-border/60 shadow-sm relative z-[55] cursor-text"
            onClick={(e) => {
              // If tapping on the toolbar background (not a button/select), focus the search input
              const target = e.target as HTMLElement;
              if (target.tagName === 'DIV' || target.tagName === 'SECTION') {
                const searchInput = e.currentTarget.querySelector<HTMLInputElement>('input[type="text"], input[placeholder]');
                if (searchInput) searchInput.focus();
              }
            }}
          >
              value={filters.search}
              onChange={(v) => setFilters(prev => ({ ...prev, search: v }))}
              products={products as any}
              onProductClick={(p) => setSelectedProduct(p)}
              onAddToQuote={(p) => {
                recordView(p.id);
                toast({ title: "✅ تم التسعير بنجاح", description: p.name_ar || "تم إضافة المنتج لقائمة التسعير", className: "bg-green-50 border-green-200 dark:bg-green-950/50 dark:border-green-800 text-green-900 dark:text-green-100" });
              }}
              onCommandPaletteOpen={() => setCommandPaletteOpen(true)}
              isDealer={isDealer}
            />

            {/* Dealer daily view counter — premium golden pill */}
            {isDealer && (
              <div
                className={`shrink-0 flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-bold border-2 transition-all duration-300 shadow-sm ${
                  limitReached
                    ? "bg-gradient-to-r from-amber-500/15 via-yellow-300/25 to-amber-500/15 bg-[length:200%_100%] animate-shimmer-gold border-amber-400/40 text-amber-800 dark:text-amber-300 shadow-amber-500/10"
                    : "bg-gradient-to-br from-amber-50 to-amber-100/80 dark:from-amber-900/20 dark:to-amber-800/10 border-amber-300/40 dark:border-amber-600/30 text-amber-800 dark:text-amber-300"
                }`}
                title={limitReached ? "استنفدت الحد اليومي" : `شاهدت ${dailyViewCount} من ${dailyLimit} صنف`}
              >
                <Eye className="w-4 h-4" />
                <span className="tabular-nums tracking-wide">{dailyViewCount}<span className="text-amber-500/60 mx-0.5">/</span>{dailyLimit}</span>
              </div>
            )}

            <Button variant="outline" className="lg:hidden gap-1.5 shrink-0 h-10 text-xs rounded-xl border-border/60" onClick={() => setSidebarOpen(true)}>
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">فلاتر</span>
            </Button>
            <Select value={filters.sortBy || "newest"} onValueChange={(v) => setFilters(prev => ({ ...prev, sortBy: v }))}>
              <SelectTrigger className="w-[120px] h-10 text-xs bg-background/80 shrink-0 rounded-xl border-border/60 font-medium">
                <SelectValue placeholder="ترتيب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">الأحدث</SelectItem>
                <SelectItem value="price_asc">السعر: الأقل</SelectItem>
                <SelectItem value="price_desc">السعر: الأعلى</SelectItem>
                <SelectItem value="name_asc">الاسم: أ - ي</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Active search filter banner - hidden, results show inline */}

          {/* Extra content before grid */}
          {beforeGrid}

          {/* Sidebar + Products Grid */}
          <div className="flex gap-4 items-start">
            <ProductFilterSidebar
              filters={filters}
              onFiltersChange={setFilters}
              categories={visibleCategories}
              categoryCounts={categoryCounts}
              showBrands={showBrands}
              totalResults={filteredProducts.length}
              isLoading={isLoading}
              isOpen={sidebarOpen}
              onToggle={() => setSidebarOpen(!sidebarOpen)}
            />

            <div className="flex-1 min-w-0">
              {/* Results count + view toggle */}
              <div className="flex items-center justify-between mb-2.5">
                <p className="text-xs text-muted-foreground">
                  {isLoading ? "جاري التحميل..." : <><span className="text-foreground font-bold">{filteredProducts.length}</span> منتج</>}
                </p>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center bg-muted rounded-md p-0.5">
                    <button onClick={() => setViewMode("grid")} className={`p-1.5 rounded transition-all ${viewMode === "grid" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                      <Grid3X3 className="w-3.5 h-3.5" />
                    </button>
                    <button onClick={() => setViewMode("list")} className={`p-1.5 rounded transition-all ${viewMode === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                      <List className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Loading state */}
              {isLoading ? (
                <div className={viewMode === "grid" ? "grid grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
                      <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                      <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                      <div className="h-3 bg-muted rounded w-1/3" />
                    </div>
                  ))}
                </div>
              ) : paginatedProducts.length === 0 ? (
                /* Empty state */
                <div className="text-center py-24">
                  <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-5">
                    <Package className="w-10 h-10 text-muted-foreground/30" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">لا توجد منتجات</h3>
                  <p className="text-muted-foreground text-sm mb-4">جرب تغيير كلمة البحث أو الفلتر</p>
                  <Button variant="outline" size="sm" onClick={clearFilters}>مسح جميع الفلاتر</Button>
                </div>
              ) : (
                /* Product grid */
                <div className={viewMode === "grid" ? "grid grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
                  {paginatedProducts.map((product, i) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      index={i}
                      viewMode={viewMode}
                      user={user}
                      isDealer={isDealer}
                      viewedProductIds={viewedProductIds}
                      limitReached={limitReached}
                      dailyViewCount={dailyViewCount}
                      dailyLimit={dailyLimit}
                      getProductPrice={getProductPrice}
                      onProductClick={setSelectedProduct}
                      onAddToCart={handleAddToCart}
                      onRecordView={recordView}
                      onLoginRequired={handleLoginRequired}
                    />
                  ))}
                </div>
              )}

              {/* Load More */}
              {hasMore && (
                <div className="flex flex-col items-center gap-3 mt-10">
                  <p className="text-sm text-muted-foreground">
                    عرض {paginatedProducts.length} من {filteredProducts.length} منتج
                  </p>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={loadMore}
                    className="gap-2 px-8 rounded-full border-primary/30 text-primary hover:bg-primary hover:text-primary-foreground transition-all"
                  >
                    تحميل المزيد
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Product Detail Dialog */}
      <ProductDetailDialog
        product={selectedProduct}
        open={!!selectedProduct}
        onOpenChange={(open) => { if (!open) setSelectedProduct(null); }}
        price={getDialogPrice(selectedProduct)}
        priceLabel={getDialogPriceLabel(selectedProduct)}
        canAddToCart={canAddToCartDialog(selectedProduct)}
        onAddToCart={handleAddToCart}
        isLoggedIn={!!user}
        isDealer={isDealer}
        onLoginPrompt={handleLoginRequired}
        onRevealPrice={(productId) => recordView(productId)}
        remainingViews={dailyLimit - dailyViewCount}
        limitReached={limitReached}
      />
    </>
  );
};

export default ProductListingSection;
