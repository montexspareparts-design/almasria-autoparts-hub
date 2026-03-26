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

/* ── Scene Data ── */
const scenes = [
  // Scene 1: Macro parts (2 shots)
  { src: "images/scene1-parts-macro.jpg", zoom: { from: 1, to: 1.18 }, pan: { xFrom: 0, xTo: -35, yFrom: 0, yTo: -15 } },
  { src: "images/scene1-parts-detail.jpg", zoom: { from: 1.12, to: 1 }, pan: { xFrom: -20, xTo: 25, yFrom: -10, yTo: 10 } },
  // Scene 2: Warehouse (2 shots)
  { src: "images/scene2-warehouse.jpg", zoom: { from: 1, to: 1.14 }, pan: { xFrom: 15, xTo: -20, yFrom: 0, yTo: -12 } },
  { src: "images/scene2-warehouse-workers.jpg", zoom: { from: 1.1, to: 1 }, pan: { xFrom: -15, xTo: 10, yFrom: -8, yTo: 8 } },
  // Scene 3: Driving (3 shots)
  { src: "images/scene3-landcruiser.jpg", zoom: { from: 1, to: 1.16 }, pan: { xFrom: 20, xTo: -25, yFrom: 5, yTo: -10 } },
  { src: "images/scene3-hilux.jpg", zoom: { from: 1.08, to: 1 }, pan: { xFrom: -10, xTo: 15, yFrom: -5, yTo: 5 } },
  { src: "images/scene3-corolla.jpg", zoom: { from: 1, to: 1.12 }, pan: { xFrom: -15, xTo: 20, yFrom: 0, yTo: -8 } },
  // Scene 4: Blend
  { src: "images/scene4-blend.jpg", zoom: { from: 1.05, to: 1 }, pan: { xFrom: 10, xTo: -10, yFrom: -5, yTo: 5 } },
];

const SHOT_DURATION = 75; // ~2.5s per shot (faster pacing for 15s video)
const CROSSFADE = 20;

/* ── Text Overlays ── */
const textOverlays: Record<number, { title: string; sub: string }> = {
  0: { title: "GENUINE TOYOTA PARTS", sub: "Premium Quality You Can Trust" },
  2: { title: "MASSIVE INVENTORY", sub: "10,000+ Parts Ready to Ship" },
  4: { title: "TRUSTED PERFORMANCE", sub: "Built for Every Road in Egypt" },
  7: { title: "ORDER NOW", sub: "Your Trusted Partner Since 1999" },
};

