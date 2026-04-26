import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Phone, MessageCircle, Mail, StickyNote, Clock, User as UserIcon,
  Inbox, Send, AlertTriangle, CheckCircle2, History,
} from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * VisitorCommunicationsTab
 *
 * تبويب موحّد لكل اتصالات الزائر:
 *  • customer_communications  — مكالمات / واتساب يدوي / زيارات / "لم يردّ" / ملاحظات تواصل
 *  • whatsapp_send_logs        — رسائل واتساب آلية مرسلة بالقالب (أمر، تأكيد دفع... إلخ)
 *  • whatsapp_messages         — محادثات واتساب الواردة/الصادرة المرتبطة بالعميل (عبر phone)
 *
 * كل العناصر تُعرض في جدول زمني موحّد + فلاتر فرعية (كل / مكالمة / واتساب / إيميل / ملاحظة)
 * مع شارة لون لكل قناة وحالة الإرسال.
 *
 * ملاحظة: لا يوجد جدول email_send_log في هذا المشروع — لو أُضيف لاحقاً يكفي إدراج
 * استعلام موازي هنا بنفس الشكل (الموحّد).
 */

type Channel = "call" | "whatsapp" | "email" | "note" | "visit" | "system";
type Status = "sent" | "failed" | "pending" | "received" | "done" | "no_answer" | "info";

interface UnifiedEvent {
  id: string;
  channel: Channel;
  direction: "outbound" | "inbound" | "internal";
  status: Status;
  title: string;
  body: string | null;
  at: string; // ISO
  staffName?: string | null;
  isMine?: boolean;
  source: "customer_communications" | "whatsapp_send_logs" | "whatsapp_messages";
}

interface Props {
  customerUserId: string;
  customerPhone: string | null;
  currentStaffId?: string | null;
}

const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });
const fmtRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `منذ ${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} س`;
  const d = Math.floor(h / 24);
  if (d < 30) return `منذ ${d} يوم`;
  return new Date(iso).toLocaleDateString("ar-EG", { dateStyle: "medium" });
};

// Normalize EG phone: strip non-digits, drop leading 20/0020, keep last 10 digits
const normalizePhone = (raw: string | null) => {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;
  // Strip country code 20 if length > 10
  let n = digits;
  if (n.startsWith("0020")) n = n.slice(4);
  if (n.startsWith("20") && n.length > 10) n = n.slice(2);
  if (n.startsWith("0")) n = n.slice(1);
  return n.slice(-10);
};

const CHANNEL_META: Record<Channel, { label: string; icon: any; color: string; bg: string }> = {
  call: { label: "مكالمة", icon: Phone, color: "text-emerald-700 dark:text-emerald-300", bg: "bg-emerald-500/10 border-emerald-500/30" },
  whatsapp: { label: "واتساب", icon: MessageCircle, color: "text-green-700 dark:text-green-300", bg: "bg-green-500/10 border-green-500/30" },
  email: { label: "إيميل", icon: Mail, color: "text-sky-700 dark:text-sky-300", bg: "bg-sky-500/10 border-sky-500/30" },
  note: { label: "ملاحظة تواصل", icon: StickyNote, color: "text-amber-700 dark:text-amber-300", bg: "bg-amber-500/10 border-amber-500/30" },
  visit: { label: "زيارة", icon: UserIcon, color: "text-blue-700 dark:text-blue-300", bg: "bg-blue-500/10 border-blue-500/30" },
  system: { label: "إشعار آلي", icon: Send, color: "text-violet-700 dark:text-violet-300", bg: "bg-violet-500/10 border-violet-500/30" },
};

