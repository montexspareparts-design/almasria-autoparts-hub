import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Phone, MessageCircle, StickyNote, Activity, Clock, User as UserIcon,
  CheckCircle2, AlertCircle, Loader2, Filter, FileText, Sparkles,
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";

type EventKind = "call" | "whatsapp" | "note" | "outcome" | "manual" | "other";

type TimelineEvent = {
  id: string;
  kind: EventKind;
  source: "communications" | "notes" | "task_handling";
  staff_id: string;
  staff_name: string;
  at: string;
  body: string | null;
  meta?: { reminder_at?: string | null; is_done?: boolean | null };
};

const KIND_META: Record<EventKind, { label: string; icon: typeof Phone; color: string; ring: string; bg: string }> = {
  call:     { label: "مكالمة",    icon: Phone,         color: "text-emerald-700 dark:text-emerald-300", ring: "ring-emerald-300/60", bg: "bg-emerald-500/10" },
  whatsapp: { label: "واتساب",    icon: MessageCircle, color: "text-green-700 dark:text-green-300",     ring: "ring-green-300/60",   bg: "bg-green-500/10"  },
  note:     { label: "ملاحظة",    icon: StickyNote,    color: "text-amber-700 dark:text-amber-300",     ring: "ring-amber-300/60",   bg: "bg-amber-500/10"  },
  outcome:  { label: "نتيجة",     icon: CheckCircle2,  color: "text-violet-700 dark:text-violet-300",   ring: "ring-violet-300/60",  bg: "bg-violet-500/10" },
  manual:   { label: "إجراء يدوي",icon: Sparkles,      color: "text-blue-700 dark:text-blue-300",       ring: "ring-blue-300/60",    bg: "bg-blue-500/10"   },
  other:    { label: "نشاط",      icon: Activity,      color: "text-foreground",                         ring: "ring-border",         bg: "bg-muted"          },
};

interface CustomerActivityTimelineProps {
  customerUserId: string;
}

