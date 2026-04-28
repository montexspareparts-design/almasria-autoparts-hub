import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ClipboardList,
  Phone,
  MessageCircle,
  Users,
  ShoppingBag,
  Search,
  Bell,
  FileText,
  CheckCircle2,
  Loader2,
  Send,
  Sparkles,
  Lock,
  TrendingUp,
  DollarSign,
  Target,
} from "lucide-react";

const DAILY_TASKS = [
  { id: "review_visitor_leads", title: "راجع ليدز الزوار الجدد على واتساب", desc: "افتح قسم 'ليدز الزوار' وكلّم اللي لسه ما اتواصلش معاهم.", icon: MessageCircle, color: "text-emerald-600 bg-emerald-50" },
  { id: "follow_hot_leads", title: "تابع الـ Hot Leads (عملاء بحثوا بدون شراء)", desc: "افتح 'ذكاء العملاء' وركّز على اللي بحثوا أكتر من 10 مرات.", icon: Sparkles, color: "text-amber-600 bg-amber-50" },
  { id: "process_pending_orders", title: "راجع الطلبات الجديدة وحالة الدفع", desc: "افتح 'الطلبات' وأكّد المؤكّد، اتصل باللي عنده مشكلة دفع.", icon: ShoppingBag, color: "text-blue-600 bg-blue-50" },
  { id: "callback_customers", title: "نفّذ مكالمات المتابعة المجدولة", desc: "العملاء اللي وعدتهم باتصال أو عرض سعر.", icon: Phone, color: "text-indigo-600 bg-indigo-50" },
  { id: "respond_support", title: "رد على طلبات الدعم والاستفسارات", desc: "تأكد إن مفيش طلب دعم متروك أكتر من ساعة.", icon: Bell, color: "text-rose-600 bg-rose-50" },
  { id: "register_new_dealers", title: "ساعد التجار الجدد في التسجيل", desc: "افتح 'Leads' وحوّل المهتمين لحسابات تاجر فعلية.", icon: Users, color: "text-purple-600 bg-purple-50" },
  { id: "search_no_buy", title: "اعمل سكان للعملاء اللي بحثوا أمس ومشتروش", desc: "كلّمهم وافهم سبب التردد، اعرض عليهم بدائل.", icon: Search, color: "text-cyan-600 bg-cyan-50" },
  { id: "submit_daily_report", title: "قدّم التقرير اليومي قبل ما تطلع", desc: "املا الفورم تحت بأرقام يومك، ده بيتسجّل تلقائياً للأدمن.", icon: FileText, color: "text-orange-600 bg-orange-50" },
] as const;

const LOST_REASONS = [
  { value: "price", label: "السعر مرتفع" },
  { value: "out_of_stock", label: "عدم توافر الصنف" },
  { value: "delay", label: "التأخير في الرد/التوصيل" },
  { value: "no_response", label: "العميل لم يرد" },
  { value: "other", label: "سبب آخر" },
];

type ReportForm = {
  customers_contacted: number;
  follow_ups_count: number;
  quotes_count: number;
  lost_customers_count: number;
  lost_reason: string;
  performance_rating: number;
  // الباقي للسجل (اختياري)
  customers_registered: number;
  customers_with_invoices: number;
  total_invoices_amount: number;
  hot_leads_count: number;
  best_deal_today: string;
  problems_faced: string;
  tomorrow_plan: string;
  general_notes: string;
};

const emptyForm: ReportForm = {
  customers_contacted: 0,
  follow_ups_count: 0,
  quotes_count: 0,
  lost_customers_count: 0,
  lost_reason: "",
  performance_rating: 7,
  customers_registered: 0,
  customers_with_invoices: 0,
  total_invoices_amount: 0,
  hot_leads_count: 0,
  best_deal_today: "",
  problems_faced: "",
  tomorrow_plan: "",
  general_notes: "",
};

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

type AutoMetrics = { leads_count: number; orders_count: number; total_sales: number };

