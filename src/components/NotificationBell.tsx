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

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

/** Determine where a notification should navigate based on user role */
const getNotificationTarget = (n: Notification, isAdmin: boolean): { path: string; tab?: string; section?: string } | null => {
  const msg = (n.message + " " + n.title);

  // Admin-specific routing
  if (isAdmin) {
    // Dealer registration requests
    if (msg.includes("طلب تسجيل") || msg.includes("تاجر جديد") || n.type === "dealer_application") {
      return { path: "/admin", section: "dealers" };
    }
    // Orders (new order, status change, edit approval)
    if (n.type === "order" || n.type === "order_edit" || msg.includes("طلب جديد") || msg.includes("طلب رقم") || msg.includes("ORD-")) {
      return { path: "/admin", section: "orders" };
    }
    // Price lists
    if (msg.includes("كشف أسعار") || n.type === "price_list") {
      return { path: "/admin", section: "price-lists" };
    }
    // Products / offers
    if (msg.includes("عرض خاص") || msg.includes("عرض جديد") || n.type === "offer" || n.type === "product") {
      return { path: "/admin", section: "products" };
    }
    // Stock alerts
    if (n.type === "stock_alert" || msg.includes("متوفر الآن")) {
      return { path: "/admin", section: "products" };
    }
    // Customer reviews
    if (msg.includes("تقييم") || n.type === "review") {
      return { path: "/admin", section: "products" };
    }
    // Fallback for admin
    return { path: "/admin", section: "analytics" };
  }

  // Dealer routing
  // Orders
  if (n.type === "order" || n.type === "order_edit" || msg.includes("طلبك") || msg.includes("طلب رقم") || msg.includes("ORD-")) {
    return { path: "/dealer", tab: "orders" };
  }
  // Price lists  
  if (msg.includes("كشف أسعار") || n.type === "price_list") {
    return { path: "/dealer", tab: "price_lists" };
  }
  // Offers & stock alerts
  if (n.type === "stock_alert" || n.type === "offer" || msg.includes("عرض خاص") || msg.includes("عرض جديد") || msg.includes("متوفر الآن")) {
    return { path: "/dealer", tab: "offers" };
  }
  // Invoices
  if (msg.includes("فاتورة") || msg.includes("invoice") || n.type === "invoice") {
    return { path: "/dealer", tab: "invoices" };
  }
  // Payment
  if (msg.includes("دفع") || msg.includes("تحويل") || msg.includes("payment")) {
    return { path: "/dealer", tab: "payment" };
  }
  // Quotes
  if (msg.includes("عرض سعر") || msg.includes("quote")) {
    return { path: "/dealer", tab: "quotes" };
  }
  // Fallback
  return { path: "/dealer", tab: "notifications" };
};

const NotificationBell = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);

  const audioCtxRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }, []);

  const playNotificationSound = useCallback((type?: string) => {
    try {
      const ctx = getAudioContext();
      if (ctx.state === "suspended") ctx.resume();

      const isOrder = type === "order" || type === "order_edit";

      if (isOrder) {
        // Urgent double-ding for orders
        [0, 0.25].forEach((delay) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.value = 1200;
          osc.type = "sine";
          gain.gain.setValueAtTime(0.4, ctx.currentTime + delay);
          gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + delay + 0.3);
          osc.start(ctx.currentTime + delay);
          osc.stop(ctx.currentTime + delay + 0.3);
        });
      } else {
        // Pleasant ding for regular notifications
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = 880;
        osc.type = "sine";
        gain.gain.setValueAtTime(0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.6);
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.6);
      }
    } catch (e) {
      // Audio not supported
    }
  }, [getAudioContext]);

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
          const newNotif = payload.new as Notification;
          setNotifications((prev) => [newNotif, ...prev]);
          playNotificationSound(newNotif.type);
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
    // Mark as read
    if (!n.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
      setNotifications((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    }

    // Navigate
    const target = getNotificationTarget(n, isAdmin);
    if (target) {
      setOpen(false);
      if (target.section) {
        navigate(`${target.path}?section=${target.section}`);
      } else {
        const params = target.tab ? `?tab=${target.tab}` : "";
        navigate(`${target.path}${params}`);
      }
    }
  };

  const getDisplayMessage = (msg: string) => msg.replace(/\[order_edit:[a-f0-9-]+\]\n?/, "");

  if (!user) return null;

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
          <h4 className="font-semibold text-sm text-foreground">الإشعارات</h4>
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
                  {!n.is_read && (
                    <span className="shrink-0 mt-0.5 text-[9px] font-black bg-primary text-primary-foreground px-1.5 py-0.5 rounded-md leading-none">
                      NEW
                    </span>
                  )}
                  <div
                    className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${
                      n.type === "success" ? "bg-emerald-500" : n.type === "order_edit" ? "bg-amber-500" : n.type === "order" ? "bg-primary" : n.type === "warning" ? "bg-amber-500" : "bg-primary"
                    }`}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{getDisplayMessage(n.message)}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(n.created_at).toLocaleDateString("ar-EG", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              </button>
            ))
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
};

export default NotificationBell;
