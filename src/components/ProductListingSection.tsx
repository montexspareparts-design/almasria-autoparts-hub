import { memo, useEffect, useMemo, useState } from "react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Eye, Package, Grid3X3, List, SlidersHorizontal, ChevronDown, Sparkles, Wrench, Flame, TrendingUp, X } from "lucide-react";
import { lazy, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";

const ImageSearchDialog = lazy(() => import("@/components/ImageSearchDialog"));
const VINScannerDialog = lazy(() => import("@/components/VINScannerDialog"));
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ProductCard from "@/components/ProductCard";
import ProductCardSkeleton from "@/components/ProductCardSkeleton";
import ProductFilterSidebar from "@/components/ProductFilterSidebar";
import ProductSearchAutocomplete from "@/components/ProductSearchAutocomplete";
import ProductCommandPalette from "@/components/ProductCommandPalette";
import ProductDetailDialog from "@/components/ProductDetailDialog";
import { ProductFilters } from "@/components/AdvancedProductFilter";
import WeeklyBestSellers from "@/components/WeeklyBestSellers";

interface ProductListingSectionProps {
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
  isRetailTier?: boolean;
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
  showBrands?: boolean;
  beforeGrid?: React.ReactNode;
  sectionTitle?: React.ReactNode;
  sectionId?: string;
  sectionClassName?: string;
}

const INITIAL_ROWS = 4;

// Map an Arabic search term to a relevant emoji icon
const pickIcon = (term: string): string => {
  const t = term.toLowerCase();
  if (t.includes("زيت") || t.includes("اويل")) return "🛢️";
  if (t.includes("فلتر") || t.includes("فيبر")) return "🧪";
  if (t.includes("فرامل") || t.includes("تيل")) return "🛑";
  if (t.includes("بوجي") || t.includes("بوجيه") || t.includes("دينامو") || t.includes("كهرب")) return "⚡";
  if (t.includes("بطار")) return "🔋";
  if (t.includes("اكصدام") || t.includes("صدام") || t.includes("مصد")) return "🚗";
  if (t.includes("مساعد") || t.includes("مقص") || t.includes("بلي")) return "🔩";
  if (t.includes("جوان") || t.includes("سيل") || t.includes("مياه")) return "💧";
  if (t.includes("دبرياج") || t.includes("كلتش")) return "⚙️";
  if (t.includes("كورولا") || t.includes("هاي اس") || t.includes("هايلوكس") || t.includes("كامري")) return "🚙";
  return "🔧";
};

const ProductListingSection = memo(({
  filters, setFilters, viewMode, setViewMode,
  hasMore, loadMore,
  products, isLoading, filteredProducts, paginatedProducts,
  visibleCategories, categoryCounts,
  user, isDealer, isRetailTier = false, viewedProductIds, dailyViewCount, limitReached, dailyLimit,
  getProductPrice, handleAddToCart, handleLoginRequired, recordView,
  selectedProduct, setSelectedProduct,
  getDialogPrice, getDialogPriceLabel, canAddToCartDialog,
  sidebarOpen, setSidebarOpen, commandPaletteOpen, setCommandPaletteOpen,
  showBrands = false, beforeGrid, sectionTitle, sectionId, sectionClassName,
}: ProductListingSectionProps) => {
  const [expanded, setExpanded] = useState(false);

  // Dynamic quick search suggestions based on top dealer searches
  const FALLBACK_SUGGESTIONS = useMemo(() => [
    { label: "فلتر", icon: "🛢️" },
    { label: "زيت", icon: "🛢️" },
    { label: "فرامل", icon: "🛑" },
    { label: "بوجيه", icon: "⚡" },
    { label: "تيل", icon: "🔧" },
    { label: "بطارية", icon: "🔋" },
  ], []);
  const [quickSuggestions, setQuickSuggestions] = useState(FALLBACK_SUGGESTIONS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Pull last 30 days of search logs (cap rows for perf), aggregate client-side
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
        const { data, error } = await supabase
          .from("customer_search_logs")
          .select("search_query")
          .gte("created_at", since)
          .limit(2000);
        if (error || !data || cancelled) return;

        const counts = new Map<string, number>();
        for (const row of data) {
          const raw = (row.search_query || "").trim();
          if (raw.length < 2 || raw.length > 25) continue;
          const key = raw.toLowerCase();
          counts.set(key, (counts.get(key) || 0) + 1);
        }
        const top = Array.from(counts.entries())
          .sort((a, b) => b[1] - a[1])
          .slice(0, 6)
          .map(([label]) => ({ label, icon: pickIcon(label) }));

        if (top.length >= 3 && !cancelled) setQuickSuggestions(top);
      } catch {
        // keep fallback
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const clearFilters = () => {
    setFilters({
      search: "", model: null, year: null, chassisNumber: "", partNumber: "",
      categoryId: null, brandKey: null, priceMin: "", priceMax: "", sortBy: "newest",
      maintenanceOnly: false, onSaleOnly: false, bestSellingOnly: false,
    });
    setExpanded(false);
  };

  // Reset expanded when filters change
  useEffect(() => {
    setExpanded(false);
  }, [filters.search, filters.categoryId, filters.brandKey, filters.sortBy]);

  const cols = viewMode === "grid" ? (typeof window !== "undefined" && window.innerWidth >= 1024 ? 3 : 2) : 1;
  const initialItemCount = INITIAL_ROWS * cols;

  const visibleProducts = useMemo(() => {
    if (expanded) return paginatedProducts;
    return paginatedProducts.slice(0, initialItemCount);
  }, [paginatedProducts, expanded, initialItemCount]);

  const totalRemaining = filteredProducts.length - initialItemCount;
  const showExpandButton = !expanded && paginatedProducts.length > initialItemCount;

  return (
    <>
      <ProductCommandPalette
        open={commandPaletteOpen}
        onOpenChange={setCommandPaletteOpen}
        products={products as any}
        onProductSelect={(p) => setSelectedProduct(p)}
      />

      <section id={sectionId} className={sectionClassName || "py-3 md:py-5 bg-background"}>
        <div className="container mx-auto px-4">
          {/* Premium toolbar — search on its own row on mobile, inline on desktop */}
          <div className="mb-4 p-2.5 rounded-2xl bg-card/80 border border-border/60 shadow-sm relative z-[55] flex flex-col md:flex-row md:items-center gap-2.5">
            {/* Search row (full width on mobile) */}
            <div
              className="w-full md:flex-1 cursor-text"
              onClick={(e) => {
                const target = e.target as HTMLElement;
                if (target.tagName === 'DIV') {
                  const searchInput = e.currentTarget.querySelector<HTMLInputElement>('input[type="text"], input[placeholder]');
                  if (searchInput) searchInput.focus();
                }
              }}
            >
              <ProductSearchAutocomplete
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
                getProductPrice={user ? (p: any) => {
                  const price = getDialogPrice(p);
                  const label = getDialogPriceLabel(p) || "";
                  return { price, label };
                } : undefined}
              />
            </div>

            {/* Tools row (image/VIN/limit/filter/sort) */}
            <div className="flex items-center gap-2 flex-wrap md:flex-nowrap shrink-0">
              <Suspense fallback={null}>
                <ImageSearchDialog onProductFound={(term) => setFilters(prev => ({ ...prev, search: term }))} />
                <VINScannerDialog onProductFound={(term) => setFilters(prev => ({ ...prev, search: term }))} />
              </Suspense>

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
                  <SelectItem value="best_selling">الأكثر مبيعاً</SelectItem>
                  <SelectItem value="price_asc">السعر: الأقل</SelectItem>
                  <SelectItem value="price_desc">السعر: الأعلى</SelectItem>
                  <SelectItem value="name_asc">الاسم: أ - ي</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Quick search suggestions — dynamic from top dealer searches */}
          {!filters.search && quickSuggestions.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-2 scrollbar-hide -mt-1" style={{ scrollbarWidth: "none" }}>
              <span className="text-[11px] text-muted-foreground/70 font-medium shrink-0 ml-1">الأكثر بحثاً:</span>
              {quickSuggestions.map(s => (
                <button
                  key={s.label}
                  onClick={() => setFilters(prev => ({ ...prev, search: s.label }))}
                  className="px-3 py-1.5 rounded-full text-[11px] font-medium whitespace-nowrap shrink-0 bg-card border border-border/50 text-foreground/80 hover:bg-primary hover:text-primary-foreground hover:border-primary hover:shadow-sm transition-all duration-200 flex items-center gap-1"
                >
                  <span className="text-[13px] leading-none">{s.icon}</span>
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {/* Brand quick-filter chips for dealer — refined with label + sticky "All" */}
          {isDealer && (
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 mb-2 scrollbar-hide" style={{ scrollbarWidth: "none" }}>
              <span className="text-[10px] text-muted-foreground/70 font-semibold shrink-0 ml-1 uppercase tracking-wider">الماركة:</span>
              {[
                { key: null, label: "الكل" },
                { key: "toyota_genuine", label: "أصلي" },
                { key: "toyota_oils", label: "زيوت" },
                { key: "mtx_aftermarket", label: "MTX" },
                { key: "denso", label: "DENSO" },
                { key: "aisin", label: "AISIN" },
                { key: "fbk", label: "FBK" },
              ].map((b, idx) => (
                <div key={b.key ?? "all"} className="flex items-center gap-1.5 shrink-0">
                  {idx === 1 && <div className="h-4 w-px bg-border/60 shrink-0" />}
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, brandKey: b.key }))}
                    className={`px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap shrink-0 transition-all border-2 ${
                      filters.brandKey === b.key
                        ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.03]"
                        : "bg-card text-muted-foreground border-border/40 hover:border-primary/40 hover:text-foreground hover:bg-primary/5"
                    }`}
                  >
                    {b.label}
                  </button>
                </div>
              ))}
            </div>
          )}

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
              {/* Active filter banner — bold "Clear filter" CTA */}
              {!isLoading && (filters.categoryId || filters.brandKey || filters.search) && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-3 flex items-center justify-between gap-3 p-3 rounded-xl bg-gradient-to-l from-primary/10 via-primary/5 to-transparent border-2 border-primary/30 shadow-sm"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-wrap">
                    <span className="text-xs font-semibold text-muted-foreground shrink-0">الفلتر النشط:</span>
                    {filters.search && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-sm max-w-[180px]">
                        <span className="opacity-80">بحث:</span>
                        <span className="truncate">"{filters.search}"</span>
                      </span>
                    )}
                    {filters.categoryId && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-sm">
                        {visibleCategories.find((c: any) => c.id === filters.categoryId)?.name_ar || "تصنيف"}
                      </span>
                    )}
                    {filters.brandKey && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground text-xs font-bold shadow-sm">
                        {filters.brandKey === "toyota_genuine" ? "أصلي" :
                         filters.brandKey === "toyota_oils" ? "زيوت" :
                         filters.brandKey === "mtx_aftermarket" ? "MTX" :
                         (filters.brandKey as string).toUpperCase()}
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground shrink-0">
                      (<span className="font-bold text-foreground">{filteredProducts.length}</span> منتج)
                    </span>
                  </div>
                  <Button
                    onClick={clearFilters}
                    size="sm"
                    variant="default"
                    className="shrink-0 gap-1.5 h-8 px-3 text-xs font-bold rounded-lg bg-destructive hover:bg-destructive/90 text-destructive-foreground shadow-md"
                  >
                    <X className="w-3.5 h-3.5" />
                    مسح الفلتر
                  </Button>
                </motion.div>
              )}

              {/* Results count + view toggle */}
              <div className="flex items-center justify-between mb-2.5">
                <div className="flex items-center gap-2">
                  <p className="text-xs text-muted-foreground">
                    {isLoading ? "جاري التحميل..." : <><span className="text-foreground font-bold">{filteredProducts.length}</span> منتج</>}
                  </p>
                  {!isLoading && !filters.search && !filters.categoryId && (
                    <span className="text-[10px] text-muted-foreground/60 flex items-center gap-1">
                      <Sparkles className="w-3 h-3" />
                      مرتب حسب الأكثر طلباً
                    </span>
                  )}
                </div>
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
                <div className={viewMode === "grid" ? "grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5" : "space-y-3"}>
                  {Array.from({ length: 12 }).map((_, i) => (
                    <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
                      <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                      <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                      <div className="h-3 bg-muted rounded w-1/3" />
                    </div>
                  ))}
                </div>
              ) : paginatedProducts.length === 0 ? (
                <div className="text-center py-24">
                  <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-5">
                    <Package className="w-10 h-10 text-muted-foreground/30" />
                  </div>
                  <h3 className="text-lg font-bold text-foreground mb-2">لا توجد منتجات</h3>
                  <p className="text-muted-foreground text-sm mb-4">جرب تغيير كلمة البحث أو الفلتر</p>
                  <Button variant="outline" size="sm" onClick={clearFilters}>مسح جميع الفلاتر</Button>
                </div>
              ) : (
                <div className="relative">
                  {/* Product Grid */}
                  <div className={viewMode === "grid" ? "grid grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5" : "space-y-3"}>
                    <AnimatePresence mode="popLayout">
                      {visibleProducts.map((product, idx) => (
                        <motion.div
                          key={product.id}
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.2, delay: idx < initialItemCount ? Math.min(idx * 0.02, 0.3) : 0 }}
                        >
                          <ProductCard
                            product={product}
                            index={idx}
                            viewMode={viewMode}
                            user={user}
                            isDealer={isDealer}
                            isRetailTier={isRetailTier}
                            viewedProductIds={viewedProductIds}
                            limitReached={limitReached}
                            dailyViewCount={dailyViewCount}
                            dailyLimit={dailyLimit}
                            searchYear={(() => {
                              const m = (filters.search || "").match(/\b(19|20)\d{2}\b/);
                              return m ? parseInt(m[0]) : null;
                            })()}
                            getProductPrice={getProductPrice}
                            onProductClick={setSelectedProduct}
                            onAddToCart={handleAddToCart}
                            onRecordView={recordView}
                            onLoginRequired={handleLoginRequired}
                          />
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  {/* Show More Button with fade overlay */}
                  {showExpandButton && (
                    <div className="relative mt-0">
                      {/* Gradient fade */}
                      <div className="absolute -top-20 left-0 right-0 h-20 bg-gradient-to-t from-background to-transparent pointer-events-none z-10" />
                      
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-center gap-2 pt-4 relative z-20"
                      >
                        <Button
                          onClick={() => {
                            setExpanded(true);
                            if (hasMore) loadMore();
                          }}
                          variant="outline"
                          size="lg"
                          className="gap-2 rounded-2xl px-8 py-3 border-2 border-primary/20 hover:border-primary/40 bg-card hover:bg-primary/5 text-primary font-bold shadow-lg shadow-primary/5 transition-all duration-300"
                        >
                          <ChevronDown className="w-5 h-5" />
                          عرض المزيد ({totalRemaining > 0 ? totalRemaining : "..."} منتج)
                        </Button>
                        <p className="text-[11px] text-muted-foreground">
                          عرض {visibleProducts.length} من {filteredProducts.length}
                        </p>
                      </motion.div>
                    </div>
                  )}

                  {/* Load more in expanded view */}
                  {expanded && hasMore && (
                    <div className="flex flex-col items-center gap-2 mt-6">
                      <Button onClick={loadMore} variant="ghost" size="sm" className="gap-2 text-muted-foreground">
                        <ChevronDown className="w-4 h-4" />
                        تحميل المزيد
                      </Button>
                      <p className="text-xs text-muted-foreground">
                        عرض {paginatedProducts.length} من {filteredProducts.length}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Weekly Best Sellers Carousel - below grid */}
          <WeeklyBestSellers
            onProductClick={setSelectedProduct}
            onAddToCart={handleAddToCart}
            isDealer={isDealer}
            user={user}
            getProductPrice={getProductPrice}
          />
        </div>
      </section>

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
});

ProductListingSection.displayName = "ProductListingSection";

export default ProductListingSection;
