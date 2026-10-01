import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

// دخول برقم الموبايل: نعرف الإيميل من الرقم على السيرفر بس، ونرجّع الجلسة فقط (الإيميل مش بيطلع للعميل).
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

const normalize = (v: string) => {
  let d = String(v || "")
    .replace(/[٠-٩]/g, (x) => String("٠١٢٣٤٥٦٧٨٩".indexOf(x)))
    .replace(/\D/g, "");
  if (d.startsWith("0020")) d = d.slice(4);
  else if (d.startsWith("20") && d.length === 12) d = d.slice(2);
  if (d.length === 10 && d.startsWith("1")) d = "0" + d;
  return d;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "method" }, 405);
  let body: { phone?: string; password?: string };
  try { body = await req.json(); } catch { return json({ error: "invalid" }, 400); }
  const phone = normalize(body.phone || "");
  const password = String(body.password || "");
  if (!/^01\d{9}$/.test(phone) || password.length < 6 || password.length > 128) {
    return json({ error: "invalid_credentials" }, 400);
  }

  const url = Deno.env.get("SUPABASE_URL")!;
  const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  // حد للمحاولات
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { data: ok } = await admin.rpc("check_rate_limit", { _identifier: `phone-login:${ip}:${phone}`, _max_requests: 10, _window_seconds: 300 } as never);
    if (ok === false) return json({ error: "rate_limited" }, 429);
  } catch { /* لو الدالة مختلفة نكمل */ }

  const emails = new Set<string>([`${phone}@phone.almasria.local`]);
  const userIds = new Set<string>();
  const { data: profs } = await admin.from("profiles").select("user_id,email").eq("phone", phone).limit(5);
  for (const p of profs || []) { if (p.email) emails.add(p.email); if (p.user_id) userIds.add(p.user_id); }
  const { data: apps } = await admin.from("dealer_applications").select("user_id,email").eq("phone", phone).limit(5);
  for (const a of apps || []) { if (a.email) emails.add(a.email); if (a.user_id) userIds.add(a.user_id); }
  for (const id of userIds) {
    const { data } = await admin.auth.admin.getUserById(id);
    if (data?.user?.email) emails.add(data.user.email);
  }

  const anon = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, { auth: { persistSession: false } });
  for (const email of emails) {
    const { data, error } = await anon.auth.signInWithPassword({ email, password });
    if (!error && data.session) {
      return json({ access_token: data.session.access_token, refresh_token: data.session.refresh_token });
    }
  }
  return json({ error: "invalid_credentials" }, 401);
});
