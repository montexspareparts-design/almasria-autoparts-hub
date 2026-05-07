import { useState, useRef, useEffect, useMemo } from "react";
import { Search, X, Package, Hash, Command, Lightbulb, PlusCircle, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { normalizeArabic, expandAliases, getSearchRelevanceScore } from "@/hooks/useProductListing";

interface Product {
  id: string;
  name_ar: string;
  name_en?: string | null;
  description_ar?: string | null;
  compatible_models?: string[] | null;
  sku: string;
  image_url: string | null;
  base_price: number;
  brand: string;
  stock_quantity?: number;
  available_quantity?: number;
  safety_stock?: number;
}

interface Props {
  value: string;
  onChange: (value: string) => void;
  products?: Product[];
  onProductClick?: (product: Product) => void;
  onAddToQuote?: (product: Product) => void;
  onCommandPaletteOpen?: () => void;
  placeholder?: string;
  isDealer?: boolean;
  getProductPrice?: (product: Product) => { price: number | null; label: string } | null;
}

const brandLabels: Record<string, { label: string; color: string }> = {
  toyota_genuine: { label: "أصلي", color: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800" },
  toyota_oils: { label: "زيوت تويوتا", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800" },
  mtx_aftermarket: { label: "MTX", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800" },
  denso: { label: "DENSO", color: "bg-orange-500/15 text-orange-700 dark:text-orange-400 border-orange-200 dark:border-orange-800" },
  aisin: { label: "AISIN", color: "bg-purple-500/15 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800" },
  fbk: { label: "FBK", color: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-200 dark:border-cyan-800" },
};

/* ── Common model names & parts for "did you mean?" ── */
const knownTerms = [
  "كورولا", "كامري", "ياريس", "يارس", "هايلكس", "لاندكروزر", "لاند كروزر",
  "فورتشنر", "برادو", "راف فور", "افالون", "اوريون", "كوستر", "هاي اس",
  "هاي لوكس", "راش", "ايكو", "هايس",
  "فلتر", "فلاتر", "تيل", "سير", "سيور", "بوجيه", "بوجيهات", "بوجية", "بواجي",
  "كشاف", "كشافات", "مرايا", "مرايات", "زيت", "زيوت",
  "دبرياج", "كلاتش", "فتيس", "جيربوكس", "مكينة", "موتور",
  "ريداتير", "رديتر", "مساعد", "مساعدين", "بطارية",
  "اكصدام", "اكسدام", "طلمبة", "حساس", "جوان", "جوانات",
  "كاوتش", "كاوتشة", "كاوتشات", "طنبورة", "شداد",
  "اويل سيل", "كرنك", "كرتيرة", "اسطوانة",
  "ميزان", "مقص", "جلبة", "بلية", "كوعة",
  "فانوس", "غطاء", "فبرة", "كبوت", "باب",
  "صباب", "ماستر", "رشاش", "سربنتينة", "كاتينة",
  "شبكة", "نيكل", "مسمار", "قاعدة", "حامل",
  "تكييف", "هواء", "بنزين", "ديزل", "مياه",
  "عجل", "صرة", "طقم", "عمة", "شكمان",
  "دينامو", "مارش", "ايرباج", "طارة", "كلاكس",
  "سوستة", "شاسيه", "عفشة", "عفشه", "تربيط",
];

const toSkeleton = (text: string): string =>
  normalizeArabic(text).replace(/[اوي]/g, "");

const findDidYouMean = (input: string): string | null => {
  const normalized = normalizeArabic(input);
  const expanded = expandAliases(input);
  if (expanded !== normalized) return expanded;
  if (knownTerms.some(t => normalizeArabic(t) === normalized)) return null;
  const inputSkeleton = toSkeleton(input);
  if (inputSkeleton.length < 2) return null;
  let bestMatch: string | null = null;
  let bestScore = Infinity;
  for (const term of knownTerms) {
    const termSkeleton = toSkeleton(term);
    if (termSkeleton.length < 2) continue;
    if (termSkeleton === inputSkeleton || termSkeleton.includes(inputSkeleton) || inputSkeleton.includes(termSkeleton)) {
      const score = Math.abs(termSkeleton.length - inputSkeleton.length);
      if (score < bestScore) { bestScore = score; bestMatch = term; }
    }
  }
  return bestMatch;
};

const ProductSearchAutocomplete = ({
  value, onChange, products = [], onProductClick, onAddToQuote, onCommandPaletteOpen,
  placeholder = "ابحث بالاسم أو رقم القطعة...", isDealer = false, getProductPrice
}: Props) => {
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [typingPlaceholder, setTypingPlaceholder] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const placeholderPhrases = [
    "فلتر زيت كورولا...",
    "تيل فرامل كامري...",
    "04152-YZZA1...",
    "بوجيهات يارس...",
    "سير مكينة...",
  ];

  useEffect(() => {
    if (value || isFocused) return;
    let phraseIdx = 0;
    let charIdx = 0;
    let deleting = false;
    let timeout: ReturnType<typeof setTimeout>;
    const tick = () => {
      const phrase = placeholderPhrases[phraseIdx];
      if (!deleting) {
        charIdx++;
        setTypingPlaceholder(phrase.slice(0, charIdx));
        if (charIdx === phrase.length) { deleting = true; timeout = setTimeout(tick, 1800); return; }
        timeout = setTimeout(tick, 70);
      } else {
        charIdx--;
        setTypingPlaceholder(phrase.slice(0, charIdx));
        if (charIdx === 0) { deleting = false; phraseIdx = (phraseIdx + 1) % placeholderPhrases.length; timeout = setTimeout(tick, 400); return; }
        timeout = setTimeout(tick, 35);
      }
    };
    timeout = setTimeout(tick, 500);
    return () => clearTimeout(timeout);
  }, [value, isFocused]);

  const popularProducts = useMemo(() => {
    if (value && value.length >= 2) return [];
    let filtered = [...products];
    return filtered.sort((a, b) => (b as any).stock_quantity - (a as any).stock_quantity).slice(0, 8);
  }, [products, value]);

  const allMatches = useMemo(() => {
    if (!value || value.length < 2) return [];
    return [...products]
      .map((product) => ({ product, score: getSearchRelevanceScore(value, product) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const aStock = a.product.available_quantity ?? a.product.stock_quantity ?? 0;
        const bStock = b.product.available_quantity ?? b.product.stock_quantity ?? 0;
        return bStock - aStock;
      })
      .map(({ product }) => product);
  }, [value, products, isDealer]);

  const suggestions = useMemo(() => allMatches.slice(0, 16), [allMatches]);
  const filteredTotal = allMatches.length;

  // ── Extract core part type from product name ──
  const extractPartType = (name: string): string => {
    // Remove brand suffixes, model names, years, and qualifiers to get the core part
    let core = name
      .replace(/\b(اصلي|أصلي|ياباني|كوري|صيني|تايواني|DENSO|FBK|AISIN|MTX)\b/gi, "")
      .replace(/\b(تويوتا|toyota)\b/gi, "")
      .replace(/\b\d{4}\b/g, "") // years
      .replace(/\b[A-Z0-9]{2,}-?[A-Z0-9]*\b/g, "") // part numbers like 1GD, 2KD
      .replace(/&/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    
    // Extract key part words (first 2-3 meaningful words)
    const partKeywords = [
      "تيل", "فلتر", "سير", "بواجي", "بوجيه", "بوجية", "زيت", "كشاف", "مرايا", "مساعد",
      "اويل سيل", "دبرياج", "ديسك", "اسطوانة", "كلاتش", "طلمبة", "حساس", "جوان",
      "ريداتير", "رديتر", "بطارية", "اكصدام", "شكمان", "دينامو", "مارش",
      "فانوس", "غطاء", "صباب", "ماستر", "رشاش", "كاتينة", "شبكة",
      "عفشة", "سوستة", "مقص", "جلبة", "بلية", "كوعة", "طنبورة", "شداد",
      "كرنك", "كرتيرة", "فتيس", "جيربوكس", "ميزان", "قاعدة", "حامل",
      "فبرة", "كبوت", "باب", "طارة", "كلاكس", "صرة", "عمة",
    ];
    
    // Find the main part keyword in the name
    const normalizedCore = normalizeArabic(core);
    for (const kw of partKeywords) {
      if (normalizedCore.includes(normalizeArabic(kw))) {
        return kw;
      }
    }
    
    // Fallback: use first 2 words
    const words = core.split(/\s+/).filter(w => w.length > 1);
    return words.slice(0, 2).join(" ") || core;
  };

  // Brand priority: original first, then alternatives
  const brandPriority: Record<string, number> = {
    toyota_genuine: 0,
    toyota_oils: 1,
    denso: 2,
    aisin: 3,
    fbk: 4,
    mtx_aftermarket: 5,
  };

  // Group suggestions by part type, show original first then alternatives
  const groupedSuggestions = useMemo(() => {
    if (suggestions.length === 0) return [];
    
    const groups: Record<string, Product[]> = {};
    const groupOrder: string[] = [];
    
    for (const p of suggestions) {
      const partType = extractPartType(p.name_ar);
      if (!groups[partType]) {
        groups[partType] = [];
        groupOrder.push(partType);
      }
      groups[partType].push(p);
    }
    
    // Sort products within each group: original first, then alternatives
    for (const key of groupOrder) {
      groups[key].sort((a, b) => (brandPriority[a.brand] ?? 99) - (brandPriority[b.brand] ?? 99));
    }
    
    return groupOrder.map(partType => ({ partType, products: groups[partType] }));
  }, [suggestions]);

  const didYouMean = useMemo(() => {
    if (!value || value.length < 2) return null;
    const words = value.trim().split(/\s+/);
    for (const word of words) {
      if (word.length < 2) continue;
      const suggestion = findDidYouMean(word);
      if (suggestion) return { original: word, suggested: suggestion };
    }
    return null;
  }, [value]);

  const hasSearchQuery = value && value.length >= 2;
  const noResults = hasSearchQuery && suggestions.length === 0;
  const showDropdown = isFocused && (suggestions.length > 0 || didYouMean || popularProducts.length > 0 || noResults);
  const displayProducts = suggestions.length > 0 ? suggestions : popularProducts;

  useEffect(() => { setSelectedIndex(-1); }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) setIsFocused(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSelectedIndex(prev => Math.min(prev + 1, displayProducts.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSelectedIndex(prev => Math.max(prev - 1, -1)); }
    else if (e.key === "Enter" && selectedIndex >= 0 && displayProducts[selectedIndex]) { e.preventDefault(); onProductClick?.(displayProducts[selectedIndex]); setIsFocused(false); }
    else if (e.key === "Escape") setIsFocused(false);
  };

  const applyDidYouMean = () => {
    if (!didYouMean) return;
    onChange(value.replace(didYouMean.original, didYouMean.suggested));
  };

  // Build flat index map for grouped suggestions keyboard navigation
  const flatIndexMap = useMemo(() => {
    const map: { idx: number; product: Product }[] = [];
    for (const group of groupedSuggestions) {
      for (const p of group.products) {
        map.push({ idx: map.length, product: p });
      }
    }
    return map;
  }, [groupedSuggestions]);

  let renderFlatIdx = 0;

  return (
    <div ref={wrapperRef} className="relative w-full flex-1">
      {/* Google-style search bar */}
      <div className="relative group">
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
          <Search className="w-5 h-5 sm:w-5 sm:h-5 text-primary/70 group-focus-within:text-primary transition-colors duration-300" />
        </div>
        <Input
          ref={inputRef}
          name="product-search"
          type="search"
          aria-label="بحث المنتجات"
          placeholder={value ? placeholder : (typingPlaceholder || "🔍  ابحث عن قطعة، رقم، أو موديل...")}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          dir="rtl"
          className="pr-12 pl-14 sm:pl-16 bg-background border-2 border-border/70 h-14 sm:h-12 text-base sm:text-sm font-medium placeholder:text-muted-foreground/60 placeholder:font-normal rounded-2xl sm:rounded-full shadow-md transition-all duration-200 focus-visible:ring-2 focus-visible:ring-primary/25 focus-visible:ring-offset-0 focus-visible:border-primary/50 focus-visible:shadow-xl focus-visible:shadow-primary/10 focus-visible:animate-search-glow text-right truncate"
        />
        <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {value && (
            <button
              type="button"
              onClick={() => { onChange(""); setSelectedIndex(-1); inputRef.current?.focus(); }}
              aria-label="مسح البحث"
              className="text-muted-foreground hover:text-foreground active:scale-95 transition-all w-9 h-9 sm:w-7 sm:h-7 rounded-full bg-muted/70 hover:bg-muted flex items-center justify-center shadow-sm"
            >
              <X className="w-5 h-5 sm:w-4 sm:h-4" />
            </button>
          )}
          {onCommandPaletteOpen && (
            <button
              onClick={onCommandPaletteOpen}
              className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground bg-muted/80 px-1.5 py-0.5 rounded-md border border-border/50 hover:bg-accent transition-colors"
              title="بحث سريع (Ctrl+K)"
            >
              <Command className="w-3 h-3" />K
            </button>
          )}
        </div>
      </div>

      {/* Google-style dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.12 }}
            className="absolute top-full right-0 left-0 mt-1 bg-background border border-border/70 rounded-2xl shadow-2xl shadow-black/10 overflow-hidden z-[60]"
          >
            <div className="max-h-[65vh] sm:max-h-[480px] overflow-y-auto">
              {/* Did you mean */}
              {didYouMean && (
                <button
                  onClick={applyDidYouMean}
                  className="w-full flex items-center gap-2 px-4 py-2.5 bg-amber-50/80 dark:bg-amber-950/30 hover:bg-amber-100/80 dark:hover:bg-amber-900/30 transition-colors text-right border-b border-border/30"
                >
                  <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                  <p className="text-xs text-foreground">
                    هل تقصد <span className="font-bold text-primary">{didYouMean.suggested}</span>؟
                  </p>
                </button>
              )}

              {/* No results message — enhanced with CTAs */}
              {noResults && !didYouMean && (
                <div className="px-4 py-6 text-center">
                  <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                  <p className="text-sm font-bold text-foreground mb-1">لا توجد نتائج لـ "{value}"</p>
                  <p className="text-xs text-muted-foreground mb-4">جرّب كلمات مختلفة، رقم القطعة، أو موديل السيارة</p>
                  <div className="flex flex-col gap-2">
                    <button
                      onClick={() => { onChange(""); inputRef.current?.focus(); }}
                      className="w-full px-4 py-2.5 rounded-xl bg-muted hover:bg-accent text-foreground text-xs font-bold transition-colors"
                    >
                      مسح البحث وإعادة المحاولة
                    </button>
                    <a
                      href={`https://wa.me/201027815696?text=${encodeURIComponent(`أبحث عن قطعة: ${value}`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full px-4 py-2.5 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-xs font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      اطلب القطعة عبر واتساب
                    </a>
                  </div>
                </div>
              )}

              {/* Mobile quick-pick: select first suggestion */}
              {suggestions.length > 0 && (
                <button
                  onClick={() => { onProductClick?.(suggestions[0]); setIsFocused(false); }}
                  className="sm:hidden w-full flex items-center justify-between gap-2 px-4 py-2.5 bg-primary/10 hover:bg-primary/15 transition-colors text-right border-b border-border/30"
                >
                  <span className="text-[11px] text-primary font-bold flex items-center gap-1.5">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    اختيار أول اقتراح
                  </span>
                  <span className="text-[11px] text-foreground font-medium truncate max-w-[60%]">
                    {suggestions[0].name_ar}
                  </span>
                </button>
              )}

              {/* No search: popular items */}
              {!noResults && suggestions.length === 0 && popularProducts.length > 0 && (
                <>
                  <div className="px-4 py-2 text-[11px] text-muted-foreground font-medium border-b border-border/20">
                    🔥 الأكثر توفراً
                  </div>
                  {popularProducts.map((product, idx) => {
                    const currentIdx = idx;
                    return (
                      <SearchResultItem
                        key={product.id}
                        product={product}
                        isSelected={selectedIndex === currentIdx}
                        onSelect={() => { onProductClick?.(product); setIsFocused(false); }}
                        onHover={() => setSelectedIndex(currentIdx)}
                        onAddToQuote={onAddToQuote}
                        isDealer={isDealer}
                        showBrand
                        getProductPrice={getProductPrice}
                      />
                    );
                  })}
                </>
              )}

              {/* Search results grouped by part type — original first then alternatives */}
              {groupedSuggestions.map((group) => {
                return (
                  <div key={group.partType}>
                    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm px-5 py-2 flex items-center gap-2 border-b border-border/20">
                      <span className="text-[11px] font-bold text-foreground">
                        {group.partType}
                      </span>
                      <span className="text-[10px] text-muted-foreground/60">
                        {group.products.length} صنف
                      </span>
                    </div>
                    {group.products.map((product) => {
                      const currentIdx = renderFlatIdx++;
                      return (
                         <SearchResultItem
                          key={product.id}
                          product={product}
                          isSelected={selectedIndex === currentIdx}
                          onSelect={() => { onProductClick?.(product); setIsFocused(false); }}
                          onHover={() => setSelectedIndex(currentIdx)}
                          onAddToQuote={onAddToQuote}
                          isDealer={isDealer}
                          showBrand
                          getProductPrice={getProductPrice}
                        />
                      );
                    })}
                  </div>
                );
              })}

              {/* Show all results footer */}
              {suggestions.length > 0 && (
                <div className="border-t border-border/30 p-2">
                  <button
                    onClick={() => setIsFocused(false)}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl hover:bg-muted text-primary text-xs font-bold transition-colors"
                  >
                    عرض كل النتائج ({filteredTotal})
                    <ArrowLeft className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

/* ── Single result item (Google Search style) ── */
const SearchResultItem = ({
  product, isSelected, onSelect, onHover, onAddToQuote, isDealer, showBrand = false, getProductPrice,
}: {
  product: Product;
  isSelected: boolean;
  onSelect: () => void;
  onHover: () => void;
  onAddToQuote?: (product: Product) => void;
  isDealer: boolean;
  showBrand?: boolean;
  getProductPrice?: (product: Product) => { price: number | null; label: string } | null;
}) => {
  const brandInfo = brandLabels[product.brand];
  const isAvailable = ((product as any).stock_quantity ?? 0) > ((product as any).safety_stock ?? 0);

  return (
    <button
      onClick={onSelect}
      onMouseEnter={onHover}
      className={`w-full text-right px-5 py-3 transition-colors group ${
        isSelected ? "bg-muted/60" : "hover:bg-muted/30"
      }`}
    >
      {/* Line 1: SKU (like Google URL breadcrumb) */}
      <div className="flex items-center gap-1.5 mb-0.5">
        {product.image_url ? (
          <div className="w-5 h-5 rounded-full bg-muted/50 shrink-0 flex items-center justify-center overflow-hidden border border-border/30">
            <img src={product.image_url} alt="" className="w-full h-full object-contain" loading="lazy" />
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full bg-muted/50 shrink-0 flex items-center justify-center border border-border/30">
            <Hash className="w-2.5 h-2.5 text-muted-foreground/40" />
          </div>
        )}
        <span dir="ltr" className="text-[11px] font-mono text-muted-foreground truncate">{product.sku}</span>
        {showBrand && brandInfo && (
          <span className={`text-[9px] font-bold px-1.5 py-0 rounded-full border ${brandInfo.color}`}>
            {brandInfo.label}
          </span>
        )}
      </div>

      {/* Line 2: Product name (like Google title) */}
      <p className="text-[13px] font-semibold text-primary group-hover:underline decoration-primary/40 leading-snug line-clamp-2 mr-6">
        {product.name_ar}
      </p>

      {/* Line 3: Meta info (like Google description) */}
      <div className="mt-1 flex items-center gap-2 flex-wrap mr-6">
        {isDealer && (
          isAvailable ? (
            <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
              <CheckCircle className="w-3 h-3" />
              <span className="text-[11px]">متوفر</span>
            </span>
          ) : (
            <span className="flex items-center gap-0.5 text-destructive">
              <XCircle className="w-3 h-3" />
              <span className="text-[11px]">نفد</span>
            </span>
          )
        )}
        {getProductPrice && (() => {
          const priceInfo = getProductPrice(product);
          if (!priceInfo || priceInfo.price === null) return null;
          return (
            <span className="text-[11px] text-muted-foreground">
              {priceInfo.label}: <span className="font-bold text-foreground">{priceInfo.price.toLocaleString('ar-EG')} ج.م</span>
            </span>
          );
        })()}
        {isDealer && onAddToQuote && (
          <button
            onClick={(e) => { e.stopPropagation(); onAddToQuote(product); }}
            className="mr-auto shrink-0 flex items-center gap-1 text-[10px] text-primary hover:text-primary/80 font-bold transition-colors"
            title="أضف للسلة"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>أضف</span>
          </button>
        )}
      </div>
    </button>
  );
};
export default ProductSearchAutocomplete;
