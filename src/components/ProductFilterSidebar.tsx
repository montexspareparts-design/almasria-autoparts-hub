import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Car, Calendar, Hash, DollarSign, RotateCcw, ChevronDown, ChevronUp,
  SlidersHorizontal, icons, Layers, X, ShieldCheck, Droplets, Wrench, Zap, Disc3, Cog,
  Filter, Fuel, CircleDot, Truck, Navigation, type LucideIcon
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ProductFilters, BRAND_OPTIONS } from "@/components/AdvancedProductFilter";

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
  categories?: { id: string; name_ar: string; icon?: string | null; slug?: string }[];
  categoryCounts?: Record<string, number>;
  showBrands?: boolean;
  totalResults: number;
  isLoading: boolean;
  isOpen: boolean;
  onToggle: () => void;
}

const ProductFilterSidebar = ({
  filters, onFiltersChange, categories, categoryCounts,
  showBrands = false, totalResults, isLoading, isOpen, onToggle
}: Props) => {
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 1024;

  const handleFilterChange = (key: keyof ProductFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
    if (isMobile && isOpen) {
      setTimeout(() => onToggle(), 200);
    }
  };
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    categories: true,
    filters: true,
    brands: true,
  });

  const updateFilter = (key: keyof ProductFilters, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const activeFilterCount = [
    filters.model, filters.year, filters.chassisNumber, filters.partNumber,
    filters.categoryId, filters.priceMin, filters.priceMax
  ].filter(Boolean).length;

  const clearAllFilters = () => {
    onFiltersChange({
      search: "", model: null, year: null, chassisNumber: "", partNumber: "",
      categoryId: null, brandKey: null, priceMin: "", priceMax: "", sortBy: filters.sortBy,
    });
  };

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40 lg:hidden"
            onClick={onToggle}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={`
          fixed top-0 right-0 h-[100dvh] w-[88vw] max-w-[320px] bg-card border-l border-border z-50 overflow-y-auto overscroll-contain pb-24
          lg:sticky lg:top-24 lg:h-[calc(100vh-6rem)] lg:z-auto lg:border lg:rounded-xl lg:w-[280px] lg:max-w-none lg:shrink-0 lg:pb-4
          ${isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
          transition-transform duration-300 ease-out
        `}
      >
        {/* Header */}
        <div className="sticky top-0 bg-card z-10 p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            <h3 className="font-bold text-sm text-foreground">التصفية والفئات</h3>
            {activeFilterCount > 0 && (
              <Badge className="h-5 w-5 p-0 flex items-center justify-center text-[10px] font-bold bg-primary text-primary-foreground rounded-full">
                {activeFilterCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {activeFilterCount > 0 && (
              <button onClick={clearAllFilters} className="text-[11px] text-primary hover:underline flex items-center gap-1">
                <RotateCcw className="w-3 h-3" />
                مسح
              </button>
            )}
            <button onClick={onToggle} className="lg:hidden p-1 hover:bg-muted rounded-md">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="p-4 space-y-1">
          {/* ── Brands Section (first) ── */}
          {showBrands && (
            <div>
              <button
                onClick={() => toggleSection("brands")}
                className="flex items-center justify-between w-full py-2.5 text-sm font-bold text-foreground hover:text-primary transition-colors"
              >
                <span className="flex items-center gap-1.5"><Layers className="w-3.5 h-3.5" />الماركة</span>
                {expandedSections.brands ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <AnimatePresence>
                {expandedSections.brands && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-1 pb-3">
                      <button
                        onClick={() => updateFilter("brandKey", null)}
                        className={`w-full flex items-center gap-2.5 text-right px-3 py-2.5 rounded-xl text-sm transition-all ${
                          !filters.brandKey ? "bg-primary/10 text-primary font-bold border border-primary/20" : "text-muted-foreground hover:bg-muted"
                        }`}
                      >
                        <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Layers className="w-3.5 h-3.5" />
                        </div>
                        جميع الماركات
                      </button>
                      {BRAND_OPTIONS.map((b) => {
                        const iconMap: Record<string, { icon: React.ReactNode; bg: string }> = {
                          toyota_genuine: { icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />, bg: "bg-emerald-500/10" },
                          toyota_oils: { icon: <Droplets className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />, bg: "bg-blue-500/10" },
                          mtx_aftermarket: { icon: <Wrench className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />, bg: "bg-orange-500/10" },
                          denso: { icon: <Zap className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />, bg: "bg-red-500/10" },
                          aisin: { icon: <Cog className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />, bg: "bg-purple-500/10" },
                          fbk: { icon: <Disc3 className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />, bg: "bg-amber-500/10" },
                        };
                        const brandIcon = iconMap[b.value] || { icon: <Layers className="w-3.5 h-3.5" />, bg: "bg-muted" };
                        const isActive = filters.brandKey === b.value;
                        return (
                          <button
                            key={b.value}
                            onClick={() => updateFilter("brandKey", isActive ? null : b.value)}
                            className={`w-full flex items-center gap-2.5 text-right px-3 py-2.5 rounded-xl text-sm transition-all ${
                              isActive ? "bg-primary/10 text-primary font-bold border border-primary/20" : "text-muted-foreground hover:bg-muted"
                            }`}
                          >
                            <div className={`w-7 h-7 rounded-lg ${isActive ? "bg-primary/15" : brandIcon.bg} flex items-center justify-center shrink-0 transition-colors`}>
                              {brandIcon.icon}
                            </div>
                            {b.label}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <Separator className="my-1" />
            </div>
          )}

          {/* ── Categories Section (second) ── */}
          {categories && categories.length > 0 && (
            <div>
              <button
                onClick={() => toggleSection("categories")}
                className="flex items-center justify-between w-full py-2.5 text-sm font-bold text-foreground hover:text-primary transition-colors"
              >
                <span>الفئات</span>
                {expandedSections.categories ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <AnimatePresence>
                {expandedSections.categories && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="space-y-0.5 pb-3">
                      <button
                        onClick={() => handleFilterChange("categoryId", null)}
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm transition-all ${
                          !filters.categoryId
                            ? "bg-primary/10 text-primary font-bold border border-primary/20"
                            : "text-muted-foreground hover:bg-muted hover:text-foreground"
                        }`}
                      >
                        <span>الكل</span>
                        <span className="text-xs opacity-60">{totalResults}</span>
                      </button>
                      {categories.map((cat) => {
                        const catSlug = cat.slug || "";
                        const categoryIconMap: Record<string, { icon: React.ReactNode; bg: string }> = {
                          "spark-plugs-coils": { icon: <Zap className="w-3.5 h-3.5 text-yellow-600 dark:text-yellow-400" />, bg: "bg-yellow-500/10" },
                          "water-cooling": { icon: <Droplets className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />, bg: "bg-cyan-500/10" },
                          "belts-bearings": { icon: <CircleDot className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />, bg: "bg-indigo-500/10" },
                          "suspension": { icon: <Truck className="w-3.5 h-3.5 text-stone-600 dark:text-stone-400" />, bg: "bg-stone-500/10" },
                          "brakes": { icon: <Disc3 className="w-3.5 h-3.5 text-red-600 dark:text-red-400" />, bg: "bg-red-500/10" },
                          "clutch": { icon: <Disc3 className="w-3.5 h-3.5 text-pink-600 dark:text-pink-400" />, bg: "bg-pink-500/10" },
                          "steering": { icon: <Navigation className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />, bg: "bg-teal-500/10" },
                          "filters": { icon: <Filter className="w-3.5 h-3.5 text-green-600 dark:text-green-400" />, bg: "bg-green-500/10" },
                          "fiber-parts": { icon: <Layers className="w-3.5 h-3.5 text-gray-600 dark:text-gray-400" />, bg: "bg-gray-500/10" },
                          "oils-gasoline": { icon: <Fuel className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />, bg: "bg-amber-500/10" },
                          "oils-diesel": { icon: <Fuel className="w-3.5 h-3.5 text-orange-600 dark:text-orange-400" />, bg: "bg-orange-500/10" },
                          "oils-transmission": { icon: <Cog className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />, bg: "bg-violet-500/10" },
                        };
                        const catIcon = categoryIconMap[catSlug];
                        const count = categoryCounts?.[cat.id];
                        const isActive = filters.categoryId === cat.id;
                        return (
                          <button
                            key={cat.id}
                            onClick={() => handleFilterChange("categoryId", isActive ? null : cat.id)}
                            className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm transition-all duration-300 group ${
                              isActive
                                ? "bg-primary/10 text-primary font-bold border border-primary/20 shadow-sm"
                                : "text-muted-foreground hover:bg-muted/80 hover:text-foreground hover:translate-x-[-4px] hover:shadow-sm"
                            }`}
                          >
                            <div className="flex items-center gap-2.5">
                              <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:rotate-6 group-hover:shadow-md ${
                                isActive ? "bg-primary/15 scale-110 shadow-md" : (catIcon?.bg || "bg-muted")
                              }`}>
                                {catIcon ? catIcon.icon : <Layers className="w-3.5 h-3.5" />}
                              </div>
                              <span className="truncate transition-colors duration-200">{cat.name_ar}</span>
                            </div>
                            {count !== undefined && (
                              <span className={`text-[11px] min-w-[22px] h-[22px] flex items-center justify-center rounded-full px-1.5 font-semibold transition-all duration-300 group-hover:scale-110 ${
                                filters.categoryId === cat.id
                                  ? "bg-primary/20 text-primary"
                                  : "bg-muted text-muted-foreground group-hover:bg-primary/10 group-hover:text-primary"
                              }`}>
                                {count}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              <Separator className="my-1" />
            </div>
          )}

          {/* ── Filters Section ── */}
          <div>
            <button
              onClick={() => toggleSection("filters")}
              className="flex items-center justify-between w-full py-2.5 text-sm font-bold text-foreground hover:text-primary transition-colors"
            >
              <span>بحث متقدم</span>
              {expandedSections.filters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            <AnimatePresence>
              {expandedSections.filters && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="space-y-4 pb-3">
                    {/* Model */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Car className="w-3.5 h-3.5" />الموديل
                      </label>
                      <Select value={filters.model || ""} onValueChange={(v) => updateFilter("model", v || null)}>
                        <SelectTrigger className="bg-background h-9 text-xs">
                          <SelectValue placeholder="جميع الموديلات" />
                        </SelectTrigger>
                        <SelectContent>
                          {TOYOTA_MODELS.map((m) => (
                            <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Year */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5" />سنة الصنع
                      </label>
                      <Select value={filters.year || ""} onValueChange={(v) => updateFilter("year", v || null)}>
                        <SelectTrigger className="bg-background h-9 text-xs">
                          <SelectValue placeholder="جميع السنوات" />
                        </SelectTrigger>
                        <SelectContent>
                          {YEARS.map((y) => (
                            <SelectItem key={y} value={y}>{y}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Part Number */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5" />رقم القطعة (OEM)
                      </label>
                      <Input
                        placeholder="مثال: TG-ENG-0001"
                        value={filters.partNumber}
                        onChange={(e) => updateFilter("partNumber", e.target.value)}
                        className="bg-background font-mono text-xs h-9"
                        dir="ltr"
                      />
                    </div>

                    {/* VIN */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                        <Hash className="w-3.5 h-3.5" />رقم الشاسيه (VIN)
                      </label>
                      <Input
                        placeholder="أدخل رقم الشاسيه"
                        value={filters.chassisNumber}
                        onChange={(e) => updateFilter("chassisNumber", e.target.value)}
                        className="bg-background font-mono text-xs h-9"
                        dir="ltr"
                      />
                    </div>

                     {/* Price Range Slider */}
                     <div className="space-y-3">
                       <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                         <DollarSign className="w-3.5 h-3.5" />نطاق السعر (ج.م)
                       </label>
                       <Slider
                         min={0}
                         max={10000}
                         step={50}
                         value={[
                           Number(filters.priceMin) || 0,
                           Number(filters.priceMax) || 10000,
                         ]}
                         onValueChange={(vals) => {
                           onFiltersChange({
                             ...filters,
                             priceMin: vals[0] === 0 ? "" : String(vals[0]),
                             priceMax: vals[1] === 10000 ? "" : String(vals[1]),
                           });
                         }}
                         className="w-full"
                       />
                       <div className="flex items-center justify-between text-[11px] text-muted-foreground" dir="ltr">
                         <span className="bg-muted px-2 py-0.5 rounded font-mono">
                           {Number(filters.priceMin) || 0} ج.م
                         </span>
                         <span className="text-muted-foreground/50">—</span>
                         <span className="bg-muted px-2 py-0.5 rounded font-mono">
                           {Number(filters.priceMax) || 10000} ج.م
                         </span>
                       </div>
                     </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.aside>
    </>
  );
};

export default ProductFilterSidebar;
