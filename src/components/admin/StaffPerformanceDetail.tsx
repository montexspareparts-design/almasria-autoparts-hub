import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Clock, Phone, MessageCircle, CheckCircle2, ShoppingBag, Zap, Calendar, TrendingUp } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  staffUserId: string | null;
  staffName: string;
  dateFrom: string;
  dateTo: string;
}

interface ActivityRow { id: string; action: string; table_name: string; created_at: string; }
interface CommRow { id: string; comm_type: string; created_at: string; note: string | null; customer_user_id: string; customer_name?: string; }
interface OrderResponse { order_number: string; created_at: string; first_contacted_at: string; sla_minutes: number; }

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString("ar-EG", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const actionLabel = (action: string, table: string) => {
  const map: Record<string, string> = {
    create: "إنشاء", update: "تعديل", delete: "حذف",
    view_initial_password: "عرض كلمة مرور",
  };
  const tableMap: Record<string, string> = {
    orders: "طلب", products: "منتج", dealer_accounts: "تاجر",
    leads: "Lead", customer_notes: "ملاحظة", customer_communications: "تواصل",
    dealer_applications: "طلب تاجر", price_lists: "كشف", catalogs: "كتالوج",
  };
  return `${map[action] || action} ${tableMap[table] || table}`;
};

export default function StaffPerformanceDetail({ open, onOpenChange, staffUserId, staffName, dateFrom, dateTo }: Props) {
  const [loading, setLoading] = useState(true);
  const [activity, setActivity] = useState<ActivityRow[]>([]);
  const [comms, setComms] = useState<CommRow[]>([]);
  const [orderResponses, setOrderResponses] = useState<OrderResponse[]>([]);
  const [hourlyActivity, setHourlyActivity] = useState<Record<number, number>>({});

  useEffect(() => {
    if (!open || !staffUserId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [auditRes, commsRes, ordersRes] = await Promise.all([
          supabase.from("audit_logs").select("id, action, table_name, created_at")
            .eq("performed_by", staffUserId)
            .gte("created_at", dateFrom).lte("created_at", `${dateTo}T23:59:59`)
            .order("created_at", { ascending: false }).limit(100),
          supabase.from("customer_communications").select("id, comm_type, created_at, note, customer_user_id")
            .eq("staff_user_id", staffUserId)
            .gte("created_at", dateFrom).lte("created_at", `${dateTo}T23:59:59`)
            .order("created_at", { ascending: false }).limit(50),
          supabase.from("orders").select("order_number, created_at, first_contacted_at")
            .not("first_contacted_at", "is", null)
            .gte("first_contacted_at", dateFrom).lte("first_contacted_at", `${dateTo}T23:59:59`)
            .order("first_contacted_at", { ascending: false }).limit(50),
        ]);

        if (cancelled) return;

        const auditRows = (auditRes.data || []) as ActivityRow[];
        setActivity(auditRows);

        // hourly activity heatmap
        const hours: Record<number, number> = {};
        for (const a of auditRows) {
          const h = new Date(a.created_at).getHours();
          hours[h] = (hours[h] || 0) + 1;
        }
        setHourlyActivity(hours);

        // Resolve customer names for comms
        const commsRows = (commsRes.data || []) as CommRow[];
        const userIds = [...new Set(commsRows.map(c => c.customer_user_id))];
        if (userIds.length > 0) {
          const { data: profs } = await supabase.from("profiles").select("user_id, full_name, phone").in("user_id", userIds);
          const map = new Map((profs || []).map((p: any) => [p.user_id, p.full_name || p.phone || "عميل"]));
          setComms(commsRows.map(c => ({ ...c, customer_name: map.get(c.customer_user_id) || "عميل" })));
        } else {
          setComms(commsRows);
        }

        // SLA: orders this staff responded to (best-effort: filtered by date range — without per-staff attribution we show org-wide)
        const orders = (ordersRes.data || []).map((o: any) => {
          const created = new Date(o.created_at).getTime();
          const contacted = new Date(o.first_contacted_at).getTime();
          return { order_number: o.order_number, created_at: o.created_at, first_contacted_at: o.first_contacted_at, sla_minutes: Math.round((contacted - created) / 60000) };
        });
        setOrderResponses(orders);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [open, staffUserId, dateFrom, dateTo]);

  const totalActions = activity.length;
  const phoneComms = comms.filter(c => c.comm_type === "phone").length;
  const whatsappComms = comms.filter(c => c.comm_type === "whatsapp").length;

  // Working hours = first → last activity
  const sorted = activity.length ? [...activity].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) : [];
  const firstActivity = sorted[0]?.created_at;
  const lastActivity = sorted[sorted.length - 1]?.created_at;
  const workMinutes = firstActivity && lastActivity ? Math.round((new Date(lastActivity).getTime() - new Date(firstActivity).getTime()) / 60000) : 0;
  const workHours = Math.floor(workMinutes / 60);
  const workMinutesRem = workMinutes % 60;

  const maxHourly = Math.max(...Object.values(hourlyActivity), 1);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full sm:max-w-lg overflow-hidden p-0 flex flex-col" dir="rtl">
        <SheetHeader className="p-4 border-b bg-gradient-to-l from-primary/5 to-transparent shrink-0">
          <SheetTitle className="flex items-center gap-2 text-base">
            <Activity className="w-5 h-5 text-primary" />
            تقرير أداء — {staffName}
          </SheetTitle>
          <SheetDescription className="text-start text-xs">
            من {new Date(dateFrom).toLocaleDateString("ar-EG")} إلى {new Date(dateTo).toLocaleDateString("ar-EG")}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="p-4 space-y-5">
            {loading ? (
              <>
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-32 w-full" />
              </>
            ) : (
              <>
                {/* KPI Grid */}
                <div className="grid grid-cols-2 gap-2">
                  <KpiBox icon={Clock} label="ساعات العمل" value={workMinutes > 0 ? `${workHours}س ${workMinutesRem}د` : "—"} color="blue" />
                  <KpiBox icon={Zap} label="إجمالي الإجراءات" value={totalActions} color="purple" />
                  <KpiBox icon={Phone} label="مكالمات" value={phoneComms} color="emerald" />
                  <KpiBox icon={MessageCircle} label="واتساب" value={whatsappComms} color="green" />
                </div>

                {/* Working session */}
                {firstActivity && (
                  <div className="rounded-lg border bg-muted/40 p-3">
                    <h3 className="text-xs font-bold mb-2 flex items-center gap-1.5 text-blue-600 dark:text-blue-400">
                      <Calendar className="w-3.5 h-3.5" />
                      جلسة العمل
                    </h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <p className="text-muted-foreground">أول نشاط</p>
                        <p className="font-bold text-foreground">{fmtTime(firstActivity)}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">آخر نشاط</p>
                        <p className="font-bold text-foreground">{fmtTime(lastActivity!)}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Hourly activity heatmap */}
                {Object.keys(hourlyActivity).length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold mb-2 flex items-center gap-1.5 text-purple-600 dark:text-purple-400">
                      <TrendingUp className="w-3.5 h-3.5" />
                      توزيع النشاط على ساعات اليوم
                    </h3>
                    <div className="grid grid-cols-12 gap-0.5">
                      {Array.from({ length: 24 }).map((_, h) => {
                        const count = hourlyActivity[h] || 0;
                        const intensity = count / maxHourly;
                        return (
                          <div key={h} className="flex flex-col items-center gap-0.5">
                            <div
                              className="w-full h-8 rounded-sm transition-colors"
                              style={{
                                backgroundColor: count === 0 ? "hsl(var(--muted))" : `hsl(var(--primary) / ${0.2 + intensity * 0.8})`,
                              }}
                              title={`${h}:00 — ${count} نشاط`}
                            />
                            <span className="text-[8px] text-muted-foreground">{h}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Communications */}
                {comms.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold mb-2 flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
                      <Phone className="w-3.5 h-3.5" />
                      آخر التواصلات ({comms.length})
                    </h3>
                    <div className="space-y-1.5">
                      {comms.slice(0, 10).map((c) => (
                        <div key={c.id} className="flex items-start justify-between gap-2 text-xs p-2 rounded-md bg-muted/50">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-1.5">
                              {c.comm_type === "phone" ? <Phone className="w-3 h-3 text-blue-500" /> : <MessageCircle className="w-3 h-3 text-green-500" />}
                              <p className="font-bold text-foreground truncate">{c.customer_name}</p>
                            </div>
                            {c.note && <p className="text-[11px] text-muted-foreground mt-1 line-clamp-2">{c.note}</p>}
                          </div>
                          <span className="text-[10px] text-muted-foreground shrink-0">{fmtTime(c.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Recent actions */}
                {activity.length > 0 && (
                  <div>
                    <h3 className="text-xs font-bold mb-2 flex items-center gap-1.5 text-foreground">
                      <Activity className="w-3.5 h-3.5" />
                      آخر الإجراءات على النظام
                    </h3>
                    <div className="space-y-1">
                      {activity.slice(0, 15).map((a) => (
                        <div key={a.id} className="flex items-center justify-between text-xs p-1.5 px-2 rounded-md bg-muted/40">
                          <span className="font-medium text-foreground">{actionLabel(a.action, a.table_name)}</span>
                          <span className="text-[10px] text-muted-foreground">{fmtDateTime(a.created_at)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {totalActions === 0 && comms.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">لا يوجد نشاط مسجل في هذه الفترة</p>
                  </div>
                )}
              </>
            )}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

function KpiBox({ icon: Icon, label, value, color }: { icon: any; label: string; value: any; color: string }) {
  const colorMap: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400",
    purple: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/30 dark:text-emerald-400",
    green: "bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400",
  };
  return (
    <div className={`rounded-lg p-3 border ${colorMap[color]}`}>
      <div className="flex items-center justify-between">
        <Icon className="w-4 h-4 opacity-70" />
        <p className="text-xl font-black leading-none">{value}</p>
      </div>
      <p className="text-[10px] mt-1.5 font-medium opacity-80">{label}</p>
    </div>
  );
}
