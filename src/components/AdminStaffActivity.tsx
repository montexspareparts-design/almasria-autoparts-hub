import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Clock, Eye, RefreshCw, Search, UserCheck } from "lucide-react";
import { format } from "date-fns";

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

function formatTime(iso: string | null) {
  if (!iso) return "—";
  try {
    return format(new Date(iso), "HH:mm");
  } catch {
    return "—";
  }
}

function formatMinutes(m: number | null) {
  if (m == null) return "—";
  if (m < 1) return "أقل من دقيقة";
  if (m < 60) return `${Math.round(m)} دقيقة`;
  const h = Math.floor(m / 60);
  const mm = Math.round(m % 60);
  return `${h} س ${mm} د`;
}

export default function AdminStaffActivity() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    try {
      const { data, error } = await supabase.rpc("get_staff_activity_today", {
        _target_date: date,
      });
      if (error) throw error;
      setRows((data ?? []) as Row[]);
    } catch (e) {
      console.error("staff-activity load error", e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  const filtered = rows.filter((r) =>
    !q.trim()
      ? true
      : (r.full_name + " " + r.email).toLowerCase().includes(q.trim().toLowerCase())
  );

  const totalActive = rows.length;
  const totalPageViews = rows.reduce((acc, r) => acc + (r.page_views || 0), 0);
  const totalMinutes = rows.reduce((acc, r) => acc + (r.session_minutes || 0), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            نشاط الموظفين اليومي
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            مين دخل النهاردة على حسابه، قعد قد إيه، وملخص جلسته. <span className="font-bold">الموظفين متشالين تلقائياً من تقارير العملاء والزوار.</span>
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
          <Button variant="outline" size="icon" onClick={load} title="تحديث">
            <RefreshCw className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <UserCheck className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totalActive}</div>
              <div className="text-xs text-muted-foreground">موظف نشط</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Eye className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{totalPageViews}</div>
              <div className="text-xs text-muted-foreground">إجمالي الصفحات المفتوحة</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <div className="text-2xl font-bold">{formatMinutes(totalMinutes)}</div>
              <div className="text-xs text-muted-foreground">إجمالي وقت الجلسات</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="ابحث باسم الموظف أو الإيميل…"
          className="pr-9"
        />
      </div>

      {/* List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">تفاصيل الجلسات</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-muted-foreground text-sm">
              مفيش موظف دخل في التاريخ ده.
            </div>
          ) : (
            filtered.map((r) => (
              <div
                key={r.user_id}
                className="border rounded-xl p-3 hover:bg-muted/30 transition-colors"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold">{r.full_name || "موظف"}</span>
                      <Badge variant="outline" className={ROLE_COLOR[r.role] || ""}>
                        {ROLE_LABEL[r.role] ?? r.role}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5" dir="ltr">
                      {r.email}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground text-left">
                    أول دخول {formatTime(r.first_seen_at)}
                    <br />
                    آخر نشاط {formatTime(r.last_seen_at)}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 mt-2 text-xs">
                  <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded">
                    <Clock className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="font-bold">{formatMinutes(r.session_minutes)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded">
                    <Eye className="w-3.5 h-3.5 text-blue-600" />
                    <span className="font-bold">{r.page_views}</span>
                    <span className="text-muted-foreground">صفحة</span>
                  </div>
                  <div className="flex items-center gap-1.5 bg-muted/50 px-2 py-1 rounded">
                    <span className="text-muted-foreground">صفحات فريدة:</span>
                    <span className="font-bold">{r.paths_count}</span>
                  </div>
                </div>

                {r.top_paths && r.top_paths.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {r.top_paths.map((p, i) => (
                      <code
                        key={i}
                        className="text-[10px] bg-muted/60 px-1.5 py-0.5 rounded"
                        dir="ltr"
                      >
                        {p}
                      </code>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
