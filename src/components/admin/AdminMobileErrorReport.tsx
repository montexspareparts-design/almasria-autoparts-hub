import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Smartphone, Copy, RefreshCw, AlertTriangle, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getMobileErrorReport, formatReportText, type MobileErrorReport } from "@/lib/mobileErrorReport";

const AdminMobileErrorReport = () => {
  const { toast } = useToast();
  const [report, setReport] = useState<MobileErrorReport | null>(null);

  const generate = () => {
    const r = getMobileErrorReport();
    setReport(r);
  };

  const copy = async () => {
    if (!report) return;
    await navigator.clipboard.writeText(formatReportText(report));
    toast({ title: "تم النسخ", description: "تم نسخ التقرير إلى الحافظة." });
  };

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <Smartphone className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-bold">تقرير أخطاء الجوال</h2>
            <p className="text-xs text-muted-foreground">يجمع تحذيرات الـ Console وأسباب عدم ظهور المحتوى</p>
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
          اضغط "توليد تقرير" لرصد المشاكل في الجلسة الحالية.
        </p>
      )}

      {report && (
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2 text-xs">
            <Badge variant="outline">📐 {report.viewport.width}×{report.viewport.height}{report.viewport.isMobile ? " (موبايل)" : ""}</Badge>
            <Badge variant={report.errors.length ? "destructive" : "secondary"}>
              <AlertCircle className="w-3 h-3 ml-1" /> {report.errors.length} خطأ
            </Badge>
            <Badge variant={report.warnings.length ? "default" : "secondary"}>
              <AlertTriangle className="w-3 h-3 ml-1" /> {report.warnings.length} تحذير
            </Badge>
            <Badge variant={report.contentIssues.length ? "destructive" : "secondary"}>
              {report.contentIssues.length} مشكلة عرض
            </Badge>
          </div>

          <div className="rounded-lg bg-muted/40 border border-border/40 p-3">
            <p className="text-sm font-semibold mb-1">الخلاصة</p>
            <p className="text-sm text-muted-foreground">{report.summary}</p>
          </div>

          <Textarea
            readOnly
            value={formatReportText(report)}
            className="font-mono text-[11px] min-h-[280px] leading-relaxed"
            dir="ltr"
          />
        </div>
      )}
    </Card>
  );
};

export default AdminMobileErrorReport;
