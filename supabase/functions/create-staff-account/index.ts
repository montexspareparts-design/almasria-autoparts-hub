import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

async function sendWhatsApp(phone: string, message: string) {
  const accessToken = Deno.env.get("META_WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("META_WHATSAPP_PHONE_NUMBER_ID");
  if (!accessToken || !phoneNumberId) return { ok: false, reason: "no_credentials" };

  let formatted = phone.replace(/[\s\-\(\)]/g, "");
  if (formatted.startsWith("+")) formatted = formatted.slice(1);
  if (formatted.startsWith("0")) formatted = "2" + formatted;
  if (/^\d{10}$/.test(formatted)) formatted = "2" + formatted;

  try {
    const resp = await fetch(
      `https://crm.whats-meta.com/api/meta/v19.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: formatted,
          type: "text",
          text: { body: message },
        }),
      }
    );
    const data = await resp.json();
    console.log(resp.ok ? `WhatsApp sent to ${formatted}` : `WhatsApp failed: ${JSON.stringify(data)}`);
    return { ok: resp.ok };
  } catch (e) {
    console.error("WhatsApp error:", e);
    return { ok: false };
  }
}

async function sendEmail(to: string, subject: string, html: string) {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  if (!resendApiKey) return { ok: false, reason: "no_resend" };
  try {
    const resp = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "المصرية جروب <noreply@almasriaautoparts.com>",
        to: [to],
        subject,
        html,
      }),
    });
    return { ok: resp.ok };
  } catch (e) {
    console.error("Email error:", e);
    return { ok: false };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    // Auth check — admin only
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: authErr } = await adminClient.auth.getUser(token);
    if (authErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { data: isAdmin } = await adminClient.rpc("has_role", {
      _user_id: userData.user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { fullName, email, phone, password: customPassword, role: requestedRole } = await req.json();
    if (!fullName || !email) {
      return new Response(JSON.stringify({ error: "الاسم والبريد الإلكتروني مطلوبان" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // role can be "moderator" (default) or "reporter" (Al-Faisal staff — daily report only)
    const targetRole: "moderator" | "reporter" =
      requestedRole === "reporter" ? "reporter" : "moderator";

    const cleanEmail = String(email).trim().toLowerCase();

    // Check if email already exists
    let existingUser: any = null;
    let pg = 1;
    while (!existingUser) {
      const { data: usersPage } = await adminClient.auth.admin.listUsers({ page: pg, perPage: 100 });
      if (!usersPage?.users?.length) break;
      existingUser = usersPage.users.find((u: any) => u.email === cleanEmail);
      if (usersPage.users.length < 100) break;
      pg++;
    }

    let userId: string;
    let tempPassword: string;
    let isNewUser = false;

    if (existingUser) {
      // Existing user — just promote to moderator (don't reset password)
      userId = existingUser.id;
      tempPassword = "(كلمة المرور الحالية للمستخدم — لم تتغير)";
    } else {
      // Use custom password from admin or generate random one
      if (customPassword && String(customPassword).length >= 6) {
        tempPassword = String(customPassword);
      } else {
        tempPassword = Array.from(crypto.getRandomValues(new Uint8Array(8)))
          .map(b => b.toString(36).padStart(2, "0"))
          .join("")
          .slice(0, 10);
      }

      const { data: newUser, error: createErr } = await adminClient.auth.admin.createUser({
        email: cleanEmail,
        password: tempPassword,
        email_confirm: true,
        user_metadata: { full_name: fullName },
      });

      if (createErr || !newUser?.user) {
        console.error("Create user error:", createErr);
        return new Response(JSON.stringify({ error: createErr?.message || "فشل إنشاء الحساب" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      userId = newUser.user.id;
      isNewUser = true;

      // Update profile with phone if provided
      if (phone) {
        await adminClient.from("profiles").update({ phone, full_name: fullName }).eq("user_id", userId);
      }
    }

    // Check if already a staff member with any of admin/moderator/reporter
    const { data: existingRoles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .in("role", ["admin", "moderator", "reporter"]);

    const existingRoleSet = new Set((existingRoles ?? []).map((r: any) => r.role));

    if (existingRoleSet.has("admin")) {
      return new Response(JSON.stringify({ error: "هذا المستخدم أدمن بالفعل" }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (existingRoleSet.has(targetRole)) {
      return new Response(JSON.stringify({ error: `هذا المستخدم لديه دور ${targetRole} بالفعل` }), {
        status: 409, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: roleErr } = await adminClient
      .from("user_roles")
      .insert({ user_id: userId, role: targetRole });
    if (roleErr) {
      console.error("Role insert error:", roleErr);
      return new Response(JSON.stringify({ error: "فشل منح الصلاحية: " + roleErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save password to staff_passwords for admin retrieval (only for new users)
    if (isNewUser) {
      await adminClient.from("staff_passwords").insert({
        staff_user_id: userId,
        initial_password: tempPassword,
        created_by: userData.user.id,
      });
    }

    // Send notifications (only for new users with a fresh password)
    // Reporter accounts log in via /auth (regular email login) — they're routed
    // to /admin/daily-report automatically by AuthContext.
    const loginUrl = targetRole === "reporter"
      ? "https://www.almasriaautoparts.com/auth"
      : "https://www.almasriaautoparts.com/dealer-login";
    const roleLabel = targetRole === "reporter" ? "موظف تقارير الفيصل" : "موظف";
    let whatsappSent = false;
    let emailSent = false;

    let whatsappReason = "";
    let emailReason = "";

    if (isNewUser) {
      const reporterNote = targetRole === "reporter"
        ? `\n\n📋 ملاحظة: حسابك مخصص لرفع التقرير اليومي فقط — هتدخل على صفحة التقرير مباشرة بعد تسجيل الدخول.`
        : "";
      const waMsg = `🎉 أهلاً ${fullName}!\n\nتم إنشاء حساب ${roleLabel} لك في المصرية جروب ✅\n\n🔐 بيانات الدخول:\nالبريد: ${cleanEmail}\nكلمة السر المؤقتة: ${tempPassword}\n\n🔗 رابط الدخول:\n${loginUrl}${reporterNote}\n\n⚠️ يرجى تغيير كلمة السر بعد أول تسجيل دخول.\n\nالمصرية جروب 🚗`;

      console.log(`[create-staff] Sending notifications for new user: ${cleanEmail}, phone: ${phone || "(none)"}`);

      if (phone && String(phone).trim().length > 0) {
        const waResult = await sendWhatsApp(phone, waMsg);
        whatsappSent = waResult.ok;
        whatsappReason = waResult.ok ? "sent" : (waResult.reason || "send_failed");
        console.log(`[create-staff] WhatsApp result: ${whatsappReason}`);
      } else {
        whatsappReason = "no_phone_provided";
        console.log("[create-staff] WhatsApp skipped: no phone provided");
      }

      const emailHtml = `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: #1a1a2e; padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
            <h1 style="color: #e94560; margin: 0;">المصرية جروب</h1>
          </div>
          <div style="background: #ffffff; padding: 30px; border: 1px solid #eee; border-radius: 0 0 8px 8px;">
            <h2 style="color: #16a34a;">مرحباً ${fullName} 🎉</h2>
            <p style="color: #333; line-height: 1.8;">تم إنشاء حساب موظف لك في نظام المصرية جروب.</p>
            <div style="background: #f5f5f5; padding: 16px; border-radius: 8px; margin: 16px 0;">
              <p style="margin: 4px 0;"><strong>البريد:</strong> ${cleanEmail}</p>
              <p style="margin: 4px 0;"><strong>كلمة السر المؤقتة:</strong> <code style="background:#fff;padding:4px 8px;border-radius:4px;">${tempPassword}</code></p>
            </div>
            <a href="${loginUrl}" style="display: inline-block; background: #e94560; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 16px;">تسجيل الدخول</a>
            <p style="color: #999; font-size: 12px; margin-top: 24px;">⚠️ يرجى تغيير كلمة السر بعد أول تسجيل دخول.</p>
          </div>
        </div>
      `;
      const emailResult = await sendEmail(cleanEmail, "مرحباً بك كموظف في المصرية جروب", emailHtml);
      emailSent = emailResult.ok;
      emailReason = emailResult.ok ? "sent" : (emailResult.reason || "send_failed");
      console.log(`[create-staff] Email result: ${emailReason}`);
    }

    return new Response(JSON.stringify({
      success: true,
      isNewUser,
      userId,
      email: cleanEmail,
      role: targetRole,
      tempPassword: isNewUser ? tempPassword : null,
      whatsappSent,
      whatsappReason,
      emailSent,
      emailReason,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