export default function MyDailyTasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState<ReportForm>(emptyForm);
  const [auto, setAuto] = useState<AutoMetrics>({ leads_count: 0, orders_count: 0, total_sales: 0 });
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const storageKey = user ? `staff_daily_tasks_${user.id}_${todayKey()}` : null;

  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setChecked(JSON.parse(raw));
    } catch {}
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(checked));
    } catch {}
  }, [checked, storageKey]);

  // تحميل التقرير الحالي + المؤشرات التلقائية
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);

      const [reportRes, autoRes] = await Promise.all([
        supabase
          .from("staff_daily_reports")
          .select("*")
          .eq("staff_user_id", user.id)
          .eq("report_date", todayKey())
          .maybeSingle(),
        supabase.rpc("get_staff_auto_metrics", { _staff_user_id: user.id, _date: todayKey() }),
      ]);

      const data = reportRes.data;
      if (data) {
        setForm({
          customers_contacted: data.customers_contacted ?? 0,
          follow_ups_count: (data as any).follow_ups_count ?? 0,
          quotes_count: (data as any).quotes_count ?? 0,
          lost_customers_count: (data as any).lost_customers_count ?? 0,
          lost_reason: (data as any).lost_reason ?? "",
          performance_rating: (data as any).performance_rating ?? 7,
          customers_registered: data.customers_registered ?? 0,
          customers_with_invoices: data.customers_with_invoices ?? 0,
          total_invoices_amount: Number(data.total_invoices_amount ?? 0),
          hot_leads_count: data.hot_leads_count ?? 0,
          best_deal_today: data.best_deal_today ?? "",
          problems_faced: data.problems_faced ?? "",
          tomorrow_plan: data.tomorrow_plan ?? "",
          general_notes: data.general_notes ?? "",
        });
        setIsLocked(!!(data as any).is_locked);
        setSubmittedAt(data.submitted_at);
      }

      if (autoRes.data && Array.isArray(autoRes.data) && autoRes.data[0]) {
        const a: any = autoRes.data[0];
        setAuto({
          leads_count: a.leads_count ?? 0,
          orders_count: a.orders_count ?? 0,
          total_sales: Number(a.total_sales ?? 0),
        });
      }

      setLoading(false);
    })();
  }, [user]);

  const toggle = (id: string) => setChecked((c) => ({ ...c, [id]: !c[id] }));
  const completedCount = DAILY_TASKS.filter((t) => checked[t.id]).length;
  const progress = Math.round((completedCount / DAILY_TASKS.length) * 100);

  const handleNum = (k: keyof ReportForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value === "" ? 0 : Number(e.target.value);
    setForm((f) => ({ ...f, [k]: isNaN(v) ? 0 : Math.max(0, v) }));
  };

  const handleTxt = (k: keyof ReportForm) => (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  // التحقق من الحقول الإجبارية
  const canSubmit = () => {
    if (form.customers_contacted < 0) return false;
    if (form.lost_customers_count > 0 && !form.lost_reason) return false;
    if (form.performance_rating < 1 || form.performance_rating > 10) return false;
    return true;
  };

  const submitReport = async (lockNow: boolean) => {
    if (!user) return;
    if (!canSubmit()) {
      toast({
        title: "بيانات ناقصة",
        description: form.lost_customers_count > 0 && !form.lost_reason
          ? "حدد سبب فقدان العميل"
          : "راجع البيانات المدخلة",
        variant: "destructive",
      });
      return;
    }
    setSubmitting(true);

    let staffName: string | null = null;
    let staffEmail: string | null = user.email ?? null;
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name, email")
      .eq("user_id", user.id)
      .maybeSingle();
    if (profile) {
      staffName = profile.full_name ?? null;
      staffEmail = profile.email ?? staffEmail;
    }

    const payload: any = {
      staff_user_id: user.id,
      staff_name: staffName,
      staff_email: staffEmail,
      report_date: todayKey(),
      customers_contacted: form.customers_contacted,
      follow_ups_count: form.follow_ups_count,
      quotes_count: form.quotes_count,
      lost_customers_count: form.lost_customers_count,
      lost_reason: form.lost_customers_count > 0 ? form.lost_reason : null,
      performance_rating: form.performance_rating,
      customers_registered: form.customers_registered,
      customers_with_invoices: form.customers_with_invoices,
      total_invoices_amount: form.total_invoices_amount,
      hot_leads_count: form.hot_leads_count,
      follow_ups_done: form.follow_ups_count, // مزامنة الحقل القديم
      best_deal_today: form.best_deal_today,
      problems_faced: form.problems_faced,
      tomorrow_plan: form.tomorrow_plan,
      general_notes: form.general_notes,
      is_locked: lockNow,
    };

    const { error } = await supabase
      .from("staff_daily_reports")
      .upsert(payload, { onConflict: "staff_user_id,report_date" });

    setSubmitting(false);

    if (error) {
      toast({
        title: "تعذّر حفظ التقرير",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    if (lockNow) setIsLocked(true);
    setSubmittedAt(new Date().toISOString());
    // علامة "تم اليوم" عشان البوبأب اليومي ميظهرش تاني
    try { localStorage.setItem(`daily_report_done_${user.id}_${todayKey()}`, "1"); } catch {}

    // أبلغ AdminDashboard فوراً عشان يوقّف لمعان التذكير على تبويب "مهامي اليومية"
    if (lockNow) {
      try { window.dispatchEvent(new CustomEvent("daily-report-submitted")); } catch {}
    }

    toast({
      title: lockNow ? "🔒 تم إرسال التقرير وقفله" : "💾 تم الحفظ المؤقت",
      description: lockNow
        ? "وصل التقرير للإدارة. لو محتاج تعديل، تواصل مع الأدمن."
        : "تقدر ترجع وتعدّل قبل الإرسال النهائي.",
    });
  };

  return (
    <div className="space-y-6 pb-20" dir="rtl">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <ClipboardList className="h-7 w-7 text-primary" />
            مهامي اليومية
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            قائمة مختصرة بكل اللي المفروض تخلصه النهاردة + تقرير نهاية اليوم.
          </p>
        </div>

        <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3 shadow-sm">
          <div className="relative h-12 w-12">
            <svg className="h-12 w-12 -rotate-90" viewBox="0 0 36 36">
              <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted/30" />
              <circle
                cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3"
                strokeDasharray={`${(progress / 100) * 94.25} 94.25`}
                strokeLinecap="round"
                className="text-emerald-500 transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">{progress}%</div>
          </div>
          <div>
            <div className="text-sm font-semibold">{completedCount} / {DAILY_TASKS.length} مهمة</div>
            <div className="text-xs text-muted-foreground">
              {progress === 100 ? "👏 مهامك خلصت!" : "كمّل النهاردة"}
            </div>
          </div>
        </div>
      </div>

      {/* Auto Metrics Strip */}
      <div className="grid grid-cols-3 gap-3">
        <AutoMetricCard label="عملاء (Leads) اليوم" value={auto.leads_count} icon={Users} color="from-emerald-500 to-emerald-600" />
        <AutoMetricCard label="طلبات السيستم اليوم" value={auto.orders_count} icon={ShoppingBag} color="from-blue-500 to-blue-600" />
        <AutoMetricCard label="إجمالي المبيعات (ج.م)" value={auto.total_sales.toLocaleString("ar-EG")} icon={DollarSign} color="from-amber-500 to-amber-600" />
      </div>

      {/* Tasks Checklist */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
            قائمة المهام
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {DAILY_TASKS.map((task) => {
            const Icon = task.icon;
            const done = !!checked[task.id];
            return (
              <button
                key={task.id}
                onClick={() => toggle(task.id)}
                className={`group flex w-full items-start gap-3 rounded-xl border p-3 text-right transition-all hover:shadow-md ${done ? "border-emerald-200 bg-emerald-50/40" : "bg-card"}`}
              >
                <Checkbox checked={done} className="mt-1 pointer-events-none" />
                <div className={`shrink-0 rounded-lg p-2 ${task.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className={`font-semibold ${done ? "text-muted-foreground line-through" : ""}`}>{task.title}</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">{task.desc}</div>
                </div>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Separator />

      {/* Daily Report Form */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileText className="h-5 w-5 text-orange-500" />
              تقرير اليوم ({todayKey()})
            </CardTitle>
            {isLocked ? (
              <Badge variant="outline" className="border-rose-300 bg-rose-50 text-rose-700">
                <Lock className="ml-1 h-3 w-3" />
                مغلق — تم الإرسال النهائي
              </Badge>
            ) : submittedAt && (
              <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
                مسودة محفوظة
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {isLocked
              ? "التقرير اتقفل ووصل للإدارة. لتعديله، تواصل مع الأدمن."
              : "املا الأرقام بصدق — بعد الضغط على 'إرسال نهائي' هيتقفل التقرير."}
          </p>
        </CardHeader>
        <CardContent className="space-y-5">
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
          ) : (
            <fieldset disabled={isLocked} className="space-y-5">
              {/* الحقول الإجبارية الأساسية */}
              <div>
                <h3 className="mb-2 text-sm font-bold text-foreground">📊 أرقام يومك (إجباري)</h3>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                  <Field label="عملاء تواصلت معاهم *">
                    <Input type="number" min={0} value={form.customers_contacted} onChange={handleNum("customers_contacted")} />
                  </Field>
                  <Field label="عدد المتابعات (Follow-ups) *">
                    <Input type="number" min={0} value={form.follow_ups_count} onChange={handleNum("follow_ups_count")} />
                  </Field>
                  <Field label="عدد عروض الأسعار *">
                    <Input type="number" min={0} value={form.quotes_count} onChange={handleNum("quotes_count")} />
                  </Field>
                  <Field label="عملاء لم يتم إغلاقهم *">
                    <Input type="number" min={0} value={form.lost_customers_count} onChange={handleNum("lost_customers_count")} />
                  </Field>
                  {form.lost_customers_count > 0 && (
                    <div className="col-span-2 space-y-1.5">
                      <Label className="text-xs font-semibold text-muted-foreground">سبب فقد العميل *</Label>
                      <Select value={form.lost_reason} onValueChange={(v) => setForm((f) => ({ ...f, lost_reason: v }))}>
                        <SelectTrigger><SelectValue placeholder="اختر السبب الرئيسي" /></SelectTrigger>
                        <SelectContent>
                          {LOST_REASONS.map((r) => (
                            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              {/* تقييم الأداء */}
              <div className="rounded-xl border bg-gradient-to-br from-amber-50 to-orange-50 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-sm font-bold">
                    <Target className="h-4 w-4 text-amber-600" />
                    تقييم أدائك اليوم *
                  </Label>
                  <span className="rounded-full bg-amber-500 px-3 py-1 text-sm font-bold text-white">
                    {form.performance_rating} / 10
                  </span>
                </div>
                <Slider
                  value={[form.performance_rating]}
                  onValueChange={(v) => setForm((f) => ({ ...f, performance_rating: v[0] }))}
                  min={1} max={10} step={1}
                  className="mt-2"
                />
                <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                  <span>ضعيف</span><span>متوسط</span><span>ممتاز</span>
                </div>
              </div>

              {/* بيانات إضافية اختيارية */}
              <details className="rounded-lg border bg-muted/20 p-3">
                <summary className="cursor-pointer text-sm font-semibold">➕ تفاصيل إضافية (اختياري)</summary>
                <div className="mt-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                    <Field label="عملاء جدد سجّلتهم">
                      <Input type="number" min={0} value={form.customers_registered} onChange={handleNum("customers_registered")} />
                    </Field>
                    <Field label="عملاء عملوا فواتير">
                      <Input type="number" min={0} value={form.customers_with_invoices} onChange={handleNum("customers_with_invoices")} />
                    </Field>
                    <Field label="إجمالي فواتيرك (ج.م)">
                      <Input type="number" min={0} step="0.01" value={form.total_invoices_amount} onChange={handleNum("total_invoices_amount")} />
                    </Field>
                    <Field label="Hot Leads متابع">
                      <Input type="number" min={0} value={form.hot_leads_count} onChange={handleNum("hot_leads_count")} />
                    </Field>
                  </div>
                  <Field label="🏆 أحسن صفقة النهاردة">
                    <Input value={form.best_deal_today} onChange={handleTxt("best_deal_today")} placeholder="مثال: شكمان لاندكروزر بـ12 ألف" />
                  </Field>
                  <Field label="⚠️ مشاكل واجهتك">
                    <Textarea rows={2} value={form.problems_faced} onChange={handleTxt("problems_faced")} />
                  </Field>
                  <Field label="📅 خطة بكرة">
                    <Textarea rows={2} value={form.tomorrow_plan} onChange={handleTxt("tomorrow_plan")} />
                  </Field>
                  <Field label="📝 ملاحظات عامة">
                    <Textarea rows={2} value={form.general_notes} onChange={handleTxt("general_notes")} />
                  </Field>
                </div>
              </details>

              {/* أزرار الحفظ */}
              {!isLocked && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    onClick={() => submitReport(false)}
                    disabled={submitting}
                    variant="outline"
                    className="flex-1"
                  >
                    {submitting ? <Loader2 className="ml-2 h-4 w-4 animate-spin" /> : null}
                    💾 حفظ مؤقت (مسودة)
                  </Button>
                  <Button
                    onClick={() => setConfirmOpen(true)}
                    disabled={submitting}
                    size="lg"
                    className="flex-1 bg-gradient-to-l from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600"
                  >
                    <Send className="ml-2 h-4 w-4" />
                    🔒 إرسال نهائي للإدارة
                  </Button>
                </div>
              )}
            </fieldset>
          )}
        </CardContent>
      </Card>

      {/* تأكيد الإرسال النهائي */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الإرسال النهائي</AlertDialogTitle>
            <AlertDialogDescription>
              بعد الإرسال، التقرير هيتقفل ومش هتقدر تعدّله إلا لو الأدمن فك القفل.
              هل أنت متأكد إن البيانات صحيحة؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { setConfirmOpen(false); submitReport(true); }}
              className="bg-orange-600 hover:bg-orange-700"
            >
              نعم، أرسل وأقفل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}

function AutoMetricCard({ label, value, icon: Icon, color }: { label: string; value: string | number; icon: any; color: string }) {
  return (
    <div className={`rounded-xl bg-gradient-to-br ${color} p-3 text-white shadow-md`}>
      <Icon className="mb-1 h-4 w-4 opacity-90" />
      <div className="text-[10px] opacity-90">{label}</div>
      <div className="text-xl font-bold leading-tight">{value}</div>
    </div>
  );
}