const CustomerActivityTimeline = ({ customerUserId }: CustomerActivityTimelineProps) => {
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [filter, setFilter] = useState<"all" | EventKind>("all");

  const load = async () => {
    setLoading(true);

    // 1. Fetch communications, notes, and task handling in parallel
    const [commsRes, notesRes, handlingRes] = await Promise.all([
      supabase
        .from("customer_communications")
        .select("id, comm_type, note, created_at, staff_user_id, reminder_at, is_done")
        .eq("customer_user_id", customerUserId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("customer_notes")
        .select("id, note, created_at, staff_user_id")
        .eq("customer_user_id", customerUserId)
        .order("created_at", { ascending: false })
        .limit(100),
      supabase
        .from("staff_task_handling")
        .select("id, action, staff_name, staff_user_id, created_at, note")
        .like("task_id", `%${customerUserId}%`)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);

    // 2. Collect unique staff IDs to resolve names from profiles
    const staffIds = new Set<string>();
    (commsRes.data || []).forEach((c: any) => c.staff_user_id && staffIds.add(c.staff_user_id));
    (notesRes.data || []).forEach((n: any) => n.staff_user_id && staffIds.add(n.staff_user_id));
    (handlingRes.data || []).forEach((h: any) => h.staff_user_id && staffIds.add(h.staff_user_id));

    let nameMap: Record<string, string> = {};
    if (staffIds.size > 0) {
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", Array.from(staffIds));
      (profs || []).forEach((p: any) => {
        nameMap[p.user_id] = p.full_name || p.email?.split("@")[0] || "موظف";
      });
    }

    // 3. Normalize each source into a unified TimelineEvent
    const merged: TimelineEvent[] = [];

    (commsRes.data || []).forEach((c: any) => {
      const kind: EventKind = c.comm_type === "whatsapp" ? "whatsapp" : c.comm_type === "phone" ? "call" : "other";
      merged.push({
        id: `comm-${c.id}`,
        kind,
        source: "communications",
        staff_id: c.staff_user_id,
        staff_name: nameMap[c.staff_user_id] || "موظف",
        at: c.created_at,
        body: c.note || null,
        meta: { reminder_at: c.reminder_at, is_done: c.is_done },
      });
    });

    (notesRes.data || []).forEach((n: any) => {
      merged.push({
        id: `note-${n.id}`,
        kind: "note",
        source: "notes",
        staff_id: n.staff_user_id,
        staff_name: nameMap[n.staff_user_id] || "موظف",
        at: n.created_at,
        body: n.note || null,
      });
    });

    (handlingRes.data || []).forEach((h: any) => {
      const validKinds: EventKind[] = ["call", "whatsapp", "note", "outcome", "manual"];
      const kind: EventKind = validKinds.includes(h.action) ? h.action : "other";
      merged.push({
        id: `hand-${h.id}`,
        kind,
        source: "task_handling",
        staff_id: h.staff_user_id,
        staff_name: h.staff_name || nameMap[h.staff_user_id] || "موظف",
        at: h.created_at,
        body: h.note || null,
      });
    });

    // 4. Sort newest first and dedupe near-duplicate events (same staff + same kind within 30s)
    merged.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
    const deduped: TimelineEvent[] = [];
    for (const ev of merged) {
      const isDup = deduped.some(
        (d) =>
          d.staff_id === ev.staff_id &&
          d.kind === ev.kind &&
          Math.abs(new Date(d.at).getTime() - new Date(ev.at).getTime()) < 30_000,
      );
      if (!isDup) deduped.push(ev);
    }

    setEvents(deduped);
    setLoading(false);
  };

  useEffect(() => {
    if (!customerUserId) return;
    load();

    // Realtime: refresh when any of the 3 sources change for this customer
    const channel = supabase
      .channel(`customer-timeline-${customerUserId}`)
      .on("postgres_changes",
        { event: "*", schema: "public", table: "customer_communications", filter: `customer_user_id=eq.${customerUserId}` },
        () => load())
      .on("postgres_changes",
        { event: "*", schema: "public", table: "customer_notes", filter: `customer_user_id=eq.${customerUserId}` },
        () => load())
      .on("postgres_changes",
        { event: "*", schema: "public", table: "staff_task_handling" },
        () => load())
      .subscribe();

    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerUserId]);

  const filtered = useMemo(
    () => filter === "all" ? events : events.filter((e) => e.kind === filter),
    [events, filter]
  );

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: events.length, call: 0, whatsapp: 0, note: 0, outcome: 0, manual: 0 };
    events.forEach((e) => { c[e.kind] = (c[e.kind] || 0) + 1; });
    return c;
  }, [events]);

  const lastContact = events[0];

  return (
    <Card className="border-primary/20 shadow-md overflow-hidden rounded-2xl" id="section-timeline">
      <CardHeader className="pb-3 bg-gradient-to-l from-primary/10 via-primary/5 to-transparent border-b">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <CardTitle className="flex items-center gap-2 text-base">
            <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div>سجل المتابعة الزمني</div>
              <p className="text-[11px] font-normal text-muted-foreground mt-0.5">
                كل من تعامل مع العميل ومتى وإيه عمل
              </p>
            </div>
            <Badge variant="secondary" className="text-[10px]">{events.length}</Badge>
          </CardTitle>
          {lastContact && !loading && (
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground bg-muted/50 px-2 py-1 rounded-lg">
              <Clock className="w-3 h-3" />
              <span>آخر تواصل: {formatDistanceToNow(new Date(lastContact.at), { addSuffix: true, locale: ar })}</span>
              <span className="font-bold text-foreground">— {lastContact.staff_name}</span>
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-3 space-y-3">
        {/* Filter chips */}
        {events.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-muted-foreground" />
            {(["all", "call", "whatsapp", "note", "outcome", "manual"] as const).map((k) => {
              const meta = k === "all" ? null : KIND_META[k];
              const label = k === "all" ? "الكل" : meta!.label;
              const count = counts[k] || 0;
              if (k !== "all" && count === 0) return null;
              return (
                <Button
                  key={k}
                  size="sm"
                  variant={filter === k ? "default" : "outline"}
                  className="h-6 text-[10px] gap-1 px-2"
                  onClick={() => setFilter(k as any)}
                >
                  {meta && <meta.icon className="w-3 h-3" />}
                  {label}
                  <span className="text-[9px] opacity-70">({count})</span>
                </Button>
              );
            })}
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-8">
            <div className="w-12 h-12 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-2">
              <AlertCircle className="w-6 h-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              {events.length === 0 ? "لم يتم التواصل مع هذا العميل بعد" : "لا توجد متابعات بهذا الفلتر"}
            </p>
          </div>
        ) : (
          <ScrollArea className="max-h-[420px] pr-2">
            <div className="relative">
              {/* vertical timeline rail */}
              <div className="absolute right-[19px] top-2 bottom-2 w-px bg-border" />
              <ul className="space-y-3">
                {filtered.map((ev, idx) => {
                  const meta = KIND_META[ev.kind];
                  const Icon = meta.icon;
                  const isLatest = idx === 0;
                  return (
                    <li key={ev.id} className="relative flex gap-3 pr-1">
                      {/* dot */}
                      <div
                        className={cn(
                          "relative z-10 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ring-2",
                          meta.bg,
                          meta.ring,
                          isLatest && "ring-4 ring-offset-1 ring-offset-background animate-pulse"
                        )}
                      >
                        <Icon className={cn("w-4 h-4", meta.color)} />
                      </div>

                      {/* content */}
                      <div className="flex-1 min-w-0 pb-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <Badge className={cn("text-[10px] font-bold border-0", meta.bg, meta.color)}>
                            {meta.label}
                          </Badge>
                          <span className="text-xs font-bold text-foreground flex items-center gap-1">
                            <UserIcon className="w-3 h-3 text-muted-foreground" />
                            {ev.staff_name}
                          </span>
                          {isLatest && (
                            <Badge variant="outline" className="text-[9px] border-primary/40 text-primary">
                              الأحدث
                            </Badge>
                          )}
                          <span className="text-[10px] text-muted-foreground mr-auto" dir="ltr">
                            {formatDistanceToNow(new Date(ev.at), { addSuffix: true, locale: ar })}
                            {" • "}
                            {format(new Date(ev.at), "d MMM HH:mm", { locale: ar })}
                          </span>
                        </div>
                        {ev.body && (
                          <p className="text-xs text-foreground/85 leading-relaxed bg-muted/30 rounded-lg p-2 border border-border/40 whitespace-pre-wrap break-words">
                            {ev.body}
                          </p>
                        )}
                        {ev.meta?.reminder_at && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400">
                            <Clock className="w-3 h-3" />
                            تذكير: {format(new Date(ev.meta.reminder_at), "d MMM HH:mm", { locale: ar })}
                            {ev.meta.is_done && <CheckCircle2 className="w-3 h-3 text-emerald-600 ml-1" />}
                          </div>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default CustomerActivityTimeline;
