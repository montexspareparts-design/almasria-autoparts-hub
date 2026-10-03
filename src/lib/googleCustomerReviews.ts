// Google Customer Reviews (Merchant Center 5864838521): opt-in survey + seller-rating badge.
const MERCHANT_ID = 5864838521;

declare global {
  interface Window { gapi?: any; renderOptIn?: () => void; merchantwidget?: any }
}

export function showReviewsOptIn(orderId: string, email: string, deliveryDays = 3) {
  if (typeof window === "undefined" || !orderId || !email) return;
  const d = new Date(Date.now() + deliveryDays * 86400000).toISOString().slice(0, 10);
  window.renderOptIn = () => {
    window.gapi?.load("surveyoptin", () => {
      window.gapi.surveyoptin.render({
        merchant_id: MERCHANT_ID,
        order_id: orderId,
        email,
        delivery_country: "EG",
        estimated_delivery_date: d,
      });
    });
  };
  if (window.gapi?.load) { window.renderOptIn(); return; }
  const s = document.createElement("script");
  s.src = "https://apis.google.com/js/platform.js?onload=renderOptIn";
  s.async = true; s.defer = true;
  document.body.appendChild(s);
}

export function loadReviewsBadge() {
  if (typeof window === "undefined" || document.getElementById("merchantWidgetScript")) return;
  const s = document.createElement("script");
  s.id = "merchantWidgetScript";
  s.src = "https://www.gstatic.com/shopping/merchant/merchantwidget.js";
  s.defer = true;
  s.addEventListener("load", () => {
    window.merchantwidget?.start({ merchant_id: MERCHANT_ID, position: "LEFT_BOTTOM", region: "EG" });
  });
  document.body.appendChild(s);
}
