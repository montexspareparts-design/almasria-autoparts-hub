import { useEffect, useState, lazy, Suspense } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Clock, Eye, LogOut, Trash2, Users, ShoppingBag, Video, FileText, Image, Brain, Zap, Bell, ListVideo, Menu, X, ChevronRight, Package, BarChart3 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import type { Database } from "@/integrations/supabase/types";

// Lazy load admin sections
const AdminOrders = lazy(() => import("@/components/AdminOrders"));
const AdminHeroVideo = lazy(() => import("@/components/AdminHeroVideo"));
const AdminVideoSettings = lazy(() => import("@/components/AdminVideoSettings"));
const AdminPriceLists = lazy(() => import("@/components/AdminPriceLists"));
const AdminCatalogs = lazy(() => import("@/components/AdminCatalogs"));
const AdminProductImages = lazy(() => import("@/components/AdminProductImages"));
const AdminImageVerifier = lazy(() => import("@/components/AdminImageVerifier"));
const AdminERPSync = lazy(() => import("@/components/AdminERPSync"));
const AdminPushNotifications = lazy(() => import("@/components/AdminPushNotifications"));
const AdminProducts = lazy(() => import("@/components/AdminProducts"));
const AdminAnalytics = lazy(() => import("@/components/AdminAnalytics"));
const AdminCustomerProfile = lazy(() => import("@/components/AdminCustomerProfile"));

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

const sidebarSections = [
  { id: "analytics", label: "التحليلات", icon: BarChart3 },
  { id: "customers", label: "ملف العملاء", icon: Users },
  { id: "dealers", label: "طلبات التجار", icon: Users },
  { id: "products", label: "إدارة المنتجات", icon: Package },
  { id: "orders", label: "إدارة الطلبات", icon: ShoppingBag },
  { id: "price-lists", label: "كشوفات الأسعار", icon: FileText },
  { id: "catalogs", label: "الكتالوجات", icon: FileText },
  { id: "hero-video", label: "فيديو الصفحة الرئيسية", icon: Video },
  { id: "youtube", label: "إعدادات YouTube", icon: ListVideo },
  { id: "product-images", label: "صور المنتجات", icon: Image },
  { id: "image-verifier", label: "مراجعة الصور (AI)", icon: Brain },
  { id: "push-notifications", label: "إشعارات Push", icon: Bell },
  { id: "erp", label: "ربط ERP", icon: Zap },
];

const SectionLoader = () => (
  <div className="flex items-center justify-center py-16">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
);

