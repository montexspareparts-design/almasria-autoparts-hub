import { useState, useEffect, useRef, useCallback } from "react";
import { Bell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

/** Determine where a notification should navigate based on user role */
const getNotificationTarget = (
  n: Notification,
  isAdmin: boolean,
  isDealer: boolean
): { path: string; query: string } | null => {
  const msg = (n.message + " " + n.title).toLowerCase();

  // Admin-specific routing → /admin?section=...
  if (isAdmin) {
    if (n.type === "conversion_opportunity") {
      return { path: "/admin", query: "section=customer-intel" };
    }
    if (n.type === "order" || n.type === "order_edit" || msg.includes("طلب") || msg.includes("order")) {
      return { path: "/admin", query: "section=orders" };
    }
    if (msg.includes("تاجر") || msg.includes("اعتماد") || msg.includes("application")) {
      return { path: "/admin", query: "section=dealer-applications" };
    }
    if (msg.includes("وافق") || msg.includes("رفض") || msg.includes("عميل")) {
      return { path: "/admin", query: "section=orders" };
    }
    // Default admin: analytics
    return { path: "/admin", query: "section=analytics" };
  }

  // Dealer routing → /dealer?tab=...
  if (isDealer) {
    if (n.type === "order" || n.type === "order_edit" || msg.includes("طلب")) {
      return { path: "/dealer", query: "tab=orders" };
    }
    if (msg.includes("كشف أسعار") || msg.includes("price")) {
      return { path: "/dealer", query: "tab=price-lists" };
    }
    if (msg.includes("فاتورة") || msg.includes("invoice")) {
      return { path: "/dealer", query: "tab=invoices" };
    }
    if (n.type === "offer" || n.type === "stock_alert" || msg.includes("عرض") || msg.includes("متوفر")) {
      return { path: "/dealer", query: "tab=offers" };
    }
    return { path: "/dealer", query: "tab=notifications" };
  }

  // Regular user — go to orders
  if (n.type === "order" || msg.includes("طلب")) {
    return { path: "/my-orders", query: "" };
  }

  return null;
};

const NotificationBell = () => {
  const { user, isAdmin, isDealer } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const playNotificationSound = useCallback(() => {
    try {
      const ctx = new AudioContext();
      const oscillator = ctx.createOscillator();
      const gain = ctx.createGain();
      oscillator.connect(gain);
      gain.connect(ctx.destination);
      oscillator.frequency.value = 800;
      oscillator.type = "sine";
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.5);
    } catch (e) {}
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20);
      setNotifications((data as Notification[]) || []);
    };

    fetchNotifications();

    const channel = supabase
      .channel("user-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          setNotifications((prev) => [payload.new as Notification, ...prev]);
          playNotificationSound();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const markAllAsRead = async () => {
    if (!user || unreadCount === 0) return;
    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
  };

  const handleNotificationClick = async (n: Notification) => {
    if (!n.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    }

    const target = getNotificationTarget(n, isAdmin, isDealer);
    if (target) {
      setOpen(false);
      const q = target.query ? `?${target.query}` : "";
      navigate(`${target.path}${q}`);
    }
  };

  const getDisplayMessage = (msg: string) =>
    msg
      .replace(/\[order_edit:[a-f0-9-]+\]\n?/, "")
      .replace(/\[user:[a-f0-9-]+\]/g, "")
      .replace(/\[phone:[^\]]*\]/g, "")
      .trim();

  const extractPhone = (msg: string): string | null => {
    const match = msg.match(/\[phone:([^\]]+)\]/);
    return match && match[1] ? match[1] : null;
  };

  const getRoleBadge = () => {
    if (isAdmin) return { label: "مدير", className: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" };
    if (isDealer) return { label: "تاجر", className: "bg-primary/10 text-primary" };
    return null;
  };

  if (!user) return null;

  const roleBadge = getRoleBadge();

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="relative text-secondary-foreground/80 hover:text-primary transition-colors p-2">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {unreadCount}
            </span>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-0" align="end">
        <div className="flex items-center justify-between p-3 border-b border-border">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold text-sm text-foreground">الإشعارات</h4>
            {roleBadge && (
              <Badge variant="secondary" className={`text-[9px] px-1.5 py-0 h-4 ${roleBadge.className}`}>
                {roleBadge.label}
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" className="text-xs h-auto py-1" onClick={markAllAsRead}>
              تعيين الكل كمقروء
            </Button>
          )}
        </div>
        <ScrollArea className="max-h-80">
          {notifications.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-8">لا توجد إشعارات</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                onClick={() => handleNotificationClick(n)}
                className={`w-full text-right p-3 border-b border-border last:border-0 hover:bg-muted/50 transition-colors ${
                  !n.is_read ? "bg-accent/30" : ""
                }`}
              >
                <div className="flex items-start gap-2">
                  <div
                    className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      n.type === "success" ? "bg-emerald-500" : n.type === "conversion_opportunity" ? "bg-orange-500" : n.type === "order_edit" ? "bg-amber-500" : n.type === "order" ? "bg-primary" : n.type === "warning" ? "bg-amber-500" : "bg-primary"
                    }`}
                  />
                  <div>
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{getDisplayMessage(n.message)}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-[10px] text-muted-foreground">
                        {new Date(n.created_at).toLocaleDateString("ar-EG", {
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </p>
                      {/* Show destination hint */}
                      <span className="text-[9px] text-muted-foreground/50">
                        {isAdmin ? "← لوحة الإدارة" : isDealer ? "← بوابة التاجر" : ""}
                      </span>
                      {n.type === "conversion_opportunity" && extractPhone(n.message) && (
                        <a
                          href={`https://wa.me/${extractPhone(n.message)!.replace(/^0/, "20").replace(/[^0-9]/g, "")}?text=${encodeURIComponent("مرحباً! لاحظنا اهتمامك بمنتجاتنا. هل يمكننا مساعدتك؟")}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="inline-flex items-center gap-1 text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 px-1.5 py-0.5 rounded-full hover:bg-emerald-200 transition-colors"
                        >
                          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.319 0-4.476-.672-6.309-1.828l-.452-.276-2.645.887.887-2.645-.276-.452A9.955 9.955 0 012 12C2 6.477 6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z"/></svg>
                          واتساب
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))
          )}
        </ScrollArea>
        {/* Footer link to full notifications page */}
        <div className="border-t border-border p-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-xs text-primary"
            onClick={() => {
              setOpen(false);
              navigate(isAdmin ? "/admin?section=orders" : isDealer ? "/dealer?tab=notifications" : "/my-orders");
            }}
          >
            عرض كل الإشعارات
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
