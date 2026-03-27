import { useState, useEffect, useMemo, useRef } from "react";
import { Search, Package, Hash, X, ArrowUp, ArrowDown, CornerDownLeft } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Product {
  id: string;
  name_ar: string;
  sku: string;
  image_url: string | null;
  base_price: number;
  brand: string;
  stock_quantity: number;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  products?: Product[];
  onProductSelect: (product: Product) => void;
}

const BRAND_LABELS: Record<string, string> = {
  toyota_genuine: "قطع أصلية",
  toyota_oils: "زيوت تويوتا",
  mtx_aftermarket: "MTX",
  denso: "DENSO",
  aisin: "AISIN",
  fbk: "FBK",
};

const ProductCommandPalette = ({ open, onOpenChange, products = [], onProductSelect }: Props) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const results = useMemo(() => {
    if (!query || query.length < 2) return [];
    const s = query.toLowerCase();
    return products
      .filter(p => p.name_ar.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s))
      .slice(0, 12);
  }, [query, products]);

  // Global keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        onOpenChange(!open);
      }
      if (e.key === "Escape" && open) {
        onOpenChange(false);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onOpenChange]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Reset selection on query change
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    if (listRef.current) {
      const items = listRef.current.querySelectorAll("[data-item]");
      items[selectedIndex]?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      onProductSelect(results[selectedIndex]);
      onOpenChange(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100]"
            onClick={() => onOpenChange(false)}
          />

          {/* Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-[15%] left-1/2 -translate-x-1/2 w-[95vw] max-w-[600px] bg-card border border-border rounded-2xl shadow-2xl shadow-black/20 z-[101] overflow-hidden"
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-border">
              <Search className="w-5 h-5 text-muted-foreground shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="ابحث عن منتج بالاسم أو رقم القطعة..."
                className="flex-1 bg-transparent text-foreground text-sm outline-none placeholder:text-muted-foreground/50"
                dir="rtl"
              />
              <button
                onClick={() => onOpenChange(false)}
                className="text-muted-foreground hover:text-foreground text-xs bg-muted px-2 py-1 rounded-md border border-border"
              >
                ESC
              </button>
            </div>

            {/* Results */}
            <div ref={listRef} className="max-h-[400px] overflow-y-auto p-2">
              {query.length < 2 ? (
                <div className="py-12 text-center">
                  <Search className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">اكتب للبحث عن المنتجات...</p>
                  <p className="text-muted-foreground/50 text-xs mt-1">ابحث بالاسم أو رقم القطعة (OEM)</p>
                </div>
              ) : results.length === 0 ? (
                <div className="py-12 text-center">
                  <Package className="w-10 h-10 text-muted-foreground/20 mx-auto mb-3" />
                  <p className="text-muted-foreground text-sm">لا توجد نتائج لـ "{query}"</p>
                </div>
              ) : (
                <div className="space-y-0.5">
                  {results.map((product, idx) => (
                    <button
                      key={product.id}
                      data-item
                      onClick={() => {
                        onProductSelect(product);
                        onOpenChange(false);
                      }}
                      onMouseEnter={() => setSelectedIndex(idx)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all ${
                        selectedIndex === idx
                          ? "bg-primary/10 border border-primary/20"
                          : "hover:bg-muted border border-transparent"
                      }`}
                    >
                      {/* Image */}
                      <div className="w-12 h-12 rounded-lg bg-white border border-border shrink-0 flex items-center justify-center overflow-hidden">
                        {product.image_url ? (
                          <img src={product.image_url} alt="" className="w-full h-full object-contain p-1.5" />
                        ) : (
                          <Package className="w-6 h-6 text-muted-foreground/20" />
                        )}
                      </div>

                      {/* Info */}
                      <div className="flex-1 text-right min-w-0">
                        <p className="text-sm font-bold text-foreground truncate">{product.name_ar}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[11px] font-mono text-muted-foreground flex items-center gap-0.5">
                            <Hash className="w-2.5 h-2.5" />{product.sku}
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            {BRAND_LABELS[product.brand] || product.brand}
                          </span>
                        </div>
                      </div>

                      {/* Stock badge */}
                      <div className="shrink-0">
                        {product.stock_quantity > 0 ? (
                          <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded-full font-semibold">متوفر</span>
                        ) : (
                          <span className="text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded-full font-semibold">غير متوفر</span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer hints */}
            <div className="px-4 py-2.5 border-t border-border bg-muted/30 flex items-center justify-between text-[11px] text-muted-foreground">
              <div className="flex items-center gap-3">
                <span className="flex items-center gap-1"><ArrowUp className="w-3 h-3" /><ArrowDown className="w-3 h-3" /> للتنقل</span>
                <span className="flex items-center gap-1"><CornerDownLeft className="w-3 h-3" /> للاختيار</span>
              </div>
              <span>{results.length} نتيجة</span>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProductCommandPalette;
