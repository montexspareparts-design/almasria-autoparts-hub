import { useState, useRef, useEffect, useMemo } from "react";
import { Search, X, Package, Hash, Command } from "lucide-react";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

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
  onCommandPaletteOpen?: () => void;
  placeholder?: string;
}

const ProductSearchAutocomplete = ({
  value, onChange, products = [], onProductClick, onCommandPaletteOpen,
  placeholder = "ابحث بالاسم أو رقم القطعة..."
}: Props) => {
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const suggestions = useMemo(() => {
    if (!value || value.length < 2) return [];
    const s = value.toLowerCase();
    return products
      .filter(p => p.name_ar.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s))
      .slice(0, 6);
  }, [value, products]);

  const showDropdown = isFocused && suggestions.length > 0;

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

  return (
    <div ref={wrapperRef} className="relative flex-1">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          className="pr-10 pl-20 bg-card border-border h-11 text-sm placeholder:text-muted-foreground/60"
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
            className="absolute top-full left-0 right-0 mt-1.5 bg-card border border-border rounded-xl shadow-xl shadow-black/10 overflow-hidden z-50"
          >
            <div className="p-1.5">
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
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ProductSearchAutocomplete;
