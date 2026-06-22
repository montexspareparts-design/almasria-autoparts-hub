// Create a Bosta shipment for an existing order.
// Called by staff (admin/moderator) from the Admin Orders UI.
import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const BOSTA_API_KEY = Deno.env.get("BOSTA_API_KEY");
const BOSTA_BASE = "https://app.bosta.co/api/v2";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    if (!BOSTA_API_KEY) {
      return new Response(JSON.stringify({ error: "BOSTA_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is staff
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const admin = createClient(supabaseUrl, serviceKey);
    const { data: roles } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id)
      .in("role", ["admin", "moderator"]);
    const isStaff = !!roles && roles.length > 0;

    const { order_id } = await req.json();
    if (!order_id) {
      return new Response(JSON.stringify({ error: "order_id required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load order + profile + items
    const { data: order, error: orderErr } = await admin
      .from("orders").select("*").eq("id", order_id).maybeSingle();
    if (orderErr || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Authorization: staff OR owner of the order
    if (!isStaff && order.user_id !== userData.user.id) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Idempotency: if shipment already exists for this order, return it
    const { data: existingShip } = await admin
      .from("shipments")
      .select("tracking_number, delivery_id, status")
      .eq("order_id", order_id).eq("carrier", "bosta").maybeSingle();
    if (existingShip?.tracking_number) {
      return new Response(JSON.stringify({
        success: true, already_exists: true,
        tracking_number: existingShip.tracking_number,
        delivery_id: existingShip.delivery_id,
      }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { data: profile } = await admin
      .from("profiles").select("full_name, phone").eq("user_id", order.user_id).maybeSingle();

    const { data: items } = await admin
      .from("order_items").select("quantity, name_ar").eq("order_id", order_id);

    const description = (items || [])
      .map((i: any) => `${i.name_ar} x${i.quantity}`)
      .join(", ")
      .slice(0, 250) || "قطع غيار سيارات";

    // Build Bosta payload (production v2 schema)
    // type: 10 = Send (delivery), 25 = CashCollection, etc.
    const codMethods = ["cash_on_delivery", "cod"];
    const cod = Number(codMethods.includes(order.payment_method) ? order.total_amount : 0);

    // Normalize to Egyptian 11-digit mobile (01XXXXXXXXX) — Bosta's expected format
    let phone = (profile?.phone || "").replace(/\D/g, "");
    if (phone.startsWith("0020")) phone = phone.slice(4);
    else if (phone.startsWith("20") && phone.length > 10) phone = phone.slice(2);
    if (phone.length === 10 && phone.startsWith("1")) phone = "0" + phone;
    const isValidEgMobile = /^01[0125]\d{8}$/.test(phone);
    if (!isValidEgMobile) {
      return new Response(JSON.stringify({
        error: "رقم الموبايل غير صالح للشحن. برجاء تحديث رقم العميل بصيغة 01XXXXXXXXX قبل إنشاء الشحنة.",
        phone_received: profile?.phone || null,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const normalizedPhone = phone;

    const bostaPayload: any = {
      type: 10,
      specs: {
        packageType: "Parcel",
        size: "Normal",
        packageDetails: { itemsCount: (items || []).reduce((s: number, i: any) => s + Number(i.quantity || 1), 0), description },
      },
      notes: order.notes || "",
      cod,
      dropOffAddress: {
        city: order.shipping_city || order.shipping_governorate || "Cairo",
        zone: order.shipping_area || order.shipping_city || "",
        district: order.shipping_area || "",
        firstLine: order.shipping_address_line1 || order.shipping_address || "",
        secondLine: order.shipping_address_line2 || "",
        buildingNumber: order.shipping_building || "",
        floor: order.shipping_floor || "",
        apartment: order.shipping_apartment || "",
      },
      receiver: {
        firstName: (profile?.full_name || "عميل").split(" ")[0] || "عميل",
        lastName: (profile?.full_name || "").split(" ").slice(1).join(" ") || "-",
        phone: normalizedPhone,
      },
      businessReference: order.order_number,
    };

    const res = await fetch(`${BOSTA_BASE}/deliveries`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": BOSTA_API_KEY,
      },
      body: JSON.stringify(bostaPayload),
    });

    const raw = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("Bosta create failed", res.status, raw);
      return new Response(JSON.stringify({ error: "Bosta API error", status: res.status, details: raw }), {
        status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const delivery = raw?.data || raw;
    const trackingNumber = delivery?.trackingNumber || delivery?.tracking_number || delivery?._id;
    const deliveryId = delivery?._id || delivery?.id;

    // Upsert shipment record
    await admin.from("shipments").upsert({
      order_id,
      carrier: "bosta",
      tracking_number: trackingNumber,
      delivery_id: deliveryId,
      status: "created",
      raw_response: raw,
    }, { onConflict: "order_id,carrier" });

    await admin.from("orders").update({
      bosta_tracking_number: trackingNumber,
      bosta_delivery_id: deliveryId,
      bosta_status: "created",
    }).eq("id", order_id);

    return new Response(JSON.stringify({
      success: true,
      tracking_number: trackingNumber,
      delivery_id: deliveryId,
    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    console.error("bosta-create-shipment error", e);
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
