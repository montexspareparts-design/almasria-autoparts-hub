// Geidea posts (or gets) the shopper back here after "Go to merchant website".
// Static hosting cannot answer a POST, which showed a blank page. This function
// accepts any method, then 303-redirects the browser (GET) to the app page.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const ALLOWED_HOST_SUFFIXES = ["lovable.app", "lovableproject.com", "almasriaautoparts.com"];

function isAllowed(target: URL) {
  return ALLOWED_HOST_SUFFIXES.some((s) => target.hostname === s || target.hostname.endsWith(`.${s}`));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const url = new URL(req.url);
  const params = new URLSearchParams();

  // Query params from Geidea (GET) or from our own redirect target.
  for (const [k, v] of url.searchParams) {
    if (k !== "redirect") params.set(k, v);
  }

  if (req.method === "POST") {
    try {
      const ct = req.headers.get("content-type") ?? "";
      if (ct.includes("application/json")) {
        const body = await req.json();
        for (const [k, v] of Object.entries(body ?? {})) {
          if (typeof v === "string" || typeof v === "number") params.set(k, String(v));
        }
      } else {
        const form = await req.formData();
        for (const [k, v] of form.entries()) if (typeof v === "string") params.set(k, v);
      }
    } catch (_) {
      // ignore unparsable bodies — we still redirect
    }
  }

  const redirectRaw = url.searchParams.get("redirect") ?? "";
  let target: URL | null = null;
  try {
    target = new URL(redirectRaw);
  } catch (_) {
    target = null;
  }
  if (!target || !isAllowed(target)) {
    target = new URL("https://almasriaautoparts.com/oils/payment-result");
  }

  for (const [k, v] of params) if (!target.searchParams.has(k)) target.searchParams.set(k, v);
  target.searchParams.set("provider", "geidea");

  return new Response(null, {
    status: 303,
    headers: { ...corsHeaders, Location: target.toString() },
  });
});
