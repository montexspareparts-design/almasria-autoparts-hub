import { useCallback, useState } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface GeideaCheckoutProps {
  orderId: string;
  /** Currency is a parameter, never hardcoded downstream. */
  currency?: string;
  returnUrl?: string;
  onStarted?: () => void;
  callbackPath?: string;
}

const readFunctionError = async (error: unknown) => {
  const context = (error as { context?: Response } | null)?.context;
  if (!context) return null;
  try {
    const body = await context.clone().json() as { error?: string };
    return body.error || null;
  } catch {
    return null;
  }
};

const GeideaCheckout = ({ orderId, currency = "EGP", returnUrl, onStarted }: GeideaCheckoutProps) => {
  const [loading, setLoading] = useState(false);

  const start = useCallback(async () => {
    try {
      setLoading(true);

      // The session is created entirely server-side; no Geidea keys reach the browser.
      const { data, error } = await supabase.functions.invoke("geidea-create-session", {
        body: { order_id: orderId, currency, return_url: returnUrl },
      });

      if (error || !data?.session_id || !data?.checkout_url) {
        const serverMessage = error ? await readFunctionError(error) : data?.error;
        toast({
          title: "تعذر بدء الدفع عبر جيديا",
          description: serverMessage || "حاول مرة أخرى بعد لحظات",
          variant: "destructive",
        });
        return;
      }

      onStarted?.();
      window.location.assign(data.checkout_url);
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
