/**
 * Analytics layer: GA4 (gtag.js) + optional Meta Pixel.
 * Safe no-ops when IDs are missing or when running natively.
 */

const GA4_ID = "G-7R5BERCHRM";
const META_PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID as string | undefined;
const GOOGLE_ADS_ID = import.meta.env.VITE_GOOGLE_ADS_ID as string | undefined;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
    fbq?: ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };
    _fbq?: unknown;
  }
}

let initialized = false;

export function initAnalytics() {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  // ---- GA4 ----
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  } as unknown as (...args: unknown[]) => void;
  window.gtag("js", new Date());
  window.gtag("config", GA4_ID, { send_page_view: false });
  if (GOOGLE_ADS_ID) window.gtag("config", GOOGLE_ADS_ID);

  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`;
  document.head.appendChild(s);

  // ---- Meta Pixel (only when an ID is configured) ----
  if (META_PIXEL_ID) {
    /* eslint-disable */
    (function (f: any, b: Document, e: string, v: string) {
      if (f.fbq) return;
      const n: any = (f.fbq = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      });
      if (!f._fbq) f._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = "2.0";
      n.queue = [];
      const t = b.createElement(e) as HTMLScriptElement;
      t.async = true;
      t.src = v;
      b.head.appendChild(t);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    /* eslint-enable */
    window.fbq?.("init", META_PIXEL_ID);
  }
}

export function trackPageView(path: string, title?: string) {
  window.gtag?.("event", "page_view", { page_path: path, page_title: title ?? document.title });
  window.fbq?.("track", "PageView");
}

type Item = { id: string; name: string; brand?: string; price?: number; quantity?: number };

const toGaItems = (items: Item[]) =>
  items.map((i) => ({ item_id: i.id, item_name: i.name, item_brand: i.brand, price: i.price, quantity: i.quantity ?? 1 }));

export function trackViewItem(item: Item) {
  window.gtag?.("event", "view_item", { currency: "EGP", value: item.price ?? 0, items: toGaItems([item]) });
  window.fbq?.("track", "ViewContent", { content_ids: [item.id], content_type: "product", currency: "EGP", value: item.price ?? 0 });
}

export function trackAddToCart(item: Item) {
  const value = (item.price ?? 0) * (item.quantity ?? 1);
  window.gtag?.("event", "add_to_cart", { currency: "EGP", value, items: toGaItems([item]) });
  window.fbq?.("track", "AddToCart", { content_ids: [item.id], content_type: "product", currency: "EGP", value });
}

export function trackBeginCheckout(items: Item[], value: number) {
  window.gtag?.("event", "begin_checkout", { currency: "EGP", value, items: toGaItems(items) });
  window.fbq?.("track", "InitiateCheckout", { currency: "EGP", value, num_items: items.length });
}

export function trackPurchase(orderId: string, value: number, items: Item[] = []) {
  window.gtag?.("event", "purchase", { transaction_id: orderId, currency: "EGP", value, items: toGaItems(items) });
  if (GOOGLE_ADS_ID) {
    window.gtag?.("event", "conversion", { send_to: GOOGLE_ADS_ID, transaction_id: orderId, currency: "EGP", value });
  }
  window.fbq?.("track", "Purchase", { currency: "EGP", value, content_ids: items.map((i) => i.id) });
}

export function trackSignUp(method: string) {
  window.gtag?.("event", "sign_up", { method });
  window.fbq?.("track", "CompleteRegistration");
}

export function trackSearch(term: string) {
  window.gtag?.("event", "search", { search_term: term });
  window.fbq?.("track", "Search", { search_string: term });
}

export function trackLead(source: string) {
  window.gtag?.("event", "generate_lead", { source });
  window.fbq?.("track", "Lead");
}
