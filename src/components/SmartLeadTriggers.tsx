/**
 * SmartLeadTriggers — محفّزات سلوكية خفيفة لجمع رقم الزائر بدون إزعاج.
 *
 * بيشتغل بثلاث طرق ذكية (واحدة بس بتظهر للزائر — أول واحدة تتحقق):
 *   1) Exit Intent  → الماوس بتطلع برة الصفحة من فوق (نية خروج على ديسكتوب).
 *   2) Scroll Depth → وصل لـ 65% من الصفحة (= مهتم فعلاً).
 *   3) Idle 90s     → قعد 90 ثانية بدون تفاعل (يدّيه فرصة كان شايف ومش متفاعل).
 *
 * الواجهة: شريط سفلي صغير (Bottom Slide-in) — مش modal بيقطع التصفّح.
 * بيتقفل لمرة واحدة فقط عبر localStorage (`smart_lead_trigger_v1`).
 * بيتجاهل: المسجّلين، صفحات /admin /dealer /checkout /payment /auth،
 * ولو الزائر سبق وأرسل رقمه من HeroLeadCapture أو VisitorLeadCapture.
 */
import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, MessageCircle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "smart_lead_trigger_v1";
const HERO_SUBMITTED_KEY = "hero_lead_capture_submitted_v1";
const POPUP_SUBMITTED_KEY = "visitor_lead_capture_v1";
const HIDE_PATHS = ["/admin", "/dealer", "/checkout", "/payment", "/auth", "/reset-password"];
const SCROLL_THRESHOLD = 0.65;
const IDLE_MS = 90_000;
const MIN_TIME_BEFORE_TRIGGER_MS = 8_000; // ما يظهرش قبل 8 ثواني من فتح الصفحة

const detectSource = (): string => {
  if (typeof window === "undefined") return "direct";
  const params = new URLSearchParams(window.location.search);
  const ref = (document.referrer || "").toLowerCase();
  const utm = (params.get("utm_source") || "").toLowerCase();
  const hay = `${ref} ${utm}`;
  if (hay.includes("whatsapp") || utm === "wa") return "whatsapp";
  if (hay.includes("fbclid") || hay.includes("facebook")) return "facebook";
  if (hay.includes("instagram")) return "instagram";
  if (hay.includes("google") || hay.includes("gclid")) return "google";
  if (hay.includes("tiktok")) return "tiktok";
  return "direct";
};

const TRIGGER_COPY: Record<string, { title: string; subtitle: string }> = {
  exit: {
    title: "قبل ما تمشي 👋",
    subtitle: "سيب رقمك واحنا نبعتلك عرض السعر على واتساب — من غير ما تدوّر.",
  },
  scroll: {
    title: "شايف اللي بتدور عليه؟ ✨",
    subtitle: "سيب رقمك ونرجعلك بأفضل سعر للقطعة على واتساب خلال دقائق.",
  },
  idle: {
    title: "محتاج مساعدة في اختيار قطعة؟ 🚗",
    subtitle: "سيب رقم الواتساب وفريقنا هيرشّحلك الأنسب — مجاناً.",
  },
};

