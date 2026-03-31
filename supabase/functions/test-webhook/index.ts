import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const hmacSecret = Deno.env.get("PAYMOB_HMAC_SECRET") || Deno.env.get("PAYMOB_SECRET_KEY");

    if (!hmacSecret) {
      return new Response(JSON.stringify({ error: "No HMAC secret found" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build test transaction payload
    const transaction = {
      id: 99999999,
      pending: false,
      amount_cents: 1450,
      success: true,
      is_auth: false,
      is_capture: false,
      is_standalone_payment: true,
      is_voided: false,
      is_refunded: false,
      is_3d_secure: true,
      integration_id: 5561263,
      has_parent_transaction: false,
      created_at: "2026-03-31T21:30:00.000000",
      currency: "EGP",
      error_occured: false,
      owner: 123456,
      source_data: { type: "card", pan: "2346", sub_type: "Visa" },
      order: { id: 88888888, merchant_order_id: "ORD-20260331-0001" },
      data: {},
    };

    // Compute HMAC exactly like the webhook expects
    const hmacData = [
      transaction.amount_cents,
      transaction.created_at,
      transaction.currency,
      transaction.error_occured,
      transaction.has_parent_transaction,
      transaction.id,
      transaction.integration_id,
      transaction.is_3d_secure,
      transaction.is_auth,
      transaction.is_capture,
      transaction.is_refunded,
      transaction.is_standalone_payment,
      transaction.is_voided,
      transaction.order.id,
      transaction.owner,
      transaction.pending,
      transaction.source_data.pan,
      transaction.source_data.sub_type,
      transaction.source_data.type,
      transaction.success,
    ].join("");

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw", encoder.encode(hmacSecret),
      { name: "HMAC", hash: "SHA-512" }, false, ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(hmacData));
    const computedHmac = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0")).join("");

    // Call the actual webhook
    const webhookUrl = `${supabaseUrl}/functions/v1/paymob-webhook`;
    const body = { obj: transaction, hmac: computedHmac };

    const resp = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const result = await resp.json();

    return new Response(JSON.stringify({
      test: "payment_success_webhook",
      webhook_status: resp.status,
      webhook_response: result,
      hmac_computed: true,
      order_number: "ORD-20260331-0001",
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