const AdminDashboard = () => {
  const { user, isAdmin, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [applications, setApplications] = useState<DealerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<DealerApplication | null>(null);
  const [assignedTier, setAssignedTier] = useState<string>("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const activeSection = searchParams.get("section") || "analytics";

  const setActiveSection = (section: string) => {
    setSearchParams({ section });
  };

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

  const handleDelete = async (app: DealerApplication) => {
    setProcessing(true);
    await supabase.from("dealer_accounts").delete().eq("application_id", app.id);
    await supabase.from("dealer_applications").delete().eq("id", app.id);
    toast({ title: "تم حذف الطلب والتاجر بنجاح" });
    setSelectedApp(null);
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

  const renderDealersSection = () => {
    const pendingApps = applications.filter(a => a.status === "pending").length;
    const approvedApps = applications.filter(a => a.status === "approved").length;

    return (
      <div className="space-y-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="w-6 h-6 text-yellow-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{pendingApps}</p>
              <p className="text-xs text-muted-foreground">قيد المراجعة</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{approvedApps}</p>
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

        {/* Selected Application Detail */}
        {selectedApp && (
          <Card className="border-primary/30">
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
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10" disabled={processing}>
                          <Trash2 className="w-4 h-4" />
                          حذف
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>تأكيد حذف الطلب</AlertDialogTitle>
                          <AlertDialogDescription>
                            هل أنت متأكد من حذف طلب "{selectedApp.business_name}"؟ سيتم حذف الطلب وحساب التاجر المرتبط به نهائياً.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>إلغاء</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(selectedApp)} className="bg-destructive hover:bg-destructive/90">
                            حذف نهائي
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              )}

              {selectedApp.status !== "pending" && (
                <div className="mt-6 border-t border-border pt-4">
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" className="gap-2 border-destructive/30 text-destructive hover:bg-destructive/10" disabled={processing}>
                        <Trash2 className="w-4 h-4" />
                        حذف الطلب والتاجر
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>تأكيد حذف الطلب</AlertDialogTitle>
                        <AlertDialogDescription>
                          هل أنت متأكد من حذف طلب "{selectedApp.business_name}"؟ سيتم حذف الطلب وحساب التاجر المرتبط به نهائياً.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(selectedApp)} className="bg-destructive hover:bg-destructive/90">
                          حذف نهائي
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
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
      </div>
    );
  };

  const renderActiveSection = () => {
    switch (activeSection) {
      case "analytics":
        return <Suspense fallback={<SectionLoader />}><AdminAnalytics /></Suspense>;
      case "customers":
        return <Suspense fallback={<SectionLoader />}><AdminCustomerProfile /></Suspense>;
      case "dealers":
        return renderDealersSection();
      case "products":
        return <Suspense fallback={<SectionLoader />}><AdminProducts /></Suspense>;
      case "orders":
        return <Suspense fallback={<SectionLoader />}><AdminOrders /></Suspense>;
      case "price-lists":
        return <Suspense fallback={<SectionLoader />}><AdminPriceLists /></Suspense>;
      case "catalogs":
        return <Suspense fallback={<SectionLoader />}><AdminCatalogs /></Suspense>;
      case "hero-video":
        return <Suspense fallback={<SectionLoader />}><AdminHeroVideo /></Suspense>;
      case "youtube":
        return <Suspense fallback={<SectionLoader />}><AdminVideoSettings /></Suspense>;
      case "product-images":
        return <Suspense fallback={<SectionLoader />}><AdminProductImages /></Suspense>;
      case "image-verifier":
        return <Suspense fallback={<SectionLoader />}><AdminImageVerifier /></Suspense>;
      case "push-notifications":
        return <Suspense fallback={<SectionLoader />}><AdminPushNotifications /></Suspense>;
      case "erp":
        return <Suspense fallback={<SectionLoader />}><AdminERPSync /></Suspense>;
      default:
        return <Suspense fallback={<SectionLoader />}><AdminAnalytics /></Suspense>;
    }
  };

  const currentSection = sidebarSections.find(s => s.id === activeSection);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="bg-secondary border-b border-primary/20 sticky top-0 z-50">
        <div className="flex items-center justify-between h-14 px-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-secondary-foreground"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </Button>
            <a href="/" className="text-lg font-bold text-secondary-foreground">
              المصرية <span className="text-gradient-red">جروب</span>
            </a>
            <span className="text-xs bg-primary text-primary-foreground px-2 py-0.5 rounded">إدارة</span>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <span className="text-xs bg-yellow-500/20 text-yellow-600 px-2 py-1 rounded-full font-medium">
                {pendingCount} طلب جديد
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate("/"); }} className="text-secondary-foreground/60">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`
            ${sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
            fixed lg:static inset-y-0 right-0 top-14 z-40
            w-64 lg:w-56 xl:w-64
            bg-card border-l border-border
            transition-transform duration-200 ease-in-out
            overflow-y-auto
            lg:translate-x-0
          `}
        >
          {/* Mobile overlay */}
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/40 z-[-1] lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <nav className="p-3 space-y-1">
            {sidebarSections.map((section) => {
              const Icon = section.icon;
              const isActive = activeSection === section.id;
              return (
                <button
                  key={section.id}
                  onClick={() => {
                    setActiveSection(section.id);
                    setSidebarOpen(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all
                    ${isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                    }
                  `}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{section.label}</span>
                  {section.id === "dealers" && pendingCount > 0 && !isActive && (
                    <span className="mr-auto text-[10px] bg-yellow-500 text-white rounded-full w-5 h-5 flex items-center justify-center">
                      {pendingCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          <div className="p-4 lg:p-6 max-w-5xl">
            {/* Breadcrumb */}
            <div className="flex items-center gap-2 mb-6">
              <span className="text-sm text-muted-foreground">لوحة التحكم</span>
              <ChevronRight className="w-3 h-3 text-muted-foreground rotate-180" />
              <span className="text-sm font-medium text-foreground">{currentSection?.label}</span>
            </div>

            {renderActiveSection()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
