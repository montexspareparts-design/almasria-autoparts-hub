import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Img,
  staticFile,
  Sequence,
  spring,
} from "remotion";

/* ─────────────────── CREATIVE DIRECTION ───────────────────
   Style: Luxury Cinematic — dark, warm, editorial
   Palette: Near-black #080810, Deep navy #0c1225, Red accent #dc2626, Gold #c9a84c
   Motion: Slow reveals with spring physics, parallax Ken Burns, split-wipe transitions
   Typography: Bold condensed uppercase, wide letter-spacing
   Motifs: Red accent lines, gold shimmer, dramatic vignettes
───────────────────────────────────────────────────────────── */

/* ── Scene Data ── */
const scenes = [
  // 1. Opening — dramatic parts close-up
  { src: "images/v2-parts-hero.jpg", dur: 90, zoom: { from: 1.15, to: 1 }, pan: { xFrom: 30, xTo: -10, yFrom: -10, yTo: 5 },
    text: { title: "GENUINE PARTS", sub: "100% Original Toyota Quality", pos: "bottom-left" as const } },
  // 2. Mechanic at work
  { src: "images/v2-mechanic.jpg", dur: 75, zoom: { from: 1, to: 1.12 }, pan: { xFrom: -15, xTo: 20, yFrom: 5, yTo: -8 },
    text: { title: "EXPERT SERVICE", sub: "Trusted by 5,000+ Workshops", pos: "bottom-right" as const } },
  // 3. Warehouse scale
  { src: "images/v2-warehouse.jpg", dur: 80, zoom: { from: 1, to: 1.16 }, pan: { xFrom: 20, xTo: -25, yFrom: 0, yTo: -12 },
    text: { title: "MASSIVE INVENTORY", sub: "10,000+ Parts Ready to Ship", pos: "center" as const } },
  // 4. Oils product shot
  { src: "images/v2-oils.jpg", dur: 70, zoom: { from: 1.08, to: 1 }, pan: { xFrom: -10, xTo: 15, yFrom: -5, yTo: 5 },
    text: { title: "PREMIUM OILS", sub: "Genuine Toyota Motor Oil", pos: "bottom-left" as const } },
  // 5. Land Cruiser driving
  { src: "images/v2-landcruiser.jpg", dur: 85, zoom: { from: 1, to: 1.14 }, pan: { xFrom: 25, xTo: -20, yFrom: 5, yTo: -10 },
    text: { title: "BUILT FOR EGYPT", sub: "Performance You Can Trust", pos: "bottom-left" as const } },
  // 6. Distribution fleet
  { src: "images/v2-distribution.jpg", dur: 80, zoom: { from: 1.1, to: 1 }, pan: { xFrom: -15, xTo: 10, yFrom: -8, yTo: 8 },
    text: { title: "NATIONWIDE DELIVERY", sub: "From Our Warehouse to Your Door", pos: "center" as const } },
];

const CROSSFADE = 18;

/* ── Wipe Transition Overlay ── */
const WipeTransition = ({ progress }: { progress: number }) => {
  if (progress <= 0 || progress >= 1) return null;
  const x = interpolate(progress, [0, 1], [0, 100]);
  return (
    <div style={{
      position: "absolute", inset: 0, zIndex: 30,
      background: `linear-gradient(to right, transparent ${x - 5}%, #dc2626 ${x}%, transparent ${x + 2}%)`,
      opacity: interpolate(progress, [0, 0.3, 0.7, 1], [0, 0.8, 0.8, 0]),
    }} />
  );
};

