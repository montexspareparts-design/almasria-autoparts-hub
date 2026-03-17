import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Bell, CheckCheck, Info, AlertTriangle, CheckCircle, Package, ThumbsUp, ThumbsDown, Loader2, Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

const typeIcons: Record<string, typeof Info> = {
  info: Info,
  success: CheckCircle,
  warning: AlertTriangle,
  order: Package,
  order_edit: AlertTriangle,
  offer: Package,
  stock_alert: Package,
  price_list: Info,
  contact: Phone,
};

const typeColors: Record<string, string> = {
  info: "text-blue-500 bg-blue-500/10",
  success: "text-emerald-500 bg-emerald-500/10",
  warning: "text-amber-500 bg-amber-500/10",
  order: "text-primary bg-primary/10",
  order_edit: "text-orange-500 bg-orange-500/10",
  offer: "text-primary bg-primary/10",
  stock_alert: "text-emerald-500 bg-emerald-500/10",
  price_list: "text-blue-500 bg-blue-500/10",
  contact: "text-pink-500 bg-pink-500/10",
};

/** Extract order ID from order_edit notification message */
const extractOrderId = (message: string): string | null => {
  const match = message.match(/\[order_edit:([a-f0-9-]+)\]/);
  return match ? match[1] : null;
};

/** Get display message without the embedded order ID tag */
const getDisplayMessage = (message: string): string => {
  return message.replace(/\[order_edit:[a-f0-9-]+\]\n?/, "");
};

const DealerNotificationsList = ({ userId, onNavigate }: { userId: string; onNavigate?: (tab: string) => void }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [respondingId, setRespondingId] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel(`dealer-notifs-${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev]);
          toast({ title: newNotif.title, description: getDisplayMessage(newNotif.message) });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  const fetchNotifications = async () => {
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);
    setNotifications(data || []);
    setLoading(false);
  };

  const markAllRead = async () => {
    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notifications").update({ is_read: true }).in("id", unreadIds);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const markRead = async (id: string) => {
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
  };

  const handleOrderEditResponse = async (notifId: string, orderId: string, approved: boolean) => {
    setRespondingId(notifId);
    try {
      if (approved) {
        // Approve: set order back to confirmed
        await supabase.from("orders").update({ status: "confirmed" }).eq("id", orderId);
      } else {
        // Reject: revert is complex, mark as cancelled or pending
        await supabase.from("orders").update({ status: "cancelled" }).eq("id", orderId);
      }

      // Update the notification to mark as responded
      const responseLabel = approved ? "✅ تمت الموافقة" : "❌ تم الرفض";
      await supabase.from("notifications").update({
        is_read: true,
        type: approved ? "success" : "warning",
        title: approved ? "✅ وافقت على تعديل الطلب" : "❌ رفضت تعديل الطلب",
      }).eq("id", notifId);

      // Notify admins about the customer's decision
      const { data: order } = await supabase
        .from("orders")
        .select("order_number")
        .eq("id", orderId)
        .maybeSingle();

      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin" as any);

      if (adminRoles && order) {
        const adminNotifs = adminRoles.map(admin => ({
          user_id: admin.user_id,
          title: approved
            ? `✅ العميل وافق على تعديل الطلب ${order.order_number}`
            : `❌ العميل رفض تعديل الطلب ${order.order_number}`,
          message: approved
            ? `وافق العميل على التعديلات وسيتم متابعة الطلب رقم ${order.order_number}`
            : `رفض العميل التعديلات على الطلب رقم ${order.order_number}. يرجى التواصل معه.`,
          type: approved ? "success" : "warning",
        }));
        await supabase.from("notifications").insert(adminNotifs);
      }

      // Update local state
      setNotifications(prev => prev.map(n => 
        n.id === notifId 
          ? { ...n, is_read: true, type: approved ? "success" : "warning", title: approved ? "✅ وافقت على تعديل الطلب" : "❌ رفضت تعديل الطلب" }
          : n
      ));

      toast({
        title: approved ? "تمت الموافقة على التعديلات ✅" : "تم رفض التعديلات ❌",
        description: approved ? "سيتم متابعة طلبك بالتعديلات الجديدة" : "تم إلغاء الطلب. تواصل مع الإدارة لمزيد من التفاصيل",
      });
    } catch (err) {
      console.error("Error responding to order edit:", err);
      toast({ title: "حدث خطأ", variant: "destructive" });
    } finally {
      setRespondingId(null);
    }
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />
        ))}
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">الإشعارات ({notifications.length})</h2>
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs text-primary">
            <CheckCheck className="w-3.5 h-3.5 ml-1" />
            تحديد الكل كمقروء
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center">
            <Bell className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">لا توجد إشعارات</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => {
            const Icon = typeIcons[n.type] || Info;
            const colorClass = typeColors[n.type] || typeColors.info;
            const isOrderEdit = n.type === "order_edit";
            const orderId = isOrderEdit ? extractOrderId(n.message) : null;
            const displayMessage = getDisplayMessage(n.message);

            return (
              <div
                key={n.id}
                onClick={() => {
                  if (!n.is_read) markRead(n.id);
                  if (!isOrderEdit && onNavigate) {
                    const msg = (n.message + " " + n.title).toLowerCase();
                    if (n.type === "order" || msg.includes("طلب") || msg.includes("order")) {
                      onNavigate("orders");
                    } else if (n.type === "price_list" || msg.includes("كشف أسعار") || msg.includes("price")) {
                      onNavigate("price-lists");
                    } else if (n.type === "offer" || n.type === "stock_alert" || msg.includes("عرض") || msg.includes("متوفر") || msg.includes("منتج")) {
                      onNavigate("quick-order");
                    } else if (msg.includes("فاتورة")) {
                      onNavigate("invoices");
                    } else {
                      // Default: go to overview
                      onNavigate("overview");
                    }
                  }
                }}
                className={cn(
                  "w-full text-right rounded-lg border p-3.5 transition-all cursor-pointer hover:bg-muted/30",
                  isOrderEdit && !n.is_read
                    ? "bg-orange-50 dark:bg-orange-950/20 border-orange-300 dark:border-orange-700 shadow-md"
                    : n.is_read
                      ? "bg-background border-border/50 opacity-70"
                      : "bg-card border-primary/20 shadow-sm"
                )}
              >
                <div className="flex items-start gap-3">
                  <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5", colorClass)}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="text-sm font-semibold text-foreground">{n.title}</p>
                      {!n.is_read && <span className="w-2 h-2 rounded-full bg-primary shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-line">
                      {displayMessage}
                    </p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1.5">
                      {new Date(n.created_at).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </p>

                    {/* Approve / Reject buttons for order_edit */}
                    {isOrderEdit && orderId && !n.is_read && (
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          className="flex-1 gap-1.5 h-10 font-bold text-sm"
                          disabled={respondingId === n.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOrderEditResponse(n.id, orderId, true);
                          }}
                        >
                          {respondingId === n.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ThumbsUp className="w-4 h-4" />
                          )}
                          موافق على التعديلات
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="flex-1 gap-1.5 h-10 font-bold text-sm"
                          disabled={respondingId === n.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOrderEditResponse(n.id, orderId, false);
                          }}
                        >
                          {respondingId === n.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <ThumbsDown className="w-4 h-4" />
                          )}
                          رفض التعديلات
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DealerNotificationsList;
