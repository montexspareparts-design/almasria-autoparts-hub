import { useCallback, useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined;

/** فحص حقيقي للاتصال — navigator.onLine قد يكون صحيحًا دون إنترنت فعلي (واي فاي بلا نت). */
const ping = async (): Promise<boolean> => {
  if (typeof navigator !== "undefined" && !navigator.onLine) return false;
  if (!SUPABASE_URL) return true;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${SUPABASE_URL}/auth/v1/health`, {
      method: "HEAD",
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timer);
    return res.ok;
  } catch {
    return false;
  }
};

/**
 * حاجز انقطاع الاتصال — يظهر شاشة كاملة عند فقدان الإنترنت
 * ويتحقق فعليًا من الرجوع قبل إخفاء نفسه (مهم أثناء الدفع).
 */
const OilsOfflineGate = () => {
  const [offline, setOffline] = useState(false);
  const [checking, setChecking] = useState(false);

  const verify = useCallback(async () => {
    setChecking(true);
    const ok = await ping();
    setOffline(!ok);
    setChecking(false);
  }, []);

  useEffect(() => {
    void verify();
    const goOffline = () => setOffline(true);
    const goOnline = () => void verify();
    window.addEventListener("offline", goOffline);
    window.addEventListener("online", goOnline);
    // فحص دوري خفيف كخط أمان لو الأحداث لم تُطلق داخل الويب فيو
    const interval = setInterval(() => void verify(), 15000);
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
        <button type="button" onClick={() => void verify()} disabled={checking}>
          {checking ? "جاري التحقق..." : "إعادة المحاولة"}
        </button>
      </div>
    </div>
  );
};

export default OilsOfflineGate;
