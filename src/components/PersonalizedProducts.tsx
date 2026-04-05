import { motion } from "framer-motion";
import { Sparkles, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { usePersonalization } from "@/hooks/usePersonalization";
import { useAuth } from "@/contexts/AuthContext";

const PersonalizedProducts = () => {
  const { consent, interests, getTopCategories, getTopBrands } = usePersonalization();
  const { user } = useAuth();

  const topCategories = getTopCategories(3);
  const topBrands = getTopBrands(2);

  const hasInterests = topCategories.length > 0 || topBrands.length > 0;

  const { data: recommended } = useQuery({
    queryKey: ["personalized_products", topCategories, topBrands],
    queryFn: async () => {
      if (!hasInterests) return [];

      let query = supabase
        .from("products")
        .select("id, name_ar, sku, brand, image_url, base_price, is_on_sale, sale_price, product_categories(name_ar)")
        .eq("is_active", true)
        .gt("stock_quantity", 0)
        .limit(8);

      // Filter by top categories OR top brands
      const orClauses: string[] = [];
      if (topCategories.length > 0) {
        orClauses.push(`category_id.in.(${topCategories.join(",")})`);
      }
      if (topBrands.length > 0) {
        orClauses.push(`brand.in.(${topBrands.join(",")})`);
      }
      if (orClauses.length > 0) {
        query = query.or(orClauses.join(","));
      }

      // Exclude recently viewed
      if (interests.lastViewedProducts.length > 0) {
        query = query.not("id", "in", `(${interests.lastViewedProducts.slice(0, 5).join(",")})`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: consent === true && hasInterests,
  });

  if (!consent || !hasInterests || !recommended || recommended.length === 0) return null;

  const brandLabel = (b: string) =>
    b === "toyota_genuine" ? "تويوتا أصلي" : b === "toyota_oils" ? "زيوت تويوتا" : b === "denso" ? "DENSO" : b === "aisin" ? "AISIN" : b === "fbk" ? "تيل فرامل FBK" : "MTX";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <div className="bg-primary/5 border border-primary/15 rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="font-bold text-foreground text-sm">مقترحات بناءً على اهتماماتك</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {recommended.slice(0, 4).map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card rounded-xl border border-border p-3 hover:border-primary/30 hover:shadow-md transition-all group cursor-pointer"
              onClick={() => {
                // Navigate to the brand page
                const brandSlug = product.brand === "toyota_genuine" ? "toyota-genuine" : product.brand === "toyota_oils" ? "toyota-oils" : product.brand === "mtx_aftermarket" ? "mtx-aftermarket" : product.brand;
                window.location.href = `/products/${brandSlug}`;
              }}
            >
              <div className="aspect-square bg-white rounded-lg p-2 mb-2 flex items-center justify-center overflow-hidden">
                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name_ar}
                    className="max-h-full max-w-full object-contain"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full bg-muted/30 rounded flex items-center justify-center text-muted-foreground text-xs">
                    لا توجد صورة
                  </div>
                )}
              </div>
              <p className="text-xs font-bold text-foreground line-clamp-2 mb-1">{product.name_ar}</p>
              <p className="text-[10px] text-muted-foreground">{product.sku}</p>
              <span className="inline-block mt-1 text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                {brandLabel(product.brand)}
              </span>
              {user && (
                <p className="text-xs font-bold text-primary mt-1">
                  {product.is_on_sale && product.sale_price ? `${product.sale_price}` : `${product.base_price}`} ج.م
                </p>
              )}
            </motion.div>
          ))}
        </div>
      </div>
    </motion.div>
  );
};

export default PersonalizedProducts;
