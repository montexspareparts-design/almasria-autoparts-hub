export const PAYMOB_CALLBACK_PATH = "/payment-callback";

export const isValidPaymobPublicKey = (key?: string | null) =>
  Boolean(key && (key.startsWith("egy_pk_") || key.startsWith("pak_pk_")));

export const buildPaymobReturnUrl = () =>
  `${window.location.origin}${PAYMOB_CALLBACK_PATH}`;