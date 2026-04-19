// Public edge function — creates a retail customer account from the chatbot.
// Validates email + phone are required and unique (no duplicates across system).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

// Normalize Egyptian phone → 11-digit local form (01XXXXXXXXX)
function normalizePhone(raw: string): string | null {
  if (!raw) return null;
  let d = String(raw)
    .replace(/[٠-٩]/g, (x) => String("٠١٢٣٤٥٦٧٨٩".indexOf(x)))
    .replace(/[۰-۹]/g, (x) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(x)))
    .replace(/\D/g, "");
  if (d.startsWith("0020")) d = d.slice(4);
  else if (d.startsWith("20")) d = d.slice(2);
  if (d.length === 10 && d.startsWith("1")) d = "0" + d;
  if (!/^01[0125]\d{8}$/.test(d)) return null;
  return d;
}

function isValidEmail(e: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 254;
}

function genPassword(): string {
  // 8 chars: letters + digits
  const chars = "abcdefghjkmnpqrstuvwxyz23456789";
  const buf = crypto.getRandomValues(new Uint8Array(8));
  let out = "";
  for (let i = 0; i < 8; i++) out += chars[buf[i] % chars.length];
  return out;
}

async function findUserByEmail(admin: any, email: string) {
  let page = 1;
  const perPage = 200;
  while (true) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error || !data?.users?.length) return null;
    const found = data.users.find((u: any) => (u.email || "").toLowerCase() === email.toLowerCase());
    if (found) return found;
    if (data.users.length < perPage) return null;
    page++;
    if (page > 50) return null; // safety cap
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json().catch(() => ({}));
    const rawName = String(body?.name || "").trim();
    const rawEmail = String(body?.email || "").trim().toLowerCase();
    const rawPhone = String(body?.phone || "").trim();

    if (!rawName || rawName.length < 2 || rawName.length > 80) {
      return json({ error: "الاسم مطلوب (من 2 إلى 80 حرف)", field: "name" }, 400);
    }
    if (!rawEmail || !isValidEmail(rawEmail)) {
      return json({ error: "الإيميل غير صحيح", field: "email" }, 400);
    }
    const phone = normalizePhone(rawPhone);
    if (!phone) {
      return json({ error: "رقم الموبايل غير صحيح (يجب أن يكون رقم مصري 11 رقم يبدأ بـ 01)", field: "phone" }, 400);
    }

    // Rate-limit by IP (max 5 / hour)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { data: rlOk } = await admin.rpc("check_rate_limit", {
      _identifier: `chatbot_signup:${ip}`,
      _action: "chatbot_create_account",
      _max_requests: 5,
      _window_seconds: 3600,
    });
    if (rlOk === false) {
      return json({ error: "تم تجاوز عدد المحاولات المسموح بها، حاول لاحقاً" }, 429);
    }

    // Uniqueness check #1 — phone in profiles
    const { data: phoneInProfiles, error: phErr } = await admin
      .from("profiles")
      .select("user_id")
      .eq("phone", phone)
      .maybeSingle();
    if (phErr) {
      console.error("profiles phone lookup error:", phErr);
    }
    if (phoneInProfiles) {
      return json({ error: "رقم الموبايل ده مسجل بالفعل لعميل آخر. لو نسيت كلمة السر اضغط استعادة كلمة السر.", field: "phone" }, 409);
    }

    // Uniqueness check #2 — email in profiles
    const { data: emailInProfiles } = await admin
      .from("profiles")
      .select("user_id")
      .eq("email", rawEmail)
      .maybeSingle();
    if (emailInProfiles) {
      return json({ error: "الإيميل ده مسجل بالفعل لعميل آخر.", field: "email" }, 409);
    }

    // Uniqueness check #3 — auth.users by email (real email + phone-derived alias)
    const phoneEmailAlias = `${phone}@phone.almasria.local`;
    const existingByEmail = await findUserByEmail(admin, rawEmail);
    if (existingByEmail) {
      return json({ error: "الإيميل ده مسجل بالفعل لعميل آخر.", field: "email" }, 409);
    }
    const existingByPhoneAlias = await findUserByEmail(admin, phoneEmailAlias);
    if (existingByPhoneAlias) {
      return json({ error: "رقم الموبايل ده مسجل بالفعل لعميل آخر.", field: "phone" }, 409);
    }

    // Create the auth user with the real email
    const password = genPassword();
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email: rawEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: rawName, phone },
    });
    if (createErr || !created?.user) {
      console.error("createUser error:", createErr);
      return json({ error: createErr?.message || "تعذر إنشاء الحساب" }, 500);
    }

    const userId = created.user.id;

    // Ensure profile has the phone + full_name (handle_new_user trigger creates the row already)
    await admin
      .from("profiles")
      .update({ phone, full_name: rawName, email: rawEmail })
      .eq("user_id", userId);

    // Notify admins/moderators about the new chatbot signup
    try {
      const { data: staff } = await admin
        .from("user_roles")
        .select("user_id")
        .in("role", ["admin", "moderator"]);
      if (staff?.length) {
        const rows = staff.map((s: any) => ({
          user_id: s.user_id,
          title: "🆕 حساب جديد من الشات بوت",
          message: `العميل "${rawName}" (${phone} — ${rawEmail}) أنشأ حساب جديد عبر المساعد الذكي.`,
          type: "new_signup",
        }));
        await admin.from("notifications").insert(rows);
      }
    } catch (e) {
      console.error("notify staff failed (non-blocking):", e);
    }

    return json({
      success: true,
      user_id: userId,
      email: rawEmail,
      phone,
      password,
      name: rawName,
    });
  } catch (e) {
    console.error("chatbot-create-account fatal:", e);
    return json({ error: "خطأ غير متوقع" }, 500);
  }
});
