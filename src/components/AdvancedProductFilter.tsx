import { useState, useMemo, lazy, Suspense } from "react";
import { Filter, X, Search, ChevronDown, ChevronUp, SlidersHorizontal, Hash, Car, Calendar, DollarSign, Tag, RotateCcw, Layers, Zap, Droplets, CircleDot, Truck, Disc3, icons } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";
import { Badge } from "@/components/ui/badge";

export interface ProductFilters {
  search: string;
  model: string | null;
  year: string | null;
  chassisNumber: string;
  partNumber: string;
  categoryId: string | null;
  brandKey: string | null;
  priceMin: string;
  priceMax: string;
  sortBy: string;
}

export const BRAND_OPTIONS = [
  { value: "toyota_genuine", label: "قطع غيار أصلية" },
  { value: "toyota_oils", label: "زيوت تويوتا" },
  { value: "mtx_aftermarket", label: "MTX Aftermarket" },
  { value: "denso", label: "DENSO" },
  { value: "aisin", label: "AISIN" },
  { value: "fbk", label: "تيل فرامل" },
];

const TOYOTA_MODELS = [
  { value: "كورولا", label: "كورولا - Corolla" },
  { value: "كامري", label: "كامري - Camry" },
  { value: "لاندكروزر", label: "لاندكروزر - Land Cruiser" },
  { value: "برادو", label: "برادو - Prado" },
  { value: "هايلوكس", label: "هايلوكس - Hilux" },
  { value: "يارس", label: "يارس - Yaris" },
  { value: "RAV4", label: "RAV4" },
  { value: "فورتشنر", label: "فورتشنر - Fortuner" },
  { value: "أفانزا", label: "أفانزا - Avanza" },
  { value: "إنوفا", label: "إنوفا - Innova" },
  { value: "هايس", label: "هايس - Hiace" },
  { value: "كوستر", label: "كوستر - Coaster" },
  { value: "FJ كروزر", label: "FJ كروزر - FJ Cruiser" },
  { value: "شاص", label: "شاص - Chassis" },
  { value: "ربع", label: "ربع - Quarter" },
  { value: "بيك أب", label: "بيك أب - Pickup" },
  { value: "86", label: "86" },
  { value: "سوبرا", label: "سوبرا - Supra" },
];

const YEARS = Array.from({ length: 15 }, (_, i) => String(2015 + i));

interface Props {
  filters: ProductFilters;
  onFiltersChange: (filters: ProductFilters) => void;
  categories?: { id: string; name_ar: string; icon?: string | null }[];
  categoryCounts?: Record<string, number>;
  showCategories?: boolean;
  showBrands?: boolean;
  totalResults: number;
  isLoading: boolean;
}

