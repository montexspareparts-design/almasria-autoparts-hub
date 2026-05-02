import { useEffect, useMemo, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Package, PackageX, Loader2, Clock, RefreshCw, CheckCircle2,
  XCircle, User, Search, Users, Sparkles, Star, PackageCheck,
  Trophy, TrendingUp, Calendar, Zap, Eye, Check,
} from "lucide-react";
import { cn } from "@/lib/utils";

type StatusKey = "open" | "sourcing" | "fulfilled" | "rejected";
type DateFilter = "all" | "today" | "yesterday" | "week";

const DATE_FILTER_META: Record<DateFilter, { label: string; icon: typeof Calendar }> = {
  all:       { label: "كل الفترات", icon: Calendar },
  today:     { label: "النهاردة",   icon: Zap },
  yesterday: { label: "إمبارح",     icon: Clock },
  week:      { label: "آخر أسبوع",  icon: TrendingUp },
};

interface Row {
  id: string;
  product_id: string | null;
  manual_sku: string | null;
  manual_name: string | null;
  requested_quantity: number;
  customer_note: string | null;
  status: StatusKey;
  admin_response: string | null;
  created_at: string;
  reviewed_at: string | null;
  staff_user_id: string;
  product?: { sku: string; name_ar: string } | null;
}

const STATUS_META: Record<StatusKey, { label: string; cls: string; icon: typeof Clock; dot: string }> = {
  open:      { label: "مفتوح",       cls: "bg-amber-50 text-amber-700 border-amber-200",       icon: Clock,        dot: "bg-amber-500" },
  sourcing:  { label: "جارٍ التوفير", cls: "bg-sky-50 text-sky-700 border-sky-200",             icon: RefreshCw,    dot: "bg-sky-500" },
  fulfilled: { label: "تم التوفير",  cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2, dot: "bg-emerald-500" },
  rejected:  { label: "مرفوض",       cls: "bg-rose-50 text-rose-700 border-rose-200",          icon: XCircle,      dot: "bg-rose-500" },
};

