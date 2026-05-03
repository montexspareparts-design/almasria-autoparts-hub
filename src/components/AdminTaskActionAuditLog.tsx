/**
 * AdminTaskActionAuditLog — سجل تدقيق شامل لكل عمليات "تم/اتصال/واتساب"
 * في تبويب "ذكاء العملاء". يساعد على تتبع أي تعارض في العدّ ومراجعة
 * تاريخ التعامل مع كل مهمة (مين عمل إيه ومتى وليه).
 *
 * المصدر: جدول staff_task_action_log (append-only via DB trigger).
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ClipboardList,
  RefreshCw,
  Search,
  CheckCircle2,
  Phone,
  MessageCircle,
  XCircle,
  Calendar,
  User,
  Filter,
} from "lucide-react";

interface ActionLog {
  id: string;
  task_id: string;
  staff_user_id: string | null;
  staff_name: string | null;
  action: string;
  note: string | null;
  created_at: string;
}

const ACTION_META: Record<string, { label: string; icon: typeof CheckCircle2; tone: string }> = {
  done: { label: "تم", icon: CheckCircle2, tone: "bg-green-500/15 text-green-700 border-green-500/30" },
  call: { label: "اتصال", icon: Phone, tone: "bg-blue-500/15 text-blue-700 border-blue-500/30" },
  whatsapp: { label: "واتساب", icon: MessageCircle, tone: "bg-emerald-500/15 text-emerald-700 border-emerald-500/30" },
  no_answer: { label: "لم يردّ", icon: XCircle, tone: "bg-red-500/15 text-red-700 border-red-500/30" },
  visit: { label: "زيارة", icon: Calendar, tone: "bg-violet-500/15 text-violet-700 border-violet-500/30" },
  note: { label: "ملاحظة", icon: ClipboardList, tone: "bg-amber-500/15 text-amber-700 border-amber-500/30" },
  dismiss: { label: "تجاهل", tone: "bg-muted text-muted-foreground border-border", icon: XCircle },
  cancel: { label: "إلغاء", tone: "bg-red-500/15 text-red-700 border-red-500/30", icon: XCircle },
};

const RANGE_OPTIONS = [
  { value: "today", label: "اليوم" },
  { value: "7d", label: "آخر 7 أيام" },
  { value: "30d", label: "آخر 30 يوم" },
  { value: "all", label: "الكل" },
];

const cairoFormat = (iso: string) =>
  new Date(iso).toLocaleString("ar-EG", {
    timeZone: "Africa/Cairo",
    dateStyle: "short",
    timeStyle: "medium",
  });

const sinceForRange = (range: string): string | null => {
  const now = Date.now();
  if (range === "today") {
    // Cairo local midnight expressed as ISO — best-effort
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d.toISOString();
  }
  if (range === "7d") return new Date(now - 7 * 86400000).toISOString();
  if (range === "30d") return new Date(now - 30 * 86400000).toISOString();
  return null;
};

const AdminTaskActionAuditLog = () => {
  const [logs, setLogs] = useState<ActionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState("today");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const load = async () => {
    setLoading(true);
    let query = supabase
      .from("staff_task_action_log")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    const since = sinceForRange(range);
    if (since) query = query.gte("created_at", since);

    const { data, error } = await query;
    if (!error && data) setLogs(data as ActionLog[]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // realtime: pick up new actions as they happen
    const channel = supabase
      .channel("audit-log-feed")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "staff_task_action_log" },
        (payload) => {
          const row = payload.new as ActionLog;
          setLogs((prev) => [row, ...prev].slice(0, 500));
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  const staffOptions = useMemo(() => {
    const set = new Map<string, string>();
    logs.forEach((l) => {
      if (l.staff_user_id) set.set(l.staff_user_id, l.staff_name || "—");
    });
    return Array.from(set.entries());
  }, [logs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (actionFilter !== "all" && l.action !== actionFilter) return false;
      if (staffFilter !== "all" && l.staff_user_id !== staffFilter) return false;
      if (q) {
        const hay = `${l.task_id} ${l.staff_name ?? ""} ${l.note ?? ""} ${l.action}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [logs, actionFilter, staffFilter, search]);

  const counters = useMemo(() => {
    const c: Record<string, number> = { total: filtered.length };
    filtered.forEach((l) => {
      c[l.action] = (c[l.action] || 0) + 1;
    });
    return c;
  }, [filtered]);

  return (
    <div className="space-y-4 p-2 sm:p-4" dir="rtl">
      {/* Header */}
      <Card className="p-4 sm:p-5 bg-gradient-to-l from-primary/10 to-transparent border-primary/20">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/20 flex items-center justify-center shrink-0">
            <ClipboardList className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-xl sm:text-2xl font-bold text-foreground">سجل تدقيق إجراءات المهام</h2>
            <p className="text-sm text-muted-foreground mt-0.5">
              كل ضغطة "تم / اتصال / واتساب" بتتسجل هنا تلقائياً — بيساعد على تتبع أي تعارض في عداد "تمت اليوم".
            </p>
          </div>
          <Button size="sm" variant="outline" onClick={load} disabled={loading} className="gap-1.5 shrink-0">
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">تحديث</span>
          </Button>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        <Card className="p-3">
          <p className="text-[11px] text-muted-foreground">الإجمالي</p>
          <p className="text-2xl font-extrabold text-foreground tabular-nums">{counters.total}</p>
        </Card>
        {(["done", "call", "whatsapp", "no_answer", "visit", "note", "dismiss"] as const).map((a) => {
          const meta = ACTION_META[a];
          const Icon = meta.icon;
          return (
            <Card key={a} className="p-3">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <Icon className="w-3.5 h-3.5" />
                {meta.label}
              </div>
              <p className="text-2xl font-extrabold text-foreground tabular-nums">{counters[a] || 0}</p>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-wrap gap-2 items-center">
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Filter className="w-3.5 h-3.5" />
            <span>فلترة:</span>
          </div>

          <Select value={range} onValueChange={setRange}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {RANGE_OPTIONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[140px] h-9">
              <SelectValue placeholder="الإجراء" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الإجراءات</SelectItem>
              {Object.entries(ACTION_META).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={staffFilter} onValueChange={setStaffFilter}>
            <SelectTrigger className="w-[180px] h-9">
              <SelectValue placeholder="الموظف" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الموظفين</SelectItem>
              {staffOptions.map(([uid, name]) => (
                <SelectItem key={uid} value={uid}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="بحث في task_id / الملاحظة / الموظف..."
              className="h-9 pr-9"
            />
          </div>
        </div>
      </Card>

      {/* List */}
      <Card className="p-0 overflow-hidden">
        <ScrollArea className="h-[60vh]">
          {loading ? (
            <div className="p-4 space-y-2">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-10 text-center text-sm text-muted-foreground">
              مفيش إجراءات مسجلة في النطاق المحدد.
            </div>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map((log) => {
                const meta = ACTION_META[log.action] || {
                  label: log.action,
                  icon: ClipboardList,
                  tone: "bg-muted text-muted-foreground border-border",
                };
                const Icon = meta.icon;
                return (
                  <div key={log.id} className="p-3 sm:p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shrink-0 ${meta.tone}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <Badge variant="outline" className={`${meta.tone} text-[10px] font-bold`}>
                            {meta.label}
                          </Badge>
                          <span className="text-xs font-semibold text-foreground inline-flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {log.staff_name || "—"}
                          </span>
                          <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1 mr-auto">
                            <Calendar className="w-3 h-3" />
                            {cairoFormat(log.created_at)}
                          </span>
                        </div>
                        {log.note && (
                          <p className="text-sm text-foreground/90 leading-relaxed bg-muted/40 rounded-lg p-2 mt-1">
                            {log.note}
                          </p>
                        )}
                        <p className="text-[10px] text-muted-foreground mt-1.5 font-mono break-all">
                          task: {log.task_id}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </Card>

      <p className="text-[11px] text-muted-foreground text-center">
        السجل بيتحدّث لحظياً (realtime) — كل إجراء جديد بيظهر فوق فوراً.
      </p>
    </div>
  );
};

export default AdminTaskActionAuditLog;
