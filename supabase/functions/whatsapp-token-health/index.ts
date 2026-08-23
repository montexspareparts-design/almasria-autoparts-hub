import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const GRAPH_API_BASE = 'https://graph.facebook.com/v21.0';

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
    const accessToken = Deno.env.get('META_WHATSAPP_ACCESS_TOKEN');
    const phoneNumberId = Deno.env.get('META_WHATSAPP_PHONE_NUMBER_ID');

    if (!accessToken || !phoneNumberId) {
      return json({ healthy: false, reason: 'missing_credentials' }, 200);
    }

    const res = await fetch(
      `${GRAPH_API_BASE}/${phoneNumberId}?fields=id,verified_name,quality_rating`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    const data = await res.json().catch(() => ({}));

    if (res.ok) {
      console.log('WhatsApp token healthy', { verified_name: data?.verified_name });
      return json({
        healthy: true,
        verified_name: data?.verified_name ?? null,
        quality_rating: data?.quality_rating ?? null,
      });
    }

    const errorCode = data?.error?.code ?? res.status;
    const errorMessage = String(data?.error?.message ?? 'unknown error');
    console.error(`WhatsApp token check failed [${res.status}] ${errorCode}: ${errorMessage}`);

    // Notify all admins in-app so WhatsApp outages never go unnoticed.
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: admins } = await supabase
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin');

    if (admins?.length) {
      await supabase.from('notifications').insert(
        admins.map((a: { user_id: string }) => ({
          user_id: a.user_id,
          title: '🚨 توكن واتساب متوقف',
          message: `فشل الاتصال بـ WhatsApp API (كود ${errorCode}). كل إشعارات الطلبات والمخازن متوقفة — لازم تجديد التوكن من Meta Business.`,
          type: 'whatsapp_token_failure',
        })),
      );
    }

    return json({ healthy: false, errorCode, errorMessage, notified: admins?.length ?? 0 }, 200);
  } catch (error) {
    console.error('whatsapp-token-health crashed:', error);
    return json({ healthy: false, reason: String(error) }, 500);
  }
});
