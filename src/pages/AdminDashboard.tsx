import { useEffect, useState, lazy, Suspense, forwardRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { requestPushPermission } from "@/lib/pushNotifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle, XCircle, Clock, Eye, LogOut, Trash2, Users, ShoppingBag, Video, FileText, Image, Brain, Zap, Bell, ListVideo, Menu, X, ChevronRight, Package, BarChart3, Tag, Layers, TrendingUp, ArrowLeftRight, Briefcase, Banknote, Shield, Building2, ShieldCheck, MessageCircle, User as UserIcon, Phone, KeyRound, Smartphone, Activity, HelpCircle, ClipboardList } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Database } from "@/integrations/supabase/types";

// Lazy load admin sections
const AdminOrders = lazy(() => import("@/components/AdminOrders"));
const VisitorLeadsPage = lazy(() => import("@/pages/VisitorLeadsPage"));
const AdminHeroVideo = lazy(() => import("@/components/AdminHeroVideo"));
const AdminVideoSettings = lazy(() => import("@/components/AdminVideoSettings"));
const AdminPriceLists = lazy(() => import("@/components/AdminPriceLists"));
const AdminCatalogs = lazy(() => import("@/components/AdminCatalogs"));
const AdminProductImages = lazy(() => import("@/components/AdminProductImages"));
const AdminImageVerifier = lazy(() => import("@/components/AdminImageVerifier"));
const AdminERPSync = lazy(() => import("@/components/AdminERPSync"));
const AdminERPSyncStatus = lazy(() => import("@/components/AdminERPSyncStatus"));
const AdminPushNotifications = lazy(() => import("@/components/AdminPushNotifications"));
const AdminProducts = lazy(() => import("@/components/AdminProducts"));
const AdminYearCoverage = lazy(() => import("@/components/admin/AdminYearCoverage"));
const AdminAnalytics = lazy(() => import("@/components/AdminAnalytics"));
const AdminStaffPerformance = lazy(() => import("@/components/AdminStaffPerformance"));
const AdminCustomerProfile = lazy(() => import("@/components/AdminCustomerProfile"));
const AdminCoupons = lazy(() => import("@/components/AdminCoupons"));
const AdminQuantityDiscounts = lazy(() => import("@/components/AdminQuantityDiscounts"));
const AdminCustomerIntelligence = lazy(() => import("@/components/AdminCustomerIntelligence"));
const AdminProductInsights = lazy(() => import("@/components/AdminProductInsights"));
const AdminPaymobSettings = lazy(() => import("@/components/AdminPaymobSettings"));
const AdminPaymentReminders = lazy(() => import("@/components/AdminPaymentReminders"));
const AdminInstaPayReceipts = lazy(() => import("@/components/AdminInstaPayReceipts"));
const AdminMaintenanceBundles = lazy(() => import("@/components/AdminMaintenanceBundles"));
const AdminAuditLog = lazy(() => import("@/components/AdminAuditLog"));
const AdminBulkImport = lazy(() => import("@/components/AdminBulkImport"));
const AdminERPCustomers = lazy(() => import("@/components/AdminERPCustomers"));
const AdminStockSettings = lazy(() => import("@/components/AdminStockSettings"));
const AdminLeads = lazy(() => import("@/components/AdminLeads"));
const AdminLeadsReport = lazy(() => import("@/components/admin/AdminLeadsReport"));
const AdminStaffRoles = lazy(() => import("@/components/AdminStaffRoles"));
const AdminWhatsAppInbox = lazy(() => import("@/components/AdminWhatsAppInbox"));
const StaffDailyDashboard = lazy(() => import("@/components/admin/StaffDailyDashboard"));
const StaffWelcomeDashboard = lazy(() => import("@/components/admin/StaffWelcomeDashboard"));
// StaffHome merged into StaffWelcomeDashboard (daily-dashboard section).
const StaffAccountSettings = lazy(() => import("@/components/admin/StaffAccountSettings"));
// AdminNewOrderAlert is now mounted globally in App.tsx
const AdminSupportRequestAlert = lazy(() => import("@/components/admin/AdminSupportRequestAlert"));
const AdminNotificationPhones = lazy(() => import("@/components/AdminNotificationPhones"));
const ViewAsEmployeeDialog = lazy(() => import("@/components/admin/ViewAsEmployeeDialog"));
const AdminWhatsAppDeliveryStatus = lazy(() => import("@/components/admin/AdminWhatsAppDeliveryStatus"));
const AdminClientAccountAttempts = lazy(() => import("@/components/admin/AdminClientAccountAttempts"));
const AdminTranslations = lazy(() => import("@/components/admin/AdminTranslations"));
const AdminSEOPreview = lazy(() => import("@/components/admin/AdminSEOPreview"));
const AdminResponsivePreview = lazy(() => import("@/components/admin/AdminResponsivePreview"));
const AdminMobileErrorReport = lazy(() => import("@/components/admin/AdminMobileErrorReport"));
const AdminPermissionRequests = lazy(() => import("@/components/admin/AdminPermissionRequests"));
const AdminRolePermissions = lazy(() => import("@/components/admin/AdminRolePermissions"));
const AdminDailyReports = lazy(() => import("@/components/admin/AdminDailyReports"));
const AdminDailyReportEditor = lazy(() => import("@/components/admin/AdminDailyReportEditor"));

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

interface SidebarGroup {
  label: string;
  items: { id: string; label: string; icon: typeof BarChart3 }[];
}

const sidebarGroups: SidebarGroup[] = [
  {
    // الرئيسية = نقطة البداية اليومية للموظف.
    // الترتيب يحاكي تسلسل عمله: ابدأ يومك → نفّذ المهام (طلبات/Leads/عملاء) → راجع الأداء.
    label: "الرئيسية",
    items: [
      { id: "daily-dashboard", label: "🏠 الرئيسية للموظف", icon: BarChart3 }, // نقطة البداية — مؤشرات + مهام اليوم
      { id: "orders", label: "الطلبات", icon: ShoppingBag },                    // أهم تنفيذ يومي
      { id: "leads", label: "Leads", icon: Users },                              // متابعة العملاء المحتملين
      { id: "visitor-leads", label: "ليدز الزوار (واتساب)", icon: MessageCircle }, // أرقام الزوار غير المسجلين
      { id: "customers", label: "ملف العملاء", icon: Users },                   // البحث عن عميل / تسجيل تواصل
      { id: "customer-intel", label: "ذكاء العملاء", icon: Eye },               // تحليلات السلوك
      { id: "analytics", label: "التحليلات", icon: BarChart3 },                 // KPIs عامة
      { id: "staff-performance", label: "أداء الموظفين", icon: TrendingUp },    // أدمن فقط — مراجعة فريق
    ],
  },
  {
    label: "المنتجات والطلبات",
    items: [
      { id: "products", label: "إدارة المنتجات", icon: Package },
      { id: "bulk-import", label: "استيراد جماعي", icon: ArrowLeftRight },
      { id: "year-coverage", label: "تغطية السنوات", icon: Clock },
      // ملاحظة: "إدارة الطلبات" نُقلت إلى مجموعة "الرئيسية" لأنها مهمة الموظف اليومية الأساسية.
      { id: "coupons", label: "الكوبونات", icon: Tag },
      { id: "qty-discounts", label: "خصومات الكمية", icon: Layers },
      { id: "price-lists", label: "عروض الأسعار", icon: FileText },
      { id: "catalogs", label: "الكتالوجات", icon: FileText },
      { id: "bundles", label: "باقات الصيانة", icon: Package },
    ],
  },
  {
    label: "المحتوى والوسائط",
    items: [
      { id: "hero-video", label: "فيديو الرئيسية", icon: Video },
      { id: "youtube", label: "إعدادات YouTube", icon: ListVideo },
      { id: "product-images", label: "صور المنتجات", icon: Image },
      { id: "image-verifier", label: "مراجعة الصور (AI)", icon: Brain },
    ],
  },
    {
      label: "التنبيهات والربط",
      items: [
        { id: "whatsapp-inbox", label: "صندوق الواتساب", icon: MessageCircle },
        { id: "whatsapp-delivery", label: "حالة إرسال الواتساب", icon: MessageCircle },
        { id: "instapay-receipts", label: "إيصالات InstaPay", icon: Banknote },
        { id: "payment-reminders", label: "متابعة التذكيرات", icon: Clock },
        { id: "push-notifications", label: "إشعارات Push", icon: Bell },
        { id: "notification-phones", label: "أرقام تنبيه الطلبات", icon: Phone },
        { id: "erp-status", label: "حالة مزامنة ERP", icon: Activity },
        { id: "erp", label: "ربط ERP", icon: Zap },
        { id: "erp-customers", label: "ربط عملاء الفيصل", icon: Users },
        { id: "paymob", label: "إعدادات Paymob", icon: Briefcase },
        { id: "stock-settings", label: "إعدادات المخزون", icon: ShieldCheck },
        { id: "staff-roles", label: "إدارة الموظفين", icon: Users },
        { id: "audit-log", label: "سجل المراجعة", icon: Shield },
        { id: "account-attempts", label: "محاولات إنشاء/إعادة تعيين الحسابات", icon: KeyRound },
         { id: "permission-requests", label: "طلبات الصلاحيات", icon: ShieldCheck },
        { id: "role-permissions", label: "صلاحيات الأدوار", icon: ShieldCheck },
        { id: "daily-reports", label: "التقارير اليومية للموظفين", icon: FileText },
        { id: "daily-report-editor", label: "محرر أسئلة التقرير اليومي", icon: HelpCircle },
        { id: "translations", label: "إدارة الترجمات (AR/EN)", icon: FileText },
        { id: "seo-preview", label: "معاينة SEO قبل النشر", icon: Eye },
        { id: "responsive-preview", label: "معاينة الأجهزة (موبايل/تابلت)", icon: Smartphone },
        { id: "mobile-error-report", label: "تقرير أخطاء الجوال", icon: Smartphone },
      ],
    },
    {
      label: "حسابي",
      items: [
        { id: "account-settings", label: "إعدادات حسابي", icon: UserIcon },
      ],
    },
];

// Sections accessible by moderators (employees) — single source of truth.
// See src/lib/staffPermissions.ts. Mirrored by StaffWelcomeDashboard
// (StatusIndicatorsBar / Quick Actions / safeNavigate) and the
// "صلاحيات الأدوار" preview screen so they never drift apart.
import { MODERATOR_SECTIONS } from "@/lib/staffPermissions";

const sidebarSections = sidebarGroups.flatMap(g => g.items);

const SectionLoader = forwardRef<HTMLDivElement>((_props, ref) => (
  <div ref={ref} className="flex items-center justify-center py-16">
    <Loader2 className="w-8 h-8 animate-spin text-primary" />
  </div>
));
SectionLoader.displayName = "SectionLoader";

const AdminDashboard = () => {
  const { user, isAdmin, isModerator, isDealer, loading: authLoading, signOut, isImpersonating } = useAuth();
  // The real admin (even while impersonating) should still see the "View as employee" button.
  const isRealAdmin = isAdmin || isImpersonating;
  const [viewAsOpen, setViewAsOpen] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [applications, setApplications] = useState<DealerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState<DealerApplication | null>(null);
  const [assignedTier, setAssignedTier] = useState<string>("");
  const [reviewNotes, setReviewNotes] = useState("");
  const [processing, setProcessing] = useState(false);
  const [approveErpCode, setApproveErpCode] = useState("");
  const [approveErpName, setApproveErpName] = useState("");
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [fetchingApproveErpName, setFetchingApproveErpName] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const canAccess = isAdmin || isModerator;

  // Filter sidebar for moderators
  const filteredSidebarGroups = canAccess
    ? (isModerator && !isAdmin
      ? sidebarGroups
          .map(g => ({
            ...g,
            items: g.items.filter(item => MODERATOR_SECTIONS.has(item.id)),
          }))
          .filter(g => g.items.length > 0)
      : sidebarGroups)
    : [];

  const filteredSidebarSections = filteredSidebarGroups.flatMap(g => g.items);

  // نقطة البداية الموحّدة = "ذكاء العملاء" (customer-intel) — أهم صفحة للموظف، تحوي مهام اليوم + قائمة العملاء + التحليلات.
  const activeSection = searchParams.get("section") || "customer-intel";

  const setActiveSection = (section: string) => {
    setSearchParams({ section });
  };

  // إعادة توجيه تلقائي: لو الموظف/الأدمن دخل /admin بدون ?section، نوجّهه لـ customer-intel (ذكاء العملاء)
  useEffect(() => {
    if (canAccess && !searchParams.get("section")) {
      setSearchParams({ section: "customer-intel" }, { replace: true });
    }
  }, [canAccess, searchParams, setSearchParams]);

  useEffect(() => {
    if (!authLoading && !user) { navigate("/auth"); return; }
    if (!authLoading && !canAccess) { navigate("/dealer"); return; }
    if (canAccess) {
      fetchApplications();
      // Request push permission silently for staff (browser notifications for new support requests)
      requestPushPermission().catch(() => {});
    }
  }, [user, authLoading, canAccess]);

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

  const fetchErpCustomerName = async (code: string) => {
    if (!code.trim()) { setApproveErpName(""); return; }
    setFetchingApproveErpName(true);
    try {
      const { data } = await supabase.functions.invoke("erp-sync-outbound", {
        body: { action: "fetch_erp_customers", erp_customer_code: code.trim() },
      });
      setApproveErpName(data?.customer_name || "");
    } catch { setApproveErpName(""); }
    setFetchingApproveErpName(false);
  };

  const handleApprove = async (app: DealerApplication) => {
    if (!assignedTier) { toast({ title: "يرجى تحديد فئة التاجر", variant: "destructive" }); return; }
    if (!isNewCustomer && !approveErpCode.trim()) {
      toast({ title: "يرجى إدخال كود العميل في الفيصل أو تحديد أنه عميل جديد", variant: "destructive" });
      return;
    }
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
      ...(isNewCustomer ? {} : {
        erp_customer_code: approveErpCode.trim(),
        erp_customer_name: approveErpName || null,
      }),
    });

    await sendNotification(app, "approved");

    const approveMsg = `✅ مبروك! تمت الموافقة على طلب التسجيل كتاجر في المصرية جروب.\n\n🏢 ${app.business_name}\n📋 الفئة: ${tierLabels[assignedTier] || assignedTier}\n\nيمكنك الآن الدخول إلى حسابك والاستفادة من أسعار الجملة.`;
    const dealerPhone = app.phone.replace(/^0/, "20").replace(/\D/g, "");
    window.open(`https://wa.me/${dealerPhone}?text=${encodeURIComponent(approveMsg)}`, "_blank");

    toast({ title: "تمت الموافقة على الطلب وتم إرسال إشعار للتاجر" });
    setSelectedApp(null);
    setAssignedTier("");
    setReviewNotes("");
    setApproveErpCode("");
    setApproveErpName("");
    setIsNewCustomer(false);
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

                  {/* ERP Customer Code */}
                  <div className="space-y-3 border border-border rounded-lg p-4 bg-muted/30">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-primary" />
                      <label className="text-sm font-medium text-foreground">ربط حساب الفيصل</label>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="isNewCustomer"
                        checked={isNewCustomer}
                        onCheckedChange={(checked) => {
                          setIsNewCustomer(!!checked);
                          if (checked) { setApproveErpCode(""); setApproveErpName(""); }
                        }}
                      />
                      <label htmlFor="isNewCustomer" className="text-sm text-muted-foreground cursor-pointer">
                        عميل جديد (لم يُسجّل في الفيصل بعد)
                      </label>
                    </div>

                    {!isNewCustomer && (
                      <div className="space-y-2">
                        <div className="flex gap-2">
                          <Input
                            value={approveErpCode}
                            onChange={(e) => setApproveErpCode(e.target.value)}
                            placeholder="أدخل كود العميل في الفيصل (إلزامي)"
                            className="flex-1"
                            dir="ltr"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchErpCustomerName(approveErpCode)}
                            disabled={!approveErpCode.trim() || fetchingApproveErpName}
                          >
                            {fetchingApproveErpName ? <Loader2 className="w-4 h-4 animate-spin" /> : "تحقق"}
                          </Button>
                        </div>
                        {approveErpName && (
                          <p className="text-sm text-green-600 font-medium">🏢 الفيصل: {approveErpName}</p>
                        )}
                      </div>
                    )}
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
    // Graceful fallback: لو الـ section غير موجود في القائمة المسموحة للمستخدم،
    // اعرض رسالة واضحة بدل ما نعرض تحليلات بصمت أو شاشة فاضية.
    const sectionExists = filteredSidebarSections.some(s => s.id === activeSection);
    if (!sectionExists && activeSection !== "daily-dashboard") {
      return (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center max-w-md mx-auto">
          <div className="w-16 h-16 rounded-full bg-amber-50 flex items-center justify-center mb-4">
            <span className="text-3xl">🔒</span>
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">القسم غير متاح</h2>
          <p className="text-sm text-muted-foreground mb-1">
            القسم <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">{activeSection}</code> غير موجود
            أو ليس لديك صلاحية للوصول إليه.
          </p>
          <p className="text-xs text-muted-foreground mb-6">
            راجع المسؤول لو تعتقد إن ده خطأ.
          </p>
          <button
            onClick={() => setActiveSection("daily-dashboard")}
            className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition"
          >
            العودة إلى الرئيسية
          </button>
        </div>
      );
    }

    switch (activeSection) {
      case "daily-dashboard":
        // الموظف والأدمن يشوفون نفس اللوحة (StaffDailyDashboard) — نفس التحديثات لكليهما.
        return (
          <Suspense fallback={<SectionLoader />}>
            <StaffDailyDashboard onNavigate={setActiveSection} />
          </Suspense>
        );
      case "analytics":
      case "product-insights":
      case "leads-report":
        return (
          <Suspense fallback={<SectionLoader />}>
            <Tabs
              defaultValue={
                activeSection === "product-insights"
                  ? "products"
                  : activeSection === "leads-report"
                  ? "leads"
                  : "general"
              }
              className="w-full"
            >
              <TabsList className="mb-4">
                <TabsTrigger value="general">
                  <BarChart3 className="w-4 h-4 ml-2" />
                  التحليلات العامة
                </TabsTrigger>
                <TabsTrigger value="products">
                  <TrendingUp className="w-4 h-4 ml-2" />
                  تحليل الأصناف
                </TabsTrigger>
                <TabsTrigger value="leads">
                  <Users className="w-4 h-4 ml-2" />
                  تقرير العملاء
                </TabsTrigger>
              </TabsList>
              <TabsContent value="general"><AdminAnalytics /></TabsContent>
              <TabsContent value="products"><AdminProductInsights /></TabsContent>
              <TabsContent value="leads"><AdminLeadsReport /></TabsContent>
            </Tabs>
          </Suspense>
        );
      case "staff-performance":
        return <Suspense fallback={<SectionLoader />}><AdminStaffPerformance /></Suspense>;
      case "customer-intel":
        return <Suspense fallback={<SectionLoader />}><AdminCustomerIntelligence /></Suspense>;
      case "visitor-leads":
        return (
          <Suspense fallback={<SectionLoader />}>
            <VisitorLeadsPage />
          </Suspense>
        );
      case "customers":
      case "leads":
        return (
          <Suspense fallback={<SectionLoader />}>
            <Tabs defaultValue={activeSection === "leads" ? "leads" : "profile"} className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="profile">
                  <Users className="w-4 h-4 ml-2" />
                  ملف العملاء
                </TabsTrigger>
                <TabsTrigger value="leads">
                  <Building2 className="w-4 h-4 ml-2" />
                  إدخال عملاء جدد
                </TabsTrigger>
              </TabsList>
              <TabsContent value="profile"><AdminCustomerProfile /></TabsContent>
              <TabsContent value="leads"><AdminLeads /></TabsContent>
            </Tabs>
          </Suspense>
        );
      case "dealers":
      case "orders":
        return (
          <Suspense fallback={<SectionLoader />}>
            <Tabs defaultValue={activeSection === "dealers" ? "dealers" : "orders"} className="w-full">
              <TabsList className="mb-4">
                <TabsTrigger value="orders">
                  <ShoppingBag className="w-4 h-4 ml-2" />
                  إدارة الطلبات
                </TabsTrigger>
                <TabsTrigger value="dealers">
                  <Users className="w-4 h-4 ml-2" />
                  طلبات التجار
                  {pendingCount > 0 && (
                    <span className="mr-2 bg-destructive text-destructive-foreground text-[10px] font-bold rounded-md min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {pendingCount}
                    </span>
                  )}
                </TabsTrigger>
              </TabsList>
              <TabsContent value="orders"><AdminOrders /></TabsContent>
              <TabsContent value="dealers">{renderDealersSection()}</TabsContent>
            </Tabs>
          </Suspense>
        );
      case "products":
        return <Suspense fallback={<SectionLoader />}><AdminProducts /></Suspense>;
      case "bulk-import":
        return <Suspense fallback={<SectionLoader />}><AdminBulkImport /></Suspense>;
      case "year-coverage":
        return <Suspense fallback={<SectionLoader />}><AdminYearCoverage /></Suspense>;
      case "coupons":
        return <Suspense fallback={<SectionLoader />}><AdminCoupons /></Suspense>;
      case "qty-discounts":
        return <Suspense fallback={<SectionLoader />}><AdminQuantityDiscounts /></Suspense>;
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
      case "instapay-receipts":
        return <Suspense fallback={<SectionLoader />}><AdminInstaPayReceipts /></Suspense>;
      case "payment-reminders":
        return <Suspense fallback={<SectionLoader />}><AdminPaymentReminders /></Suspense>;
      case "push-notifications":
        return <Suspense fallback={<SectionLoader />}><AdminPushNotifications /></Suspense>;
      case "notification-phones":
        return <Suspense fallback={<SectionLoader />}><AdminNotificationPhones /></Suspense>;
      case "erp-status":
        return <Suspense fallback={<SectionLoader />}><AdminERPSyncStatus /></Suspense>;
      case "erp":
        return <Suspense fallback={<SectionLoader />}><AdminERPSync /></Suspense>;
      case "erp-customers":
        return <Suspense fallback={<SectionLoader />}><AdminERPCustomers /></Suspense>;
      case "paymob":
        return <Suspense fallback={<SectionLoader />}><AdminPaymobSettings /></Suspense>;
      case "stock-settings":
        return <Suspense fallback={<SectionLoader />}><AdminStockSettings /></Suspense>;
      case "staff-roles":
        return <Suspense fallback={<SectionLoader />}><AdminStaffRoles /></Suspense>;
      case "audit-log":
        return <Suspense fallback={<SectionLoader />}><AdminAuditLog /></Suspense>;
      case "account-attempts":
        return <Suspense fallback={<SectionLoader />}><AdminClientAccountAttempts /></Suspense>;
      case "permission-requests":
        return <Suspense fallback={<SectionLoader />}><AdminPermissionRequests /></Suspense>;
      case "role-permissions":
        return isAdmin ? <Suspense fallback={<SectionLoader />}><AdminRolePermissions /></Suspense> : <Suspense fallback={<SectionLoader />}><AdminAnalytics /></Suspense>;
      case "daily-reports":
        return <Suspense fallback={<SectionLoader />}><AdminDailyReports /></Suspense>;
      case "daily-report-editor":
        return <Suspense fallback={<SectionLoader />}><AdminDailyReportEditor /></Suspense>;
      case "whatsapp-inbox":
        return <Suspense fallback={<SectionLoader />}><AdminWhatsAppInbox /></Suspense>;
      case "whatsapp-delivery":
        return <Suspense fallback={<SectionLoader />}><AdminWhatsAppDeliveryStatus /></Suspense>;
      case "bundles":
        return <Suspense fallback={<SectionLoader />}><AdminMaintenanceBundles /></Suspense>;
      case "account-settings":
        return <Suspense fallback={<SectionLoader />}><StaffAccountSettings /></Suspense>;
      case "translations":
        return <Suspense fallback={<SectionLoader />}><AdminTranslations /></Suspense>;
      case "seo-preview":
        return <Suspense fallback={<SectionLoader />}><AdminSEOPreview /></Suspense>;
      case "responsive-preview":
        return <Suspense fallback={<SectionLoader />}><AdminResponsivePreview /></Suspense>;
      case "mobile-error-report":
        return <Suspense fallback={<SectionLoader />}><AdminMobileErrorReport /></Suspense>;
      default:
        // غير معروف بالكلية — نعرض fallback واضح بدل توجيه صامت لـ AdminAnalytics.
        return (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mb-4">
              <span className="text-3xl">❓</span>
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">صفحة غير معروفة</h2>
            <p className="text-sm text-muted-foreground mb-6">
              القسم <code className="px-1.5 py-0.5 rounded bg-muted text-xs font-mono">{activeSection}</code> غير معرَّف في النظام.
            </p>
            <button
              onClick={() => setActiveSection("daily-dashboard")}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition"
            >
              العودة إلى الرئيسية
            </button>
          </div>
        );
    }
  };

  const currentSection = filteredSidebarSections.find(s => s.id === activeSection);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* AdminNewOrderAlert is mounted globally in App.tsx so it fires on
          every staff page (incl. /admin/staff-home), not only inside /admin. */}
      {/* Real-time chatbot support request alert popup */}
      <Suspense fallback={null}>
        <AdminSupportRequestAlert />
      </Suspense>
      {/* Header */}
      <header className="bg-gradient-to-l from-secondary via-secondary to-[hsl(var(--secondary)/0.95)] backdrop-blur-xl border-b border-border/20 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center justify-between h-14 px-4 lg:px-5">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden text-secondary-foreground/70 hover:text-secondary-foreground hover:bg-white/10 rounded-lg h-8 w-8"
              onClick={() => setSidebarOpen(!sidebarOpen)}
            >
              {sidebarOpen ? <X className="w-4.5 h-4.5" /> : <Menu className="w-4.5 h-4.5" />}
            </Button>
            <a href="/" className="flex items-center gap-2 group">
              <div className="w-8 h-8 rounded-lg bg-primary/20 flex items-center justify-center shadow-inner">
                <Package className="w-4 h-4 text-primary" />
              </div>
              <div className="hidden sm:block">
                <span className="text-sm font-black text-secondary-foreground leading-none tracking-tight">
                  المصرية <span className="text-primary">جروب</span>
                </span>
                <p className="text-[9px] text-secondary-foreground/40 font-semibold mt-0.5 tracking-wide">
                  {isAdmin ? "ADMIN PANEL" : "STAFF PANEL"}
                </p>
              </div>
            </a>
          </div>

          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <button
                onClick={() => { setActiveSection("dealers"); setSidebarOpen(false); }}
                className="flex items-center gap-1.5 text-[11px] bg-amber-500/15 text-amber-500 px-2.5 py-1 rounded-lg font-bold hover:bg-amber-500/25 transition-colors animate-pulse"
              >
                <Clock className="w-3 h-3" />
                {pendingCount} طلب
              </button>
            )}

            {currentSection && (
              <div className="hidden md:flex items-center gap-1.5 text-[11px] text-secondary-foreground/30 border-r border-secondary-foreground/10 pr-2 mr-1">
                <currentSection.icon className="w-3 h-3" />
                <span className="font-medium">{currentSection.label}</span>
              </div>
            )}

            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/admin/staff-home")}
              className="gap-1 text-[11px] font-bold text-primary hover:bg-primary/10 rounded-lg h-8 px-2"
              title="الرئيسية للموظف"
            >
              <span className="text-sm leading-none">🏠</span>
              <span className="hidden sm:inline">الرئيسية للموظف</span>
            </Button>

            {isDealer && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => { localStorage.setItem("almasria_last_role", "dealer"); navigate("/dealer"); }}
                className="gap-1 text-[11px] font-bold text-blue-400 hover:bg-blue-500/10 rounded-lg h-8 px-2"
              >
                <Briefcase className="w-3 h-3" />
                <span className="hidden sm:inline">وضع التاجر</span>
              </Button>
            )}

            {/* "View as employee" — only visible to the real admin (or the
                admin currently impersonating, so they can switch employees). */}
            {isRealAdmin && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setViewAsOpen(true)}
                className="gap-1 text-[11px] font-bold text-amber-300 hover:bg-amber-500/10 rounded-lg h-8 px-2"
                title="معاينة الواجهة كموظف"
              >
                <Eye className="w-3 h-3" />
                <span className="hidden sm:inline">اعرض كموظف</span>
              </Button>
            )}

            <Button
              variant="ghost"
              size="icon"
              onClick={() => { signOut(); navigate("/"); }}
              className="w-8 h-8 rounded-lg text-secondary-foreground/30 hover:text-destructive hover:bg-destructive/10 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Lazy-mount the picker dialog only when the admin opens it */}
      {isRealAdmin && viewAsOpen && (
        <Suspense fallback={null}>
          <ViewAsEmployeeDialog open={viewAsOpen} onOpenChange={setViewAsOpen} />
        </Suspense>
      )}

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`
            ${sidebarOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
            fixed lg:static inset-y-0 right-0 top-14 z-40
            w-60 lg:w-52 xl:w-60
            bg-card/95 backdrop-blur-sm border-l border-border/50
            transition-transform duration-200 ease-out
            overflow-y-auto
            lg:translate-x-0
            scrollbar-none
          `}
        >
          {sidebarOpen && (
            <div
              className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[-1] lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}

          <nav className="p-2.5 space-y-1">
            {filteredSidebarGroups.map((group, gi) => (
              <div key={group.label}>
                {gi > 0 && <div className="h-px bg-border/40 mx-3 my-2" />}
                <div className="px-3 py-1.5 text-[9px] font-extrabold uppercase tracking-[0.15em] text-muted-foreground/40">
                  {group.label}
                </div>
                <div className="mt-0.5 space-y-px">
                  {group.items.map((section) => {
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
                          w-full flex items-center gap-2 px-2.5 py-[7px] rounded-lg text-[12.5px] font-medium transition-all duration-150 relative group
                          ${isActive
                            ? "bg-primary/10 text-primary font-bold shadow-sm shadow-primary/5"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
                          }
                        `}
                      >
                        {isActive && (
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[2.5px] h-4 bg-primary rounded-l-full" />
                        )}
                        <div className={`
                          w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors
                          ${isActive
                            ? "bg-primary/15 text-primary"
                            : "text-muted-foreground/60 group-hover:text-foreground/60"
                          }
                        `}>
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <span className="truncate">{section.label}</span>
                        {section.id === "dealers" && pendingCount > 0 && (
                          <span className="mr-auto bg-destructive text-destructive-foreground text-[9px] font-bold rounded-md min-w-[18px] h-4.5 flex items-center justify-center px-1">
                            {pendingCount}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto bg-muted/20">
          <div className="p-4 lg:p-6 max-w-6xl">
            {/* Quick Nav Strip for moderators */}
            {isModerator && !isAdmin && (
              <div className="flex items-center gap-1.5 mb-4 overflow-x-auto scrollbar-none pb-1">
                {filteredSidebarSections.map((section) => {
                  const Icon = section.icon;
                  const isActive = activeSection === section.id;
                  return (
                    <button
                      key={section.id}
                      onClick={() => setActiveSection(section.id)}
                      className={`
                        flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all shrink-0
                        ${isActive
                          ? "bg-primary text-primary-foreground shadow-sm"
                          : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
                        }
                      `}
                    >
                      <Icon className="w-3.5 h-3.5" />
                      {section.label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Page Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                {currentSection && (
                  <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                    <currentSection.icon className="w-4.5 h-4.5 text-primary" />
                  </div>
                )}
                <div>
                  <h1 className="text-lg font-black text-foreground leading-tight">{currentSection?.label}</h1>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[11px] text-muted-foreground/60">لوحة التحكم</span>
                    <ChevronRight className="w-2.5 h-2.5 text-muted-foreground/40 rotate-180" />
                    <span className="text-[11px] text-muted-foreground font-medium">{currentSection?.label}</span>
                  </div>
                </div>
              </div>
            </div>

            {renderActiveSection()}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminDashboard;
