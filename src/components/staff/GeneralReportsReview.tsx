import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClipboardList, Search, Calendar, TrendingUp, Users, FileText, AlertCircle, Sparkles, Target, X, ShieldAlert } from "lucide-react";

interface DailyReport {
  id: string;
  staff_user_id: string;
  staff_name: string | null;
  staff_email: string | null;
  report_date: string;
  customers_contacted: number;
  customers_registered: number;
  customers_with_invoices: number;
  total_invoices_amount: number;
  hot_leads_count: number;
  follow_ups_done: number;
  problems_faced: string | null;
  best_deal_today: string | null;
  tomorrow_plan: string | null;
  general_notes: string | null;
  submitted_at: string;
}

interface TeamOpt { id: string; name: string; color: string | null; }

const todayStr = () => new Date().toISOString().split("T")[0];
const daysAgoStr = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
};

const GeneralReportsReview = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [fromDate, setFromDate] = useState<string>(daysAgoStr(6));
  const [toDate, setToDate] = useState<string>(todayStr());
  const [teams, setTeams] = useState<TeamOpt[]>([]);
  const [teamId, setTeamId] = useState<string>("all");
  const [teamMembersByTeam, setTeamMembersByTeam] = useState<Record<string, Set<string>>>({});
  const [selected, setSelected] = useState<DailyReport | null>(null);

  // Load teams + memberships once
  useEffect(() => {
    (async () => {
      const [tRes, mRes] = await Promise.all([
        supabase.from("teams").select("id, name, color").eq("is_active", true).order("name"),
        supabase.from("team_members").select("team_id, user_id"),
      ]);
      setTeams((tRes.data || []) as TeamOpt[]);
      const map: Record<string, Set<string>> = {};
      (mRes.data || []).forEach((row: any) => {
        if (!map[row.team_id]) map[row.team_id] = new Set();
        map[row.team_id].add(row.user_id);
      });
      setTeamMembersByTeam(map);
    })();
  }, []);

  // Reload reports when date range changes
  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      let q = supabase
        .from("staff_daily_reports")
        .select("*")
        .order("submitted_at", { ascending: false })
        .limit(500);
      if (fromDate) q = q.gte("report_date", fromDate);
      if (toDate) q = q.lte("report_date", toDate);
      const { data } = await q;
      if (!cancel) {
        setReports((data || []) as DailyReport[]);
        setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [fromDate, toDate]);

  // Realtime updates
  useEffect(() => {
    const channel = supabase
      .channel("general-reports-review")
      .on("postgres_changes", { event: "*", schema: "public", table: "staff_daily_reports" }, async () => {
        let q = supabase
          .from("staff_daily_reports")
          .select("*")
          .order("submitted_at", { ascending: false })
          .limit(500);
        if (fromDate) q = q.gte("report_date", fromDate);
        if (toDate) q = q.lte("report_date", toDate);
        const { data } = await q;
        setReports((data || []) as DailyReport[]);
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [fromDate, toDate]);

  const filtered = useMemo(() => {
    const teamSet = teamId !== "all" ? teamMembersByTeam[teamId] : null;
    const q = search.trim().toLowerCase();
    return reports.filter((r) => {
      if (teamSet && !teamSet.has(r.staff_user_id)) return false;
      if (q) {
        const hit = (r.staff_name || "").toLowerCase().includes(q) ||
                    (r.staff_email || "").toLowerCase().includes(q);
        if (!hit) return false;
      }
      return true;
    });
  }, [reports, teamId, teamMembersByTeam, search]);

  const agg = useMemo(() => ({
    contacted: filtered.reduce((s, r) => s + (r.customers_contacted || 0), 0),
    registered: filtered.reduce((s, r) => s + (r.customers_registered || 0), 0),
    invoices: filtered.reduce((s, r) => s + (r.customers_with_invoices || 0), 0),
    amount: filtered.reduce((s, r) => s + Number(r.total_invoices_amount || 0), 0),
    hotLeads: filtered.reduce((s, r) => s + (r.hot_leads_count || 0), 0),
    submitted: filtered.length,
  }), [filtered]);

  const setQuickRange = (days: number) => {
    setFromDate(daysAgoStr(days - 1));
    setToDate(todayStr());
  };

  const clearTeam = () => setTeamId("all");

  return (
    <div className="space-y-4" dir="rtl">
      {/* Filters Card */}
      <Card className="p-3 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">من</span>
            <Input
              type="date"
              value={fromDate}
              max={toDate || undefined}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-[150px] h-9"
            />
            <span className="text-xs text-muted-foreground">إلى</span>
            <Input
              type="date"
              value={toDate}
              min={fromDate || undefined}
              onChange={(e) => setToDate(e.target.value)}
              className="w-[150px] h-9"
            />
          </div>

          <div className="flex items-center gap-1">
            {[
              { l: "اليوم", d: 1 },
              { l: "7 أيام", d: 7 },
              { l: "30 يوم", d: 30 },
            ].map((p) => (
              <Button key={p.l} size="sm" variant="outline" onClick={() => setQuickRange(p.d)} className="h-8 text-xs">
                {p.l}
              </Button>
            ))}
          </div>

          <div className="flex items-center gap-2 min-w-[200px]">
            <Users className="w-4 h-4 text-muted-foreground" />
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger className="h-9 w-[180px]">
                <SelectValue placeholder="كل الفروع" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الفروع/الفرق</SelectItem>
                {teams.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    <span className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ background: t.color || "#888" }} />
                      {t.name}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {teamId !== "all" && (
              <Button size="icon" variant="ghost" className="h-8 w-8" onClick={clearTeam} title="إلغاء فلتر الفرع">
                <X className="w-3.5 h-3.5" />
              </Button>
            )}
          </div>

          <div className="relative flex-1 min-w-[180px]">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم الموظف..."
              className="pr-9 h-9"
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            النتائج: <strong className="text-foreground">{filtered.length}</strong> تقرير
            {teamId !== "all" && teams.find((t) => t.id === teamId) && (
              <> · فرع: <strong className="text-foreground">{teams.find((t) => t.id === teamId)?.name}</strong></>
            )}
          </span>
          <span>
            من {fromDate || "—"} إلى {toDate || "—"}
          </span>
        </div>
      </Card>

      {/* Aggregated KPIs for current filter */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "تقارير", value: agg.submitted, icon: FileText, color: "text-primary" },
          { label: "تواصلات", value: agg.contacted, icon: Users, color: "text-blue-600" },
          { label: "تسجيلات", value: agg.registered, icon: Sparkles, color: "text-emerald-600" },
          { label: "فواتير", value: agg.invoices, icon: TrendingUp, color: "text-amber-600" },
          { label: "Leads ساخنة", value: agg.hotLeads, icon: AlertCircle, color: "text-red-600" },
          { label: "إجمالي ج.م", value: agg.amount.toLocaleString("ar-EG", { maximumFractionDigits: 0 }), icon: Target, color: "text-violet-600" },
        ].map((k) => (
          <Card key={k.label} className="p-3">
            <k.icon className={`w-4 h-4 ${k.color} mb-1.5`} />
            <p className="text-[10px] text-muted-foreground">{k.label}</p>
            <p className="text-lg font-bold tabular-nums">{k.value}</p>
          </Card>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="space-y-2">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="p-4 h-24 bg-muted/30 animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground/50 mb-2" />
          <p className="text-muted-foreground">لا توجد تقارير في هذا النطاق</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => (
            <Card
              key={r.id}
              className="p-4 cursor-pointer hover:border-primary/40 transition-colors"
              onClick={() => setSelected(r)}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold">{r.staff_name || r.staff_email || "موظف"}</h3>
                    <Badge variant="outline" className="text-xs">
                      {new Date(r.report_date).toLocaleDateString("ar-EG", { weekday: "short", day: "numeric", month: "short" })}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    قُدِّم: {new Date(r.submitted_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-3 text-sm">
                  <span className="flex items-center gap-1">📞 <strong className="tabular-nums">{r.customers_contacted}</strong></span>
                  <span className="flex items-center gap-1">✍️ <strong className="tabular-nums">{r.customers_registered}</strong></span>
                  <span className="flex items-center gap-1">🧾 <strong className="tabular-nums">{r.customers_with_invoices}</strong></span>
                  <span className="flex items-center gap-1 text-emerald-600">💰 <strong className="tabular-nums">{Number(r.total_invoices_amount).toLocaleString("ar-EG")}</strong></span>
                  <span className="flex items-center gap-1 text-red-600">🔥 <strong className="tabular-nums">{r.hot_leads_count}</strong></span>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-primary" />
                  تقرير {selected.staff_name || selected.staff_email}
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  {new Date(selected.report_date).toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                </p>
              </DialogHeader>

              <div className="space-y-4 mt-3">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { l: "تواصل مع", v: selected.customers_contacted, i: "📞" },
                    { l: "سجّلوا", v: selected.customers_registered, i: "✍️" },
                    { l: "فواتير", v: selected.customers_with_invoices, i: "🧾" },
                    { l: "إجمالي ج.م", v: Number(selected.total_invoices_amount).toLocaleString("ar-EG"), i: "💰" },
                    { l: "Leads ساخنة", v: selected.hot_leads_count, i: "🔥" },
                    { l: "متابعات", v: selected.follow_ups_done, i: "🔄" },
                  ].map((k) => (
                    <div key={k.l} className="rounded-lg bg-muted/30 p-3 border">
                      <p className="text-xs text-muted-foreground mb-1">{k.i} {k.l}</p>
                      <p className="text-xl font-bold tabular-nums">{k.v}</p>
                    </div>
                  ))}
                </div>

                {selected.best_deal_today && (
                  <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-3">
                    <p className="text-xs font-semibold text-emerald-700 mb-1">⭐ أفضل صفقة اليوم</p>
                    <p className="text-sm whitespace-pre-wrap">{selected.best_deal_today}</p>
                  </div>
                )}
                {selected.problems_faced && (
                  <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-3">
                    <p className="text-xs font-semibold text-red-700 mb-1">⚠️ مشاكل واجهتني</p>
                    <p className="text-sm whitespace-pre-wrap">{selected.problems_faced}</p>
                  </div>
                )}
                {selected.tomorrow_plan && (
                  <div className="rounded-lg border border-blue-500/30 bg-blue-500/5 p-3">
                    <p className="text-xs font-semibold text-blue-700 mb-1">📅 خطة بكرة</p>
                    <p className="text-sm whitespace-pre-wrap">{selected.tomorrow_plan}</p>
                  </div>
                )}
                {selected.general_notes && (
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs font-semibold mb-1">📝 ملاحظات عامة</p>
                    <p className="text-sm whitespace-pre-wrap">{selected.general_notes}</p>
                  </div>
                )}

                <p className="text-xs text-muted-foreground text-center pt-2 border-t">
                  قُدِّم في: {new Date(selected.submitted_at).toLocaleString("ar-EG")}
                </p>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default GeneralReportsReview;
