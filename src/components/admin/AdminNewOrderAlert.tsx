import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Eye, Phone, Package, X, Volume2, VolumeX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { playNewOrderSound } from "@/lib/orderAlertSound";
import { isSoundEnabled, setSoundEnabled } from "@/lib/pricingSound";
import { useAuth } from "@/contexts/AuthContext";

interface NewOrderInfo {
  id: string;
  order_number: string;
  total_amount: number;
  user_id: string;
  customer_name?: string;
  customer_phone?: string;
  pickup_branch?: string | null;
  shipping_governorate?: string | null;
}

function formatPhoneForWA(phone: string): string {
  let c = phone.replace(/[\s\-()+]/g, "");
  c = c.replace(/^002/, "").replace(/^0020/, "");
  if (c.startsWith("0")) c = "2" + c;
  if (/^1\d{9}$/.test(c)) c = "20" + c;
  return c;
}

function buildWhatsAppMessage(o: NewOrderInfo): string {
  const total = Number(o.total_amount).toLocaleString("ar-EG");
  const name = o.customer_name || "عميلنا الكريم";
  return (
    `أهلاً ${name}، معاك المصرية جروب لقطع غيار تويوتا 🚗\n\n` +
    `استلمنا طلبك رقم *${o.order_number}* بقيمة *${total} ج.م*.\n` +
    `بنتواصل معاك لتأكيد التفاصيل وأقرب وقت للاستلام/التوصيل.\n\n` +
    `هل تحب نأكد الطلب الآن؟`
  );
}

const AdminNewOrderAlert = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingOrders, setPendingOrders] = useState<NewOrderInfo[]>([]);
  const [open, setOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const seenIds = useRef<Set<string>>(new Set());
  // Repeat the klaxon every N seconds while there are still un-actioned orders.
  // Stops the moment the popup is dismissed or the list empties.
  const repeatTimer = useRef<number | null>(null);

  useEffect(() => {
    if (!user) return;

    // Check if user is staff
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "moderator"]);
      if (!active || !data || data.length === 0) return;

      // Subscribe to new orders
      const channel = supabase
        .channel("admin-new-orders")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "orders" },
          async (payload) => {
            const order = payload.new as any;
            if (seenIds.current.has(order.id)) return;
            seenIds.current.add(order.id);

            // Fetch customer info
            const { data: profile } = await supabase
              .from("profiles")
              .select("full_name, phone")
              .eq("user_id", order.user_id)
              .maybeSingle();

            const newOrder: NewOrderInfo = {
              id: order.id,
              order_number: order.order_number,
              total_amount: Number(order.total_amount),
              user_id: order.user_id,
              customer_name: profile?.full_name || "عميل",
              customer_phone: profile?.phone || "",
              pickup_branch: order.pickup_branch,
              shipping_governorate: order.shipping_governorate,
            };

            setPendingOrders((prev) => [newOrder, ...prev]);
            setOpen(true);
            playNewOrderSound();
          },
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    })();

    return () => {
      active = false;
    };
  }, [user]);

  // Strong attention loop: re-play the klaxon every 8s while orders remain
  // un-actioned and sound is enabled. Stops automatically when dismissed.
  useEffect(() => {
    if (repeatTimer.current) {
      window.clearInterval(repeatTimer.current);
      repeatTimer.current = null;
    }
    if (pendingOrders.length > 0 && soundOn && open) {
      repeatTimer.current = window.setInterval(() => {
        playNewOrderSound();
      }, 8000);
    }
    return () => {
      if (repeatTimer.current) {
        window.clearInterval(repeatTimer.current);
        repeatTimer.current = null;
      }
    };
  }, [pendingOrders.length, soundOn, open]);

  const dismissOrder = (id: string) => {
    setPendingOrders((prev) => prev.filter((o) => o.id !== id));
    if (pendingOrders.length <= 1) setOpen(false);
  };

  const handleViewOrder = async (o: NewOrderInfo) => {
    // Mark first contact
    await supabase.from("orders").update({ first_contacted_at: new Date().toISOString() } as any).eq("id", o.id);
    navigate(`/admin?section=orders&highlight=${o.id}`);
    dismissOrder(o.id);
  };

  const handleWhatsApp = async (o: NewOrderInfo) => {
    if (!o.customer_phone) return;
    await supabase.from("orders").update({ first_contacted_at: new Date().toISOString() } as any).eq("id", o.id);
    const url = `https://wa.me/${formatPhoneForWA(o.customer_phone)}?text=${encodeURIComponent(buildWhatsAppMessage(o))}`;
    window.open(url, "_blank");
    dismissOrder(o.id);
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  if (pendingOrders.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md border-2 border-primary/40 shadow-2xl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
              </span>
              طلب جديد!
              {pendingOrders.length > 1 && (
                <Badge variant="destructive">{pendingOrders.length}</Badge>
              )}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={toggleSound} className="h-8 w-8" title={soundOn ? "إيقاف الصوت" : "تفعيل الصوت"}>
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
            </Button>
          </div>
          <DialogDescription>
            تواصل مع العميل خلال 15 دقيقة لتأكيد الطلب
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {pendingOrders.map((o) => (
            <div
              key={o.id}
              className="border border-border rounded-xl p-4 bg-gradient-to-br from-primary/5 to-transparent space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Package className="w-4 h-4 text-primary" />
                    <span className="font-bold text-foreground">{o.order_number}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{o.customer_name}</p>
                  {o.customer_phone && (
                    <a href={`tel:${o.customer_phone}`} className="text-xs text-primary flex items-center gap-1 hover:underline">
                      <Phone className="w-3 h-3" />
                      {o.customer_phone}
                    </a>
                  )}
                </div>
                <div className="text-end">
                  <p className="font-bold text-lg text-primary">
                    {Number(o.total_amount).toLocaleString("ar-EG")} ج.م
                  </p>
                  {o.pickup_branch && (
                    <p className="text-xs text-muted-foreground">📍 {o.pickup_branch}</p>
                  )}
                  {o.shipping_governorate && !o.pickup_branch && (
                    <p className="text-xs text-muted-foreground">🚚 {o.shipping_governorate}</p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-1.5"
                  onClick={() => handleWhatsApp(o)}
                  disabled={!o.customer_phone}
                >
                  <MessageCircle className="w-4 h-4" />
                  واتساب فوري
                </Button>
                <Button size="sm" variant="outline" className="flex-1 gap-1.5" onClick={() => handleViewOrder(o)}>
                  <Eye className="w-4 h-4" />
                  عرض الطلب
                </Button>
                <Button size="sm" variant="ghost" className="px-2" onClick={() => dismissOrder(o.id)} title="إخفاء">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="text-xs text-muted-foreground border-t pt-3">
          💡 الرسالة الجاهزة تتضمن اسم العميل ورقم الطلب والمبلغ تلقائياً
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminNewOrderAlert;
