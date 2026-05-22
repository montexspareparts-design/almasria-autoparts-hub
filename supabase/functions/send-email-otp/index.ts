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
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Email required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const normalizedEmail = email.trim().toLowerCase();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the email is registered
    const { data: { users }, error: listErr } = await supabase.auth.admin.listUsers();
    if (listErr) throw listErr;
    const user = users.find(u => u.email?.toLowerCase() === normalizedEmail);
    if (!user) {
      return new Response(JSON.stringify({ error: "الإيميل ده مش مسجل عندنا" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Generate 6-digit code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codeHash = await sha256(code);
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    // Invalidate previous codes for this email
    await supabase.from("email_password_reset_otps")
      .update({ used: true })
      .eq("email", normalizedEmail)
      .eq("used", false);

    // Insert new code
    const { error: insertErr } = await supabase.from("email_password_reset_otps").insert({
      email: normalizedEmail,
      code_hash: codeHash,
      expires_at: expiresAt,
    });
    if (insertErr) throw insertErr;

    // Send via Resend
    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY not configured");

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background: #ffffff; color: #111;">
        <div style="text-align: center; margin-bottom: 24px;">
          <h1 style="color: #C8102E; margin: 0; font-size: 24px;">المصرية لقطع الغيار</h1>
        </div>
        <h2 style="color: #0a1f44; font-size: 20px;">كود استعادة كلمة المرور</h2>
        <p style="font-size: 15px; line-height: 1.7;">استخدم الكود التالي لإعادة تعيين كلمة المرور:</p>
        <div style="background: #f5f5f5; border: 2px dashed #C8102E; padding: 20px; text-align: center; margin: 24px 0; border-radius: 8px;">
          <span style="font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #0a1f44; font-family: monospace;">${code}</span>
        </div>
        <p style="font-size: 14px; color: #666;">الكود صالح لمدة <strong>10 دقائق</strong>.</p>
        <p style="font-size: 13px; color: #999; margin-top: 30px;">لو مش انت اللي طلب ده، تجاهل الإيميل ده.</p>
        <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
        <p style="font-size: 12px; color: #aaa; text-align: center;">المصرية لقطع الغيار © ${new Date().getFullYear()}</p>
      </div>
    `;

    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Al Masria Auto Parts <noreply@almasriaautoparts.com>",
        to: [normalizedEmail],
        subject: `كود استعادة كلمة المرور: ${code}`,
        html,
      }),
    });

    if (!resendResp.ok) {
      const errText = await resendResp.text();
      console.error("Resend error:", errText);
      throw new Error("فشل إرسال الإيميل. تأكد إن الإيميل صحيح.");
    }

    return new Response(JSON.stringify({ success: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err: any) {
    console.error("send-email-otp error:", err);
    return new Response(JSON.stringify({ error: err.message || "حدث خطأ" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
