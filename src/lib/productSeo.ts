/**
 * Bilingual SEO meta builder for individual products.
 *
 * Produces title/description/keywords in Arabic + English that always
 * include:
 *   • Product name
 *   • SKU / part number
 *   • Brand label (Toyota Genuine / Toyota Oils / MTX / Denso / Aisin / FBK)
 *   • The keyword "Toyota" (so search engines surface the part for
 *     Toyota-related queries, including aftermarket parts that fit Toyota)
 *
 * Output is consumed by <SEOHead /> via its titleAr/titleEn/descriptionAr/
 * descriptionEn props, so the existing canonical + hreflang + OG pipeline
 * is reused as-is.
 */

type ProductLike = {
  name_ar?: string | null;
  name_en?: string | null;
  sku?: string | null;
  brand?: string | null;
  description_ar?: string | null;
  description_en?: string | null;
  stock_quantity?: number | null;
  product_categories?: { name_ar?: string | null; name_en?: string | null } | null;
};

const BRAND_LABEL_AR: Record<string, string> = {
  toyota_genuine: "تويوتا الأصلية",
  toyota_oils: "زيوت تويوتا الأصلية",
  mtx_aftermarket: "MTX",
  denso: "DENSO",
  aisin: "AISIN",
  fbk: "FBK تيل فرامل",
};

const BRAND_LABEL_EN: Record<string, string> = {
  toyota_genuine: "Toyota Genuine",
  toyota_oils: "Toyota Genuine Motor Oil",
  mtx_aftermarket: "MTX Aftermarket",
  denso: "DENSO",
  aisin: "AISIN",
  fbk: "FBK Brake Pads",
};

/** True for any brand that is technically/commercially related to Toyota vehicles. */
const isToyotaContext = (brand?: string | null): boolean => {
  if (!brand) return true; // assume Toyota-fitment by default for our catalog
  return ["toyota_genuine", "toyota_oils", "mtx_aftermarket", "denso", "aisin", "fbk"].includes(brand);
};

/** Strip HTML, collapse whitespace, and clamp to a max length without breaking words. */
const clamp = (text: string, max: number): string => {
  const clean = text.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).trim() + "…";
};

export interface ProductSEO {
  titleAr: string;
  titleEn: string;
  descriptionAr: string;
  descriptionEn: string;
  keywordsAr: string;
  keywordsEn: string;
  /** schema.org/Product brand value (always brand-aware, not just "Toyota") */
  schemaBrand: string;
}

export const buildProductSEO = (product: ProductLike): ProductSEO => {
  const nameAr = (product.name_ar || "").trim();
  const nameEn = (product.name_en || nameAr).trim();
  const sku = (product.sku || "").trim();
  const brandAr = product.brand ? BRAND_LABEL_AR[product.brand] : "";
  const brandEn = product.brand ? BRAND_LABEL_EN[product.brand] : "";
  const toyotaCtx = isToyotaContext(product.brand);

  const inStock = (product.stock_quantity ?? 0) > 0;
  const stockAr = inStock ? "متوفر الآن" : "اطلب الآن";
  const stockEn = inStock ? "In Stock" : "Order Now";

  // ── TITLES (≤ ~60 chars target, brand + name + SKU) ────────────────────
  const titleArRaw = [nameAr, brandAr && `— ${brandAr}`, sku && `(SKU: ${sku})`]
    .filter(Boolean)
    .join(" ");
  const titleEnRaw = [nameEn, brandEn && `— ${brandEn}`, sku && `(SKU: ${sku})`]
    .filter(Boolean)
    .join(" ");
  const titleAr = clamp(titleArRaw, 60);
  const titleEn = clamp(titleEnRaw, 60);

  // ── DESCRIPTIONS (≤ 160 chars, include name + SKU + brand + Toyota cue)
  const baseAr =
    product.description_ar?.trim() ||
    `${nameAr}${brandAr ? ` من ${brandAr}` : ""}${
      toyotaCtx ? " — يناسب سيارات تويوتا" : ""
    }. كود القطعة ${sku}. ${stockAr} لدى المصرية جروب، الموزع المعتمد لقطع غيار وزيوت تويوتا في مصر.`;

  const baseEn =
    product.description_en?.trim() ||
    `${nameEn}${brandEn ? ` by ${brandEn}` : ""}${
      toyotaCtx ? " — fits Toyota vehicles" : ""
    }. Part number ${sku}. ${stockEn} at Al Masria Group, the authorized Toyota parts & oils distributor in Egypt.`;

  const descriptionAr = clamp(baseAr, 160);
  const descriptionEn = clamp(baseEn, 160);

  // ── KEYWORDS ───────────────────────────────────────────────────────────
  const catAr = product.product_categories?.name_ar || "";
  const catEn = product.product_categories?.name_en || "";

  const keywordsAr = [
    nameAr,
    sku,
    brandAr,
    catAr,
    "قطع غيار تويوتا",
    "تويوتا مصر",
    "المصرية جروب",
  ]
    .filter(Boolean)
    .join(", ");

  const keywordsEn = [
    nameEn,
    sku,
    brandEn,
    catEn,
    "Toyota parts",
    "Toyota Egypt",
    "Al Masria Group",
  ]
    .filter(Boolean)
    .join(", ");

  return {
    titleAr,
    titleEn,
    descriptionAr,
    descriptionEn,
    keywordsAr,
    keywordsEn,
    schemaBrand: brandEn || "Toyota",
  };
};
