import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok");
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const email = "demo.oils@almasriaautoparts.com";
  const password = "OilsDemo#2026";

  const { data: created, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: "تاجر تجريبي — جملة الزيوت" },
  });

  let userId = created?.user?.id;
  if (error && !userId) {
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const found = list?.users?.find((u) => u.email === email);
    if (!found) return Response.json({ error: error.message }, { status: 400 });
    userId = found.id;
    await admin.auth.admin.updateUserById(userId, { password, email_confirm: true });
  }

  await admin.from("profiles").upsert(
    { user_id: userId, full_name: "تاجر تجريبي — جملة الزيوت", email, phone: "01000000000" },
    { onConflict: "user_id" },
  );

  const { data: existing } = await admin
    .from("dealer_accounts")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  const payload = {
    user_id: userId,
    tier: "wholesale_tier1",
    is_active: true,
    credit_limit: 50000,
    min_order_amount: 0,
    business_type: "wholesale",
    erp_customer_name: "تاجر تجريبي — جملة الزيوت",
    notes: "حساب معاينة تطبيق جملة الزيوت",
  };

  const { error: daErr } = existing
    ? await admin.from("dealer_accounts").update(payload).eq("id", existing.id)
    : await admin.from("dealer_accounts").insert(payload);

  return Response.json({ ok: !daErr, userId, email, password, daErr: daErr?.message ?? null });
});
