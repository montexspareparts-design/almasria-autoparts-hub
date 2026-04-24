import { supabase } from "@/integrations/supabase/client";

/**
 * Normalize an arbitrary phone string into Egyptian local format (01XXXXXXXXX, 11 digits).
 * Returns null if it can't be confidently normalized.
 */
export function normalizeEgyptianPhone(raw?: string | null): string | null {
  if (!raw) return null;
  let digits = String(raw).replace(/\D/g, "");
  if (!digits) return null;

  // Strip common Egyptian country-code prefixes
  if (digits.startsWith("0020")) digits = digits.slice(4);
  else if (digits.startsWith("20") && digits.length === 12) digits = digits.slice(2);

  // Add leading 0 for 10-digit mobile starting with 1
  if (digits.length === 10 && digits.startsWith("1")) digits = "0" + digits;

  if (/^01[0125]\d{8}$/.test(digits)) return digits;
  return null;
}

export type RecoveredPhone = {
  phone: string;
  source: "whatsapp" | "support_request" | "lead" | "order";
  sourceLabel: string;
  capturedAt?: string;
};

/**
 * Try to recover a phone number for the given user from any contact channel
 * linked to their session/identity (WhatsApp inbox, support requests, leads, past orders).
 *
 * Returns the most recent confidently-normalized Egyptian number, or null.
 */
export async function recoverPhoneFromChannels(
  userId: string,
  email?: string | null,
): Promise<RecoveredPhone | null> {
  const candidates: RecoveredPhone[] = [];

  // 1) WhatsApp conversations linked to this user
  try {
    const { data } = await supabase
      .from("whatsapp_conversations")
      .select("phone, last_message_at, customer_user_id")
      .eq("customer_user_id", userId)
      .order("last_message_at", { ascending: false })
      .limit(1);
    const row = data?.[0];
    const norm = normalizeEgyptianPhone(row?.phone);
    if (norm) {
      candidates.push({
        phone: norm,
        source: "whatsapp",
        sourceLabel: "محادثة واتساب سابقة",
        capturedAt: row?.last_message_at ?? undefined,
      });
    }
  } catch { /* table may not be accessible — ignore */ }

  // 2) Support requests submitted by this user
  try {
    const { data } = await supabase
      .from("support_requests")
      .select("customer_phone, created_at, user_id")
      .eq("user_id", userId)
      .not("customer_phone", "is", null)
      .order("created_at", { ascending: false })
      .limit(1);
    const row = data?.[0];
    const norm = normalizeEgyptianPhone(row?.customer_phone);
    if (norm) {
      candidates.push({
        phone: norm,
        source: "support_request",
        sourceLabel: "طلب دعم سابق",
        capturedAt: row?.created_at ?? undefined,
      });
    }
  } catch { /* ignore */ }

  // 3) Leads created with this email (staff often pre-record phone here)
  if (email) {
    try {
      const { data } = await supabase
        .from("leads")
        .select("phone, created_at")
        .ilike("notes", `%${email}%`)
        .order("created_at", { ascending: false })
        .limit(1);
      const row = data?.[0];
      const norm = normalizeEgyptianPhone(row?.phone);
      if (norm) {
        candidates.push({
          phone: norm,
          source: "lead",
          sourceLabel: "سجل عميل محفوظ",
          capturedAt: row?.created_at ?? undefined,
        });
      }
    } catch { /* ignore */ }
  }

  if (candidates.length === 0) return null;

  // Pick the most recent
  candidates.sort((a, b) => {
    const ta = a.capturedAt ? Date.parse(a.capturedAt) : 0;
    const tb = b.capturedAt ? Date.parse(b.capturedAt) : 0;
    return tb - ta;
  });
  return candidates[0];
}
