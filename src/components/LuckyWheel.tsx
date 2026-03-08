import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Gift, RotateCcw, Sparkles, PartyPopper } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

const SEGMENTS = [
  { label: "خصم 5%", color: "hsl(355, 90%, 48%)", emoji: "🎉" },
  { label: "شحن مجاني", color: "hsl(210, 11%, 20%)", emoji: "🚚" },
  { label: "حظ أوفر", color: "hsl(355, 70%, 58%)", emoji: "😅" },
  { label: "خصم 10%", color: "hsl(40, 80%, 50%)", emoji: "🔥" },
  { label: "هدية مفاجأة", color: "hsl(210, 11%, 30%)", emoji: "🎁" },
  { label: "خصم 3%", color: "hsl(355, 90%, 42%)", emoji: "✨" },
  { label: "كوبون VIP", color: "hsl(280, 60%, 45%)", emoji: "👑" },
  { label: "حاول مرة تانية", color: "hsl(210, 11%, 25%)", emoji: "🔄" },
];

const SEGMENT_ANGLE = 360 / SEGMENTS.length;

const LuckyWheel = () => {
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<string | null>(null);
  const [resultEmoji, setResultEmoji] = useState("");
  const [hasSpun, setHasSpun] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const drawWheel = useCallback((canvas: HTMLCanvasElement) => {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const size = canvas.width;
    const center = size / 2;
    const radius = center - 8;

    ctx.clearRect(0, 0, size, size);

    // Draw segments
    SEGMENTS.forEach((seg, i) => {
      const startAngle = (i * SEGMENT_ANGLE - 90) * (Math.PI / 180);
      const endAngle = ((i + 1) * SEGMENT_ANGLE - 90) * (Math.PI / 180);

      ctx.beginPath();
      ctx.moveTo(center, center);
      ctx.arc(center, center, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();

      // Border between segments
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Text
      ctx.save();
      ctx.translate(center, center);
      ctx.rotate(startAngle + (SEGMENT_ANGLE * Math.PI) / 360);
      ctx.fillStyle = "#fff";
      ctx.font = `bold ${size * 0.04}px Cairo, sans-serif`;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillText(seg.emoji, radius * 0.55, 0);
      ctx.font = `bold ${size * 0.035}px Cairo, sans-serif`;
      ctx.fillText(seg.label, radius * 0.75, 0);
      ctx.restore();
    });

    // Center circle
    ctx.beginPath();
    ctx.arc(center, center, radius * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = "hsl(355, 90%, 48%)";
    ctx.fill();
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 3;
    ctx.stroke();

    // Center text
    ctx.fillStyle = "#fff";
    ctx.font = `bold ${size * 0.04}px Cairo, sans-serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("🎯", center, center);
  }, []);

  const canvasRefCallback = useCallback(
    (node: HTMLCanvasElement | null) => {
      if (node) {
        const dpr = window.devicePixelRatio || 1;
        const displaySize = node.getBoundingClientRect().width || 280;
        node.width = displaySize * dpr;
        node.height = displaySize * dpr;
        const ctx = node.getContext("2d");
        if (ctx) ctx.scale(dpr, dpr);
        // Reset scale for drawing
        node.width = displaySize;
        node.height = displaySize;
        drawWheel(node);
        (canvasRef as any).current = node;
      }
    },
    [drawWheel]
  );

  const spin = () => {
    if (spinning) return;
    setSpinning(true);
    setResult(null);

    const winIndex = Math.floor(Math.random() * SEGMENTS.length);
    // Calculate rotation to land on winning segment
    const targetAngle = 360 - winIndex * SEGMENT_ANGLE - SEGMENT_ANGLE / 2;
    const totalRotation = rotation + 1440 + targetAngle; // 4 full spins + target

    setRotation(totalRotation);

    setTimeout(() => {
      setSpinning(false);
      setResult(SEGMENTS[winIndex].label);
      setResultEmoji(SEGMENTS[winIndex].emoji);
      setHasSpun(true);

      if (SEGMENTS[winIndex].label === "حظ أوفر" || SEGMENTS[winIndex].label === "حاول مرة تانية") {
        toast("حظ أوفر المرة الجاية! 😄", { icon: "🍀" });
      } else {
        toast.success(`مبروك! كسبت ${SEGMENTS[winIndex].label} ${SEGMENTS[winIndex].emoji}`, {
          description: "تواصل معنا عبر الواتساب لاستلام جائزتك!",
        });
      }
    }, 4000);
  };

  const reset = () => {
    setResult(null);
    setHasSpun(false);
    setRotation(0);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: 0.2, duration: 0.6 }}
      className="bg-card border border-border rounded-xl p-6 text-center relative overflow-hidden"
    >
      {/* Background decoration */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 pointer-events-none" />

      <div className="relative z-10">
        <motion.div
          className="flex items-center justify-center gap-2 mb-4"
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          <Sparkles className="w-5 h-5 text-primary" />
          <h3 className="text-xl font-black text-foreground">جرّب حظك! 🎰</h3>
          <Sparkles className="w-5 h-5 text-primary" />
        </motion.div>

        <p className="text-sm text-muted-foreground mb-5">
          لف العجلة واكسب خصم أو هدية على طلبك القادم
        </p>

        {/* Wheel container */}
        <div className="relative mx-auto w-[280px] h-[280px] mb-5">
          {/* Pointer/Arrow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-20">
            <div className="w-0 h-0 border-l-[12px] border-r-[12px] border-t-[20px] border-l-transparent border-r-transparent border-t-primary drop-shadow-lg" />
          </div>

          {/* Spinning wheel */}
          <motion.div
            animate={{ rotate: rotation }}
            transition={{
              duration: 4,
              ease: [0.2, 0.8, 0.3, 1],
            }}
            className="w-full h-full"
          >
            <canvas
              ref={canvasRefCallback}
              className="w-full h-full rounded-full shadow-[0_0_30px_hsl(355_90%_48%/0.2)]"
              style={{ width: 280, height: 280 }}
            />
          </motion.div>

          {/* Glow effect while spinning */}
          <AnimatePresence>
            {spinning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 rounded-full"
                style={{
                  boxShadow: "0 0 60px hsl(355 90% 48% / 0.4), 0 0 120px hsl(355 90% 48% / 0.15)",
                }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Result */}
        <AnimatePresence>
          {result && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-4 p-3 rounded-lg bg-primary/10 border border-primary/20"
            >
              <div className="flex items-center justify-center gap-2">
                <PartyPopper className="w-5 h-5 text-primary" />
                <span className="text-lg font-bold text-foreground">
                  {resultEmoji} {result}
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Buttons */}
        <div className="flex gap-3 justify-center">
          {!hasSpun ? (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button
                onClick={spin}
                disabled={spinning}
                size="lg"
                className="gap-2 red-glow font-bold text-base"
              >
                <Gift className="w-5 h-5" />
                {spinning ? "العجلة بتلف... 🎡" : "لف العجلة!"}
              </Button>
            </motion.div>
          ) : (
            <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
              <Button onClick={reset} variant="outline" size="lg" className="gap-2">
                <RotateCcw className="w-4 h-4" />
                جرب تاني
              </Button>
            </motion.div>
          )}
        </div>

        <p className="text-xs text-muted-foreground mt-4">
          * تواصل معنا عبر الواتساب لتفعيل جائزتك
        </p>
      </div>
    </motion.div>
  );
};

export default LuckyWheel;
