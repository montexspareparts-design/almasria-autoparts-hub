import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity, Clock, Eye, RefreshCw, Search, UserCheck, FileCheck2,
  AlertTriangle, MapPin, Wifi, Moon, CircleOff, ChevronDown, ChevronUp, Sparkles, Radio,
} from "lucide-react";
import { format, formatDistanceToNowStrict } from "date-fns";
import { ar } from "date-fns/locale";
import StaffHourlyActivityChart from "@/components/admin/StaffHourlyActivityChart";

type Status = "online" | "idle" | "offline";

type Row = {
  user_id: string;
  full_name: string;
  email: string;
  role: "admin" | "moderator" | "reporter";
  first_seen_at: string | null;
  last_seen_at: string | null;
  page_views: number;
  session_minutes: number;
  paths_count: number;
  top_paths: string[] | null;
  last_path: string | null;
  status: Status;
  seconds_since_last: number;
  daily_report_submitted: boolean;
  shortage_reports_today: number;
};

const ROLE_LABEL: Record<Row["role"], string> = {
  admin: "أدمن",
  moderator: "مشرف",
  reporter: "موظف فيصل",
};

const ROLE_COLOR: Record<Row["role"], string> = {
  admin: "bg-red-500/10 text-red-700 border-red-500/30",
  moderator: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  reporter: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
};

