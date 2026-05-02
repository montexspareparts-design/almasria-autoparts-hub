import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Phone,
  MessageCircle,
  CheckCircle2,
  StickyNote,
  Target,
  Search,
  Calendar,
  User as UserIcon,
  Loader2,
  History,
  X,
} from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

type InteractionRow = {
  id: string;
  source: "task_handling" | "communication";
  customerUserId: string;
  staffUserId: string | null;
  staffName: string | null;
  action: "call" | "whatsapp" | "note" | "outcome" | "done" | string;
  note: string | null;
  at: string; // ISO
};

const ACTION_META: Record<
  string,
  { label: string; icon: any; color: string; bg: string }
> = {
  call: { label: "اتصال", icon: Phone, color: "text-blue-700 dark:text-blue-400", bg: "bg-blue-500/10 border-blue-400/30" },
  whatsapp: { label: "واتساب", icon: MessageCircle, color: "text-green-700 dark:text-green-400", bg: "bg-green-500/10 border-green-400/30" },
  note: { label: "ملاحظة", icon: StickyNote, color: "text-amber-700 dark:text-amber-400", bg: "bg-amber-500/10 border-amber-400/30" },
  outcome: { label: "نتيجة", icon: Target, color: "text-purple-700 dark:text-purple-400", bg: "bg-purple-500/10 border-purple-400/30" },
  done: { label: "تم", icon: CheckCircle2, color: "text-emerald-700 dark:text-emerald-400", bg: "bg-emerald-500/10 border-emerald-400/30" },
};

const todayISO = () => format(new Date(), "yyyy-MM-dd");
const daysAgoISO = (d: number) => {
  const dt = new Date();
  dt.setDate(dt.getDate() - d);
  return format(dt, "yyyy-MM-dd");
};

interface Props {
  /** Optional pre-filter to a single customer (for use inside a customer profile page) */
  customerUserId?: string;
}

