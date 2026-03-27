import { useState, useMemo, useCallback, useEffect } from "react";
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

  const [filters, setFilters] = useState<ProductFilters>({
    search: "", model: null, year: null, chassisNumber: "", partNumber: "",
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

  /* ── Filtering with Arabic normalization ── */
  const filteredProducts = useMemo(() => {
    if (!products) return [];
    let result = products.filter((p) => {
      // Brand filter
      const matchesBrand = !filters.brandKey || p.brand === filters.brandKey;

      // Search with Arabic normalization
      let matchesSearch = true;
      if (filters.search) {
        const variants = generateSearchVariants(filters.search);
        const normalizedName = normalizeArabic(p.name_ar);
        const skuLower = p.sku.toLowerCase();
        const nameEnLower = (p.name_en || "").toLowerCase();
        matchesSearch = variants.some(v =>
          normalizedName.includes(v) || skuLower.includes(v) || nameEnLower.includes(v)
        );
      }

      // Category
      const matchesCategory = !filters.categoryId || p.category_id === filters.categoryId;

      // Model - search in product name (Arabic normalized)
      let matchesModel = true;
      if (filters.model) {
        const modelVariants = generateSearchVariants(filters.model);
        const normalizedName = normalizeArabic(p.name_ar);
        matchesModel = modelVariants.some(v => normalizedName.includes(v));
      }

      // Year
      const matchesYear = !filters.year || p.name_ar.includes(filters.year);

      // Part number
      const matchesPartNumber = !filters.partNumber || p.sku.toLowerCase().includes(filters.partNumber.toLowerCase());

      // Price range
      const price = p.base_price;
      const matchesPriceMin = !filters.priceMin || price >= Number(filters.priceMin);
      const matchesPriceMax = !filters.priceMax || price <= Number(filters.priceMax);

      return matchesBrand && matchesSearch && matchesCategory && matchesModel && matchesYear && matchesPartNumber && matchesPriceMin && matchesPriceMax;
    });

    // Sort
    switch (filters.sortBy) {
      case "price_asc": result.sort((a, b) => a.base_price - b.base_price); break;
      case "price_desc": result.sort((a, b) => b.base_price - a.base_price); break;
      case "name_asc": result.sort((a, b) => a.name_ar.localeCompare(b.name_ar, "ar")); break;
    }

    return result;
  }, [products, filters]);

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
