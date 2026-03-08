/**
 * GA4 DataLayer helper — pushes events for conversion tracking.
 * Works with Google Tag Manager or gtag.js when configured.
 */

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

export const trackEvent = (
  eventName: string,
  params?: Record<string, unknown>
) => {
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({
    event: eventName,
    ...params,
  });
};

/* ── Conversion events ── */

export const trackClickCall = (phone: string) =>
  trackEvent("click_call", { phone_number: phone });

export const trackClickWhatsApp = (source: string) =>
  trackEvent("click_whatsapp", { source });

export const trackLeadFormSubmit = (formName: string, model?: string) =>
  trackEvent("lead_form_submit", { form_name: formName, car_model: model });
