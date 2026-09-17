import type { OilProduct } from "@/lib/oils/useOilsCatalog";

/**
 * بادج شرائح السعر — يوضح سعر شريحة التاجر مقابل سعر القطاعي.
 */
const TierPriceBadge = ({ product }: { product: OilProduct }) => {
  if (!product.tierPrice) return null;
  const saving = product.base_price - product.tierPrice;
  if (saving <= 0) return null;
  return (
    <span className="oils-saving-badge oils-num">
      وفّرت {saving.toLocaleString("en-US", { maximumFractionDigits: 0 })} ج
    </span>
  );
};

export default TierPriceBadge;
