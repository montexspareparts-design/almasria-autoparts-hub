import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Clock, Bell, AlertTriangle, RefreshCw, MessageSquare, CheckCircle2, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface ReminderOrder {
  id: string;
  order_number: string;
  total_amount: number;
  created_at: string;
  user_id: string;
  status: string;
  customer_name?: string;
  customer_phone?: string;
  first_reminder_sent: boolean;
  final_reminder_sent: boolean;
}

const AdminPaymentReminders = () => {
  const [orders, setOrders] = useState<ReminderOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  const fetchPendingOrders = async () => {
    setLoading(true);

    const { data: awaitingOrders } = await supabase
      .from("orders")
      .select("id, order_number, total_amount, created_at, user_id, status")
      .eq("status", "awaiting_payment")
      .order("created_at", { ascending: true });

    if (!awaitingOrders || awaitingOrders.length === 0) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const enriched: ReminderOrder[] = [];

    for (const order of awaitingOrders) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, phone")
        .eq("user_id", order.user_id)
        .maybeSingle();

      const { data: firstReminder } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", order.user_id)
        .eq("type", "payment_reminder_whatsapp")
        .ilike("message", `%${order.order_number}%`)
        .limit(1);

      const { data: finalReminder } = await supabase
        .from("notifications")
        .select("id")
        .eq("user_id", order.user_id)
        .eq("type", "payment_reminder_final")
        .ilike("message", `%${order.order_number}%`)
        .limit(1);

      enriched.push({
        ...order,
        customer_name: profile?.full_name || "غير معروف",
        customer_phone: profile?.phone || "",
        first_reminder_sent: (firstReminder && firstReminder.length > 0) || false,
        final_reminder_sent: (finalReminder && finalReminder.length > 0) || false,
      });
    }

    setOrders(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchPendingOrders();
  }, []);

  const triggerReminder = async () => {
    setTriggering(true);
    try {
      const { data, error } = await supabase.functions.invoke("payment-reminder");
      if (error) throw error;
      toast.success(
        `تم التشغيل: ${data?.whatsappRemindersSent || 0} تذكير واتساب، ${data?.inAppRemindersSent || 0} تذكير أخير`
      );
      await fetchPendingOrders();
    } catch (err: any) {
      toast.error("فشل تشغيل التذكيرات: " + err.message);
    } finally {
      setTriggering(false);
    }
  };

  const getTimeSince = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} دقيقة`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} ساعة`;
    const days = Math.floor(hours / 24);
    return `${days} يوم`;
  };

  const totalPending = orders.length;
  const firstReminderSent = orders.filter(o => o.first_reminder_sent).length;
  const finalReminderSent = orders.filter(o => o.final_reminder_sent).length;
  const noReminderYet = orders.filter(o => !o.first_reminder_sent && !o.final_reminder_sent).length;

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Clock className="w-6 h-6 text-amber-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{totalPending}</p>
            <p className="text-xs text-muted-foreground">بانتظار الدفع</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <MessageSquare className="w-6 h-6 text-blue-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{firstReminderSent}</p>
            <p className="text-xs text-muted-foreground">تذكير أول ✓</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-red-500 mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{finalReminderSent}</p>
            <p className="text-xs text-muted-foreground">تذكير أخير ✓</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Bell className="w-6 h-6 text-muted-foreground mx-auto mb-1" />
            <p className="text-2xl font-bold text-foreground">{noReminderYet}</p>
            <p className="text-xs text-muted-foreground">لم يُذكَّر بعد</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <Button onClick={triggerReminder} disabled={triggering} className="gap-2">
          {triggering ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          تشغيل التذكيرات الآن
        </Button>
        <Button variant="outline" onClick={fetchPendingOrders} disabled={loading} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          تحديث
        </Button>
      </div>

      {/* Orders Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            الطلبات بانتظار الدفع
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500/50" />
              <p className="font-medium">لا توجد طلبات معلقة حالياً</p>
              <p className="text-sm">جميع الطلبات تم سدادها ✅</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" dir="rtl">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">رقم الطلب</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">العميل</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">المبلغ</th>
                    <th className="text-right py-3 px-2 font-medium text-muted-foreground">منذ</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">التذكير الأول</th>
                    <th className="text-center py-3 px-2 font-medium text-muted-foreground">التذكير الأخير</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                      <td className="py-3 px-2 font-mono text-xs">{order.order_number}</td>
                      <td className="py-3 px-2">
                        <div>
                          <p className="font-medium text-foreground">{order.customer_name}</p>
                          {order.customer_phone && (
                            <p className="text-xs text-muted-foreground" dir="ltr">{order.customer_phone}</p>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 font-bold">
                        {Number(order.total_amount).toLocaleString("ar-EG")} ج.م
                      </td>
                      <td className="py-3 px-2">
                        <Badge variant="outline" className="text-xs">
                          {getTimeSince(order.created_at)}
                        </Badge>
                      </td>
                      <td className="py-3 px-2 text-center">
                        {order.first_reminder_sent ? (
                          <Badge className="bg-blue-500/10 text-blue-600 border-blue-500/20 text-xs">
                            <MessageSquare className="w-3 h-3 ml-1" />
                            تم الإرسال
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            لم يُرسل
                          </Badge>
                        )}
                      </td>
                      <td className="py-3 px-2 text-center">
                        {order.final_reminder_sent ? (
                          <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-xs">
                            <AlertTriangle className="w-3 h-3 ml-1" />
                            تم الإرسال
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs text-muted-foreground">
                            لم يُرسل
                          </Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminPaymentReminders;
