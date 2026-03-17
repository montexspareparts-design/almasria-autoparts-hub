import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

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
  const mountedRef = useRef(false);

  useEffect(() => {
    if (mountedRef.current) return;
    mountedRef.current = true;

    const loadAndMount = async () => {
      // Load SDK if not already loaded
      if (!window.Paymob) {
        await new Promise<void>((resolve, reject) => {
          const script = document.createElement("script");
          script.src = PAYMOB_SDK_URL;
          script.onload = () => resolve();
          script.onerror = () => reject(new Error("Failed to load Paymob SDK"));
          document.head.appendChild(script);
        });
      }

      // Mount checkout button
      try {
        window.Paymob(publicKey)
          .checkoutButton(clientSecret)
          .mount("#paymob-checkout-container");
        setLoading(false);
      } catch (err) {
        console.error("Paymob mount error:", err);
        setLoading(false);
      }
    };

    loadAndMount();
  }, [clientSecret, publicKey]);

  return (
    <div className="w-full">
      {loading && (
        <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>جاري تحميل بوابة الدفع...</span>
        </div>
      )}
      <div id="paymob-checkout-container" ref={containerRef} />
    </div>
  );
};

export default PaymobCheckout;
