/**
 * تحويل الكميات إلى كراتين حسب قواعد المخزن:
 * زيت 4 لتر = 6 عبوات، 6 لتر = 4، 1 لتر = 24، سائل فرامل = 12،
 * مياه ردياتير 1 لتر = 12، مياه ردياتير 4 لتر = 4.
 */

const isRadiator = (name: string) => /ردياتير|تبريد|coolant/i.test(name);
const isBrakeFluid = (name: string) => /فرامل|brake/i.test(name);

/** عدد العبوات داخل الكرتونة الواحدة لهذا الصنف */
export const unitsPerCarton = (nameAr?: string | null, nameEn?: string | null): number => {
  const name = `${nameAr || ""} ${nameEn || ""}`;

  if (isBrakeFluid(name)) return 12;

  const size = name.match(/(\d+(?:\.\d+)?)\s*(?:لتر|لتؤ|ل\b|liter|litre|l\b)/i);
  const liters = size ? Number(size[1]) : null;

  if (isRadiator(name)) {
    if (liters === 4) return 4;
    if (liters === 1) return 12;
    return 12;
  }

  if (liters === 4) return 6;
  if (liters === 6) return 4;
  if (liters === 1) return 24;
  if (liters === 5) return 4;

  return 12;
};

/** نص وصفي للكمية بالكراتين، أو null لو أقل من كرتونة كاملة */
export const cartonLabel = (quantity: number, perCarton: number): string | null => {
  if (perCarton <= 0 || quantity < perCarton) return null;
  const cartons = Math.floor(quantity / perCarton);
  const rest = quantity % perCarton;
  const base = cartons === 1 ? "كرتونة" : cartons === 2 ? "كرتونتين" : `${cartons} كراتين`;
  return rest === 0 ? base : `${base} + ${rest} عبوة`;
};
