import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Truck, Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Props {
  orderId: string;
  initialTrackingNumber?: string | null;
  initialStatus?: string | null;
}

export default function BostaShipmentPanel({ orderId, initialTrackingNumber, initialStatus }: Props) {
  const [tracking, setTracking] = useState<string | null>(initialTrackingNumber || null);
  const [status, setStatus] = useState<string | null>(initialStatus || null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!tracking) {
      (async () => {
        const { data } = await supabase
          .from("shipments")
          .select("tracking_number, status")
          .eq("order_id", orderId)
          .eq("carrier", "bosta")
          .maybeSingle();
        if (data?.tracking_number) {
          setTracking(data.tracking_number);
          setStatus(data.status);
        }
      })();
    }
  }, [orderId, tracking]);

  const createShipment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("bosta-create-shipment", {
        body: { order_id: orderId },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setTracking((data as any).tracking_number);
      setStatus("created");
      toast.success(`تم إنشاء شحنة Bosta: ${(data as any).tracking_number}`);
    } catch (e: any) {
      toast.error("فشل إنشاء شحنة Bosta: " + (e?.message || e));
    } finally {
      setLoading(false);
    }
  };

  const refresh = async () => {
    if (!tracking) return;
    setRefreshing(true);
    try {
      const { data, error } = await supabase.functions.invoke("bosta-track-shipment", {
        body: { tracking_number: tracking },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setStatus((data as any).status);
      toast.success("تم تحديث حالة الشحنة");
    } catch (e: any) {
      toast.error("فشل التحديث: " + (e?.message || e));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="bg-background border border-border rounded-lg p-3 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold">شحن Bosta</span>
          {status && <Badge variant="outline" className="text-[10px]">{status}</Badge>}
        </div>
        {!tracking ? (
          <Button size="sm" onClick={createShipment} disabled={loading} className="h-7 text-xs gap-1">
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Truck className="w-3 h-3" />}
            إنشاء شحنة Bosta
          </Button>
        ) : (
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={refresh} disabled={refreshing} className="h-7 text-xs gap-1">
              {refreshing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
              تحديث
            </Button>
            <a
              href={`https://bosta.co/tracking-shipment/${tracking}`}
              target="_blank" rel="noopener noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <ExternalLink className="w-3 h-3" /> فتح في Bosta
            </a>
          </div>
        )}
      </div>
      {tracking && (
        <div className="text-xs text-muted-foreground">
          AWB: <span className="font-mono font-bold text-foreground" dir="ltr">{tracking}</span>
        </div>
      )}
    </div>
  );
}