export const InteractionsHistory = ({ customerUserId }: Props) => {
  const [dateFrom, setDateFrom] = useState<string>(daysAgoISO(7));
  const [dateTo, setDateTo] = useState<string>(todayISO());
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [hideEmpty, setHideEmpty] = useState(true);

  const fromTs = `${dateFrom}T00:00:00.000Z`;
  const toTs = `${dateTo}T23:59:59.999Z`;

  // Source 1: staff_task_handling (call/whatsapp/note/outcome/done with task_id = "<customerId>:<kind>")
  const { data: taskHandling, isLoading: l1 } = useQuery({
    queryKey: ["interactions_task_handling", dateFrom, dateTo, customerUserId],
    queryFn: async () => {
      let q = supabase
        .from("staff_task_handling")
        .select("id, task_id, staff_user_id, staff_name, action, note, created_at")
        .gte("created_at", fromTs)
        .lte("created_at", toTs)
        .order("created_at", { ascending: false })
        .limit(2000);
      const { data, error } = await q;
      if (error) throw error;
      return (data || []).filter((r: any) => {
        if (!customerUserId) return true;
        const cust = String(r.task_id || "").split(":")[0];
        return cust === customerUserId;
      });
    },
  });

  // Source 2: customer_communications (calls/whatsapp logged via the quick CRM bar)
  const { data: comms, isLoading: l2 } = useQuery({
    queryKey: ["interactions_comms", dateFrom, dateTo, customerUserId],
    queryFn: async () => {
      let q = supabase
        .from("customer_communications")
        .select("id, customer_user_id, staff_user_id, comm_type, note, created_at")
        .gte("created_at", fromTs)
        .lte("created_at", toTs)
        .order("created_at", { ascending: false })
        .limit(2000);
      if (customerUserId) q = q.eq("customer_user_id", customerUserId);
      const { data, error } = await q;
      if (error) throw error;
      return data || [];
    },
  });

  // Resolve staff & customer names in one pass
  const userIds = useMemo(() => {
    const ids = new Set<string>();
    (taskHandling || []).forEach((r: any) => {
      if (r.staff_user_id) ids.add(r.staff_user_id);
      const cust = String(r.task_id || "").split(":")[0];
      if (cust) ids.add(cust);
    });
    (comms || []).forEach((r: any) => {
      if (r.staff_user_id) ids.add(r.staff_user_id);
      if (r.customer_user_id) ids.add(r.customer_user_id);
    });
    return Array.from(ids);
  }, [taskHandling, comms]);

  const { data: profiles } = useQuery({
    queryKey: ["interactions_profiles", userIds.sort().join(",")],
    queryFn: async () => {
      if (userIds.length === 0) return [];
      const { data, error } = await supabase
        .from("profiles")
        .select("user_id, full_name, phone")
        .in("user_id", userIds);
      if (error) throw error;
      return data || [];
    },
    enabled: userIds.length > 0,
  });

  const profileMap = useMemo(
    () => new Map((profiles || []).map((p: any) => [p.user_id, p])),
    [profiles],
  );

  // Merge into a single interaction stream
  const rows: InteractionRow[] = useMemo(() => {
    const out: InteractionRow[] = [];
    (taskHandling || []).forEach((r: any) => {
      const cust = String(r.task_id || "").split(":")[0];
      out.push({
        id: `t:${r.id}`,
        source: "task_handling",
        customerUserId: cust,
        staffUserId: r.staff_user_id,
        staffName: r.staff_name || null,
        action: r.action,
        note: r.note,
        at: r.created_at,
      });
    });
    (comms || []).forEach((r: any) => {
      // Map comm_type -> action vocabulary
      const action =
        r.comm_type === "phone" || r.comm_type === "call"
          ? "call"
          : r.comm_type === "whatsapp"
            ? "whatsapp"
            : "note";
      out.push({
        id: `c:${r.id}`,
        source: "communication",
        customerUserId: r.customer_user_id,
        staffUserId: r.staff_user_id,
        staffName: null,
        action,
        note: r.note,
        at: r.created_at,
      });
    });
    return out.sort(
      (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime(),
    );
  }, [taskHandling, comms]);

  // Distinct staff names for the staff filter
  const staffOptions = useMemo(() => {
    const m = new Map<string, string>();
    rows.forEach((r) => {
      const name = r.staffName || profileMap.get(r.staffUserId || "")?.full_name;
      if (r.staffUserId && name) m.set(r.staffUserId, name);
    });
    return Array.from(m.entries()).map(([id, name]) => ({ id, name }));
  }, [rows, profileMap]);

  // Apply client-side filters
  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (actionFilter !== "all" && r.action !== actionFilter) return false;
      if (staffFilter !== "all" && r.staffUserId !== staffFilter) return false;
      if (term) {
        const cust = profileMap.get(r.customerUserId);
        const haystack = [
          r.note,
          r.staffName,
          cust?.full_name,
          cust?.phone,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(term)) return false;
      }
      return true;
    });
  }, [rows, actionFilter, staffFilter, search, profileMap]);

  // Quick counters per action (post-date-filter, pre-other-filters)
  const counters = useMemo(() => {
    const c = { call: 0, whatsapp: 0, done: 0, note: 0, outcome: 0 };
    rows.forEach((r) => {
      if (r.action in c) (c as any)[r.action] += 1;
    });
    return c;
  }, [rows]);

  const isLoading = l1 || l2;
  const setQuickRange = (days: number) => {
    setDateFrom(daysAgoISO(days));
    setDateTo(todayISO());
  };

  return (
    <div className="space-y-4">
      {/* Header summary */}
      <div className="rounded-2xl border border-border/60 bg-gradient-to-br from-primary/5 via-background to-background p-4">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-md">
            <History className="w-4 h-4 text-white" />
          </div>
          <div>
            <h3 className="text-sm font-black">سجل التفاعلات مع العملاء</h3>
            <p className="text-[10px] text-muted-foreground">
              من {format(new Date(dateFrom), "dd MMM yyyy", { locale: ar })} إلى {format(new Date(dateTo), "dd MMM yyyy", { locale: ar })}
            </p>
          </div>
        </div>

        {/* Quick counters */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {(["call", "whatsapp", "outcome", "note", "done"] as const).map((a) => {
            const meta = ACTION_META[a];
            const Icon = meta.icon;
            return (
              <div
                key={a}
                className={`rounded-xl border p-2.5 ${meta.bg} cursor-pointer transition-all hover:scale-105 ${actionFilter === a ? "ring-2 ring-offset-1 ring-primary/40" : ""}`}
                onClick={() => setActionFilter(actionFilter === a ? "all" : a)}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                  <span className={`text-[10px] font-black ${meta.color}`}>{meta.label}</span>
                </div>
                <p className="text-base font-black tabular-nums">{counters[a as keyof typeof counters]}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters bar */}
      <div className="rounded-xl border border-border/60 bg-card p-3 space-y-2.5">
        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[140px]">
            <label className="text-[10px] font-bold text-muted-foreground block mb-1">من تاريخ</label>
            <Input
              type="date"
              value={dateFrom}
              max={dateTo}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="flex-1 min-w-[140px]">
            <label className="text-[10px] font-bold text-muted-foreground block mb-1">إلى تاريخ</label>
            <Input
              type="date"
              value={dateTo}
              min={dateFrom}
              max={todayISO()}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          {staffOptions.length > 0 && !customerUserId && (
            <div className="flex-1 min-w-[140px]">
              <label className="text-[10px] font-bold text-muted-foreground block mb-1">الموظف</label>
              <Select value={staffFilter} onValueChange={setStaffFilter}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الموظفين</SelectItem>
                  {staffOptions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="flex-[2] min-w-[180px]">
            <label className="text-[10px] font-bold text-muted-foreground block mb-1">بحث</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث في الملاحظات أو اسم العميل أو موبايله"
                className="h-8 text-xs pr-8"
              />
            </div>
          </div>
        </div>

        {/* Quick date ranges */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] text-muted-foreground font-bold">سريع:</span>
          {[
            { label: "اليوم", d: 0 },
            { label: "أمس", d: 1 },
            { label: "آخر 7 أيام", d: 7 },
            { label: "آخر 30 يوم", d: 30 },
          ].map((r) => (
            <button
              key={r.label}
              type="button"
              onClick={() => setQuickRange(r.d)}
              className="text-[10px] font-bold px-2 py-1 rounded-md bg-muted hover:bg-primary/10 hover:text-primary border border-border/40 transition-colors"
            >
              <Calendar className="w-2.5 h-2.5 inline ml-1" />
              {r.label}
            </button>
          ))}
          {(actionFilter !== "all" || staffFilter !== "all" || search) && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] gap-1 mr-auto"
              onClick={() => { setActionFilter("all"); setStaffFilter("all"); setSearch(""); }}
            >
              <X className="w-3 h-3" />
              مسح الفلاتر
            </Button>
          )}
        </div>
      </div>

      {/* Result count */}
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span>
          <strong className="text-foreground font-black">{filtered.length}</strong> تفاعل
          {filtered.length !== rows.length && ` (من إجمالي ${rows.length})`}
        </span>
        {isLoading && (
          <span className="flex items-center gap-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            جاري التحميل...
          </span>
        )}
      </div>

      {/* Timeline */}
      {filtered.length === 0 && !isLoading ? (
        <div className="rounded-2xl border-2 border-dashed border-border/60 p-10 text-center">
          <History className="w-10 h-10 text-muted-foreground/40 mx-auto mb-3" />
          <p className="text-sm font-black text-foreground mb-1">لا توجد تفاعلات في هذه الفترة</p>
          <p className="text-[11px] text-muted-foreground">
            جرّب توسيع نطاق التاريخ أو إزالة الفلاتر.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((r) => {
            const meta = ACTION_META[r.action] || ACTION_META.note;
            const Icon = meta.icon;
            const customer = profileMap.get(r.customerUserId);
            const staffName = r.staffName || profileMap.get(r.staffUserId || "")?.full_name || "موظف";
            return (
              <div
                key={r.id}
                className={`rounded-xl border ${meta.bg} p-3 transition-all hover:shadow-sm`}
              >
                <div className="flex items-start gap-2.5">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-card/80 border ${meta.bg}`}>
                    <Icon className={`w-4 h-4 ${meta.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <Badge className={`text-[10px] h-5 font-black ${meta.bg} ${meta.color} border`}>
                        {meta.label}
                      </Badge>
                      <span className="text-[11px] font-black text-foreground truncate">
                        {customer?.full_name || "عميل غير معروف"}
                      </span>
                      {customer?.phone && (
                        <span className="text-[10px] text-muted-foreground tabular-nums" dir="ltr">
                          {customer.phone}
                        </span>
                      )}
                      <span className="text-[10px] text-muted-foreground mr-auto flex items-center gap-1">
                        <UserIcon className="w-2.5 h-2.5" />
                        {staffName}
                      </span>
                    </div>
                    {r.note && (
                      <p className="text-[12px] text-foreground/90 leading-relaxed bg-card/60 rounded-md p-2 border border-border/40 mt-1">
                        {r.note}
                      </p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1.5">
                      {format(new Date(r.at), "EEEE dd MMMM yyyy — h:mm a", { locale: ar })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default InteractionsHistory;
