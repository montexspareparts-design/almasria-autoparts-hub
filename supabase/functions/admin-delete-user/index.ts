import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
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
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const token = authHeader.replace("Bearer ", "");
    const { data: claims, error: claimsError } =
      await userClient.auth.getClaims(token);
    if (claimsError || !claims?.claims?.sub) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const callerId = claims.claims.sub;
    const adminClient = createClient(supabaseUrl, serviceKey);

    const { data: roleRow } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", callerId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden: admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const userIds: string[] = Array.isArray(body?.user_ids)
      ? body.user_ids
      : body?.user_id
      ? [body.user_id]
      : [];

    if (userIds.length === 0) {
      return new Response(
        JSON.stringify({ error: "user_ids is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const results: Array<{ user_id: string; success: boolean; error?: string }> =
      [];

    for (const uid of userIds) {
      try {
        // Cleanup public tables first (FKs / leftover rows)
        await adminClient.from("user_roles").delete().eq("user_id", uid);
        await adminClient.from("profiles").delete().eq("user_id", uid);
        await adminClient.from("dealer_accounts").delete().eq("user_id", uid);
        await adminClient.from("notifications").delete().eq("user_id", uid);

        const { error: delErr } = await adminClient.auth.admin.deleteUser(uid);
        if (delErr) {
          results.push({ user_id: uid, success: false, error: delErr.message });
        } else {
          results.push({ user_id: uid, success: true });

          // Audit log
          await adminClient.from("audit_logs").insert({
            performed_by: callerId,
            action: "delete_auth_user",
            table_name: "auth.users",
            record_id: uid,
            old_data: { user_id: uid },
          });
        }
      } catch (e) {
        results.push({
          user_id: uid,
          success: false,
          error: e instanceof Error ? e.message : String(e),
        });
      }
    }

    return new Response(JSON.stringify({ results }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : String(e) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
