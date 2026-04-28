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
} from "lucide-react";

/**
 * Daily checklist (static — defined in code per user spec).
 * Each task is a habit the staff member should perform every working day.
 * Progress is persisted in localStorage per (user, date).
 */
const DAILY_TASKS = [
  {
    id: "review_visitor_leads",
    title: "راجع ليدز الزوار الجدد على واتساب",
    desc: "افتح قسم 'ليدز الزوار' وكلّم اللي لسه ما اتواصلش معاهم.",
    icon: MessageCircle,
    color: "text-emerald-600 bg-emerald-50",
  },
  {
    id: "follow_hot_leads",
    title: "تابع الـ Hot Leads (عملاء بحثوا بدون شراء)",
    desc: "افتح 'ذكاء العملاء' وركّز على اللي بحثوا أكتر من 10 مرات.",
    icon: Sparkles,
    color: "text-amber-600 bg-amber-50",
  },
  {
    id: "process_pending_orders",
    title: "راجع الطلبات الجديدة وحالة الدفع",
    desc: "افتح 'الطلبات' وأكّد المؤكّد، اتصل باللي عنده مشكلة دفع.",
    icon: ShoppingBag,
    color: "text-blue-600 bg-blue-50",
  },
  {
    id: "callback_customers",
    title: "نفّذ مكالمات المتابعة المجدولة",
    desc: "العملاء اللي وعدتهم باتصال أو عرض سعر.",
    icon: Phone,
    color: "text-indigo-600 bg-indigo-50",
  },
  {
    id: "respond_support",
    title: "رد على طلبات الدعم والاستفسارات",
    desc: "تأكد إن مفيش طلب دعم متروك أكتر من ساعة.",
    icon: Bell,
    color: "text-rose-600 bg-rose-50",
  },
  {
    id: "register_new_dealers",
    title: "ساعد التجار الجدد في التسجيل",
    desc: "افتح 'Leads' وحوّل المهتمين لحسابات تاجر فعلية.",
    icon: Users,
    color: "text-purple-600 bg-purple-50",
  },
  {
    id: "search_no_buy",
    title: "اعمل سكان للعملاء اللي بحثوا أمس ومشتروش",
    desc: "كلّمهم وافهم سبب التردد، اعرض عليهم بدائل.",
    icon: Search,
    color: "text-cyan-600 bg-cyan-50",
  },
  {
    id: "submit_daily_report",
    title: "قدّم التقرير اليومي قبل ما تطلع",
    desc: "املا الفورم تحت بأرقام يومك، ده بيتسجّل تلقائياً للأدمن.",
    icon: FileText,
    color: "text-orange-600 bg-orange-50",
  },
] as const;

type ReportForm = {
  customers_contacted: number;
  customers_registered: number;
  customers_with_invoices: number;
  total_invoices_amount: number;
  hot_leads_count: number;
  follow_ups_done: number;
  best_deal_today: string;
  problems_faced: string;
  tomorrow_plan: string;
  general_notes: string;
};

const emptyForm: ReportForm = {
  customers_contacted: 0,
  customers_registered: 0,
  customers_with_invoices: 0,
  total_invoices_amount: 0,
  hot_leads_count: 0,
  follow_ups_done: 0,
  best_deal_today: "",
  problems_faced: "",
  tomorrow_plan: "",
  general_notes: "",
};

