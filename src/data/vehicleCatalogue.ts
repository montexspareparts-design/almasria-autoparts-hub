/**
 * vehicleCatalogue.ts
 * ───────────────────
 * Canonical Toyota model taxonomy for the native app's garage.
 *
 * The DB stores fitment as free-text inside `products.compatible_models`
 * (e.g. "هاي اس", "هايس", "HiAce"). The user's saved car lives in
 * `profiles.car_model` as another free string. This file is the bridge:
 * each model has a stable `key` plus `aliases` used for normalized matching.
 *
 * Al Masria is a Toyota distributor — the catalogue is Toyota only.
 */

export interface VehicleModel {
  key: string;
  label: string;
  aliases: string[];
  yearFrom: number;
}

export const VEHICLE_MODELS: VehicleModel[] = [
  { key: "hiace", label: "هاي اس", aliases: ["هاي اس", "هايس", "هاى اس", "hiace", "hi-ace"], yearFrom: 1995 },
  { key: "coaster", label: "كوستر", aliases: ["كوستر", "coaster"], yearFrom: 1995 },
  { key: "corolla", label: "كورولا", aliases: ["كورولا", "corolla"], yearFrom: 1995 },
  { key: "hilux", label: "هاي لوكس", aliases: ["هاي لوكس", "هايلوكس", "هاى لوكس", "hilux"], yearFrom: 1995 },
  { key: "land-cruiser", label: "لاند كروزر", aliases: ["لاند كروزر", "لاندكروزر", "land cruiser", "landcruiser"], yearFrom: 1995 },
  { key: "fortuner", label: "فورتشنر", aliases: ["فورتشنر", "فورتشونر", "fortuner"], yearFrom: 2005 },
  { key: "yaris", label: "ياريس", aliases: ["ياريس", "yaris"], yearFrom: 2000 },
  { key: "belta", label: "بيلتا", aliases: ["بيلتا", "belta"], yearFrom: 2005 },
  { key: "avanza", label: "افانزا", aliases: ["افانزا", "افنزا", "avanza"], yearFrom: 2004 },
  { key: "rav4", label: "راف فور", aliases: ["راف فور", "راففور", "rav4", "rav 4"], yearFrom: 2000 },
  { key: "prado", label: "برادو", aliases: ["برادو", "prado"], yearFrom: 1998 },
  { key: "camry", label: "كامري", aliases: ["كامري", "camry"], yearFrom: 1995 },
  { key: "previa", label: "بريفيا", aliases: ["بريفيا", "previa"], yearFrom: 1995 },
  { key: "rush", label: "راش", aliases: ["راش", "rush"], yearFrom: 2006 },
  { key: "echo", label: "ايكو", aliases: ["ايكو", "إيكو", "echo"], yearFrom: 1999 },
  { key: "dyna", label: "دينا", aliases: ["دينا", "dyna"], yearFrom: 1995 },
];

/** Strip Arabic diacritics/tatweel, unify alef/yaa/haa, collapse spaces, lowercase. */
export const normalizeModelText = (raw: string): string =>
  String(raw || "")
    .replace(/[\u064B-\u0652\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim()
    .toLowerCase();

const ALIAS_INDEX: Record<string, VehicleModel> = (() => {
  const map: Record<string, VehicleModel> = {};
  for (const m of VEHICLE_MODELS) {
    for (const a of [m.label, ...m.aliases]) {
      map[normalizeModelText(a)] = m;
    }
  }
  return map;
})();

/** Resolve any free-text model string (DB or profile) to a catalogue entry. */
export const resolveModel = (raw?: string | null): VehicleModel | null => {
  const n = normalizeModelText(raw || "");
  if (!n) return null;
  if (ALIAS_INDEX[n]) return ALIAS_INDEX[n];
  // Fuzzy: the DB value often embeds the model inside a longer phrase.
  for (const m of VEHICLE_MODELS) {
    for (const a of [m.label, ...m.aliases]) {
      const na = normalizeModelText(a);
      if (na.length >= 3 && (n.includes(na) || na.includes(n))) return m;
    }
  }
  return null;
};

/** True when a product's compatible_models array covers the given model. */
export const modelMatchesProduct = (
  modelKey: string,
  compatibleModels: unknown,
): boolean => {
  if (!Array.isArray(compatibleModels)) return false;
  return compatibleModels.some((cm) => resolveModel(String(cm))?.key === modelKey);
};

export const CURRENT_YEAR = new Date().getFullYear();

export const yearsForModel = (model: VehicleModel | null): number[] => {
  const from = model?.yearFrom ?? 1995;
  const out: number[] = [];
  for (let y = CURRENT_YEAR + 1; y >= from; y--) out.push(y);
  return out;
};
