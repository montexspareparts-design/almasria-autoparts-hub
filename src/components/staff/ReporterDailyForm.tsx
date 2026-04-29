import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Send,
  Lock,
  FileText,
  Loader2,
  CheckCircle2,
  Calendar,
  ClipboardList,
  FileSpreadsheet,
  ShoppingBag,
  Receipt,
  DollarSign,
  Phone,
  MessageCircle,
  FileCheck,
  RefreshCw,
  XCircle,
  Users,
  UserPlus,
  AlertTriangle,
  Target,
} from "lucide-react";

const PROBLEM_OPTIONS = [
  { value: "price", label: "السعر" },
  { value: "unavailable", label: "عدم التوافر" },
  { value: "delay", label: "التأخير" },
  { value: "no_response", label: "العميل لم يرد" },
  { value: "system_issue", label: "مشكلة في السيستم" },
];

interface ReportData {
  id?: string;
  quotations_count: number;
  calls_count: number;
  whatsapp_count: number;
  offers_sent_count: number;
  offers_count: number;
  offers_converted_count: number;
  incomplete_orders_count: number;
  followups_count: number;
  new_customers_count: number;
  main_problem: string;
  problem_notes: string;
  lost_opportunities_count: number;
  is_submitted: boolean;
  submitted_at: string | null;
}

const EMPTY: ReportData = {
  quotations_count: 0,
  calls_count: 0,
  whatsapp_count: 0,
  offers_sent_count: 0,
  offers_count: 0,
  offers_converted_count: 0,
  incomplete_orders_count: 0,
  followups_count: 0,
  new_customers_count: 0,
  main_problem: "",
  problem_notes: "",
  lost_opportunities_count: 0,
  is_submitted: false,
  submitted_at: null,
};

const today = () => new Date().toISOString().slice(0, 10);

