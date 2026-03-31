export const PAYMOB_PUBLIC_KEY = "egy_pk_test_c3q3A7Q3VgjBR4KgpyivFFE758En5mgu";

export const PAYMOB_CALLBACK_PATH = "/payment-callback";

export const isPaymobPublicKeyConfigured =
  PAYMOB_PUBLIC_KEY.startsWith("egy_pk_") || PAYMOB_PUBLIC_KEY.startsWith("pak_pk_");

export const buildPaymobReturnUrl = () =>
  `${window.location.origin}${PAYMOB_CALLBACK_PATH}`;