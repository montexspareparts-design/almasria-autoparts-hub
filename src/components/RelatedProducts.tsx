import { useMemo } from "react";
import { motion } from "framer-motion";
import { Package, ShoppingCart, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import ProductImage from "@/components/ProductImage";

interface Product {
  id: string;
  name_ar: string;
  sku: string;
  base_price: number;
  image_url: string | null;
  category_id: string | null;
  stock_quantity: number;
  min_order_qty: number;
  brand: string;
  product_categories?: { name_ar: string } | null;
}

interface Props {
  currentProduct?: Product;
  allProducts: Product[];
  currentCategoryId?: string | null;
  onAddToCart: (product: Product) => void;
  getPrice: (product: Product) => number;
  isDealer: boolean;
}

const RelatedProducts = ({ currentProduct, allProducts, currentCategoryId, onAddToCart, getPrice, isDealer }: Props) => {
  const relatedProducts = useMemo(() => {
    const catId = currentProduct?.category_id || currentCategoryId;
    if (!catId || !allProducts.length) return [];

    // Get products from the same category, excluding the current one
    const sameCat = allProducts.filter(
      (p) => p.category_id === catId && p.id !== currentProduct?.id && p.stock_quantity > 0
    );

    // If we have enough same-category products, use those; otherwise mix in others
    if (sameCat.length >= 4) return sameCat.slice(0, 6);

    const others = allProducts.filter(
      (p) => p.category_id !== catId && p.id !== currentProduct?.id && p.stock_quantity > 0
    );
    return [...sameCat, ...others].slice(0, 6);
  }, [currentProduct, allProducts, currentCategoryId]);

  if (relatedProducts.length === 0) return null;

  return (
    <section className="py-8 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-bold text-foreground">منتجات مقترحة لك</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {relatedProducts.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/50 hover:shadow-xl hover:shadow-primary/10 hover:-translate-y-1 transition-all duration-300 ease-out group"
            >
              <div className="aspect-square bg-card relative overflow-hidden">
                {product.image_url ? (
                  <ProductImage src={product.image_url} alt={product.name_ar} className="p-2 group-hover:scale-105 transition-transform" loading="lazy" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-8 h-8 text-muted-foreground/20" />
                  </div>
                )}
              </div>
              <div className="p-3">
                <p className="text-[10px] font-mono text-muted-foreground mb-1">Part No: {product.sku}</p>
                <h4 className="text-xs font-bold text-card-foreground leading-relaxed mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                  {product.name_ar}
                </h4>
                <div className="text-primary font-black text-sm mb-2">
                  {getPrice(product).toLocaleString("ar-EG")} ج.م
                </div>
                <Button size="sm" className="w-full gap-1 text-xs h-7" onClick={() => onAddToCart(product)}>
                  <ShoppingCart className="w-3 h-3" />
                  أضف للسلة
                </Button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default RelatedProducts;
