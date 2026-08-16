/** Free shipping promo: orders of 3000 EGP or more ship for free. */
export const FREE_SHIPPING_THRESHOLD = 3000;

export const qualifiesForFreeShipping = (subtotal: number) =>
  subtotal >= FREE_SHIPPING_THRESHOLD;

export const amountLeftForFreeShipping = (subtotal: number) =>
  Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
