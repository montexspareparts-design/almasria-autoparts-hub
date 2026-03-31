import { useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

declare global {
  interface Window {
    Paymob: (publicKey: string) => {
      checkoutButton: (clientSecret: string) => {
        mount: (selector: string) => void;
      };
    };
  }
}

interface PaymobCheckoutProps {
  clientSecret: string;
  publicKey: string;
}

const PAYMOB_SDK_URL = "https://egypt.paymob.com/unifiedcheckout/sdk/latest/paymob.min.js";

const PaymobCheckout = ({ clientSecret, publicKey }: PaymobCheckoutProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerId = useMemo(
    () => `paymob-checkout-${Math.random().toString(36).slice(2, 10)}`,
    []
  );

  useEffect(() => {
    let cancelled = false;

    const loadAndMount = async () => {
      try {
        setLoading(true);
        setError(null);

        if (!window.Paymob) {
          await new Promise<void>((resolve, reject) => {
            const existingScript = document.querySelector<HTMLScriptElement>(
              `script[src="${PAYMOB_SDK_URL}"]`
            );

            if (existingScript) {
              existingScript.addEventListener("load", () => resolve(), { once: true });
              existingScript.addEventListener(
                "error",
                () => reject(new Error("Failed to load Paymob SDK")),
                { once: true }
              );

              if ((window as Window & { Paymob?: unknown }).Paymob) {
                resolve();
              }

              return;
            }

            const script = document.createElement("script");
            script.src = PAYMOB_SDK_URL;
            script.async = true;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error("Failed to load Paymob SDK"));
            document.head.appendChild(script);
          });
        }

        if (cancelled || !containerRef.current) return;

        containerRef.current.innerHTML = "";

        window.Paymob(publicKey)
          .checkoutButton(clientSecret)
          .mount(`#${containerId}`);

        if (!cancelled) {
          setLoading(false);
        }
      } catch (err) {
        console.error("Paymob mount error:", err);
        if (!cancelled) {
          setError("تعذر تحميل بوابة Paymob الآن. جرّب مرة أخرى بعد لحظات.");
          setLoading(false);
        }
      }
    };

    loadAndMount();

    return () => {
      cancelled = true;

      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [clientSecret, publicKey, containerId]);

  return (
    <div className="w-full">
      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>جاري تحميل بوابة الدفع...</span>
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-lg border border-destructive/20 bg-destructive/5 p-4 text-sm text-foreground">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 text-destructive" />
            <span>{error}</span>
          </div>
        </div>
      )}
      <div id={containerId} ref={containerRef} />
    </div>
  );
};

export default PaymobCheckout;