/* ── Single Shot with Ken Burns + Text ── */
const Shot = ({ scene, shotIndex }: { scene: typeof scenes[0]; shotIndex: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = scene.dur;

  // Ken Burns
  const scale = interpolate(frame, [0, dur], [scene.zoom.from, scene.zoom.to], { extrapolateRight: "clamp" });
  const x = interpolate(frame, [0, dur], [scene.pan.xFrom, scene.pan.xTo], { extrapolateRight: "clamp" });
  const y = interpolate(frame, [0, dur], [scene.pan.yFrom, scene.pan.yTo], { extrapolateRight: "clamp" });

  // Fade in/out
  const opacity = interpolate(frame, [0, CROSSFADE, dur - CROSSFADE, dur], [0, 1, 1, 0], { extrapolateRight: "clamp" });

  // Wipe transition at beginning
  const wipeProgress = interpolate(frame, [0, CROSSFADE + 5], [0, 1], { extrapolateRight: "clamp" });

  // Text animations — staggered spring
  const lineSpring = spring({ frame: frame - 12, fps, config: { damping: 200 } });
  const titleSpring = spring({ frame: frame - 18, fps, config: { damping: 18, stiffness: 150 } });
  const subSpring = spring({ frame: frame - 30, fps, config: { damping: 200 } });

  // Gold shimmer line
  const shimmerX = interpolate(frame, [15, dur - 15], [-100, 200], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  const textAlign = scene.text.pos === "center" ? "center" : scene.text.pos === "bottom-right" ? "right" : "left";
  const textStyle: React.CSSProperties = scene.text.pos === "center"
    ? { position: "absolute", bottom: 180, left: 0, right: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 14 }
    : scene.text.pos === "bottom-right"
    ? { position: "absolute", bottom: 150, right: 120, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 14 }
    : { position: "absolute", bottom: 150, left: 120, display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 14 };

  return (
    <AbsoluteFill style={{ opacity }}>
      {/* Image with Ken Burns */}
      <Img
        src={staticFile(scene.src)}
        style={{
          width: "100%", height: "100%", objectFit: "cover",
          transform: `scale(${scale}) translate(${x}px, ${y}px)`,
        }}
      />

      {/* Cinematic overlays */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.05) 30%, rgba(0,0,0,0.15) 55%, rgba(0,0,0,0.85) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(0,0,0,0.5) 0%, transparent 30%, transparent 70%, rgba(0,0,0,0.4) 100%)" }} />

      {/* Subtle warm color grade */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(201,168,76,0.04) 0%, transparent 50%, rgba(220,38,38,0.03) 100%)" }} />

      {/* Wipe transition accent */}
      {shotIndex > 0 && <WipeTransition progress={wipeProgress} />}

      {/* Text overlay */}
      <div style={textStyle}>
        {/* Red accent line */}
        <div style={{
          width: 60, height: 3,
          background: "linear-gradient(to right, #dc2626, rgba(201,168,76,0.6))",
          borderRadius: 2,
          transform: `scaleX(${lineSpring})`,
          transformOrigin: textAlign === "right" ? "right" : textAlign === "center" ? "center" : "left",
        }} />

        {/* Title with clip reveal */}
        <div style={{
          overflow: "hidden",
          padding: "4px 0",
        }}>
          <div style={{
            fontFamily: "Liberation Sans, Arial, sans-serif",
            fontWeight: 900,
            fontSize: 64,
            color: "white",
            letterSpacing: 5,
            textTransform: "uppercase",
            textAlign,
            transform: `translateY(${interpolate(titleSpring, [0, 1], [80, 0])}px)`,
            textShadow: "0 4px 40px rgba(0,0,0,0.6), 0 0 80px rgba(220,38,38,0.15)",
          }}>
            {scene.text.title}
          </div>
        </div>

        {/* Subtitle */}
        <div style={{
          fontFamily: "Liberation Sans, Arial, sans-serif",
          fontWeight: 400,
          fontSize: 22,
          color: "rgba(255,255,255,0.65)",
          letterSpacing: 3,
          textTransform: "uppercase",
          textAlign,
          opacity: subSpring,
          transform: `translateY(${interpolate(subSpring, [0, 1], [20, 0])}px)`,
          textShadow: "0 2px 20px rgba(0,0,0,0.5)",
        }}>
          {scene.text.sub}
        </div>

        {/* Gold shimmer accent */}
        <div style={{
          width: 120, height: 1, marginTop: 4,
          background: `linear-gradient(to right, transparent, rgba(201,168,76,${0.5 * lineSpring}), transparent)`,
          transform: `translateX(${shimmerX}%)`,
        }} />
      </div>
    </AbsoluteFill>
  );
};

/* ── Stats Counter Scene ── */
const StatsScene = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dur = 90;

  const fadeIn = interpolate(frame, [0, 20], [0, 1], { extrapolateRight: "clamp" });

  const stats = [
    { value: "25+", label: "YEARS OF EXCELLENCE", delay: 10 },
    { value: "10K+", label: "PARTS IN STOCK", delay: 20 },
    { value: "5K+", label: "TRUSTED CLIENTS", delay: 30 },
  ];

  return (
    <AbsoluteFill style={{ backgroundColor: "#080810", opacity: fadeIn }}>
      {/* Subtle grid pattern */}
      <div style={{
        position: "absolute", inset: 0, opacity: 0.03,
        backgroundImage: "linear-gradient(rgba(255,255,255,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.3) 1px, transparent 1px)",
        backgroundSize: "80px 80px",
      }} />

      {/* Red accent glow */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: 800, height: 400,
        background: "radial-gradient(ellipse, rgba(220,38,38,0.06) 0%, transparent 70%)",
      }} />

      {/* Stats row */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 140,
      }}>
        {stats.map((stat, i) => {
          const s = spring({ frame: frame - stat.delay, fps, config: { damping: 15, stiffness: 120 } });
          const countUp = interpolate(s, [0, 1], [0, 1], { extrapolateRight: "clamp" });

          return (
            <div key={i} style={{ textAlign: "center", opacity: s, transform: `translateY(${interpolate(s, [0, 1], [40, 0])}px) scale(${interpolate(s, [0, 1], [0.9, 1])})` }}>
              {/* Value */}
              <div style={{
                fontFamily: "Liberation Sans, Arial, sans-serif",
                fontWeight: 900, fontSize: 72, color: "white",
                letterSpacing: 3,
                textShadow: "0 0 40px rgba(220,38,38,0.3)",
              }}>
                {stat.value}
              </div>
              {/* Gold underline */}
              <div style={{
                width: 40, height: 2, margin: "12px auto",
                background: "linear-gradient(to right, transparent, #c9a84c, transparent)",
                transform: `scaleX(${countUp})`,
              }} />
              {/* Label */}
              <div style={{
                fontFamily: "Liberation Sans, Arial, sans-serif",
                fontWeight: 400, fontSize: 16, color: "rgba(255,255,255,0.45)",
                letterSpacing: 4,
              }}>
                {stat.label}
              </div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

/* ── Premium Logo Reveal ── */
const LogoReveal = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Background fade
  const fadeIn = interpolate(frame, [0, 25], [0, 1], { extrapolateRight: "clamp" });

  // Logo entrance — dramatic spring
  const logoSpring = spring({ frame: frame - 15, fps, config: { damping: 14, stiffness: 100 } });
  const logoScale = interpolate(logoSpring, [0, 1], [0.5, 1]);
  const logoOpacity = interpolate(frame, [15, 40], [0, 1], { extrapolateRight: "clamp" });

  // Gold ring
  const ringScale = spring({ frame: frame - 25, fps, config: { damping: 20, stiffness: 80 } });
  const ringRotation = interpolate(frame, [25, 150], [0, 90], { extrapolateRight: "clamp" });

  // Glow pulse
  const glowIntensity = interpolate(
    frame, [40, 60, 80, 100, 120, 140],
    [0, 0.5, 0.25, 0.45, 0.2, 0.35],
    { extrapolateRight: "clamp", extrapolateLeft: "clamp" }
  );

  // Tagline
  const taglineOpacity = interpolate(frame, [55, 75], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  const taglineY = interpolate(frame, [55, 75], [20, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  // Bottom line
  const bottomLineScale = spring({ frame: frame - 70, fps, config: { damping: 200 } });

  // Particle dots
  const particles = Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    const radius = 280 + Math.sin(frame * 0.03 + i) * 20;
    const pOpacity = interpolate(frame, [30 + i * 3, 50 + i * 3], [0, 0.3], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
    return { x: Math.cos(angle + frame * 0.005) * radius, y: Math.sin(angle + frame * 0.005) * radius, opacity: pOpacity };
  });

  return (
    <AbsoluteFill style={{ backgroundColor: "#060609", opacity: fadeIn }}>
      {/* Radial glow */}
      <div style={{
        position: "absolute", inset: 0,
        background: `radial-gradient(ellipse 600px 400px at center, rgba(220,38,38,${0.08 * glowIntensity + 0.02}) 0%, rgba(201,168,76,0.02) 40%, transparent 70%)`,
      }} />

      {/* Floating particles */}
      {particles.map((p, i) => (
        <div key={i} style={{
          position: "absolute", top: "50%", left: "50%",
          width: 3, height: 3, borderRadius: "50%",
          backgroundColor: i % 3 === 0 ? "rgba(220,38,38,0.6)" : "rgba(201,168,76,0.4)",
          transform: `translate(${p.x}px, ${p.y}px)`,
          opacity: p.opacity,
        }} />
      ))}

      {/* Center content */}
      <div style={{
        position: "absolute", inset: 0,
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      }}>
        {/* Gold ring behind logo */}
        <div style={{
          position: "absolute",
          width: 420, height: 420, borderRadius: "50%",
          border: "1px solid rgba(201,168,76,0.15)",
          transform: `scale(${interpolate(ringScale, [0, 1], [0.6, 1])}) rotate(${ringRotation}deg)`,
          opacity: ringScale * 0.6,
        }} />
        <div style={{
          position: "absolute",
          width: 480, height: 480, borderRadius: "50%",
          border: "1px solid rgba(201,168,76,0.08)",
          transform: `scale(${interpolate(ringScale, [0, 1], [0.5, 1])}) rotate(${-ringRotation * 0.5}deg)`,
          opacity: ringScale * 0.4,
        }} />

        {/* Logo */}
        <Img
          src={staticFile("images/almasria-logo.png")}
          style={{
            width: 450, height: "auto", objectFit: "contain",
            opacity: logoOpacity,
            transform: `scale(${logoScale})`,
            filter: `drop-shadow(0 0 ${50 * glowIntensity}px rgba(220,38,38,${glowIntensity * 0.7})) drop-shadow(0 0 ${20 * glowIntensity}px rgba(201,168,76,${glowIntensity * 0.3}))`,
          }}
        />

        {/* Tagline */}
        <div style={{
          marginTop: 40,
          fontFamily: "Liberation Sans, Arial, sans-serif",
          fontWeight: 300, fontSize: 20,
          color: "rgba(255,255,255,0.5)",
          letterSpacing: 10,
          textTransform: "uppercase",
          opacity: taglineOpacity,
          transform: `translateY(${taglineY}px)`,
        }}>
          YOUR TRUSTED PARTNER SINCE 1999
        </div>

        {/* Bottom accent */}
        <div style={{
          marginTop: 30,
          width: 180, height: 2,
          background: "linear-gradient(to right, transparent, #c9a84c, #dc2626, #c9a84c, transparent)",
          transform: `scaleX(${bottomLineScale})`,
          opacity: bottomLineScale * 0.7,
        }} />
      </div>
    </AbsoluteFill>
  );
};

/* ── Letterbox Bars ── */
const LetterboxBars = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const barHeight = 50;
  const introP = spring({ frame, fps, config: { damping: 200 } });
  const outroP = spring({ frame: frame - (durationInFrames - 25), fps, config: { damping: 200 } });
  const topY = interpolate(introP, [0, 1], [-barHeight, 0]) + interpolate(outroP, [0, 1], [0, -barHeight]);
  const bottomY = interpolate(introP, [0, 1], [barHeight, 0]) + interpolate(outroP, [0, 1], [0, barHeight]);

  return (
    <>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: barHeight, backgroundColor: "#000", transform: `translateY(${topY}px)`, zIndex: 50 }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: barHeight, backgroundColor: "#000", transform: `translateY(${bottomY}px)`, zIndex: 50 }} />
    </>
  );
};

/* ── Persistent Red Line ── */
const RedAccentLine = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const progress = spring({ frame: frame - 5, fps, config: { damping: 200 } });
  const outProgress = interpolate(frame, [durationInFrames - 30, durationInFrames], [1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });
  return (
    <div style={{
      position: "absolute", bottom: 50, left: 0, right: 0, height: 2, zIndex: 45,
      transform: `scaleX(${progress * outProgress})`, transformOrigin: "left",
      background: "linear-gradient(to right, rgba(220,38,38,0.4), #dc2626, rgba(201,168,76,0.3))",
    }} />
  );
};

