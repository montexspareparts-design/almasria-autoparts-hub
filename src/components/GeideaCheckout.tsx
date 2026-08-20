import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

declare global {
  interface Window {
    GeideaCheckout?: new (
      onSuccess: (res: unknown) => void,
      onError: (err: unknown) => void,
      onCancel: () => void,
    ) => { startPayment: (sessionId: string) => void };
  }
}

interface GeideaCheckoutProps {
  orderId: string;
  /** Currency is a parameter, never hardcoded downstream. */
  currency?: string;
  returnUrl?: string;
  onStarted?: () => void;
}

const loadScript = (src: string) =>
  new Promise<void>((resolve, reject) => {
    if (document.querySelector<HTMLScriptElement>(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Failed to load Geidea checkout"));
    document.head.appendChild(script);
  });

const GeideaCheckout = ({ orderId, currency = "EGP", returnUrl, onStarted }: GeideaCheckoutProps) => {
  const [loading, setLoading] = useState(false);
  const pollRef = useRef<number | null>(null);

  useEffect(() => () => {
    if (pollRef.current) window.clearInterval(pollRef.current);
  }, []);



  const start = useCallback(async () => {
    try {
      setLoading(true);

      // The session is created entirely server-side; no Geidea keys reach the browser.
      const { data, error } = await supabase.functions.invoke("geidea-create-session", {
        body: { order_id: orderId, currency, return_url: returnUrl },
      });

      if (error || !data?.session_id) {
        toast({
          title: "تعذر بدء الدفع عبر جيديا",
          description: data?.error || "حاول مرة أخرى بعد لحظات",
          variant: "destructive",
        });
        return;
      }

      await loadScript(data.checkout_script);

      if (!window.GeideaCheckout) {
        toast({ title: "تعذر تحميل بوابة جيديا", variant: "destructive" });
        return;
      }

      const goToCallback = () => {
        window.location.href = `/payment-callback?provider=geidea&merchant_order_id=${encodeURIComponent(
          data.order_number,
        )}`;
      };

      // Wallet payments (Meeza / Vodafone Cash…) are confirmed out-of-band:
      // the HPP success callback often never fires because the customer
      // approves on their phone. Poll the order until the verified webhook
      // moves it forward, then show the confirmation screen automatically.
      const startPolling = () => {
        if (pollRef.current) return;
        let ticks = 0;
        pollRef.current = window.setInterval(async () => {
          ticks += 1;
          if (ticks > 100) {
            window.clearInterval(pollRef.current!);
            pollRef.current = null;
            return;
          }
          const { data: order } = await supabase
            .from("orders")
            .select("status")
            .eq("id", orderId)
            .maybeSingle();
          if (order && ["processing", "shipped", "delivered"].includes(String(order.status))) {
            window.clearInterval(pollRef.current!);
            pollRef.current = null;
            goToCallback();
          }
        }, 5000);
      };

      const checkout = new window.GeideaCheckout(
        () => {
          // Final confirmation happens server-side via the verified webhook.
          goToCallback();
        },
        (err) => {
          console.error("Geidea payment error", err);
          toast({ title: "فشلت عملية الدفع", variant: "destructive" });
        },
        () => {
          toast({ title: "تم إلغاء عملية الدفع" });
        },
      );

      onStarted?.();
      checkout.startPayment(data.session_id);
      startPolling();
    } catch (e) {
      console.error("Geidea checkout error", e);
      toast({ title: "حدث خطأ غير متوقع", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [orderId, currency, returnUrl, onStarted]);


  return (
    <div className="space-y-2">
      <Button onClick={start} disabled={loading} className="w-full h-11 sm:h-12 font-bold gap-2" size="lg">
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
        {loading ? "جاري التجهيز..." : "ادفع عبر جيديا"}
      </Button>
      <p className="text-[10px] sm:text-xs text-muted-foreground text-center">
        الدفع يتم عبر بوابة جيديا الآمنة، ولا يتم تأكيد الطلب إلا بعد تحقق الخادم من العملية.
      </p>
    </div>
  );
};

export default GeideaCheckout;
