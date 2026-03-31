import { supabase } from "@/integrations/supabase/client";

/**
 * Send a WhatsApp notification for a new order (fire-and-forget).
 * Calls the notify-order-whatsapp edge function.
 */
export async function notifyNewOrderWhatsApp(
  orderNumber: string,
  totalAmount: number,
  customerPhone: string,
  customerName?: string,
) {
  try {
    await supabase.functions.invoke("notify-order-whatsapp", {
      body: {
        orderNumber,
        totalAmount,
        customerPhone,
        customerName: customerName || "",
      },
    });
  } catch (err) {
    console.error("WhatsApp notification failed (non-blocking):", err);
  }
}
