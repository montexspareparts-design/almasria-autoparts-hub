import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { z } from "npm:zod@3.25.76";
import {
  geideaApiBase,
  geideaBasicAuth,
  geideaCheckoutScript,
  geideaCreateSessionSignature,
  geideaEnv,
  geideaTimestamp,
} from "../_shared/geidea.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const RequestSchema = z.object({
  order_id: z.string().uuid(),
  currency: z.string().length(3).optional(),
  return_url: z.string().url().optional(),
});

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
    const authHeader = req.headers.get("Authorization");

    if (!authHeader || !anonKey) return json({ error: "Unauthorized" }, 401);

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return json({ error: "Unauthorized" }, 401);

    const parsed = RequestSchema.safeParse(await req.json().catch(() => null));
    if (!parsed.success) return json({ error: parsed.error.flatten() }, 400);

    const { order_id, return_url } = parsed.data;
    const currency = (parsed.data.currency || Deno.env.get("GEIDEA_CURRENCY") || "EGP").toUpperCase();

    const supabase = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    // Rate limit payment attempts
    const { data: allowed } = await supabase.rpc("check_rate_limit", {
      _identifier: user.id,
      _action: "create_payment",
      _max_requests: 10,
      _window_seconds: 600,
    });
    if (!allowed) return json({ error: "Too many payment attempts. Try again later." }, 429);

    const { data: order } = await supabase
      .from("orders")
      .select("id, user_id, order_number, total_amount, status")
      .eq("id", order_id)
      .maybeSingle();

    if (!order) return json({ error: "Order not found" }, 404);
    if (order.user_id !== user.id) return json({ error: "Forbidden" }, 403);
    if (!["awaiting_payment", "confirmed", "pending"].includes(order.status ?? "awaiting_payment")) {
      return json({ error: "Order is not eligible for a new payment attempt" }, 400);
    }

    const callbackUrl = `${supabaseUrl}/functions/v1/geidea-webhook`;

    const sessionRes = await fetch(`${geideaApiBase()}/payment-intent/api/v2/direct/session`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: geideaBasicAuth() },
      body: JSON.stringify({
        amount: Number(order.total_amount.toFixed ? order.total_amount.toFixed(2) : order.total_amount),
        currency,
        merchantReferenceId: order.order_number,
        callbackUrl,
        ...(return_url ? { returnUrl: return_url } : {}),
        paymentOperation: "Pay",
      }),
    });

    const raw = await sessionRes.json().catch(() => ({}));

    await supabase.from("payment_logs").insert({
      provider: "geidea",
      event_type: "create_session",
      order_id: order.id,
      order_number: order.order_number,
      session_id: raw?.session?.id ?? null,
      amount: order.total_amount,
      currency,
      status: sessionRes.ok ? String(raw?.responseCode ?? "000") : "error",
      raw_response: raw,
    });

    if (!sessionRes.ok || !raw?.session?.id) {
      console.error("Geidea session failed", raw?.responseCode, raw?.detailedResponseMessage);
      return json({ error: raw?.detailedResponseMessage || "تعذر إنشاء جلسة الدفع عبر جيديا" }, 502);
    }

    return json({
      session_id: raw.session.id,
      checkout_script: geideaCheckoutScript(),
      environment: geideaEnv(),
      currency,
      order_number: order.order_number,
    });
  } catch (err) {
    console.error("geidea-create-session error:", err instanceof Error ? err.message : err);
    return json({ error: "حدث خطأ أثناء تجهيز الدفع" }, 500);
  }
});
