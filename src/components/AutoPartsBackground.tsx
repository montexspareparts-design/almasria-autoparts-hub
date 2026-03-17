import { useMemo } from "react";

/**
 * Animated car parts background — pure CSS for performance.
 * Renders SVG shapes: gears, pistons, spark plugs, oil drops, bearings, wrenches.
 */

type PartType = "gear" | "piston" | "spark" | "oil" | "bearing" | "wrench";

interface Part {
  id: number;
  type: PartType;
  x: number;
  y: number;
  size: number;
  duration: number;
  delay: number;
  rotation: number;
}

const PART_TYPES: PartType[] = ["gear", "piston", "spark", "oil", "bearing", "wrench"];

const GearSVG = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className="text-white/[0.06]">
    <path d="M32 22a10 10 0 100 20 10 10 0 000-20zm0 16a6 6 0 110-12 6 6 0 010 12z" fill="currentColor" />
    <path d="M56 28h-4.1a20.1 20.1 0 00-2.4-5.7l2.9-2.9-5.7-5.7-2.9 2.9A20.1 20.1 0 0038 14.1V10h-8v4.1a20.1 20.1 0 00-5.7 2.4l-2.9-2.9-5.7 5.7 2.9 2.9A20.1 20.1 0 0016.1 28H12v8h4.1a20.1 20.1 0 002.4 5.7l-2.9 2.9 5.7 5.7 2.9-2.9a20.1 20.1 0 005.7 2.4V54h8v-4.1a20.1 20.1 0 005.7-2.4l2.9 2.9 5.7-5.7-2.9-2.9a20.1 20.1 0 002.4-5.7H56v-8z" fill="currentColor" />
  </svg>
);

const PistonSVG = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 48 64" fill="none" className="text-white/[0.05]">
    <rect x="8" y="4" width="32" height="20" rx="4" fill="currentColor" />
    <rect x="12" y="24" width="24" height="4" fill="currentColor" />
    <rect x="20" y="28" width="8" height="20" fill="currentColor" />
    <rect x="14" y="48" width="20" height="12" rx="2" fill="currentColor" />
  </svg>
);

const SparkPlugSVG = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 32 64" fill="none" className="text-white/[0.05]">
    <rect x="12" y="0" width="8" height="24" rx="2" fill="currentColor" />
    <rect x="8" y="24" width="16" height="6" rx="1" fill="currentColor" />
    <rect x="10" y="30" width="12" height="4" fill="currentColor" />
    <rect x="10" y="36" width="12" height="4" fill="currentColor" />
    <path d="M14 42h4v12l-6 8h4l-6 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const OilDropSVG = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 40 56" fill="none" className="text-primary/[0.08]">
    <path d="M20 4C20 4 4 24 4 36a16 16 0 0032 0C36 24 20 4 20 4z" fill="currentColor" />
  </svg>
);

const BearingSVG = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className="text-white/[0.05]">
    <circle cx="32" cy="32" r="28" stroke="currentColor" strokeWidth="3" />
    <circle cx="32" cy="32" r="16" stroke="currentColor" strokeWidth="3" />
    <circle cx="32" cy="32" r="6" fill="currentColor" />
    {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
      const rad = (angle * Math.PI) / 180;
      const cx = 32 + 22 * Math.cos(rad);
      const cy = 32 + 22 * Math.sin(rad);
      return <circle key={angle} cx={cx} cy={cy} r="4" fill="currentColor" />;
    })}
  </svg>
);

const WrenchSVG = ({ size }: { size: number }) => (
  <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className="text-white/[0.05]">
    <path d="M50 8a14 14 0 00-18.5 18.5L14 44l6 6 17.5-17.5A14 14 0 0050 8zm-4 12a6 6 0 11-8.5-8.5 6 6 0 018.5 8.5z" fill="currentColor" />
  </svg>
);

const partComponents: Record<PartType, React.FC<{ size: number }>> = {
  gear: GearSVG,
  piston: PistonSVG,
  spark: SparkPlugSVG,
  oil: OilDropSVG,
  bearing: BearingSVG,
  wrench: WrenchSVG,
};

const AutoPartsBackground = ({ count = 18 }: { count?: number }) => {
  const parts = useMemo<Part[]>(
    () =>
      Array.from({ length: count }, (_, i) => ({
        id: i,
        type: PART_TYPES[i % PART_TYPES.length],
        x: Math.random() * 95,
        y: Math.random() * 95,
        size: 30 + Math.random() * 50,
        duration: 18 + Math.random() * 25,
        delay: -(Math.random() * 20),
        rotation: Math.random() * 360,
      })),
    [count]
  );

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
      {parts.map((p) => {
        const Component = partComponents[p.type];
        return (
          <div
            key={p.id}
            className="absolute animate-auto-part"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              animationDuration: `${p.duration}s`,
              animationDelay: `${p.delay}s`,
              transform: `rotate(${p.rotation}deg)`,
            }}
          >
            <Component size={p.size} />
          </div>
        );
      })}
    </div>
  );
};

export default AutoPartsBackground;
