import { supabase } from "@/integrations/supabase/client";

const COMM_TYPE_LABELS: Record<string, string> = {
  phone: "📞 مكالمة هاتفية",
  whatsapp: "💬 واتساب",
  visit: "🤝 زيارة شخصية",
  no_answer: "📵 لم يرد",
  other: "📌 وسيلة أخرى",
};

const formatRelative = (dateStr: string) => {
  const diffMs = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "قبل لحظات";
  if (mins < 60) return `قبل ${mins} دقيقة`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `قبل ${hours} ساعة`;
  const days = Math.floor(hours / 24);
  return `قبل ${days} يوم`;
};

/**
 * Checks if there's a recent duplicate communication (same customer + same comm_type)
 * by ANY staff member within the given window. Returns true if user confirms to proceed,
 * false if cancelled or no duplicate found (caller proceeds normally).
 *
 * @returns { isDuplicate, shouldProceed }
 */
export async function checkDuplicateCommunication(params: {
  customerUserId: string;
  commType: string;
  windowMinutes?: number;
}): Promise<{ isDuplicate: boolean; shouldProceed: boolean }> {
  const { customerUserId, commType, windowMinutes = 60 } = params;
  const since = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("customer_communications")
    .select("id, staff_user_id, created_at, note")
    .eq("customer_user_id", customerUserId)
    .eq("comm_type", commType)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .limit(1);

  if (error || !data || data.length === 0) {
    return { isDuplicate: false, shouldProceed: true };
  }

  const last = data[0];
  let staffName = "موظف آخر";
  const { data: prof } = await supabase
    .from("profiles")
    .select("full_name, email")
    .eq("user_id", last.staff_user_id)
    .maybeSingle();
  if (prof) staffName = prof.full_name || prof.email || "موظف";

  const typeLabel = COMM_TYPE_LABELS[commType] || commType;
  const when = formatRelative(last.created_at);

  const msg =
    `⚠️ تنبيه: إجراء مكرر!\n\n` +
    `تم تسجيل "${typeLabel}" لنفس العميل ${when} بواسطة: ${staffName}.\n` +
    (last.note ? `الملاحظة: ${last.note.slice(0, 120)}\n\n` : "\n") +
    `هل تريد المتابعة وتسجيل إجراء جديد؟`;

  const shouldProceed = window.confirm(msg);
  return { isDuplicate: true, shouldProceed };
}
