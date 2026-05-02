import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import {
  Trophy, Users, Clock, Phone, MessageCircle, Zap, Activity,
  Calendar, TrendingUp, Eye, Award, Target, ArrowUp, ArrowDown, ArrowUpDown, RefreshCw, Download, Filter,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import StaffPerformanceDetail from "@/components/admin/StaffPerformanceDetail";

type KpiKey = "active" | "actions" | "customers" | "calls" | "sla";
interface KpiInfo {
  key: KpiKey;
  title: string;
  description: string;
  getValue: (s: StaffMetric) => number | null;
  formatter: (v: number | null) => string;
  emptyHint: string;
}

interface StaffMetric {
  user_id: string;
  name: string;
  email: string;
  role: string;
  total_actions: number;
  unique_customers_contacted: number;
  phone_calls: number;
  whatsapp_msgs: number;
  notes_added: number;
  contact_marks: number;
  first_activity?: string;
  last_activity?: string;
  work_minutes: number;
  avg_response_minutes: number | null;
  orders_processed: number;
  orders_value: number;
  score: number; // composite
}

const fmtNum = (n: number) => n.toLocaleString("ar-EG");
const fmtCurrency = (n: number) => `${Math.round(n).toLocaleString("ar-EG")} ج.م`;
const fmtTime = (iso?: string) => iso ? new Date(iso).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : "—";
const fmtDuration = (min: number) => {
  if (min <= 0) return "—";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h > 0 ? `${h}س ${m}د` : `${m}د`;
};

const getDateRange = (range: "today" | "yesterday" | "week" | "month") => {
  const now = new Date();
  const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x.toISOString(); };
  const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x.toISOString(); };
  if (range === "today") return { from: startOfDay(now), to: endOfDay(now) };
  if (range === "yesterday") {
    const y = new Date(now); y.setDate(y.getDate() - 1);
    return { from: startOfDay(y), to: endOfDay(y) };
  }
  if (range === "week") {
    const w = new Date(now); w.setDate(w.getDate() - 7);
    return { from: startOfDay(w), to: endOfDay(now) };
  }
  // month
  const m = new Date(now); m.setDate(m.getDate() - 30);
  return { from: startOfDay(m), to: endOfDay(now) };
};

