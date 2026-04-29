import { useEffect, useRef, useState, memo } from "react";

interface AnimatedPriceProps {
  value: number;
  duration?: number; // ms
  className?: string;
  currencyClassName?: string;
  currency?: string;
  /** When true, shows a "flip" effect for changing digits instead of count-up */
  flip?: boolean;
}

/**
 * AnimatedPrice — combines 3 effects:
 * 1) Count-up: animates from 0 → value using requestAnimationFrame (eased)
 * 2) Number flip: each digit flips like an airport board when value changes
 * 3) Highlight glow: red shimmer pulse on reveal
 *
 * Respects prefers-reduced-motion.
 */
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

const AnimatedPrice = memo(function AnimatedPrice({
  value,
  duration = 900,
  className = "",
  currencyClassName = "",
  currency = "ج.م",
  flip = false,
}: AnimatedPriceProps) {
  const [display, setDisplay] = useState(0);
  const [glow, setGlow] = useState(false);
  const rafRef = useRef<number | null>(null);
  const prevValueRef = useRef<number>(0);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;

    // Trigger glow
    setGlow(false);
    const glowTimer = setTimeout(() => setGlow(true), 20);
    const glowOff = setTimeout(() => setGlow(false), 1200);

    if (reduced || value === 0) {
      setDisplay(value);
      prevValueRef.current = value;
      return () => {
        clearTimeout(glowTimer);
        clearTimeout(glowOff);
      };
    }

    const start = performance.now();
    const from = prevValueRef.current;
    const to = value;
    const delta = to - from;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / duration);
      const eased = easeOutCubic(t);
      const current = Math.round(from + delta * eased);
      setDisplay(current);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevValueRef.current = to;
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      clearTimeout(glowTimer);
      clearTimeout(glowOff);
    };
  }, [value, duration]);

  const formatted = display.toLocaleString("ar-EG");

  return (
    <span
      className={`relative inline-flex items-baseline gap-1 ${className} ${
        glow ? "price-glow-active" : ""
      }`}
    >
      {flip ? (
        <span className="inline-flex items-baseline" aria-label={String(value)}>
          {formatted.split("").map((ch, i) => (
            <FlipDigit key={`${i}-${ch}`} char={ch} />
          ))}
        </span>
      ) : (
        <span aria-label={String(value)}>{formatted}</span>
      )}
      <span className={currencyClassName}>{currency}</span>
    </span>
  );
});

const FlipDigit = memo(function FlipDigit({ char }: { char: string }) {
  // Non-digit chars (separator/comma) — no flip
  if (!/[\u0660-\u0669\d]/.test(char)) {
    return <span className="inline-block">{char}</span>;
  }
  return (
    <span
      key={char}
      className="inline-block animate-digit-flip will-change-transform"
      style={{ transformOrigin: "50% 50%" }}
    >
      {char}
    </span>
  );
});

export default AnimatedPrice;
