import { useState, useEffect } from "react";
import { LazyImage } from "@/components/ui/lazy-image";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Bell, BellOff, Loader2, Package, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import DealerPurchasedStockStatus from "./DealerPurchasedStockStatus";

interface StockAlert {
  id: string;
  product_id: string;
  alert_type: string;
  is_active: boolean;
  notified_at: string | null;
  created_at: string;
  product?: {
    name_ar: string;
    sku: string;
    image_url: string | null;
    stock_quantity: number;
    is_on_sale: boolean;
  };
}

const alertTypeLabels: Record<string, { label: string; emoji: string }> = {
  back_in_stock: { label: "عند التوفر", emoji: "🔔" },
  price_drop: { label: "عند العرض", emoji: "🏷️" },
  offer: { label: "عند العرض", emoji: "🎁" },
};

const DealerStockAlerts = () => {
  const { user } = useAuth();
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchAlerts = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("stock_alerts")
      .select("*, product:products(name_ar, sku, image_url, stock_quantity, is_on_sale)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    setAlerts((data as any[]) || []);
    setLoading(false);
  };

  useEffect(() => { fetchAlerts(); }, [user]);

  const removeAlert = async (id: string) => {
    setDeleting(id);
    await supabase.from("stock_alerts").delete().eq("id", id);
    setAlerts(prev => prev.filter(a => a.id !== id));
    toast({ title: "تم إلغاء التنبيه" });
    setDeleting(null);
  };

  const activeAlerts = alerts.filter(a => a.is_active);
  const notifiedAlerts = alerts.filter(a => !a.is_active && a.notified_at);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-black text-foreground">🔔 تنبيهات المخزون</h2>
        <p className="text-sm text-muted-foreground mt-1">
          هتوصلك إشعار لما المنتج يرجع متوفر أو ينزل عليه عرض
        </p>
      </div>

      {/* Purchased products stock status */}
      <DealerPurchasedStockStatus />

      {/* Active Alerts */}
      {activeAlerts.length === 0 && notifiedAlerts.length === 0 ? (
        <div className="text-center py-16">
          <Bell className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-1">لا توجد تنبيهات</p>
          <p className="text-xs text-muted-foreground/60">
            ابحث عن أي منتج في "اطلب قطع غيار" واضغط 🔔 لتفعيل التنبيه
          </p>
        </div>
      ) : (
        <>
          {activeAlerts.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-foreground mb-2 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                تنبيهات نشطة ({activeAlerts.length})
              </h3>
              <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
                {activeAlerts.map(alert => {
                  const typeInfo = alertTypeLabels[alert.alert_type] || alertTypeLabels.back_in_stock;
                  return (
                    <div key={alert.id} className="flex items-center gap-3 p-3.5">
                      <LazyImage
                        src={alert.product?.image_url}
                        alt={alert.product?.name_ar || "منتج"}
                        wrapperClassName="w-11 h-11 rounded-lg bg-white border border-border shrink-0"
                        className="w-full h-full object-contain p-0.5"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">{alert.product?.name_ar || "منتج"}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-[11px] text-muted-foreground font-mono">{alert.product?.sku}</span>
                          <Badge variant="outline" className="text-[10px] h-5">
                            {typeInfo.emoji} {typeInfo.label}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="w-8 h-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0"
                        onClick={() => removeAlert(alert.id)}
                        disabled={deleting === alert.id}
                      >
                        {deleting === alert.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </Button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {notifiedAlerts.length > 0 && (
            <div>
              <h3 className="text-sm font-bold text-muted-foreground mb-2">
                ✅ تم الإشعار ({notifiedAlerts.length})
              </h3>
              <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden opacity-60">
                {notifiedAlerts.map(alert => (
                  <div key={alert.id} className="flex items-center gap-3 p-3">
                    <BellOff className="w-4 h-4 text-muted-foreground shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-muted-foreground truncate">{alert.product?.name_ar}</p>
                      <span className="text-[10px] text-muted-foreground/60">
                        تم الإشعار {alert.notified_at ? new Date(alert.notified_at).toLocaleDateString("ar-EG", { month: "short", day: "numeric" }) : ""}
                      </span>
                    </div>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="w-7 h-7 text-muted-foreground/40"
                      onClick={() => removeAlert(alert.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DealerStockAlerts;
