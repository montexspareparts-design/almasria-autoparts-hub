import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { MessageCircle, Sparkles, Send, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

const SUBMITTED_KEY = "hero_lead_capture_submitted_v1";

const detectSource = (): string => {
  if (typeof window === "undefined") return "direct";
  const params = new URLSearchParams(window.location.search);
  const ref = (document.referrer || "").toLowerCase();
  const utm = (params.get("utm_source") || "").toLowerCase();
  const hay = `${ref} ${utm} ${window.location.search.toLowerCase()}`;
  if (hay.includes("whatsapp") || utm === "wa" || params.get("ref") === "wa") return "whatsapp";
  if (hay.includes("fbclid") || hay.includes("facebook") || utm.includes("fb")) return "facebook";
  if (hay.includes("instagram") || utm.includes("ig")) return "instagram";
  if (hay.includes("gclid") || hay.includes("google") || utm.includes("google")) return "google";
  if (hay.includes("tiktok")) return "tiktok";
  return "direct";
};

const HeroLeadCapture = () => {
  const { pathname } = useLocation();
  const { toast } = useToast();
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  // Auto-fill phone from UTM/query (e.g. WhatsApp campaign: ?ref=wa&phone=01...)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      // Check if already submitted
      if (localStorage.getItem(SUBMITTED_KEY)) {
        setDone(true);
        return;
      }
      const params = new URLSearchParams(window.location.search);
      const raw = params.get("phone") || params.get("wa_phone") || "";
      const digits = raw.replace(/\D/g, "");
      // Normalize to 11-digit Egyptian format
      let normalized = digits;
      if (normalized.startsWith("0020")) normalized = "0" + normalized.slice(4);
      else if (normalized.startsWith("20") && normalized.length === 12) normalized = "0" + normalized.slice(2);
      else if (normalized.length === 10 && normalized.startsWith("1")) normalized = "0" + normalized;
      if (/^01[0-9]{9}$/.test(normalized)) {
        setPhone(normalized);
        // Auto-submit silently for trusted WhatsApp campaign links
        if (params.get("ref") === "wa" || params.get("utm_source") === "wa" || params.get("utm_source") === "whatsapp") {
          autoSubmitFromUTM(normalized);
        }
      }
    } catch {
      /* noop */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const persistSession = (phoneVal: string) => {
    try {
      sessionStorage.setItem("visitor_phone", phoneVal);
      localStorage.setItem("visitor_phone", phoneVal);
    } catch {
      /* noop */
    }
  };

  const autoSubmitFromUTM = async (phoneVal: string) => {
    let session_key = "";
    try {
      session_key = sessionStorage.getItem("visitor_session_key") || localStorage.getItem("visitor_session_key") || "";
    } catch {
      /* noop */
    }
    const { error } = await supabase.from("visitor_leads").upsert({
      phone: phoneVal,
      source: "whatsapp",
      first_path: pathname,
      referrer: typeof document !== "undefined" ? document.referrer : "",
      session_key: session_key || null,
    }, { onConflict: "phone", ignoreDuplicates: true });
    if (!error) {
      try {
        localStorage.setItem(SUBMITTED_KEY, JSON.stringify({ at: Date.now(), via: "utm" }));
      } catch {
        /* noop */
      }
      persistSession(phoneVal);
      setDone(true);
    }
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
      session_key = sessionStorage.getItem("visitor_session_key") || localStorage.getItem("visitor_session_key") || "";
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
      toast({ title: "حدث خطأ", description: "حاول مرة أخرى بعد قليل", variant: "destructive" });
      return;
    }
    try {
      localStorage.setItem(SUBMITTED_KEY, JSON.stringify({ at: Date.now(), via: "hero" }));
    } catch {
      /* noop */
    }
    persistSession(trimmed);
    setDone(true);
    toast({
      title: "تم استلام رقمك ✅",
      description: "هيتواصل معاك فريقنا خلال دقائق على واتساب",
    });
  };

  if (done) {
    return (
      <div className="inline-flex items-center gap-2.5 rounded-2xl border border-emerald-400/30 bg-emerald-500/10 backdrop-blur-md px-4 py-3 mb-8 text-emerald-50 max-w-lg animate-fade-in">
        <CheckCircle2 className="w-5 h-5 text-emerald-300 shrink-0" />
        <p className="text-sm font-semibold">
          تم استلام رقمك — هيتواصل معاك فريقنا على واتساب بعرض السعر.
        </p>
      </div>
    );
  }

  return (
    <div
      className="rounded-2xl border border-white/15 bg-white/[0.07] backdrop-blur-md p-4 md:p-5 mb-8 max-w-lg animate-fade-in shadow-[0_8px_30px_-10px_rgba(0,0,0,0.5)]"
      style={{ animationDelay: "0.4s", animationFillMode: "both" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-xl bg-primary/20 flex items-center justify-center shrink-0">
          <MessageCircle className="w-5 h-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm md:text-base flex items-center gap-1.5">
            احصل على عرض سعر فوري
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          </p>
          <p className="text-white/60 text-[11px] md:text-xs">
            سيب رقم الواتساب، فريقنا هيرد عليك خلال دقائق
          </p>
        </div>
      </div>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
        <Input
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="01xxxxxxxxx"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
          className="flex-1 h-11 text-center sm:text-start text-base font-bold tracking-wider bg-white/95 border-white/20 text-foreground placeholder:text-muted-foreground/60"
          dir="ltr"
          required
        />
        <Button
          type="submit"
          disabled={submitting || phone.length < 11}
          className="h-11 px-5 font-bold gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg whitespace-nowrap"
        >
          <Send className="w-4 h-4" />
          {submitting ? "جاري الإرسال..." : "ابعتلي عرض"}
        </Button>
      </form>
    </div>
  );
};

export default HeroLeadCapture;