export default function TeamShortagesView() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [staffMap, setStaffMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<StatusKey | "all" | "arrived">("open");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [q, setQ] = useState("");
  const [erpStockFetchedAt, setErpStockFetchedAt] = useState<string | null>(null);
  const [manualSyncing, setManualSyncing] = useState(false);

  // الأصناف اللي الموظف شافها وأقرّ إنه استلم الإشعار (محلي لكل موظف)
  const ackKey = user?.id ? `shortages_ack_${user.id}` : "shortages_ack_anon";
  const [acknowledgedIds, setAcknowledgedIds] = useState<Set<string>>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(ackKey) : null;
      return new Set(raw ? JSON.parse(raw) : []);
    } catch { return new Set(); }
  });
  const acknowledgeRow = useCallback((id: string) => {
    setAcknowledgedIds(prev => {
      const next = new Set(prev);
      next.add(id);
      try { localStorage.setItem(ackKey, JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
  }, [ackKey]);

  const fetchRows = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from("stock_shortage_requests" as any)
      .select("id,product_id,manual_sku,manual_name,requested_quantity,customer_note,status,admin_response,created_at,reviewed_at,staff_user_id,product:products(sku,name_ar)")
      .order("created_at", { ascending: false })
      .limit(500);
    const list = (data as any as Row[]) || [];
    setRows(list);

    // Fetch profile names for all unique staff_user_id (عبر RPC آمنة تشمل reporters)
    const ids = Array.from(new Set(list.map(r => r.staff_user_id).filter(Boolean)));
    if (ids.length > 0) {
      const { data: profs, error: rpcErr } = await supabase.rpc(
        "get_staff_display_names" as any,
        { _user_ids: ids }
      );
      const m: Record<string, string> = {};
      if (!rpcErr && profs) {
        (profs as any[]).forEach((p: any) => {
          m[p.user_id] = (p.full_name || "زميل").trim() || "زميل";
        });
      }
      // fallback: لأي ID مش راجع — حط placeholder
      ids.forEach(id => { if (!m[id]) m[id] = "زميل"; });
      setStaffMap(m);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchRows(); }, [fetchRows]);

  // اجلب آخر وقت مزامنة من ميتا كاش الفيصل
  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("erp_full_catalog_meta" as any)
        .select("last_synced_at")
        .eq("id", 1)
        .maybeSingle();
      if (data && (data as any).last_synced_at) {
        setErpStockFetchedAt((data as any).last_synced_at);
      }
    })();
  }, [rows.length, manualSyncing]);

  // مزامنة يدوية: الموظف يدوس "افحص دلوقتي" بدل ما يستنى الساعة الجاية
  const runManualSync = useCallback(async () => {
    if (manualSyncing) return;
    setManualSyncing(true);
    try {
      const { data, error } = await supabase.functions.invoke("auto-fulfill-shortages-from-erp", { body: { forceRefresh: true } });
      if (error) throw error;
      const fulfilled = Number((data as any)?.fulfilled_count ?? (data as any)?.fulfilled ?? 0);
      const checked   = Number((data as any)?.checked_count   ?? (data as any)?.checked   ?? 0);
      if (fulfilled > 0) {
        toast({
          title: `🎉 تم توفير ${fulfilled} صنف!`,
          description: "البلاغات اتنقلت لـ«تم التوفير» — اتفرّج على القائمة.",
        });
      } else {
        toast({
          title: "✓ تمت المزامنة",
          description: checked > 0
            ? `اتفحص ${checked} بلاغ — لسه مفيش رصيد كافي في الفيصل.`
            : "مفيش بلاغات مفتوحة محتاجة فحص دلوقتي.",
        });
      }
      await fetchRows();
    } catch (e: any) {
      toast({
        title: "تعذّر تشغيل المزامنة",
        description: e?.message || "حاول تاني بعد شوية",
        variant: "destructive",
      });
    } finally {
      setManualSyncing(false);
    }
  }, [manualSyncing, toast, fetchRows]);

  // Realtime — أي تغيير على أي بلاغ يحدّث الشاشة لكل الموظفين
  useEffect(() => {
    const ch = supabase
      .channel("team-shortages-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "stock_shortage_requests" }, () => fetchRows())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [fetchRows]);

  const counts = useMemo(() => {
    const c: Record<StatusKey | "all" | "arrived", number> = { all: rows.length, open: 0, sourcing: 0, fulfilled: 0, rejected: 0, arrived: 0 };
    rows.forEach(r => {
      c[r.status] = (c[r.status] || 0) + 1;
      if (r.status === "fulfilled") c.arrived += 1;
    });
    return c;
  }, [rows]);

  const dateRange = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (dateFilter === "today") {
      return { from: startOfToday, to: null as Date | null };
    }
    if (dateFilter === "yesterday") {
      const startYesterday = new Date(startOfToday); startYesterday.setDate(startYesterday.getDate() - 1);
      return { from: startYesterday, to: startOfToday };
    }
    if (dateFilter === "week") {
      const start7 = new Date(startOfToday); start7.setDate(start7.getDate() - 6);
      return { from: start7, to: null };
    }
    return { from: null, to: null };
  }, [dateFilter]);

  const filtered = useMemo(() => {
    let list: Row[];
    if (tab === "all") list = rows;
    else if (tab === "arrived") list = rows.filter(r => r.status === "fulfilled");
    else list = rows.filter(r => r.status === tab);

    // فلترة بالتاريخ — نستخدم reviewed_at للأصناف اللي وصلت، created_at للباقي
    if (dateRange.from) {
      list = list.filter(r => {
        const ref = (tab === "arrived" || r.status === "fulfilled") && r.reviewed_at
          ? new Date(r.reviewed_at)
          : new Date(r.created_at);
        if (dateRange.to) return ref >= dateRange.from! && ref < dateRange.to;
        return ref >= dateRange.from!;
      });
    }

    if (q.trim()) {
      const s = q.trim().toLowerCase();
      list = list.filter(r => {
        const name = (r.manual_name || r.product?.name_ar || "").toLowerCase();
        const sku  = (r.manual_sku || r.product?.sku || "").toLowerCase();
        const who  = (staffMap[r.staff_user_id] || "").toLowerCase();
        return name.includes(s) || sku.includes(s) || who.includes(s);
      });
    }
    return list;
  }, [rows, tab, q, staffMap, dateRange]);

  const uniqueStaff = useMemo(() => new Set(rows.map(r => r.staff_user_id)).size, [rows]);
  const arrivedToday = useMemo(() => {
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    return rows.filter(r => r.status === "fulfilled" && r.reviewed_at && new Date(r.reviewed_at) >= startOfToday).length;
  }, [rows]);

  return (
    <div className="space-y-4" dir="rtl">
      {/* Hero — premium gradient + KPI strip */}
      <Card className="relative overflow-hidden p-0 border-0 shadow-xl">
        {/* deep gradient backdrop */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600" />
        <div className="absolute inset-0 opacity-30 bg-[radial-gradient(circle_at_top_right,white,transparent_55%)]" />
        <div className="absolute -bottom-10 -right-10 w-48 h-48 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="absolute -top-12 -left-12 w-56 h-56 rounded-full bg-cyan-300/20 blur-3xl" />

        <div className="relative p-5 sm:p-6 text-white">
          <div className="flex items-start gap-4">
            <motion.div
              initial={{ rotate: -8, scale: 0.9 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15 }}
              className="w-14 h-14 rounded-2xl bg-white/15 backdrop-blur-sm grid place-items-center shadow-lg shrink-0 ring-1 ring-white/20"
            >
              <Trophy className="w-7 h-7 text-amber-300" />
            </motion.div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-extrabold leading-tight tracking-tight">
                  لوحة الفريق — الأصناف الناقصة
                </h2>
                <Badge className="bg-amber-400 text-amber-950 border-0 text-[10px] font-bold gap-1 hover:bg-amber-300">
                  <Sparkles className="w-3 h-3" /> LIVE
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-white/80 mt-1 leading-snug">
                كل بلاغ بيتسجل هنا = فرصة بيع ضايعة بنحاول نرجّعها. كل ما تبلّغ أكتر، الإدارة بتعرف توفّر أسرع 💪
              </p>
            </div>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 mt-4">
            <div className="rounded-xl bg-white/10 backdrop-blur-sm ring-1 ring-white/15 p-2.5 sm:p-3">
              <div className="text-[10px] text-white/70 mb-0.5">إجمالي البلاغات</div>
              <div className="text-2xl sm:text-3xl font-extrabold tabular-nums leading-none">{rows.length}</div>
              <div className="text-[10px] text-white/60 mt-1">من {uniqueStaff} موظف</div>
            </div>
            <motion.div
              key={arrivedToday}
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="rounded-xl bg-emerald-400/20 backdrop-blur-sm ring-1 ring-emerald-300/40 p-2.5 sm:p-3"
            >
              <div className="text-[10px] text-emerald-100 mb-0.5 flex items-center gap-1">
                <PackageCheck className="w-3 h-3" /> وصلت النهاردة
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold tabular-nums leading-none text-emerald-50">{arrivedToday}</div>
              <div className="text-[10px] text-emerald-100/80 mt-1">جاهزة للبيع 🎯</div>
            </motion.div>
            <div className="rounded-xl bg-amber-400/20 backdrop-blur-sm ring-1 ring-amber-300/40 p-2.5 sm:p-3">
              <div className="text-[10px] text-amber-100 mb-0.5 flex items-center gap-1">
                <Clock className="w-3 h-3" /> مفتوحة
              </div>
              <div className="text-2xl sm:text-3xl font-extrabold tabular-nums leading-none text-amber-50">{counts.open}</div>
              <div className="text-[10px] text-amber-100/80 mt-1">تحت المتابعة</div>
            </div>
          </div>
        </div>
      </Card>

      {/* Auto-sync banner + manual trigger */}
      <div className="rounded-xl border border-sky-200 dark:border-sky-800/60 bg-gradient-to-l from-sky-50 to-emerald-50 dark:from-sky-950/30 dark:to-emerald-950/20 p-3 flex items-start gap-2.5 text-xs shadow-sm">
        <RefreshCw className={cn("w-4 h-4 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5", manualSyncing ? "animate-spin" : "animate-[spin_4s_linear_infinite]")} />
        <div className="flex-1 leading-relaxed min-w-0">
          <span className="font-semibold text-sky-800 dark:text-sky-300">مزامنة تلقائية كل ساعة من الفيصل</span>
          <span className="text-muted-foreground"> — لما رصيد الصنف يزيد في الفيصل، البلاغ ينتقل لـ </span>
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">«وصل المخزن»</span>
          <span className="text-muted-foreground"> وهيوصل إشعار فوري للموظف اللي طلبه.</span>
          {erpStockFetchedAt && (
            <span className="block text-[10px] text-muted-foreground mt-0.5">
              آخر مزامنة: {new Date(erpStockFetchedAt).toLocaleString("ar-EG", { hour: "numeric", minute: "2-digit", day: "numeric", month: "short" })}
            </span>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          disabled={manualSyncing}
          onClick={runManualSync}
          className="h-8 px-2.5 gap-1.5 shrink-0 border-sky-300 dark:border-sky-700 bg-white/80 dark:bg-sky-950/40 hover:bg-white text-sky-700 dark:text-sky-300 text-[11px] font-semibold"
          title="افحص الفيصل دلوقتي — لو فيه أي توافر، البلاغات هتتنقل لـ«وصل المخزن»"
        >
          {manualSyncing ? (
            <><Loader2 className="w-3.5 h-3.5 animate-spin" /> جاري الفحص…</>
          ) : (
            <><Sparkles className="w-3.5 h-3.5" /> افحص دلوقتي</>
          )}
        </Button>
      </div>

      {/* Filters bar */}
      <Card className="p-3 sm:p-4 space-y-3">
        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="w-full grid grid-cols-3 sm:grid-cols-6 h-auto p-1 bg-muted/40 gap-1">
            <TabsTrigger value="all" className="flex-col gap-0.5 py-1.5 text-[11px] data-[state=active]:bg-background">
              الكل
              <Badge variant="secondary" className="h-4 min-w-[20px] px-1 text-[10px]">{counts.all}</Badge>
            </TabsTrigger>
            {(["open","sourcing","fulfilled","rejected"] as StatusKey[]).map((k) => {
              const m = STATUS_META[k];
              const Icon = m.icon;
              return (
                <TabsTrigger key={k} value={k} className="flex-col gap-0.5 py-1.5 text-[11px] data-[state=active]:bg-background">
                  <span className="flex items-center gap-1">
                    <Icon className="w-3 h-3" />
                    {m.label}
                  </span>
                  <Badge variant="secondary" className="h-4 min-w-[20px] px-1 text-[10px]">{counts[k]}</Badge>
                </TabsTrigger>
              );
            })}
            {/* تبويب جديد: وصلت المخزن */}
            <TabsTrigger
              value="arrived"
              className={cn(
                "flex-col gap-0.5 py-1.5 text-[11px] relative",
                "data-[state=active]:bg-gradient-to-br data-[state=active]:from-emerald-500 data-[state=active]:to-teal-600",
                "data-[state=active]:text-white data-[state=active]:shadow-md",
                "border border-emerald-200/70 dark:border-emerald-800/40"
              )}
            >
              <span className="flex items-center gap-1">
                <PackageCheck className="w-3 h-3" />
                وصلت المخزن
              </span>
              <Badge
                variant="secondary"
                className={cn(
                  "h-4 min-w-[20px] px-1 text-[10px]",
                  "data-[state=active]:bg-white/20"
                )}
              >
                {counts.arrived}
              </Badge>
              {arrivedToday > 0 && (
                <span className="absolute -top-1 -left-1 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-background animate-pulse" />
              )}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* فلتر التاريخ */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] text-muted-foreground inline-flex items-center gap-1 font-semibold ms-1">
            <Calendar className="w-3 h-3" /> الفترة:
          </span>
          {(Object.keys(DATE_FILTER_META) as DateFilter[]).map((key) => {
            const m = DATE_FILTER_META[key];
            const Icon = m.icon;
            const active = dateFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setDateFilter(key)}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] border transition-all",
                  active
                    ? "bg-gradient-to-l from-indigo-500 to-violet-600 text-white border-transparent shadow-sm font-semibold scale-[1.02]"
                    : "bg-background text-muted-foreground border-border hover:border-indigo-300 hover:text-indigo-700"
                )}
              >
                <Icon className="w-3 h-3" />
                {m.label}
              </button>
            );
          })}
        </div>

        <div className="relative">
          <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="ابحث باسم الصنف، SKU، أو اسم الموظف…"
            className="pr-9 h-10 text-sm"
          />
        </div>
      </Card>

      {/* List */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="p-12 grid place-items-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 grid place-items-center text-center gap-2 text-muted-foreground">
            {tab === "arrived" ? (
              <>
                <PackageCheck className="w-12 h-12 opacity-30 text-emerald-500" />
                <p className="text-sm font-semibold text-foreground">لسه مفيش أصناف وصلت في الفترة دي</p>
                <p className="text-[11px]">جرّب فترة تانية، أو اضغط «افحص دلوقتي» لو تأكدت إن الفيصل اتحدث</p>
              </>
            ) : (
              <>
                <PackageX className="w-12 h-12 opacity-30" />
                <p className="text-sm">{q ? "مفيش نتائج للبحث ده" : "مفيش بلاغات في القسم ده"}</p>
              </>
            )}
          </div>
        ) : (
          <ScrollArea className="max-h-[65vh]">
            <ul className="divide-y divide-border">
              <AnimatePresence initial={false}>
                {filtered.map((r) => {
                  const meta = STATUS_META[r.status];
                  const Icon = meta.icon;
                  const name = r.manual_name || r.product?.name_ar || "—";
                  const sku  = r.manual_sku || r.product?.sku || "";
                  const who  = staffMap[r.staff_user_id] || "زميل";
                  const isMine = r.staff_user_id === user?.id;
                  return (
                    <motion.li
                      key={r.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className={cn(
                        "p-3 sm:p-4 transition-colors relative",
                        // الأصناف اللي وصلت بتاخد تصميم احتفالي خاص
                        r.status === "fulfilled"
                          ? "bg-gradient-to-l from-emerald-50/80 via-emerald-50/30 to-transparent dark:from-emerald-950/20 dark:via-emerald-950/10 hover:from-emerald-100/60"
                          : isMine
                            ? "bg-gradient-to-l from-primary/10 via-primary/5 to-transparent border-r-4 border-primary hover:from-primary/15"
                            : "hover:bg-muted/30"
                      )}
                    >
                      {/* "بتاعي" ribbon */}
                      {isMine && r.status !== "fulfilled" && (
                        <div className="absolute top-2 left-2 inline-flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          بلاغك
                        </div>
                      )}

                      {/* === تصميم خاص: صنف وصل المخزن === */}
                      {r.status === "fulfilled" ? (
                        <div className="space-y-2.5">
                          {/* شريط علوي: شارة "وصل" + الموظف + التاريخ */}
                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <motion.div
                              initial={{ scale: 0.8 }}
                              animate={{ scale: 1 }}
                              className="inline-flex items-center gap-1.5 bg-gradient-to-l from-emerald-500 to-teal-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow-md"
                            >
                              <PackageCheck className="w-3.5 h-3.5" />
                              وصل المخزن
                            </motion.div>
                            <span className="text-[10px] text-emerald-700/80 dark:text-emerald-400/80 tabular-nums font-semibold">
                              {r.reviewed_at
                                ? new Date(r.reviewed_at).toLocaleString("ar-EG", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                                : new Date(r.created_at).toLocaleString("ar-EG", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                            </span>
                          </div>

                          {/* الكارت الرئيسي: اسم + SKU + كمية */}
                          <div className="rounded-2xl bg-white dark:bg-emerald-950/30 border-2 border-emerald-200 dark:border-emerald-800/60 p-3.5 shadow-sm">
                            <div className="grid grid-cols-[1fr_auto] gap-3 items-center">
                              {/* العمود الأيمن: اسم + SKU */}
                              <div className="min-w-0 space-y-2">
                                {/* اسم الصنف — كبير وواضح */}
                                <h4 className="font-extrabold text-base sm:text-lg leading-tight text-foreground line-clamp-2">
                                  {name}
                                </h4>
                                {/* بارت نمبر */}
                                {sku && (
                                  <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1">
                                    <span className="text-[9px] text-muted-foreground uppercase tracking-wide font-semibold">P/N</span>
                                    <span className="text-sm font-mono font-bold text-foreground tracking-wider tabular-nums">{sku}</span>
                                  </div>
                                )}
                              </div>

                              {/* العمود الأيسر: الكمية بشكل ضخم */}
                              <motion.div
                                initial={{ scale: 0.85, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.05 }}
                                className="relative shrink-0"
                              >
                                <div className="w-[88px] sm:w-[100px] rounded-2xl bg-gradient-to-br from-emerald-400 via-emerald-500 to-teal-600 text-white shadow-lg ring-2 ring-emerald-200 dark:ring-emerald-800 p-2 grid place-items-center text-center">
                                  <div className="text-[9px] font-bold opacity-90 leading-none mb-0.5">الكمية وصلت</div>
                                  <div className="text-3xl sm:text-4xl font-black leading-none tabular-nums drop-shadow-sm">
                                    {r.requested_quantity}
                                  </div>
                                  <div className="text-[9px] opacity-90 leading-none mt-0.5">قطعة جاهزة</div>
                                </div>
                                {/* نقطة نبض */}
                                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-white animate-ping" />
                                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 ring-2 ring-white" />
                              </motion.div>
                            </div>

                            {/* ملاحظة الأدمن لو موجودة */}
                            {r.admin_response && (
                              <p className="mt-3 text-xs text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-lg px-2.5 py-1.5 line-clamp-2">
                                📌 {r.admin_response}
                              </p>
                            )}

                            {/* فوتر: مين طلب الصنف */}
                            <div className="mt-3 pt-2.5 border-t border-emerald-100 dark:border-emerald-800/40 flex items-center gap-1.5 flex-wrap">
                              <span className={cn(
                                "inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full",
                                isMine
                                  ? "bg-primary/15 text-primary border border-primary/30 font-bold"
                                  : "bg-slate-100 dark:bg-slate-800/60 text-foreground/70 border border-slate-200 dark:border-slate-700"
                              )}>
                                <User className="w-3 h-3" />
                                {isMine ? "🎉 صنف بلّغت عنه — جاهز للبيع!" : `طلبه: ${who}`}
                              </span>
                              {r.customer_note && (
                                <span className="text-[10px] text-muted-foreground bg-muted/40 rounded-md px-2 py-0.5 line-clamp-1 flex-1 min-w-0">
                                  💬 {r.customer_note}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* === التصميم العادي للحالات الأخرى === */
                        <div className="flex items-start gap-3">
                          {/* Status dot */}
                          <div className={cn("w-2 h-2 rounded-full mt-2 shrink-0 ring-2 ring-background", meta.dot)} />

                          <div className="flex-1 min-w-0 space-y-1.5">
                            {/* Top row: name + qty */}
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <h4 className={cn(
                                "font-semibold text-sm leading-tight line-clamp-2",
                                isMine ? "text-primary" : "text-foreground"
                              )}>
                                {name}
                              </h4>
                              <Badge variant="outline" className="shrink-0 text-[11px] gap-1">
                                <Package className="w-3 h-3" />
                                {r.requested_quantity}
                              </Badge>
                            </div>

                            {/* SKU */}
                            {sku && (
                              <div className="text-[11px] font-mono text-muted-foreground">
                                SKU: {sku}
                              </div>
                            )}

                            {/* Note */}
                            {r.customer_note && (
                              <p className="text-xs text-muted-foreground bg-muted/40 rounded-md px-2 py-1 line-clamp-2">
                                💬 {r.customer_note}
                              </p>
                            )}

                            {/* Admin response */}
                            {r.admin_response && (
                              <p className={cn(
                                "text-xs rounded-md px-2 py-1 line-clamp-2 border",
                                r.status === "rejected"  && "bg-rose-50 text-rose-700 border-rose-200",
                                r.status === "sourcing"  && "bg-sky-50 text-sky-700 border-sky-200",
                                r.status === "open"      && "bg-amber-50 text-amber-700 border-amber-200",
                              )}>
                                📌 {r.admin_response}
                              </p>
                            )}

                            {/* Footer: who + when + status */}
                            <div className="flex items-center gap-2 flex-wrap pt-1">
                              <span className={cn(
                                "inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border",
                                isMine
                                  ? "bg-primary/10 text-primary border-primary/30 font-semibold"
                                  : "bg-muted/60 text-foreground/80 border-border"
                              )}>
                                <User className="w-3 h-3" />
                                {isMine ? "أنت طلبت الصنف ده" : `موظف من فريق المبيعات (${who}) طلب الصنف ده`}
                              </span>
                              <Badge variant="outline" className={cn("text-[10px] gap-1 px-1.5 py-0", meta.cls)}>
                                <Icon className="w-2.5 h-2.5" />
                                {meta.label}
                              </Badge>
                              <span className="text-[10px] text-muted-foreground tabular-nums ms-auto">
                                {new Date(r.created_at).toLocaleDateString("ar-EG", { day: "2-digit", month: "short" })}
                                {" • "}
                                {new Date(r.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>
                        </div>
                      )}
                    </motion.li>
                  );
                })}
              </AnimatePresence>
            </ul>
          </ScrollArea>
        )}
      </Card>
    </div>
  );
}
