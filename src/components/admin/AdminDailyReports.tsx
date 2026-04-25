import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ClipboardList, Search, Calendar, TrendingUp, Users, FileText, AlertCircle, Sparkles, Target } from "lucide-react";

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

const AdminDailyReports = () => {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [dateFilter, setDateFilter] = useState<string>(new Date().toISOString().split("T")[0]);
  const [selected, setSelected] = useState<DailyReport | null>(null);

  const load = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("staff_daily_reports")
      .select("*")
      .order("submitted_at", { ascending: false })
      .limit(200);
    setReports(data || []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    const channel = supabase
      .channel("daily-reports-admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "staff_daily_reports" },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filtered = reports.filter((r) => {
    if (dateFilter && r.report_date !== dateFilter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (r.staff_name || "").toLowerCase().includes(q) ||
      (r.staff_email || "").toLowerCase().includes(q)
    );
  });

  // Today aggregates
  const today = new Date().toISOString().split("T")[0];
  const todayReports = reports.filter((r) => r.report_date === today);
  const todayAgg = {
    contacted: todayReports.reduce((s, r) => s + r.customers_contacted, 0),
    registered: todayReports.reduce((s, r) => s + r.customers_registered, 0),
    invoices: todayReports.reduce((s, r) => s + r.customers_with_invoices, 0),
    amount: todayReports.reduce((s, r) => s + Number(r.total_invoices_amount), 0),
    hotLeads: todayReports.reduce((s, r) => s + r.hot_leads_count, 0),
    submitted: todayReports.length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <ClipboardList className="w-6 h-6 text-primary" />
            التقارير اليومية للموظفين
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            تقارير الموظفين عن نشاطهم اليومي
          </p>
        </div>
        <Button onClick={load} variant="outline" size="sm">
          تحديث
        </Button>
      </div>

      {/* Today Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { label: "تقارير اليوم", value: todayAgg.submitted, icon: FileText, color: "text-primary" },
          { label: "تواصلات", value: todayAgg.contacted, icon: Users, color: "text-blue-600" },
          { label: "تسجيلات", value: todayAgg.registered, icon: Sparkles, color: "text-emerald-600" },
          { label: "فواتير", value: todayAgg.invoices, icon: TrendingUp, color: "text-amber-600" },
          { label: "Leads ساخنة", value: todayAgg.hotLeads, icon: AlertCircle, color: "text-red-600" },
          { label: "إجمالي ج.م", value: todayAgg.amount.toLocaleString("ar-EG", { maximumFractionDigits: 0 }), icon: Target, color: "text-violet-600" },
        ].map((k) => (
          <Card key={k.label} className="p-3">
            <k.icon className={`w-4 h-4 ${k.color} mb-1.5`} />
            <p className="text-[10px] text-muted-foreground">{k.label}</p>
            <p className="text-lg font-bold tabular-nums">{k.value}</p>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card className="p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="ابحث باسم الموظف..."
            className="pr-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-muted-foreground" />
          <Input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="w-[160px]"
          />
          <Button size="sm" variant="ghost" onClick={() => setDateFilter("")}>
            كل التواريخ
          </Button>
        </div>
      </Card>

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
          <p className="text-muted-foreground">لا توجد تقارير في هذا التاريخ</p>
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
                  <span className="flex items-center gap-1">
                    📞 <strong className="tabular-nums">{r.customers_contacted}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    ✍️ <strong className="tabular-nums">{r.customers_registered}</strong>
                  </span>
                  <span className="flex items-center gap-1">
                    🧾 <strong className="tabular-nums">{r.customers_with_invoices}</strong>
                  </span>
                  <span className="flex items-center gap-1 text-emerald-600">
                    💰 <strong className="tabular-nums">{Number(r.total_invoices_amount).toLocaleString("ar-EG")}</strong>
                  </span>
                  <span className="flex items-center gap-1 text-red-600">
                    🔥 <strong className="tabular-nums">{r.hot_leads_count}</strong>
                  </span>
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

                <DynamicAnswersBlock userId={selected.staff_user_id} reportDate={selected.report_date} />

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

const DynamicAnswersBlock = ({ userId, reportDate }: { userId: string; reportDate: string }) => {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => {
    let cancel = false;
    (async () => {
      const { data } = await supabase
        .from("daily_report_answers")
        .select("answer_text, answer_number, answer_boolean, answer_choice, daily_report_questions(question_text, question_type)")
        .eq("user_id", userId)
        .eq("report_date", reportDate);
      if (!cancel) setRows(data || []);
    })();
    return () => { cancel = true; };
  }, [userId, reportDate]);

  if (rows.length === 0) return null;

  const fmt = (r: any) => {
    if (r.answer_number != null) return String(r.answer_number);
    if (r.answer_boolean != null) return r.answer_boolean ? "نعم" : "لا";
    if (r.answer_choice) return r.answer_choice;
    return r.answer_text || "—";
  };

  return (
    <div className="rounded-lg border border-primary/30 bg-primary/5 p-3">
      <p className="text-xs font-bold text-primary mb-2">❓ إجابات الأسئلة الإضافية</p>
      <div className="space-y-2">
        {rows.map((r, i) => (
          <div key={i} className="text-sm">
            <span className="font-semibold">{r.daily_report_questions?.question_text}: </span>
            <span className="text-muted-foreground whitespace-pre-wrap">{fmt(r)}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AdminDailyReports;
