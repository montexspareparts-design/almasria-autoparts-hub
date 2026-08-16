/**
 * Centralized price-visibility helper for the native shell.
 *
 * Business rules (unchanged, only consolidated):
 *  - Guests never see prices → "سجّل لرؤية السعر".
 *  - Retail customers (no dealer account) see `base_price`.
 *  - Dealers on the `retail` tier see `base_price` too (bypass the reveal limit).
 *  - Other dealer tiers must reveal the wholesale price explicitly (20/day limit),
 *    so the card shows a reveal affordance instead of a number.
 */

export type PriceState =
  | { kind: "guest"; label: string }
  | { kind: "visible"; amount: number; label: string }
  | { kind: "reveal"; label: string };

interface Args {
  user: unknown | null;
  isDealer: boolean;
  tier?: string | null;
  basePrice?: number | null;
}

export const formatEGP = (value: number) =>
  `${Number(value || 0).toLocaleString("en-US", { maximumFractionDigits: 0 })} EGP`;

export const resolvePriceState = ({ user, isDealer, tier, basePrice }: Args): PriceState => {
  if (!user) return { kind: "guest", label: "سجّل لرؤية السعر" };

  const isRetailTier = (tier || "").toLowerCase() === "retail";
  if (!isDealer || isRetailTier) {
    const amount = Number(basePrice || 0);
    return { kind: "visible", amount, label: formatEGP(amount) };
  }

  return { kind: "reveal", label: "اعرض سعر الجملة" };
};

/** Can this viewer add the item straight to the cart from a compact card? */
export const canQuickAdd = (state: PriceState) => state.kind === "visible" && state.amount > 0;