const STATUS_META: Record<Status, { label: string; cls: string; dot: string; Icon: typeof Wifi }> = {
  online:  { label: "نشط الآن",  cls: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30", dot: "bg-emerald-500 animate-pulse", Icon: Wifi },
  idle:    { label: "خامل",       cls: "bg-amber-500/10 text-amber-700 border-amber-500/30",      dot: "bg-amber-500",                 Icon: Moon },
  offline: { label: "غير متصل",   cls: "bg-muted text-muted-foreground border-border",            dot: "bg-muted-foreground/40",       Icon: CircleOff },
};

function formatTime(iso: string | null) {
  if (!iso) return "—";
  try { return format(new Date(iso), "HH:mm"); } catch { return "—"; }
}

function formatMinutes(m: number | null) {
  if (m == null) return "—";
  if (m < 1) return "أقل من دقيقة";
  if (m < 60) return `${Math.round(m)} دقيقة`;
  const h = Math.floor(m / 60);
  const mm = Math.round(m % 60);
  return `${h} س ${mm} د`;
}

function lastSeenLabel(seconds: number | null, status: Status) {
  if (seconds == null) return "—";
  if (status === "online") return "الآن";
  if (seconds < 60) return `قبل ${seconds} ث`;
  if (seconds < 3600) return `قبل ${Math.round(seconds / 60)} د`;
  if (seconds < 86400) return `قبل ${Math.round(seconds / 3600)} س`;
  return `قبل ${Math.round(seconds / 86400)} ي`;
}

function prettyPath(p: string | null | undefined) {
  if (!p) return "—";
  // Trim long ids for readability
  return p.replace(/[0-9a-f-]{20,}/gi, "…");
}

type FilterStatus = "all" | Status;
type FilterRole = "all" | Row["role"];

export default function AdminStaffActivity() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState<FilterStatus>("all");
  const [roleFilter, setRoleFilter] = useState<FilterRole>("all");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const isToday = date === new Date().toISOString().slice(0, 10);

  async function load() {
    try {
      const { data, error } = await supabase.rpc("get_staff_activity_enhanced", { _target_date: date });
      if (error) throw error;
      setRows((data ?? []) as Row[]);
      setLastRefresh(new Date());
    } catch (e) {
      console.error("staff-activity load error", e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setLoading(true);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  // Auto-refresh every 30s when viewing today
  useEffect(() => {
    if (!autoRefresh || !isToday) return;
    const id = window.setInterval(load, 30_000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, isToday, date]);

  // Realtime: refresh when staff_session_activity changes for today
  useEffect(() => {
    if (!isToday) return;
    const channel = supabase
      .channel("staff-activity-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "staff_session_activity" },
        () => load()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isToday, date]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (roleFilter !== "all" && r.role !== roleFilter) return false;
      if (q.trim()) {
        const needle = q.trim().toLowerCase();
        if (!(r.full_name + " " + r.email).toLowerCase().includes(needle)) return false;
      }
      return true;
    });
  }, [rows, q, statusFilter, roleFilter]);

  const counts = useMemo(() => {
    const c = { all: rows.length, online: 0, idle: 0, offline: 0 };
    rows.forEach((r) => { c[r.status]++; });
    return c;
  }, [rows]);

  const totals = useMemo(() => ({
    pageViews: rows.reduce((a, r) => a + (r.page_views || 0), 0),
    minutes: rows.reduce((a, r) => a + (r.session_minutes || 0), 0),
    reportsSubmitted: rows.filter((r) => r.daily_report_submitted).length,
    shortageReports: rows.reduce((a, r) => a + (r.shortage_reports_today || 0), 0),
  }), [rows]);

  function toggleExpand(uid: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid); else next.add(uid);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            نشاط الموظفين
            {isToday && autoRefresh && (
              <Badge variant="outline" className="bg-emerald-50 border-emerald-300 text-emerald-700 gap-1.5">
                <Radio className="w-3 h-3 animate-pulse" />
                مباشر
              </Badge>
            )}
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            آخر تحديث {formatDistanceToNowStrict(lastRefresh, { locale: ar, addSuffix: true })}
            {isToday && autoRefresh && " • التحديث التلقائي كل 30 ثانية"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-44"
            max={new Date().toISOString().slice(0, 10)}
          />
          <Button
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoRefresh((v) => !v)}
            disabled={!isToday}
            title={isToday ? "تشغيل/إيقاف التحديث التلقائي" : "متاح لليوم الحالي فقط"}
          >
            <Radio className={`w-4 h-4 ml-1 ${autoRefresh && isToday ? "animate-pulse" : ""}`} />
            {autoRefresh ? "Live" : "متوقف"}
          </Button>
          <Button variant="outline" size="icon" onClick={load} title="تحديث">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Hourly chart */}
      <StaffHourlyActivityChart date={date} />

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <Card className="border-l-4 border-l-primary">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{counts.all}</div>
              <div className="text-xs text-muted-foreground">موظف نشط اليوم</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Wifi className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-700">{counts.online}</div>
              <div className="text-xs text-muted-foreground">متصل الآن</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Eye className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totals.pageViews}</div>
              <div className="text-xs text-muted-foreground">إجمالي صفحات مفتوحة</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <div className="text-xl font-bold leading-tight">{formatMinutes(totals.minutes)}</div>
              <div className="text-xs text-muted-foreground">إجمالي زمن العمل</div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-violet-500">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center">
              <FileCheck2 className="w-5 h-5 text-violet-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">
                {totals.reportsSubmitted}<span className="text-sm text-muted-foreground">/{counts.all}</span>
              </div>
              <div className="text-xs text-muted-foreground">قدّم تقرير اليوم</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status filter tabs */}
      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as FilterStatus)}>
        <TabsList className="grid grid-cols-4 w-full sm:w-auto sm:inline-grid">
          <TabsTrigger value="all" className="gap-2">
            <Sparkles className="w-3.5 h-3.5" />
            الكل <Badge variant="secondary" className="ml-1">{counts.all}</Badge>
          </TabsTrigger>
          <TabsTrigger value="online" className="gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            نشط <Badge variant="secondary" className="ml-1">{counts.online}</Badge>
          </TabsTrigger>
          <TabsTrigger value="idle" className="gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-500" />
            خامل <Badge variant="secondary" className="ml-1">{counts.idle}</Badge>
          </TabsTrigger>
          <TabsTrigger value="offline" className="gap-2">
            <span className="w-2 h-2 rounded-full bg-muted-foreground/40" />
            غير متصل <Badge variant="secondary" className="ml-1">{counts.offline}</Badge>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Search + role filter */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث باسم الموظف أو الإيميل…"
            className="pr-9"
          />
        </div>
        <div className="flex gap-1.5">
          {(["all", "admin", "moderator", "reporter"] as const).map((r) => (
            <Button
              key={r}
              variant={roleFilter === r ? "default" : "outline"}
              size="sm"
              onClick={() => setRoleFilter(r)}
              className="text-xs"
            >
              {r === "all" ? "كل الأدوار" : ROLE_LABEL[r]}
            </Button>
          ))}
        </div>
      </div>

      {/* List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center justify-between">
            <span>تفاصيل الجلسات</span>
            <span className="text-xs font-normal text-muted-foreground">{filtered.length} موظف</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              مفيش موظفين مطابقين للفلتر.
            </div>
          ) : (
            filtered.map((r) => {
              const meta = STATUS_META[r.status];
              const StatusIcon = meta.Icon;
              const isOpen = expanded.has(r.user_id);
              return (
                <div
                  key={r.user_id}
                  className="border rounded-xl p-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`w-2.5 h-2.5 rounded-full ${meta.dot}`} />
                        <span className="font-bold">{r.full_name || "موظف"}</span>
                        <Badge variant="outline" className={ROLE_COLOR[r.role] || ""}>
                          {ROLE_LABEL[r.role] ?? r.role}
                        </Badge>
                        <Badge variant="outline" className={`gap-1 ${meta.cls}`}>
                          <StatusIcon className="w-3 h-3" />
                          {meta.label}
                        </Badge>
                        {r.daily_report_submitted ? (
                          <Badge variant="outline" className="gap-1 bg-violet-50 border-violet-300 text-violet-700">
                            <FileCheck2 className="w-3 h-3" />
                            قدّم تقريره
                          </Badge>
                        ) : isToday && (
                          <Badge variant="outline" className="gap-1 bg-orange-50 border-orange-300 text-orange-700">
                            <AlertTriangle className="w-3 h-3" />
                            لم يقدّم تقريره بعد
                          </Badge>
                        )}
                        {r.shortage_reports_today > 0 && (
                          <Badge variant="outline" className="gap-1 bg-rose-50 border-rose-300 text-rose-700">
                            🔔 {r.shortage_reports_today} بلاغ نواقص
                          </Badge>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1" dir="ltr">
                        {r.email}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground text-left whitespace-nowrap">
                      <div>أول دخول <strong className="text-foreground">{formatTime(r.first_seen_at)}</strong></div>
                      <div>آخر نشاط <strong className="text-foreground">{lastSeenLabel(r.seconds_since_last, r.status)}</strong></div>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-3 text-xs">
                    <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                      <Clock className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="font-bold">{formatMinutes(r.session_minutes)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                      <Eye className="w-3.5 h-3.5 text-blue-600" />
                      <span className="font-bold">{r.page_views}</span>
                      <span className="text-muted-foreground">صفحة</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded-md">
                      <span className="text-muted-foreground">صفحات فريدة:</span>
                      <span className="font-bold">{r.paths_count}</span>
                    </div>
                    {r.last_path && (
                      <div className="flex items-center gap-1.5 bg-primary/5 border border-primary/20 px-2 py-1 rounded-md flex-1 min-w-0">
                        <MapPin className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="text-muted-foreground shrink-0">آخر صفحة:</span>
                        <code className="text-[11px] truncate" dir="ltr" title={r.last_path}>
                          {prettyPath(r.last_path)}
                        </code>
                      </div>
                    )}
                    {r.top_paths && r.top_paths.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => toggleExpand(r.user_id)}
                      >
                        {isOpen ? <ChevronUp className="w-3 h-3 ml-1" /> : <ChevronDown className="w-3 h-3 ml-1" />}
                        {isOpen ? "إخفاء" : `عرض ${r.top_paths.length} مسارات`}
                      </Button>
                    )}
                  </div>

                  {isOpen && r.top_paths && (
                    <div className="mt-2 flex flex-wrap gap-1.5 pt-2 border-t">
                      {r.top_paths.map((p, i) => (
                        <code
                          key={i}
                          className="text-[10px] bg-muted/60 px-1.5 py-0.5 rounded"
                          dir="ltr"
                          title={p}
                        >
                          {prettyPath(p)}
                        </code>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