export default function ReporterDailyForm() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [data, setData] = useState<ReportData>(EMPTY);
  const [staffName, setStaffName] = useState("");
  const [autoStats, setAutoStats] = useState({ orders: 0, invoices: 0, sales: 0 });

  const dateLabel = useMemo(
    () =>
      new Date().toLocaleDateString("ar-EG", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      }),
    []
  );

  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("user_id", user.id)
          .maybeSingle();
        setStaffName(prof?.full_name || prof?.email || user?.email || "—");

        const { data: row } = await supabase
          .from("reporter_daily_reports")
          .select("*")
          .eq("user_id", user.id)
          .eq("report_date", today())
          .maybeSingle();
        if (row) setData(row as ReportData);

        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const { data: orders } = await supabase
          .from("orders")
          .select("id, total_amount, erp_order_code, status")
          .gte("created_at", startOfDay.toISOString())
          .neq("status", "cancelled");

        const list = orders || [];
        setAutoStats({
          orders: list.length,
          invoices: list.filter((o) => !!o.erp_order_code).length,
          sales: list.reduce((s, o) => s + Number(o.total_amount || 0), 0),
        });
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const locked = data.is_submitted;

  const setNum = (k: keyof ReportData) => (v: string) => {
    if (locked) return;
    const n = Math.max(0, parseInt(v || "0", 10) || 0);
    setData((d) => ({ ...d, [k]: n }));
  };

  const buildPayload = (submit: boolean) => ({
    user_id: user!.id,
    report_date: today(),
    quotations_count: data.quotations_count,
    calls_count: data.calls_count,
    whatsapp_count: data.whatsapp_count,
    offers_sent_count: data.offers_sent_count,
    offers_count: data.offers_count,
    offers_converted_count: data.offers_converted_count,
    incomplete_orders_count: data.incomplete_orders_count,
    followups_count: data.followups_count,
    new_customers_count: data.new_customers_count,
    main_problem: data.main_problem || null,
    problem_notes: data.problem_notes || null,
    lost_opportunities_count: data.lost_opportunities_count,
    is_submitted: submit,
  });

  const saveDraft = async () => {
    if (!user || locked) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from("reporter_daily_reports")
        .upsert(buildPayload(false), { onConflict: "user_id,report_date" });
      if (error) throw error;
      toast({ title: "تم الحفظ", description: "تم حفظ المسودة، تقدر تكملها بعدين" });
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const submitReport = async () => {
    if (!user || locked) return;
    setSaving(true);
    try {
      const { data: saved, error } = await supabase
        .from("reporter_daily_reports")
        .upsert(buildPayload(true), { onConflict: "user_id,report_date" })
        .select()
        .maybeSingle();
      if (error) throw error;
      if (saved) setData(saved as ReportData);
      toast({ title: "تم الإرسال ✅", description: "تم تسليم تقرير اليوم بنجاح" });
      setConfirmOpen(false);
    } catch (e: any) {
      toast({ title: "خطأ في الإرسال", description: e.message, variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-4"
    >
      {/* 🟦 Dark Header */}
      <Card className="p-5 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-slate-700 text-white">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="w-12 h-12 rounded-xl bg-rose-500/20 grid place-items-center border border-rose-500/30">
              <ClipboardList className="w-6 h-6 text-rose-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl sm:text-2xl font-extrabold">
                  📋 التقرير اليومي للمبيعات
                </h2>
                <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/40 text-[10px]">
                  إلزامي
                </Badge>
              </div>
              <div className="flex items-center gap-1.5 mt-1.5 text-xs text-slate-400">
                <Calendar className="w-3.5 h-3.5" />
                {dateLabel}
                <span className="mx-1">•</span>
                <span className="text-slate-300">{staffName}</span>
              </div>
            </div>
          </div>
          {locked && (
            <Badge className="gap-1.5 bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-sm py-1.5 px-3">
              <Lock className="w-3.5 h-3.5" />
              تم تسليم التقرير
            </Badge>
          )}
        </div>
      </Card>

      {/* 🔹 Auto Stats (Display only) */}
      <Card className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200 dark:border-blue-900">
        <div className="flex items-center gap-2 mb-3">
          <Badge variant="outline" className="text-[10px] bg-card">
            تلقائي من السيستم
          </Badge>
          <span className="text-xs text-muted-foreground">
            بيانات الإنتاج اليوم بتتسحب أوتوماتيك ولا تحتاج تعبئة
          </span>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <AutoStat
            icon={<ShoppingBag className="w-4 h-4" />}
            label="عدد الطلبات"
            value={autoStats.orders.toString()}
            color="blue"
          />
          <AutoStat
            icon={<Receipt className="w-4 h-4" />}
            label="عدد الفواتير"
            value={autoStats.invoices.toString()}
            color="emerald"
          />
          <AutoStat
            icon={<DollarSign className="w-4 h-4" />}
            label="إجمالي المبيعات (ج.م)"
            value={autoStats.sales.toLocaleString("ar-EG")}
            color="amber"
          />
        </div>
      </Card>

      {/* 🔹 Manual Questions Grid */}
      <Card className="p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-4">
          <NumField
            icon={<FileSpreadsheet className="w-3.5 h-3.5 text-indigo-600" />}
            label="عدد عروض الأسعار اليوم"
            required
            value={data.quotations_count}
            onChange={setNum("quotations_count")}
            disabled={locked}
          />
          <NumField
            icon={<Phone className="w-3.5 h-3.5 text-purple-600" />}
            label="عدد المكالمات"
            required
            value={data.calls_count}
            onChange={setNum("calls_count")}
            disabled={locked}
          />
          <NumField
            icon={<MessageCircle className="w-3.5 h-3.5 text-green-600" />}
            label="عملاء واتساب"
            required
            value={data.whatsapp_count}
            onChange={setNum("whatsapp_count")}
            disabled={locked}
          />
          <NumField
            icon={<FileCheck className="w-3.5 h-3.5 text-cyan-600" />}
            label="عملاء أُرسل لهم عروض/كشوف"
            required
            value={data.offers_sent_count}
            onChange={setNum("offers_sent_count")}
            disabled={locked}
          />
          <NumField
            icon={<RefreshCw className="w-3.5 h-3.5 text-blue-600" />}
            label="عروض اتحولت لطلبات"
            required
            value={data.offers_converted_count}
            onChange={setNum("offers_converted_count")}
            disabled={locked}
          />
          <NumField
            icon={<XCircle className="w-3.5 h-3.5 text-rose-600" />}
            label="طلبات لم تكتمل"
            required
            value={data.incomplete_orders_count}
            onChange={setNum("incomplete_orders_count")}
            disabled={locked}
          />
          <NumField
            icon={<Users className="w-3.5 h-3.5 text-teal-600" />}
            label="عملاء تمت متابعتهم"
            required
            value={data.followups_count}
            onChange={setNum("followups_count")}
            disabled={locked}
          />
          <NumField
            icon={<UserPlus className="w-3.5 h-3.5 text-emerald-600" />}
            label="عملاء جدد تم إضافتهم"
            required
            value={data.new_customers_count}
            onChange={setNum("new_customers_count")}
            disabled={locked}
          />
          <NumField
            icon={<Target className="w-3.5 h-3.5 text-orange-600" />}
            label="مهتمين ولم يتم إغلاقهم"
            required
            value={data.lost_opportunities_count}
            onChange={setNum("lost_opportunities_count")}
            disabled={locked}
          />
        </div>

        {/* Problem dropdown spanning full width */}
        <div className="mt-5 pt-5 border-t">
          <Label className="text-xs font-bold mb-1.5 flex items-center gap-1.5 text-foreground">
            <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            أكثر مشكلة واجهتك اليوم
            <span className="text-rose-500">*</span>
          </Label>
          <Select
            value={data.main_problem}
            onValueChange={(v) =>
              !locked && setData((d) => ({ ...d, main_problem: v }))
            }
            disabled={locked}
          >
            <SelectTrigger className="h-11">
              <SelectValue placeholder="اختر المشكلة..." />
            </SelectTrigger>
            <SelectContent>
              {PROBLEM_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* 🔹 Submit */}
      <Card className="p-5 sticky bottom-3 bg-card/95 backdrop-blur-md border-2 border-primary/30 shadow-lg">
        {locked ? (
          <div className="flex items-center justify-center gap-2 text-emerald-600 font-bold py-2">
            <CheckCircle2 className="w-5 h-5" />
            <span>تم تسليم تقرير اليوم — لا يمكن التعديل</span>
          </div>
        ) : (
          <div className="flex gap-2 flex-col sm:flex-row">
            <Button
              variant="outline"
              size="lg"
              onClick={saveDraft}
              disabled={saving}
              className="flex-1 sm:flex-none gap-2"
            >
              {saving ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileText className="w-4 h-4" />
              )}
              حفظ مسودة
            </Button>
            <Button
              size="lg"
              onClick={() => setConfirmOpen(true)}
              disabled={saving}
              className="flex-1 gap-2 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-bold text-base h-12"
            >
              <Send className="w-5 h-5" />
              إرسال التقرير
            </Button>
          </div>
        )}
      </Card>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد إرسال التقرير</AlertDialogTitle>
            <AlertDialogDescription>
              بعد الإرسال، لن تتمكن من تعديل التقرير. هل أنت متأكد؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={saving}>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={submitReport}
              disabled={saving}
              className="gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              نعم، أرسل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

function NumField({
  icon,
  label,
  required,
  value,
  onChange,
  disabled,
}: {
  icon?: React.ReactNode;
  label: string;
  required?: boolean;
  value: number;
  onChange: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <div>
      <Label className="text-xs font-bold mb-1.5 flex items-center gap-1.5 text-foreground">
        {icon}
        <span>{label}</span>
        {required && <span className="text-rose-500">*</span>}
      </Label>
      <Input
        type="number"
        inputMode="numeric"
        min={0}
        value={value || ""}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="—"
        className="h-11 text-center font-bold text-base"
      />
    </div>
  );
}

function AutoStat({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: "blue" | "emerald" | "amber";
}) {
  const colors = {
    blue: "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-400",
    emerald:
      "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400",
    amber: "bg-amber-500/10 border-amber-500/30 text-amber-700 dark:text-amber-400",
  };
  return (
    <div className={`p-3 rounded-xl border text-center ${colors[color]}`}>
      <div className="flex items-center justify-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] font-semibold opacity-80">{label}</span>
      </div>
      <div className="text-xl font-extrabold">{value}</div>
    </div>
  );
}
