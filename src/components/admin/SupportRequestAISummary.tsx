import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Bot, Sparkles, AlertCircle, Wrench, RefreshCw, Lightbulb, Package } from "lucide-react";

interface AISummary {
  summary: string;
  parts_mentioned: string[];
  urgency: "urgent" | "normal" | "inquiry";
  intent: string;
  suggested_action: string;
}

interface Props {
  requestId: string | null;
  customerName?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const intentLabels: Record<string, string> = {
  price_quote: "طلب تسعير",
  availability: "استعلام توافر",
  complaint: "شكوى",
  order_status: "متابعة طلب",
  technical_help: "مساعدة فنية",
  general_inquiry: "استفسار عام",
  other: "أخرى",
};

const urgencyConfig: Record<string, { label: string; className: string; icon: typeof AlertCircle }> = {
  urgent: { label: "🚨 عاجل", className: "bg-red-600 hover:bg-red-600 text-white", icon: AlertCircle },
  normal: { label: "📋 طلب عادي", className: "bg-blue-600 hover:bg-blue-600 text-white", icon: Wrench },
  inquiry: { label: "💡 استفسار", className: "bg-emerald-600 hover:bg-emerald-600 text-white", icon: Lightbulb },
};

export default function SupportRequestAISummary({ requestId, customerName, open, onOpenChange }: Props) {
  const [summary, setSummary] = useState<AISummary | null>(null);
  const [loading, setLoading] = useState(false);
  const [cached, setCached] = useState(false);
  const { toast } = useToast();

  const fetchSummary = async (force = false) => {
    if (!requestId) return;
    setLoading(true);
    setSummary(null);
    try {
      // Force refresh = clear ai_summary in context first via direct update is overkill; just request
      const { data, error } = await supabase.functions.invoke("summarize-support-conversation", {
        body: { request_id: requestId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setSummary((data as any).summary);
      setCached(!!(data as any).cached);
    } catch (e: any) {
      toast({
        title: "تعذر إنشاء الملخص",
        description: e?.message || "حاول مرة أخرى",
        variant: "destructive",
      });
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && requestId) {
      fetchSummary();
    } else if (!open) {
      setSummary(null);
      setCached(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, requestId]);

  const urgency = summary ? urgencyConfig[summary.urgency] : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="w-5 h-5 text-purple-600" />
            ملخص المحادثة الذكي
            {cached && (
              <Badge variant="outline" className="text-[10px] h-5 ms-2">من الكاش</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {customerName ? `طلب من: ${customerName}` : "تحليل سريع لطلب العميل من الشات بوت"}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="space-y-3 py-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Bot className="w-4 h-4 animate-pulse text-purple-600" />
              جاري تحليل المحادثة بالـ AI...
            </div>
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        )}

        {summary && !loading && (
          <div className="space-y-4">
            {/* Urgency + Intent */}
            <div className="flex items-center gap-2 flex-wrap">
              {urgency && (
                <Badge className={urgency.className}>{urgency.label}</Badge>
              )}
              <Badge variant="outline" className="gap-1">
                <Wrench className="w-3 h-3" />
                {intentLabels[summary.intent] || summary.intent}
              </Badge>
            </div>

            {/* Main summary */}
            <div className="bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900 rounded-lg p-3">
              <div className="text-xs font-semibold text-purple-700 dark:text-purple-400 mb-1.5 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                ملخص الطلب
              </div>
              <p className="text-sm leading-relaxed">{summary.summary}</p>
            </div>

            {/* Parts mentioned */}
            {summary.parts_mentioned.length > 0 && (
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1.5 flex items-center gap-1">
                  <Package className="w-3 h-3" />
                  القطع/الفئات المذكورة
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {summary.parts_mentioned.map((p, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {p}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested action */}
            <div className="bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900 rounded-lg p-3">
              <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 mb-1 flex items-center gap-1">
                <Lightbulb className="w-3 h-3" />
                خطوة مقترحة للبدء
              </div>
              <p className="text-sm">{summary.suggested_action}</p>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t">
              {cached && (
                <Button size="sm" variant="ghost" onClick={() => fetchSummary(true)} className="gap-1">
                  <RefreshCw className="w-3 h-3" />
                  تحديث
                </Button>
              )}
              <Button size="sm" onClick={() => onOpenChange(false)}>تم</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
