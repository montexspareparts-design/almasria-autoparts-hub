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
      // 1. Primary: match via compatible_models array
      let query = supabase
        .from("products")
        .select("id, name_ar, sku, brand, image_url, base_price, is_on_sale, sale_price, compatible_models, year_from, year_to")
        .eq("is_active", true)
        .contains("compatible_models", [carModel!]);

      // Filter by year range if available
      if (carYear) {
        query = query.or(`year_from.is.null,year_from.lte.${carYear}`)
                     .or(`year_to.is.null,year_to.gte.${carYear}`);
      }

      const { data: primaryResults, error: err1 } = await query.limit(16);
      if (err1) throw err1;

      // 2. Fallback: search in name if compatible_models didn't yield enough
      let allResults = primaryResults || [];

      if (allResults.length < 8) {
        const existingIds = allResults.map(p => p.id);
        const { data: fallback } = await supabase
          .from("products")
          .select("id, name_ar, sku, brand, image_url, base_price, is_on_sale, sale_price, compatible_models, year_from, year_to")
          .eq("is_active", true)
          .ilike("name_ar", `%${carModel}%`)
          .limit(16);

        if (fallback) {
          const extra = fallback.filter(p => !existingIds.includes(p.id));
          allResults = [...allResults, ...extra];
        }
      }

      // Prioritize products with year match
      if (carYear && allResults.length > 0) {
        const scored = allResults.map(p => {
          let score = 0;
          // compatible_models match = highest priority
          if (p.compatible_models?.includes(carModel!)) score += 10;
          // Year range match
          if (p.year_from && p.year_to && carYear >= p.year_from && carYear <= p.year_to) score += 5;
          else if (!p.year_from && !p.year_to) score += 2;
          // Name contains year
          if (p.name_ar.includes(String(carYear))) score += 3;
          return { ...p, score };
        });
        scored.sort((a, b) => b.score - a.score);
        return scored.slice(0, 8);
      }

      return allResults.slice(0, 8);
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
