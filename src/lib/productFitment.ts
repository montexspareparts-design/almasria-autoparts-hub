/**
 * productFitment.ts
 * ─────────────────
 * Single source of truth for "Does this part fit this car/year?" logic.
 *
 * Inputs we work with on every product:
 *   - year_from / year_to   → the official model-year coverage range from ERP
 *   - compatible_models     → array of model names (e.g. ["كورولا", "كامري"])
 *   - name_ar               → Arabic name (often contains an explicit year, e.g.
 *                             "تيل امامي كورولا 2018 اصلي")
 *
 * The dialog shows three things derived from this file:
 *   1. A friendly "fits years X–Y" label.
 *   2. Compatible-models chips (deduped, normalized).
 *   3. A live match indicator when the user came from a year-aware search OR
 *      when their saved car profile is known.
 *
 * A part is considered NOT year-tied (range-irrelevant) when it's an oil — oils
 * are matched by viscosity/spec, not by model year. Those products skip the
 * coverage UI entirely.
 */

const NO_YEAR_COVERAGE_CATEGORIES = new Set([
  "oils-gasoline",
  "oils-diesel",
  "oils-transmission",
]);

export const isYearIrrelevantProduct = (product: any): boolean => {
  if (!product) return false;
  if (product?.brand === "toyota_oils") return true;
  const catSlug = product?.product_categories?.slug || product?.category_slug;
  if (catSlug && NO_YEAR_COVERAGE_CATEGORIES.has(catSlug)) return true;
  const catNameAr: string = product?.product_categories?.name_ar || "";
  if (catNameAr.includes("زيت") || catNameAr.includes("زيوت")) return true;
  return false;
};

/** Extract every plausible 4-digit year (1990–2099) from a string. */
const extractYears = (text: string): number[] => {
  const matches = String(text || "").match(/\b(19|20)\d{2}\b/g);
  if (!matches) return [];
  return matches.map(Number).filter((y) => y >= 1990 && y <= 2099);
};

export interface FitmentRange {
  /** First model year covered (inclusive). */
  from: number;
  /** Last model year covered (inclusive). null = open-ended ("2018+"). */
  to: number | null;
  /** Where we got this range from — useful for showing trust signals. */
  source: "erp" | "name";
}

/**
 * Compute the model-year coverage range for a product.
 *
 * Priority:
 *   1. ERP year_from/year_to (most authoritative).
 *   2. Years we can read from the Arabic product name as a fallback —
 *      single year ("...كورولا 2018...") becomes (2018 → null/open).
 *      Multiple years span min..max.
 */
export const computeFitmentRange = (product: any): FitmentRange | null => {
  if (!product) return null;
  if (isYearIrrelevantProduct(product)) return null;

  const yfRaw = product.year_from as number | null | undefined;
  const ytRaw = product.year_to as number | null | undefined;

  if (yfRaw && Number(yfRaw) > 0) {
    return {
      from: Number(yfRaw),
      to: ytRaw && Number(ytRaw) > 0 ? Number(ytRaw) : null,
      source: "erp",
    };
  }

  const nameYears = extractYears(product.name_ar || "");
  if (nameYears.length === 0) return null;
  return {
    from: Math.min(...nameYears),
    to: nameYears.length > 1 ? Math.max(...nameYears) : null,
    source: "name",
  };
};

/** Human-readable "2014 – 2019" / "2018+" / "2018" string. */
export const formatRange = (range: FitmentRange): string => {
  const { from, to } = range;
  if (!to || to === from) return to ? String(from) : `${from}+`;
  return `${from} – ${to}`;
};

/* ──────────────────────────────────────────────────────────────────────── */
/* Compatibility decision                                                   */
/* ──────────────────────────────────────────────────────────────────────── */

export type FitVerdict =
  | { kind: "fits_exact"; year: number }      // year is in range AND name mentions it
  | { kind: "fits_range"; year: number }      // year is in range but name doesn't mention it
  | { kind: "out_of_range"; year: number }    // year falls outside the known range
  | { kind: "unknown"; year: number };        // we don't know the range, can't decide

export const evaluateFit = (product: any, year: number | null | undefined): FitVerdict | null => {
  if (!year) return null;
  if (isYearIrrelevantProduct(product)) return null;
  const range = computeFitmentRange(product);
  if (!range) return { kind: "unknown", year };

  const { from, to } = range;
  const upper = to ?? 2099;
  const inRange = year >= from && year <= upper;
  if (!inRange) return { kind: "out_of_range", year };

  const nameHasYear = String(product.name_ar || "").includes(String(year));
  return nameHasYear ? { kind: "fits_exact", year } : { kind: "fits_range", year };
};

/** Pull a unique, trimmed list of compatible model names. */
export const getCompatibleModels = (product: any): string[] => {
  const arr: string[] = Array.isArray(product?.compatible_models) ? product.compatible_models : [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const m of arr) {
    const t = String(m || "").trim();
    if (!t) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
};
