import { Link, useSearchParams } from "react-router-dom";
import { ShieldCheck, Eye, Package, Grid3X3, List, ChevronLeft, ChevronRight, SlidersHorizontal, Search, X } from "lucide-react";
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

      <section id={sectionId} className={sectionClassName || "py-12 md:py-16 bg-background border-y border-border"}>
        <div className="container mx-auto px-4">
          {/* Section title */}
          {sectionTitle && (
            <div className="text-center mb-10">
              {sectionTitle}
            </div>
          )}

          {/* Dealer banners */}

          {isDealer && (
            <div className={`rounded-xl p-3.5 mb-4 flex items-center justify-between flex-wrap gap-3 border ${limitReached ? "bg-destructive/5 border-destructive/20" : "bg-muted/50 border-primary/15"}`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${limitReached ? "bg-destructive/10" : "bg-primary/10"}`}>
                  <Eye className="w-4 h-4 text-primary" />
                </div>
                <p className="text-foreground text-sm">
                  {limitReached
                    ? <><strong>استنفدت الحد اليومي.</strong> يمكنك مشاهدة أسعار جديدة غداً.</>
                    : <>شاهدت <strong>{dailyViewCount}</strong> من <strong>{dailyLimit}</strong> صنف اليوم</>
                  }
                </p>
              </div>
            </div>
          )}

          {/* Search bar + controls */}
          <div className="flex items-center gap-2 mb-5">
            <ProductSearchAutocomplete
              value={filters.search}
              onChange={(v) => setFilters(prev => ({ ...prev, search: v }))}
              products={products as any}
              onProductClick={(p) => setSelectedProduct(p)}
              onCommandPaletteOpen={() => setCommandPaletteOpen(true)}
            />
            <Button variant="outline" className="lg:hidden gap-2 shrink-0 h-11" onClick={() => setSidebarOpen(true)}>
              <SlidersHorizontal className="w-4 h-4" />
              <span className="hidden sm:inline">فلاتر</span>
            </Button>
            <Select value={filters.sortBy || "newest"} onValueChange={(v) => setFilters(prev => ({ ...prev, sortBy: v }))}>
              <SelectTrigger className="w-[130px] h-11 text-xs bg-card shrink-0">
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

          {/* Active search filter banner */}
          {filters.search && !isLoading && (
            <div className="mb-5 rounded-xl bg-primary/5 border border-primary/20 px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Search className="w-4.5 h-4.5 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">
                    نتائج البحث عن "<span className="text-primary">{filters.search}</span>"
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    تم العثور على <span className="font-bold text-primary">{filteredProducts.length}</span> منتج
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-muted-foreground hover:text-destructive shrink-0 gap-1.5 text-xs"
                onClick={() => {
                  setFilters(prev => ({ ...prev, search: "" }));
                }}
              >
                <X className="w-3.5 h-3.5" />
                مسح
              </Button>
            </div>
          )}

          {/* Extra content before grid */}
          {beforeGrid}

          {/* Sidebar + Products Grid */}
          <div className="flex gap-6 items-start">
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
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground font-medium">
                  {isLoading ? "جاري التحميل..." : <><span className="text-foreground font-bold">{filteredProducts.length}</span> منتج</>}
                </p>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                    <button onClick={() => setViewMode("grid")} className={`p-2 rounded-md transition-all ${viewMode === "grid" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                      <Grid3X3 className="w-4 h-4" />
                    </button>
                    <button onClick={() => setViewMode("list")} className={`p-2 rounded-md transition-all ${viewMode === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">{paginatedProducts.length} من {filteredProducts.length} منتج</p>
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

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-10">
                  <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => { setCurrentPage((p: number) => p - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="gap-1">
                    <ChevronRight className="w-4 h-4" />السابق
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                      let page: number;
                      if (totalPages <= 7) page = i + 1;
                      else if (currentPage <= 4) page = i + 1;
                      else if (currentPage >= totalPages - 3) page = totalPages - 6 + i;
                      else page = currentPage - 3 + i;
                      return (
                        <button key={page} onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                          className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${currentPage === page ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                          {page}
                        </button>
                      );
                    })}
                  </div>
                  <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => { setCurrentPage((p: number) => p + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="gap-1">
                    التالي<ChevronLeft className="w-4 h-4" />
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
