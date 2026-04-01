import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCart, CartItem } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";
import { playPricingSound } from "@/lib/pricingSound";
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

/**
 * Compound word aliases — maps common misspellings/variants to canonical forms.
 * Key: normalized alias, Value: array of canonical search terms to inject.
 */
const compoundAliases: Record<string, string[]> = {
  // هاي اس variants
  "هاياس": ["هاي اس"], "هايس": ["هاي اس"], "هاس": ["هاي اس"],
  "هاى اس": ["هاي اس"], "هاى ايس": ["هاي اس"], "هاي ايس": ["هاي اس"],
  // هاي لوكس variants
  "هايلوكس": ["هاي لوكس"], "هايلكس": ["هاي لوكس"], "هيلوكس": ["هاي لوكس"],
  "هيلكس": ["هاي لوكس"], "هايلاكس": ["هاي لوكس"], "هيلاكس": ["هاي لوكس"],
  // لاند كروزر variants
  "لاندكروزر": ["لاند كروزر"], "لندكروزر": ["لاند كروزر"],
  "لاندكرورز": ["لاند كروزر"], "لاند كرورز": ["لاند كروزر"],
  "لاند كرزر": ["لاند كروزر"], "لندكرزر": ["لاند كروزر"],
  // كامري variants
  "كامرى": ["كامري"], "كمرى": ["كامري"], "كمري": ["كامري"],
  "كامرة": ["كامري"], "كمرة": ["كامري"],
  // كورولا variants
  "كرولا": ["كورولا"], "كارولا": ["كورولا"], "كرلا": ["كورولا"],
  "كوريلا": ["كورولا"], "كرولة": ["كورولا"],
  // برادو variants
  "براد": ["برادو"], "بردو": ["برادو"], "برادا": ["برادو"],
  // فورتشنر variants
  "فورشنر": ["فورتشنر"], "فرتشنر": ["فورتشنر"], "فورتشينر": ["فورتشنر"],
  "فرشنر": ["فورتشنر"], "فورتشنير": ["فورتشنر"],
  // راف فور variants
  "رافور": ["راف فور"], "رافو": ["راف فور"], "راففور": ["راف فور"],
  "رافوفر": ["راف فور"], "راف٤": ["راف فور"],
  // يارس variants
  "ياريس": ["يارس"], "يارص": ["يارس"], "يرس": ["يارس"],
  // افالون variants
  "افلون": ["افالون"], "افلن": ["افالون"], "اڤالون": ["افالون"],
  // اوريون variants
  "اريون": ["اوريون"], "اورين": ["اوريون"], "ارين": ["اوريون"],
  // كوستر variants
  "كستر": ["كوستر"], "كوستير": ["كوستر"], "كسترا": ["كوستر"],
  // راش variants
  "رش": ["راش"], "راص": ["راش"],
  // اينوفا variants
  "انوفا": ["اينوفا"], "اينوڤا": ["اينوفا"], "ايننوفا": ["اينوفا"],
  // كراون variants
  "كرون": ["كراون"], "كروان": ["كراون"],
  // بيكاب / بك اب
  "بكاب": ["بيكاب"], "بك اب": ["بيكاب"], "بيك اب": ["بيكاب"],
};

/** Expand search query by replacing known aliases with canonical forms */
export const expandAliases = (query: string): string => {
  let expanded = normalizeArabic(query);
  // Try full query first (for compound aliases)
  if (compoundAliases[expanded]) {
    return compoundAliases[expanded].join(" ");
  }
  // Try each word
  const words = expanded.split(/\s+/);
  const result = words.map(w => {
    const alias = compoundAliases[w];
    return alias ? alias.join(" ") : w;
  });
  return result.join(" ");
};

/**
 * Create a "consonant skeleton" by removing short vowel-like letters (ا و ي)
 * so كورولا / كرولا / كارولا all become the same skeleton: كرل
 */
const toConsonantSkeleton = (text: string): string => {
  return text
    .replace(/[اوي]/g, "")
    .replace(/[aeiou]/gi, "");
};

