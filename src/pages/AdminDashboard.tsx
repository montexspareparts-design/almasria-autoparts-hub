import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Clock, Eye, LogOut } from "lucide-react";
import AdminProductImages from "@/components/AdminProductImages";
import AdminVideoSettings from "@/components/AdminVideoSettings";
import AdminCatalogs from "@/components/AdminCatalogs";
import type { Database } from "@/integrations/supabase/types";

type DealerApplication = Database["public"]["Tables"]["dealer_applications"]["Row"];
type CustomerTier = Database["public"]["Enums"]["customer_tier"];

const tierLabels: Record<string, string> = {
  wholesale_tier1: "تاجر جملة – درجة أولى",
  wholesale_tier2: "تاجر جملة – درجة ثانية",
  corporate: "شركة / هيئة",
  retail: "عميل قطاعي",
};

const clientTypeLabels: Record<string, string> = {
  wholesale: "تاجر جملة",
  company: "شركة / هيئة",
  workshop: "ورشة / مركز صيانة",
  distributor: "موزع",
};

const AdminDashboard = () => {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [applications, setApplications] = useState<DealerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<DealerApplication | null>(null);
  const [assignedTier, setAssignedTier] = useState<string>("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) { navigate("/auth"); return; }
    if (!authLoading && !isAdmin) { navigate("/dealer"); return; }
    if (isAdmin) fetchApplications();
  }, [user, authLoading, isAdmin]);

  const fetchApplications = async () => {
    const { data } = await supabase
      .from("dealer_applications")
      .select("*")
      .order("created_at", { ascending: false });
    setApplications(data || []);
    setLoading(false);
  };

  const sendNotification = async (app: DealerApplication, status: "approved" | "rejected") => {
    try {
      await supabase.functions.invoke("send-dealer-notification", {
        body: {
          dealerUserId: app.user_id,
          dealerEmail: app.email,
          status,
          businessName: app.business_name,
          reviewNotes,
        },
      });
    } catch (err) {
      console.error("Notification error:", err);
    }
  };

  const handleApprove = async (app: DealerApplication) => {
    if (!assignedTier) { toast({ title: "يرجى تحديد فئة التاجر", variant: "destructive" }); return; }
    setProcessing(true);

    await supabase
      .from("dealer_applications")
      .update({
        status: "approved" as const,
        assigned_tier: assignedTier as CustomerTier,
        reviewed_by: user!.id,
        review_notes: reviewNotes,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", app.id);

    await supabase.from("dealer_accounts").insert({
      user_id: app.user_id,
      application_id: app.id,
      tier: assignedTier as CustomerTier,
    });

    await sendNotification(app, "approved");

    // Send WhatsApp to dealer
    const approveMsg = `✅ مبروك! تمت الموافقة على طلب التسجيل كتاجر في المصرية جروب.\n\n🏢 ${app.business_name}\n📋 الفئة: ${tierLabels[assignedTier] || assignedTier}\n\nيمكنك الآن الدخول إلى حسابك والاستفادة من أسعار الجملة.`;
    const dealerPhone = app.phone.replace(/^0/, "20").replace(/\D/g, "");
    window.open(`https://wa.me/${dealerPhone}?text=${encodeURIComponent(approveMsg)}`, "_blank");

    toast({ title: "تمت الموافقة على الطلب وتم إرسال إشعار للتاجر" });
    setSelectedApp(null);
    setAssignedTier("");
    setReviewNotes("");
    fetchApplications();
    setProcessing(false);
  };

  const handleReject = async (app: DealerApplication) => {
    setProcessing(true);
    await supabase
      .from("dealer_applications")
      .update({
        status: "rejected" as const,
        reviewed_by: user!.id,
        review_notes: reviewNotes,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", app.id);

    await sendNotification(app, "rejected");

    toast({ title: "تم رفض الطلب وتم إرسال إشعار للتاجر" });
    setSelectedApp(null);
    setReviewNotes("");
    fetchApplications();
    setProcessing(false);
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const pendingCount = applications.filter(a => a.status === "pending").length;
  const approvedCount = applications.filter(a => a.status === "approved").length;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-secondary border-b border-primary/20">
        <div className="container mx-auto px-4 flex items-center justify-between h-16">
          <div className="flex items-center gap-4">
            <a href="/" className="text-xl font-bold text-secondary-foreground">
              المصرية <span className="text-gradient-red">جروب</span>
            </a>
            <span className="text-sm bg-primary text-primary-foreground px-2 py-1 rounded">إدارة</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate("/"); }} className="text-secondary-foreground/60">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-foreground mb-6">إدارة طلبات التجار</h1>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{pendingCount}</p>
              <p className="text-xs text-muted-foreground">قيد المراجعة</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{approvedCount}</p>
              <p className="text-xs text-muted-foreground">معتمد</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Eye className="w-6 h-6 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{applications.length}</p>
              <p className="text-xs text-muted-foreground">إجمالي</p>
            </CardContent>
          </Card>
        </div>

        {/* Application Detail Modal */}
        {selectedApp && (
          <Card className="mb-6 border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>تفاصيل الطلب: {selectedApp.business_name}</span>
                <Button variant="ghost" size="sm" onClick={() => setSelectedApp(null)}>✕</Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div><span className="text-muted-foreground">الاسم القانوني:</span> <strong>{selectedApp.legal_name}</strong></div>
                <div><span className="text-muted-foreground">السجل التجاري:</span> <strong>{selectedApp.commercial_register_no}</strong></div>
                <div><span className="text-muted-foreground">البطاقة الضريبية:</span> <strong>{selectedApp.tax_card_no}</strong></div>
                <div><span className="text-muted-foreground">الهاتف:</span> <strong dir="ltr">{selectedApp.phone}</strong></div>
                <div><span className="text-muted-foreground">البريد:</span> <strong dir="ltr">{selectedApp.email}</strong></div>
                <div><span className="text-muted-foreground">المحافظة:</span> <strong>{selectedApp.governorate}</strong></div>
                <div className="md:col-span-2"><span className="text-muted-foreground">العنوان:</span> <strong>{selectedApp.detailed_address}</strong></div>
                <div><span className="text-muted-foreground">نوع العميل:</span> <strong>{clientTypeLabels[selectedApp.client_type]}</strong></div>
                <div><span className="text-muted-foreground">سنوات النشاط:</span> <strong>{selectedApp.years_in_business}</strong></div>
                <div><span className="text-muted-foreground">المناطق:</span> <strong>{selectedApp.coverage_areas || "غير محدد"}</strong></div>
              </div>

              {selectedApp.status === "pending" && (
                <div className="mt-6 border-t border-border pt-4 space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">تحديد فئة التاجر</label>
                    <Select value={assignedTier} onValueChange={setAssignedTier}>
                      <SelectTrigger><SelectValue placeholder="اختر الفئة" /></SelectTrigger>
                      <SelectContent>
                        {Object.entries(tierLabels).map(([k, v]) => (
                          <SelectItem key={k} value={k}>{v}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">ملاحظات المراجعة</label>
                    <Textarea value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="أضف ملاحظاتك هنا..." />
                  </div>
                  <div className="flex gap-3">
                    <Button onClick={() => handleApprove(selectedApp)} disabled={processing} className="gap-2">
                      {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                      موافقة واعتماد
                    </Button>
                    <Button variant="destructive" onClick={() => handleReject(selectedApp)} disabled={processing} className="gap-2">
                      <XCircle className="w-4 h-4" />
                      رفض
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Applications List */}
        <Card>
          <CardHeader>
            <CardTitle>جميع الطلبات</CardTitle>
          </CardHeader>
          <CardContent>
            {applications.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد طلبات</p>
            ) : (
              <div className="space-y-3">
                {applications.map((app) => {
                  const statusInfo = app.status === "pending"
                    ? { label: "قيد المراجعة", color: "text-yellow-500", bg: "bg-yellow-500/10" }
                    : app.status === "approved"
                    ? { label: "معتمد", color: "text-green-500", bg: "bg-green-500/10" }
                    : { label: "مرفوض", color: "text-destructive", bg: "bg-destructive/10" };

                  return (
                    <div
                      key={app.id}
                      className="flex items-center justify-between border border-border rounded-lg p-4 hover:border-primary/30 transition-colors cursor-pointer"
                      onClick={() => setSelectedApp(app)}
                    >
                      <div>
                        <p className="font-bold text-foreground">{app.business_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {clientTypeLabels[app.client_type]} • {app.governorate} • {new Date(app.created_at).toLocaleDateString("ar-EG")}
                        </p>
                      </div>
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${statusInfo.color} ${statusInfo.bg}`}>
                        {statusInfo.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Video Settings */}
        <div className="mt-8">
          <AdminVideoSettings />
        </div>

        {/* Catalogs Management */}
        <div className="mt-8">
          <AdminCatalogs />
        </div>

        {/* Product Images Management */}
        <div className="mt-8">
          <AdminProductImages />
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
