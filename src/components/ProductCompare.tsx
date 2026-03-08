import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeftRight, Search, X, Package, Tag, Layers, CheckCircle2, XCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

interface Product {
  id: string;
  name_ar: string;
  sku: string;
  brand: string;
  image_url: string | null;
  is_on_sale: boolean;
  stock_quantity: number;
  category_id: string | null;
}

interface Category {
  id: string;
  name_ar: string;
}

const brandLabels: Record<string, string> = {
  toyota_genuine: "تويوتا أصلي",
  toyota_oils: "زيوت تويوتا",
  mtx_aftermarket: "MTX Aftermarket",
  denso: "DENSO",
  aisin: "AISIN",
};

const ProductCompare = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selected, setSelected] = useState<(Product | null)[]>([null, null]);
  const [searchTerms, setSearchTerms] = useState(["", ""]);
  const [activeSlot, setActiveSlot] = useState<number | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const [{ data: prods }, { data: cats }] = await Promise.all([
        supabase.from("products").select("id, name_ar, sku, brand, image_url, is_on_sale, stock_quantity, category_id").eq("is_active", true).limit(500),
        supabase.from("product_categories").select("id, name_ar"),
      ]);
      if (prods) setProducts(prods);
      if (cats) setCategories(cats);
    };
    fetchData();
  }, []);

  const getCategoryName = (catId: string | null) => {
    if (!catId) return "—";
    return categories.find((c) => c.id === catId)?.name_ar || "—";
  };

  const filteredProducts = (slot: number) => {
    const term = searchTerms[slot].toLowerCase();
    if (!term) return [];
    const otherId = selected[1 - slot]?.id;
    return products
      .filter((p) => p.id !== otherId && (p.name_ar.toLowerCase().includes(term) || p.sku.toLowerCase().includes(term)))
      .slice(0, 6);
  };

  const selectProduct = (slot: number, product: Product) => {
    const next = [...selected];
    next[slot] = product;
    setSelected(next);
    setActiveSlot(null);
    setSearchTerms((prev) => { const n = [...prev]; n[slot] = ""; return n; });
  };

  const clearSlot = (slot: number) => {
    const next = [...selected];
    next[slot] = null;
    setSelected(next);
  };

  const swapProducts = () => {
    setSelected([selected[1], selected[0]]);
  };

  const bothSelected = selected[0] && selected[1];

  const comparisonRows = [
    { label: "رقم القطعة", icon: Tag, getValue: (p: Product) => p.sku },
    { label: "العلامة التجارية", icon: Layers, getValue: (p: Product) => brandLabels[p.brand] || p.brand },
    { label: "الفئة", icon: Package, getValue: (p: Product) => getCategoryName(p.category_id) },
    { label: "حالة التوفر", icon: CheckCircle2, getValue: (p: Product) => p.stock_quantity > 0 ? "متوفر ✅" : "غير متوفر" },
    { label: "عرض خاص", icon: Tag, getValue: (p: Product) => p.is_on_sale ? "نعم 🔥" : "لا" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.2, duration: 0.5 }}
      className="bg-card border border-border rounded-2xl p-5 md:p-6 relative overflow-hidden"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-primary/3 via-transparent to-accent/3 pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex items-center justify-center gap-2 mb-5">
          <ArrowLeftRight className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-black text-foreground">قارن بين المنتجات ⚡</h3>
        </div>

        {/* Product Selectors */}
        <div className="grid grid-cols-[1fr_auto_1fr] gap-2 items-start mb-5">
          {[0, 1].map((slot) => (
            <div key={slot} className="relative">
              {selected[slot] ? (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-background border border-border rounded-xl p-3 text-center relative group"
                >
                  <button onClick={() => clearSlot(slot)} className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-destructive/10 text-destructive flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <X className="w-3.5 h-3.5" />
                  </button>
                  {selected[slot]!.image_url ? (
                    <img src={selected[slot]!.image_url!} alt="" className="w-16 h-16 object-contain mx-auto mb-2 rounded-lg bg-white p-1" />
                  ) : (
                    <div className="w-16 h-16 bg-muted rounded-lg mx-auto mb-2 flex items-center justify-center">
                      <Package className="w-6 h-6 text-muted-foreground" />
                    </div>
                  )}
                  <p className="text-xs font-bold text-foreground line-clamp-2 leading-relaxed">{selected[slot]!.name_ar}</p>
                  <span className="text-[10px] text-muted-foreground mt-1 block">{selected[slot]!.sku}</span>
                </motion.div>
              ) : (
                <div className="relative">
                  <div className="flex items-center gap-1 bg-background border border-dashed border-primary/30 rounded-xl p-2">
                    <Search className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <Input
                      value={searchTerms[slot]}
                      onChange={(e) => {
                        const next = [...searchTerms];
                        next[slot] = e.target.value;
                        setSearchTerms(next);
                        setActiveSlot(slot);
                      }}
                      onFocus={() => setActiveSlot(slot)}
                      placeholder={slot === 0 ? "المنتج الأول..." : "المنتج الثاني..."}
                      className="border-0 bg-transparent h-8 text-xs text-right p-0 focus-visible:ring-0"
                    />
                  </div>
                  <AnimatePresence>
                    {activeSlot === slot && filteredProducts(slot).length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, y: -5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -5 }}
                        className="absolute top-full left-0 right-0 z-20 mt-1 bg-card border border-border rounded-xl shadow-lg max-h-48 overflow-y-auto"
                      >
                        {filteredProducts(slot).map((p) => (
                          <button
                            key={p.id}
                            onClick={() => selectProduct(slot, p)}
                            className="w-full flex items-center gap-2 p-2.5 text-right hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
                          >
                            {p.image_url ? (
                              <img src={p.image_url} alt="" className="w-8 h-8 object-contain rounded bg-white flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 bg-muted rounded flex items-center justify-center flex-shrink-0">
                                <Package className="w-4 h-4 text-muted-foreground" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-semibold text-foreground truncate">{p.name_ar}</p>
                              <p className="text-[10px] text-muted-foreground">{p.sku}</p>
                            </div>
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
              {slot === 0 && (
                <div className="col-start-2 flex items-center justify-center" />
              )}
            </div>
          )).reduce((acc: React.ReactNode[], node, i) => {
            if (i === 1) {
              acc.push(
                <motion.button
                  key="swap"
                  onClick={swapProducts}
                  whileHover={{ rotate: 180, scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  transition={{ duration: 0.3 }}
                  className="w-9 h-9 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center self-center mt-4"
                  disabled={!bothSelected}
                >
                  <ArrowLeftRight className="w-4 h-4 text-primary" />
                </motion.button>
              );
            }
            acc.push(node);
            return acc;
          }, [])}
        </div>

        {/* Comparison Table */}
        <AnimatePresence>
          {bothSelected && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.4 }}
              className="overflow-hidden"
            >
              <div className="space-y-1.5">
                {comparisonRows.map((row, i) => {
                  const val1 = row.getValue(selected[0]!);
                  const val2 = row.getValue(selected[1]!);
                  const isSame = val1 === val2;
                  return (
                    <motion.div
                      key={row.label}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center bg-background/60 rounded-lg p-2.5"
                    >
                      <div className="text-xs font-semibold text-foreground text-center">{val1}</div>
                      <div className="flex flex-col items-center gap-0.5">
                        <row.icon className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">{row.label}</span>
                        {isSame && <span className="text-[9px] text-green-500 font-bold">متطابق</span>}
                      </div>
                      <div className="text-xs font-semibold text-foreground text-center">{val2}</div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!bothSelected && (
          <p className="text-center text-xs text-muted-foreground mt-2">اختر منتجين للمقارنة بينهما</p>
        )}
      </div>
    </motion.div>
  );
};

export default ProductCompare;
