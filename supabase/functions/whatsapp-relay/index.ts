import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

function formatEgyptianPhone(phone: string): string {
  let p = phone.replace(/[\s\-()+]/g, '');
  if (p.startsWith('00')) p = p.slice(2);
  if (p.startsWith('0')) p = `20${p.slice(1)}`;
  if (/^1\d{9}$/.test(p)) p = `20${p}`;
  return p;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  try {
    const relayKey = Deno.env.get('WHATSAPP_RELAY_KEY');
    const provided = req.headers.get('x-relay-key');
    if (!relayKey || !provided || provided !== relayKey) {
      return json({ error: 'unauthorized' }, 401);
    }

    const accessToken = Deno.env.get('META_WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = Deno.env.get('META_WHATSAPP_PHONE_NUMBER_ID');
    if (!accessToken || !phoneNumberId) {
      return json({ error: 'missing_whatsapp_credentials' }, 500);
    }

    const payload = await req.json().catch(() => ({}));
    const action = String(payload?.action || 'send_text');

    // 1) Health check
    if (action === 'health') {
      const res = await fetch(
        `${GRAPH_API_BASE}/${phoneNumberId}?fields=id,verified_name,quality_rating`,
        { headers: { Authorization: `Bearer ${accessToken}` } },
      );
      const data = await res.json().catch(() => ({}));
      return json({ healthy: res.ok, status: res.status, data }, 200);
    }

    // 2) Raw Graph API passthrough (read/write) — path must be a Graph path
    if (action === 'graph') {
      const path = String(payload?.path || '');
      if (!path.startsWith('/')) return json({ error: 'path must start with /' }, 400);
      const method = String(payload?.method || 'GET').toUpperCase();
      const qs = payload?.query_params
        ? `?${new URLSearchParams(payload.query_params as Record<string, string>)}`
        : '';
      const res = await fetch(`${GRAPH_API_BASE}${path}${qs}`, {
        method,
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: method === 'GET' ? undefined : JSON.stringify(payload?.body ?? {}),
      });
      const text = await res.text();
      let data: unknown;
      try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }
      if (!res.ok) console.error(`Graph relay failed [${res.status}]: ${text}`);
      return json({ ok: res.ok, status: res.status, data }, res.ok ? 200 : res.status);
    }

    // 3) Send a WhatsApp message (text or full Meta payload)
    const to = payload?.to ? formatEgyptianPhone(String(payload.to)) : null;
    if (!to) return json({ error: 'to (phone) is required' }, 400);

    const messagePayload =
      action === 'send_payload' && payload?.message
        ? payload.message
        : { type: 'text', text: { preview_url: false, body: String(payload?.body ?? '') } };

    const res = await fetch(`${GRAPH_API_BASE}/${phoneNumberId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to,
        ...(messagePayload as Record<string, unknown>),
      }),
    });

    const text = await res.text();
    let data: unknown;
    try { data = text ? JSON.parse(text) : null; } catch { data = { raw: text }; }

    if (!res.ok) {
      console.error(`WhatsApp relay send failed [${res.status}]: ${text}`);
      return json({ ok: false, status: res.status, error: data }, res.status);
    }

    return json({ ok: true, to, data });
  } catch (error) {
    console.error('whatsapp-relay crashed:', error);
    return json({ error: String(error) }, 500);
  }
});