/* ── Single Shot ── */
const Shot = ({ scene, index }: { scene: typeof scenes[0]; index: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = interpolate(frame, [0, SHOT_DURATION], [scene.zoom.from, scene.zoom.to], { extrapolateRight: "clamp" });
  const x = interpolate(frame, [0, SHOT_DURATION], [scene.pan.xFrom, scene.pan.xTo], { extrapolateRight: "clamp" });
  const y = interpolate(frame, [0, SHOT_DURATION], [scene.pan.yFrom, scene.pan.yTo], { extrapolateRight: "clamp" });

  const opacity = interpolate(frame, [0, CROSSFADE, SHOT_DURATION - CROSSFADE, SHOT_DURATION], [0, 1, 1, 0], { extrapolateRight: "clamp" });

  const overlay = textOverlays[index];
  const titleSpring = overlay ? spring({ frame: frame - 15, fps, config: { damping: 200 } }) : 0;
  const subSpring = overlay ? spring({ frame: frame - 25, fps, config: { damping: 200 } }) : 0;
  const lineScale = overlay ? spring({ frame: frame - 10, fps, config: { damping: 200 } }) : 0;

  return (
    <AbsoluteFill style={{ opacity }}>
      <Img src={staticFile(scene.src)} style={{ width: "100%", height: "100%", objectFit: "cover", transform: `scale(${scale}) translate(${x}px, ${y}px)` }} />

      {/* Dark cinematic overlay */}
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.1) 35%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.8) 100%)" }} />
      <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to right, rgba(0,0,0,0.45) 0%, transparent 35%, transparent 65%, rgba(0,0,0,0.35) 100%)" }} />

      {/* Text overlay */}
      {overlay && (
        <div style={{ position: "absolute", bottom: 140, left: 120, display: "flex", flexDirection: "column", gap: 12 }}>
          <div style={{ width: 80, height: 4, background: "linear-gradient(to right, #dc2626, rgba(220,38,38,0.3))", borderRadius: 2, transform: `scaleX(${lineScale})`, transformOrigin: "left" }} />
          <div style={{
            fontFamily: "Liberation Sans, Arial, sans-serif", fontWeight: 900,
            fontSize: index === 7 ? 72 : 58, color: "white",
            letterSpacing: 6, textTransform: "uppercase",
            opacity: titleSpring, transform: `translateY(${interpolate(titleSpring, [0, 1], [30, 0])}px)`,
            textShadow: "0 4px 30px rgba(0,0,0,0.5)",
          }}>
            {overlay.title}
          </div>
          <div style={{
            fontFamily: "Liberation Sans, Arial, sans-serif", fontWeight: 400,
            fontSize: 24, color: "rgba(255,255,255,0.7)", letterSpacing: 2,
            opacity: subSpring, transform: `translateY(${interpolate(subSpring, [0, 1], [20, 0])}px)`,
            textShadow: "0 2px 20px rgba(0,0,0,0.4)",
          }}>
            {overlay.sub}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

/* ── Logo Reveal Scene ── */
const LogoReveal = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const fadeIn = interpolate(frame, [0, 30], [0, 1], { extrapolateRight: "clamp" });
  const logoScale = spring({ frame: frame - 10, fps, config: { damping: 20, stiffness: 120 } });
  const logoOpacity = interpolate(frame, [10, 40], [0, 1], { extrapolateRight: "clamp" });

  // Subtle glow pulse
  const glowPulse = interpolate(frame, [40, 60, 80, 100], [0, 0.4, 0.2, 0.35], { extrapolateRight: "clamp", extrapolateLeft: "clamp" });

  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a0a", opacity: fadeIn }}>
      {/* Subtle radial gradient */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(220,38,38,0.08) 0%, transparent 60%)" }} />

      {/* Logo */}
      <div style={{
        position: "absolute", inset: 0, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 30,
      }}>
        <Img
          src={staticFile("images/almasria-logo.png")}
          style={{
            width: 500, height: "auto", objectFit: "contain",
            opacity: logoOpacity,
            transform: `scale(${interpolate(logoScale, [0, 1], [0.7, 1])})`,
            filter: `drop-shadow(0 0 ${40 * glowPulse}px rgba(220,38,38,${glowPulse}))`,
          }}
        />

        {/* Tagline under logo */}
        <div style={{
          fontFamily: "Liberation Sans, Arial, sans-serif", fontWeight: 300,
          fontSize: 22, color: "rgba(255,255,255,0.5)", letterSpacing: 8,
          textTransform: "uppercase",
          opacity: interpolate(frame, [50, 70], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" }),
          transform: `translateY(${interpolate(frame, [50, 70], [15, 0], { extrapolateRight: "clamp", extrapolateLeft: "clamp" })}px)`,
        }}>
          GENUINE TOYOTA PARTS · EGYPT
        </div>
      </div>

      {/* Bottom red accent */}
      <div style={{
        position: "absolute", bottom: 80, left: "50%", transform: `translateX(-50%) scaleX(${interpolate(frame, [60, 90], [0, 1], { extrapolateRight: "clamp", extrapolateLeft: "clamp" })})`,
        width: 200, height: 3,
        background: "linear-gradient(to right, transparent, #dc2626, transparent)",
      }} />
    </AbsoluteFill>
  );
};

/* ── Letterbox Bars ── */
const LetterboxBars = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const barHeight = 55;
  const introP = spring({ frame, fps, config: { damping: 200 } });
  const outroP = spring({ frame: frame - (durationInFrames - 30), fps, config: { damping: 200 } });
  const topY = interpolate(introP, [0, 1], [-barHeight, 0]) + interpolate(outroP, [0, 1], [0, -barHeight]);
  const bottomY = interpolate(introP, [0, 1], [barHeight, 0]) + interpolate(outroP, [0, 1], [0, barHeight]);

  return (
    <>
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: barHeight, backgroundColor: "black", transform: `translateY(${topY}px)`, zIndex: 50 }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: barHeight, backgroundColor: "black", transform: `translateY(${bottomY}px)`, zIndex: 50 }} />
    </>
  );
};

/* ── Red Accent Line ── */
const RedAccentLine = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - 5, fps, config: { damping: 200 } });
  return (
    <div style={{
      position: "absolute", bottom: 55, left: 0, right: 0, height: 3, zIndex: 40,
      transform: `scaleX(${progress})`, transformOrigin: "left",
      background: "linear-gradient(to right, rgba(220,38,38,0.5), #dc2626, rgba(220,38,38,0.5))",
    }} />
  );
};

/* ── Main Video ── */
export const MainVideo = () => {
  // Shots section: 8 shots × 75 frames each, 7 overlaps × 20 = 460 frames
  const shotsEnd = scenes.length * SHOT_DURATION - (scenes.length - 1) * CROSSFADE; // 460

  return (
    <AbsoluteFill style={{ backgroundColor: "#080812" }}>
      {scenes.map((scene, i) => {
        const start = i * (SHOT_DURATION - CROSSFADE);
        return (
          <Sequence key={i} from={start} durationInFrames={SHOT_DURATION}>
            <Shot scene={scene} index={i} />
          </Sequence>
        );
      })}

      {/* Logo reveal at the end */}
      <Sequence from={shotsEnd - 30} durationInFrames={120}>
        <LogoReveal />
      </Sequence>

      <LetterboxBars />
      <RedAccentLine />
    </AbsoluteFill>
  );
};
