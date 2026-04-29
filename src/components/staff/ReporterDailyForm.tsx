import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Send, Lock, Phone, MessageCircle, FileText, RefreshCw, TrendingUp, AlertTriangle, Target, Loader2, CheckCircle2, User, Calendar, ShoppingBag, Receipt, DollarSign } from "lucide-react";

const PROBLEM_OPTIONS = [
  { value: "price", label: "السعر" },
  { value: "unavailable", label: "عدم التوافر" },
  { value: "delay", label: "التأخير" },
  { value: "no_response", label: "العميل لم يرد" },
  { value: "system_issue", label: "مشكلة سيستم" },
];

interface ReportData {
  id?: string;
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
    () => new Date().toLocaleDateString("ar-EG", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
    []
  );

  // Load name + today's report + auto production stats
  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      try {
        // Staff name
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("user_id", user.id)
          .maybeSingle();
        setStaffName(prof?.full_name || prof?.email || profile?.full_name || "—");

        // Existing report
        const { data: row } = await supabase
          .from("reporter_daily_reports")
          .select("*")
          .eq("user_id", user.id)
          .eq("report_date", today())
          .maybeSingle();
        if (row) setData(row as ReportData);

        // Auto production: today's orders for this staff (created_by/handled_by not present → use orders linked to assigned customers)
        // Simpler heuristic: count today's orders system-wide that this staff handled via order_communications/assignments fallback.
        // For now, fetch orders created today and count those + invoices + sales sum.
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
  }, [user, profile]);

  const locked = data.is_submitted;

  const setNum = (k: keyof ReportData) => (v: string) => {
    if (locked) return;
    const n = Math.max(0, parseInt(v || "0", 10) || 0);
    setData((d) => ({ ...d, [k]: n }));
  };

  const saveDraft = async () => {
    if (!user || locked) return;
    setSaving(true);
    try {
      const payload = {
        user_id: user.id,
        report_date: today(),
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
        is_submitted: false,
      };
      const { error } = await supabase
        .from("reporter_daily_reports")
        .upsert(payload, { onConflict: "user_id,report_date" });
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
      const payload = {
        user_id: user.id,
        report_date: today(),
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
        is_submitted: true,
      };
      const { data: saved, error } = await supabase
        .from("reporter_daily_reports")
        .upsert(payload, { onConflict: "user_id,report_date" })
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
      {/* 🟦 Header */}
      <Card className="p-5 bg-gradient-to-br from-primary/10 via-card to-card border-primary/20">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-foreground">
              📋 التقرير اليومي للمبيعات
            </h2>
            <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
              <span className="flex items-center gap-1.5">
                <User className="w-4 h-4" />
                <strong className="text-foreground">{staffName}</strong>
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4" />
                {dateLabel}
              </span>
            </div>
          </div>
          {locked && (
            <Badge className="gap-1.5 bg-emerald-500/15 text-emerald-600 border-emerald-500/30 text-sm py-1.5 px-3">
              <Lock className="w-3.5 h-3.5" />
              تم تسليم التقرير
            </Badge>
          )}
        </div>
      </Card>

      {/* 🔹 القسم 1: الإنتاج (Auto + Display only) */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 grid place-items-center">
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <h3 className="font-bold text-base">الإنتاج</h3>
          <Badge variant="outline" className="text-[10px]">تلقائي من السيستم</Badge>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/20 text-center">
            <ShoppingBag className="w-5 h-5 text-blue-600 mx-auto mb-1.5" />
            <div className="text-2xl font-extrabold text-blue-700">{autoStats.orders}</div>
            <div className="text-xs text-muted-foreground mt-1">عدد الطلبات</div>
          </div>
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center">
            <Receipt className="w-5 h-5 text-emerald-600 mx-auto mb-1.5" />
            <div className="text-2xl font-extrabold text-emerald-700">{autoStats.invoices}</div>
            <div className="text-xs text-muted-foreground mt-1">عدد الفواتير</div>
          </div>
          <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/20 text-center">
            <DollarSign className="w-5 h-5 text-amber-600 mx-auto mb-1.5" />
            <div className="text-2xl font-extrabold text-amber-700">
              {autoStats.sales.toLocaleString("ar-EG")}
            </div>
            <div className="text-xs text-muted-foreground mt-1">إجمالي المبيعات (ج.م)</div>
          </div>
        </div>
      </Card>

      {/* 🔹 القسم 2: التواصل */}
      <SectionCard
        icon={<Phone className="w-4 h-4 text-purple-600" />}
        iconBg="bg-purple-500/10"
        title="التواصل"
        number={2}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <NumField label="عدد المكالمات" value={data.calls_count} onChange={setNum("calls_count")} disabled={locked} />
          <NumField label="عدد واتساب" value={data.whatsapp_count} onChange={setNum("whatsapp_count")} disabled={locked} />
          <NumField label="عملاء أُرسل لهم عروض" value={data.offers_sent_count} onChange={setNum("offers_sent_count")} disabled={locked} />
        </div>
      </SectionCard>

      {/* 🔹 القسم 3: التحويل */}
      <SectionCard
        icon={<RefreshCw className="w-4 h-4 text-cyan-600" />}
        iconBg="bg-cyan-500/10"
        title="التحويل"
        number={3}
      >
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <NumField label="عدد العروض" value={data.offers_count} onChange={setNum("offers_count")} disabled={locked} />
          <NumField label="العروض اللي اتحولت لطلبات" value={data.offers_converted_count} onChange={setNum("offers_converted_count")} disabled={locked} />
          <NumField label="الطلبات غير المكتملة" value={data.incomplete_orders_count} onChange={setNum("incomplete_orders_count")} disabled={locked} />
        </div>
      </SectionCard>

      {/* 🔹 القسم 4: المتابعة والنمو */}
      <SectionCard
        icon={<Target className="w-4 h-4 text-emerald-600" />}
        iconBg="bg-emerald-500/10"
        title="المتابعة والنمو"
        number={4}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <NumField label="عدد المتابعات" value={data.followups_count} onChange={setNum("followups_count")} disabled={locked} />
          <NumField label="عدد العملاء الجدد" value={data.new_customers_count} onChange={setNum("new_customers_count")} disabled={locked} />
        </div>
      </SectionCard>

      {/* 🔹 القسم 5: المشاكل */}
      <SectionCard
        icon={<AlertTriangle className="w-4 h-4 text-rose-600" />}
        iconBg="bg-rose-500/10"
        title="المشاكل"
        number={5}
      >
        <div className="space-y-3">
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">أكبر مشكلة قابلتك اليوم</Label>
            <Select
              value={data.main_problem}
              onValueChange={(v) => !locked && setData((d) => ({ ...d, main_problem: v }))}
              disabled={locked}
            >
              <SelectTrigger className="h-11">
                <SelectValue placeholder="اختر المشكلة..." />
              </SelectTrigger>
              <SelectContent>
                {PROBLEM_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-semibold mb-1.5 block">تفاصيل إضافية (اختياري)</Label>
            <Textarea
              value={data.problem_notes}
              onChange={(e) => !locked && setData((d) => ({ ...d, problem_notes: e.target.value }))}
              placeholder="اكتب أي تفاصيل عن المشكلة..."
              rows={3}
              disabled={locked}
            />
          </div>
        </div>
      </SectionCard>

      {/* 🔹 القسم 6: الفرص الضايعة */}
      <SectionCard
        icon={<MessageCircle className="w-4 h-4 text-orange-600" />}
        iconBg="bg-orange-500/10"
        title="الفرص الضايعة"
        number={6}
      >
        <NumField
          label="عملاء مهتمين ولم يتم إغلاقهم"
          value={data.lost_opportunities_count}
          onChange={setNum("lost_opportunities_count")}
          disabled={locked}
        />
      </SectionCard>

      {/* 🔹 زر الإرسال */}
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
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
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
            <AlertDialogAction onClick={submitReport} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              نعم، أرسل
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </motion.div>
  );
}

function SectionCard({
  icon, iconBg, title, number, children,
}: {
  icon: React.ReactNode; iconBg: string; title: string; number: number; children: React.ReactNode;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className={`w-8 h-8 rounded-lg grid place-items-center ${iconBg}`}>{icon}</div>
        <h3 className="font-bold text-base flex-1">
          <span className="text-muted-foreground text-sm">القسم {number}:</span> {title}
        </h3>
      </div>
      {children}
    </Card>
  );
}

function NumField({
  label, value, onChange, disabled,
}: { label: string; value: number; onChange: (v: string) => void; disabled?: boolean }) {
  return (
    <div>
      <Label className="text-xs font-semibold mb-1.5 block text-muted-foreground">{label}</Label>
      <Input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className="h-11 text-center text-lg font-bold"
      />
    </div>
  );
}
