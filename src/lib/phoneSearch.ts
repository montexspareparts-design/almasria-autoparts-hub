/**
 * Phone search normalization for Egyptian numbers.
 *
 * Goal: a single search box should match a phone whether the user typed it
 * in international (+20 / 0020 / 20), local (01...), or messy (with spaces,
 * dashes, parentheses, leading zeros) formats — and regardless of how the
 * number is stored in the database.
 *
 * Strategy:
 *  1. Strip every non-digit character (spaces, dashes, +, parentheses, dots).
 *  2. Strip common Egyptian country-code prefixes (0020, 20) and the local
 *     trunk zero so we land on the national subscriber digits (e.g. 1027815696).
 *  3. Generate all reasonable variants the DB might hold.
 *  4. Build a Postgres .or() filter usable with supabase.from().or(...).
 *
 * Works for partial matches too — if the user types only the last 6 digits
 * we still try ilike %digits% as a fallback so we don't miss anything.
 */

export interface PhoneSearchResult {
  /** Raw digits the user typed (no separators). Empty if input had no digits. */
  digits: string;
  /** National subscriber digits, e.g. "1027815696" (no leading 0, no country code). */
  core: string;
  /** Sorted unique list of all candidate strings to match against. */
  variants: string[];
  /** Ready-to-use Postgres .or() filter for a given column (e.g. "phone"). */
  buildOrFilter: (column: string) => string;
}

const MIN_PARTIAL_LENGTH = 4;

export function normalizePhoneSearch(input: string): PhoneSearchResult {
  const digits = (input || "").replace(/\D/g, "");
  const empty: PhoneSearchResult = {
    digits: "",
    core: "",
    variants: [],
    buildOrFilter: () => "",
  };
  if (!digits) return empty;

  // Derive the national subscriber digits ("core") by peeling off
  // country-code / trunk-zero prefixes in the safest order.
  let core = digits;
  if (core.startsWith("0020")) core = core.slice(4);
  else if (core.startsWith("20") && core.length >= 11) core = core.slice(2);
  if (core.startsWith("0") && core.length >= 10) core = core.slice(1);

  // Generate variants the DB may store. Use a Set to dedupe naturally.
  const variantSet = new Set<string>();
  const push = (v: string) => {
    if (v && v.length >= MIN_PARTIAL_LENGTH) variantSet.add(v);
  };

  // The raw digits the user typed (covers exact-match storage).
  push(digits);
  // Only generate prefixed variants when the core itself looks meaningful.
  // Otherwise "12" would generate "2012", "002012" and create false matches.
  if (core.length >= MIN_PARTIAL_LENGTH) {
    push(core);
    // Local Egyptian format.
    push(`0${core}`);
    // International numeric formats.
    push(`20${core}`);
    push(`0020${core}`);
    // International with + sign — only matches when DB stores literal "+20…".
    push(`+20${core}`);
  }

  const variants = Array.from(variantSet).sort();

  const buildOrFilter = (column: string): string => {
    if (!variants.length) return "";
    return variants.map((v) => `${column}.ilike.%${v}%`).join(",");
  };

  return { digits, core, variants, buildOrFilter };
}

/**
 * Client-side predicate: does a stored phone string match the user's query?
 * Useful when filtering in-memory arrays (e.g. visitor leads) instead of via SQL.
 */
export function phoneMatches(stored: string | null | undefined, query: string): boolean {
  if (!stored) return false;
  const { variants } = normalizePhoneSearch(query);
  if (!variants.length) return true; // empty query → no filter
  const storedDigits = stored.replace(/\D/g, "");
  if (!storedDigits) return false;
  return variants.some((v) => storedDigits.includes(v) || stored.includes(v));
}
