import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Search, ArrowRight, Phone, Mail, MapPin, Building2, Calendar, ShoppingBag, CreditCard, FileText, TrendingUp, ChevronDown, ChevronUp, ExternalLink, Link2 } from "lucide-react";
import WhatsAppQuickChat from "@/components/admin/WhatsAppQuickChat";
import type { Database } from "@/integrations/supabase/types";

type DealerApplication = Database["public"]["Tables"]["dealer_applications"]["Row"];
type DealerAccount = Database["public"]["Tables"]["dealer_accounts"]["Row"];
type Order = Database["public"]["Tables"]["orders"]["Row"];
type OrderItem = Database["public"]["Tables"]["order_items"]["Row"] & {
  products?: { name_ar: string; sku: string; image_url: string | null } | null;
};

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

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "بانتظار المراجعة", color: "bg-yellow-100 text-yellow-800" },
  confirmed: { label: "تمت الموافقة", color: "bg-blue-100 text-blue-800" },
  awaiting_payment: { label: "بانتظار الدفع", color: "bg-orange-100 text-orange-800" },
  processing: { label: "جاري التجهيز", color: "bg-indigo-100 text-indigo-800" },
  ready: { label: "جاهز للاستلام", color: "bg-cyan-100 text-cyan-800" },
  shipped: { label: "تم الشحن", color: "bg-purple-100 text-purple-800" },
  delivered: { label: "تم التسليم", color: "bg-green-100 text-green-800" },
  cancelled: { label: "ملغي", color: "bg-red-100 text-red-800" },
};

interface DealerWithDetails {
  application: DealerApplication;
  account: DealerAccount | null;
  orders: (Order & { items?: OrderItem[] })[];
  profile: { full_name: string | null; email: string | null; phone: string | null } | null;
}

