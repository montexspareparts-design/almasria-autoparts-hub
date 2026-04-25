import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldCheck, ShieldX, Clock, User, FileText } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface PermissionRequest {
  id: string;
  requester_id: string;
  requester_name: string | null;
  requester_email: string | null;
  action_type: string;
  action_description: string;
  context_data: any;
  reason: string | null;
  status: "pending" | "approved" | "rejected";
  reviewed_by: string | null;
  reviewed_at: string | null;
  admin_response: string | null;
  created_at: string;
}

export default function AdminPermissionRequests() {
  const { user, isAdmin } = useAuth();
  const [requests, setRequests] = useState<PermissionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [responses, setResponses] = useState<Record<string, string>>({});
  const [activeTab, setActiveTab] = useState<"pending" | "all">("pending");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("permission_requests" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) {
      toast.error("تعذّر تحميل الطلبات", { description: error.message });
    } else {
      setRequests((data as any[]) ?? []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!isAdmin) return;
    load();

    // Realtime updates
    const channel = supabase
      .channel("permission_requests_admin")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "permission_requests" },
        () => load()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isAdmin]);

  const review = async (id: string, status: "approved" | "rejected") => {
    if (!user) return;
    const { error } = await supabase
      .from("permission_requests" as any)
      .update({
        status,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        admin_response: responses[id]?.trim() || null,
      })
      .eq("id", id);

    if (error) {
      toast.error("فشل تحديث الطلب", { description: error.message });
      return;
    }
    toast.success(status === "approved" ? "تمت الموافقة" : "تم الرفض");
    setResponses((r) => ({ ...r, [id]: "" }));
  };

  if (!isAdmin) {
    return (
      <div className="rounded-lg border bg-muted/30 p-6 text-center text-muted-foreground">
        هذه الصفحة متاحة للأدمن فقط
      </div>
    );
  }

  const pending = requests.filter((r) => r.status === "pending");
  const visible = activeTab === "pending" ? pending : requests;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            طلبات الصلاحيات من الموظفين
          </CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            راجع طلبات الموظفين لتنفيذ إجراءات خارج صلاحياتهم
          </p>
        </div>
        {pending.length > 0 && (
          <Badge variant="destructive" className="text-base">
            {pending.length} طلب جديد
          </Badge>
        )}
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="mb-4">
            <TabsTrigger value="pending">
              قيد الانتظار {pending.length > 0 && `(${pending.length})`}
            </TabsTrigger>
            <TabsTrigger value="all">السجل الكامل</TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-3">
            {loading ? (
              <div className="py-12 text-center text-muted-foreground">جاري التحميل...</div>
            ) : visible.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                {activeTab === "pending" ? "لا توجد طلبات قيد الانتظار" : "لا توجد طلبات"}
              </div>
            ) : (
              visible.map((req) => (
                <div
                  key={req.id}
                  className="rounded-lg border bg-card p-4 transition hover:shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-semibold">{req.requester_name || "موظف"}</span>
                        {req.requester_email && (
                          <span className="text-muted-foreground">({req.requester_email})</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {formatDistanceToNow(new Date(req.created_at), {
                          addSuffix: true,
                          locale: ar,
                        })}
                      </div>
                    </div>
                    <Badge
                      variant={
                        req.status === "pending"
                          ? "secondary"
                          : req.status === "approved"
                          ? "default"
                          : "destructive"
                      }
                    >
                      {req.status === "pending"
                        ? "قيد الانتظار"
                        : req.status === "approved"
                        ? "تمت الموافقة"
                        : "مرفوض"}
                    </Badge>
                  </div>

                  <div className="mt-3 rounded-md bg-muted/50 p-3">
                    <div className="flex items-start gap-2 text-sm">
                      <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      <div>
                        <div className="font-medium">{req.action_description}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          النوع: {req.action_type}
                        </div>
                      </div>
                    </div>
                    {req.reason && (
                      <div className="mt-2 border-t pt-2 text-sm">
                        <span className="font-medium text-muted-foreground">السبب: </span>
                        {req.reason}
                      </div>
                    )}
                  </div>

                  {req.status === "pending" ? (
                    <div className="mt-3 space-y-2">
                      <Textarea
                        placeholder="رد للموظف (اختياري)"
                        rows={2}
                        value={responses[req.id] || ""}
                        onChange={(e) =>
                          setResponses((r) => ({ ...r, [req.id]: e.target.value }))
                        }
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          onClick={() => review(req.id, "approved")}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <ShieldCheck className="ml-1 h-4 w-4" />
                          موافقة
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => review(req.id, "rejected")}
                        >
                          <ShieldX className="ml-1 h-4 w-4" />
                          رفض
                        </Button>
                      </div>
                    </div>
                  ) : (
                    req.admin_response && (
                      <div className="mt-3 rounded-md border-r-2 border-primary bg-primary/5 p-2 text-sm">
                        <span className="font-medium">رد الأدمن: </span>
                        {req.admin_response}
                      </div>
                    )
                  )}
                </div>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
