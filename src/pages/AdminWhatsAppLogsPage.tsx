import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Navigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, RefreshCw, Search, MessageSquare } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

type LogRow = {
  id: string;
  phone: string;
  recipient_name: string | null;
  template: string | null;
  message_preview: string | null;
  status: string;
  error_message: string | null;
  provider_response: any;
  created_at: string;
};

const STATUS_LABEL: Record<string, { ar: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  sent: { ar: "تم الإرسال", variant: "default" },
  requires_template: { ar: "يحتاج قالب معتمد", variant: "secondary" },
  failed: { ar: "فشل", variant: "destructive" },
  pending: { ar: "قيد الإرسال", variant: "outline" },
};

const TEMPLATES = [
  { value: "all", label: "كل القوالب" },
  { value: "retail_welcome", label: "ترحيب القطاعي" },
];

const STATUSES = [
  { value: "all", label: "كل الحالات" },
  { value: "sent", label: "تم الإرسال" },
  { value: "requires_template", label: "يحتاج قالب" },
  { value: "failed", label: "فشل" },
  { value: "pending", label: "قيد الإرسال" },
];

export default function AdminWhatsAppLogsPage() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [rows, setRows] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [phoneSearch, setPhoneSearch] = useState("");
  const [template, setTemplate] = useState<string>("retail_welcome");
  const [status, setStatus] = useState<string>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from("whatsapp_send_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    if (template !== "all") q = q.eq("template", template);
    if (status !== "all") q = q.eq("status", status);
    if (phoneSearch.trim()) {
      const cleaned = phoneSearch.trim().replace(/\D/g, "");
      if (cleaned) q = q.ilike("phone", `%${cleaned}%`);
    }

    const { data, error } = await q;
    if (!error) setRows((data || []) as LogRow[]);
    setLoading(false);
  };

  useEffect(() => {
    if (!authLoading && isAdmin) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAdmin, template, status]);

  const stats = useMemo(() => {
    const s = { total: rows.length, sent: 0, requires_template: 0, failed: 0, pending: 0 };
    rows.forEach((r) => {
      if (r.status in s) (s as any)[r.status]++;
    });
    return s;
  }, [rows]);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user || !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8" dir="rtl">
      <Helmet>
        <title>سجل رسائل واتساب — المصرية جروب</title>
      </Helmet>

      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
              <MessageSquare className="h-7 w-7 text-primary" />
              سجل رسائل واتساب
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              متابعة رسائل الترحيب وحالات الإرسال
            </p>
          </div>
          <Button onClick={load} variant="outline" size="sm" disabled={loading}>
            <RefreshCw className={`h-4 w-4 ml-2 ${loading ? "animate-spin" : ""}`} />
            تحديث
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">الإجمالي</div>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">تم الإرسال</div>
              <div className="text-2xl font-bold text-green-600">{stats.sent}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">يحتاج قالب</div>
              <div className="text-2xl font-bold text-amber-600">{stats.requires_template}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">فشل</div>
              <div className="text-2xl font-bold text-destructive">{stats.failed}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-xs text-muted-foreground">قيد الإرسال</div>
              <div className="text-2xl font-bold text-muted-foreground">{stats.pending}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">فلاتر البحث</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="md:col-span-2 relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث برقم الموبايل..."
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && load()}
                className="pr-9"
              />
            </div>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TEMPLATES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="md:col-span-4">
              <Button onClick={load} className="w-full md:w-auto">
                <Search className="h-4 w-4 ml-2" /> بحث
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="p-12 flex justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : rows.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                لا توجد سجلات مطابقة
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-right">
                    <tr>
                      <th className="p-3 font-medium">الموبايل</th>
                      <th className="p-3 font-medium">الاسم</th>
                      <th className="p-3 font-medium">القالب</th>
                      <th className="p-3 font-medium">الحالة</th>
                      <th className="p-3 font-medium">التاريخ</th>
                      <th className="p-3 font-medium">تفاصيل</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => {
                      const sLabel = STATUS_LABEL[r.status] || { ar: r.status, variant: "outline" as const };
                      const isOpen = expanded === r.id;
                      return (
                        <>
                          <tr key={r.id} className="border-t hover:bg-muted/30">
                            <td className="p-3 font-mono" dir="ltr">{r.phone}</td>
                            <td className="p-3">{r.recipient_name || "—"}</td>
                            <td className="p-3 text-xs text-muted-foreground">{r.template || "—"}</td>
                            <td className="p-3">
                              <Badge variant={sLabel.variant}>{sLabel.ar}</Badge>
                            </td>
                            <td className="p-3 text-xs text-muted-foreground whitespace-nowrap">
                              {format(new Date(r.created_at), "dd MMM yyyy - HH:mm", { locale: ar })}
                            </td>
                            <td className="p-3">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setExpanded(isOpen ? null : r.id)}
                              >
                                {isOpen ? "إخفاء" : "عرض"}
                              </Button>
                            </td>
                          </tr>
                          {isOpen && (
                            <tr className="bg-muted/20">
                              <td colSpan={6} className="p-4 space-y-2">
                                {r.error_message && (
                                  <div className="text-destructive text-xs">
                                    <strong>خطأ:</strong> {r.error_message}
                                  </div>
                                )}
                                {r.message_preview && (
                                  <div className="bg-background p-3 rounded border whitespace-pre-wrap text-xs">
                                    {r.message_preview}
                                  </div>
                                )}
                                {r.provider_response && (
                                  <details className="text-xs">
                                    <summary className="cursor-pointer text-muted-foreground">
                                      رد المزود (JSON)
                                    </summary>
                                    <pre className="mt-2 p-3 bg-background rounded border overflow-x-auto" dir="ltr">
                                      {JSON.stringify(r.provider_response, null, 2)}
                                    </pre>
                                  </details>
                                )}
                              </td>
                            </tr>
                          )}
                        </>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
