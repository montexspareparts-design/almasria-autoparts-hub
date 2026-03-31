import { supabase } from "@/integrations/supabase/client";

/**
 * Send a WhatsApp notification to the customer when a new order is created (fire-and-forget).
 * If customerPhone is not provided, the edge function will look it up from profiles.
 */
export async function notifyNewOrderWhatsApp(
  orderNumber: string,
  totalAmount: number,
  customerPhone?: string,
  paymentLink?: string
) {
  try {
    // If no phone provided, try to get it from the current user's profile
    let phone = customerPhone;
    if (!phone) {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("phone")
          .eq("user_id", user.id)
          .single();
        phone = profile?.phone || undefined;
      }
    }

    if (!phone) {
      console.warn("No customer phone available for WhatsApp notification");
      return;
    }

    await supabase.functions.invoke("notify-order-whatsapp", {
      body: { orderNumber, totalAmount, customerPhone: phone, paymentLink },
    });
  } catch (err) {
    console.error("WhatsApp notification failed (non-blocking):", err);
  }
}
