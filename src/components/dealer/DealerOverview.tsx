import { ShoppingCart, Package, FileText, Tag, TrendingUp, CreditCard, Percent, DollarSign } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

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
}

const tierLabels: Record<string, string> = {
  wholesale_tier1: "تاجر جملة – درجة أولى",
  wholesale_tier2: "تاجر جملة – درجة ثانية",
  corporate: "شركة / هيئة",
  retail: "عميل قطاعي",
};

const DealerOverview = ({ dealerAccount, dealerName, email, ordersCount, totalSpent, invoicesCount }: DealerOverviewProps) => {
  const stats = [
    { icon: ShoppingCart, label: "إجمالي الطلبات", value: ordersCount.toString(), color: "text-blue-500", bg: "bg-blue-500/10" },
    { icon: TrendingUp, label: "إجمالي المشتريات", value: `${totalSpent.toLocaleString("ar-EG")} ج.م`, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { icon: FileText, label: "الفواتير", value: invoicesCount.toString(), color: "text-amber-500", bg: "bg-amber-500/10" },
    { icon: Package, label: "المنتجات المتاحة", value: "5000+", color: "text-primary", bg: "bg-primary/10" },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-xl bg-gradient-to-l from-primary/20 via-primary/10 to-transparent border border-primary/20 p-5 md:p-6">
        <h2 className="text-xl md:text-2xl font-bold text-foreground mb-1">
          أهلاً، {dealerName} 👋
        </h2>
        <p className="text-sm text-muted-foreground">مرحباً بك في لوحة تحكم حسابك التجاري</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        {stats.map((s, i) => (
          <Card key={i} className="border-border/50">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg ${s.bg} flex items-center justify-center shrink-0`}>
                  <s.icon className={`w-5 h-5 ${s.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{s.label}</p>
                  <p className="text-lg font-bold text-foreground truncate">{s.value}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Account Details */}
      {dealerAccount && (
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">تفاصيل الحساب</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Tag className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-[11px] text-muted-foreground">فئة الحساب</p>
                  <p className="text-sm font-semibold text-foreground">{tierLabels[dealerAccount.tier] || dealerAccount.tier}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <CreditCard className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-[11px] text-muted-foreground">حد الائتمان</p>
                  <p className="text-sm font-semibold text-foreground">
                    {(dealerAccount as any).credit_limit ? `${Number((dealerAccount as any).credit_limit).toLocaleString("ar-EG")} ج.م` : "غير محدد"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <Percent className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-[11px] text-muted-foreground">خصم خاص</p>
                  <p className="text-sm font-semibold text-foreground">
                    {dealerAccount.custom_discount && dealerAccount.custom_discount > 0 ? `${dealerAccount.custom_discount}%` : "لا يوجد"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                <DollarSign className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-[11px] text-muted-foreground">الحد الأدنى للطلب</p>
                  <p className="text-sm font-semibold text-foreground">
                    {dealerAccount.min_order_amount && Number(dealerAccount.min_order_amount) > 0 ? `${Number(dealerAccount.min_order_amount).toLocaleString("ar-EG")} ج.م` : "لا يوجد"}
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
