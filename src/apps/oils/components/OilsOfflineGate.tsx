import { useCallback, useEffect, useRef, useState } from "react";
import { WifiOff } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string | undefined;

/**
 * فحص اتصال متسامح: لو المتصفح/الويب فيو قايل إن فيه شبكة، نعتبره متصلًا.
 * الفحص الشبكي مجرد تأكيد إضافي، وفشله وحده لا يكفي لإظهار الشاشة.
 */
const ping = async (): Promise<boolean> => {
  if (!SUPABASE_URL || !SUPABASE_KEY) return true;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      method: "GET",
      cache: "no-store",
      headers: { apikey: SUPABASE_KEY },
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok || res.status < 500;
  } catch {
    return false;
  }
};

/** لا تظهر الشاشة إلا بعد فشل متتالٍ مؤكد + المتصفح نفسه مش شايف شبكة. */
const FAILS_BEFORE_BLOCK = 3;

const OilsOfflineGate = () => {
  const [offline, setOffline] = useState(false);
  const [checking, setChecking] = useState(false);
  const fails = useRef(0);

  const verify = useCallback(async () => {
    setChecking(true);
    const browserOnline = typeof navigator === "undefined" || navigator.onLine !== false;
    const ok = await ping();

    if (ok) {
      fails.current = 0;
      setOffline(false);
    } else if (!browserOnline) {
      // الجهاز نفسه مش متصل → نعرض فورًا
      setOffline(true);
    } else {
      fails.current += 1;
      setOffline(fails.current >= FAILS_BEFORE_BLOCK);
    }
    setChecking(false);
  }, []);

  useEffect(() => {
    void verify();
    const goOffline = () => {
      // حدث offline من الويب فيو غير موثوق بمفرده — نتحقق فعليًا
      void verify();
    };
    const goOnline = () => {
      fails.current = 0;
      setOffline(false);
      void verify();
    };
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    const interval = setInterval(() => void verify(), 20000);
    return () => {
      window.removeEventListener("offline", goOffline);
      window.removeEventListener("online", goOnline);
      clearInterval(interval);
    };
  }, [verify]);

  if (!offline) return null;

  return (
    <div className="oils-offline" role="alert" dir="rtl">
      <div className="oils-offline-card">
        <span className="oils-offline-icon">
          <WifiOff className="w-7 h-7" />
        </span>
        <h2>لا يوجد اتصال بالإنترنت</h2>
        <p>
          تأكد من اتصالك بالشبكة أو بيانات الموبايل — التطبيق هيكمل تلقائيًا أول ما يرجع الاتصال.
        </p>
        <button
          type="button"
          onClick={() => {
            fails.current = 0;
            setOffline(false);
            void verify();
          }}
          disabled={checking}
        >
          {checking ? "جاري التحقق..." : "إعادة المحاولة"}
        </button>
      </div>
    </div>
  );
};

export default OilsOfflineGate;