/* ── Corner Badge ── */
const CornerBadge = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const s = spring({ frame: frame - 20, fps, config: { damping: 200 } });
  const outO = interpolate(frame, [durationInFrames - 40, durationInFrames - 20], [1, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <div style={{
      position: "absolute", top: 70, right: 60, zIndex: 45,
      display: "flex", alignItems: "center", gap: 10,
      opacity: s * outO,
      transform: `translateX(${interpolate(s, [0, 1], [30, 0])}px)`,
    }}>
      <div style={{
        width: 8, height: 8, borderRadius: "50%",
        backgroundColor: "#dc2626",
        boxShadow: "0 0 10px rgba(220,38,38,0.5)",
      }} />
      <div style={{
        fontFamily: "Liberation Sans, Arial, sans-serif",
        fontWeight: 700, fontSize: 13, color: "rgba(255,255,255,0.5)",
        letterSpacing: 4, textTransform: "uppercase",
      }}>
        AL MASRIA GROUP
      </div>
    </div>
  );
};

/* ── Main Video ── */
export const MainVideo = () => {
  // Calculate scene starts
  let totalShotFrames = 0;
  const sceneStarts: number[] = [];
  scenes.forEach((scene, i) => {
    sceneStarts.push(totalShotFrames);
    totalShotFrames += scene.dur;
    if (i < scenes.length - 1) totalShotFrames -= CROSSFADE;
  });
  // totalShotFrames ≈ 390

  const statsStart = totalShotFrames - 15; // overlap slightly
  const statsDur = 90;
  const logoStart = statsStart + statsDur - 20;
  const logoDur = 150;

  return (
    <AbsoluteFill style={{ backgroundColor: "#060609" }}>
      {/* Photo shots */}
      {scenes.map((scene, i) => (
        <Sequence key={i} from={sceneStarts[i]} durationInFrames={scene.dur}>
          <Shot scene={scene} shotIndex={i} />
        </Sequence>
      ))}

      {/* Stats counter scene */}
      <Sequence from={statsStart} durationInFrames={statsDur}>
        <StatsScene />
      </Sequence>

      {/* Logo reveal finale */}
      <Sequence from={logoStart} durationInFrames={logoDur}>
        <LogoReveal />
      </Sequence>

      {/* Persistent overlays */}
      <LetterboxBars />
      <RedAccentLine />
      <CornerBadge />
    </AbsoluteFill>
  );
};