const AdminCustomerProfile = () => {
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [dealers, setDealers] = useState<DealerApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(searchParams.get("search") || "");
  const [selectedDealer, setSelectedDealer] = useState<DealerWithDetails | null>(null);
  const [loadingDetails, setLoadingDetails] = useState(false);
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [erpCode, setErpCode] = useState("");
  const [erpName, setErpName] = useState("");
  const [savingErpCode, setSavingErpCode] = useState(false);
  const [fetchingErpName, setFetchingErpName] = useState(false);

  useEffect(() => {
    fetchDealers();
  }, []);

  const fetchDealers = async () => {
    const { data } = await supabase
      .from("dealer_applications")
      .select("*")
      .order("created_at", { ascending: false });
    setDealers(data || []);
    setLoading(false);
  };

  const loadDealerDetails = async (app: DealerApplication) => {
    setLoadingDetails(true);
    setSelectedDealer(null);

    const [accountRes, ordersRes, profileRes] = await Promise.all([
      supabase.from("dealer_accounts").select("*").eq("user_id", app.user_id).maybeSingle(),
      supabase.from("orders").select("*").eq("user_id", app.user_id).order("created_at", { ascending: false }),
      supabase.from("profiles").select("full_name, email, phone").eq("user_id", app.user_id).maybeSingle(),
    ]);

    // Fetch order items for all orders
    const orders = ordersRes.data || [];
    const ordersWithItems: (Order & { items?: OrderItem[] })[] = [];

    for (const order of orders) {
      const { data: items } = await supabase
        .from("order_items")
        .select("*, products(name_ar, sku, image_url)")
        .eq("order_id", order.id);
      ordersWithItems.push({ ...order, items: (items as OrderItem[]) || [] });
    }

    setSelectedDealer({
      application: app,
      account: accountRes.data,
      orders: ordersWithItems,
      profile: profileRes.data,
    });
    setErpCode((accountRes.data as any)?.erp_customer_code || "");
    setErpName((accountRes.data as any)?.erp_customer_name || "");
    setLoadingDetails(false);
  };

  const filtered = dealers.filter(d =>
    d.business_name.toLowerCase().includes(search.toLowerCase()) ||
    d.phone.includes(search) ||
    d.email.toLowerCase().includes(search.toLowerCase()) ||
    d.legal_name.toLowerCase().includes(search.toLowerCase())
  );

  const totalSpent = selectedDealer?.orders
    .filter(o => o.status === "delivered")
    .reduce((s, o) => s + Number(o.total_amount), 0) || 0;

  const totalOrders = selectedDealer?.orders.length || 0;
  const pendingAmount = selectedDealer?.orders
    .filter(o => !["delivered", "cancelled"].includes(o.status))
    .reduce((s, o) => s + Number(o.total_amount), 0) || 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  // Detail view
  if (selectedDealer) {
    const { application: app, account, orders, profile } = selectedDealer;
    return (
      <div className="space-y-6">
        {/* Back button */}
        <Button variant="ghost" size="sm" onClick={() => setSelectedDealer(null)} className="gap-2">
          <ArrowRight className="w-4 h-4" />
          العودة لقائمة العملاء
        </Button>

        {/* Header Card */}
        <Card>
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-start gap-6">
              {/* Avatar */}
              <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center shrink-0">
                <Building2 className="w-8 h-8 text-primary" />
              </div>

              {/* Info */}
              <div className="flex-1 space-y-3">
                <div>
                  <h2 className="text-xl font-bold text-foreground">{app.business_name}</h2>
                  <p className="text-sm text-muted-foreground">{app.legal_name}</p>
                  {erpName && (
                    <p className="text-sm text-primary font-medium mt-1">🏢 الفيصل: {erpName}</p>
                  )}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">{clientTypeLabels[app.client_type]}</Badge>
                  {account && <Badge className="bg-primary/10 text-primary">{tierLabels[account.tier]}</Badge>}
                  <Badge variant={app.status === "approved" ? "default" : "destructive"}>
                    {app.status === "approved" ? "معتمد" : app.status === "pending" ? "قيد المراجعة" : "مرفوض"}
                  </Badge>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span dir="ltr">{app.phone}</span>
                    <WhatsAppQuickChat
                      phone={app.phone}
                      customerName={app.business_name}
                      context={`بخصوص حسابك التجاري في المصرية جروب.`}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="w-4 h-4" />
                    <span dir="ltr">{app.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    <span>{app.governorate} — {app.detailed_address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Calendar className="w-4 h-4" />
                    <span>عميل منذ: {new Date(app.created_at).toLocaleDateString("ar-EG")}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    <span>سجل تجاري: {app.commercial_register_no}</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <FileText className="w-4 h-4" />
                    <span>بطاقة ضريبية: {app.tax_card_no}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <ShoppingBag className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{totalOrders}</p>
              <p className="text-xs text-muted-foreground">إجمالي الطلبات</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="w-5 h-5 text-green-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{totalSpent.toLocaleString("ar-EG")} ج.م</p>
              <p className="text-xs text-muted-foreground">إجمالي المشتريات</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <CreditCard className="w-5 h-5 text-orange-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{pendingAmount.toLocaleString("ar-EG")} ج.م</p>
              <p className="text-xs text-muted-foreground">مبالغ معلقة</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="w-5 h-5 text-blue-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{app.years_in_business}</p>
              <p className="text-xs text-muted-foreground">سنوات في النشاط</p>
            </CardContent>
          </Card>
        </div>

        {/* Account Details */}
        {account && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">بيانات الحساب</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">حد الائتمان</p>
                  <p className="font-bold text-foreground">{Number(account.credit_limit || 0).toLocaleString("ar-EG")} ج.م</p>
                </div>
                <div>
                  <p className="text-muted-foreground">خصم مخصص</p>
                  <p className="font-bold text-foreground">{account.custom_discount || 0}%</p>
                </div>
                <div>
                  <p className="text-muted-foreground">الحد الأدنى للطلب</p>
                  <p className="font-bold text-foreground">{Number(account.min_order_amount || 0).toLocaleString("ar-EG")} ج.م</p>
                </div>
                <div>
                  <p className="text-muted-foreground">الحالة</p>
                  <Badge variant={account.is_active ? "default" : "destructive"}>
                    {account.is_active ? "نشط" : "معطّل"}
                  </Badge>
                </div>
              </div>
              {account.notes && (
                <div className="mt-4 p-3 bg-muted/50 rounded-lg text-sm">
                  <p className="text-muted-foreground mb-1">ملاحظات:</p>
                  <p className="text-foreground">{account.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Internal Notes */}
        <CustomerNotes customerUserId={app.user_id} />

        {/* ERP Customer Code */}
        {account && (
          <Card className="border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 className="w-4 h-4 text-primary" />
                ربط حساب الفيصل ERP
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-3">
                أدخل كود العميل من نظام الفيصل لربط الطلبيات وعروض الأسعار تلقائياً
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="كود العميل في الفيصل (مثال: 10000001)"
                  value={erpCode}
                  onChange={(e) => setErpCode(e.target.value)}
                  className="max-w-xs font-mono"
                  dir="ltr"
                />
                <Button
                  size="sm"
                  disabled={savingErpCode || fetchingErpName}
                  onClick={async () => {
                    setSavingErpCode(true);
                    let customerName = "";

                    // Try to fetch customer name from Al-Faisal
                    if (erpCode) {
                      setFetchingErpName(true);
                      try {
                        const res = await supabase.functions.invoke("erp-sync-outbound", {
                          body: { action: "fetch_erp_customers", data: { customer_code: erpCode.trim() } },
                        });
                        if (res.data?.customer?.name) {
                          customerName = res.data.customer.name;
                        }
                      } catch (e) {
                        console.error("Failed to fetch ERP customer name:", e);
                      }
                      setFetchingErpName(false);
                    }

                    const { error } = await supabase
                      .from("dealer_accounts")
                      .update({ 
                        erp_customer_code: erpCode || null,
                        erp_customer_name: customerName || null,
                      } as any)
                      .eq("id", account.id);
                    if (!error) {
                      setErpName(customerName);
                      toast({ title: customerName ? `تم الربط بنجاح ✓ — ${customerName}` : "تم حفظ كود الفيصل ✓" });
                    } else {
                      toast({ title: "خطأ", description: error.message, variant: "destructive" });
                    }
                    setSavingErpCode(false);
                  }}
                >
                  {savingErpCode || fetchingErpName ? <Loader2 className="w-4 h-4 animate-spin" /> : "ربط وحفظ"}
                </Button>
              </div>
              {erpCode && (
                <div className="mt-2 space-y-1">
                  <p className="text-xs text-primary">✓ مربوط بحساب الفيصل: {erpCode}</p>
                  {erpName && <p className="text-xs font-medium text-foreground">🏢 {erpName}</p>}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Orders History */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShoppingBag className="w-5 h-5" />
              سجل الطلبات ({orders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orders.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">لا توجد طلبات حتى الآن</p>
            ) : (
              <div className="space-y-3">
                {orders.map((order) => {
                  const status = statusLabels[order.status] || { label: order.status, color: "bg-muted text-muted-foreground" };
                  const isExpanded = expandedOrder === order.id;
                  return (
                    <div key={order.id} className="border border-border rounded-xl overflow-hidden">
                      <button
                        onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                        className="w-full flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <p className="font-bold text-foreground text-sm">#{order.order_number}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${status.color}`}>
                            {status.label}
                          </span>
                          <span className="font-bold text-sm text-foreground">{Number(order.total_amount).toLocaleString("ar-EG")} ج.م</span>
                          {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                        </div>
                      </button>

                      {isExpanded && order.items && (
                        <div className="border-t border-border bg-muted/20 p-4 space-y-2">
                          {order.payment_method && (
                            <p className="text-xs text-muted-foreground mb-2">💳 طريقة الدفع: {order.payment_method}</p>
                          )}
                          {order.shipping_governorate && (
                            <p className="text-xs text-muted-foreground mb-2">📍 الشحن: {order.shipping_governorate} — {order.shipping_address}</p>
                          )}
                          <div className="space-y-2">
                            {order.items.map((item) => (
                              <div key={item.id} className="flex items-center gap-3 bg-background rounded-lg p-2">
                                {item.products?.image_url && (
                                  <img src={item.products.image_url} alt="" className="w-10 h-10 rounded object-cover" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">{item.products?.name_ar || "منتج"}</p>
                                  <p className="text-xs text-muted-foreground">{item.products?.sku}</p>
                                </div>
                                <div className="text-left text-sm">
                                  <p className="text-foreground font-medium">{item.quantity} × {Number(item.unit_price).toLocaleString("ar-EG")}</p>
                                  <p className="text-xs text-muted-foreground">{Number(item.total_price).toLocaleString("ar-EG")} ج.م</p>
                                </div>
                              </div>
                            ))}
                          </div>
                          {order.notes && (
                            <p className="text-xs text-muted-foreground mt-2 p-2 bg-muted/50 rounded">📝 {order.notes}</p>
                          )}
                        </div>
                      )}
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

  // List view
  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="ابحث بالاسم، الهاتف، أو البريد..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pr-10"
        />
      </div>

      {loadingDetails && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
          <span className="mr-2 text-sm text-muted-foreground">جاري تحميل بيانات العميل...</span>
        </div>
      )}

      <div className="space-y-3">
        {filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">لا يوجد عملاء</p>
        ) : (
          filtered.map((app) => (
            <Card
              key={app.id}
              className="cursor-pointer hover:border-primary/30 transition-colors"
              onClick={() => loadDealerDetails(app)}
            >
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Building2 className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-foreground">{app.business_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {clientTypeLabels[app.client_type]} • {app.governorate} • {app.phone}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={app.status === "approved" ? "default" : app.status === "pending" ? "secondary" : "destructive"} className="text-[10px]">
                    {app.status === "approved" ? "معتمد" : app.status === "pending" ? "قيد المراجعة" : "مرفوض"}
                  </Badge>
                  <ArrowRight className="w-4 h-4 text-muted-foreground rotate-180" />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};

export default AdminCustomerProfile;
