import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const paymobSecretKey = Deno.env.get("PAYMOB_SECRET_KEY");
    const paymobHmacSecret = Deno.env.get("PAYMOB_HMAC_SECRET") || paymobSecretKey;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const body = await req.json();

    // Paymob sends transaction callback
    const transaction = body.obj || body;
    const orderId = transaction.order?.merchant_order_id || transaction.merchant_order_id;
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

    // Build HMAC data string from transaction fields (Paymob's specified order)
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

    // Compute HMAC-SHA512 and compare
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
    // ─── End HMAC Verification ──────────────────────────────────────────

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

    // ─── Log transaction to payment_transactions ─────────────────────────
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
    // ─── End Log ─────────────────────────────────────────────────────────

    if (success && !isPending && order) {
      if (["awaiting_payment", "confirmed", "pending"].includes(order.status)) {
        await supabase
          .from("orders")
          .update({ status: "processing" })
          .eq("id", order.id);

        console.log(`Order ${orderNumber} moved to processing after successful payment`);
      }

      // ─── Push Notification to dealer on successful payment ─────────────
      const amountEgpSuccess = transaction.amount_cents ? (transaction.amount_cents / 100).toFixed(2) : "—";
      const { data: successPushSubs } = await supabase
        .from("push_subscriptions")
        .select("*")
        .eq("user_id", order.user_id);

      if (successPushSubs && successPushSubs.length > 0) {
        const successPushPayload = JSON.stringify({
          title: "✅ تم استلام الدفع بنجاح",
          body: `تم تأكيد دفع ${amountEgpSuccess} ج.م للطلب #${orderNumber}. طلبك قيد التجهيز الآن!`,
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
        console.log(`Sent success push to ${successPushSubs.length} sub(s) for dealer ${order.user_id}`);
      }
      // ─── End Success Push ──────────────────────────────────────────────

      // ─── WhatsApp Notification on Successful Payment ───────────────────
      try {
        const twilioAccountSid = Deno.env.get("TWILIO_ACCOUNT_SID");
        const twilioAuthToken = Deno.env.get("TWILIO_AUTH_TOKEN");
        const twilioPhone = Deno.env.get("TWILIO_PHONE_NUMBER");

        if (twilioAccountSid && twilioAuthToken && twilioPhone) {
          // Fetch customer profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("full_name, phone")
            .eq("user_id", order.user_id)
            .maybeSingle();

          const customerPhone = profile?.phone;
          const customerName = profile?.full_name || "عميلنا الكريم";
          const totalAmount = order.total_amount
            ? Number(order.total_amount).toLocaleString("ar-EG")
            : (transaction.amount_cents ? (transaction.amount_cents / 100).toLocaleString("ar-EG") : "—");
          const paymentMethod = transaction.source_data?.type || "بطاقة بنكية";
          const cardInfo = transaction.source_data?.pan ? ` (****${transaction.source_data.pan})` : "";

          if (customerPhone) {
            let phone = customerPhone.replace(/\s/g, "");
            if (!phone.startsWith("+")) {
              phone = phone.startsWith("0") ? `+2${phone}` : `+${phone}`;
            }

            const whatsappBody = [
              `✅ تم استلام الدفع بنجاح!`,
              ``,
              `مرحباً ${customerName}،`,
              `تم تأكيد دفعك بنجاح وطلبك الآن قيد التجهيز.`,
              ``,
              `📋 تفاصيل العملية:`,
              `• رقم الطلب: ${orderNumber}`,
              `• المبلغ المدفوع: ${totalAmount} ج.م`,
              `• طريقة الدفع: ${paymentMethod}${cardInfo}`,
              `• التاريخ: ${new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" })}`,
              ``,
              `سيتم إخطارك عند تجهيز طلبك وشحنه.`,
              ``,
              `شكراً لتعاملك معنا! 🙏`,
              `— المصرية جروب لقطع غيار السيارات`,
            ].join("\n");

            const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioAccountSid}/Messages.json`;
            const twilioAuthHeader = btoa(`${twilioAccountSid}:${twilioAuthToken}`);

            const waResp = await fetch(twilioUrl, {
              method: "POST",
              headers: {
                "Authorization": `Basic ${twilioAuthHeader}`,
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: new URLSearchParams({
                To: `whatsapp:${phone}`,
                From: `whatsapp:${twilioPhone}`,
                Body: whatsappBody,
              }),
            });

            const waData = await waResp.json();
            if (waResp.ok) {
              console.log(`WhatsApp payment success sent to ${phone}, SID: ${waData.sid}`);
            } else {
              console.error("WhatsApp send failed:", JSON.stringify(waData));
            }
          } else {
            console.log("No phone number found for user, skipping WhatsApp notification");
          }
        } else {
          console.log("Twilio credentials not configured, skipping WhatsApp notification");
        }
      } catch (waError) {
        console.error("WhatsApp notification error (non-blocking):", waError);
      }
      // ─── End WhatsApp Notification ─────────────────────────────────────
    } else if (!success && !isPending) {
      // ─── Notify admins & dealer on payment failure ─────────────────────
      const errorDetail = transaction.data?.message || transaction.txn_response_code || "خطأ غير معروف";
      const amountEgp = transaction.amount_cents ? (transaction.amount_cents / 100).toFixed(2) : "—";
      const payMethod = transaction.source_data?.type || "غير محدد";
      const cardInfo = transaction.source_data?.pan ? ` (****${transaction.source_data.pan})` : "";

      // 1) Notify admins
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

      // 2) Notify the dealer (order owner)
      const dealerNotifs = order ? [{
        user_id: order.user_id,
        title: "⚠️ لم تتم عملية الدفع — طلب #" + orderNumber,
        message: `لم تنجح عملية الدفع بقيمة ${amountEgp} ج.م عبر ${payMethod}${cardInfo}. السبب: ${errorDetail}. يمكنك إعادة المحاولة من صفحة طلباتي.`,
        type: "payment_failed",
      }] : [];

      const allNotifs = [...adminNotifs, ...dealerNotifs];
      if (allNotifs.length > 0) {
        await supabase.from("notifications").insert(allNotifs);
        console.log(`Notified ${adminNotifs.length} admin(s) and ${dealerNotifs.length} dealer(s) about failed payment for order ${orderNumber}`);
      }

      // ─── Send Push Notification to dealer ─────────────────────────────
      if (order) {
        const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
        const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");

        if (vapidPrivateKey && vapidPublicKey) {
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
            console.log(`Sent push notification to ${pushSubs.length} subscription(s) for dealer ${order.user_id}`);
          }
        }
      }
      // ─── End Push ──────────────────────────────────────────────────────
      // ─── End notify ────────────────────────────────────────────────────
    } else {
      console.log(`Payment pending for order ${orderNumber}`);
    }

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Paymob webhook error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
