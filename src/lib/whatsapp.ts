import { supabase } from "@/integrations/supabase/client";

/**
 * Send a WhatsApp notification to admins when a new order is created (fire-and-forget).
 */
export async function notifyNewOrderWhatsApp(orderNumber: string, totalAmount: number) {
  try {
    await supabase.functions.invoke("notify-order-whatsapp", {
      body: { orderNumber, totalAmount },
    });
  } catch (err) {
    console.error("WhatsApp notification failed (non-blocking):", err);
  }
}
