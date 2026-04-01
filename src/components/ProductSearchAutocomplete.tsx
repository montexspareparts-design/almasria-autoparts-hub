import { useState, useRef, useEffect, useMemo } from "react";
import { Search, X, Package, Hash, Command, Lightbulb, PlusCircle, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { normalizeArabic, expandAliases } from "@/hooks/useProductListing";

interface Product {
  id: string;
  name_ar: string;
  sku: string;
  image_url: string | null;
  base_price: number;
  brand: string;
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
}

/* ── Common model names & parts for "did you mean?" ── */
const knownTerms = [
  // موديلات تويوتا
  "كورولا", "كامري", "ياريس", "يارس", "هايلكس", "لاندكروزر", "لاند كروزر",
  "فورتشنر", "برادو", "راف فور", "افالون", "اوريون", "كوستر", "هاي اس",
  "هاي لوكس", "راش", "ايكو", "هايس",
  // قطع غيار رئيسية
  "فلتر", "فلاتر", "تيل", "سير", "سيور", "بوجيه", "بوجيهات", "بوجية", "بواجي",
  "كشاف", "كشافات", "مرايا", "مرايات", "زيت", "زيوت",
  "دبرياج", "كلاتش", "فتيس", "جيربوكس", "مكينة", "موتور",
  "ريداتير", "رديتر", "مساعد", "مساعدين", "بطارية",
  // قطع غيار تفصيلية
  "اكصدام", "اكسدام", "طلمبة", "حساس", "جوان", "جوانات",
  "كاوتش", "كاوتشة", "كاوتشات", "طنبورة", "شداد",
  "اويل سيل", "كرنك", "كرتيرة", "اسطوانة",
  "ميزان", "مقص", "جلبة", "بلية", "كوعة",
  "فانوس", "غطاء", "فبرة", "كبوت", "باب",
  "صباب", "ماستر", "رشاش", "سربنتينة", "كاتينة",
  "شبكة", "نيكل", "مسمار", "قاعدة", "حامل",
  "تكييف", "هواء", "بنزين", "ديزل", "مياه",
  "عجل", "صرة", "طقم", "عمة", "شكمان",
  // أجزاء إضافية
  "دينامو", "مارش", "ايرباج", "طارة", "كلاكس",
  "سوستة", "شاسيه", "عفشة", "عفشه", "تربيط",
];

/** Strip Arabic vowel letters to create consonant skeleton */
const toSkeleton = (text: string): string =>
  normalizeArabic(text).replace(/[اوي]/g, "");

/** Find the best known term that matches the user's fuzzy input */
const findDidYouMean = (input: string): string | null => {
  const normalized = normalizeArabic(input);
  
  // Check compound aliases first (e.g., هاياس → هاي اس)
  const expanded = expandAliases(input);
  if (expanded !== normalized) return expanded;

  // Don't suggest if already an exact known term
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
      if (score < bestScore) {
        bestScore = score;
        bestMatch = term;
      }
    }
  }

  return bestMatch;
};

/** Fuzzy product search using skeleton matching + aliases */
const fuzzyProductMatch = (query: string, product: Product): boolean => {
  const q = normalizeArabic(query);
  const expanded = expandAliases(query);
  const name = normalizeArabic(product.name_ar);
  const sku = product.sku.toLowerCase();

  // Direct match or alias-expanded match
  if (name.includes(q) || sku.includes(q)) return true;
  if (expanded !== q && name.includes(expanded)) return true;

  // Skeleton match per word
  const queryWords = expanded.split(/\s+/).filter(w => w.length >= 2);
  if (queryWords.length === 0) return false;

  return queryWords.every(qw => {
    if (name.includes(qw) || sku.includes(qw)) return true;
    const qwSkel = toSkeleton(qw);
    if (qwSkel.length < 2) return name.includes(qw);
    const nameWords = name.split(/\s+/);
    return nameWords.some(nw => {
      const nwSkel = toSkeleton(nw);
      return nwSkel.length >= 2 && (nwSkel.includes(qwSkel) || qwSkel.includes(nwSkel));
    });
  });
};

