import { useState, useMemo } from "react";
import { Filter, X, Search, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { motion, AnimatePresence } from "framer-motion";

export interface ProductFilters {
  search: string;
  model: string | null;
  year: string | null;
  chassisNumber: string;
  partNumber: string;
  categoryId: string | null;
  priceMin: string;
  priceMax: string;
}

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
  categories?: { id: string; name_ar: string }[];
  showCategories?: boolean;
  totalResults: number;
  isLoading: boolean;
}

const AdvancedProductFilter = ({ filters, onFiltersChange, categories, showCategories = true, totalResults, isLoading }: Props) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.model) count++;
    if (filters.year) count++;
    if (filters.chassisNumber) count++;
    if (filters.partNumber) count++;
    if (filters.categoryId) count++;
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
      priceMin: "",
      priceMax: "",
    });
  };

  return (
    <div className="space-y-3">
      {/* Main search + toggle */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث بالاسم..."
            value={filters.search}
            onChange={(e) => updateFilter("search", e.target.value)}
            className="pr-10 bg-card"
          />
          {filters.search && (
            <button onClick={() => updateFilter("search", "")} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <Button
          variant={isExpanded ? "default" : "outline"}
          size="default"
          onClick={() => setIsExpanded(!isExpanded)}
          className="gap-2 shrink-0"
        >
          <Filter className="w-4 h-4" />
          <span className="hidden sm:inline">فلتر متقدم</span>
          {activeFilterCount > 0 && (
            <span className="bg-primary-foreground text-primary text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </Button>
      </div>

      {/* Advanced filters panel */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="bg-card border border-border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                  <Filter className="w-4 h-4 text-primary" />
                  فلتر متقدم
                </h3>
                {activeFilterCount > 0 && (
                  <Button variant="ghost" size="sm" onClick={clearAllFilters} className="text-xs text-muted-foreground hover:text-destructive gap-1">
                    <X className="w-3 h-3" />
                    مسح الكل
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Model */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">الموديل</label>
                  <Select value={filters.model || ""} onValueChange={(v) => updateFilter("model", v || null)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="اختر الموديل" />
                    </SelectTrigger>
                    <SelectContent>
                      {TOYOTA_MODELS.map((m) => (
                        <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {filters.model && (
                    <button onClick={() => updateFilter("model", null)} className="text-[10px] text-primary hover:underline">
                      مسح
                    </button>
                  )}
                </div>

                {/* Year */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">سنة الصنع</label>
                  <Select value={filters.year || ""} onValueChange={(v) => updateFilter("year", v || null)}>
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="اختر السنة" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEARS.map((y) => (
                        <SelectItem key={y} value={y}>{y}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {filters.year && (
                    <button onClick={() => updateFilter("year", null)} className="text-[10px] text-primary hover:underline">
                      مسح
                    </button>
                  )}
                </div>

                {/* Part Number (SKU) */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">رقم الصنف (Part Number)</label>
                  <Input
                    placeholder="مثال: TG-ENG-0001"
                    value={filters.partNumber}
                    onChange={(e) => updateFilter("partNumber", e.target.value)}
                    className="bg-background font-mono text-sm"
                    dir="ltr"
                  />
                </div>

                {/* Chassis Number */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">رقم الشاسيه <span className="text-muted-foreground/60">(اختياري)</span></label>
                  <Input
                    placeholder="رقم الشاسيه"
                    value={filters.chassisNumber}
                    onChange={(e) => updateFilter("chassisNumber", e.target.value)}
                    className="bg-background font-mono text-sm"
                    dir="ltr"
                  />
                </div>
              </div>

              {/* Category chips */}
              {showCategories && categories && categories.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">الفئة</label>
                  <div className="flex gap-2 flex-wrap">
                    <Button
                      variant={filters.categoryId === null ? "default" : "outline"}
                      size="sm"
                      onClick={() => updateFilter("categoryId", null)}
                      className="text-xs h-7"
                    >
                      الكل
                    </Button>
                    {categories.map((cat) => (
                      <Button
                        key={cat.id}
                        variant={filters.categoryId === cat.id ? "default" : "outline"}
                        size="sm"
                        onClick={() => updateFilter("categoryId", filters.categoryId === cat.id ? null : cat.id)}
                        className="text-xs h-7"
                      >
                        {cat.name_ar}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results count + active filter tags */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="text-sm text-muted-foreground">
          {isLoading ? "جاري التحميل..." : `${totalResults} منتج`}
        </div>
        {activeFilterCount > 0 && !isExpanded && (
          <div className="flex items-center gap-1.5 flex-wrap">
            {filters.model && (
              <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[11px] px-2 py-0.5 rounded-full font-semibold">
                {filters.model}
                <button onClick={() => updateFilter("model", null)}><X className="w-3 h-3" /></button>
              </span>
            )}
            {filters.year && (
              <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[11px] px-2 py-0.5 rounded-full font-semibold">
                {filters.year}
                <button onClick={() => updateFilter("year", null)}><X className="w-3 h-3" /></button>
              </span>
            )}
            {filters.partNumber && (
              <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[11px] px-2 py-0.5 rounded-full font-semibold">
                SKU: {filters.partNumber}
                <button onClick={() => updateFilter("partNumber", "")}><X className="w-3 h-3" /></button>
              </span>
            )}
            {filters.categoryId && (
              <span className="inline-flex items-center gap-1 bg-primary/10 text-primary text-[11px] px-2 py-0.5 rounded-full font-semibold">
                فئة
                <button onClick={() => updateFilter("categoryId", null)}><X className="w-3 h-3" /></button>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdvancedProductFilter;
