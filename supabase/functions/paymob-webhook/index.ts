import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const PAYMOB_ATTEMPT_SEPARATOR = "--pm--";

const normalizePaymobOrderReference = (reference?: string | null) =>
  reference ? reference.split(PAYMOB_ATTEMPT_SEPARATOR)[0] : null;

async function sendWhatsApp(phone: string, message: string) {
  const accessToken = Deno.env.get("META_WHATSAPP_ACCESS_TOKEN");
  const phoneNumberId = Deno.env.get("META_WHATSAPP_PHONE_NUMBER_ID");
  if (!accessToken || !phoneNumberId) return;

  let formatted = phone.replace(/[\s\-()]/g, "");
  if (formatted.startsWith("+")) formatted = formatted.slice(1);
  if (formatted.startsWith("0")) formatted = "2" + formatted;
  if (/^\d{10}$/.test(formatted)) formatted = "2" + formatted;

  try {
    const resp = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
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
    if (resp.ok) {
      console.log(`WhatsApp sent to ${formatted}`);
    } else {
      console.error(`WhatsApp failed:`, JSON.stringify(data));
    }
  } catch (err) {
    console.error("WhatsApp send error:", err);
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const paymobSecretKey = Deno.env.get("PAYMOB_SECRET_KEY");
    const paymobHmacSecret = Deno.env.get("PAYMOB_HMAC_SECRET") || paymobSecretKey;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();

    // Paymob sends transaction callback
    const transaction = body.obj || body;
    const rawOrderReference = transaction.order?.merchant_order_id || transaction.merchant_order_id;
    const orderId = normalizePaymobOrderReference(rawOrderReference);
    const success = transaction.success === true || transaction.success === "true";
    const isPending = transaction.pending === true || transaction.pending === "true";

    // ─── HMAC Verification (REQUIRED) ───────────────────────────────────
    if (!paymobHmacSecret) {
      console.error("PAYMOB HMAC secret not configured");
      return new Response(
        JSON.stringify({ error: "Webhook secret not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!body.hmac) {
      console.error("Missing HMAC in Paymob callback");
      return new Response(
        JSON.stringify({ error: "Missing HMAC" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const hmacData = [
      transaction.amount_cents,
      transaction.created_at,
      transaction.currency,
      transaction.error_occured,
      transaction.has_parent_transaction,
      transaction.id,
      transaction.integration_id,
      transaction.is_3d_secure,
      transaction.is_auth,
      transaction.is_capture,
      transaction.is_refunded,
      transaction.is_standalone_payment,
      transaction.is_voided,
      transaction.order?.id,
      transaction.owner,
      transaction.pending,
      transaction.source_data?.pan,
      transaction.source_data?.sub_type,
      transaction.source_data?.type,
      transaction.success,
    ].join("");

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(paymobHmacSecret),
      { name: "HMAC", hash: "SHA-512" },
      false,
      ["sign"]
    );
    const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(hmacData));
    const computedHmac = Array.from(new Uint8Array(sig))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    if (computedHmac !== body.hmac) {
      console.error("HMAC mismatch — possible forged callback");
      return new Response(
        JSON.stringify({ error: "Invalid HMAC" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("HMAC verified for order:", orderId, "success:", success);

    if (!orderId) {
      console.error("No order ID in Paymob callback");
      return new Response(
        JSON.stringify({ error: "Missing order ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const orderNumber = orderId;
    const txStatus = success && !isPending ? "success" : isPending ? "pending" : "failed";

    // Look up the internal order
    const { data: order } = await supabase
      .from("orders")
      .select("id, status, user_id, total_amount")
      .eq("order_number", orderNumber)
      .maybeSingle();

    // ─── Log transaction ─────────────────────────────────────────────────
    await supabase.from("payment_transactions").insert({
      order_id: order?.id || null,
      order_number: orderNumber,
      paymob_transaction_id: String(transaction.id || ""),
      amount_cents: transaction.amount_cents,
      currency: transaction.currency || "EGP",
      status: txStatus,
      payment_method: transaction.source_data?.type || null,
      card_last_four: transaction.source_data?.pan || null,
      card_brand: transaction.source_data?.sub_type || null,
      is_refunded: transaction.is_refunded === true,
      is_voided: transaction.is_voided === true,
      error_message: !success ? (transaction.data?.message || transaction.txn_response_code || null) : null,
      raw_payload: body,
    });
    console.log(`Transaction logged for order ${orderNumber}, status: ${txStatus}`);

    // Shared amounts
    const amountEgp = transaction.amount_cents
      ? (transaction.amount_cents / 100).toLocaleString("ar-EG")
      : "—";
    const payMethod = transaction.source_data?.type || "غير محدد";
    const cardInfo = transaction.source_data?.pan ? ` (****${transaction.source_data.pan})` : "";

    // =====================================================================
    // ─── SUCCESS ─────────────────────────────────────────────────────────
    // =====================================================================
    if (success && !isPending && order) {
      if (["awaiting_payment", "confirmed", "pending"].includes(order.status)) {
        await supabase
          .from("orders")
          .update({ status: "processing" })
          .eq("id", order.id);
        console.log(`Order ${orderNumber} moved to processing`);
      }

      // ─── Push order to Al Faisal ERP ────────────────────────────────────
      try {
        const { data: orderFull } = await supabase
          .from("orders")
          .select("*, order_items(*, products:product_id(name_ar, sku, erp_item_code))")
          .eq("id", order.id)
          .single();

        if (orderFull) {
          const [profileRes, dealerRes] = await Promise.all([
            supabase.from("profiles").select("full_name, phone").eq("user_id", order.user_id).maybeSingle(),
            supabase.from("dealer_accounts").select("erp_customer_code, tier").eq("user_id", order.user_id).maybeSingle(),
          ]);

          const erpBaseUrl = "https://api.alfaysalerp.com";
          const erpUsername = Deno.env.get("ERP_FAISAL_USERNAME");
          const erpPassword = Deno.env.get("ERP_FAISAL_PASSWORD");

          if (erpUsername && erpPassword) {
            // Authenticate with ERP
            const authRes = await fetch(`${erpBaseUrl}/Ecommerce/Authenticate`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ username: erpUsername, password: erpPassword }),
            });
            const authText = await authRes.text();
            let erpToken: string | null = null;
            try {
              const authData = JSON.parse(authText);
              erpToken = typeof authData === "string" ? authData : (authData.jwtToken || authData.token || null);
            } catch {
              const trimmed = authText.trim().replace(/^"|"$/g, "");
              if (trimmed.length > 20) erpToken = trimmed;
            }

            if (erpToken) {
              const erpPayload = {
                customercode: dealerRes.data?.erp_customer_code || "",
                notes: `طلب إلكتروني #${orderNumber} - ${profileRes.data?.full_name || "عميل"}`,
                items: (orderFull.order_items || []).map((item: any) => ({
                  itemcode: item.products?.erp_item_code || item.products?.sku || "",
                  quantity: item.quantity,
                  price: item.unit_price,
                })),
              };

              const createRes = await fetch(`${erpBaseUrl}/Ecommerce/CreateOrder`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                  Authorization: `Bearer ${erpToken}`,
                },
                body: JSON.stringify(erpPayload),
              });
              const erpResult = await createRes.json();
              console.log(`[ERP] Order push result for ${orderNumber}:`, JSON.stringify(erpResult));

              // Extract ERP order code
              const erpOrderCode = erpResult?.docno || erpResult?.erp_order_id || erpResult?.orderId || null;
              if (erpOrderCode) {
                await supabase.from("orders").update({ erp_order_code: String(erpOrderCode) }).eq("id", order.id);
                console.log(`[ERP] Order ${orderNumber} linked to ERP code: ${erpOrderCode}`);
              }

              // Log sync
              await supabase.from("erp_sync_logs").insert({
                sync_type: "order_push_payment",
                direction: "outbound",
                reference_id: order.id,
                reference_number: orderNumber,
                status: createRes.ok ? "success" : "error",
                payload: erpPayload,
                response: erpResult,
                error_message: createRes.ok ? null : JSON.stringify(erpResult),
              });
            }
          }
        }
      } catch (erpErr) {
        console.error(`[ERP] Failed to push order ${orderNumber} after payment:`, erpErr);
      }

      // In-app notification for dealer on payment success (with WhatsApp link for inquiries)
      await supabase.from("notifications").insert({
        user_id: order.user_id,
        title: "✅ تم استلام الدفع بنجاح — طلب #" + orderNumber,
        message: `تم تأكيد دفع ${amountEgp} ج.م عبر ${payMethod}${cardInfo} للطلب #${orderNumber}. طلبك قيد التجهيز الآن!\nللاستفسار تواصل معنا: https://wa.me/201034806288?text=${encodeURIComponent("استفسار عن طلب #" + orderNumber)}`,
        type: "payment_success",
      });

      // In-app notification for admins on payment success
      const { data: adminRolesSuccess } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminRolesSuccess && adminRolesSuccess.length > 0) {
        const adminSuccessNotifs = adminRolesSuccess.map((a: { user_id: string }) => ({
          user_id: a.user_id,
          title: "💳 تم دفع طلب #" + orderNumber,
          message: `تم استلام دفع ${amountEgp} ج.م عبر ${payMethod}${cardInfo} للطلب #${orderNumber}.`,
          type: "payment_success",
        }));
        await supabase.from("notifications").insert(adminSuccessNotifs);
      }

      // Push notification to dealer
      const { data: successPushSubs } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", order.user_id);

      if (successPushSubs && successPushSubs.length > 0) {
        const successPushPayload = JSON.stringify({
          title: "✅ تم استلام الدفع بنجاح",
          body: `تم تأكيد دفع ${amountEgp} ج.م للطلب #${orderNumber}. طلبك قيد التجهيز الآن!`,
          icon: "/pwa-192x192.png",
          badge: "/pwa-192x192.png",
          url: "/dealer",
          tag: "payment-success-" + orderNumber,
          timestamp: Date.now(),
        });
        for (const sub of successPushSubs) {
          try {
            const resp = await fetch(sub.endpoint, {
              method: "POST",
              headers: { "Content-Type": "application/json", TTL: "86400" },
              body: successPushPayload,
            });
            if (resp.status === 410 || resp.status === 404) {
              await supabase.from("push_subscriptions").delete().eq("id", sub.id);
            }
          } catch (pushErr) {
            console.error("Push send error (success):", pushErr);
          }
        }
      }

      // Fetch customer profile for admin WhatsApp notification
      const { data: customerProfile } = await supabase
        .from("profiles")
        .select("phone, full_name")
        .eq("user_id", order.user_id)
        .maybeSingle();

      // Send WhatsApp to admins only (customer gets in-app notification + bank SMS)
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      if (adminRoles && adminRoles.length > 0) {
        const { data: adminProfiles } = await supabase
          .from("profiles")
          .select("phone")
          .in("user_id", adminRoles.map((a: { user_id: string }) => a.user_id));

        const clientName = customerProfile?.full_name || "عميل";
        const adminMsg = `💳 تم دفع طلب #${orderNumber}\nالعميل: ${clientName}\nالمبلغ: ${amountEgp} ج.م`;
        for (const p of adminProfiles || []) {
          if (p.phone) await sendWhatsApp(p.phone, adminMsg);
        }
      }

    // =====================================================================
    // ─── FAILURE ─────────────────────────────────────────────────────────
    // =====================================================================
    } else if (!success && !isPending) {
      const errorDetail = transaction.data?.message || transaction.txn_response_code || "خطأ غير معروف";

      // In-app notifications for admins & dealer
      const { data: admins } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      const adminNotifs = (admins || []).map((a: { user_id: string }) => ({
        user_id: a.user_id,
        title: "❌ فشل عملية دفع — طلب #" + orderNumber,
        message: `فشلت عملية دفع بقيمة ${amountEgp} ج.م عبر ${payMethod}${cardInfo}. السبب: ${errorDetail}`,
        type: "payment_failed",
      }));

      const dealerNotifs = order ? [{
        user_id: order.user_id,
        title: "⚠️ لم تتم عملية الدفع — طلب #" + orderNumber,
        message: `لم تنجح عملية الدفع بقيمة ${amountEgp} ج.م عبر ${payMethod}${cardInfo}. السبب: ${errorDetail}. يمكنك إعادة المحاولة من صفحة طلباتي.`,
        type: "payment_failed",
      }] : [];

      const allNotifs = [...adminNotifs, ...dealerNotifs];
      if (allNotifs.length > 0) {
        await supabase.from("notifications").insert(allNotifs);
      }

      // Push notification to dealer
      if (order) {
        const { data: pushSubs } = await supabase
          .from("push_subscriptions")
          .select("*")
          .eq("user_id", order.user_id);

        if (pushSubs && pushSubs.length > 0) {
          const pushPayload = JSON.stringify({
            title: "⚠️ فشل عملية الدفع",
            body: `لم تنجح عملية الدفع للطلب #${orderNumber} بقيمة ${amountEgp} ج.م. يمكنك إعادة المحاولة.`,
            icon: "/pwa-192x192.png",
            badge: "/pwa-192x192.png",
            url: "/dealer",
            tag: "payment-failed-" + orderNumber,
            timestamp: Date.now(),
          });
          for (const sub of pushSubs) {
            try {
              const resp = await fetch(sub.endpoint, {
                method: "POST",
                headers: { "Content-Type": "application/json", TTL: "86400" },
                body: pushPayload,
              });
              if (resp.status === 410 || resp.status === 404) {
                await supabase.from("push_subscriptions").delete().eq("id", sub.id);
              }
            } catch (pushErr) {
              console.error("Push send error:", pushErr);
            }
          }
        }
      }

    } else {
      console.log(`Payment pending for order ${orderNumber}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Paymob webhook error:", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
