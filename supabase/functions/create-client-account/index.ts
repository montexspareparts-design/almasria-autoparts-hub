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
    const { data: isAdmin } = await adminClient.rpc("has_role", {
      _user_id: callerId,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
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
      // Find user by email
      const { data: users } = await adminClient.auth.admin.listUsers();
      const targetUser = users?.users?.find(u => u.email === email);
      if (!targetUser) {
        return new Response(JSON.stringify({ error: "المستخدم غير موجود" }), {
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
      // Update stored password
      if (erpCode) {
        await adminClient.from("dealer_accounts").update({ initial_password: new_password }).eq("erp_customer_code", erpCode);
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

    // Check if user already exists
    const { data: existingUsers } = await adminClient.auth.admin.listUsers();
    const existingUser = existingUsers?.users?.find(u => u.email === email);

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
    const tier = client_type === "wholesale" ? "wholesale_tier2" : "retail";

    // Create dealer account linked to ERP (store initial password for admin retrieval)
    await adminClient.from("dealer_accounts").insert({
      user_id: userId,
      erp_customer_code: erp_customer_code,
      erp_customer_name: shop_name || name,
      tier,
      is_active: true,
      initial_password: password,
    });

    // Update lead status if lead_id provided
    if (lead_id) {
      await adminClient
        .from("leads")
        .update({ status: "converted" })
        .eq("id", lead_id);
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