const generateSearchVariants = (term: string): string[] => {
  const normalized = normalizeArabic(term);
  const variants = new Set<string>([term.toLowerCase(), normalized]);
  // Expand aliases
  const aliasExpanded = expandAliases(term);
  if (aliasExpanded !== normalized) variants.add(aliasExpanded);
  // Add variant with ة instead of ه and vice versa
  variants.add(normalized.replace(/ه/g, "ة"));
  variants.add(term.toLowerCase().replace(/ه/g, "ة"));
  variants.add(term.toLowerCase().replace(/ة/g, "ه"));
  // Handle ى/ي/ا interchangeability
  variants.add(normalized.replace(/ي/g, "ا"));
  variants.add(normalized.replace(/ا/g, "ي"));
  variants.add(term.toLowerCase().replace(/ى$/g, "ا"));
  variants.add(term.toLowerCase().replace(/ى/g, "ا"));
  return Array.from(variants);
};

/**
 * Check if a search word matches text using exact variants, aliases, AND fuzzy skeleton.
 */
const fuzzyMatchWord = (word: string, ...texts: string[]): boolean => {
  const wordVariants = generateSearchVariants(word);
  const joined = texts.join(" ");

  // 1) Exact variant match (includes alias-expanded variants)
  if (wordVariants.some(v => joined.includes(v))) return true;

  // 2) Consonant skeleton match (only for Arabic words >= 3 chars)
  const normalizedWord = normalizeArabic(word);
  if (normalizedWord.length >= 3 && /[\u0600-\u06FF]/.test(normalizedWord)) {
    const wordSkeleton = toConsonantSkeleton(normalizedWord);
    if (wordSkeleton.length >= 2) {
      const targetWords = joined.split(/\s+/);
      return targetWords.some(tw => {
        const twSkeleton = toConsonantSkeleton(normalizeArabic(tw));
        return twSkeleton.length >= 2 && (twSkeleton.includes(wordSkeleton) || wordSkeleton.includes(twSkeleton));
      });
    }
  }

  return false;
};

