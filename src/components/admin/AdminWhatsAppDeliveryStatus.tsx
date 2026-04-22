import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, CheckCircle2, XCircle, AlertTriangle, MessageCircle, Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type Log = {
  id: string;
  lead_id: string | null;
  phone: string;
  recipient_name: string | null;
  template: string | null;
  message_preview: string | null;
  status: string;
  error_message: string | null;
  created_at: string;
};

const STATUS_META: Record<string, { label: string; cls: string; Icon: typeof CheckCircle2 }> = {
  sent: { label: "تم الإرسال", cls: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30", Icon: CheckCircle2 },
  failed: { label: "فشل", cls: "bg-destructive/10 text-destructive border-destructive/30", Icon: XCircle },
  requires_template: { label: "يتطلب قالب", cls: "bg-amber-500/10 text-amber-600 border-amber-500/30", Icon: AlertTriangle },
  pending: { label: "قيد الإرسال", cls: "bg-muted text-muted-foreground border-border", Icon: Loader2 },
};

const fmtDate = (d: string) =>
  new Date(d).toLocaleString("ar-EG", {
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit",
  });

export default function AdminWhatsAppDeliveryStatus() {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const fetchLogs = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("whatsapp_send_logs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    setLogs((data as Log[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, []);

  const stats = {
    total: logs.length,
    sent: logs.filter(l => l.status === "sent").length,
    failed: logs.filter(l => l.status === "failed").length,
    requires_template: logs.filter(l => l.status === "requires_template").length,
  };

  const filtered = logs.filter(l => {
    if (filter !== "all" && l.status !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (l.phone || "").toLowerCase().includes(q) ||
             (l.recipient_name || "").toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            حالة إرسال الواتساب
          </h2>
          <p className="text-xs text-muted-foreground mt-1">
            سجل تفصيلي لكل رسالة مع الحالة والخطأ والوقت
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchLogs} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ml-2 ${loading ? "animate-spin" : ""}`} />
          تحديث
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { k: "total", label: "الإجمالي", val: stats.total, color: "text-foreground" },
          { k: "sent", label: "تم الإرسال", val: stats.sent, color: "text-emerald-600" },
          { k: "failed", label: "فشل", val: stats.failed, color: "text-destructive" },
          { k: "requires_template", label: "يتطلب قالب", val: stats.requires_template, color: "text-amber-600" },
        ].map(s => (
          <Card key={s.k}>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className={`text-2xl font-bold mt-1 ${s.color}`}>{s.val}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 flex-wrap">
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="sent">ناجح</TabsTrigger>
            <TabsTrigger value="failed">فاشل</TabsTrigger>
            <TabsTrigger value="requires_template">قالب</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="بحث برقم الهاتف أو الاسم..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pr-9"
          />
        </div>
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="py-3">
          <CardTitle className="text-sm">السجلات ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">
              لا توجد سجلات
            </p>
          ) : (
            <div className="divide-y divide-border">
              {filtered.map(log => {
                const meta = STATUS_META[log.status] || STATUS_META.pending;
                const { Icon } = meta;
                return (
                  <div key={log.id} className="p-4 hover:bg-muted/30 transition-colors">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className={meta.cls}>
                            <Icon className="w-3 h-3 ml-1" />
                            {meta.label}
                          </Badge>
                          <span className="font-semibold text-sm">
                            {log.recipient_name || "—"}
                          </span>
                          <span className="text-xs text-muted-foreground" dir="ltr">
                            {log.phone}
                          </span>
                          {log.template && (
                            <Badge variant="secondary" className="text-[10px]">
                              {log.template}
                            </Badge>
                          )}
                        </div>

                        {log.message_preview && (
                          <p className="text-xs text-muted-foreground mt-2 line-clamp-2 whitespace-pre-wrap">
                            {log.message_preview}
                          </p>
                        )}

                        {log.error_message && (
                          <div className="mt-2 p-2 rounded-md bg-destructive/5 border border-destructive/20">
                            <p className="text-xs text-destructive font-medium">خطأ:</p>
                            <p className="text-xs text-destructive/80 mt-0.5 break-all">
                              {log.error_message}
                            </p>
                          </div>
                        )}
                      </div>

                      <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                        {fmtDate(log.created_at)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
