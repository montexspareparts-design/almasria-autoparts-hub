import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Camera, X } from "lucide-react";
import VINScannerDialog from "@/components/VINScannerDialog";

const POPULAR = ["كورولا", "كامري", "ياريس", "هايلكس", "راف فور", "لاندكروزر"];
const SUGGESTIONS = [
  "فلتر زيت كورولا 2020",
  "تيل فرامل كامري",
  "بوجيهات هايلكس",
  "سير تايمنج راف فور",
  "زيت موتور 5W-30",
  "فلتر هواء يارس",
];

const StickyHeroSearch = () => {
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [q, setQ] = useState("");
  const [focused, setFocused] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 200);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const go = (term: string) => {
    const t = term.trim();
    if (!t) return;
    navigate(`/products?search=${encodeURIComponent(t)}`);
  };

  if (dismissed || !visible) return null;

  const filtered = q.trim()
    ? SUGGESTIONS.filter((s) => s.includes(q.trim())).slice(0, 5)
    : SUGGESTIONS.slice(0, 5);

  return (
    <div className="fixed top-[68px] left-0 right-0 z-40 px-3 animate-fade-in">
      <div className="container mx-auto">
        <div className="relative rounded-2xl border border-white/15 bg-black/75 backdrop-blur-xl shadow-2xl p-2.5 flex items-center gap-2">
          <Search className="w-5 h-5 text-white/70 ms-2 shrink-0" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setTimeout(() => setFocused(false), 150)}
            onKeyDown={(e) => e.key === "Enter" && go(q)}
            placeholder="ابحث برقم الشاسيه VIN أو اسم القطعة..."
            className="flex-1 bg-transparent text-white placeholder:text-white/40 text-sm md:text-base font-medium outline-none min-w-0"
          />
          <div className="hidden md:flex items-center gap-1 shrink-0">
            {POPULAR.slice(0, 4).map((m) => (
              <button
                key={m}
                onClick={() => go(m)}
                className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-white/10 hover:bg-primary/30 text-white/80 border border-white/10 transition-colors"
              >
                {m}
              </button>
            ))}
          </div>
          <VINScannerDialog onProductFound={(s) => go(s)} />
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="w-8 h-8 rounded-full hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white shrink-0"
            aria-label="إغلاق"
          >
            <X className="w-4 h-4" />
          </button>

          {focused && filtered.length > 0 && (
            <div className="absolute top-full left-2 right-2 mt-2 rounded-xl border border-white/15 bg-black/95 backdrop-blur-xl shadow-2xl overflow-hidden animate-fade-in">
              {filtered.map((s) => (
                <button
                  key={s}
                  onMouseDown={() => go(s)}
                  className="w-full text-start px-4 py-2.5 text-white/85 text-sm hover:bg-white/10 flex items-center gap-2 border-b border-white/5 last:border-0"
                >
                  <Search className="w-3.5 h-3.5 text-white/40" />
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StickyHeroSearch;
