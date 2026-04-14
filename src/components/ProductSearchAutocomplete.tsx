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
    if (isDealer) {
      filtered = filtered.filter(p => {
        const available = (p.available_quantity ?? ((p.stock_quantity ?? 0) - (p.safety_stock ?? 0)));
        return available > 0;
      });
    }
    return filtered.sort((a, b) => (b as any).stock_quantity - (a as any).stock_quantity).slice(0, 8);
  }, [products, value, isDealer]);

  const allMatches = useMemo(() => {
    if (!value || value.length < 2) return [];
    return [...products]
      .filter((p) => {
        if (isDealer) {
          const available = (p.available_quantity ?? ((p.stock_quantity ?? 0) - (p.safety_stock ?? 0)));
          if (available <= 0) return false;
        }
        return true;
      })
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

  // Count ALL matches per brand (not just displayed slice)
  const brandTotalCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const p of allMatches) {
      counts[p.brand] = (counts[p.brand] || 0) + 1;
    }
    return counts;
  }, [allMatches]);

  // Group suggestions by brand for display
  const groupedSuggestions = useMemo(() => {
    if (suggestions.length === 0) return [];
    const groups: Record<string, Product[]> = {};
    const brandOrder: string[] = [];
    for (const p of suggestions) {
      if (!groups[p.brand]) {
        groups[p.brand] = [];
        brandOrder.push(p.brand);
      }
      groups[p.brand].push(p);
    }
    return brandOrder.map(brand => ({ brand, products: groups[brand] }));
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

  const showDropdown = isFocused && (suggestions.length > 0 || didYouMean || popularProducts.length > 0);
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
    <div ref={wrapperRef} className="relative flex-1">
      {/* Google-style search bar */}
      <div className="relative group">
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center justify-center">
          <Search className="w-5 h-5 text-muted-foreground/50 group-focus-within:text-primary transition-colors duration-300" />
        </div>
        <Input
          ref={inputRef}
          placeholder={value ? placeholder : (typingPlaceholder || placeholder)}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          className="pr-11 pl-16 bg-background border-border h-11 sm:h-12 text-sm placeholder:text-muted-foreground/40 rounded-full shadow-sm transition-all duration-200 focus-visible:ring-1 focus-visible:ring-primary/20 focus-visible:ring-offset-0 focus-visible:border-primary/30 focus-visible:shadow-lg focus-visible:shadow-primary/5"
        />
        <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {value && (
            <button onClick={() => onChange("")} className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-full hover:bg-muted">
              <X className="w-4 h-4" />
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
            className="absolute top-full right-0 left-0 mt-1 w-[min(96vw,28rem)] sm:w-auto bg-background border border-border/70 rounded-2xl shadow-2xl shadow-black/10 overflow-hidden z-[60]"
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

              {/* No search: popular items */}
              {suggestions.length === 0 && popularProducts.length > 0 && (
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

              {/* Search results grouped by brand */}
              {groupedSuggestions.map((group) => {
                const brandInfo = brandLabels[group.brand] || { label: group.brand, color: "bg-muted text-muted-foreground border-border" };
                return (
                  <div key={group.brand}>
                    <div className="sticky top-0 z-10 bg-muted/60 backdrop-blur-sm px-4 py-1.5 flex items-center gap-2 border-b border-border/20">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${brandInfo.color}`}>
                        {brandInfo.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {brandTotalCounts[group.brand] || group.products.length} صنف
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

/* ── Single result item (Google-style) ── */
const SearchResultItem = ({
  product, isSelected, onSelect, onHover, onAddToQuote, isDealer, showBrand = false,
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
      className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-right ${
        isSelected ? "bg-primary/5" : "hover:bg-muted/50"
      }`}
    >
      {/* Thumbnail */}
      <div className="w-10 h-10 rounded-lg bg-muted/50 shrink-0 flex items-center justify-center overflow-hidden">
        {product.image_url ? (
          <img src={product.image_url} alt="" className="w-full h-full object-contain p-0.5" loading="lazy" />
        ) : (
          <Package className="w-4 h-4 text-muted-foreground/30" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold line-clamp-1 leading-snug text-foreground">{product.name_ar}</p>
        <div className="mt-0.5 flex items-center gap-2 flex-wrap">
          <span dir="ltr" className="text-[10px] font-mono text-muted-foreground">{product.sku}</span>
          {showBrand && brandInfo && (
            <span className={`text-[9px] font-bold px-1.5 py-0 rounded-full border ${brandInfo.color}`}>
              {brandInfo.label}
            </span>
          )}
          {isDealer && (
            isAvailable ? (
              <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400">
                <CheckCircle className="w-2.5 h-2.5" />
                <span className="text-[10px]">متوفر</span>
              </span>
            ) : (
              <span className="flex items-center gap-0.5 text-destructive">
                <XCircle className="w-2.5 h-2.5" />
                <span className="text-[10px]">نفد</span>
              </span>
            )
          )}
        </div>
      </div>

      {/* Add to quote */}
      {isDealer && onAddToQuote && (
        <button
          onClick={(e) => { e.stopPropagation(); onAddToQuote(product); }}
          className="shrink-0 w-7 h-7 rounded-full bg-primary/10 hover:bg-primary/20 text-primary flex items-center justify-center transition-colors"
          title="أضف لعرض السعر"
        >
          <PlusCircle className="w-3.5 h-3.5" />
        </button>
      )}
    </button>
  );
};

export default ProductSearchAutocomplete;
