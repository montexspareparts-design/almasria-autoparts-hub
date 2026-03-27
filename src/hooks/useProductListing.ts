import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCart, CartItem } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";
import { ProductFilters } from "@/components/AdvancedProductFilter";

/* ── Arabic text normalization ── */
export const normalizeArabic = (text: string): string => {
  return text
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .replace(/ئ/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
};

const generateSearchVariants = (term: string): string[] => {
  const normalized = normalizeArabic(term);
  const variants = new Set<string>([term.toLowerCase(), normalized]);
  // Add variant with ة instead of ه and vice versa
  variants.add(normalized.replace(/ه/g, "ة"));
  variants.add(term.toLowerCase().replace(/ه/g, "ة"));
  variants.add(term.toLowerCase().replace(/ة/g, "ه"));
  // Handle ى/ي/ا interchangeability (common in Egyptian Arabic)
  variants.add(normalized.replace(/ي/g, "ا"));
  variants.add(normalized.replace(/ا/g, "ي"));
  // Handle final ى→ا (e.g., كورولى → كورولا)
  variants.add(term.toLowerCase().replace(/ى$/g, "ا"));
  variants.add(term.toLowerCase().replace(/ى/g, "ا"));
  return Array.from(variants);
};

const ITEMS_PER_PAGE = 24;
const DAILY_LIMIT = 20;

interface UseProductListingOptions {
  /** Filter by specific brand key (e.g., "toyota_genuine") */
  brandFilter?: string;
  /** Query key suffix for caching */
  queryKeySuffix?: string;
}

export function useProductListing(options: UseProductListingOptions = {}) {
  const { brandFilter, queryKeySuffix } = options;
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isDealer, user, dealerAccount } = useAuth();
  const { addItem } = useCart();
  const queryClient = useQueryClient();

  const initialSearch = searchParams.get("search") || "";
  const [filters, setFilters] = useState<ProductFilters>({
    search: initialSearch, model: null, year: null, chassisNumber: "", partNumber: "",
    categoryId: null, brandKey: brandFilter || null, priceMin: "", priceMax: "", sortBy: "newest",
  });
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [filters]);

  // Set brand filter from options
  useEffect(() => {
    if (brandFilter && !filters.brandKey) {
      setFilters(prev => ({ ...prev, brandKey: brandFilter }));
    }
  }, [brandFilter]);

  /* ── Dealer daily views ── */
  const { data: viewedProductIds = [] } = useQuery({
    queryKey: ["dealer_views_today", user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase
        .from("dealer_price_views").select("product_id")
        .eq("user_id", user!.id).eq("view_date", today);
      if (error) throw error;
      return data.map((v) => v.product_id);
    },
    enabled: !!isDealer && !!user,
  });

  const dailyViewCount = viewedProductIds.length;
  const limitReached = dailyViewCount >= DAILY_LIMIT;

  const recordView = useCallback(async (productId: string) => {
    if (!user || !isDealer || viewedProductIds.includes(productId) || limitReached) return;
    await supabase.from("dealer_price_views").upsert(
      { user_id: user.id, product_id: productId, view_date: new Date().toISOString().split("T")[0] },
      { onConflict: "user_id,product_id,view_date" }
    );
    queryClient.invalidateQueries({ queryKey: ["dealer_views_today", user.id] });
  }, [user, isDealer, viewedProductIds, limitReached, queryClient]);

  /* ── Tier prices ── */
  const { data: tierPrices } = useQuery({
    queryKey: ["tier_prices", dealerAccount?.tier, queryKeySuffix],
    queryFn: async () => {
      if (!dealerAccount) return {};
      const { data, error } = await supabase
        .from("product_tier_prices").select("product_id, price")
        .eq("tier", dealerAccount.tier as any);
      if (error) throw error;
      const map: Record<string, number> = {};
      data.forEach((tp) => { map[tp.product_id] = tp.price; });
      return map;
    },
    enabled: !!dealerAccount,
  });

  const getProductPrice = useCallback((product: any) => {
    if (isDealer && tierPrices && tierPrices[product.id]) return tierPrices[product.id];
    return product.base_price;
  }, [isDealer, tierPrices]);

  /* ── Cart ── */
  const handleAddToCart = useCallback((product: any) => {
    const cartItem: CartItem = {
      id: product.id, name_ar: product.name_ar, sku: product.sku, image_url: product.image_url,
      unit_price: getProductPrice(product), quantity: product.min_order_qty || 1,
      stock_quantity: product.stock_quantity, min_order_qty: product.min_order_qty, brand: product.brand,
    };
    addItem(cartItem);
    toast({ title: "تمت الإضافة للسلة ✅", description: product.name_ar });
  }, [addItem, getProductPrice]);

  const handleLoginRequired = useCallback(() => {
    toast({ title: "يجب تسجيل الدخول أولاً", description: "سجل دخولك لتتمكن من عرض أسعار المنتجات" });
    navigate("/auth");
  }, [navigate]);

  /* ── Categories ── */
  const { data: dbCategories } = useQuery({
    queryKey: ["product_categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  // Deep link: set category from URL query
  useEffect(() => {
    const categorySlug = searchParams.get("category");
    if (categorySlug && dbCategories) {
      const matched = dbCategories.find((c) => c.slug === categorySlug);
      if (matched) setFilters((prev) => ({ ...prev, categoryId: matched.id }));
    }
  }, [dbCategories, searchParams]);

  // Deep link: sync search from URL query changes (used by CategoryBrowseSlider)
  useEffect(() => {
    const searchTerm = searchParams.get("search") || "";
    setFilters((prev) => {
      if (prev.search === searchTerm) return prev;
      return { ...prev, search: searchTerm };
    });
  }, [searchParams]);

  /* ── Products ── */
  const { data: products, isLoading } = useQuery({
    queryKey: ["products", brandFilter || "all", queryKeySuffix].filter(Boolean),
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("*, product_categories(name_ar)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });

      if (brandFilter) {
        query = query.eq("brand", brandFilter as any);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  /* ── Smart year extraction from search query ── */
  const extractYearFromSearch = (search: string): number | null => {
    const match = search.match(/\b(19|20)\d{2}\b/);
    return match ? parseInt(match[0]) : null;
  };

  const removeYearFromSearch = (search: string): string => {
    return search.replace(/\b(19|20)\d{2}\b/g, "").replace(/\s+/g, " ").trim();
  };

  /* ── Filtering with Arabic normalization + smart year matching ── */
  const filteredProducts = useMemo(() => {
    if (!products) return [];

    const searchYear = filters.search ? extractYearFromSearch(filters.search) : null;
    const searchWithoutYear = filters.search ? removeYearFromSearch(filters.search) : "";

    // Step 1: Base filtering (everything except year)
    const baseFilter = (p: any) => {
      // When searching, show results from ALL brands (cross-brand search)
      const hasActiveSearch = !!(filters.search?.trim());
      const matchesBrand = hasActiveSearch || !filters.brandKey || p.brand === filters.brandKey;

      let matchesSearch = true;
      if (filters.search) {
        // If search contains a year, match text part separately
        const textToSearch = searchYear ? searchWithoutYear : filters.search;
        if (textToSearch) {
          const normalizedName = normalizeArabic(p.name_ar);
          const skuLower = p.sku.toLowerCase();
          const nameEnLower = (p.name_en || "").toLowerCase();
          
          // Split search into individual words and check ALL words exist (AND logic)
          const searchWords = textToSearch.trim().split(/\s+/).filter(w => w.length > 0);
          matchesSearch = searchWords.every(word => {
            const wordVariants = generateSearchVariants(word);
            return wordVariants.some(v =>
              normalizedName.includes(v) || skuLower.includes(v) || nameEnLower.includes(v)
            );
          });
        }
      }

      const matchesCategory = !filters.categoryId || p.category_id === filters.categoryId;

      let matchesModel = true;
      if (filters.model) {
        const modelVariants = generateSearchVariants(filters.model);
        const normalizedName = normalizeArabic(p.name_ar);
        matchesModel = modelVariants.some(v => normalizedName.includes(v));
      }

      const matchesYear = !filters.year || p.name_ar.includes(filters.year);
      const matchesPartNumber = !filters.partNumber || p.sku.toLowerCase().includes(filters.partNumber.toLowerCase());
      const price = p.base_price;
      const matchesPriceMin = !filters.priceMin || price >= Number(filters.priceMin);
      const matchesPriceMax = !filters.priceMax || price <= Number(filters.priceMax);

      return matchesBrand && matchesSearch && matchesCategory && matchesModel && matchesYear && matchesPartNumber && matchesPriceMin && matchesPriceMax;
    };

    let baseResults = products.filter(baseFilter);

    // Step 2: Smart year matching when search contains a year
    if (searchYear && searchWithoutYear) {
      // 2a: Exact year in name
      const exactYearMatch = baseResults.filter(p => p.name_ar.includes(String(searchYear)));

      if (exactYearMatch.length > 0) {
        baseResults = exactYearMatch;
      } else {
        // 2b: Match via year_from/year_to range
        const rangeMatch = baseResults.filter(p =>
          p.year_from && p.year_to && searchYear >= p.year_from && searchYear <= p.year_to
        );

        if (rangeMatch.length > 0) {
          baseResults = rangeMatch;
        } else {
          // 2c: Find closest year — extract all years from matching products' names
          const productsWithYears = baseResults.map(p => {
            const years = p.name_ar.match(/\b(19|20)\d{2}\b/g);
            if (!years) return null;
            const productYears = years.map(Number);
            const closestYear = productYears.reduce((best, y) =>
              Math.abs(y - searchYear) < Math.abs(best - searchYear) ? y : best
            , productYears[0]);
            return { product: p, closestYear, diff: Math.abs(closestYear - searchYear) };
          }).filter(Boolean) as { product: any; closestYear: number; diff: number }[];

          if (productsWithYears.length > 0) {
            // Sort by closest year difference
            productsWithYears.sort((a, b) => a.diff - b.diff);
            const bestDiff = productsWithYears[0].diff;
            // Take all products with the closest year
            baseResults = productsWithYears
              .filter(p => p.diff === bestDiff)
              .map(p => p.product);
          }
          // If no products have years at all, keep baseResults as-is (text match only)
        }
      }
    }

    // Sort
    let result = baseResults;
    switch (filters.sortBy) {
      case "price_asc": result.sort((a, b) => a.base_price - b.base_price); break;
      case "price_desc": result.sort((a, b) => b.base_price - a.base_price); break;
      case "name_asc": result.sort((a, b) => a.name_ar.localeCompare(b.name_ar, "ar")); break;
    }

    return result;
  }, [products, filters]);

  /* ── Search logging (debounced) ── */
  const lastLoggedSearch = useRef("");
  useEffect(() => {
    const searchQuery = filters.search?.trim();
    if (!searchQuery || searchQuery.length < 2 || searchQuery === lastLoggedSearch.current) return;
    const timer = setTimeout(() => {
      lastLoggedSearch.current = searchQuery;
      supabase.from("customer_search_logs").insert({
        user_id: user?.id || null,
        search_query: searchQuery,
        filters: {
          brand: filters.brandKey,
          model: filters.model,
          year: filters.year,
          category: filters.categoryId,
        },
        results_count: filteredProducts.length,
      } as any).then(() => {});
    }, 1500);
    return () => clearTimeout(timer);
  }, [filters.search, filters.brandKey, filters.model, filters.year, filters.categoryId, user?.id, filteredProducts.length]);

  /* ── Pagination ── */
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  /* ── Category counts & visible categories ── */
  const categoryCounts = useMemo(() => {
    if (!products) return {};
    return products.reduce((acc, p) => {
      if (p.category_id) acc[p.category_id] = (acc[p.category_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [products]);

  const visibleCategories = useMemo(() => {
    return dbCategories?.filter(cat => products?.some(p => p.category_id === cat.id));
  }, [dbCategories, products]);

  /* ── Product detail dialog price helpers ── */
  const getDialogPrice = useCallback((product: any) => {
    if (!product) return null;
    if (!user) return null;
    if (!isDealer) return product.base_price;
    if (viewedProductIds.includes(product.id)) return getProductPrice(product);
    return null;
  }, [user, isDealer, viewedProductIds, getProductPrice]);

  const getDialogPriceLabel = useCallback((product: any) => {
    if (!product || !user) return undefined;
    if (isDealer && viewedProductIds.includes(product.id)) return "سعر الجملة الخاص بك";
    if (!isDealer) return "سعر قطاعي";
    return undefined;
  }, [user, isDealer, viewedProductIds]);

  const canAddToCartDialog = useCallback((product: any) => {
    return !!user && (!isDealer || (product && viewedProductIds.includes(product.id)));
  }, [user, isDealer, viewedProductIds]);

  return {
    // Auth
    user, isDealer, dealerAccount,
    // Filters
    filters, setFilters,
    // View
    viewMode, setViewMode,
    // Pagination
    currentPage, setCurrentPage, totalPages, ITEMS_PER_PAGE,
    // Products
    products, isLoading, filteredProducts, paginatedProducts,
    // Categories
    dbCategories, visibleCategories, categoryCounts,
    // Dealer
    viewedProductIds, dailyViewCount, limitReached, DAILY_LIMIT,
    recordView,
    // Price
    getProductPrice, tierPrices,
    // Cart
    handleAddToCart, handleLoginRequired,
    // Product detail
    selectedProduct, setSelectedProduct,
    getDialogPrice, getDialogPriceLabel, canAddToCartDialog,
    // Sidebar & command palette
    sidebarOpen, setSidebarOpen,
    commandPaletteOpen, setCommandPaletteOpen,
    // Navigation
    navigate,
  };
}
