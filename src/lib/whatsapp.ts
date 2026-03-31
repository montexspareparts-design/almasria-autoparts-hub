import { supabase } from "@/integrations/supabase/client";

/**
 * Send a WhatsApp notification to the customer when a new order is created (fire-and-forget).
 */
export async function notifyNewOrderWhatsApp(
  orderNumber: string,
  totalAmount: number,
  customerPhone: string,
  paymentLink?: string
) {
  try {
    await supabase.functions.invoke("notify-order-whatsapp", {
      body: { orderNumber, totalAmount, customerPhone, paymentLink },
    });
  } catch (err) {
    console.error("WhatsApp notification failed (non-blocking):", err);
  }
}
