import { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Loader2, PackageX, Flame, Users, BarChart3, RefreshCw, Eye, ArrowUpDown, CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";

type StatusKey = "open" | "sourcing" | "fulfilled" | "rejected";

interface PriorityRow {
  group_key: string;
  product_id_text: string | null;
  sku: string | null;
  name_ar: string | null;
  reports_count: number;
  total_quantity: number;
  unique_staff_count: number;
  unique_customers_count: number;
  open_count: number;
  sourcing_count: number;
  fulfilled_count: number;
  rejected_count: number;
  priority_score: number;
  last_reported_at: string;
}

interface DetailRow {
  id: string;
  staff_user_id: string;
  product_id: string | null;
  manual_sku: string | null;
  manual_name: string | null;
  requested_quantity: number;
  customer_note: string | null;
  status: StatusKey;
  admin_response: string | null;
  created_at: string;
  product?: { sku: string; name_ar: string } | null;
  staff_name?: string;
}

const STATUS_META: Record<StatusKey, { label: string; color: string }> = {
  open:      { label: "مفتوح",       color: "bg-amber-100 text-amber-700 border-amber-300" },
  sourcing:  { label: "جارٍ التوفير", color: "bg-sky-100 text-sky-700 border-sky-300" },
  fulfilled: { label: "تم التوفير",  color: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  rejected:  { label: "مرفوض",       color: "bg-rose-100 text-rose-700 border-rose-300" },
};

export default function AdminShortageRequests() {
  const { toast } = useToast();
  const [priority, setPriority] = useState<PriorityRow[]>([]);
  const [details, setDetails] = useState<DetailRow[]>([]);
  const [loading, setLoading] = useState(true);
  type RangePreset = "7" | "30" | "90" | "365" | "custom";
  const [preset, setPreset] = useState<RangePreset>("30");
  const today = useMemo(() => { const d = new Date(); d.setHours(23,59,59,999); return d; }, []);
  const [fromDate, setFromDate] = useState<Date>(() => { const d = new Date(); d.setDate(d.getDate() - 30); d.setHours(0,0,0,0); return d; });
  const [toDate, setToDate] = useState<Date>(() => { const d = new Date(); d.setHours(23,59,59,999); return d; });
  const [statusFilter, setStatusFilter] = useState<StatusKey | "all">("all");
  const [showFulfilled, setShowFulfilled] = useState(false);
  const [activeTab, setActiveTab] = useState<"priority" | "all">("priority");

  // Detail dialog
  const [openGroup, setOpenGroup] = useState<PriorityRow | null>(null);
  const [groupRows, setGroupRows] = useState<DetailRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStatus, setEditStatus] = useState<StatusKey>("open");
  const [editResponse, setEditResponse] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    const fromStr = fromDate.toISOString().slice(0, 10);
    const toStr = toDate.toISOString().slice(0, 10);
    // include the whole "to" day
    const toEndStr = new Date(toDate.getTime() + 24 * 3600 * 1000).toISOString().slice(0, 10);

    const [{ data: p }, { data: d }] = await Promise.all([
      supabase.rpc("get_shortage_priority_report" as any, { _from: fromStr, _to: toStr }),
      supabase.from("stock_shortage_requests" as any)
        .select("id,staff_user_id,product_id,manual_sku,manual_name,requested_quantity,customer_note,status,admin_response,created_at,product:products(sku,name_ar)")
        .gte("created_at", fromStr)
        .lt("created_at", toEndStr)
        .order("created_at", { ascending: false })
        .limit(500),
    ]);

    // ترتيب الأهمية أساساً بعدد الموظفين اللي بلّغوا، وباقي العوامل tiebreakers
    const sorted = ((p as any[]) || []).slice().sort((a, b) => {
      const sd = Number(b.unique_staff_count) - Number(a.unique_staff_count);
      if (sd !== 0) return sd;
      const cd = Number(b.unique_customers_count) - Number(a.unique_customers_count);
      if (cd !== 0) return cd;
      const rd = Number(b.reports_count) - Number(a.reports_count);
      if (rd !== 0) return rd;
      return Number(b.total_quantity) - Number(a.total_quantity);
    });
    setPriority(sorted as any);

    const { data: colleagues } = await (supabase as any).rpc("list_staff_colleagues");
    const nameMap = new Map<string, string>();
    (colleagues || []).forEach((c: any) => nameMap.set(c.user_id, c.full_name));
    setDetails(((d as any) || []).map((r: any) => ({ ...r, staff_name: nameMap.get(r.staff_user_id) || "موظف" })));
    setLoading(false);
  }, [fromDate, toDate]);

  // تطبيق preset سريع
  const applyPreset = (p: RangePreset) => {
    setPreset(p);
    if (p === "custom") return;
    const days = Number(p);
    const from = new Date();
    from.setDate(from.getDate() - days);
    from.setHours(0, 0, 0, 0);
    const to = new Date();
    to.setHours(23, 59, 59, 999);
    setFromDate(from);
    setToDate(to);
  };

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // Realtime
  useEffect(() => {
    const ch = supabase
      .channel("admin-shortage")
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_shortage_requests" }, () => fetchAll())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchAll]);

  const filteredDetails = useMemo(() => {
    if (statusFilter === "all") return details;
    return details.filter(d => d.status === statusFilter);
  }, [details, statusFilter]);

  // إخفاء الأصناف اللي كل بلاغاتها "تم التوفير" — إلا لو الأدمن طلب يشوفها
  const visiblePriority = useMemo(() => {
    if (showFulfilled) return priority;
    return priority.filter(r => {
      const reports = Number(r.reports_count) || 0;
      const fulfilled = Number(r.fulfilled_count) || 0;
      return reports === 0 || fulfilled < reports;
    });
  }, [priority, showFulfilled]);

  const totals = useMemo(() => ({
    items: visiblePriority.length,
    reports: filteredDetails.reduce((s, r) => s + 1, 0),
    qty: filteredDetails.reduce((s, r) => s + Number(r.requested_quantity || 0), 0),
    staff: new Set(details.map(d => d.staff_user_id)).size,
  }), [visiblePriority, filteredDetails, details]);

  const openGroupDetails = (g: PriorityRow) => {
    setOpenGroup(g);
    const matching = details.filter(d => {
      const k = d.product_id ? d.product_id : `manual:${d.manual_sku || d.manual_name}`;
      return k === g.group_key || (g.product_id_text && d.product_id === g.product_id_text);
    });
    setGroupRows(matching);
  };

  const startEdit = (r: DetailRow) => {
    setEditingId(r.id);
    setEditStatus(r.status);
    setEditResponse(r.admin_response || "");
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase.from("stock_shortage_requests" as any)
      .update({
        status: editStatus,
        admin_response: editResponse.trim() || null,
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", editingId);
    setSaving(false);
    if (error) {
      toast({ title: "فشل الحفظ", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "✅ تم تحديث الحالة — هيوصل إشعار للموظف" });
    setEditingId(null);
    await fetchAll();
    if (openGroup) {
      // refresh group rows
      setTimeout(() => openGroupDetails(openGroup), 300);
    }
  };

  return (
    <Card className="p-5 space-y-5">
      {/* Header + filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center shadow">
            <PackageX className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground">تقرير الأصناف الناقصة</h2>
            <p className="text-xs text-muted-foreground">الموظفون بلّغوا عن الأصناف دي ومحتاجين توفيرها — مرتّبة بالأهمية</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={preset} onValueChange={(v) => applyPreset(v as RangePreset)}>
            <SelectTrigger className="w-36 h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="7">آخر أسبوع</SelectItem>
              <SelectItem value="30">آخر شهر</SelectItem>
              <SelectItem value="90">آخر 3 شهور</SelectItem>
              <SelectItem value="365">آخر سنة</SelectItem>
              <SelectItem value="custom">📅 فترة مخصصة</SelectItem>
            </SelectContent>
          </Select>

          {preset === "custom" && (
            <>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-1.5 font-normal">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    من: {format(fromDate, "dd MMM yyyy", { locale: ar })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fromDate}
                    onSelect={(d) => d && setFromDate(d)}
                    disabled={(d) => d > toDate || d > new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="h-9 gap-1.5 font-normal">
                    <CalendarIcon className="w-3.5 h-3.5" />
                    إلى: {format(toDate, "dd MMM yyyy", { locale: ar })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={toDate}
                    onSelect={(d) => d && setToDate(d)}
                    disabled={(d) => d < fromDate || d > new Date()}
                    initialFocus
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </>
          )}

          <Badge variant="outline" className="text-[11px] h-7 px-2">
            {Math.max(1, Math.ceil((toDate.getTime() - fromDate.getTime()) / (1000 * 60 * 60 * 24)))} يوم
          </Badge>
          <Button size="sm" variant="outline" onClick={fetchAll} className="gap-1.5 h-9">
            <RefreshCw className="w-3.5 h-3.5" />
            تحديث
          </Button>
        </div>
      </div>

      {/* KPIs — كل كارت قابل للضغط ويعمل كفلتر */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Kpi
          label="أصناف مطلوبة"
          value={totals.items}
          icon={PackageX}
          color="from-rose-500 to-red-600"
          active={activeTab === "priority"}
          onClick={() => { setActiveTab("priority"); setStatusFilter("all"); }}
          hint="ترتيب الأهمية"
        />
        <Kpi
          label="إجمالي البلاغات"
          value={totals.reports}
          icon={BarChart3}
          color="from-amber-500 to-orange-600"
          active={activeTab === "all" && statusFilter === "all"}
          onClick={() => { setActiveTab("all"); setStatusFilter("all"); }}
          hint="كل البلاغات"
        />
        <Kpi
          label="مفتوح + جارٍ التوفير"
          value={details.filter(d => d.status === "open" || d.status === "sourcing").length}
          icon={ArrowUpDown}
          color="from-blue-500 to-indigo-600"
          active={activeTab === "all" && (statusFilter === "open" || statusFilter === "sourcing")}
          onClick={() => { setActiveTab("all"); setStatusFilter("open"); }}
          hint="محتاج شغل"
        />
        <Kpi
          label="تم التوفير"
          value={details.filter(d => d.status === "fulfilled").length}
          icon={Users}
          color="from-emerald-500 to-teal-600"
          active={activeTab === "all" && statusFilter === "fulfilled"}
          onClick={() => { setActiveTab("all"); setStatusFilter("fulfilled"); }}
          hint="اللي تم توفيره"
        />
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "priority" | "all")}>

        <div className="flex items-center justify-between gap-2 flex-wrap">
          <TabsList>
            <TabsTrigger value="priority" className="gap-1.5"><Flame className="w-4 h-4" />الأهمية</TabsTrigger>
            <TabsTrigger value="all" className="gap-1.5"><BarChart3 className="w-4 h-4" />كل البلاغات</TabsTrigger>
          </TabsList>
          <Button
            type="button"
            size="sm"
            variant={showFulfilled ? "default" : "outline"}
            className="h-8 text-xs gap-1.5"
            onClick={() => setShowFulfilled(v => !v)}
          >
            {showFulfilled ? "إخفاء اللي تم توفيره" : "إظهار اللي تم توفيره"}
          </Button>
        </div>

        {/* Priority Report */}
        <TabsContent value="priority" className="space-y-2 mt-4">
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : visiblePriority.length === 0 ? (
            <p className="text-center text-muted-foreground py-10 text-sm">
              {priority.length === 0 ? "مفيش بلاغات في الفترة دي" : "كل الأصناف تم توفيرها 🎉"}
            </p>
          ) : (
            visiblePriority.map((row, idx) => {
              const staffCount = Number(row.unique_staff_count);
              const score = Math.round(Number(row.priority_score));
              const intensity = Math.min(100, staffCount * 20);
              // تصنيف بصري حسب عدد الموظفين اللي بلّغوا
              const tier =
                staffCount >= 5 ? { label: "حرج 🔥", cls: "from-rose-600 to-red-700 text-white", ring: "ring-rose-500/40" } :
                staffCount >= 3 ? { label: "عالي ⚠️", cls: "from-amber-500 to-orange-600 text-white", ring: "ring-amber-400/40" } :
                staffCount >= 2 ? { label: "متوسط", cls: "from-yellow-400 to-amber-500 text-amber-950", ring: "ring-yellow-400/30" } :
                                  { label: "منخفض", cls: "from-slate-200 to-slate-300 text-slate-700 dark:from-slate-700 dark:to-slate-800 dark:text-slate-200", ring: "ring-slate-300/30" };
              return (
                <div key={row.group_key} className={cn("border rounded-lg p-3 hover:border-primary/40 transition-colors bg-card ring-1", tier.ring)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className={cn("w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold shrink-0",
                          idx < 3 ? "bg-gradient-to-br from-rose-500 to-amber-500 text-white" : "bg-muted text-muted-foreground")}>
                          {idx + 1}
                        </span>
                        <p className="font-semibold text-sm text-foreground">{row.name_ar || "—"}</p>
                        <span dir="ltr" className="text-xs font-mono text-muted-foreground">{row.sku || "—"}</span>
                        {!row.product_id_text && <Badge variant="outline" className="text-[10px] h-4">يدوي</Badge>}
                        <Badge className={cn("text-[10px] h-5 bg-gradient-to-br border-0", tier.cls)}>{tier.label}</Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs flex-wrap">
                        <span className="flex items-center gap-1 font-bold text-blue-600 dark:text-blue-400">
                          <Users className="w-3.5 h-3.5" />{staffCount} موظف بلّغ
                        </span>
                        <span>•</span>
                        <span><b>{row.reports_count}</b> بلاغ</span>
                        <span>•</span>
                        <span>كمية: <b>{row.total_quantity}</b></span>
                        {Number(row.unique_customers_count) > 0 && (
                          <><span>•</span><span><b>{row.unique_customers_count}</b> عميل</span></>
                        )}
                        <span className="text-muted-foreground">• score: {score}</span>
                      </div>
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {Number(row.open_count) > 0 && <Badge className={STATUS_META.open.color + " text-[10px]"}>مفتوح: {row.open_count}</Badge>}
                        {Number(row.sourcing_count) > 0 && <Badge className={STATUS_META.sourcing.color + " text-[10px]"}>جارٍ: {row.sourcing_count}</Badge>}
                        {Number(row.fulfilled_count) > 0 && <Badge className={STATUS_META.fulfilled.color + " text-[10px]"}>تم: {row.fulfilled_count}</Badge>}
                        {Number(row.rejected_count) > 0 && <Badge className={STATUS_META.rejected.color + " text-[10px]"}>مرفوض: {row.rejected_count}</Badge>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className={cn("text-center rounded-lg px-3 py-1.5 bg-gradient-to-br shadow-sm", tier.cls)}>
                        <div className="text-2xl font-bold tabular-nums leading-none">{staffCount}</div>
                        <div className="text-[10px] -mt-0.5 opacity-90">موظف</div>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => openGroupDetails(row)}>
                        <Eye className="w-3 h-3" />التفاصيل
                      </Button>
                    </div>
                  </div>
                  {/* شريط شدّة بناءً على عدد الموظفين (5+ = full) */}
                  <div className="mt-2 h-1 bg-muted rounded-full overflow-hidden">
                    <div className={cn("h-full bg-gradient-to-r", tier.cls)} style={{ width: `${intensity}%` }} />
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>

        {/* All requests list */}
        <TabsContent value="all" className="space-y-3 mt-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm">حالة:</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <SelectTrigger className="w-40 h-8"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                {(["open", "sourcing", "fulfilled", "rejected"] as StatusKey[]).map(k => (
                  <SelectItem key={k} value={k}>{STATUS_META[k].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-xs text-muted-foreground">({filteredDetails.length} بلاغ)</span>
          </div>

          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : filteredDetails.length === 0 ? (
            <p className="text-center text-muted-foreground py-10 text-sm">مفيش بلاغات</p>
          ) : (
            <div className="space-y-2">
              {filteredDetails.map(r => (
                <DetailCard key={r.id}
                  row={r}
                  isEditing={editingId === r.id}
                  editStatus={editStatus}
                  editResponse={editResponse}
                  setEditStatus={setEditStatus}
                  setEditResponse={setEditResponse}
                  onStartEdit={() => startEdit(r)}
                  onCancel={() => setEditingId(null)}
                  onSave={saveEdit}
                  saving={saving}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Group details dialog */}
      <Dialog open={!!openGroup} onOpenChange={(v) => !v && setOpenGroup(null)}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle>{openGroup?.name_ar} <span className="text-xs font-mono text-muted-foreground">({openGroup?.sku})</span></DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh]">
            <div className="space-y-2 p-1">
              {groupRows.map(r => (
                <DetailCard key={r.id}
                  row={r}
                  isEditing={editingId === r.id}
                  editStatus={editStatus}
                  editResponse={editResponse}
                  setEditStatus={setEditStatus}
                  setEditResponse={setEditResponse}
                  onStartEdit={() => startEdit(r)}
                  onCancel={() => setEditingId(null)}
                  onSave={saveEdit}
                  saving={saving}
                />
              ))}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

function Kpi({ label, value, icon: Icon, color, active, onClick, hint }: { label: string; value: number; icon: any; color: string; active?: boolean; onClick?: () => void; hint?: string }) {
  const clickable = !!onClick;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!clickable}
      className={cn(
        "rounded-xl p-3 text-white bg-gradient-to-br shadow-sm text-right transition-all",
        color,
        clickable && "cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]",
        active && "ring-2 ring-offset-2 ring-foreground/40 scale-[1.02]"
      )}
      title={hint}
    >
      <div className="flex items-center gap-1.5 text-[11px] opacity-90"><Icon className="w-3.5 h-3.5" />{label}</div>
      <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
      {hint && <p className="text-[10px] opacity-75 mt-0.5">{active ? "✓ مفعّل" : hint}</p>}
    </button>
  );
}

function DetailCard({ row, isEditing, editStatus, editResponse, setEditStatus, setEditResponse, onStartEdit, onCancel, onSave, saving }: any) {
  const M = STATUS_META[row.status as StatusKey];
  const name = row.product?.name_ar || row.manual_name || "—";
  const sku = row.product?.sku || row.manual_sku || "—";
  return (
    <div className="border rounded-lg p-3 bg-card">
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-sm">{row.staff_name}</p>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">{new Date(row.created_at).toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
          </div>
          <div className="text-xs text-muted-foreground mt-1 flex gap-2 flex-wrap">
            <span className="font-medium text-foreground">{name}</span>
            {sku !== "—" && <><span>•</span><span dir="ltr" className="font-mono">{sku}</span></>}
            <span>•</span>
            <span>كمية: <b className="text-foreground">{row.requested_quantity}</b></span>
            {row.customer_note && <><span>•</span><span>عميل: {row.customer_note}</span></>}
          </div>
        </div>
        <Badge className={cn("text-[10px]", M.color)}>{M.label}</Badge>
      </div>

      {isEditing ? (
        <div className="space-y-2 border-t pt-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs">الحالة الجديدة (يدوي)</Label>
              <Select value={editStatus} onValueChange={(v) => setEditStatus(v as StatusKey)}>
                <SelectTrigger className="h-9 bg-background"><SelectValue placeholder="اختر الحالة" /></SelectTrigger>
                <SelectContent className="z-[100] bg-popover" position="popper" sideOffset={4}>
                  <SelectItem value="open">🟡 مفتوح — لسه بيتراجع</SelectItem>
                  <SelectItem value="sourcing">🔵 جارٍ التوفير — بنشتغل عليه</SelectItem>
                  <SelectItem value="fulfilled">🟢 تم التوفير — متاح دلوقتي</SelectItem>
                  <SelectItem value="rejected">🔴 مرفوض — مش هيتوفر</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground mt-1">
                💡 ملاحظة: الحالة بتتحدّث تلقائياً لـ"تم التوفير" لما الفيصل يرجّع رصيد كافي
              </p>
            </div>
          </div>
          <div>
            <Label className="text-xs">رد الإدارة (اختياري — هيوصل للموظف)</Label>
            <Textarea value={editResponse} onChange={(e) => setEditResponse(e.target.value)} rows={2} placeholder="مثال: متوقع التوفير خلال أسبوع" />
          </div>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="outline" onClick={onCancel}>إلغاء</Button>
            <Button size="sm" onClick={onSave} disabled={saving} className="gap-1">
              {saving && <Loader2 className="w-3 h-3 animate-spin" />}حفظ
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex justify-between items-center">
          {row.admin_response && (
            <p className="text-xs bg-muted/50 rounded p-2 border-r-2 border-primary flex-1">
              <b>رد الإدارة:</b> {row.admin_response}
            </p>
          )}
          <Button size="sm" variant="outline" className="h-7 text-xs ms-auto" onClick={onStartEdit}>تغيير الحالة</Button>
        </div>
      )}
    </div>
  );
}
