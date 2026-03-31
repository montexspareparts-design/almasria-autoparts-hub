import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CreditCard, ShieldCheck, Globe, Activity, Loader2, CheckCircle, XCircle, Copy, ExternalLink, RefreshCw, Receipt, ChevronLeft, ChevronRight } from "lucide-react";
import { PAYMOB_CALLBACK_PATH, buildPaymobReturnUrl } from "@/lib/paymob";

const TX_PAGE_SIZE = 15;

const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  success: { label: "ناجحة ✅", variant: "default" },
  pending: { label: "معلقة ⏳", variant: "secondary" },
  failed: { label: "فاشلة ❌", variant: "destructive" },
};

const AdminPaymobSettings = () => {
  const { toast } = useToast();
  const [testing, setTesting] = useState(false);
  const [healthResult, setHealthResult] = useState<null | { ok: boolean; message: string; details?: Record<string, unknown> }>(null);
  const [txPage, setTxPage] = useState(0);

  // Check if public key is configured by calling the intention endpoint with a dry-run
  const { data: keyStatus, isLoading: keyLoading, refetch: refetchKey } = useQuery({
    queryKey: ["paymob-key-status"],
    queryFn: async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return { configured: false, masked: "" };

        const { data, error } = await supabase.functions.invoke("create-paymob-intention", {
          body: { dry_run: true },
        });
        if (error) return { configured: false, masked: "", error: error.message };
        return {
          configured: !!data?.public_key,
          masked: data?.public_key ? `${data.public_key.slice(0, 10)}...${data.public_key.slice(-4)}` : "",
        };
      } catch {
        return { configured: false, masked: "" };
      }
    },
    staleTime: 60_000,
  });

  // Transactions log
  const { data: txData, isLoading: txLoading } = useQuery({
    queryKey: ["payment-transactions", txPage],
    queryFn: async () => {
      const from = txPage * TX_PAGE_SIZE;
      const to = from + TX_PAGE_SIZE - 1;
      const { data, error, count } = await supabase
        .from("payment_transactions")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);
      if (error) throw error;
      return { rows: data || [], total: count || 0 };
    },
  });

  const callbackUrl = typeof window !== "undefined" ? buildPaymobReturnUrl() : "";
    ? `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/paymob-webhook`
    : "";

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: `تم نسخ ${label} ✅` });
  };

  const runHealthCheck = async () => {
    setTesting(true);
    setHealthResult(null);
    try {
      const checks: { label: string; ok: boolean; detail: string }[] = [];

      // 1. Check edge function is reachable
      try {
        const { data: { session } } = await supabase.auth.getSession();
        const { data, error } = await supabase.functions.invoke("create-paymob-intention", {
          body: { dry_run: true },
        });
        if (error) {
          checks.push({ label: "Edge Function", ok: false, detail: error.message });
        } else {
          checks.push({ label: "Edge Function", ok: true, detail: "متصلة وتعمل" });
          checks.push({
            label: "المفتاح العام (Public Key)",
            ok: !!data?.public_key,
            detail: data?.public_key ? "مُعَد بشكل صحيح" : "غير مُعَد — أضفه في Secrets",
          });
        }
      } catch (e: any) {
        checks.push({ label: "Edge Function", ok: false, detail: e.message });
      }

      // 2. Check webhook function is reachable (OPTIONS)
      try {
        const res = await fetch(webhookUrl, { method: "OPTIONS" });
        checks.push({
          label: "Webhook Endpoint",
          ok: res.ok,
          detail: res.ok ? "متصل ويستجيب" : `خطأ ${res.status}`,
        });
      } catch {
        checks.push({ label: "Webhook Endpoint", ok: false, detail: "لا يمكن الوصول" });
      }

      const allOk = checks.every(c => c.ok);
      setHealthResult({
        ok: allOk,
        message: allOk ? "جميع الاختبارات ناجحة ✅" : "بعض الاختبارات فشلت ⚠️",
        details: Object.fromEntries(checks.map(c => [c.label, { ok: c.ok, detail: c.detail }])),
      });
    } catch (e: any) {
      setHealthResult({ ok: false, message: e.message });
    }
    setTesting(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <CreditCard className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-lg font-bold text-foreground">إعدادات Paymob</h2>
          <p className="text-xs text-muted-foreground">إدارة بوابة الدفع ومراقبة حالة الاتصال</p>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Key Status */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-primary" />
              حالة المفاتيح
            </CardTitle>
            <CardDescription className="text-xs">
              المفاتيح السرية محفوظة بأمان في Backend Secrets
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
              <div>
                <p className="text-xs font-medium text-foreground">Public Key</p>
                {keyLoading ? (
                  <Loader2 className="w-3 h-3 animate-spin text-muted-foreground mt-1" />
                ) : (
                  <p className="text-xs text-muted-foreground font-mono mt-0.5 dir-ltr text-left">
                    {keyStatus?.masked || "غير مُعَد"}
                  </p>
                )}
              </div>
              <Badge variant={keyStatus?.configured ? "default" : "destructive"} className="text-[10px]">
                {keyStatus?.configured ? "مُفعَّل" : "غير مُفعَّل"}
              </Badge>
            </div>

            {["PAYMOB_SECRET_KEY", "PAYMOB_HMAC_SECRET", "PAYMOB_INTEGRATION_ID"].map((name) => (
              <div key={name} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 border border-border/50">
                <div>
                  <p className="text-xs font-medium text-foreground">{name.replace("PAYMOB_", "")}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">••••••••</p>
                </div>
                <Badge variant="secondary" className="text-[10px]">محمي</Badge>
              </div>
            ))}

            <Button variant="outline" size="sm" className="w-full gap-2 text-xs" onClick={() => refetchKey()}>
              <RefreshCw className="w-3 h-3" />
              تحديث الحالة
            </Button>
          </CardContent>
        </Card>

        {/* Callback URLs */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Globe className="w-4 h-4 text-primary" />
              روابط Callback
            </CardTitle>
            <CardDescription className="text-xs">
              انسخ هذه الروابط وأضفها في لوحة تحكم Paymob
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">رابط العودة (Return URL)</label>
              <div className="flex gap-2">
                <Input
                  dir="ltr"
                  readOnly
                  value={callbackUrl}
                  className="text-xs font-mono text-left h-9 bg-muted/50"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => copyToClipboard(callbackUrl, "Return URL")}
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                يتم توجيه العميل إليه بعد إتمام الدفع
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground">رابط Webhook (Server Callback)</label>
              <div className="flex gap-2">
                <Input
                  dir="ltr"
                  readOnly
                  value={webhookUrl}
                  className="text-xs font-mono text-left h-9 bg-muted/50"
                />
                <Button
                  variant="outline"
                  size="icon"
                  className="h-9 w-9 shrink-0"
                  onClick={() => copyToClipboard(webhookUrl, "Webhook URL")}
                >
                  <Copy className="w-3.5 h-3.5" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">
                يستقبل إشعارات Paymob لتحديث حالة الطلبات تلقائياً (HMAC-SHA512)
              </p>
            </div>

            <a
              href="https://accept.paymob.com"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline"
            >
              <ExternalLink className="w-3 h-3" />
              فتح لوحة تحكم Paymob
            </a>
          </CardContent>
        </Card>
      </div>

      {/* Health Check */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            فحص حالة الاتصال
          </CardTitle>
          <CardDescription className="text-xs">
            تحقق من أن جميع مكونات نظام الدفع تعمل بشكل صحيح
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={runHealthCheck}
            disabled={testing}
            className="gap-2"
          >
            {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Activity className="w-4 h-4" />}
            {testing ? "جاري الفحص..." : "بدء الفحص"}
          </Button>

          {healthResult && (
            <div className="space-y-3">
              <div className={`flex items-center gap-2 p-3 rounded-lg border ${
                healthResult.ok
                  ? "bg-green-500/5 border-green-500/20 text-green-700 dark:text-green-400"
                  : "bg-amber-500/5 border-amber-500/20 text-amber-700 dark:text-amber-400"
              }`}>
                {healthResult.ok ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                <span className="text-sm font-medium">{healthResult.message}</span>
              </div>

              {healthResult.details && (
                <div className="space-y-2">
                  {Object.entries(healthResult.details).map(([label, val]: [string, any]) => (
                    <div
                      key={label}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/50"
                    >
                      <div className="flex items-center gap-2">
                        {val.ok ? (
                          <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                        ) : (
                          <XCircle className="w-3.5 h-3.5 text-destructive" />
                        )}
                        <span className="text-xs font-medium">{label}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">{val.detail}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPaymobSettings;
