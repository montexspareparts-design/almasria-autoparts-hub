import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Phone, X, Bot, CheckCircle2, User, Volume2, VolumeX, Target } from "lucide-react";
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
  claimed_by?: string | null;
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

      // Subscribe to support requests (INSERT for new alerts, UPDATE to remove claimed ones)
      const channel = supabase
        .channel("admin-new-support-requests")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "support_requests" },
          (payload) => {
            const req = payload.new as SupportRequest;
            if (seenIds.current.has(req.id)) return;
            if (req.status && (req.status as any) !== "pending") return;
            if (req.claimed_by) return;
            seenIds.current.add(req.id);
            setPending((prev) => [req, ...prev]);
            setOpen(true);
            playNewOrderSound();
            toast.success("🤖 طلب تواصل جديد من العميل!", { duration: 6000 });
          }
        )
        .on(
          "postgres_changes",
          { event: "UPDATE", schema: "public", table: "support_requests" },
          (payload) => {
            const req = payload.new as SupportRequest;
            // If someone (anyone) claimed it, remove from popup for everyone
            if (req.claimed_by || req.status === "resolved" || req.status === "closed") {
              setPending((prev) => {
                const next = prev.filter((r) => r.id !== req.id);
                if (next.length === 0) setOpen(false);
                return next;
              });
            }
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

  // Atomic claim — only succeeds if no one else has claimed yet
  const claimReq = async (req: SupportRequest): Promise<boolean> => {
    if (!user) return false;
    const { data, error } = await supabase
      .from("support_requests")
      .update({
        claimed_by: user.id,
        claimed_at: new Date().toISOString(),
        assigned_to: user.id,
        status: "in_progress",
      } as any)
      .eq("id", req.id)
      .is("claimed_by", null)
      .select("id")
      .maybeSingle();
    if (error) {
      toast.error(error.message);
      return false;
    }
    if (!data) {
      toast.error("⏱️ سبقك زميل! الطلب اتخد بالفعل");
      dismissReq(req.id);
      return false;
    }
    return true;
  };

  const handleClaim = async (req: SupportRequest) => {
    const ok = await claimReq(req);
    if (ok) {
      toast.success("🎯 الطلب لك! تواصل مع العميل الآن");
      // Keep visible only for this user (others get UPDATE event and lose it)
      navigate("/admin?section=daily-dashboard");
      dismissReq(req.id);
    }
  };

  const handleWhatsApp = async (req: SupportRequest) => {
    if (!req.customer_phone) return;
    const ok = await claimReq(req);
    if (!ok) return;
    const name = req.customer_name || "عميلنا الكريم";
    const msg = `أهلاً ${name}، معاك المصرية جروب لقطع غيار تويوتا 🚗\nاستلمنا طلبك للتواصل. كيف نقدر نساعدك؟`;
    const url = `https://wa.me/${formatPhoneForWA(req.customer_phone)}?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
    dismissReq(req.id);
  };

  const handleCall = async (req: SupportRequest) => {
    if (!req.customer_phone) return;
    const ok = await claimReq(req);
    if (!ok) return;
    window.location.href = `tel:${req.customer_phone}`;
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
            ⚡ أول واحد يضغط <strong>"أنا هرد"</strong> يحجز الطلب — اللي يسبق يكسب!
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

              <Button
                size="sm"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2 font-bold shadow-md"
                onClick={() => handleClaim(r)}
              >
                <Target className="w-4 h-4" />
                🎯 أنا هرد على هذا العميل
              </Button>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1.5 border-green-300 text-green-700 hover:bg-green-50 dark:border-green-700 dark:text-green-400"
                  onClick={() => handleWhatsApp(r)}
                  disabled={!r.customer_phone}
                  title="يأخذ الطلب ويفتح واتساب"
                >
                  <MessageCircle className="w-4 h-4" />
                  حجز + واتساب
                </Button>
                {r.customer_phone && (
                  <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleCall(r)} title="يأخذ الطلب ويفتح اتصال">
                    <Phone className="w-4 h-4" />
                    حجز + اتصال
                  </Button>
                )}
                <Button size="sm" variant="ghost" className="px-2" onClick={() => dismissReq(r.id)} title="إخفاء (الطلب يفضل متاح للزملاء)">
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="text-xs text-muted-foreground border-t pt-3">
          💡 لما تضغط "إخفاء" الطلب يفضل ظاهر لباقي الزملاء — مش هيتحجز عليك
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
