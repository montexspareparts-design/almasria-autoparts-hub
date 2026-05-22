import { useEffect, useState } from "react";
import { MessageCircle, X, Gift } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const KEY = "exit_intent_popup_v1";
const WA_NUMBER = "201027815696";

const ExitIntentPopup = () => {
  const [open, setOpen] = useState(false);
  const [model, setModel] = useState("");

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (sessionStorage.getItem(KEY) || localStorage.getItem(KEY)) return;
    } catch { /* noop */ }

    let armed = false;
    const armTimer = setTimeout(() => { armed = true; }, 10_000); // arm after 10s on page

    const onLeave = (e: MouseEvent) => {
      if (!armed) return;
      if (e.clientY <= 0 && (e.relatedTarget == null || (e as any).toElement == null)) {
        setOpen(true);
        try { sessionStorage.setItem(KEY, "1"); } catch { /* noop */ }
        document.removeEventListener("mouseout", onLeave);
      }
    };
    document.addEventListener("mouseout", onLeave);
    return () => {
      clearTimeout(armTimer);
      document.removeEventListener("mouseout", onLeave);
    };
  }, []);

  const send = () => {
    const m = model.trim();
    const msg = m
      ? `السلام عليكم، عايز عرض سعر لقطع غيار ${m}.`
      : `السلام عليكم، عايز عرض سعر لقطع غيار عربيتي.`;
    try { localStorage.setItem(KEY, "1"); } catch { /* noop */ }
    window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, "_blank");
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in"
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md rounded-3xl bg-gradient-to-br from-[#0a1840] to-[#1a2e6e] border border-amber-400/30 shadow-2xl p-6 md:p-8 animate-scale-in"
      >
        <button
          onClick={() => setOpen(false)}
          className="absolute top-3 left-3 w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white/80"
          aria-label="إغلاق"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-400/20 flex items-center justify-center">
            <Gift className="w-6 h-6 text-amber-300" />
          </div>
          <div>
            <p className="text-amber-300 text-[11px] font-bold tracking-wider uppercase">عرض خاص</p>
            <h3 className="text-white text-xl md:text-2xl font-black leading-tight">استنى! متمشيش من غير عرض السعر</h3>
          </div>
        </div>

        <p className="text-white/80 text-sm md:text-base mb-5 leading-relaxed">
          ابعت موديل عربيتك دلوقتي على واتساب واحنا نبعتلك أفضل سعر للقطع الأصلية في خلال
          <span className="text-amber-300 font-bold"> 10 دقايق</span>.
        </p>

        <div className="space-y-2.5">
          <Input
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder="مثال: كورولا 2020"
            className="h-12 text-base font-semibold bg-white text-foreground"
          />
          <Button
            onClick={send}
            className="w-full h-12 text-base font-bold gap-2 bg-emerald-500 hover:bg-emerald-600 text-white shadow-lg"
          >
            <MessageCircle className="w-5 h-5" />
            ابعت على واتساب الآن
          </Button>
        </div>

        <p className="text-center text-white/50 text-[11px] mt-4">
          ✓ رد فوري · ✓ عرض سعر مكتوب · ✓ بدون التزام
        </p>
      </div>
    </div>
  );
};

export default ExitIntentPopup;
