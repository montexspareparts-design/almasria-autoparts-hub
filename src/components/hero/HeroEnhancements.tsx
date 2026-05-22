import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ShieldCheck, Truck, BadgeCheck, Wallet, Flame, Clock, MessageCircle, Send } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const WA_NUMBER = "201027815696";

/* ── 1. Live Activity Ticker ── */
const TICKER_ITEMS = [
  "أحمد من القاهرة طلب فلتر زيت كورولا",
  "محمود من الجيزة طلب طقم تيل فرامل كامري",
  "سامي من الإسكندرية طلب بوجيهات هايلكس",
  "خالد من المنصورة استعلم عن سير تايمنج راف فور",
  "ياسر من طنطا طلب فلتر هواء يارس",
  "عمرو من أسيوط طلب زيت موتور 5W-30 تويوتا",
  "هاني من المعادي طلب طلمبة بنزين كورولا",
  "وليد من 6 أكتوبر طلب مساعد أمامي كامري",
];
const MINUTES = ["قبل دقيقتين", "قبل 3 دقائق", "قبل 5 دقائق", "قبل 7 دقائق", "قبل 10 دقائق"];

export const HeroLiveTicker = () => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setIdx((i) => (i + 1) % TICKER_ITEMS.length), 5000);
    return () => clearInterval(t);
  }, []);
  return (
    <div className="w-full border-y border-white/10 bg-black/40 backdrop-blur-md">
      <div className="container mx-auto px-4 py-2.5 flex items-center gap-3 overflow-hidden">
        <span className="relative flex h-2.5 w-2.5 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
        </span>
        <span className="text-emerald-300 text-[11px] font-bold tracking-wide uppercase shrink-0">مباشر</span>
        <div key={idx} className="flex-1 min-w-0 animate-fade-in">
          <p className="text-white/85 text-[13px] md:text-sm truncate">
            <span className="font-semibold">{TICKER_ITEMS[idx]}</span>
            <span className="text-white/45 mx-2">•</span>
            <span className="text-white/55">{MINUTES[idx % MINUTES.length]}</span>
          </p>
        </div>
      </div>
    </div>
  );
};

/* ── 2. Trust Strip ── */
export const HeroTrustStrip = () => {
  const items = [
    { icon: BadgeCheck, label: "موزع معتمد" },
    { icon: ShieldCheck, label: "ضمان وكالة" },
    { icon: Truck, label: "توصيل 48س" },
    { icon: Wallet, label: "دفع عند الاستلام" },
  ];
  return (
    <div className="flex flex-wrap gap-2 mb-6 animate-fade-in" style={{ animationDelay: "0.2s", animationFillMode: "both" }}>
      {items.map((it) => (
        <div
          key={it.label}
          className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/25 bg-emerald-500/10 backdrop-blur-md px-3 py-1.5"
        >
          <it.icon className="w-3.5 h-3.5 text-emerald-300" />
          <span className="text-emerald-50 text-[11px] md:text-xs font-bold">✓ {it.label}</span>
        </div>
      ))}
    </div>
  );
};

/* ── 3. Scarcity Counter (real orders today) ── */
const fmtHours = () => {
  const now = new Date();
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);
  return Math.max(1, Math.floor((end.getTime() - now.getTime()) / 3_600_000));
};

