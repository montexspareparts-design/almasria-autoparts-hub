import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendWhatsAppText } from "../_shared/whatsapp.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { orderNumber, totalAmount, customerPhone, paymentLink, customerName, pickupBranch } =
      await req.json();

    const branchLabels: Record<string, string> = {
      ossim: "أوسيم",
      luxor: "الأقصر",
      tawfiqia: "التوفيقية",
    };
    const branchAr = pickupBranch ? (branchLabels[pickupBranch] || pickupBranch) : "";
    const branchLine = branchAr ? `\n🏢 فرع الاستلام: ${branchAr}` : "";

    if (!orderNumber || !customerPhone) {
      return new Response(
        JSON.stringify({ error: "Missing orderNumber or customerPhone" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const amountFormatted = totalAmount
      ? Number(totalAmount).toLocaleString("ar-EG")
      : "—";

    const clientName = customerName || "عميل";

    // Customer message
    let msg = `أهلاً ${clientName} 👋\nتم استلام طلبك بنجاح ✅\nرقم الطلب: ${orderNumber}\nالإجمالي: ${amountFormatted} جنيه${branchLine}`;

    if (paymentLink) {
      msg += `\n\nادفع الآن لتأكيد الطلب فورًا:\n${paymentLink}`;
    }

    msg += `\n\nشكراً لتعاملك مع المصرية جروب 🚗`;

    // Send to customer
    const customerResult = await sendWhatsAppText(customerPhone, msg);
    if (!customerResult.ok) {
      console.error(
        `Customer WhatsApp failed to ${customerResult.formattedPhone}: ${customerResult.error} (template_required=${customerResult.requiresTemplate ? "yes" : "no"})`,
      );
    }

    // Send to all admin/staff phones
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const { data: admins } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    if (admins && admins.length > 0) {
      const { data: adminProfiles } = await supabase
        .from("profiles")
        .select("phone")
        .in("user_id", admins.map((a: { user_id: string }) => a.user_id));

      const adminMsg = `🆕 طلب جديد #${orderNumber}\nالعميل: ${clientName}\nالتليفون: ${customerPhone}\nالإجمالي: ${amountFormatted} جنيه${branchLine}`;
      for (const p of adminProfiles || []) {
        if (p.phone) {
          const adminResult = await sendWhatsAppText(p.phone, adminMsg);
          if (!adminResult.ok) {
            console.error(
              `Admin WhatsApp failed to ${adminResult.formattedPhone}: ${adminResult.error} (template_required=${adminResult.requiresTemplate ? "yes" : "no"})`,
            );
          }
        }
      }
    }

    return new Response(JSON.stringify({
      success: customerResult.ok,
      customer_requires_template: customerResult.requiresTemplate ?? false,
      customer_error: customerResult.ok ? null : customerResult.error,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
