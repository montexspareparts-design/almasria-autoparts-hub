import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const branchLabels: Record<string, string> = {
  ossim: "أوسيم",
  luxor: "الأقصر",
  tawfiqia: "التوفيقية",
};

/**
 * Safety net: guarantees EVERY order reaches Al Faisal ERP.
 * The client fires a push right after checkout, but that can fail (tab closed,
 * network drop, ERP down). This runs on a schedule, finds orders that have no
 * successful ERP push, and re-pushes them with the website order number attached.
 */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

  try {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const until = new Date(Date.now() - 2 * 60 * 1000).toISOString(); // grace period for the client push

    const { data: orders, error } = await supabase
      .from("orders")
      .select("*, order_items(*, products:product_id(name_ar, sku, erp_item_code))")
      .is("erp_order_code", null)
      .neq("status", "cancelled")
      .gte("created_at", since)
      .lte("created_at", until)
      .order("created_at", { ascending: true })
      .limit(25);

    if (error) throw error;

    const results: any[] = [];

    for (const order of orders || []) {
      // Skip if a successful push already exists for this order
      const { data: prior } = await supabase
        .from("erp_sync_logs")
        .select("id")
        .eq("sync_type", "order_push")
        .eq("reference_id", order.id)
        .in("status", ["success", "mock"])
        .limit(1);
      if (prior && prior.length > 0) continue;

      const [profileRes, dealerRes] = await Promise.all([
        supabase.from("profiles").select("full_name, phone").eq("user_id", order.user_id).maybeSingle(),
        supabase.from("dealer_accounts").select("erp_customer_code, tier").eq("user_id", order.user_id).maybeSingle(),
      ]);

      const pickupBranch = (order as any).pickup_branch || "";
      const branchAr = pickupBranch ? (branchLabels[pickupBranch] || pickupBranch) : "";
      const notes = [branchAr ? `فرع الاستلام: ${branchAr}` : "", order.notes || ""].filter(Boolean).join(" | ");

      const { data: erpResult, error: fnErr } = await supabase.functions.invoke("erp-sync-outbound", {
        body: {
          action: "push_order",
          data: {
            order_id: order.id,
            order_number: order.order_number,
            customer_name: profileRes.data?.full_name || "",
            customer_phone: profileRes.data?.phone || "",
            erp_customer_code: dealerRes.data?.erp_customer_code || "",
            customer_tier: dealerRes.data?.tier || "retail",
            shipping_address: order.shipping_address || "",
            shipping_governorate: order.shipping_governorate || "",
            pickup_branch: pickupBranch,
            pickup_branch_ar: branchAr,
            payment_method: order.payment_method || "",
            items: (order.order_items || []).map((item: any) => ({
              sku: item.products?.sku || "",
              erp_item_code: item.products?.erp_item_code || "",
              name_ar: item.products?.name_ar || "",
              quantity: item.quantity,
              unit_price: item.unit_price,
              total_price: item.total_price,
            })),
            total_amount: order.total_amount,
            notes,
          },
        },
      });

      if (fnErr || erpResult?.erp_error) {
        results.push({ order: order.order_number, ok: false, error: fnErr?.message || erpResult?.message });
        continue;
      }

      const rawDocno = erpResult?.docno ?? erpResult?.erp_order_id ?? null;
      const erpCode = rawDocno && rawDocno !== 0 && rawDocno !== "0" ? String(rawDocno) : null;
      if (erpCode) {
        await supabase.from("orders").update({ erp_order_code: erpCode } as any).eq("id", order.id);
      }
      results.push({ order: order.order_number, ok: true, erp_code: erpCode });
    }

    return new Response(JSON.stringify({ success: true, processed: results.length, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[erp-push-pending-orders]", err);
    return new Response(JSON.stringify({ success: false, error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