export default function AdminStaffPerformance() {
  const [range, setRange] = useState<"today" | "yesterday" | "week" | "month">("today");
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffMetric[]>([]);
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<keyof StaffMetric>("score");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [minScore, setMinScore] = useState<number>(0);
  const [activeOnly, setActiveOnly] = useState<boolean>(false);
  const [selectedStaff, setSelectedStaff] = useState<{ id: string; name: string } | null>(null);
  const [selectedKpi, setSelectedKpi] = useState<KpiKey | null>(null);

  function handleSort(k: keyof StaffMetric) {
    if (k === sortBy) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(k);
      setSortDir("desc");
    }
  }

  const { from, to } = useMemo(() => getDateRange(range), [range]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Get all staff (admins + moderators)
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "moderator"]);

      const staffIds = [...new Set((roles || []).map((r: any) => r.user_id))];
      if (staffIds.length === 0) {
        setStaff([]);
        setLoading(false);
        return;
      }

      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", staffIds);

      const profMap = new Map((profs || []).map((p: any) => [p.user_id, { name: p.full_name || p.email || "موظف", email: p.email || "" }]));
      const roleMap = new Map<string, string[]>();
      (roles || []).forEach((r: any) => {
        const arr = roleMap.get(r.user_id) || [];
        arr.push(r.role);
        roleMap.set(r.user_id, arr);
      });

      // 2. Parallel fetch of activity data within range
      const [auditRes, commsRes, notesRes, marksRes, ordersRes] = await Promise.all([
        supabase.from("audit_logs")
          .select("performed_by, created_at, table_name, action")
          .in("performed_by", staffIds)
          .gte("created_at", from).lte("created_at", to),
        supabase.from("customer_communications")
          .select("staff_user_id, customer_user_id, comm_type, created_at")
          .in("staff_user_id", staffIds)
          .gte("created_at", from).lte("created_at", to),
        supabase.from("customer_notes")
          .select("staff_user_id, created_at")
          .in("staff_user_id", staffIds)
          .gte("created_at", from).lte("created_at", to),
        supabase.from("staff_contact_marks")
          .select("staff_user_id, created_at, customer_user_id")
          .in("staff_user_id", staffIds)
          .gte("created_at", from).lte("created_at", to),
        supabase.from("orders")
          .select("status, total_amount, created_at, first_contacted_at, updated_at")
          .gte("updated_at", from).lte("updated_at", to)
          .in("status", ["confirmed", "processing", "ready", "shipped", "delivered"]),
      ]);

      // 3. Aggregate per staff
      const metrics = new Map<string, StaffMetric>();
      staffIds.forEach((id) => {
        const p = profMap.get(id) || { name: "موظف", email: "" };
        const userRoles = roleMap.get(id) || [];
        metrics.set(id, {
          user_id: id, name: p.name, email: p.email,
          role: userRoles.includes("admin") ? "admin" : "moderator",
          total_actions: 0, unique_customers_contacted: 0, phone_calls: 0, whatsapp_msgs: 0,
          notes_added: 0, contact_marks: 0, work_minutes: 0,
          avg_response_minutes: null, orders_processed: 0, orders_value: 0, score: 0,
        });
      });

      // Audit logs → total_actions, work session
      const sessionsMap = new Map<string, { first: number; last: number }>();
      (auditRes.data || []).forEach((a: any) => {
        const m = metrics.get(a.performed_by);
        if (!m) return;
        m.total_actions += 1;
        const ts = new Date(a.created_at).getTime();
        const s = sessionsMap.get(a.performed_by);
        if (!s) sessionsMap.set(a.performed_by, { first: ts, last: ts });
        else { s.first = Math.min(s.first, ts); s.last = Math.max(s.last, ts); }
      });
      sessionsMap.forEach((s, uid) => {
        const m = metrics.get(uid);
        if (!m) return;
        m.first_activity = new Date(s.first).toISOString();
        m.last_activity = new Date(s.last).toISOString();
        m.work_minutes = Math.round((s.last - s.first) / 60000);
      });

      // Communications
      const customerSets = new Map<string, Set<string>>();
      (commsRes.data || []).forEach((c: any) => {
        const m = metrics.get(c.staff_user_id);
        if (!m) return;
        if (c.comm_type === "phone") m.phone_calls += 1;
        else if (c.comm_type === "whatsapp") m.whatsapp_msgs += 1;
        const set = customerSets.get(c.staff_user_id) || new Set<string>();
        set.add(c.customer_user_id);
        customerSets.set(c.staff_user_id, set);
      });
      // contact marks also count as customers contacted
      (marksRes.data || []).forEach((mk: any) => {
        const m = metrics.get(mk.staff_user_id);
        if (!m) return;
        m.contact_marks += 1;
        const set = customerSets.get(mk.staff_user_id) || new Set<string>();
        set.add(mk.customer_user_id);
        customerSets.set(mk.staff_user_id, set);
      });
      customerSets.forEach((set, uid) => {
        const m = metrics.get(uid);
        if (m) m.unique_customers_contacted = set.size;
      });

      // Notes
      (notesRes.data || []).forEach((n: any) => {
        const m = metrics.get(n.staff_user_id);
        if (m) m.notes_added += 1;
      });

      // Orders processed (best-effort: by audit_logs to map order status changes to staff)
      // Use audit_logs of orders table for attribution
      const orderUpdates = (auditRes.data || []).filter((a: any) => a.table_name === "orders" && a.action === "update");
      orderUpdates.forEach((u: any) => {
        const m = metrics.get(u.performed_by);
        if (m) m.orders_processed += 1;
      });

      // SLA: org-wide first response time average within range
      const slaTimes: number[] = [];
      (ordersRes.data || []).forEach((o: any) => {
        if (o.first_contacted_at && o.created_at) {
          const diff = (new Date(o.first_contacted_at).getTime() - new Date(o.created_at).getTime()) / 60000;
          if (diff > 0 && diff < 60 * 24 * 7) slaTimes.push(diff);
        }
      });
      const orgAvgSla = slaTimes.length ? Math.round(slaTimes.reduce((a, b) => a + b, 0) / slaTimes.length) : null;
      // Apply org average to all staff (no per-staff SLA attribution available)
      metrics.forEach((m) => { m.avg_response_minutes = orgAvgSla; });

      // 4. Compute composite score
      // weights: customers contacted ×4, phone calls ×3, whatsapp ×2, notes ×1, orders ×5, work hours ×2
      metrics.forEach((m) => {
        m.score =
          m.unique_customers_contacted * 4 +
          m.phone_calls * 3 +
          m.whatsapp_msgs * 2 +
          m.notes_added * 1 +
          m.orders_processed * 5 +
          Math.floor(m.work_minutes / 60) * 2;
      });

      setStaff(Array.from(metrics.values()));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [range]);

  const maxScore = useMemo(
    () => staff.reduce((m, s) => Math.max(m, s.score || 0), 0),
    [staff]
  );

  const filtered = useMemo(() => {
    let arr = [...staff];
    if (search.trim()) {
      const q = search.toLowerCase();
      arr = arr.filter(s => s.name.toLowerCase().includes(q) || s.email.toLowerCase().includes(q));
    }
    if (activeOnly) arr = arr.filter(s => s.total_actions > 0);
    if (minScore > 0) arr = arr.filter(s => (s.score || 0) >= minScore);
    arr.sort((a, b) => {
      const av = (a[sortBy] as number) || 0;
      const bv = (b[sortBy] as number) || 0;
      return sortDir === "desc" ? bv - av : av - bv;
    });
    return arr;
  }, [staff, search, sortBy, sortDir, minScore, activeOnly]);

  function exportCsv() {
    const headers = [
      "الترتيب", "الاسم", "الإيميل", "الدور", "النقاط", "عملاء فريدون",
      "مكالمات", "واتساب", "ملاحظات", "طلبات", "إجمالي الإجراءات", "دقائق العمل",
    ];
    const lines = [headers.join(",")];
    filtered.forEach((s, i) => {
      const cells = [
        i + 1, `"${s.name.replace(/"/g, '""')}"`, `"${s.email}"`, s.role,
        s.score, s.unique_customers_contacted, s.phone_calls, s.whatsapp_msgs,
        s.notes_added, s.orders_processed, s.total_actions, s.work_minutes,
      ];
      lines.push(cells.join(","));
    });
    const csv = "\uFEFF" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `staff-performance-${range}-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }


  // Aggregates
  const totalActions = staff.reduce((s, m) => s + m.total_actions, 0);
  const totalCustomers = staff.reduce((s, m) => s + m.unique_customers_contacted, 0);
  const totalCalls = staff.reduce((s, m) => s + m.phone_calls + m.whatsapp_msgs, 0);
  const totalOrders = staff.reduce((s, m) => s + m.orders_processed, 0);
  const orgSla = staff.find(s => s.avg_response_minutes !== null)?.avg_response_minutes;

  const top3 = filtered.slice(0, 3);
  const rangeLabel = { today: "اليوم", yesterday: "أمس", week: "آخر 7 أيام", month: "آخر 30 يوم" }[range];

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black flex items-center gap-2">
            <Trophy className="w-6 h-6 text-amber-500" />
            تقرير أداء الموظفين
          </h2>
          <p className="text-sm text-muted-foreground mt-1">قياس النشاط والإنتاجية لكل موظف — {rangeLabel}</p>
        </div>
        <div className="flex items-center gap-2">
          <Tabs value={range} onValueChange={(v) => setRange(v as any)}>
            <TabsList className="h-9">
              <TabsTrigger value="today" className="text-xs">اليوم</TabsTrigger>
              <TabsTrigger value="yesterday" className="text-xs">أمس</TabsTrigger>
              <TabsTrigger value="week" className="text-xs">7 أيام</TabsTrigger>
              <TabsTrigger value="month" className="text-xs">30 يوم</TabsTrigger>
            </TabsList>
          </Tabs>
          <Button variant="outline" size="sm" onClick={loadData} className="gap-1.5">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </div>
      </div>

      {/* Top KPIs - clickable to drill down */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard icon={Users} label="موظفين نشطين" value={fmtNum(staff.filter(s => s.total_actions > 0).length)} sub={`من ${staff.length}`} color="blue" onClick={() => setSelectedKpi("active")} />
        <KpiCard icon={Activity} label="إجمالي الإجراءات" value={fmtNum(totalActions)} color="purple" onClick={() => setSelectedKpi("actions")} />
        <KpiCard icon={Phone} label="عملاء تم التواصل معهم" value={fmtNum(totalCustomers)} color="emerald" onClick={() => setSelectedKpi("customers")} />
        <KpiCard icon={MessageCircle} label="مكالمات + واتساب" value={fmtNum(totalCalls)} color="green" onClick={() => setSelectedKpi("calls")} />
        <KpiCard icon={Zap} label="متوسط سرعة الرد (SLA)" value={orgSla ? `${orgSla}د` : "—"} sub="على الطلبات الجديدة" color="amber" onClick={() => setSelectedKpi("sla")} />
      </div>

      {/* Leaderboard Top 3 */}
      {top3.length > 0 && top3[0].score > 0 && (
        <Card className="border-2 border-amber-200 dark:border-amber-900 bg-gradient-to-br from-amber-50/50 via-card to-card dark:from-amber-950/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-500" />
              أبطال {rangeLabel}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {top3.map((s, i) => (
                <div key={s.user_id} className={`rounded-lg p-3 border-2 cursor-pointer hover:shadow-md transition-all ${
                  i === 0 ? "border-amber-400 bg-amber-50/80 dark:bg-amber-950/30" :
                  i === 1 ? "border-gray-300 bg-gray-50/80 dark:bg-gray-900/30" :
                  "border-orange-300 bg-orange-50/50 dark:bg-orange-950/20"
                }`} onClick={() => setSelectedStaff({ id: s.user_id, name: s.name })}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-2xl">{i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉"}</span>
                    <Badge variant="outline" className="font-bold text-sm">{s.score} نقطة</Badge>
                  </div>
                  <p className="font-black text-sm truncate">{s.name}</p>
                  <p className="text-[10px] text-muted-foreground mb-2">{s.role === "admin" ? "أدمن" : "موظف"}</p>
                  <div className="grid grid-cols-3 gap-1 text-[10px] text-center pt-2 border-t border-border/50">
                    <div><p className="font-bold text-emerald-600">{s.unique_customers_contacted}</p><p className="text-muted-foreground">عميل</p></div>
                    <div><p className="font-bold text-blue-600">{s.phone_calls + s.whatsapp_msgs}</p><p className="text-muted-foreground">تواصل</p></div>
                    <div><p className="font-bold text-purple-600">{fmtDuration(s.work_minutes)}</p><p className="text-muted-foreground">عمل</p></div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Table */}
      <Card>
        <CardHeader className="pb-3 space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4" />
              مقارنة تفصيلية ({filtered.length}{filtered.length !== staff.length ? ` / ${staff.length}` : ""})
            </CardTitle>
            <div className="flex items-center gap-2 flex-wrap">
              <Input
                placeholder="بحث باسم الموظف أو الإيميل..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 w-56 text-xs"
              />
              <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={exportCsv} disabled={!filtered.length}>
                <Download className="w-3.5 h-3.5" />
                تصدير CSV
              </Button>
            </div>
          </div>

          {/* Advanced filters */}
          <div className="flex items-center gap-4 flex-wrap pt-2 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs">
              <Filter className="w-3.5 h-3.5 text-muted-foreground" />
              <Label htmlFor="active-only" className="cursor-pointer">نشطين فقط</Label>
              <Switch id="active-only" checked={activeOnly} onCheckedChange={setActiveOnly} />
            </div>
            <div className="flex items-center gap-2 text-xs flex-1 min-w-[200px] max-w-sm">
              <span className="text-muted-foreground whitespace-nowrap">حد أدنى للنقاط:</span>
              <Slider
                min={0}
                max={Math.max(maxScore, 10)}
                step={1}
                value={[minScore]}
                onValueChange={(v) => setMinScore(v[0] || 0)}
                className="flex-1"
              />
              <Badge variant="outline" className="font-mono w-12 justify-center">{minScore}</Badge>
            </div>
            <div className="text-[11px] text-muted-foreground">
              فرز: <span className="font-bold text-foreground">{String(sortBy)}</span> ({sortDir === "desc" ? "تنازلي ↓" : "تصاعدي ↑"})
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-64 w-full" />
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              لا يوجد موظفين بنشاط في هذه الفترة
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">#</TableHead>
                    <TableHead className="text-xs">الموظف</TableHead>
                    <SortableHead label="النقاط" k="score" current={sortBy} dir={sortDir} onSort={handleSort} />
                    <SortableHead label="عملاء" k="unique_customers_contacted" current={sortBy} dir={sortDir} onSort={handleSort} />
                    <SortableHead label="مكالمات" k="phone_calls" current={sortBy} dir={sortDir} onSort={handleSort} />
                    <SortableHead label="واتساب" k="whatsapp_msgs" current={sortBy} dir={sortDir} onSort={handleSort} />
                    <SortableHead label="ملاحظات" k="notes_added" current={sortBy} dir={sortDir} onSort={handleSort} />
                    <SortableHead label="طلبات" k="orders_processed" current={sortBy} dir={sortDir} onSort={handleSort} />
                    <SortableHead label="إجراءات" k="total_actions" current={sortBy} dir={sortDir} onSort={handleSort} />
                    <TableHead className="text-xs">جلسة العمل</TableHead>
                    <TableHead className="text-xs"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((s, i) => (
                    <TableRow key={s.user_id} className="text-xs">
                      <TableCell className="font-bold text-muted-foreground">{i + 1}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center font-bold text-xs">
                            {s.name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-foreground">{s.name}</p>
                            <Badge variant={s.role === "admin" ? "default" : "secondary"} className="text-[9px] h-4 mt-0.5">
                              {s.role === "admin" ? "أدمن" : "موظف"}
                            </Badge>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell><Badge variant="outline" className="font-black">{s.score}</Badge></TableCell>
                      <TableCell className="font-bold text-emerald-600">{s.unique_customers_contacted}</TableCell>
                      <TableCell className="font-bold text-blue-600">{s.phone_calls}</TableCell>
                      <TableCell className="font-bold text-green-600">{s.whatsapp_msgs}</TableCell>
                      <TableCell>{s.notes_added}</TableCell>
                      <TableCell className="font-bold text-purple-600">{s.orders_processed}</TableCell>
                      <TableCell>{s.total_actions}</TableCell>
                      <TableCell>
                        {s.work_minutes > 0 ? (
                          <div className="text-[10px]">
                            <p className="font-bold text-foreground">{fmtDuration(s.work_minutes)}</p>
                            <p className="text-muted-foreground">{fmtTime(s.first_activity)} → {fmtTime(s.last_activity)}</p>
                          </div>
                        ) : <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" className="h-7 px-2 gap-1" onClick={() => setSelectedStaff({ id: s.user_id, name: s.name })}>
                          <Eye className="w-3 h-3" />
                          تفاصيل
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Scoring system explanation */}
      <Card className="bg-muted/30 border-dashed">
        <CardContent className="p-4 text-xs text-muted-foreground space-y-2">
          <p className="font-bold text-foreground flex items-center gap-1.5"><Award className="w-3.5 h-3.5" /> طريقة حساب النقاط:</p>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            <div>• كل عميل تم التواصل معه = <span className="font-bold text-emerald-600">4 نقاط</span></div>
            <div>• كل مكالمة هاتفية = <span className="font-bold text-blue-600">3 نقاط</span></div>
            <div>• كل رسالة واتساب = <span className="font-bold text-green-600">2 نقطة</span></div>
            <div>• كل ملاحظة = <span className="font-bold text-amber-600">1 نقطة</span></div>
            <div>• كل طلب تم معالجته = <span className="font-bold text-purple-600">5 نقاط</span></div>
            <div>• كل ساعة عمل = <span className="font-bold text-pink-600">2 نقطة</span></div>
          </div>
        </CardContent>
      </Card>

      {/* Detail drawer */}
      <StaffPerformanceDetail
        open={!!selectedStaff}
        onOpenChange={(o) => { if (!o) setSelectedStaff(null); }}
        staffUserId={selectedStaff?.id || null}
        staffName={selectedStaff?.name || ""}
        dateFrom={from}
        dateTo={to}
      />

      {/* KPI breakdown dialog */}
      <KpiBreakdownDialog
        kpi={selectedKpi}
        staff={staff}
        rangeLabel={rangeLabel}
        onClose={() => setSelectedKpi(null)}
        onPickStaff={(id, name) => { setSelectedKpi(null); setSelectedStaff({ id, name }); }}
      />
    </div>
  );
}

function KpiBreakdownDialog({
  kpi, staff, rangeLabel, onClose, onPickStaff,
}: {
  kpi: KpiKey | null;
  staff: StaffMetric[];
  rangeLabel: string;
  onClose: () => void;
  onPickStaff: (id: string, name: string) => void;
}) {
  const config: Record<KpiKey, KpiInfo> = {
    active: {
      key: "active", title: "موظفين نشطين",
      description: "الموظفون اللي قاموا بأي إجراء (تواصل، تحديث، أو معالجة طلب).",
      getValue: (s) => s.total_actions,
      formatter: (v) => v ? `${fmtNum(v!)} إجراء` : "—",
      emptyHint: "لا يوجد موظفون نشطون في هذه الفترة.",
    },
    actions: {
      key: "actions", title: "إجمالي الإجراءات",
      description: "كل إجراء سجّله الموظف (مكالمات، رسائل، ملاحظات، علامات تواصل).",
      getValue: (s) => s.total_actions,
      formatter: (v) => v ? fmtNum(v!) : "—",
      emptyHint: "لم يتم تسجيل إجراءات.",
    },
    customers: {
      key: "customers", title: "عملاء تم التواصل معهم",
      description: "عدد العملاء الفريدين اللي تواصل معاهم الموظف.",
      getValue: (s) => s.unique_customers_contacted,
      formatter: (v) => v ? `${fmtNum(v!)} عميل` : "—",
      emptyHint: "لا يوجد تواصل مسجّل.",
    },
    calls: {
      key: "calls", title: "مكالمات + واتساب",
      description: "إجمالي المكالمات الهاتفية ورسائل الواتساب الصادرة.",
      getValue: (s) => s.phone_calls + s.whatsapp_msgs,
      formatter: (v) => v ? `${fmtNum(v!)} رسالة/مكالمة` : "—",
      emptyHint: "لا توجد اتصالات مسجّلة.",
    },
    sla: {
      key: "sla", title: "متوسط سرعة الرد (SLA)",
      description: "متوسط الوقت بين وصول الطلب وأول رد من الموظف عليه (بالدقائق).",
      getValue: (s) => s.avg_response_minutes,
      formatter: (v) => v != null ? `${v}د` : "لم يردّ بعد",
      emptyHint: "لا توجد بيانات SLA — لم يستلم الموظفون طلبات جديدة.",
    },
  };

  const info = kpi ? config[kpi] : null;
  const rows = info
    ? [...staff]
        .map(s => ({ s, v: info.getValue(s) }))
        .filter(({ v }) => kpi === "sla" ? v != null : (v ?? 0) > 0)
        .sort((a, b) => {
          const av = a.v ?? 0; const bv = b.v ?? 0;
          return kpi === "sla" ? av - bv : bv - av; // SLA الأقل أفضل
        })
    : [];

  return (
    <Dialog open={!!kpi} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            {info?.title} — {rangeLabel}
          </DialogTitle>
          <DialogDescription>{info?.description}</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto space-y-1.5 mt-2">
          {rows.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">{info?.emptyHint}</p>
          ) : (
            rows.map(({ s, v }, i) => (
              <button
                key={s.user_id}
                onClick={() => onPickStaff(s.user_id, s.name)}
                className="w-full flex items-center justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-accent/40 hover:border-primary/40 transition-colors text-right"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Badge variant="outline" className="shrink-0 font-bold">{i + 1}</Badge>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm truncate">{s.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{s.role === "admin" ? "أدمن" : "موظف"}</p>
                  </div>
                </div>
                <div className="shrink-0 text-left">
                  <p className="font-black text-sm tabular-nums">{info!.formatter(v)}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function KpiCard({ icon: Icon, label, value, sub, color, onClick }: { icon: any; label: string; value: any; sub?: string; color: string; onClick?: () => void }) {
  const colorMap: Record<string, string> = {
    blue: "from-blue-500/10 to-blue-500/5 border-blue-200 dark:border-blue-900",
    purple: "from-purple-500/10 to-purple-500/5 border-purple-200 dark:border-purple-900",
    emerald: "from-emerald-500/10 to-emerald-500/5 border-emerald-200 dark:border-emerald-900",
    green: "from-green-500/10 to-green-500/5 border-green-200 dark:border-green-900",
    amber: "from-amber-500/10 to-amber-500/5 border-amber-200 dark:border-amber-900",
  };
  const iconColor: Record<string, string> = {
    blue: "text-blue-600", purple: "text-purple-600", emerald: "text-emerald-600",
    green: "text-green-600", amber: "text-amber-600",
  };
  const interactive = !!onClick;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!interactive}
      className={`text-right rounded-xl border bg-gradient-to-br ${colorMap[color]} p-3 transition-all ${interactive ? "cursor-pointer hover:shadow-md hover:-translate-y-0.5 hover:border-primary/40 active:scale-[0.98]" : "cursor-default"}`}
    >
      <div className="flex items-center justify-between mb-1.5">
        <Icon className={`w-4 h-4 ${iconColor[color]}`} />
        {interactive && <Eye className="w-3 h-3 text-muted-foreground/60" />}
      </div>
      <p className="text-2xl font-black leading-none">{value}</p>
      <p className="text-[10px] text-muted-foreground font-medium mt-1">{label}</p>
      {sub && <p className="text-[9px] text-muted-foreground mt-0.5">{sub}</p>}
    </button>
  );
}

function SortableHead({ label, k, current, setSort }: { label: string; k: keyof StaffMetric; current: keyof StaffMetric; setSort: (k: keyof StaffMetric) => void }) {
  return (
    <TableHead className="text-xs cursor-pointer hover:text-primary" onClick={() => setSort(k)}>
      <div className="flex items-center gap-1">
        {label}
        <ArrowUpDown className={`w-3 h-3 ${current === k ? "text-primary" : "opacity-30"}`} />
      </div>
    </TableHead>
  );
}