const ITEMS_PER_PAGE = 12;
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
  const [searchParams, setSearchParams] = useSearchParams();
  
  const { isDealer, user, dealerAccount } = useAuth();
  const { addItem } = useCart();
  const queryClient = useQueryClient();

  const initialSearch = searchParams.get("search") || "";
  const initialCategory = searchParams.get("category") || null;

  const getDefaultFilters = (): ProductFilters => ({
    search: initialSearch, model: null, year: null, chassisNumber: "", partNumber: "",
    categoryId: null, brandKey: brandFilter || null, priceMin: "", priceMax: "", sortBy: "newest",
  });

  const [filters, setFilters] = useState<ProductFilters>(getDefaultFilters);
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [commandPaletteOpen, setCommandPaletteOpen] = useState(false);

  // Reset page when filters change
  useEffect(() => { setCurrentPage(1); }, [filters]);

  // Reset all filters and clear URL params on unmount
  useEffect(() => {
    return () => {
      // Clear URL search params so re-entering starts fresh
      const url = new URL(window.location.href);
      let changed = false;
      for (const key of ["search", "category"]) {
        if (url.searchParams.has(key)) {
          url.searchParams.delete(key);
          changed = true;
        }
      }
      if (changed) {
        window.history.replaceState(null, "", url.pathname + (url.search || ""));
      }
    };
  }, []);

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
    queryClient.invalidateQueries({ queryKey: ["dealer_daily_count", user.id] });
    playPricingSound();
    toast({
      title: "✅ تم التسعير",
      description: "اضغط لعرض الأصناف المسعّرة اليوم",
      action: <button onClick={() => navigate("/dealer?tab=priced_today")} className="text-xs font-bold text-primary hover:underline whitespace-nowrap">عرض المسعّرة ←</button>,
      className: "bg-green-50 border-green-200 dark:bg-green-950/50 dark:border-green-800 text-green-900 dark:text-green-100",
    });
  }, [user, isDealer, viewedProductIds, limitReached, queryClient, navigate]);

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

  /* ── Products (select only needed columns for performance) ── */
  const { data: products, isLoading } = useQuery({
    queryKey: ["products", "all", queryKeySuffix].filter(Boolean),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name_ar, name_en, sku, image_url, base_price, stock_quantity, brand, category_id, is_active, is_featured, is_on_sale, sale_price, min_order_qty, compatible_models, description_ar, year_from, year_to, product_categories(name_ar)")
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    staleTime: 2 * 60 * 1000, // cache for 2 minutes
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

    const rawSearch = filters.search?.trim() || "";
    const searchYear = rawSearch ? extractYearFromSearch(rawSearch) : null;
    const searchWithoutYear = rawSearch ? removeYearFromSearch(rawSearch) : "";

    // Step 1: Base filtering (text match + other filters, NO year filtering yet)
    const baseFilter = (p: any) => {
      // When searching, show results from ALL brands (cross-brand search)
      const hasActiveSearch = !!rawSearch;
      const matchesBrand = hasActiveSearch || !filters.brandKey || p.brand === filters.brandKey;

      let matchesSearch = true;
      if (rawSearch) {
        // Expand aliases before searching (e.g., هاياس → هاي اس)
        const textToSearch = expandAliases(searchYear ? searchWithoutYear : rawSearch);
        if (textToSearch) {
          const normalizedName = normalizeArabic(p.name_ar);
          const skuLower = p.sku.toLowerCase();
          const nameEnLower = (p.name_en || "").toLowerCase();
          const descArNorm = normalizeArabic(p.description_ar || "");
          const modelsText = normalizeArabic((p.compatible_models || []).join(" "));
          const allText = `${normalizedName} ${skuLower} ${nameEnLower} ${descArNorm} ${modelsText}`;
          
          // Split search into individual words and check ALL words exist (AND logic)
          const searchWords = textToSearch.trim().split(/\s+/).filter((w: string) => w.length > 0);
          matchesSearch = searchWords.every((word: string) => fuzzyMatchWord(word, allText));
        }
        // If textToSearch is empty (year-only search like "2022"), match all products
      }

      const matchesCategory = !filters.categoryId || p.category_id === filters.categoryId;

      let matchesModel = true;
      if (filters.model) {
        const normalizedName = normalizeArabic(p.name_ar);
        const modelsText = normalizeArabic((p.compatible_models || []).join(" "));
        matchesModel = fuzzyMatchWord(filters.model, normalizedName, modelsText);
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
    if (searchYear) {
      // 2a: Exact year in name
      const exactYearMatch = baseResults.filter(p => p.name_ar.includes(String(searchYear)));

      // 2b: Match via year_from/year_to range
      const rangeMatch = baseResults.filter(p =>
        p.year_from && p.year_to && searchYear >= p.year_from && searchYear <= p.year_to
      );

      // Combine exact + range (deduplicated)
      const combinedIds = new Set<string>();
      const combined: any[] = [];
      [...exactYearMatch, ...rangeMatch].forEach(p => {
        if (!combinedIds.has(p.id)) {
          combinedIds.add(p.id);
          combined.push(p);
        }
      });

      if (combined.length > 0) {
        baseResults = combined;
      } else {
        // 2c: Find closest year — from names + year_from/year_to
        const productsWithYears = baseResults.map(p => {
          const candidateYears: number[] = [];
          // Extract years from product name
          const nameYears = p.name_ar.match(/\b(19|20)\d{2}\b/g);
          if (nameYears) candidateYears.push(...nameYears.map(Number));
          // Also consider year_from and year_to
          if (p.year_from) candidateYears.push(p.year_from);
          if (p.year_to) candidateYears.push(p.year_to);

          if (candidateYears.length === 0) return null;

          const closestYear = candidateYears.reduce((best, y) =>
            Math.abs(y - searchYear) < Math.abs(best - searchYear) ? y : best
          , candidateYears[0]);
          return { product: p, closestYear, diff: Math.abs(closestYear - searchYear) };
        }).filter(Boolean) as { product: any; closestYear: number; diff: number }[];

        if (productsWithYears.length > 0) {
          productsWithYears.sort((a, b) => a.diff - b.diff);
          const bestDiff = productsWithYears[0].diff;
          baseResults = productsWithYears
            .filter(p => p.diff === bestDiff)
            .map(p => p.product);
        }
        // If no products have years at all, keep baseResults as-is
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

  /* ── Load More ── */
  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const hasMore = currentPage < totalPages;
  const paginatedProducts = useMemo(() => {
    return filteredProducts.slice(0, currentPage * ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);
  const loadMore = useCallback(() => {
    if (hasMore) setCurrentPage(p => p + 1);
  }, [hasMore]);

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
    // Load More
    currentPage, setCurrentPage, totalPages, ITEMS_PER_PAGE, hasMore, loadMore,
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
