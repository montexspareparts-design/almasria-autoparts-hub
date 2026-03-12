import { ShoppingCart, Package, FileText, Tag, TrendingUp, CreditCard, Percent, DollarSign, Search, Upload, Heart, ClipboardList } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface DealerAccount {
  id: string;
  tier: string;
  is_active: boolean;
  custom_discount: number | null;
  min_order_amount: number | null;
  credit_limit?: number | null;
}

interface DealerOverviewProps {
  dealerAccount: DealerAccount | null;
  dealerName: string;
  email: string;
  ordersCount: number;
  totalSpent: number;
  invoicesCount: number;
  onNavigate?: (tab: string) => void;
}

const tierLabels: Record<string, string> = {
  wholesale_tier1: "Wholesale Tier 1",
  wholesale_tier2: "Wholesale Tier 2",
  corporate: "Corporate",
  retail: "Retail",
};

const tierLabelsAr: Record<string, string> = {
  wholesale_tier1: "تاجر جملة – درجة أولى",
  wholesale_tier2: "تاجر جملة – درجة ثانية",
  corporate: "شركة / هيئة",
  retail: "عميل قطاعي",
};

const DealerOverview = ({ dealerAccount, dealerName, email, ordersCount, totalSpent, invoicesCount, onNavigate }: DealerOverviewProps) => {
  const stats = [
    { icon: ClipboardList, label: "الطلبات", value: ordersCount.toString(), color: "text-primary", bg: "bg-primary/10" },
    { icon: TrendingUp, label: "إجمالي المشتريات", value: `${totalSpent.toLocaleString("ar-EG")} ج.م`, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { icon: FileText, label: "الفواتير", value: invoicesCount.toString(), color: "text-amber-500", bg: "bg-amber-500/10" },
    { icon: CreditCard, label: "حد الائتمان", value: dealerAccount && (dealerAccount as any).credit_limit ? `${Number((dealerAccount as any).credit_limit).toLocaleString("ar-EG")} ج.م` : "—", color: "text-blue-500", bg: "bg-blue-500/10" },
  ];

  const quickActions = [
    { icon: Search, label: "البحث عن قطع غيار", desc: "ابحث واطلب عرض سعر", tab: "quotes" },
    { icon: Upload, label: "طلب سريع (Excel)", desc: "ارفع ملف بأرقام القطع", tab: "quick_order" },
    { icon: FileText, label: "كشوفات الأسعار", desc: "تحميل آخر الكشوفات", tab: "price_lists" },
    { icon: Heart, label: "المفضلة", desc: "أصنافك المتكررة", tab: "favorites" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="rounded-xl border border-border bg-card p-5 md:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">مرحباً بك في بوابة التوزيع</p>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">{dealerName}</h2>
            <div className="flex items-center gap-2 mt-1.5">
              {dealerAccount && (
                <span className="text-xs font-medium bg-primary/10 text-primary px-2.5 py-0.5 rounded-full">
                  {tierLabelsAr[dealerAccount.tier] || dealerAccount.tier}
                </span>
              )}
              {dealerAccount?.custom_discount && dealerAccount.custom_discount > 0 && (
                <span className="text-xs font-medium bg-emerald-500/10 text-emerald-600 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                  <Percent className="w-3 h-3" />
                  خصم {dealerAccount.custom_discount}%
                </span>
              )}
            </div>
          </div>
          <div className="text-left hidden sm:block">
            <p className="text-[10px] text-muted-foreground">{email}</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-bold text-foreground truncate">{s.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-3">إجراءات سريعة</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((action, i) => (
            <button
              key={i}
              onClick={() => onNavigate?.(action.tab)}
              className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/30 hover:bg-primary/5 transition-all text-right group"
            >
              <div className="w-10 h-10 rounded-lg bg-primary/10 group-hover:bg-primary/20 flex items-center justify-center shrink-0 transition-colors">
                <action.icon className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{action.label}</p>
                <p className="text-[11px] text-muted-foreground">{action.desc}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Account Details */}
      {dealerAccount && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">تفاصيل الحساب التجاري</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Tag className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-[11px] text-muted-foreground">الفئة</p>
                  <p className="text-xs font-semibold text-foreground">{tierLabelsAr[dealerAccount.tier] || dealerAccount.tier}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <CreditCard className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-[11px] text-muted-foreground">حد الائتمان</p>
                  <p className="text-xs font-semibold text-foreground">
                    {(dealerAccount as any).credit_limit ? `${Number((dealerAccount as any).credit_limit).toLocaleString("ar-EG")} ج.م` : "غير محدد"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Percent className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-[11px] text-muted-foreground">الخصم</p>
                  <p className="text-xs font-semibold text-foreground">
                    {dealerAccount.custom_discount && dealerAccount.custom_discount > 0 ? `${dealerAccount.custom_discount}%` : "—"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <DollarSign className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-[11px] text-muted-foreground">الحد الأدنى</p>
                  <p className="text-xs font-semibold text-foreground">
                    {dealerAccount.min_order_amount && Number(dealerAccount.min_order_amount) > 0 ? `${Number(dealerAccount.min_order_amount).toLocaleString("ar-EG")} ج.م` : "—"}
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DealerOverview;
