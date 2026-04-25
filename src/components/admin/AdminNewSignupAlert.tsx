import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Phone, UserPlus, X, Volume2, VolumeX, Eye } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { playNewOrderSound } from "@/lib/orderAlertSound";
import { isSoundEnabled, setSoundEnabled } from "@/lib/pricingSound";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Realtime "new customer signed up" alert for admins/moderators.
 * Mirrors the AdminNewOrderAlert pattern (channel + repeated klaxon)
 * but listens to INSERT on `profiles` so staff can welcome the customer
 * within minutes of registration.
 *
 * NOTE: requires `profiles` to be in the `supabase_realtime` publication
 * (added in the migration that ships with this component).
 */
interface NewSignupInfo {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  email: string | null;
  car_model: string | null;
  car_year: number | null;
  whatsapp_opt_in: boolean | null;
  created_at: string;
}

function formatPhoneForWA(phone: string): string {
  let c = phone.replace(/[\s\-()+]/g, "");
  c = c.replace(/^002/, "").replace(/^0020/, "");
  if (c.startsWith("0")) c = "2" + c;
  if (/^1\d{9}$/.test(c)) c = "20" + c;
  return c;
}

function buildWelcomeMessage(s: NewSignupInfo): string {
  const name = s.full_name || "عميلنا الكريم";
  const car =
    s.car_model && s.car_year
      ? `\nشُفنا إنك سجّلت سيارة *${s.car_model} ${s.car_year}* — متوفّر عندنا قطع غيار أصلية وبدائل ممتازة لها.`
      : "";
  return (
    `أهلاً ${name} 👋\n` +
    `معاك المصرية جروب لقطع غيار تويوتا 🚗\n\n` +
    `شكراً لتسجيلك معانا في الموقع.${car}\n\n` +
    `تحب نساعدك في إيجاد قطعة معيّنة أو نعرّفك على عروضنا الحالية؟`
  );
}

