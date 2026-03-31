import { supabase } from "@/integrations/supabase/client";

/**
 * Generate a sequential order number via the database function.
 * Format: ORD-YYYYMMDD-0001
 */
export async function generateOrderNumber(): Promise<string> {
  const { data, error } = await supabase.rpc("generate_order_number");
  if (error || !data) {
    // Fallback if RPC fails
    const d = new Date();
    const date = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
    const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `ORD-${date}-${rand}`;
  }
  return data as string;
}
