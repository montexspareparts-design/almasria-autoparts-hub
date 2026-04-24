import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Smartphone,
  Copy,
  RefreshCw,
  CheckCircle2,
  Wrench,
  Hash,
  Tag,
  ChevronDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import {
  getMobileErrorReport,
  formatReportText,
  type MobileErrorReport,
  type Severity,
} from "@/lib/mobileErrorReport";
import { cn } from "@/lib/utils";

const SEVERITY_STYLES: Record<Severity, { badge: string; ring: string; icon: string; label: string }> = {
  critical: {
    badge: "bg-destructive text-destructive-foreground",
    ring: "border-destructive/40 bg-destructive/5",
    icon: "text-destructive",
    label: "🔴 حرج",
  },
  high: {
    badge: "bg-orange-500 text-white",
    ring: "border-orange-500/40 bg-orange-500/5",
    icon: "text-orange-500",
    label: "🟠 عالي",
  },
  medium: {
    badge: "bg-yellow-500 text-black",
    ring: "border-yellow-500/40 bg-yellow-500/5",
    icon: "text-yellow-600",
    label: "🟡 متوسط",
  },
  low: {
    badge: "bg-emerald-500 text-white",
    ring: "border-emerald-500/40 bg-emerald-500/5",
    icon: "text-emerald-600",
    label: "🟢 منخفض",
  },
};

const CATEGORY_LABEL: Record<NonNullable<MobileErrorReport["topIssue"]>["category"], string> = {
  render: "Render",
  content: "محتوى",
  console: "Console",
  network: "شبكة",
  layout: "تخطيط",
};

const AdminMobileErrorReport = () => {
  const { toast } = useToast();
  const [report, setReport] = useState<MobileErrorReport | null>(null);
  const [showRaw, setShowRaw] = useState(false);

  const generate = () => {
    setReport(getMobileErrorReport());
    setShowRaw(false);
  };

  const copy = async () => {
    if (!report) return;
    await navigator.clipboard.writeText(formatReportText(report));
    toast({ title: "تم النسخ", description: "تم نسخ التقرير إلى الحافظة." });
  };

  const top = report?.topIssue ?? null;
  const noiseCount = report ? report.totalLogCount - (top?.occurrences ?? 0) : 0;

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">تقرير أخطاء الجوال</h2>
            <p className="text-xs text-muted-foreground">
              يعرض الخطأ الأهم لكل جلسة فقط مع خطوة إصلاح مقترحة
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={generate}>
            <RefreshCw className="w-4 h-4 ml-1" /> توليد تقرير
          </Button>
          <Button size="sm" onClick={copy} disabled={!report}>
            <Copy className="w-4 h-4 ml-1" /> نسخ
          </Button>
        </div>
      </div>

      {!report && (
        <p className="text-sm text-muted-foreground text-center py-8">
          اضغط "توليد تقرير" لرصد أهم مشكلة في الجلسة الحالية.
        </p>
      )}

      {report && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">
              📐 {report.viewport.width}×{report.viewport.height}
              {report.viewport.isMobile ? " (موبايل)" : ""}
            </Badge>
            {top ? (
              <Badge className={SEVERITY_STYLES[top.severity].badge}>
                {SEVERITY_STYLES[top.severity].label}
              </Badge>
            ) : (
              <Badge className="bg-emerald-500 text-white">
                <CheckCircle2 className="w-3 h-3 ml-1" /> سليم
              </Badge>
            )}
            {noiseCount > 0 && (
              <Badge variant="secondary">
                +{noiseCount} رسالة مجمّعة
              </Badge>
            )}
          </div>

          {/* البطاقة الرئيسية: خطأ واحد فقط */}
          {!top ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
              <p className="font-bold text-emerald-700 dark:text-emerald-400">
                الجلسة سليمة
              </p>
              <p className="text-sm text-muted-foreground">
                لا توجد أخطاء أو مشاكل عرض مرصودة على هذه الشاشة.
              </p>
            </div>
          ) : (
            <div className={cn("rounded-xl border p-5 space-y-4", SEVERITY_STYLES[top.severity].ring)}>
              {/* رأس البطاقة */}
              <div className="flex items-start gap-3">
                <div className={cn("text-2xl leading-none", SEVERITY_STYLES[top.severity].icon)}>
                  {top.severity === "critical" ? "🚨" : top.severity === "high" ? "⚠️" : top.severity === "medium" ? "⚡" : "ℹ️"}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-base leading-tight">{top.title}</h3>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Tag className="w-2.5 h-2.5" /> {CATEGORY_LABEL[top.category]}
                    </Badge>
                    <Badge variant="outline" className="text-[10px] gap-1">
                      <Hash className="w-2.5 h-2.5" /> {top.occurrences}× تكرار
                    </Badge>
                  </div>
                </div>
              </div>

              {/* تفاصيل تقنية */}
              <div className="rounded-md bg-background/60 border border-border/40 p-3">
                <p className="text-[11px] font-semibold text-muted-foreground mb-1">التفاصيل التقنية</p>
                <p className="text-xs font-mono leading-relaxed break-words" dir="ltr">
                  {top.detail}
                </p>
              </div>

              {/* خطوة الإصلاح */}
              <div className="rounded-md bg-primary/5 border border-primary/20 p-3 space-y-1.5">
                <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                  <Wrench className="w-4 h-4" />
                  خطوة الإصلاح المقترحة
                </div>
                <p className="text-sm leading-relaxed text-foreground/90">
                  {top.suggestedFix}
                </p>
              </div>

              {noiseCount > 0 && (
                <p className="text-[11px] text-muted-foreground text-center pt-1 border-t border-border/40">
                  تم حجب {noiseCount} رسالة إضافية (مكررة أو أقل أهمية)
                </p>
              )}
            </div>
          )}

          {/* السجل الخام — مطوي افتراضياً */}
          <div>
            <button
              type="button"
              onClick={() => setShowRaw((s) => !s)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
            >
              <ChevronDown className={cn("w-3 h-3 transition-transform", showRaw && "rotate-180")} />
              {showRaw ? "إخفاء" : "عرض"} السجل الخام الكامل
            </button>
            {showRaw && (
              <Textarea
                readOnly
                value={formatReportText(report)}
                className="font-mono text-[11px] min-h-[220px] leading-relaxed mt-2"
                dir="ltr"
              />
            )}
          </div>
        </div>
      )}
    </Card>
  );
};

export default AdminMobileErrorReport;
