import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify the caller using getClaims
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);
    if (claimsError || !claimsData?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claimsData.claims.sub as string;

    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    // Allow both admins and moderators (staff) to create/manage client accounts
    const { data: isStaff } = await adminClient.rpc("is_staff", {
      _user_id: callerId,
    });
    if (!isStaff) {
      return new Response(JSON.stringify({ error: "Forbidden — صلاحية غير كافية" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    // Handle password reset action
    if (body.action === "reset_password") {
      const { email, new_password, erp_customer_code: erpCode } = body;
      if (!email || !new_password) {
        return new Response(JSON.stringify({ error: "Missing fields" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Find user — try ERP code FIRST (most reliable for converted leads)
      let targetUser: any = null;

      if (erpCode) {
        const { data: dealerAcc } = await adminClient
          .from("dealer_accounts")
          .select("user_id")
          .eq("erp_customer_code", erpCode)
          .maybeSingle();
        if (dealerAcc?.user_id) {
          const { data: userData } = await adminClient.auth.admin.getUserById(dealerAcc.user_id);
          if (userData?.user) targetUser = userData.user;
        }
      }

      // Fallback: search by email through paginated listUsers
      if (!targetUser && email) {
        let page = 1;
        const perPage = 200;
        for (let i = 0; i < 20 && !targetUser; i++) {
          const { data: usersPage, error: listErr } = await adminClient.auth.admin.listUsers({ page, perPage });
          if (listErr || !usersPage?.users?.length) break;
          targetUser = usersPage.users.find((u: any) => u.email === email);
          if (usersPage.users.length < perPage) break;
          page++;
        }
      }

      // Final fallback: search profiles by phone (extracted from email)
      if (!targetUser && email) {
        const phoneFromEmail = email.split("@")[0];
        const { data: profile } = await adminClient
          .from("profiles")
          .select("user_id")
          .eq("phone", phoneFromEmail)
          .maybeSingle();
        if (profile?.user_id) {
          const { data: userData } = await adminClient.auth.admin.getUserById(profile.user_id);
          if (userData?.user) targetUser = userData.user;
        }
      }

      if (!targetUser) {
        return new Response(JSON.stringify({ error: "المستخدم غير موجود — تأكد أن الحساب مرتبط بكود الفيصل" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update password
      const { error: updateErr } = await adminClient.auth.admin.updateUserById(targetUser.id, { password: new_password });
      if (updateErr) {
        return new Response(JSON.stringify({ error: updateErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      // Update stored password in dealer_passwords table
      if (erpCode) {
        const { data: dealerAcc2 } = await adminClient
          .from("dealer_accounts")
          .select("id")
          .eq("erp_customer_code", erpCode)
          .maybeSingle();
        if (dealerAcc2) {
          await adminClient.from("dealer_passwords").upsert(
            { dealer_account_id: dealerAcc2.id, initial_password: new_password },
            { onConflict: "dealer_account_id" }
          );
        }
      }
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { name, phone, shop_name, erp_customer_code, client_type, lead_id } = body;

    if (!name || !phone || !erp_customer_code) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate password (8 chars)
    const password = Array.from(crypto.getRandomValues(new Uint8Array(6)))
      .map(b => b.toString(36).padStart(2, "0"))
      .join("")
      .slice(0, 8);

    // Create email from phone
    const cleanPhone = phone.replace(/\D/g, "");
    const email = `${cleanPhone}@phone.almasria.local`;

    // Check if user already exists via dealer_accounts first, then auth
    const { data: existingDealer } = await adminClient
      .from("dealer_accounts")
      .select("user_id")
      .eq("erp_customer_code", erp_customer_code)
      .maybeSingle();

    if (existingDealer) {
      return new Response(JSON.stringify({ error: "هذا العميل مسجل بالفعل في النظام" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Also check auth by email
    let existingUser = null;
    let pg = 1;
    while (!existingUser) {
      const { data: usersPage } = await adminClient.auth.admin.listUsers({ page: pg, perPage: 100 });
      if (!usersPage?.users?.length) break;
      existingUser = usersPage.users.find((u: any) => u.email === email);
      if (usersPage.users.length < 100) break;
      pg++;
    }

    if (existingUser) {
      return new Response(JSON.stringify({ error: "هذا الرقم مسجل بالفعل في النظام" }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create user
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: name },
    });

    if (createError || !newUser?.user) {
      console.error("Create user error:", createError);
      return new Response(JSON.stringify({ error: createError?.message || "Failed to create user" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = newUser.user.id;

    // Update profile with phone
    await adminClient
      .from("profiles")
      .update({ phone: cleanPhone, full_name: name })
      .eq("user_id", userId);

    // Determine tier based on client_type
    // retail + corporate → retail pricing
    // wholesale + workshop → wholesale_tier1 pricing
    const wholesaleTypes = new Set(["wholesale", "workshop"]);
    const tier = wholesaleTypes.has(client_type) ? "wholesale_tier1" : "retail";

    // Normalize business_type — only allow the 4 known categories
    const allowedBusinessTypes = new Set(["retail", "corporate", "wholesale", "workshop"]);
    const business_type = allowedBusinessTypes.has(client_type) ? client_type : "retail";

    // Create dealer account linked to ERP
    const { data: newDealer } = await adminClient.from("dealer_accounts").insert({
      user_id: userId,
      erp_customer_code: erp_customer_code,
      erp_customer_name: shop_name || name,
      tier,
      business_type,
      is_active: true,
    } as any).select("id").single();

    // Store initial password in separate secure table
    if (newDealer) {
      await adminClient.from("dealer_passwords").insert({
        dealer_account_id: newDealer.id,
        initial_password: password,
      });
    }

    // Update lead status if lead_id provided
    if (lead_id) {
      await adminClient
        .from("leads")
        .update({ status: "converted" })
        .eq("id", lead_id);
    }

    // Send WhatsApp welcome message with credentials
    try {
      const waRes = await fetch(`${supabaseUrl}/functions/v1/notify-dealer-welcome`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${serviceRoleKey}`,
          "apikey": serviceRoleKey,
        },
        body: JSON.stringify({
          phone: cleanPhone,
          name: name,
          username: phone,
          password: password,
          lead_id: lead_id || null,
        }),
      });
      const waText = await waRes.text();
      console.log("notify-dealer-welcome response:", waRes.status, waText);
    } catch (e) {
      console.error("Welcome WhatsApp failed (non-blocking):", e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        username: phone,
        password,
        user_id: userId,
        tier,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
