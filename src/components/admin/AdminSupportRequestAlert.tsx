import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Phone, X, Bot, CheckCircle2, User, Volume2, VolumeX } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { playNewOrderSound } from "@/lib/orderAlertSound";
import { isSoundEnabled, setSoundEnabled } from "@/lib/pricingSound";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface SupportRequest {
  id: string;
  user_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  message: string | null;
  request_type: string;
  is_dealer: boolean | null;
  context: any;
  status?: string;
  created_at: string;
}

function formatPhoneForWA(phone: string): string {
  let c = phone.replace(/[\s\-()+]/g, "");
  c = c.replace(/^002/, "").replace(/^0020/, "");
  if (c.startsWith("0")) c = "2" + c;
  if (/^1\d{9}$/.test(c)) c = "20" + c;
  return c;
}

export default function AdminSupportRequestAlert() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pending, setPending] = useState<SupportRequest[]>([]);
  const [open, setOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const seenIds = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    let active = true;

    (async () => {
      // Verify staff role
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "moderator"]);
      if (!active || !roles || roles.length === 0) return;

      // Subscribe to new support requests
      const channel = supabase
        .channel("admin-new-support-requests")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "support_requests" },
          (payload) => {
            const req = payload.new as SupportRequest;
            if (seenIds.current.has(req.id)) return;
            if (req.status && (req.status as any) !== "pending") return;
            seenIds.current.add(req.id);
            setPending((prev) => [req, ...prev]);
            setOpen(true);
            playNewOrderSound();
            toast.success("🤖 طلب تواصل جديد من العميل!", { duration: 6000 });
          }
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

  const dismissReq = (id: string) => {
    setPending((prev) => prev.filter((r) => r.id !== id));
    if (pending.length <= 1) setOpen(false);
  };

  const markResolved = async (req: SupportRequest) => {
    if (!user) return;
    await supabase
      .from("support_requests")
      .update({ status: "in_progress", assigned_to: user.id } as any)
      .eq("id", req.id);
    dismissReq(req.id);
  };

  const handleWhatsApp = async (req: SupportRequest) => {
    if (!req.customer_phone) return;
    const name = req.customer_name || "عميلنا الكريم";
    const msg = `أهلاً ${name}، معاك المصرية جروب لقطع غيار تويوتا 🚗\nاستلمنا طلبك للتواصل. كيف نقدر نساعدك؟`;
    const url = `https://wa.me/${formatPhoneForWA(req.customer_phone)}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
    await markResolved(req);
  };

  const handleViewInCRM = (req: SupportRequest) => {
    navigate("/admin?section=daily-dashboard");
    dismissReq(req.id);
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  if (pending.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md border-2 border-primary/40 shadow-2xl" dir="rtl">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-primary" />
              </span>
              <Bot className="w-5 h-5 text-primary" />
              طلب تواصل من الشات بوت
              {pending.length > 1 && <Badge variant="default">{pending.length}</Badge>}
            </DialogTitle>
            <Button variant="ghost" size="icon" onClick={toggleSound} className="h-8 w-8" title={soundOn ? "إيقاف الصوت" : "تفعيل الصوت"}>
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
            </Button>
          </div>
          <DialogDescription>
            عميل يحتاج موظف يتواصل معه — استجب بسرعة!
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {pending.map((r) => (
            <div key={r.id} className="border border-border rounded-xl p-4 bg-gradient-to-br from-primary/5 to-transparent space-y-3">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <User className="w-4 h-4 text-primary" />
                    <span className="font-bold text-foreground">{r.customer_name || "عميل"}</span>
                    {r.is_dealer && <Badge variant="default" className="text-[10px] h-5">تاجر</Badge>}
                    {!r.user_id && <Badge variant="secondary" className="text-[10px] h-5">ضيف</Badge>}
                  </div>
                  {r.customer_phone && (
                    <a href={`tel:${r.customer_phone}`} className="text-xs text-primary flex items-center gap-1 hover:underline">
                      <Phone className="w-3 h-3" />
                      {r.customer_phone}
                    </a>
                  )}
                  {r.message && (
                    <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2 mt-1.5 line-clamp-3">
                      💬 {r.message}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-1.5"
                  onClick={() => handleWhatsApp(r)}
                  disabled={!r.customer_phone}
                >
                  <MessageCircle className="w-4 h-4" />
                  واتساب فوري
                </Button>
                {r.customer_phone && (
                  <Button asChild size="sm" variant="outline" className="gap-1.5">
                    <a href={`tel:${r.customer_phone}`} onClick={() => markResolved(r)}>
                      <Phone className="w-4 h-4" />
                      اتصال
                    </a>
                  </Button>
                )}
                <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleViewInCRM(r)}>
                  <CheckCircle2 className="w-4 h-4" />
                  عرض
                </Button>
                <Button size="sm" variant="ghost" className="px-2" onClick={() => dismissReq(r.id)} title="إخفاء">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="text-xs text-muted-foreground border-t pt-3">
          💡 الطلبات بتظهر كمان في تبويب "طلبات الشات بوت" بمركز قيادة المتابعة
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
