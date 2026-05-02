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
  XCircle, User, Search, Users, Sparkles, Star,
} from "lucide-react";
import { cn } from "@/lib/utils";

type StatusKey = "open" | "sourcing" | "fulfilled" | "rejected";

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
  const [tab, setTab] = useState<StatusKey | "all">("open");
  const [q, setQ] = useState("");
  const [erpStockFetchedAt, setErpStockFetchedAt] = useState<string | null>(null);
  const [manualSyncing, setManualSyncing] = useState(false);

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
    const c: Record<StatusKey | "all", number> = { all: rows.length, open: 0, sourcing: 0, fulfilled: 0, rejected: 0 };
    rows.forEach(r => { c[r.status] = (c[r.status] || 0) + 1; });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    let list = tab === "all" ? rows : rows.filter(r => r.status === tab);
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
  }, [rows, tab, q, staffMap]);

  const uniqueStaff = useMemo(() => new Set(rows.map(r => r.staff_user_id)).size, [rows]);

  return (
    <div className="space-y-4" dir="rtl">
      {/* Hero */}
      <Card className="p-5 bg-gradient-to-br from-amber-50 via-background to-rose-50 dark:from-amber-950/20 dark:to-rose-950/20 border-2 border-amber-200/60 dark:border-amber-800/40">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-rose-500 grid place-items-center shadow-lg shrink-0">
            <Users className="w-6 h-6 text-white" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold leading-tight">طلبات الفريق — الأصناف الناقصة</h2>
            <p className="text-xs text-muted-foreground mt-0.5 leading-snug">
              شاشة موحّدة لكل الموظفين — شوف إيه الأصناف اللي زمايلك بلّغوا عنها وحالة كل واحدة لحظة بلحظة
            </p>
          </div>
          <div className="hidden sm:flex flex-col items-end shrink-0">
            <div className="text-2xl font-bold tabular-nums text-foreground">{rows.length}</div>
            <div className="text-[10px] text-muted-foreground">إجمالي البلاغات</div>
            <div className="text-[10px] text-muted-foreground mt-0.5">من {uniqueStaff} موظف</div>
          </div>
        </div>
      </Card>

      {/* Auto-sync banner + manual trigger */}
      <div className="rounded-lg border border-sky-200 dark:border-sky-800/60 bg-gradient-to-l from-sky-50 to-emerald-50 dark:from-sky-950/30 dark:to-emerald-950/20 p-2.5 flex items-start gap-2.5 text-xs">
        <RefreshCw className={cn("w-3.5 h-3.5 text-sky-600 dark:text-sky-400 shrink-0 mt-0.5", manualSyncing ? "animate-spin" : "animate-[spin_4s_linear_infinite]")} />
        <div className="flex-1 leading-relaxed min-w-0">
          <span className="font-semibold text-sky-800 dark:text-sky-300">مزامنة تلقائية كل ساعة من الفيصل</span>
          <span className="text-muted-foreground"> — لما رصيد الصنف يزيد في الفيصل، البلاغ ينتقل لـ </span>
          <span className="font-semibold text-emerald-700 dark:text-emerald-400">«تم التوفير»</span>
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
          title="افحص الفيصل دلوقتي — لو فيه أي توافر، البلاغات هتتنقل لـ«تم التوفير»"
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
          <TabsList className="w-full grid grid-cols-5 h-auto p-1 bg-muted/40">
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
          </TabsList>
        </Tabs>

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
            <PackageX className="w-12 h-12 opacity-30" />
            <p className="text-sm">{q ? "مفيش نتائج للبحث ده" : "مفيش بلاغات في القسم ده"}</p>
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
                        isMine
                          ? "bg-gradient-to-l from-primary/10 via-primary/5 to-transparent border-r-4 border-primary hover:from-primary/15"
                          : "hover:bg-muted/30"
                      )}
                    >
                      {/* "بتاعي" ribbon */}
                      {isMine && (
                        <div className="absolute top-2 left-2 inline-flex items-center gap-1 bg-primary text-primary-foreground text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                          <Star className="w-2.5 h-2.5 fill-current" />
                          بلاغك
                        </div>
                      )}

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
                              r.status === "fulfilled" && "bg-emerald-50 text-emerald-700 border-emerald-200",
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
