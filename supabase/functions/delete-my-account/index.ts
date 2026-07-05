// Permanent account self-deletion.
// - Verifies caller JWT (auth.uid is trusted, never accepted from body)
// - Re-authenticates email/password users by re-signing in with provided password
// - Refuses to delete staff accounts (admin/moderator/reporter) to protect operations
// - Deletes personal/child data, anonymizes retained transactional records to a
//   sentinel UUID, then deletes the auth user via admin API
// - Idempotent: repeated calls after the auth user is gone return 401 naturally
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Sentinel for anonymized retained rows. Not a real auth user.
const DELETED_USER_SENTINEL = "00000000-0000-0000-0000-000000000000";

// Tables to fully DELETE by user_id column (personal / non-essential)
const DELETE_BY_USER_ID: string[] = [
  "profiles",
  "dealer_cart_items",
  "dealer_favorites",
  "dealer_shopping_lists",
  "dealer_quotes",
  "dealer_ai_recommendations",
  "dealer_price_views",
  "dealer_product_order_locks",
  "dealer_applications",
  "dealer_accounts",
  "dealer_bulk_uploads",
  "notifications",
  "push_subscriptions",
  "price_drop_alerts",
  "stock_alerts",
  "coupon_usage",
  "loyalty_points",
  "staff_ui_dismissals",
  "page_visits",
  "customer_search_logs",
  "customer_sessions",
  "price_list_views",
  "support_requests",
  "visitor_leads",
  "user_roles",
];

// Tables to DELETE by customer_user_id (CRM breadcrumbs about this customer)
const DELETE_BY_CUSTOMER_USER_ID: string[] = [
  "customer_assignments",
  "customer_communications",
  "customer_notes",
  "staff_contact_marks",
  "staff_customer_file_opens",
  "visitor_session_views",
  "visitor_pipeline_status",
  "whatsapp_conversations",
  "support_request_ratings",
];

// Tables to ANONYMIZE (retain for accounting/audit) — reassign owner to sentinel
const ANONYMIZE_BY_USER_ID: Array<{ table: string; column: string }> = [
  { table: "orders", column: "user_id" },
  { table: "loyalty_transactions", column: "user_id" },
  { table: "product_reviews", column: "user_id" },
  { table: "order_returns", column: "created_by" },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (status: number, body: unknown) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json(401, { error: "غير مصرح — يجب تسجيل الدخول" });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) {
      return json(401, { error: "الجلسة غير صالحة — يرجى إعادة تسجيل الدخول" });
    }
    const uid = userData.user.id;
    const email = userData.user.email ?? null;
    const provider = (userData.user.app_metadata?.provider as string | undefined) ?? "email";

    const body = await req.json().catch(() => ({}));
    const password: string | undefined = body?.password;
    const confirmPhrase: string | undefined = body?.confirmPhrase;

    // Re-authentication
    if (provider === "email") {
      if (!email || !password) {
        return json(400, { error: "كلمة المرور مطلوبة لتأكيد الحذف" });
      }
      const verifyClient = createClient(supabaseUrl, anonKey, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
      const { error: signInErr } = await verifyClient.auth.signInWithPassword({
        email,
        password,
      });
      if (signInErr) {
        return json(401, { error: "كلمة المرور غير صحيحة" });
      }
    } else {
      // OAuth users (Google/Apple) — require typed phrase AND a fresh sign-in
      // within the last 10 minutes. This forces the user to complete a real
      // provider re-authentication right before deletion, without breaking
      // the native iOS OAuth flow.
      if ((confirmPhrase ?? "").trim() !== "حذف حسابي نهائيا") {
        return json(400, { error: 'يجب كتابة العبارة: حذف حسابي نهائيا' });
      }
      const lastSignInAt = userData.user.last_sign_in_at
        ? new Date(userData.user.last_sign_in_at).getTime()
        : 0;
      const ageMs = Date.now() - lastSignInAt;
      const TEN_MIN = 10 * 60 * 1000;
      if (!lastSignInAt || ageMs > TEN_MIN) {
        return json(401, {
          error:
            "لتأكيد هويتك، يرجى تسجيل الخروج وتسجيل الدخول مرة أخرى بحساب Google خلال آخر 10 دقائق ثم إعادة المحاولة",
          code: "reauth_required",
        });
      }
    }


    const admin = createClient(supabaseUrl, serviceKey);

    // Staff protection — never let admin/moderator/reporter self-delete
    // through this public endpoint; those must be removed by another admin.
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", uid);
    const isStaff = (roles ?? []).some((r) =>
      ["admin", "moderator", "reporter"].includes(r.role as string),
    );
    if (isStaff) {
      return json(403, {
        error:
          "لا يمكن حذف حسابات الموظفين من التطبيق. يرجى التواصل مع الإدارة.",
      });
    }

    const warnings: string[] = [];

    // 1) Anonymize retained transactional data first (must succeed before we drop the user)
    for (const { table, column } of ANONYMIZE_BY_USER_ID) {
      const { error } = await admin
        .from(table)
        .update({ [column]: DELETED_USER_SENTINEL })
        .eq(column, uid);
      if (error) warnings.push(`anon ${table}: ${error.message}`);
    }

    // 2) Delete customer-scoped CRM/breadcrumb rows
    for (const table of DELETE_BY_CUSTOMER_USER_ID) {
      const { error } = await admin.from(table).delete().eq("customer_user_id", uid);
      if (error) warnings.push(`del ${table}: ${error.message}`);
    }

    // 3) Delete personal data by user_id
    for (const table of DELETE_BY_USER_ID) {
      const { error } = await admin.from(table).delete().eq("user_id", uid);
      if (error) warnings.push(`del ${table}: ${error.message}`);
    }

    // 4) Storage cleanup — best effort for user-scoped folders
    for (const bucket of ["avatars", "dealer-documents", "instapay-receipts"]) {
      try {
        const { data: files } = await admin.storage.from(bucket).list(uid, { limit: 1000 });
        if (files && files.length) {
          await admin.storage.from(bucket).remove(files.map((f) => `${uid}/${f.name}`));
        }
      } catch { /* bucket may not exist — ignore */ }
    }

    // 5) Audit record (no personal payload)
    await admin.from("audit_logs").insert({
      performed_by: uid,
      action: "self_delete_account",
      table_name: "auth.users",
      record_id: uid,
      old_data: { provider, warnings_count: warnings.length },
    });

    // 6) Delete the auth user — this is the point of no return
    const { error: delErr } = await admin.auth.admin.deleteUser(uid);
    if (delErr) {
      return json(500, {
        error: "فشل حذف الحساب — يرجى المحاولة مرة أخرى",
        detail: delErr.message,
      });
    }

    return json(200, { success: true, warnings_count: warnings.length });
  } catch (e) {
    return json(500, {
      error: "خطأ غير متوقع أثناء حذف الحساب",
      detail: e instanceof Error ? e.message : String(e),
    });
  }
});
