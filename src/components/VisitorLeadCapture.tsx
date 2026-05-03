import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, Gift, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "visitor_lead_capture_v2"; // bumped to invalidate old "永遠 dismiss"
const DISMISS_HOURS = 24; // re-show after 24h instead of forever
const SHOW_AFTER_MS_DEFAULT = 25_000; // for organic visitors
const SHOW_AFTER_MS_AD = 7_000; // for paid traffic (fbclid/gclid/utm) — must catch them fast
const HIDE_PATHS = ["/admin", "/dealer", "/checkout", "/payment", "/auth", "/reset-password", "/staff"];

const detectAdSource = () => {
  if (typeof window === "undefined") {
    return { source: "direct", label: "زائر مباشر", icon: "👋", isPaid: false };
  }
  const params = new URLSearchParams(window.location.search);
  const ref = (document.referrer || "").toLowerCase();
  const utm = (params.get("utm_source") || "").toLowerCase();
  const search = window.location.search.toLowerCase();
  const hay = `${ref} ${utm} ${search}`;
  const hasFb = hay.includes("fbclid") || hay.includes("facebook") || hay.includes("fb.com") || utm.includes("fb");
  const hasIg = hay.includes("instagram") || utm.includes("ig");
  const hasGoogle = hay.includes("gclid") || hay.includes("google") || utm.includes("google");
  const hasTiktok = hay.includes("tiktok") || hay.includes("ttclid");
  const hasWhatsapp = hay.includes("whatsapp") || utm === "wa";

  if (hasFb) return { source: "facebook", label: "أهلاً بيك من فيسبوك 👋", icon: "📘", isPaid: true };
  if (hasIg) return { source: "instagram", label: "أهلاً بيك من إنستجرام 👋", icon: "📷", isPaid: true };
  if (hasTiktok) return { source: "tiktok", label: "أهلاً بيك من تيك توك 👋", icon: "🎵", isPaid: true };
  if (hasGoogle) return { source: "google", label: "أهلاً بيك من جوجل 👋", icon: "🔍", isPaid: !!params.get("gclid") };
  if (hasWhatsapp) return { source: "whatsapp", label: "أهلاً بيك من واتساب 👋", icon: "💬", isPaid: false };
  return { source: "direct", label: "أهلاً بيك في المصرية جروب 👋", icon: "✨", isPaid: false };
};

const isDismissedRecently = (): boolean => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    if (parsed?.reason === "submitted") return true; // if they submitted, never bug them again
    const at = Number(parsed?.at) || 0;
    const ageMs = Date.now() - at;
    return ageMs < DISMISS_HOURS * 60 * 60 * 1000;
  } catch {
    return false;
  }
};

const VisitorLeadCapture = () => {
  const [open, setOpen] = useState(false);
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [meta] = useState(detectAdSource);
  const { pathname } = useLocation();
  const { toast } = useToast();

  useEffect(() => {
    if (HIDE_PATHS.some((p) => pathname.startsWith(p))) return;
    if (isDismissedRecently()) return;

    let mounted = true;
    let timer: ReturnType<typeof setTimeout> | null = null;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      // If user is signed in AND has phone in profile → skip. Otherwise still show.
      if (data.session?.user) {
        supabase
          .from("profiles")
          .select("phone, whatsapp_opt_in")
          .eq("user_id", data.session.user.id)
          .maybeSingle()
          .then(({ data: profile }) => {
            if (!mounted) return;
            if (profile?.phone && profile?.whatsapp_opt_in) return; // already have it, no need
            const delay = meta.isPaid ? SHOW_AFTER_MS_AD : SHOW_AFTER_MS_DEFAULT;
            timer = setTimeout(() => mounted && setOpen(true), delay);
          });
        return;
      }
      const delay = meta.isPaid ? SHOW_AFTER_MS_AD : SHOW_AFTER_MS_DEFAULT;
      timer = setTimeout(() => mounted && setOpen(true), delay);
    });

    return () => {
      mounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [pathname, meta.isPaid]);

  const dismiss = (reason: "closed" | "submitted") => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ at: Date.now(), reason }));
    } catch {
      /* noop */
    }
    setOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = phone.trim();
    if (!/^01[0-9]{9}$/.test(trimmed)) {
      toast({
        title: "رقم غير صحيح",
        description: "أدخل رقم مصري يبدأ بـ 01 ومكوّن من 11 رقم",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    let session_key = "";
    try {
      session_key =
        sessionStorage.getItem("visitor_session_key") ||
        localStorage.getItem("visitor_session_key") ||
        "";
    } catch {
      /* noop */
    }

    const { error } = await supabase.from("visitor_leads").upsert(
      {
        phone: trimmed,
        source: meta.source,
        first_path: pathname,
        referrer: typeof document !== "undefined" ? document.referrer : "",
        session_key: session_key || null,
      },
      { onConflict: "phone", ignoreDuplicates: true },
    );

    setSubmitting(false);

    if (error) {
      toast({ title: "حدث خطأ", description: "حاول مرة أخرى بعد قليل", variant: "destructive" });
      return;
    }

    toast({
      title: "تم استلام رقمك ✅",
      description: "هيتواصل معاك فريقنا خلال دقائق على واتساب",
    });
    dismiss("submitted");
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
            onClick={() => dismiss("closed")}
          />

          {/* Modal */}
          <motion.div
            key="modal"
            initial={{ opacity: 0, y: 40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.95 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            className="fixed inset-0 z-[101] flex items-end sm:items-center justify-center p-4 pointer-events-none"
            dir="rtl"
          >
            <div className="w-full max-w-md pointer-events-auto bg-card border-2 border-primary/20 rounded-3xl shadow-2xl overflow-hidden relative">
              <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-primary via-accent to-primary" />

              <button
                onClick={() => dismiss("closed")}
                className="absolute top-3 left-3 p-2 rounded-full hover:bg-muted transition-colors"
                aria-label="إغلاق"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>

              <div className="p-6 pt-8 space-y-5">
                <div className="text-center space-y-2">
                  <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 mb-2">
                    <span className="text-3xl">{meta.icon}</span>
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{meta.label}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    سيب رقمك واحنا هنرجعلك واتساب بـ
                    <span className="font-bold text-primary mx-1">عرض سعر فوري</span>
                    على القطعة اللي محتاجها 🚗
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 rounded-xl bg-muted/40">
                    <Gift className="w-4 h-4 mx-auto mb-1 text-primary" />
                    <p className="text-[10px] font-semibold">عرض حصري</p>
                  </div>
                  <div className="p-2 rounded-xl bg-muted/40">
                    <MessageCircle className="w-4 h-4 mx-auto mb-1 text-primary" />
                    <p className="text-[10px] font-semibold">رد فوري</p>
                  </div>
                  <div className="p-2 rounded-xl bg-muted/40">
                    <Sparkles className="w-4 h-4 mx-auto mb-1 text-primary" />
                    <p className="text-[10px] font-semibold">قطع أصلية</p>
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                  <Input
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="01xxxxxxxxx"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                    className="text-center text-lg tracking-wider h-12 font-bold"
                    dir="ltr"
                    required
                  />
                  <Button
                    type="submit"
                    disabled={submitting || phone.length < 11}
                    className="w-full h-12 text-base font-bold bg-gradient-to-r from-primary to-accent hover:opacity-90"
                  >
                    {submitting ? "جاري الإرسال..." : "ابعتلي عرض السعر على واتساب 💬"}
                  </Button>
                </form>

                <button
                  onClick={() => dismiss("closed")}
                  className="w-full text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  مش دلوقتي، شكراً
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default VisitorLeadCapture;