const todayKey = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export default function MyDailyTasks() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState<ReportForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [submittedAt, setSubmittedAt] = useState<string | null>(null);

  const storageKey = user ? `staff_daily_tasks_${user.id}_${todayKey()}` : null;

  // Load checklist from localStorage
  useEffect(() => {
    if (!storageKey) return;
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setChecked(JSON.parse(raw));
    } catch {}
  }, [storageKey]);

  // Persist checklist
  useEffect(() => {
    if (!storageKey) return;
    try {
      localStorage.setItem(storageKey, JSON.stringify(checked));
    } catch {}
  }, [checked, storageKey]);

  // Load today's report (if exists)
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("staff_daily_reports")
        .select("*")
        .eq("staff_user_id", user.id)
        .eq("report_date", todayKey())
        .maybeSingle();

      if (data) {
        setForm({
          customers_contacted: data.customers_contacted ?? 0,
          customers_registered: data.customers_registered ?? 0,
          customers_with_invoices: data.customers_with_invoices ?? 0,
          total_invoices_amount: Number(data.total_invoices_amount ?? 0),
          hot_leads_count: data.hot_leads_count ?? 0,
          follow_ups_done: data.follow_ups_done ?? 0,
          best_deal_today: data.best_deal_today ?? "",
          problems_faced: data.problems_faced ?? "",
          tomorrow_plan: data.tomorrow_plan ?? "",
          general_notes: data.general_notes ?? "",
        });
        setAlreadySubmitted(true);
        setSubmittedAt(data.submitted_at);
      }
      setLoading(false);
    })();
  }, [user]);

  const toggle = (id: string) => setChecked((c) => ({ ...c, [id]: !c[id] }));

  const completedCount = DAILY_TASKS.filter((t) => checked[t.id]).length;
  const progress = Math.round((completedCount / DAILY_TASKS.length) * 100);

  const handleNum = (k: keyof ReportForm) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value === "" ? 0 : Number(e.target.value);
    setForm((f) => ({ ...f, [k]: isNaN(v) ? 0 : v }));
  };

  const handleTxt = (k: keyof ReportForm) => (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
  };

  const submitReport = async () => {
    if (!user) return;
    setSubmitting(true);

    // staff name/email lookup (best-effort)
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

    const payload = {
      staff_user_id: user.id,
      staff_name: staffName,
      staff_email: staffEmail,
      report_date: todayKey(),
      ...form,
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

    setAlreadySubmitted(true);
    setSubmittedAt(new Date().toISOString());
    toast({
      title: "✅ تم حفظ التقرير اليومي",
      description: "تم إخطار الإدارة بتقريرك. شكراً لمجهودك اليوم 🌟",
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
                cx="18"
                cy="18"
                r="15"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeDasharray={`${(progress / 100) * 94.25} 94.25`}
                strokeLinecap="round"
                className="text-emerald-500 transition-all duration-500"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center text-xs font-bold">
              {progress}%
            </div>
          </div>
          <div>
            <div className="text-sm font-semibold">
              {completedCount} / {DAILY_TASKS.length} مهمة
            </div>
            <div className="text-xs text-muted-foreground">
              {progress === 100 ? "👏 مهامك خلصت!" : "كمّل النهاردة"}
            </div>
          </div>
        </div>
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
                className={`group flex w-full items-start gap-3 rounded-xl border p-3 text-right transition-all hover:shadow-md ${
                  done ? "border-emerald-200 bg-emerald-50/40" : "bg-card"
                }`}
              >
                <Checkbox checked={done} className="mt-1 pointer-events-none" />
                <div className={`shrink-0 rounded-lg p-2 ${task.color}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <div className={`font-semibold ${done ? "text-muted-foreground line-through" : ""}`}>
                    {task.title}
                  </div>
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
            {alreadySubmitted && (
              <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-700">
                <CheckCircle2 className="ml-1 h-3 w-3" />
                مسجّل
                {submittedAt && (
                  <span className="mr-2 text-[10px] opacity-70">
                    ({new Date(submittedAt).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })})
                  </span>
                )}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            املأ الأرقام بصدق — التقرير بيوصل للإدارة فوراً وبيتحفظ في سجلك.
            {alreadySubmitted && " يمكنك التعديل وإعادة الحفظ في أي وقت اليوم."}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Numbers grid */}
              <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
                <Field label="عملاء تواصلت معاهم">
                  <Input type="number" min={0} value={form.customers_contacted} onChange={handleNum("customers_contacted")} />
                </Field>
                <Field label="عملاء جدد سجّلتهم">
                  <Input type="number" min={0} value={form.customers_registered} onChange={handleNum("customers_registered")} />
                </Field>
                <Field label="عملاء عملوا فواتير">
                  <Input type="number" min={0} value={form.customers_with_invoices} onChange={handleNum("customers_with_invoices")} />
                </Field>
                <Field label="إجمالي الفواتير (ج.م)">
                  <Input type="number" min={0} step="0.01" value={form.total_invoices_amount} onChange={handleNum("total_invoices_amount")} />
                </Field>
                <Field label="Hot Leads متابع">
                  <Input type="number" min={0} value={form.hot_leads_count} onChange={handleNum("hot_leads_count")} />
                </Field>
                <Field label="مكالمات متابعة">
                  <Input type="number" min={0} value={form.follow_ups_done} onChange={handleNum("follow_ups_done")} />
                </Field>
              </div>

              {/* Text fields */}
              <Field label="🏆 أحسن صفقة النهاردة">
                <Input value={form.best_deal_today} onChange={handleTxt("best_deal_today")} placeholder="مثال: بيع شكمان لاندكروزر بـ12 ألف لعميل جديد" />
              </Field>

              <Field label="⚠️ مشاكل واجهتك">
                <Textarea rows={2} value={form.problems_faced} onChange={handleTxt("problems_faced")} placeholder="أي مشكلة محتاجة تدخل من الإدارة..." />
              </Field>

              <Field label="📅 خطة بكرة">
                <Textarea rows={2} value={form.tomorrow_plan} onChange={handleTxt("tomorrow_plan")} placeholder="أهم 3 حاجات هتعملها بكرة..." />
              </Field>

              <Field label="📝 ملاحظات عامة">
                <Textarea rows={2} value={form.general_notes} onChange={handleTxt("general_notes")} />
              </Field>

              <Button
                onClick={submitReport}
                disabled={submitting}
                size="lg"
                className="w-full bg-gradient-to-l from-orange-500 to-amber-500 text-white hover:from-orange-600 hover:to-amber-600"
              >
                {submitting ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    جاري الحفظ...
                  </>
                ) : (
                  <>
                    <Send className="ml-2 h-4 w-4" />
                    {alreadySubmitted ? "تحديث التقرير" : "تسجيل التقرير وإرساله للإدارة"}
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
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