const AdminNewSignupAlert = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pendingSignups, setPendingSignups] = useState<NewSignupInfo[]>([]);
  const [open, setOpen] = useState(false);
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const seenIds = useRef<Set<string>>(new Set());
  const repeatTimer = useRef<number | null>(null);
  // Avoid yelling on the very first session load — only alert for signups
  // that happen AFTER the staff member opened the dashboard.
  const mountedAt = useRef<number>(Date.now());

  useEffect(() => {
    if (!user) return;
    let active = true;

    (async () => {
      const { data: roles } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .in("role", ["admin", "moderator"]);
      if (!active || !roles || roles.length === 0) return;

      const channel = supabase
        .channel("admin-new-signups")
        .on(
          "postgres_changes",
          { event: "INSERT", schema: "public", table: "profiles" },
          async (payload) => {
            const row = payload.new as any;
            if (seenIds.current.has(row.user_id)) return;
            // Skip historical rows that arrive in the initial snapshot
            const createdMs = row.created_at ? new Date(row.created_at).getTime() : 0;
            if (createdMs && createdMs < mountedAt.current - 60_000) return;
            // Skip staff/dealer accounts — only alert on regular customers
            const { data: theirRoles } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", row.user_id);
            const isStaff = (theirRoles || []).some((r: any) => r.role === "admin" || r.role === "moderator");
            if (isStaff) return;

            seenIds.current.add(row.user_id);

            const newSignup: NewSignupInfo = {
              user_id: row.user_id,
              full_name: row.full_name ?? null,
              phone: row.phone ?? null,
              email: row.email ?? null,
              car_model: row.car_model ?? null,
              car_year: row.car_year ?? null,
              whatsapp_opt_in: row.whatsapp_opt_in ?? null,
              created_at: row.created_at,
            };

            setPendingSignups((prev) => [newSignup, ...prev]);
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

  // Repeat the klaxon every 10s while signups remain un-actioned and sound is on.
  useEffect(() => {
    if (repeatTimer.current) {
      window.clearInterval(repeatTimer.current);
      repeatTimer.current = null;
    }
    if (pendingSignups.length > 0 && soundOn && open) {
      repeatTimer.current = window.setInterval(() => {
        playNewOrderSound();
      }, 10000);
    }
    return () => {
      if (repeatTimer.current) {
        window.clearInterval(repeatTimer.current);
        repeatTimer.current = null;
      }
    };
  }, [pendingSignups.length, soundOn, open]);

  const dismissSignup = (uid: string) => {
    setPendingSignups((prev) => prev.filter((s) => s.user_id !== uid));
    if (pendingSignups.length <= 1) setOpen(false);
  };

  const handleViewProfile = (s: NewSignupInfo) => {
    navigate(`/admin/visitor/${s.user_id}`);
    dismissSignup(s.user_id);
  };

  const handleWhatsApp = (s: NewSignupInfo) => {
    if (!s.phone) return;
    const url = `https://wa.me/${formatPhoneForWA(s.phone)}?text=${encodeURIComponent(buildWelcomeMessage(s))}`;
    window.open(url, "_blank");
    dismissSignup(s.user_id);
  };

  const toggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  if (pendingSignups.length === 0) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent
        // High-attention popup matching the new-order alert: thick ring + pulse.
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        className="max-w-md border-4 border-emerald-500 shadow-[0_0_0_4px_hsl(152_70%_45%/0.3),0_25px_50px_-12px_hsl(152_70%_45%/0.6)] animate-[pulse_2s_ease-in-out_infinite]"
      >
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
              </span>
              عميل جديد سجّل دلوقتي! 🎉
              {pendingSignups.length > 1 && (
                <Badge className="bg-emerald-600">{pendingSignups.length}</Badge>
              )}
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleSound}
              className="h-8 w-8"
              title={soundOn ? "إيقاف الصوت" : "تفعيل الصوت"}
            >
              {soundOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
            </Button>
          </div>
          <DialogDescription>
            رحّب بالعميل في أول 10 دقائق — أعلى احتمالية تحويله لمشتري حقيقي
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto">
          {pendingSignups.map((s) => (
            <div
              key={s.user_id}
              className="border border-border rounded-xl p-4 bg-gradient-to-br from-emerald-500/5 to-transparent space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <UserPlus className="w-4 h-4 text-emerald-600" />
                    <span className="font-bold text-foreground">
                      {s.full_name || "عميل بدون اسم"}
                    </span>
                    {s.whatsapp_opt_in && (
                      <Badge variant="outline" className="text-[10px] border-emerald-500/40 text-emerald-700">
                        موافق على واتساب
                      </Badge>
                    )}
                  </div>
                  {s.phone && (
                    <a
                      href={`tel:${s.phone}`}
                      className="text-xs text-primary flex items-center gap-1 hover:underline"
                    >
                      <Phone className="w-3 h-3" />
                      {s.phone}
                    </a>
                  )}
                  {s.email && (
                    <p className="text-xs text-muted-foreground truncate max-w-[220px]">{s.email}</p>
                  )}
                </div>
                <div className="text-end">
                  {s.car_model && (
                    <p className="text-xs font-medium text-foreground">
                      🚗 {s.car_model} {s.car_year ?? ""}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  size="sm"
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white gap-1.5"
                  onClick={() => handleWhatsApp(s)}
                  disabled={!s.phone}
                  title={!s.phone ? "لا يوجد رقم هاتف لهذا العميل" : undefined}
                >
                  <MessageCircle className="w-4 h-4" />
                  ترحيب واتساب
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 gap-1.5"
                  onClick={() => handleViewProfile(s)}
                >
                  <Eye className="w-4 h-4" />
                  عرض الملف
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="px-2"
                  onClick={() => dismissSignup(s.user_id)}
                  title="إخفاء"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter className="text-xs text-muted-foreground border-t pt-3">
          💡 الرسالة الجاهزة تتضمن اسم العميل وموديل سيارته إن وُجد
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AdminNewSignupAlert;
