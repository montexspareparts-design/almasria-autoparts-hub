import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

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
      _user_id: userData.user.id, _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { email, newPassword } = await req.json();
    if (!email || !newPassword || String(newPassword).length < 6) {
      return new Response(JSON.stringify({ error: "البريد وكلمة مرور 6 حروف على الأقل مطلوبان" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    // Find user
    let targetUser: any = null;
    let pg = 1;
    while (!targetUser) {
      const { data: usersPage } = await adminClient.auth.admin.listUsers({ page: pg, perPage: 100 });
      if (!usersPage?.users?.length) break;
      targetUser = usersPage.users.find((u: any) => u.email === cleanEmail);
      if (usersPage.users.length < 100) break;
      pg++;
    }

    if (!targetUser) {
      return new Response(JSON.stringify({ error: "المستخدم غير موجود" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: updErr } = await adminClient.auth.admin.updateUserById(targetUser.id, {
      password: String(newPassword),
    });

    if (updErr) {
      return new Response(JSON.stringify({ error: updErr.message }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Save new password to staff_passwords for admin retrieval
    await adminClient.from("staff_passwords").insert({
      staff_user_id: targetUser.id,
      initial_password: String(newPassword),
      created_by: userData.user.id,
    });

    return new Response(JSON.stringify({ success: true, email: cleanEmail }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