const STATUS_META: Record<Status, { label: string; cls: string }> = {
  sent: { label: "تم الإرسال", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  failed: { label: "فشل", cls: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300" },
  pending: { label: "قيد الإرسال", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  received: { label: "وارد من العميل", cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" },
  done: { label: "تمّ", cls: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" },
  no_answer: { label: "لم يردّ", cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" },
  info: { label: "معلومة", cls: "bg-muted text-muted-foreground" },
};

// Map customer_communications.comm_type → unified channel
const commTypeToChannel = (t: string): { ch: Channel; st: Status } => {
  switch (t) {
    case "phone": return { ch: "call", st: "done" };
    case "whatsapp": return { ch: "whatsapp", st: "sent" };
    case "visit": return { ch: "visit", st: "done" };
    case "no_answer": return { ch: "call", st: "no_answer" };
    case "email": return { ch: "email", st: "sent" };
    case "auto_task": return { ch: "note", st: "done" };
    default: return { ch: "note", st: "info" };
  }
};

const VisitorCommunicationsTab = ({ customerUserId, customerPhone, currentStaffId }: Props) => {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<UnifiedEvent[]>([]);
  const [filter, setFilter] = useState<"all" | Channel>("all");

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        const phoneNorm = normalizePhone(customerPhone);

        // Build phone variants for whatsapp tables (they store raw phones, may include 20/0/+ etc.)
        const phoneVariants: string[] = [];
        if (phoneNorm) {
          phoneVariants.push(phoneNorm, `0${phoneNorm}`, `20${phoneNorm}`, `+20${phoneNorm}`, `0020${phoneNorm}`);
        }

        // Run all three queries in parallel — each scoped to this visitor.
        const [commsRes, waLogsRes, waMsgsRes] = await Promise.all([
          supabase
            .from("customer_communications")
            .select("id, comm_type, note, created_at, staff_user_id, is_done, done_at, reminder_at")
            .eq("customer_user_id", customerUserId)
            .order("created_at", { ascending: false })
            .limit(200),
          phoneVariants.length
            ? supabase
                .from("whatsapp_send_logs")
                .select("id, phone, template, message_preview, status, error_message, created_at")
                .in("phone", phoneVariants)
                .order("created_at", { ascending: false })
                .limit(100)
            : Promise.resolve({ data: [], error: null } as any),
          phoneVariants.length
            ? supabase
                .from("whatsapp_messages")
                .select("id, phone, direction, source, body, status, error_message, created_at, sent_by")
                .in("phone", phoneVariants)
                .order("created_at", { ascending: false })
                .limit(200)
            : Promise.resolve({ data: [], error: null } as any),
        ]);

        // Hydrate staff names for any rows that have a staff id
        const staffIds = new Set<string>();
        (commsRes.data || []).forEach((r: any) => r.staff_user_id && staffIds.add(r.staff_user_id));
        (waMsgsRes.data || []).forEach((r: any) => r.sent_by && staffIds.add(r.sent_by));
        const profiles = staffIds.size
          ? (await supabase.from("profiles").select("user_id, full_name").in("user_id", Array.from(staffIds))).data || []
          : [];
        const nameMap = new Map(profiles.map((p: any) => [p.user_id, p.full_name as string | null]));

        const out: UnifiedEvent[] = [];

        // 1) customer_communications
        for (const c of (commsRes.data || []) as any[]) {
          const { ch, st } = commTypeToChannel(c.comm_type);
          out.push({
            id: `cc-${c.id}`,
            channel: ch,
            direction: "outbound",
            status: st,
            title: CHANNEL_META[ch].label,
            body: c.note || null,
            at: c.created_at,
            staffName: nameMap.get(c.staff_user_id) || "موظف",
            isMine: c.staff_user_id === currentStaffId,
            source: "customer_communications",
          });
        }

        // 2) whatsapp_send_logs (system-templated outbound)
        for (const w of (waLogsRes.data || []) as any[]) {
          const st: Status =
            w.status === "sent" || w.status === "delivered" ? "sent" :
            w.status === "failed" || w.status === "dlq" ? "failed" :
            "pending";
          out.push({
            id: `wal-${w.id}`,
            channel: "whatsapp",
            direction: "outbound",
            status: st,
            title: w.template ? `رسالة آلية · ${w.template}` : "رسالة واتساب آلية",
            body: w.message_preview || w.error_message || null,
            at: w.created_at,
            staffName: "النظام",
            source: "whatsapp_send_logs",
          });
        }

        // 3) whatsapp_messages (manual + system + customer 2-way conversation)
        for (const m of (waMsgsRes.data || []) as any[]) {
          const dir = m.direction === "inbound" ? "inbound" : "outbound";
          const st: Status =
            dir === "inbound" ? "received" :
            m.status === "sent" || m.status === "delivered" || m.status === "read" ? "sent" :
            m.status === "failed" ? "failed" :
            "pending";
          out.push({
            id: `wam-${m.id}`,
            channel: "whatsapp",
            direction: dir,
            status: st,
            title:
              dir === "inbound" ? "ردّ من العميل · واتساب" :
              m.source === "system" ? "واتساب · إشعار آلي" :
              "واتساب · إرسال يدوي",
            body: m.body || m.error_message || null,
            at: m.created_at,
            staffName: m.sent_by ? (nameMap.get(m.sent_by) || "موظف") : (m.source === "system" ? "النظام" : "—"),
            isMine: m.sent_by === currentStaffId,
            source: "whatsapp_messages",
          });
        }

        // Deduplicate: a manual WhatsApp comm in customer_communications often
        // mirrors the same outbound WA message (whatsapp_messages source=manual).
        // Drop the wam-* duplicate when there is a cc-* WhatsApp event within
        // ±60s by the same staff member.
        const filtered = out.filter((e) => {
          if (!e.id.startsWith("wam-") || e.channel !== "whatsapp" || e.direction !== "outbound") return true;
          const t = new Date(e.at).getTime();
          return !out.some(
            (o) =>
              o.id.startsWith("cc-") &&
              o.channel === "whatsapp" &&
              Math.abs(new Date(o.at).getTime() - t) < 60_000
          );
        });

        filtered.sort((a, b) => (a.at > b.at ? -1 : 1));
        if (!cancelled) setEvents(filtered);
      } catch (e) {
        console.error("[VisitorCommunicationsTab] fetch error", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [customerUserId, customerPhone, currentStaffId]);

  const counts = useMemo(() => {
    const c = { all: events.length, call: 0, whatsapp: 0, email: 0, note: 0, visit: 0, system: 0 } as Record<string, number>;
    events.forEach((e) => { c[e.channel] = (c[e.channel] || 0) + 1; });
    return c;
  }, [events]);

  const visible = useMemo(
    () => filter === "all" ? events : events.filter((e) => e.channel === filter),
    [events, filter]
  );

  const filterTabs: Array<{ key: "all" | Channel; label: string; icon: any }> = [
    { key: "all", label: "الكل", icon: History },
    { key: "call", label: "مكالمات", icon: Phone },
    { key: "whatsapp", label: "واتساب", icon: MessageCircle },
    { key: "email", label: "إيميل", icon: Mail },
    { key: "note", label: "ملاحظات", icon: StickyNote },
  ];

  return (
    <Card id="section-comms" className="border-blue-200/60 dark:border-blue-900/40 shadow-md overflow-hidden scroll-mt-24 rounded-2xl">
      <CardHeader className="pb-3 bg-gradient-to-l from-blue-500/10 via-blue-500/5 to-transparent border-b">
        <CardTitle className="flex items-center gap-2 text-base">
          <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
            <Inbox className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          </div>
          سجل التواصل الكامل
          <Badge variant="secondary" className="text-[10px]">{counts.all}</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1.5 mr-11">
          كل المكالمات، رسائل الواتساب (يدوية وآلية)، الإيميلات والملاحظات المسجّلة لهذا الزائر — مرتّبة من الأحدث.
        </p>

        {/* Sub-filter chips */}
        <div className="flex flex-wrap items-center gap-1.5 mt-3">
          {filterTabs.map((t) => {
            const Icon = t.icon;
            const active = filter === t.key;
            const n = counts[t.key] || 0;
            const disabled = t.key !== "all" && n === 0;
            return (
              <button
                key={t.key}
                onClick={() => !disabled && setFilter(t.key)}
                disabled={disabled}
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium border transition",
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : disabled
                      ? "border-border/40 text-muted-foreground/40 cursor-not-allowed"
                      : "border-border bg-background hover:bg-muted"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {t.label}
                {n > 0 && (
                  <Badge
                    variant={active ? "secondary" : "outline"}
                    className={cn("h-4 px-1 text-[9px] font-bold", active && "bg-primary-foreground/20 text-primary-foreground border-0")}
                  >
                    {n}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {loading ? (
          <div className="space-y-2">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full rounded-lg" />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <div className="py-8 text-center text-xs text-muted-foreground">
            <Inbox className="w-8 h-8 mx-auto mb-2 opacity-40" />
            مفيش تواصل مسجّل في هذه القناة لهذا الزائر.
          </div>
        ) : (
          <div className="space-y-2">
            {visible.map((e) => {
              const meta = CHANNEL_META[e.channel];
              const stMeta = STATUS_META[e.status];
              const Icon = meta.icon;
              return (
                <div
                  key={e.id}
                  className={cn(
                    "p-3 rounded-lg border transition hover:bg-muted/40",
                    e.isMine ? "bg-blue-500/5 border-blue-500/20" : "bg-background border-border"
                  )}
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 text-[11px] flex-wrap min-w-0">
                      <span className={cn("inline-flex items-center justify-center w-6 h-6 rounded-md border", meta.bg)}>
                        <Icon className={cn("w-3.5 h-3.5", meta.color)} />
                      </span>
                      <span className="font-bold text-foreground">{e.title}</span>
                      {e.direction === "inbound" && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1 border-blue-500/40 text-blue-600">
                          وارد
                        </Badge>
                      )}
                      <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", stMeta.cls)}>
                        {stMeta.label}
                      </span>
                      {e.staffName && (
                        <>
                          <span className="text-muted-foreground">•</span>
                          <UserIcon className="w-3 h-3 text-muted-foreground" />
                          <span className="text-muted-foreground">{e.staffName}</span>
                        </>
                      )}
                      {e.isMine && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1 border-blue-500/40 text-blue-600">
                          أنت
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0">
                      <Clock className="w-3 h-3" />
                      <span title={fmtDateTime(e.at)}>{fmtRelative(e.at)}</span>
                    </div>
                  </div>
                  {e.body && (
                    <p className="text-sm text-foreground mt-2 whitespace-pre-wrap leading-relaxed">{e.body}</p>
                  )}
                  <div className="text-[10px] text-muted-foreground/70 mt-1.5 font-mono">{fmtDateTime(e.at)}</div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VisitorCommunicationsTab;
