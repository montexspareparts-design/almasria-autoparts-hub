import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { email, code, new_password } = await req.json();
    if (!email || !code || !new_password) {
      return new Response(JSON.stringify({ error: "Missing fields" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    if (new_password.length < 6) {
      return new Response(JSON.stringify({ error: "كلمة المرور لازم 6 أحرف على الأقل" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const codeHash = await sha256(String(code).trim());

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find latest valid OTP
    const { data: otps, error: fetchErr } = await supabase
      .from("email_password_reset_otps")
      .select("*")
      .eq("email", normalizedEmail)
      .eq("used", false)
      .order("created_at", { ascending: false })
      .limit(1);

    if (fetchErr) throw fetchErr;
    const otp = otps?.[0];
    if (!otp) {
      return new Response(JSON.stringify({ error: "مفيش كود صالح. اطلب كود جديد." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (new Date(otp.expires_at) < new Date()) {
      return new Response(JSON.stringify({ error: "الكود انتهت صلاحيته. اطلب كود جديد." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (otp.attempts >= 5) {
      await supabase.from("email_password_reset_otps").update({ used: true }).eq("id", otp.id);
      return new Response(JSON.stringify({ error: "تم تجاوز عدد المحاولات. اطلب كود جديد." }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (otp.code_hash !== codeHash) {
      await supabase.from("email_password_reset_otps").update({ attempts: otp.attempts + 1 }).eq("id", otp.id);
      return new Response(JSON.stringify({ error: "كود غير صحيح" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Code valid — find user and update password
    const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) throw listErr;
    const user = users.find(u => u.email?.toLowerCase() === normalizedEmail);
    if (!user) {
      return new Response(JSON.stringify({ error: "المستخدم غير موجود" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { error: updateErr } = await supabase.auth.admin.updateUserById(user.id, { password: new_password });
    if (updateErr) throw updateErr;

    // Mark OTP used
    await supabase.from("email_password_reset_otps").update({ used: true }).eq("id", otp.id);

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("verify-email-otp-reset error:", err);
    return new Response(JSON.stringify({ error: err.message || "حدث خطأ" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
