import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, ShoppingCart, FileText, Tag, LogOut, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import DealerCatalogs from "@/components/DealerCatalogs";

const tierLabels: Record<string, string> = {
  wholesale_tier1: "تاجر جملة – درجة أولى",
  wholesale_tier2: "تاجر جملة – درجة ثانية",
  corporate: "شركة / هيئة",
  retail: "عميل قطاعي",
};

const statusLabels: Record<string, { label: string; icon: typeof Clock; color: string }> = {
  pending: { label: "قيد المراجعة", icon: Clock, color: "text-yellow-500" },
  approved: { label: "معتمد", icon: CheckCircle, color: "text-green-500" },
  rejected: { label: "مرفوض", icon: XCircle, color: "text-destructive" },
  suspended: { label: "موقوف", icon: XCircle, color: "text-destructive" },
};

const DealerDashboard = () => {
  const { user, dealerAccount, isDealer, loading: authLoading, signOut } = useAuth();
  const navigate = useNavigate();
  const [application, setApplication] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate("/auth");
      return;
    }
    if (!authLoading && user && !isDealer) {
      navigate("/");
      return;
    }
    if (user && isDealer) fetchData();
  }, [user, authLoading, isDealer]);

  const fetchData = async () => {
    // Get application status
    const { data: app } = await supabase
      .from("dealer_applications")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    setApplication(app);

    // Get orders
    const { data: orderData } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false });
    setOrders(orderData || []);

    setLoadingData(false);
  };

  if (authLoading || loadingData) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const appStatus = application?.status as string;
  const statusInfo = statusLabels[appStatus] || statusLabels.pending;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-secondary border-b border-primary/20">
        <div className="container mx-auto px-4 flex items-center justify-between h-14 md:h-16 gap-2">
          <a href="/" className="text-lg md:text-xl font-bold text-secondary-foreground shrink-0">
            المصرية <span className="text-gradient-red">جروب</span>
          </a>
          <div className="hidden sm:flex items-center gap-2 bg-primary/10 border border-primary/30 rounded-full px-3 md:px-4 py-1.5">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span className="text-xs md:text-sm font-semibold text-primary">حساب خاص لعملاء الجملة</span>
          </div>
          <div className="flex items-center gap-2 md:gap-3 shrink-0">
            <span className="text-xs md:text-sm text-secondary-foreground/60 hidden md:inline truncate max-w-[150px]">
              {user?.email}
            </span>
            <Button variant="ghost" size="sm" onClick={() => { signOut(); navigate("/"); }} className="text-secondary-foreground/60">
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-5 md:py-8">
        <h1 className="text-xl md:text-2xl font-bold text-foreground mb-5 md:mb-6">لوحة تحكم التاجر</h1>

        {/* Account Status */}
        {!isDealer && application && (
          <Card className="mb-6 border-primary/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-3">
                <statusInfo.icon className={`w-8 h-8 ${statusInfo.color}`} />
                <div>
                  <h3 className="font-bold text-foreground">حالة الطلب: {statusInfo.label}</h3>
                  <p className="text-sm text-muted-foreground">
                    {appStatus === "pending" && "طلبك قيد المراجعة وسيتم الرد خلال 48 ساعة عمل"}
                    {appStatus === "rejected" && (application.review_notes || "تم رفض طلبك. تواصل مع الإدارة لمزيد من التفاصيل")}
                    {appStatus === "approved" && "تمت الموافقة على طلبك! حسابك نشط الآن"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {!isDealer && !application && (
          <Card className="mb-6 border-primary/20">
            <CardContent className="p-6 text-center">
              <h3 className="font-bold text-foreground mb-2">لم تقدم طلب تاجر بعد</h3>
              <p className="text-sm text-muted-foreground mb-4">قدم طلبك الآن للحصول على أسعار الجملة</p>
              <Button onClick={() => navigate("/dealer-register")} className="red-glow">
                طلب فتح حساب تاجر
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Dealer Info */}
        {isDealer && dealerAccount && (
          <Card className="mb-6 bg-primary/5 border-primary/30">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">فئة الحساب</p>
                  <p className="text-lg font-bold text-primary">{tierLabels[dealerAccount.tier] || dealerAccount.tier}</p>
                </div>
                {dealerAccount.custom_discount && dealerAccount.custom_discount > 0 && (
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">خصم خاص</p>
                    <p className="text-lg font-bold text-primary">{dealerAccount.custom_discount}%</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { icon: ShoppingCart, label: "الطلبات", value: orders.length.toString() },
            { icon: Package, label: "المنتجات المتاحة", value: "5000+" },
            { icon: FileText, label: "الفواتير", value: orders.filter(o => o.invoice_url).length.toString() },
            { icon: Tag, label: "العروض الحصرية", value: "قريباً" },
          ].map((s, i) => (
            <Card key={i}>
              <CardContent className="p-4 text-center">
                <s.icon className="w-8 h-8 text-primary mx-auto mb-2" />
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">آخر الطلبات</CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد طلبات بعد</p>
            ) : (
              <div className="space-y-3">
                {orders.slice(0, 5).map((order) => (
                  <div key={order.id} className="flex items-center justify-between border-b border-border pb-3">
                    <div>
                      <p className="font-medium text-foreground">{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">{new Date(order.created_at).toLocaleDateString("ar-EG")}</p>
                    </div>
                    <div className="text-left">
                      <p className="font-bold text-foreground">{order.total_amount} ج.م</p>
                      <p className="text-xs text-muted-foreground">{order.status}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* PDF Catalogs */}
        <div className="mt-6">
          <DealerCatalogs
            isWholesale={
              isDealer &&
              !!dealerAccount?.is_active &&
              (dealerAccount?.tier === "wholesale_tier1" || dealerAccount?.tier === "wholesale_tier2")
            }
          />
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6">
          <Button variant="outline" className="h-auto py-4 flex flex-col gap-2" onClick={() => navigate("/")}>
            <Package className="w-6 h-6" />
            <span>تصفح المنتجات</span>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex flex-col gap-2">
            <FileText className="w-6 h-6" />
            <span>طلب تسعير خاص</span>
          </Button>
          <Button variant="outline" className="h-auto py-4 flex flex-col gap-2">
            <Tag className="w-6 h-6" />
            <span>العروض الحصرية</span>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default DealerDashboard;
