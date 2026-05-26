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
 * Levenshtein distance — minimum edits (insert/delete/replace) to transform a→b.
 * Used for tolerating 1-char typos in product names (e.g., "فلتير" vs "فلتر").
 */
const levenshtein = (a: string, b: string): number => {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  // Cap for performance — don't compare very long strings
  if (Math.abs(a.length - b.length) > 3) return 99;
  const m = a.length, n = b.length;
  let prev = new Array(n + 1).fill(0).map((_, i) => i);
  let curr = new Array(n + 1).fill(0);
  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(curr[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    [prev, curr] = [curr, prev];
  }
  return prev[n];
};

const getWordMatchScore = (word: string, text: string): number => {
  const normalizedWord = normalizeArabic(word);
  const normalizedText = normalizeArabic(text);
  if (!normalizedWord || !normalizedText) return 0;

  const textWords = normalizedText.split(/\s+/).filter(Boolean);
  const wordVariants = generateSearchVariants(word).map(normalizeArabic);
  let bestScore = 0;

  for (const targetWord of textWords) {
    if (wordVariants.some((variant) => targetWord === variant)) {
      bestScore = Math.max(bestScore, 120);
    }

    if (wordVariants.some((variant) => targetWord.startsWith(variant) || variant.startsWith(targetWord))) {
      const lengthDiff = Math.abs(targetWord.length - normalizedWord.length);
      if (lengthDiff <= 2) {
        bestScore = Math.max(bestScore, 90 - lengthDiff * 10);
      }
    }

    // Substring match (e.g., "فلتر" inside "فلترزيت") — useful for compound words
    if (normalizedWord.length >= 3 && targetWord.includes(normalizedWord)) {
      bestScore = Math.max(bestScore, 65);
    }

    const wordSkeleton = toConsonantSkeleton(normalizedWord);
    const targetSkeleton = toConsonantSkeleton(targetWord);
    if (wordSkeleton.length >= 2 && targetSkeleton.length >= 2 && wordSkeleton === targetSkeleton) {
      bestScore = Math.max(bestScore, 75);
    }

    // Levenshtein typo tolerance — only for words ≥4 chars to avoid false positives on short tokens
    if (normalizedWord.length >= 4 && targetWord.length >= 4) {
      const dist = levenshtein(normalizedWord, targetWord);
      // Allow 1 edit for words ≤6 chars, 2 edits for longer words
      const maxAllowedDist = normalizedWord.length <= 6 ? 1 : 2;
      if (dist > 0 && dist <= maxAllowedDist) {
        bestScore = Math.max(bestScore, 70 - dist * 15);
      }
    }
  }

  if (wordVariants.some((variant) => normalizedText.includes(variant))) {
    bestScore = Math.max(bestScore, 40);
  }

  return bestScore;
};

export const getSearchRelevanceScore = (query: string, product: {
  name_ar?: string | null;
  name_en?: string | null;
  description_ar?: string | null;
  compatible_models?: string[] | null;
  sku?: string | null;
  part_number?: string | null;
  available_quantity?: number | null;
  stock_quantity?: number | null;
  image_url?: string | null;
}) => {
  const rawQuery = query.trim();
  if (!rawQuery) return 0;

  const expandedQuery = expandAliases(rawQuery);
  const normalizedQuery = normalizeArabic(expandedQuery);
  const searchWords = normalizedQuery.split(/\s+/).filter(Boolean);
  const normalizedName = normalizeArabic(product.name_ar || "");
  const skuLower = (product.sku || "").toLowerCase();
  const nameEnLower = (product.name_en || "").toLowerCase();
  const descArNorm = normalizeArabic(product.description_ar || "");
  const modelsText = normalizeArabic((product.compatible_models || []).join(" "));

  let score = 0;
  let matchedWords = 0;
  const allFields = [normalizedName, skuLower, nameEnLower, descArNorm, modelsText].join(" ");

  for (const word of searchWords) {
    const nameScore = getWordMatchScore(word, normalizedName) * 10;
    const skuScore = getWordMatchScore(word, skuLower) * 12;
    const enScore = getWordMatchScore(word, nameEnLower) * 5;
    const descScore = getWordMatchScore(word, descArNorm) * 3;
    const modelScore = getWordMatchScore(word, modelsText) * 4;
    const wordTotal = nameScore + skuScore + enScore + descScore + modelScore;
    score += wordTotal;
    if (wordTotal > 0) matchedWords++;
  }

  // CRITICAL: If not all search words matched, heavily penalize or reject
  if (searchWords.length >= 2) {
    if (matchedWords < searchWords.length) {
      const matchRatio = matchedWords / searchWords.length;
      // For 3+ word queries, require ALL words to match
      if (searchWords.length >= 3) return 0;
      // For 2-word queries, both must match
      if (matchRatio < 1) return 0;
    } else {
      // ALL words matched - big bonus
      score += 500 * searchWords.length;
    }
  }

  if (normalizedName === normalizedQuery) score += 2000;
  else if (normalizedName.startsWith(normalizedQuery)) score += 1400;
  else if (normalizedName.includes(normalizedQuery)) score += 900;

  if (skuLower === normalizedQuery) score += 2200;
  else if (skuLower.startsWith(normalizedQuery)) score += 1500;
  else if (skuLower.includes(normalizedQuery)) score += 700;

  if (descArNorm.includes(normalizedQuery)) score += 120;
  if (modelsText.includes(normalizedQuery)) score += 150;
  if ((product.available_quantity ?? product.stock_quantity ?? 0) > 0) score += 25;
  if (product.image_url) score += 10;

  return score;
};

/**
 * Check if a search word matches text using exact variants, aliases, AND strict skeleton equality.
 */
const fuzzyMatchWord = (word: string, ...texts: string[]): boolean => {
  return texts.some((text) => getWordMatchScore(word, text) > 0);
};

const ITEMS_PER_PAGE = 48;

const categoryKeywordFallbacks: Record<string, string[]> = {
  "filters": ["فلتر"],
  "spark-plugs-coils": ["بوجيه", "بوجية", "مباين", "موبينة"],
  "brakes": ["تيل", "فرامل"],
  "water-cooling": ["ريداتير", "تبريد", "ثرموستات"],
  "electrical": ["دينامو", "كهرباء", "سلف", "مارش"],
  "oils-gasoline": ["زيت بنزين", "محرك بنزين"],
  "oils-diesel": ["زيت ديزل", "محرك ديزل"],
  "oils-transmission": ["زيت فتيس", "زيت نقل", "atf"],
  "clutch": ["دبرياج", "اسطوانة", "ديسك"],
  "suspension": ["عفشة", "مقص"],
  "shocks": ["مساعد"],
  "gaskets": ["جوان"],
  "oil-seals": ["اويل سيل", "سيل"],
  "lights": ["فانوس", "كشاف", "لمبة"],
  "steering": ["دركسيون", "مقود", "عمة"],
  "belts-bearings": ["سير", "بلية", "بلي"],
  "bumpers": ["صدام", "اكصدام"],
  "mirrors": ["مراية", "مرايا"],
  "rubber": ["كاوتش", "جلدة"],
  "fiber-parts": ["فيبر", "رفرف", "كابوت"],
};

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
  const DAILY_LIMIT = 20;
  const isRetailTier = dealerAccount?.tier === 'retail';

  // Fetch max order percentage from site_settings
  const { data: maxOrderPct } = useQuery({
    queryKey: ["site_settings", "max_order_percentage"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "max_order_percentage")
        .maybeSingle();
      return parseInt(data?.value || "50") || 50;
    },
    staleTime: 10 * 60 * 1000,
  });

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
    const availableQty = product.available_quantity ?? product.stock_quantity;
    const maxCap = product.max_order_cap;
    const qty = product.min_order_qty || 1;
    const pct = maxOrderPct || 50;

    if (availableQty <= 0) {
      toast({ title: "هذا المنتج غير متوفر حالياً", variant: "destructive" });
      return;
    }

    // Dynamic percentage cap rule
    const pctCap = Math.max(1, Math.floor(availableQty * pct / 100));
    let effectiveMax = Math.min(availableQty, pctCap);
    if (maxCap) effectiveMax = Math.min(effectiveMax, maxCap);

    let finalQty = Math.min(qty, effectiveMax);

    if (qty > effectiveMax) {
      toast({
        title: "⚠️ تم تعديل الكمية تلقائياً",
        description: `الحد الأقصى المسموح لهذا الصنف هو ${effectiveMax} قطعة (${pct}% من الرصيد المتاح: ${availableQty})`,
      });
      finalQty = effectiveMax;
    }

    const cartItem: CartItem = {
      id: product.id, name_ar: product.name_ar, sku: product.sku, image_url: product.image_url,
      unit_price: getProductPrice(product), quantity: finalQty,
      stock_quantity: effectiveMax, min_order_qty: product.min_order_qty, brand: product.brand,
    };
    addItem(cartItem);
    toast({ title: "تمت الإضافة للسلة ✅", description: product.name_ar });
  }, [addItem, getProductPrice, maxOrderPct]);

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

  // Deep link: set category from URL query — clear brand to show all brands
  useEffect(() => {
    const categorySlug = searchParams.get("category");
    if (categorySlug && dbCategories) {
      const matched = dbCategories.find((c) => c.slug === categorySlug);
      if (matched) setFilters((prev) => ({ ...prev, categoryId: matched.id, brandKey: null }));
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

  const selectedCategoryFallbackKeywords = useMemo(() => {
    if (!filters.categoryId || !dbCategories) return [] as string[];
    const selectedCategory = dbCategories.find((cat: any) => cat.id === filters.categoryId);
    if (!selectedCategory) return [] as string[];
    return categoryKeywordFallbacks[selectedCategory.slug] || [selectedCategory.name_ar];
  }, [filters.categoryId, dbCategories]);

  /* ── Products (select only needed columns for performance) ── */
  const { data: products, isLoading } = useQuery({
    queryKey: ["products", "all", queryKeySuffix].filter(Boolean),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name_ar, name_en, sku, part_number, image_url, base_price, stock_quantity, safety_stock, max_order_cap, brand, category_id, is_active, is_featured, is_on_sale, sale_price, min_order_qty, compatible_models, description_ar, year_from, year_to, product_categories(name_ar)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(800);
      if (error) throw error;
      // Compute available_quantity for each product
      return (data || []).map((p: any) => ({
        ...p,
        available_quantity: Math.max(0, (p.stock_quantity || 0) - (p.safety_stock || 0)),
      }));
    },
    staleTime: 5 * 60 * 1000, // cache for 5 minutes
    gcTime: 10 * 60 * 1000, // keep in garbage collection for 10 minutes
  });

  /* ── Best-selling product IDs ── */
  const { data: bestSellingIds } = useQuery({
    queryKey: ["best_selling_ids"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_best_selling_products", { _limit: 200 });
      if (error) throw error;
      return (data as string[]) || [];
    },
    staleTime: 5 * 60 * 1000,
  });

  /* ── Most searched product IDs (boost popular items) ── */
  const { data: mostSearchedTerms } = useQuery({
    queryKey: ["most_searched_terms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_search_logs")
        .select("search_query")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      // Count frequency
      const freq: Record<string, number> = {};
      (data || []).forEach((d: any) => {
        const q = (d.search_query || "").trim().toLowerCase();
        if (q.length >= 2) freq[q] = (freq[q] || 0) + 1;
      });
      // Return top 30 terms
      return Object.entries(freq)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([term]) => normalizeArabic(term));
    },
    staleTime: 10 * 60 * 1000,
  });

  /* ── Maintenance/quick-service category IDs (priority display) ── */
  const maintenanceCategorySlugs = useMemo(() => new Set([
    "filters", "oils-gasoline", "oils-diesel", "oils-transmission",
    "brakes", "spark-plugs-coils", "belts-bearings", "water-cooling",
  ]), []);

  /* ── Smart year extraction from search query ──
   * يدعم الصيغ التالية:
   *  - 4 أرقام مباشرة:        2008
   *  - أرقام عربية/هندية:      ٢٠٠٨
   *  - بادئات شائعة:           "موديل 2008" / "سنة 2008" / "model 2008" / "year 2008" / "M2008"
   *  - ملتصقة بحروف:           "HS2008" / "هايس2008" / "كورولا2018"
   *  - اختصار سنتين:           "موديل 08" → 2008  /  "موديل 95" → 1995
   *  - نطاق سنوات:             "2005-2010" / "من 2005 الى 2010" → نأخذ أول سنة
   */
  const convertArabicDigits = (s: string): string =>
    s.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
     .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)));

  const extractYearFromSearch = (search: string): number | null => {
    const normalized = convertArabicDigits(search);
    const currentYear = new Date().getFullYear();

    // 1) سنة كاملة (4 أرقام) — مع أو بدون حروف ملاصقة (HS2008, موديل2008)
    const fullYear = normalized.match(/(?:^|[^\d])((?:19|20)\d{2})(?:[^\d]|$)/);
    if (fullYear) {
      const y = parseInt(fullYear[1], 10);
      if (y >= 1950 && y <= currentYear + 1) return y;
    }

    // 2) صيغة مختصرة بعد كلمات دالة فقط (موديل/سنة/model/year/m)
    //    لتجنب التقاط أرقام عشوائية (مثل أكواد القطع)
    const shortYear = normalized.match(
      /(?:موديل|موديلات|سنه|سنة|عام|model|year|\bm)\s*[-:]?\s*(\d{2})(?!\d)/i
    );
    if (shortYear) {
      const yy = parseInt(shortYear[1], 10);
      const y = yy <= (currentYear % 100) + 1 ? 2000 + yy : 1900 + yy;
      if (y >= 1950 && y <= currentYear + 1) return y;
    }

    return null;
  };

  const removeYearFromSearch = (search: string): string => {
    let out = convertArabicDigits(search);
    // إزالة الكلمات الدالة + السنة (4 أرقام أو 2)
    out = out.replace(
      /(?:موديل|موديلات|سنه|سنة|عام|model|year)\s*[-:]?\s*\d{2,4}/gi,
      " "
    );
    // إزالة "M2008" أو "m08"
    out = out.replace(/\bm\s*[-:]?\s*\d{2,4}\b/gi, " ");
    // إزالة أي سنة 4 أرقام متبقية (حتى لو ملتصقة بحروف: HS2008)
    out = out.replace(/(19|20)\d{2}/g, " ");
    // إزالة نطاقات (-) المتبقية
    out = out.replace(/\s*[-–—]\s*/g, " ");
    return out.replace(/\s+/g, " ").trim();
  };

  /* ── Filtering with Arabic normalization + smart year matching ── */
  const filteredProducts = useMemo(() => {
    if (!products) return [];

    const rawSearch = filters.search?.trim() || "";
    const searchYear = rawSearch ? extractYearFromSearch(rawSearch) : null;
    const searchWithoutYear = rawSearch ? removeYearFromSearch(rawSearch) : "";

    // Step 1: Base filtering (text match + other filters, NO year filtering yet)
    const baseFilter = (p: any) => {
      const normalizedName = normalizeArabic(p.name_ar || "");
      const skuLower = (p.sku || "").toLowerCase();
      const nameEnLower = (p.name_en || "").toLowerCase();
      const descArNorm = normalizeArabic(p.description_ar || "");
      const modelsText = normalizeArabic((p.compatible_models || []).join(" "));
      const allText = `${normalizedName} ${skuLower} ${nameEnLower} ${descArNorm} ${modelsText}`;

      // When searching, show results from ALL brands (cross-brand search)
      const hasActiveSearch = !!rawSearch;
      const matchesBrand = hasActiveSearch || !filters.brandKey || p.brand === filters.brandKey;

      let matchesSearch = true;
      if (rawSearch) {
        const textToSearch = expandAliases(searchYear ? searchWithoutYear : rawSearch);
        if (textToSearch) {
          const searchWords = textToSearch.trim().split(/\s+/).filter((w: string) => w.length > 0);
          matchesSearch = searchWords.every((word: string) => fuzzyMatchWord(word, allText));
        }
      }

      const matchesCategoryById = !!filters.categoryId && p.category_id === filters.categoryId;
      const matchesCategoryByFallback = !!filters.categoryId && selectedCategoryFallbackKeywords.length > 0 &&
        selectedCategoryFallbackKeywords.some((keyword) =>
          fuzzyMatchWord(keyword, normalizedName, descArNorm, modelsText)
        );
      const matchesCategory = !filters.categoryId || matchesCategoryById || matchesCategoryByFallback;

      let matchesModel = true;
      if (filters.model) {
        matchesModel = fuzzyMatchWord(filters.model, normalizedName, modelsText);
      }

      const matchesYear = !filters.year || p.name_ar.includes(filters.year);
      const matchesPartNumber = !filters.partNumber || skuLower.includes(filters.partNumber.toLowerCase());
      const price = p.base_price;
      const matchesPriceMin = !filters.priceMin || price >= Number(filters.priceMin);
      const matchesPriceMax = !filters.priceMax || price <= Number(filters.priceMax);

      if (filters.maintenanceOnly) {
        const maintenanceCatIds = new Set<string>();
        dbCategories?.forEach((cat: any) => {
          if (maintenanceCategorySlugs.has(cat.slug)) maintenanceCatIds.add(cat.id);
        });
        if (!p.category_id || !maintenanceCatIds.has(p.category_id)) return false;
      }

      if (filters.onSaleOnly && !p.is_on_sale) return false;
      if (filters.bestSellingOnly && !bestSellingIds?.includes(p.id)) return false;

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
      case "best_selling": {
        if (bestSellingIds && bestSellingIds.length > 0) {
          const rankMap = new Map(bestSellingIds.map((id, i) => [id, i]));
          result.sort((a, b) => {
            const ra = rankMap.has(a.id) ? rankMap.get(a.id)! : Infinity;
            const rb = rankMap.has(b.id) ? rankMap.get(b.id)! : Infinity;
            return ra - rb;
          });
        }
        break;
      }
      default: {
        // Smart default: maintenance first → most searched → diversified mix
        const hasActiveSearch = !!filters.search?.trim();
        
        if (!hasActiveSearch) {
          // Build maintenance category IDs set
          const maintenanceCatIds = new Set<string>();
          dbCategories?.forEach((cat: any) => {
            if (maintenanceCategorySlugs.has(cat.slug)) maintenanceCatIds.add(cat.id);
          });

          // Score each product for smart ordering
          const scored = result.map(p => {
            let score = 0;
            // Priority 1: Maintenance categories (+300)
            if (p.category_id && maintenanceCatIds.has(p.category_id)) score += 300;
            // Priority 2: Best sellers (+200)
            if (bestSellingIds?.includes(p.id)) score += 200;
            // Priority 3: Most searched match (+100)
            if (mostSearchedTerms) {
              const nameNorm = normalizeArabic(p.name_ar);
              const matchCount = mostSearchedTerms.filter(t => nameNorm.includes(t)).length;
              score += matchCount * 100;
            }
            // Priority 4: Has image (+50)
            if (p.image_url) score += 50;
            // Priority 5: In stock (+30)
            if (p.available_quantity > 0) score += 30;
            return { p, score };
          });

          // Sort by score desc, then diversify within same score tier
          scored.sort((a, b) => b.score - a.score);

          // Diversify: interleave brands within score tiers
          const tiers: any[][] = [];
          let currentTier: any[] = [];
          let currentScore = -1;
          for (const s of scored) {
            if (s.score !== currentScore && currentTier.length > 0) {
              tiers.push(currentTier);
              currentTier = [];
            }
            currentScore = s.score;
            currentTier.push(s.p);
          }
          if (currentTier.length > 0) tiers.push(currentTier);

          // Interleave brands within each tier
          const diversified: any[] = [];
          for (const tier of tiers) {
            const brandBuckets = new Map<string, any[]>();
            for (const p of tier) {
              const key = p.brand || "_";
              if (!brandBuckets.has(key)) brandBuckets.set(key, []);
              brandBuckets.get(key)!.push(p);
            }
            if (brandBuckets.size > 1) {
              const bucketArrays = Array.from(brandBuckets.values());
              let idx = 0;
              const tierSize = tier.length;
              while (diversified.length < diversified.length + tierSize) {
                const bucket = bucketArrays[idx % bucketArrays.length];
                const itemIdx = Math.floor(idx / bucketArrays.length);
                if (itemIdx < bucket.length) {
                  diversified.push(bucket[itemIdx]);
                }
                idx++;
                if (idx > tierSize * 3) break;
              }
              // Add remaining
              const addedIds = new Set(diversified.map(p => p.id));
              for (const p of tier) {
                if (!addedIds.has(p.id)) diversified.push(p);
              }
            } else {
              diversified.push(...tier);
            }
          }
          result = diversified;
        } else {
          result = [...result].sort((a, b) => {
            const scoreDiff = getSearchRelevanceScore(rawSearch, b) - getSearchRelevanceScore(rawSearch, a);
            if (scoreDiff !== 0) return scoreDiff;

            const aAvailable = a.available_quantity ?? a.stock_quantity ?? 0;
            const bAvailable = b.available_quantity ?? b.stock_quantity ?? 0;
            if (bAvailable !== aAvailable) return bAvailable - aAvailable;

            if (Boolean(b.image_url) !== Boolean(a.image_url)) {
              return Number(Boolean(b.image_url)) - Number(Boolean(a.image_url));
            }

            return a.name_ar.localeCompare(b.name_ar, "ar");
          });
        }
        break;
      }
    }

    return result;
  }, [products, filters, bestSellingIds, dbCategories, maintenanceCategorySlugs, mostSearchedTerms, selectedCategoryFallbackKeywords]);

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

  /* ── Category counts & visible categories (respect brand filter) ── */
  const brandFilteredProducts = useMemo(() => {
    if (!products) return [];
    if (!filters.brandKey) return products;
    return products.filter(p => p.brand === filters.brandKey);
  }, [products, filters.brandKey]);

  const categoryCounts = useMemo(() => {
    return brandFilteredProducts.reduce((acc, p) => {
      if (p.category_id) acc[p.category_id] = (acc[p.category_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [brandFilteredProducts]);

  const visibleCategories = useMemo(() => {
    return dbCategories?.filter(cat => brandFilteredProducts.some(p => p.category_id === cat.id));
  }, [dbCategories, brandFilteredProducts]);

  /* ── Product detail dialog price helpers ── */
  const getDialogPrice = useCallback((product: any) => {
    if (!product) return null;
    if (!user) return null;
    if (!isDealer) return product.base_price;
    if (isRetailTier) return product.base_price;
    if (viewedProductIds.includes(product.id)) return getProductPrice(product);
    return null;
  }, [user, isDealer, isRetailTier, viewedProductIds, getProductPrice]);

  const getDialogPriceLabel = useCallback((product: any) => {
    if (!product || !user) return undefined;
    if (isDealer && isRetailTier) return "سعر قطاعي";
    if (isDealer && viewedProductIds.includes(product.id)) return "سعر الجملة الخاص بك";
    if (!isDealer) return "سعر قطاعي";
    return undefined;
  }, [user, isDealer, isRetailTier, viewedProductIds]);

  const canAddToCartDialog = useCallback((product: any) => {
    if (!user) return false;
    if (!isDealer) return true;
    if (isRetailTier) return true;
    return product && viewedProductIds.includes(product.id);
  }, [user, isDealer, isRetailTier, viewedProductIds]);

  return {
    // Auth
    user, isDealer, dealerAccount, isRetailTier,
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
