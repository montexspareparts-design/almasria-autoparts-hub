const INVISIBLE_DIRECTION_MARKS = /[\u200E\u200F\u061C\u202A-\u202E\u2066-\u2069]/g;
const PHONE_EMAIL_DOMAIN = "@phone.almasria.local";

export const normalizeNumericInput = (value: string) =>
  value
    .replace(INVISIBLE_DIRECTION_MARKS, "")
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));

export const normalizePhoneDigits = (value: string) =>
  normalizeNumericInput(value).replace(/\D/g, "");

const getEgyptianPhoneVariants = (value: string) => {
  const rawDigits = normalizePhoneDigits(value);
  if (!rawDigits) return [] as string[];

  const variants = new Set<string>();
  let normalized = rawDigits;

  if (normalized.startsWith("0020")) {
    normalized = normalized.slice(4);
  } else if (normalized.startsWith("20")) {
    normalized = normalized.slice(2);
  }

  if (normalized.length === 10 && normalized.startsWith("1")) {
    normalized = `0${normalized}`;
  }

  if (normalized) {
    variants.add(normalized);
  }

  if (normalized.length === 11 && normalized.startsWith("01")) {
    variants.add(normalized.slice(1));
    variants.add(`20${normalized.slice(1)}`);
  }

  variants.add(rawDigits);

  return Array.from(variants);
};

export const isPhoneLike = (value: string) => {
  const cleanedValue = normalizeNumericInput(value).trim();
  return /^[0-9+\s()-]+$/.test(cleanedValue) && normalizePhoneDigits(cleanedValue).length >= 8;
};

export const getPhoneAuthEmailCandidates = (value: string) =>
  getEgyptianPhoneVariants(value).map((digits) => `${digits}${PHONE_EMAIL_DOMAIN}`);

export const phoneToInternalEmail = (value: string) =>
  getPhoneAuthEmailCandidates(value)[0] ?? `${normalizePhoneDigits(value)}${PHONE_EMAIL_DOMAIN}`;
