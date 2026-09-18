import { useEffect, useState } from "react";
import { Bell, BellRing, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import {
  isWebPushSupported,
  isPushSubscribed,
  requestPushPermission,
} from "@/lib/pushNotifications";

const DISMISS_KEY = "staff_push_banner_dismissed";

/**
 * Prompts staff to enable browser push so paid orders (including the oils app)
 * reach their device even when the admin panel is closed.
 */
export default function StaffPushEnableBanner() {
  const { toast } = useToast();
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!isWebPushSupported()) return;
      if (localStorage.getItem(DISMISS_KEY) === "1") return;
      if (typeof Notification !== "undefined" && Notification.permission === "denied") return;
      const subscribed = await isPushSubscribed();
      if (!cancelled && !subscribed) setVisible(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!visible) return null;

  const enable = async () => {
    setBusy(true);
    const ok = await requestPushPermission();
    setBusy(false);
    if (ok) {
      setVisible(false);
      toast({
        title: "تم تفعيل الإشعارات ✅",
        description: "هيوصلك تنبيه فوري بأي طلب مدفوع حتى والتطبيق مقفول.",
      });
    } else {
      toast({
        title: "لم يتم التفعيل",
        description: "لازم تسمح بالإشعارات من إعدادات المتصفح لهذا الموقع.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="mx-3 mt-3 rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center shrink-0">
        <BellRing className="w-4.5 h-4.5 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold">فعّل إشعارات الطلبات على جهازك</p>
        <p className="text-xs text-muted-foreground">
          تنبيه فوري بأي طلب مدفوع (شامل تطبيق الزيوت) حتى لو اللوحة مقفولة.
        </p>
      </div>
      <Button size="sm" onClick={enable} disabled={busy} className="gap-1.5 shrink-0">
        <Bell className="w-3.5 h-3.5" />
        {busy ? "جارٍ..." : "تفعيل"}
      </Button>
      <button
        aria-label="إخفاء"
        onClick={() => {
          localStorage.setItem(DISMISS_KEY, "1");
          setVisible(false);
        }}
        className="text-muted-foreground hover:text-foreground shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
