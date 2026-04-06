export const normalizeNumericInput = (value: string) =>
  value
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));

export const normalizePhoneDigits = (value: string) =>
  normalizeNumericInput(value).replace(/\D/g, "");

export const isPhoneLike = (value: string) =>
  /^[0-9٠-٩۰-۹+\s()-]+$/.test(value.trim()) && normalizePhoneDigits(value).length >= 8;

export const phoneToInternalEmail = (value: string) =>
  `${normalizePhoneDigits(value)}@phone.almasria.local`;
