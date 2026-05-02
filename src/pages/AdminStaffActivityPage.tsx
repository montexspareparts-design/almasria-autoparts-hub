import { useEffect, useState, useMemo } from "react";
import { Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Users, Eye, Clock, Activity, RefreshCw, Calendar } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";
import { cn } from "@/lib/utils";

interface DashboardData {
  date: string;
  kpis: {
    active_staff_count?: number;
    total_page_views?: number;
    total_minutes?: number;
    avg_session_minutes?: number;
  };
  hourly: Array<{ hour: number; event_count: number; unique_staff: number }>;
  staff: Array<{
    user_id: string;
    name: string;
    role: string | null;
    first_seen_at: string;
    last_seen_at: string;
    page_views: number;
    duration_minutes: number;
    top_paths: Array<{ path: string; count: number }> | null;
  }>;
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  admin: { label: "مدير", color: "bg-purple-100 text-purple-700 border-purple-300" },
  moderator: { label: "مشرف", color: "bg-blue-100 text-blue-700 border-blue-300" },
  reporter: { label: "موظف فيصل", color: "bg-emerald-100 text-emerald-700 border-emerald-300" },
};

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
  } catch { return "—"; }
}

function fmtDuration(min: number) {
  const m = Math.max(0, Math.round(min));
  if (m < 60) return `${m} د`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r > 0 ? `${h} س ${r} د` : `${h} س`;
}

export default function AdminStaffActivityPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState<string>(() => new Date().toISOString().slice(0, 10));

  const load = async (targetDate: string) => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.rpc("get_staff_activity_dashboard", {
        target_date: targetDate,
      });
      if (error) throw error;
      setData(result as unknown as DashboardData);
    } catch (e: any) {
      toast({ title: "تعذر تحميل التقرير", description: e?.message ?? String(e), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || !isAdmin) return;
    load(date);
  }, [user, isAdmin, date]);

  const peakHour = useMemo(() => {
    if (!data?.hourly?.length) return null;
    return data.hourly.reduce((max, h) => (h.event_count > (max?.event_count ?? -1) ? h : max), data.hourly[0]);
  }, [data]);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center">جاري التحقق…</div>;
  }
  if (!user) return <Navigate to="/auth" replace />;
  if (!isAdmin) return <Navigate to="/admin" replace />;

  const k = data?.kpis ?? {};

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30" dir="rtl">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => window.history.back()}>
              <ArrowRight className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                <Activity className="w-7 h-7 text-primary" />
                نشاط الموظفين اليومي
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                تقرير خاص بالإدارة فقط — مين دخل النهاردة وقعد قد إيه وعمل إيه
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Calendar className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="pr-9 w-auto"
                max={new Date().toISOString().slice(0, 10)}
              />
            </div>
            <Button variant="outline" size="icon" onClick={() => load(date)} disabled={loading}>
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard
            label="موظف نشط"
            value={k.active_staff_count ?? 0}
            icon={<Users className="w-5 h-5" />}
            color="from-blue-500 to-indigo-600"
          />
          <KpiCard
            label="إجمالي الصفحات"
            value={k.total_page_views ?? 0}
            icon={<Eye className="w-5 h-5" />}
            color="from-emerald-500 to-teal-600"
          />
          <KpiCard
            label="إجمالي الوقت"
            value={fmtDuration(k.total_minutes ?? 0)}
            icon={<Clock className="w-5 h-5" />}
            color="from-amber-500 to-orange-600"
          />
          <KpiCard
            label="متوسط الجلسة"
            value={fmtDuration(k.avg_session_minutes ?? 0)}
            icon={<Activity className="w-5 h-5" />}
            color="from-rose-500 to-pink-600"
          />
        </div>

        {/* Hourly Chart */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-lg">توزيع النشاط بالساعة</CardTitle>
              {peakHour && peakHour.event_count > 0 && (
                <Badge variant="outline" className="bg-amber-50 border-amber-300 text-amber-700">
                  ⚡ ذروة الساعة {peakHour.hour}:00 ({peakHour.event_count} حركة)
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data?.hourly ?? []} margin={{ top: 8, right: 12, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="hour"
                    tickFormatter={(v) => `${v}:00`}
                    tick={{ fontSize: 11 }}
                    stroke="hsl(var(--muted-foreground))"
                  />
                  <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip
                    labelFormatter={(v) => `الساعة ${v}:00`}
                    contentStyle={{
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                    formatter={(value: any, name: string) => [
                      value,
                      name === "event_count" ? "حركات" : "موظفين",
                    ]}
                  />
                  <Legend
                    formatter={(v) => (v === "event_count" ? "عدد الحركات" : "الموظفين النشطين")}
                    wrapperStyle={{ fontSize: 12 }}
                  />
                  <Bar dataKey="event_count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="unique_staff" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Per-staff list */}
        <Card className="border-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center justify-between">
              <span>ملخص لكل موظف ({data?.staff?.length ?? 0})</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {(!data?.staff || data.staff.length === 0) ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
                مفيش نشاط مسجل في اليوم ده
              </div>
            ) : (
              <ScrollArea className="max-h-[600px]">
                <div className="space-y-2 pr-1">
                  {data.staff.map((s) => {
                    const roleInfo = ROLE_LABELS[s.role ?? ""] ?? { label: s.role ?? "—", color: "bg-gray-100 text-gray-700 border-gray-300" };
                    return (
                      <div
                        key={s.user_id}
                        className="rounded-xl border-2 bg-white hover:shadow-md transition-shadow p-3 sm:p-4"
                      >
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center font-bold text-primary shrink-0">
                              {s.name?.[0] ?? "؟"}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-bold truncate">{s.name}</span>
                                <Badge variant="outline" className={cn("text-[10px]", roleInfo.color)}>
                                  {roleInfo.label}
                                </Badge>
                              </div>
                              <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-2 flex-wrap">
                                <span>دخل {fmtTime(s.first_seen_at)}</span>
                                <span>•</span>
                                <span>آخر نشاط {fmtTime(s.last_seen_at)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant="secondary" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                              <Eye className="w-3 h-3 ml-1" />
                              {s.page_views} صفحة
                            </Badge>
                            <Badge variant="secondary" className="bg-amber-50 text-amber-700 border-amber-200">
                              <Clock className="w-3 h-3 ml-1" />
                              {fmtDuration(s.duration_minutes)}
                            </Badge>
                          </div>
                        </div>
                        {s.top_paths && s.top_paths.length > 0 && (
                          <div className="mt-3 flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] text-muted-foreground">أكتر صفحات زارها:</span>
                            {s.top_paths.slice(0, 5).map((p, i) => (
                              <Badge key={i} variant="outline" className="text-[10px] font-mono" dir="ltr">
                                {p.path} ({p.count})
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({ label, value, icon, color }: { label: string; value: number | string; icon: React.ReactNode; color: string }) {
  return (
    <Card className="border-2 overflow-hidden">
      <CardContent className="p-4 relative">
        <div className={cn("absolute -top-4 -left-4 w-20 h-20 rounded-full bg-gradient-to-br opacity-10", color)} />
        <div className="relative flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="text-2xl font-bold">{value}</p>
          </div>
          <div className={cn("w-10 h-10 rounded-lg bg-gradient-to-br flex items-center justify-center text-white shrink-0", color)}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
