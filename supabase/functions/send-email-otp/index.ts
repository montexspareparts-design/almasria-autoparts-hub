import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function findUserByEmail(
  supabase: ReturnType<typeof createClient>,
  normalizedEmail: string,
) {
  let page = 1;
  const perPage = 1000;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const users = data.users ?? [];
    const foundUser = users.find((candidate) => candidate.email?.trim().toLowerCase() === normalizedEmail);
    if (foundUser) return foundUser;
    if (users.length < perPage) return null;

    page += 1;
  }
}

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

    const user = await findUserByEmail(supabase, normalizedEmail);
    if (!user) {
      console.warn("send-email-otp: email not found in auth.users", normalizedEmail);
      return new Response(JSON.stringify({ success: false, error: "الإيميل ده مش مسجل عندنا" }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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

    const year = new Date().getFullYear();
    const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Password Reset Code</title>
</head>
<body style="margin:0;padding:0;background-color:#f4f6f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Tahoma,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#f4f6f9;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);border:1px solid #e6e9ee;">

          <!-- Header -->
          <tr>
            <td style="background:#0a1f44;padding:28px 32px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:20px;font-weight:600;letter-spacing:0.3px;font-family:Arial,sans-serif;">
                Al Masria Auto Parts
              </h1>
              <p style="margin:6px 0 0;color:#c9d2e3;font-size:13px;font-family:Arial,sans-serif;">
                المصرية لقطع الغيار
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:40px 40px 24px;color:#1f2937;" dir="rtl">
              <h2 style="margin:0 0 16px;font-size:18px;font-weight:600;color:#0a1f44;">
                طلب إعادة تعيين كلمة المرور
              </h2>
              <p style="margin:0 0 8px;font-size:15px;line-height:1.7;color:#374151;">
                مرحباً،
              </p>
              <p style="margin:0 0 24px;font-size:15px;line-height:1.7;color:#374151;">
                تلقّينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك. يُرجى استخدام رمز التحقق التالي لإكمال العملية:
              </p>

              <!-- OTP Code -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;">
                <tr>
                  <td align="center" style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:24px;">
                    <div style="font-size:13px;color:#64748b;margin-bottom:10px;letter-spacing:1px;text-transform:uppercase;font-family:Arial,sans-serif;">
                      Verification Code
                    </div>
                    <div style="font-size:34px;font-weight:700;letter-spacing:10px;color:#0a1f44;font-family:'Courier New',monospace;">
                      ${code}
                    </div>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;font-size:14px;line-height:1.7;color:#374151;">
                هذا الرمز صالح لمدة <strong style="color:#0a1f44;">10 دقائق</strong> فقط.
              </p>
              <p style="margin:0 0 24px;font-size:14px;line-height:1.7;color:#6b7280;">
                إذا لم تكن أنت من قام بهذا الطلب، يمكنك تجاهل هذه الرسالة بأمان ولن يحدث أي تغيير على حسابك.
              </p>

              <p style="margin:24px 0 0;font-size:14px;line-height:1.7;color:#374151;">
                مع خالص التحية،<br/>
                <strong style="color:#0a1f44;">فريق المصرية لقطع الغيار</strong>
              </p>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding:0 40px;">
              <div style="border-top:1px solid #e6e9ee;"></div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px 28px;text-align:center;" dir="rtl">
              <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;line-height:1.6;">
                هذه رسالة آلية، يُرجى عدم الرد عليها.
              </p>
              <p style="margin:0;font-size:12px;color:#9ca3af;">
                © ${year} Al Masria Auto Parts. جميع الحقوق محفوظة.
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#b8bfc9;">
                <a href="https://almasriaautoparts.com" style="color:#0a1f44;text-decoration:none;">almasriaautoparts.com</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const text = `Al Masria Auto Parts — المصرية لقطع الغيار

طلب إعادة تعيين كلمة المرور

رمز التحقق الخاص بك: ${code}

هذا الرمز صالح لمدة 10 دقائق.
إذا لم تكن أنت من قام بهذا الطلب، يُرجى تجاهل هذه الرسالة.

© ${year} Al Masria Auto Parts
https://almasriaautoparts.com`;

    const resendResp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { "Authorization": `Bearer ${resendKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "Al Masria Auto Parts <noreply@almasriaautoparts.com>",
        to: [normalizedEmail],
        subject: `رمز التحقق: ${code} — Al Masria Auto Parts`,
        html,
        text,
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