const AdvancedProductFilter = ({ filters, onFiltersChange, categories, categoryCounts, showCategories = true, showBrands = false, totalResults, isLoading }: Props) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.model) count++;
    if (filters.year) count++;
    if (filters.chassisNumber) count++;
    if (filters.partNumber) count++;
    if (filters.categoryId) count++;
    if (filters.brandKey) count++;
    if (filters.priceMin) count++;
    if (filters.priceMax) count++;
    return count;
  }, [filters]);

  const updateFilter = (key: keyof ProductFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearAllFilters = () => {
    onFiltersChange({
      search: "",
      model: null,
      year: null,
      chassisNumber: "",
      partNumber: "",
      categoryId: null,
      brandKey: null,
      priceMin: "",
      priceMax: "",
      sortBy: filters.sortBy,
    });
  };

  return (
    <div className="space-y-3">
      {/* Main search bar */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="ابحث بالاسم أو رقم القطعة..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pr-10 bg-card border-border h-11 text-sm placeholder:text-muted-foreground/60"
          />
          {filters.search && (
            <button
              onClick={() => updateFilter("search", "")}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <Button
          variant={isExpanded ? "default" : "outline"}
          onClick={() => setIsExpanded(!isExpanded)}
          className="gap-2 shrink-0 h-11 px-4"
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span className="hidden sm:inline">فلاتر</span>
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="h-5 w-5 p-0 flex items-center justify-center text-[10px] font-bold bg-primary text-primary-foreground rounded-full">
              {activeFilterCount}
            </Badge>
          )}
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </Button>
      </div>

      {/* Always-visible category strip */}
      {showCategories && categories && categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide pb-1">
          <button
            onClick={() => updateFilter("categoryId", null)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border ${
              !filters.categoryId
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
            }`}
          >
            الكل
          </button>
          {categories.map((cat) => {
            const IconComp = cat.icon && icons[cat.icon as keyof typeof icons] ? icons[cat.icon as keyof typeof icons] : null;
            return (
              <button
                key={cat.id}
                onClick={() => updateFilter("categoryId", filters.categoryId === cat.id ? null : cat.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all border whitespace-nowrap flex items-center gap-1.5 ${
                  filters.categoryId === cat.id
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:border-primary/40 hover:text-foreground"
                }`}
              >
                {IconComp && <IconComp className="w-3.5 h-3.5" />}
                {cat.name_ar}
              </button>
            );
          })}
        </div>
      )}

      {/* Expandable filter panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="bg-card border border-border rounded-xl p-5 space-y-5 shadow-sm">
              {/* Header */}
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Filter className="w-4 h-4 text-primary" />
                  بحث وفلترة متقدمة
                </h3>
                {activeFilterCount > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAllFilters}
                    className="text-xs text-muted-foreground hover:text-destructive gap-1.5 h-8"
                  >
                    <RotateCcw className="w-3 h-3" />
                    مسح الكل ({activeFilterCount})
                  </Button>
                )}
              </div>

              {/* Row 1: Model, Year, Part Number */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5" />
                    الموديل
                  </label>
                  <Select value={filters.model || ""} onValueChange={(v) => updateFilter("model", v || null)}>
                    <SelectTrigger className="bg-background h-10">
                      <SelectValue placeholder="جميع الموديلات" />
                    </SelectTrigger>
                    <SelectContent>
                      {TOYOTA_MODELS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {filters.model && (
                    <button onClick={() => updateFilter("model", null)} className="text-[10px] text-primary hover:underline">مسح</button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5" />
                    سنة الصنع
                  </label>
                  <Select value={filters.year || ""} onValueChange={(v) => updateFilter("year", v || null)}>
                    <SelectTrigger className="bg-background h-10">
                      <SelectValue placeholder="جميع السنوات" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map((y) => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {filters.year && (
                    <button onClick={() => updateFilter("year", null)} className="text-[10px] text-primary hover:underline">مسح</button>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5" />
                    رقم القطعة (OEM)
                  </label>
                  <Input
                    placeholder="مثال: TG-ENG-0001"
                    value={filters.partNumber}
                    onChange={(e) => updateFilter("partNumber", e.target.value)}
                    className="bg-background font-mono text-sm h-10"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Row 2: VIN, Price Range */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Hash className="w-3.5 h-3.5" />
                    رقم الشاسيه (VIN)
                    <span className="text-muted-foreground/50 font-normal">(اختياري)</span>
                  </label>
                  <Input
                    placeholder="أدخل رقم الشاسيه"
                    value={filters.chassisNumber}
                    onChange={(e) => updateFilter("chassisNumber", e.target.value)}
                    className="bg-background font-mono text-sm h-10"
                    dir="ltr"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" />
                    السعر من (ج.م)
                  </label>
                  <Input
                    type="number"
                    placeholder="0"
                    value={filters.priceMin}
                    onChange={(e) => updateFilter("priceMin", e.target.value)}
                    className="bg-background text-sm h-10"
                    dir="ltr"
                    min="0"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5" />
                    السعر إلى (ج.م)
                  </label>
                  <Input
                    type="number"
                    placeholder="∞"
                    value={filters.priceMax}
                    onChange={(e) => updateFilter("priceMax", e.target.value)}
                    className="bg-background text-sm h-10"
                    dir="ltr"
                    min="0"
                  />
                </div>
              </div>

              {/* Category chips */}
              {showCategories && categories && categories.length > 0 && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    الفئة
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant={filters.categoryId === null ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateFilter("categoryId", null)}
                      className="text-xs h-8 rounded-full px-4"
                    >
                      الكل
                    </Button>
                    {categories.map((cat) => (
                      <Button
                        key={cat.id}
                        variant={filters.categoryId === cat.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateFilter("categoryId", filters.categoryId === cat.id ? null : cat.id)}
                        className="text-xs h-8 rounded-full px-4"
                      >
                        {cat.name_ar}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              {/* Brand chips */}
              {showBrands && (
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    الماركة
                  </label>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant={filters.brandKey === null ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateFilter("brandKey", null)}
                      className="text-xs h-8 rounded-full px-4"
                    >
                      الكل
                    </Button>
                    {BRAND_OPTIONS.map((b) => (
                      <Button
                        key={b.value}
                        variant={filters.brandKey === b.value ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateFilter("brandKey", filters.brandKey === b.value ? null : b.value)}
                        className="text-xs h-8 rounded-full px-4"
                      >
                        {b.label}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results count + sort + active filter tags */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <p className="text-sm text-muted-foreground font-medium">
            {isLoading ? "جاري التحميل..." : (
              <>
                <span className="text-foreground font-bold">{totalResults}</span> منتج
              </>
            )}
          </p>

          {/* Active filter tags (when collapsed) */}
          {activeFilterCount > 0 && !isExpanded && (
            <div className="hidden sm:flex items-center gap-1.5 flex-wrap">
              {filters.model && (
                <Badge variant="secondary" className="gap-1 text-[11px] bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 cursor-pointer" onClick={() => updateFilter("model", null)}>
                  {filters.model}
                  <X className="w-3 h-3" />
                </Badge>
              )}
              {filters.year && (
                <Badge variant="secondary" className="gap-1 text-[11px] bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 cursor-pointer" onClick={() => updateFilter("year", null)}>
                  {filters.year}
                  <X className="w-3 h-3" />
                </Badge>
              )}
              {filters.partNumber && (
                <Badge variant="secondary" className="gap-1 text-[11px] bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 cursor-pointer font-mono" onClick={() => updateFilter("partNumber", "")}>
                  {filters.partNumber}
                  <X className="w-3 h-3" />
                </Badge>
              )}
              {filters.categoryId && (
                <Badge variant="secondary" className="gap-1 text-[11px] bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 cursor-pointer" onClick={() => updateFilter("categoryId", null)}>
                  فئة
                  <X className="w-3 h-3" />
                </Badge>
              )}
              {filters.brandKey && (
                <Badge variant="secondary" className="gap-1 text-[11px] bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 cursor-pointer" onClick={() => updateFilter("brandKey", null)}>
                  {BRAND_OPTIONS.find(b => b.value === filters.brandKey)?.label || "ماركة"}
                  <X className="w-3 h-3" />
                </Badge>
              )}
              {(filters.priceMin || filters.priceMax) && (
                <Badge variant="secondary" className="gap-1 text-[11px] bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 cursor-pointer" onClick={() => { updateFilter("priceMin", ""); updateFilter("priceMax", ""); }}>
                  {filters.priceMin || "0"} - {filters.priceMax || "∞"} ج.م
                  <X className="w-3 h-3" />
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Sort */}
        <Select value={filters.sortBy || "newest"} onValueChange={(v) => updateFilter("sortBy", v)}>
          <SelectTrigger className="w-[160px] h-9 text-xs bg-card">
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
    </div>
  );
};

export default AdvancedProductFilter;
