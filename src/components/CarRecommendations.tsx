import { motion } from "framer-motion";
import { Car, ChevronLeft, Sparkles } from "lucide-react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const CarRecommendations = () => {
  const { user } = useAuth();

  const { data: profile } = useQuery({
    queryKey: ["user_car_profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("car_model, car_year")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const carModel = profile?.car_model;
  const carYear = profile?.car_year;

  const { data: products, isLoading } = useQuery({
    queryKey: ["car_recommendations", carModel, carYear],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id, name_ar, sku, brand, image_url, base_price, is_on_sale, sale_price")
        .eq("is_active", true)
        .ilike("name_ar", `%${carModel}%`)
        .limit(8);

      // If year is set, try to match year in name too, but fallback to model-only
      const { data, error } = await query;
      if (error) throw error;

      // If year is set, prioritize products with matching year
      if (carYear && data) {
        const yearStr = String(carYear);
        const withYear = data.filter(p => p.name_ar.includes(yearStr));
        const withoutYear = data.filter(p => !p.name_ar.includes(yearStr));
        return [...withYear, ...withoutYear].slice(0, 8);
      }

      return data || [];
    },
    enabled: !!carModel,
  });

  if (!carModel || !products || products.length === 0) return null;

  const brandMap: Record<string, string> = {
    toyota_genuine: "toyota-genuine",
    toyota_oils: "toyota-oils",
    mtx_aftermarket: "mtx-aftermarket",
    denso: "denso",
    aisin: "aisin",
    fbk: "fbk",
  };

  return (
    <section className="py-10 bg-gradient-to-b from-primary/5 to-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            مقترح ليك
          </div>
          <h2 className="text-xl md:text-3xl font-black text-foreground mb-2">
            قطع غيار لـ <span className="text-primary">{carModel}</span>
            {carYear && <span className="text-muted-foreground text-lg mr-2">({carYear})</span>}
          </h2>
          <p className="text-muted-foreground text-sm">
            أصناف مناسبة لعربيتك من مخزوننا
          </p>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
          {products.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05 }}
            >
              <Link
                to={`/products/${brandMap[product.brand] || "toyota-genuine"}?search=${encodeURIComponent(product.sku)}`}
                className="group block bg-card border border-border rounded-xl overflow-hidden hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
              >
                <div className="aspect-square bg-white p-2 relative overflow-hidden">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name_ar}
                      loading="lazy"
                      className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground/30">
                      <Car className="w-10 h-10" />
                    </div>
                  )}
                  {/* Shimmer */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out" />
                </div>
                <div className="p-3">
                  <p className="text-xs text-muted-foreground mb-1 font-mono">{product.sku}</p>
                  <h3 className="text-sm font-bold text-card-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                    {product.name_ar}
                  </h3>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        <div className="text-center mt-6">
          <Link
            to={`/products/toyota-genuine?search=${encodeURIComponent(carModel)}`}
            className="inline-flex items-center gap-2 text-sm font-bold text-primary hover:text-primary/80 transition-colors"
          >
            عرض كل قطع غيار {carModel}
            <ChevronLeft className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  );
};

export default CarRecommendations;
