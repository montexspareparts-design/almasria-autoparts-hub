import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Scale, Plus, X, Package, CheckCircle2, XCircle, Hash, Box, Car, Tag, Layers } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";

interface CompareProduct {
  id: string;
  name_ar: string;
  name_en: string | null;
  sku: string;
  brand: string;
  base_price: number;
  image_url: string | null;
  stock_quantity: number;
  min_order_qty: number;
  compatible_models: string[] | null;
  year_from: number | null;
  year_to: number | null;
  category_id: string | null;
  description_ar: string | null;
}

const brandLabels: Record<string, string> = {
  toyota_genuine: "Toyota Genuine",
  toyota_oils: "Toyota Oils",
  mtx_aftermarket: "MTX",
  denso: "Denso",
  aisin: "Aisin",
  fbk: "FBK",
};

const ease = [0.22, 1, 0.36, 1] as const;

const DealerProductCompare = () => {
  const { lang } = useLanguage();
  const isRTL = lang === "ar";
  const [slots, setSlots] = useState<(CompareProduct | null)[]>([null, null]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<CompareProduct[]>([]);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);
  const [searching, setSearching] = useState(false);

  const handleSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const { data } = await supabase
      .from("products")
      .select("id, name_ar, name_en, sku, brand, base_price, image_url, stock_quantity, min_order_qty, compatible_models, year_from, year_to, category_id, description_ar")
      .eq("is_active", true)
      .or(`name_ar.ilike.%${q.trim()}%,name_en.ilike.%${q.trim()}%,sku.ilike.%${q.trim()}%`)
      .limit(6);
    setSearchResults((data as CompareProduct[]) || []);
    setSearching(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => { if (activeSlot !== null) handleSearch(searchQuery); }, 300);
    return () => clearTimeout(t);
  }, [searchQuery, activeSlot, handleSearch]);

  const selectProduct = (product: CompareProduct) => {
    if (activeSlot === null) return;
    setSlots(prev => { const n = [...prev]; n[activeSlot] = product; return n; });
    setActiveSlot(null);
    setSearchQuery("");
    setSearchResults([]);
  };

  const clearSlot = (idx: number) => {
    setSlots(prev => { const n = [...prev]; n[idx] = null; return n; });
  };

  const swapSlots = () => {
    setSlots(prev => [prev[1], prev[0]]);
  };

  const specs = [
    { label: isRTL ? "رقم القطعة" : "Part Number", key: "sku" as const, icon: Hash },
    { label: isRTL ? "الماركة" : "Brand", key: "brand" as const, icon: Box, format: (v: string) => brandLabels[v] || v },
    { label: isRTL ? "التوفر" : "Availability", key: "stock_quantity" as const, icon: CheckCircle2, format: (v: number) => v > 0 ? (isRTL ? "متوفر ✅" : "In Stock ✅") : (isRTL ? "غير متوفر ❌" : "Out of Stock ❌") },
    { label: isRTL ? "الحد الأدنى" : "Min Order", key: "min_order_qty" as const, icon: Layers },
    { label: isRTL ? "الموديلات" : "Models", key: "compatible_models" as const, icon: Car, format: (v: string[] | null) => v?.join(", ") || "—" },
    { label: isRTL ? "سنة الصنع" : "Year", key: "year_from" as const, icon: Tag, format: (_: any, p: CompareProduct) => p.year_from ? `${p.year_from}${p.year_to ? ` - ${p.year_to}` : "+"}` : "—" },
  ];

  const bothSelected = slots[0] && slots[1];

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
        <Scale className="w-5 h-5 text-primary" />
        {isRTL ? "مقارنة المنتجات" : "Compare Products"}
      </h2>

      {/* Product Slots */}
      <div className="grid grid-cols-2 gap-3 relative">
        {slots.map((product, idx) => (
          <Card key={idx} className="border-border/40 rounded-2xl overflow-hidden">
            <CardContent className="p-0">
              {product ? (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ ease }}>
                  <div className="aspect-[4/3] bg-gradient-to-br from-muted/10 to-muted/30 relative flex items-center justify-center">
                    {product.image_url
                      ? <img src={product.image_url} alt={product.name_ar} className="w-full h-full object-contain p-4" />
                      : <Package className="w-12 h-12 text-muted-foreground/10" />
                    }
                    <button onClick={() => clearSlot(idx)} className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-card/80 backdrop-blur-sm border border-border/40 flex items-center justify-center hover:bg-destructive/10 transition-colors">
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                    <span className={`absolute bottom-2 left-2 w-2 h-2 rounded-full ring-2 ring-card ${product.stock_quantity > 0 ? "bg-emerald-500" : "bg-muted-foreground/25"}`} />
                  </div>
                  <div className="p-3 border-t border-border/20">
                    <p className="text-xs font-bold text-foreground line-clamp-2">{isRTL ? product.name_ar : (product.name_en || product.name_ar)}</p>
                    <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{product.sku}</p>
                  </div>
                </motion.div>
              ) : (
                <button
                  onClick={() => { setActiveSlot(idx); setSearchQuery(""); setSearchResults([]); }}
                  className="w-full aspect-[4/3] flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-primary hover:bg-primary/5 transition-colors border-2 border-dashed border-border/40 rounded-2xl m-1"
                >
                  <Plus className="w-8 h-8" />
                  <span className="text-xs font-bold">{isRTL ? "اختر منتج" : "Select Product"}</span>
                </button>
              )}
            </CardContent>
          </Card>
        ))}

        {/* Swap button */}
        {bothSelected && (
          <button onClick={swapSlots} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-card border-2 border-primary/20 shadow-lg flex items-center justify-center hover:bg-primary/5 transition-all z-10">
            <Scale className="w-4 h-4 text-primary" />
          </button>
        )}
      </div>

      {/* Search Modal */}
      {activeSlot !== null && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="bg-card border border-border/40 rounded-2xl p-4 shadow-lg space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold">{isRTL ? "ابحث عن المنتج" : "Search Product"}</p>
            <Button variant="ghost" size="icon" className="w-7 h-7" onClick={() => { setActiveSlot(null); setSearchQuery(""); }}>
              <X className="w-4 h-4" />
            </Button>
          </div>
          <Input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder={isRTL ? "رقم القطعة أو الاسم..." : "Part number or name..."}
            className="rounded-xl h-11"
            autoFocus
          />
          {searchResults.length > 0 && (
            <div className="max-h-[250px] overflow-y-auto space-y-1.5">
              {searchResults.map(p => (
                <button key={p.id} onClick={() => selectProduct(p)} className="w-full flex items-center gap-3 p-2.5 rounded-xl hover:bg-muted/50 transition-colors text-right">
                  <div className="w-10 h-10 rounded-lg bg-muted/30 shrink-0 overflow-hidden flex items-center justify-center">
                    {p.image_url ? <img src={p.image_url} alt="" className="w-full h-full object-contain p-1" /> : <Package className="w-4 h-4 text-muted-foreground/20" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-foreground truncate">{isRTL ? p.name_ar : (p.name_en || p.name_ar)}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{p.sku}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Comparison Table */}
      {bothSelected && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ ease }} className="bg-card border border-border/40 rounded-2xl overflow-hidden">
          <div className="divide-y divide-border/30">
            {specs.map(spec => {
              const val0 = spec.format
                ? (spec.format as any)(slots[0]![spec.key], slots[0]!)
                : String(slots[0]![spec.key] ?? "—");
              const val1 = spec.format
                ? (spec.format as any)(slots[1]![spec.key], slots[1]!)
                : String(slots[1]![spec.key] ?? "—");
              const match = val0 === val1;
              return (
                <div key={spec.key} className="grid grid-cols-[1fr_auto_1fr] items-center">
                  <div className="p-3 text-xs text-foreground font-medium text-center">{val0}</div>
                  <div className={`px-3 py-2 flex flex-col items-center gap-0.5 border-x border-border/20 min-w-[80px] ${match ? "bg-emerald-50/50 dark:bg-emerald-500/5" : ""}`}>
                    <spec.icon className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-[10px] text-muted-foreground font-bold text-center leading-tight">{spec.label}</span>
                    {match && <span className="text-[8px] text-emerald-600 font-bold">✓ {isRTL ? "مطابق" : "Match"}</span>}
                  </div>
                  <div className="p-3 text-xs text-foreground font-medium text-center">{val1}</div>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default DealerProductCompare;