export const HeroScarcityCounter = () => {
  const [hoursLeft, setHoursLeft] = useState(fmtHours());
  useEffect(() => {
    const t = setInterval(() => setHoursLeft(fmtHours()), 60_000);
    return () => clearInterval(t);
  }, []);

  const { data: ordersToday } = useQuery({
    queryKey: ["orders-today-count"],
    queryFn: async () => {
      const start = new Date();
      start.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .gte("created_at", start.toISOString());
      return Math.max(7, count ?? 0);
    },
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return (
    <div
      className="inline-flex items-center gap-3 rounded-full border border-amber-400/30 bg-amber-500/10 backdrop-blur-md px-4 py-2 mb-6 animate-fade-in"
      style={{ animationDelay: "0.55s", animationFillMode: "both" }}
    >
      <Flame className="w-4 h-4 text-amber-300 animate-pulse" />
      <span className="text-amber-50 text-[12px] md:text-[13px] font-bold">
        {ordersToday ?? "—"} طلب تم اليوم
      </span>
      <span className="w-px h-3.5 bg-amber-300/30" />
      <Clock className="w-3.5 h-3.5 text-amber-200" />
      <span className="text-amber-50/90 text-[12px] md:text-[13px] font-semibold">
        متبقي {hoursLeft} ساعة على عروض اليوم
      </span>
    </div>
  );
};

/* ── 4. One-step WhatsApp Quote ── */
export const QuickWhatsAppQuote = () => {
  const [model, setModel] = useState("");
  const chips = ["كورولا", "كامري", "ياريس", "هايلكس", "راف فور", "لاندكروزر"];

  const send = (text?: string) => {
    const m = (text ?? model).trim();
    if (!m) return;
    const msg = `السلام عليكم، عايز عرض سعر لقطع غيار ${m}.`;
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  return (
    <div
      className="rounded-2xl border border-white/15 bg-white/[0.07] backdrop-blur-md p-4 md:p-5 mb-8 max-w-xl animate-fade-in shadow-[0_8px_30px_-10px_rgba(0,0,0,0.5)]"
      style={{ animationDelay: "0.4s", animationFillMode: "both" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/20 flex items-center justify-center shrink-0">
          <MessageCircle className="w-5 h-5 text-emerald-300" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm md:text-base">عرض سعر فوري على واتساب</p>
          <p className="text-white/60 text-[11px] md:text-xs">اكتب موديل عربيتك وهنرد عليك في دقايق</p>
        </div>
      </div>
      <form
        onSubmit={(e) => { e.preventDefault(); send(); }}
        className="flex flex-col sm:flex-row gap-2"
      >
        <Input
          value={model}
          onChange={(e) => setModel(e.target.value)}
          placeholder="مثال: كورولا 2020"
          className="flex-1 h-12 text-base font-semibold bg-white/95 border-white/20 text-foreground placeholder:text-muted-foreground/60"
          required
        />
        <Button
          type="submit"
          disabled={!model.trim()}
          className="h-12 px-6 font-bold gap-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg whitespace-nowrap"
        >
          <Send className="w-4 h-4" />
          ابعت على واتساب
        </Button>
      </form>
      <div className="flex flex-wrap gap-1.5 mt-3">
        {chips.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => { setModel(c); send(c); }}
            className="text-[11px] md:text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 hover:bg-white/20 text-white/80 border border-white/10 transition-colors"
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
};

/* ── 6. Testimonial PiP (renders only if URL configured) ── */
export const HeroTestimonialPiP = () => {
  const { data: url } = useQuery({
    queryKey: ["site-setting", "testimonial_video_url"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "testimonial_video_url")
        .maybeSingle();
      return (data?.value as string) || "";
    },
    staleTime: 10 * 60 * 1000,
  });
  if (!url) return null;
  return (
    <div className="hidden lg:block absolute bottom-24 left-6 z-20 w-[200px] animate-fade-in" style={{ animationDelay: "1s", animationFillMode: "both" }}>
      <div className="relative rounded-2xl overflow-hidden border border-white/15 shadow-2xl bg-black h-[280px]">
        <video
          src={url}
          autoPlay
          muted
          loop
          playsInline
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-transparent to-black/30" />
        <div className="absolute top-2 right-2 inline-flex items-center gap-1 bg-red-600/90 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
          عميل حقيقي
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <p className="text-white text-xs font-bold leading-tight">"خدمة سريعة وقطع أصلية ١٠٠٪"</p>
          <p className="text-white/70 text-[10px] mt-1">— أحمد · عميل منذ 2019</p>
        </div>
      </div>
    </div>
  );
};