const SmartLeadTriggers = () => {
  const { pathname } = useLocation();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [trigger, setTrigger] = useState<"exit" | "scroll" | "idle">("exit");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const armedRef = useRef(true); // true = مسموح يطلق، false = اتطلق أو ممنوع

  // Block conditions: hidden routes / already submitted / logged in
  useEffect(() => {
    armedRef.current = true;
    if (HIDE_PATHS.some((p) => pathname.startsWith(p))) {
      armedRef.current = false;
      return;
    }
    try {
      if (
        localStorage.getItem(STORAGE_KEY) ||
        localStorage.getItem(HERO_SUBMITTED_KEY) ||
        localStorage.getItem(POPUP_SUBMITTED_KEY)
      ) {
        armedRef.current = false;
        return;
      }
    } catch {
      /* noop */
    }
    let cancelled = false;
    supabase.auth.getSession().then(({ data }) => {
      if (cancelled) return;
      if (data.session?.user) armedRef.current = false;
    });
    return () => {
      cancelled = true;
    };
  }, [pathname]);

  // Trigger setup
  useEffect(() => {
    if (HIDE_PATHS.some((p) => pathname.startsWith(p))) return;

    const mountedAt = Date.now();
    const fire = (which: "exit" | "scroll" | "idle") => {
      if (!armedRef.current) return;
      if (Date.now() - mountedAt < MIN_TIME_BEFORE_TRIGGER_MS) return;
      armedRef.current = false;
      setTrigger(which);
      setOpen(true);
    };

    // 1) Exit intent (desktop only — pointer leaving from top)
    const onMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && window.innerWidth >= 768) fire("exit");
    };
    document.addEventListener("mouseleave", onMouseLeave);

    // 2) Scroll depth
    const onScroll = () => {
      const docH = document.documentElement.scrollHeight - window.innerHeight;
      if (docH <= 0) return;
      const ratio = window.scrollY / docH;
      if (ratio >= SCROLL_THRESHOLD) fire("scroll");
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    // 3) Idle timer (resets on activity)
    let idleTimer: ReturnType<typeof setTimeout>;
    const resetIdle = () => {
      clearTimeout(idleTimer);
      idleTimer = setTimeout(() => fire("idle"), IDLE_MS);
    };
    const activityEvents = ["mousemove", "keydown", "touchstart", "scroll"];
    activityEvents.forEach((ev) => window.addEventListener(ev, resetIdle, { passive: true }));
    resetIdle();

    return () => {
      document.removeEventListener("mouseleave", onMouseLeave);
      window.removeEventListener("scroll", onScroll);
      activityEvents.forEach((ev) => window.removeEventListener(ev, resetIdle));
      clearTimeout(idleTimer);
    };
  }, [pathname]);

  const persist = (reason: "submitted" | "dismissed") => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ at: Date.now(), reason, trigger }));
    } catch {
      /* noop */
    }
  };

  const dismiss = () => {
    persist("dismissed");
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
    const { error } = await supabase.from("visitor_leads").upsert({
      phone: trimmed,
      source: detectSource(),
      first_path: pathname,
      referrer: typeof document !== "undefined" ? document.referrer : "",
      session_key: session_key || null,
    }, { onConflict: "phone", ignoreDuplicates: true });
    setSubmitting(false);
    if (error) {
      toast({ title: "حدث خطأ", description: "حاول مرة أخرى", variant: "destructive" });
      return;
    }
    try {
      sessionStorage.setItem("visitor_phone", trimmed);
      localStorage.setItem("visitor_phone", trimmed);
    } catch {
      /* noop */
    }
    toast({
      title: "تم استلام رقمك ✅",
      description: "هيتواصل معاك فريقنا على واتساب خلال دقائق",
    });
    persist("submitted");
    setOpen(false);
  };

  const copy = TRIGGER_COPY[trigger];

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ y: 120, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 120, opacity: 0 }}
          transition={{ type: "spring", damping: 24, stiffness: 260 }}
          className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 sm:left-auto sm:bottom-6 z-[95] sm:max-w-md"
          dir="rtl"
        >
          <div className="relative rounded-2xl border-2 border-primary/30 bg-card/95 backdrop-blur-xl shadow-2xl overflow-hidden">
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-accent to-primary" />
            <button
              onClick={dismiss}
              aria-label="إغلاق"
              className="absolute top-2.5 left-2.5 p-1.5 rounded-full hover:bg-muted transition-colors"
            >
              <X className="w-3.5 h-3.5 text-muted-foreground" />
            </button>
            <div className="p-4 pt-5 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center shrink-0">
                  <MessageCircle className="w-5 h-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0 pl-6">
                  <p className="font-bold text-foreground text-sm leading-snug">{copy.title}</p>
                  <p className="text-muted-foreground text-xs leading-relaxed mt-1">
                    {copy.subtitle}
                  </p>
                </div>
              </div>
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel"
                  placeholder="01xxxxxxxxx"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                  className="flex-1 h-10 text-center text-sm font-bold tracking-wider"
                  dir="ltr"
                  required
                />
                <Button
                  type="submit"
                  disabled={submitting || phone.length < 11}
                  size="sm"
                  className="h-10 px-3 gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground font-bold"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submitting ? "..." : "ابعت"}
                </Button>
              </form>
              <button
                onClick={dismiss}
                className="w-full text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                مش دلوقتي
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SmartLeadTriggers;
