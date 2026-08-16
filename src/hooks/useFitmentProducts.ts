import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useGarage } from "@/contexts/GarageContext";
import { modelMatchesProduct, VEHICLE_MODELS } from "@/data/vehicleCatalogue";
import { evaluateFit } from "@/lib/productFitment";

const CACHE_PREFIX = "almasria.fitment.";

const readCache = (key: string): any[] | null => {
  try {
    const raw = localStorage.getItem(CACHE_PREFIX + key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
};

const writeCache = (key: string, rows: any[]) => {
  try {
    localStorage.setItem(CACHE_PREFIX + key, JSON.stringify(rows.slice(0, 12)));
  } catch {
    /* ignore quota */
  }
};

/** Parts that fit the currently active garage vehicle. */
export const useFitmentProducts = (limit = 10) => {
  const { activeVehicle } = useGarage();
  const modelKey = activeVehicle?.modelKey ?? null;
  const year = activeVehicle?.year ?? null;

  const query = useQuery({
    queryKey: ["native_fitment_products", modelKey, year],
    enabled: !!modelKey && !!year,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const model = VEHICLE_MODELS.find((m) => m.key === modelKey);
      const aliases = model ? [model.label, ...model.aliases] : [];

      const { data } = await supabase
        .from("products")
        .select(
          "id, name_ar, sku, erp_item_code, part_number, image_url, base_price, brand, compatible_models, year_from, year_to, product_categories(slug, name_ar)",
        )
        .eq("is_active", true)
        .gt("stock_quantity", 0)
        .not("image_url", "is", null)
        .neq("image_url", "")
        .overlaps("compatible_models", aliases)
        .limit(120);

      const rows = (data || []).filter((p: any) => modelMatchesProduct(modelKey!, p.compatible_models));

      const ranked = rows
        .map((p: any) => {
          const verdict = evaluateFit(p, year);
          const score =
            verdict?.kind === "fits_exact" ? 0 : verdict?.kind === "fits_range" ? 1 : verdict === null ? 2 : verdict.kind === "unknown" ? 3 : 4;
          return { p, score };
        })
        .filter((x) => x.score < 4)
        .sort((a, b) => a.score - b.score)
        .slice(0, limit)
        .map((x) => x.p);

      writeCache(`${modelKey}-${year}`, ranked);
      return ranked;
    },
  });

  const cached = modelKey && year ? readCache(`${modelKey}-${year}`) : null;

  return {
    products: query.data ?? cached ?? [],
    isLoading: query.isLoading && !cached,
    vehicle: activeVehicle,
  };
};