const ProductSearchAutocomplete = ({
  value, onChange, products = [], onProductClick, onAddToQuote, onCommandPaletteOpen,
  placeholder = "ابحث بالاسم أو رقم القطعة...", isDealer = false
}: Props) => {
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [typingPlaceholder, setTypingPlaceholder] = useState("");
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Typing animation for placeholder
  const placeholderPhrases = [
    "ابحث عن فلتر زيت...",
    "ابحث عن تيل فرامل...",
    "ابحث برقم القطعة...",
    "ابحث عن بوجيهات...",
    "ابحث عن كشافات...",
    "ابحث عن سير مكينة...",
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
        if (charIdx === phrase.length) {
          deleting = true;
          timeout = setTimeout(tick, 1800);
          return;
        }
        timeout = setTimeout(tick, 70);
      } else {
        charIdx--;
        setTypingPlaceholder(phrase.slice(0, charIdx));
        if (charIdx === 0) {
          deleting = false;
          phraseIdx = (phraseIdx + 1) % placeholderPhrases.length;
          timeout = setTimeout(tick, 400);
          return;
        }
        timeout = setTimeout(tick, 35);
      }
    };

    timeout = setTimeout(tick, 500);
    return () => clearTimeout(timeout);
  }, [value, isFocused]);

  const allMatches = useMemo(() => {
    if (!value || value.length < 2) return [];
    return products.filter(p => fuzzyProductMatch(value, p));
  }, [value, products]);

  const suggestions = useMemo(() => allMatches.slice(0, 12), [allMatches]);
  const filteredTotal = allMatches.length;

  // "Did you mean?" suggestion
  const didYouMean = useMemo(() => {
    if (!value || value.length < 2) return null;
    // Check each word
    const words = value.trim().split(/\s+/);
    for (const word of words) {
      if (word.length < 2) continue;
      const suggestion = findDidYouMean(word);
      if (suggestion) return { original: word, suggested: suggestion };
    }
    return null;
  }, [value]);

  const showDropdown = isFocused && (suggestions.length > 0 || didYouMean);

  useEffect(() => {
    setSelectedIndex(-1);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setIsFocused(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === "Enter" && selectedIndex >= 0 && suggestions[selectedIndex]) {
      e.preventDefault();
      onProductClick?.(suggestions[selectedIndex]);
      setIsFocused(false);
    } else if (e.key === "Escape") {
      setIsFocused(false);
    }
  };

  const applyDidYouMean = () => {
    if (!didYouMean) return;
    const newValue = value.replace(didYouMean.original, didYouMean.suggested);
    onChange(newValue);
  };

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <div className="relative group">
        <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-primary/10 group-focus-within:bg-primary/20 flex items-center justify-center transition-all duration-300 group-focus-within:scale-110 pointer-events-none">
          <Search className="w-4.5 h-4.5 text-primary/70 group-focus-within:text-primary transition-colors duration-300" />
        </div>
        <Input
          ref={inputRef}
          placeholder={value ? placeholder : (typingPlaceholder || placeholder)}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          className="pr-14 pl-20 bg-card border-border/60 h-10 sm:h-12 text-xs sm:text-sm placeholder:text-muted-foreground/50 rounded-xl shadow-sm transition-all duration-300 focus-visible:ring-primary/30 focus-visible:ring-offset-0 focus-visible:border-primary/40 focus-visible:shadow-md focus-visible:shadow-primary/5"
        />
        <div className="absolute left-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
          {value && (
            <button
              onClick={() => onChange("")}
              className="text-muted-foreground hover:text-foreground transition-colors p-0.5"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          {onCommandPaletteOpen && (
            <button
              onClick={onCommandPaletteOpen}
              className="hidden sm:flex items-center gap-1 text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border border-border hover:bg-accent transition-colors"
              title="بحث سريع (Ctrl+K)"
            >
              <Command className="w-3 h-3" />K
            </button>
          )}
        </div>
      </div>

      {/* Autocomplete dropdown */}
      <AnimatePresence>
        {showDropdown && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border rounded-xl shadow-xl shadow-black/10 overflow-hidden z-[60]"
          >
            <div className="p-1 sm:p-1.5 max-h-[60vh] sm:max-h-[420px] overflow-y-auto">
              {/* "Did you mean?" hint */}
              {didYouMean && (
                <button
                  onClick={applyDidYouMean}
                  className="w-full flex items-center gap-2 px-2.5 py-2 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 transition-colors mb-1 text-right"
                >
                  <Lightbulb className="w-4 h-4 text-amber-500 shrink-0" />
                  <p className="text-xs text-foreground">
                    هل تقصد{" "}
                    <span className="font-bold text-primary">{didYouMean.suggested}</span>
                    ؟
                  </p>
                </button>
              )}

              <p className="text-[10px] text-muted-foreground px-2.5 py-1.5 font-semibold">
                {suggestions.length} نتيجة
              </p>
              {suggestions.map((product, idx) => (
                <button
                  key={product.id}
                  onClick={() => {
                    onProductClick?.(product);
                    setIsFocused(false);
                  }}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`w-full flex items-center gap-3 px-2.5 py-2 rounded-lg transition-all ${
                    selectedIndex === idx
                      ? "bg-primary/10 text-foreground"
                      : "hover:bg-muted text-foreground"
                  }`}
                >
                  {/* Product image */}
                  <div className="w-10 h-10 rounded-lg bg-white border border-border shrink-0 flex items-center justify-center overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt="" className="w-full h-full object-contain p-1" />
                    ) : (
                      <Package className="w-5 h-5 text-muted-foreground/30" />
                    )}
                  </div>

                  {/* Product info */}
                  <div className="flex-1 text-right min-w-0">
                    <p className="text-xs font-bold truncate">{product.name_ar}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-mono text-muted-foreground flex items-center gap-0.5">
                        <Hash className="w-2.5 h-2.5" />{product.sku}
                      </span>
                    </div>
                  </div>

                  {/* Add to quote button for dealers */}
                  {isDealer && onAddToQuote && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddToQuote(product);
                      }}
                      className="shrink-0 flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-[10px] font-bold border border-primary/20 hover:border-primary/30 transition-all duration-200 hover:scale-105"
                      title="أضف لعرض السعر"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">تسعير</span>
                    </button>
                  )}
                </button>
              ))}

              {/* Show all results button */}
              {suggestions.length > 0 && (
                <button
                  onClick={() => setIsFocused(false)}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2.5 mt-1 rounded-xl bg-primary/5 hover:bg-primary/10 text-primary text-xs font-bold border border-primary/10 hover:border-primary/20 transition-all"
                >
                  عرض كل النتائج ({filteredTotal})
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductSearchAutocomplete;
