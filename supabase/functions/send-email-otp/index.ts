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
    const logoUrl = "https://almasriaautoparts.com/__l5e/assets-v1/818523be-f1b8-471a-ba23-138267801d70/almasria-logo.png";
    const html = `
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>رمز التحقق — المصرية لقطع الغيار</title>
</head>
<body style="margin:0;padding:0;background-color:#ecedf0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Tahoma,Arial,sans-serif;">
  <!-- Preheader (hidden) -->
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">
    رمز التحقق الخاص بك: ${code} — صالح لمدة 10 دقائق فقط.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ecedf0;padding:40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#ffffff;border-radius:4px;overflow:hidden;box-shadow:0 4px 24px rgba(10,10,10,0.08);">

          <!-- Top accent bar (luxury red → gold) -->
          <tr>
            <td style="height:3px;background:linear-gradient(90deg,#0a0a0a 0%,#eb1e32 50%,#c9a84c 100%);font-size:0;line-height:0;">&nbsp;</td>
          </tr>

          <!-- Header: carbon black -->
          <tr>
            <td style="background-color:#0a0a0a;padding:36px 32px 32px;text-align:center;">
              <img src="${logoUrl}" alt="Al Masria Auto Parts" width="160" style="display:block;margin:0 auto 18px;width:160px;height:auto;border:0;outline:none;text-decoration:none;" />
              <div style="height:1px;width:48px;background:#c9a84c;margin:0 auto 14px;font-size:0;line-height:0;">&nbsp;</div>
              <p style="margin:0;color:#c9a84c;font-size:11px;letter-spacing:4px;text-transform:uppercase;font-family:Arial,sans-serif;font-weight:600;">
                Toyota Genuine Parts · Since 1995
              </p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:44px 44px 16px;color:#0a0a0a;" dir="rtl">
              <h2 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#0a0a0a;letter-spacing:-0.2px;">
                طلب إعادة تعيين كلمة المرور
              </h2>
              <p style="margin:0 0 28px;font-size:13px;color:#6b7280;letter-spacing:0.3px;">
                PASSWORD RESET REQUEST
              </p>

              <p style="margin:0 0 14px;font-size:15px;line-height:1.8;color:#1f2937;">
                السيد/ة العميل،
              </p>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.8;color:#374151;">
                تلقّينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابكم لدى <strong style="color:#0a0a0a;">المصرية لقطع الغيار</strong>. يُرجى استخدام رمز التحقق التالي لإتمام العملية:
              </p>

              <!-- OTP Code Box -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;">
                <tr>
                  <td align="center" style="background:#0a0a0a;border-radius:2px;padding:30px 24px;position:relative;">
                    <div style="font-size:10px;color:#c9a84c;margin-bottom:14px;letter-spacing:5px;text-transform:uppercase;font-family:Arial,sans-serif;font-weight:700;">
                      Verification Code
                    </div>
                    <div style="font-size:40px;font-weight:700;letter-spacing:14px;color:#ffffff;font-family:'Courier New','Consolas',monospace;line-height:1;">
                      ${code}
                    </div>
                    <div style="height:1px;width:36px;background:#eb1e32;margin:16px auto 0;font-size:0;line-height:0;">&nbsp;</div>
                  </td>
                </tr>
              </table>

              <!-- Validity notice -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 24px;border-right:3px solid #eb1e32;background:#fafafa;">
                <tr>
                  <td style="padding:14px 18px;" dir="rtl">
                    <p style="margin:0;font-size:14px;line-height:1.7;color:#374151;">
                      صلاحية الرمز: <strong style="color:#0a0a0a;">10 دقائق</strong> من وقت استلام هذه الرسالة.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 28px;font-size:13px;line-height:1.7;color:#6b7280;">
                إذا لم تكن أنت من قام بهذا الطلب، يُرجى تجاهل هذه الرسالة. لن يحدث أي تغيير على حسابك ما لم يُستخدم الرمز أعلاه.
              </p>

              <p style="margin:28px 0 0;font-size:14px;line-height:1.7;color:#1f2937;">
                مع خالص التقدير،<br/>
                <strong style="color:#0a0a0a;">إدارة خدمة العملاء</strong><br/>
                <span style="color:#6b7280;font-size:13px;">المصرية لقطع الغيار</span>
              </p>
            </td>
          </tr>

          <!-- Gold divider -->
          <tr>
            <td style="padding:8px 44px 0;">
              <div style="height:1px;background:linear-gradient(90deg,transparent 0%,#c9a84c 50%,transparent 100%);font-size:0;line-height:0;">&nbsp;</div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 44px 32px;text-align:center;background:#fafafa;" dir="rtl">
              <p style="margin:0 0 10px;font-size:11px;color:#9ca3af;letter-spacing:3px;text-transform:uppercase;font-family:Arial,sans-serif;font-weight:600;">
                Al Masria Auto Parts
              </p>
              <p style="margin:0 0 14px;font-size:12px;color:#6b7280;line-height:1.7;">
                موزع معتمد لقطع غيار تويوتا الأصلية في جمهورية مصر العربية
              </p>
              <p style="margin:0 0 6px;font-size:11px;color:#9ca3af;line-height:1.6;">
                هذه رسالة آلية، يُرجى عدم الرد عليها.
              </p>
              <p style="margin:0;font-size:11px;color:#9ca3af;">
                © ${year} Al Masria Auto Parts · جميع الحقوق محفوظة
              </p>
              <p style="margin:10px 0 0;font-size:11px;">
                <a href="https://almasriaautoparts.com" style="color:#0a0a0a;text-decoration:none;font-weight:600;letter-spacing:0.5px;">almasriaautoparts.com</a>
              </p>
            </td>
          </tr>

          <!-- Bottom accent bar -->
          <tr>
            <td style="height:3px;background:linear-gradient(90deg,#c9a84c 0%,#eb1e32 50%,#0a0a0a 100%);font-size:0;line-height:0;">&nbsp;</td>
          </tr>

        </table>

        <!-- Outside footer -->
        <p style="margin:18px 0 0;font-size:10px;color:#9ca3af;letter-spacing:2px;text-transform:uppercase;font-family:Arial,sans-serif;">
          Crafted with precision · Cairo, Egypt
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`;

    const text = `AL MASRIA AUTO PARTS
المصرية لقطع الغيار — موزع تويوتا المعتمد

طلب إعادة تعيين كلمة المرور
─────────────────────────────

رمز التحقق الخاص بك:  ${code}

صلاحية الرمز: 10 دقائق فقط.
إذا لم تكن أنت من قام بهذا الطلب، يُرجى تجاهل هذه الرسالة.

مع خالص التقدير،
إدارة خدمة العملاء — المصرية لقطع الغيار

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
