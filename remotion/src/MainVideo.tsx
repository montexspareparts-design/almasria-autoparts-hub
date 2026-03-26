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
  { src: "images/scene1-parts-detail.jpg", zoom: { from: 1.12, to: 1, }, pan: { xFrom: -20, xTo: 25, yFrom: -10, yTo: 10 } },
  // Scene 2: Warehouse (2 shots)
  { src: "images/scene2-warehouse.jpg", zoom: { from: 1, to: 1.14 }, pan: { xFrom: 15, xTo: -20, yFrom: 0, yTo: -12 } },
  { src: "images/scene2-warehouse-workers.jpg", zoom: { from: 1.1, to: 1, }, pan: { xFrom: -15, xTo: 10, yFrom: -8, yTo: 8 } },
  // Scene 3: Driving (3 shots)
  { src: "images/scene3-landcruiser.jpg", zoom: { from: 1, to: 1.16 }, pan: { xFrom: 20, xTo: -25, yFrom: 5, yTo: -10 } },
  { src: "images/scene3-hilux.jpg", zoom: { from: 1.08, to: 1, }, pan: { xFrom: -10, xTo: 15, yFrom: -5, yTo: 5 } },
  { src: "images/scene3-corolla.jpg", zoom: { from: 1, to: 1.12 }, pan: { xFrom: -15, xTo: 20, yFrom: 0, yTo: -8 } },
  // Scene 4: Blend
  { src: "images/scene4-blend.jpg", zoom: { from: 1.05, to: 1, }, pan: { xFrom: 10, xTo: -10, yFrom: -5, yTo: 5 } },
];

const SHOT_DURATION = 120; // 4 seconds per shot
const CROSSFADE = 25; // overlap

/* ── Text Overlays per scene group ── */
const textOverlays: Record<number, { title: string; sub: string }> = {
  0: { title: "GENUINE QUALITY", sub: "Original Toyota Spare Parts" },
  2: { title: "MASSIVE INVENTORY", sub: "10,000+ Parts Ready to Ship" },
  4: { title: "BUILT FOR EGYPT", sub: "Trusted by Thousands Across the Country" },
  7: { title: "المصرية جروب", sub: "Your Trusted Partner Since 1999" },
};

/* ── Single Shot Component ── */
const Shot = ({ scene, index }: { scene: typeof scenes[0]; index: number }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const scale = interpolate(frame, [0, SHOT_DURATION], [scene.zoom.from, scene.zoom.to], { extrapolateRight: "clamp" });
  const x = interpolate(frame, [0, SHOT_DURATION], [scene.pan.xFrom, scene.pan.xTo], { extrapolateRight: "clamp" });
  const y = interpolate(frame, [0, SHOT_DURATION], [scene.pan.yFrom, scene.pan.yTo], { extrapolateRight: "clamp" });

  // Crossfade in/out
  const opacity = interpolate(
    frame,
    [0, CROSSFADE, SHOT_DURATION - CROSSFADE, SHOT_DURATION],
    [0, 1, 1, 0],
    { extrapolateRight: "clamp" }
  );

  // Text overlay
  const overlay = textOverlays[index];
  const titleSpring = overlay
    ? spring({ frame: frame - 20, fps, config: { damping: 200 } })
    : 0;
  const subSpring = overlay
    ? spring({ frame: frame - 35, fps, config: { damping: 200 } })
    : 0;

  // Red accent line animation
  const lineScale = overlay
    ? spring({ frame: frame - 15, fps, config: { damping: 200 } })
    : 0;

  return (
    <AbsoluteFill style={{ opacity }}>
      {/* Image with Ken Burns */}
      <Img
        src={staticFile(scene.src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translate(${x}px, ${y}px)`,
        }}
      />

      {/* Cinematic dark overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.15) 35%, rgba(0,0,0,0.25) 60%, rgba(0,0,0,0.85) 100%)",
        }}
      />

      {/* Side vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(to right, rgba(0,0,0,0.5) 0%, transparent 35%, transparent 65%, rgba(0,0,0,0.4) 100%)",
        }}
      />

      {/* Subtle red accent vignette */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "radial-gradient(ellipse at 75% 75%, rgba(220,38,38,0.06), transparent 55%)",
        }}
      />

      {/* Text overlay */}
      {overlay && (
        <div
          style={{
            position: "absolute",
            bottom: 140,
            left: 120,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          {/* Red accent line */}
          <div
            style={{
              width: 80,
              height: 4,
              background: "linear-gradient(to right, #dc2626, rgba(220,38,38,0.3))",
              borderRadius: 2,
              transform: `scaleX(${lineScale})`,
              transformOrigin: "left",
            }}
          />

          {/* Title */}
          <div
            style={{
              fontFamily: "Liberation Sans, Arial, sans-serif",
              fontWeight: 900,
              fontSize: index === 7 ? 72 : 64,
              color: "white",
              letterSpacing: index === 7 ? 0 : 6,
              textTransform: index === 7 ? "none" : "uppercase",
              opacity: titleSpring,
              transform: `translateY(${interpolate(titleSpring, [0, 1], [30, 0])}px)`,
              textShadow: "0 4px 30px rgba(0,0,0,0.5)",
            }}
          >
            {overlay.title}
          </div>

          {/* Subtitle */}
          <div
            style={{
              fontFamily: "Liberation Sans, Arial, sans-serif",
              fontWeight: 400,
              fontSize: 26,
              color: "rgba(255,255,255,0.7)",
              letterSpacing: 2,
              opacity: subSpring,
              transform: `translateY(${interpolate(subSpring, [0, 1], [20, 0])}px)`,
              textShadow: "0 2px 20px rgba(0,0,0,0.4)",
            }}
          >
            {overlay.sub}
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

/* ── Letterbox Bars ── */
const LetterboxBars = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const barHeight = 60;
  const introProgress = spring({ frame, fps, config: { damping: 200 } });
  const outroProgress = spring({
    frame: frame - (durationInFrames - 30),
    fps,
    config: { damping: 200 },
  });

  const topY = interpolate(introProgress, [0, 1], [-barHeight, 0]) +
    interpolate(outroProgress, [0, 1], [0, -barHeight]);
  const bottomY = interpolate(introProgress, [0, 1], [barHeight, 0]) +
    interpolate(outroProgress, [0, 1], [0, barHeight]);

  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: barHeight,
          backgroundColor: "black",
          transform: `translateY(${topY}px)`,
          zIndex: 50,
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          height: barHeight,
          backgroundColor: "black",
          transform: `translateY(${bottomY}px)`,
          zIndex: 50,
        }}
      />
    </>
  );
};

/* ── Bottom Red Accent Line ── */
const RedAccentLine = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame: frame - 5, fps, config: { damping: 200 } });

  return (
    <div
      style={{
        position: "absolute",
        bottom: 60,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 40,
        transform: `scaleX(${progress})`,
        transformOrigin: "left",
        background: "linear-gradient(to right, rgba(220,38,38,0.5), #dc2626, rgba(220,38,38,0.5))",
      }}
    />
  );
};

/* ── Main Video ── */
export const MainVideo = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#080812" }}>
      {/* Scene sequences */}
      {scenes.map((scene, i) => {
        const start = i * (SHOT_DURATION - CROSSFADE);
        return (
          <Sequence key={i} from={start} durationInFrames={SHOT_DURATION}>
            <Shot scene={scene} index={i} />
          </Sequence>
        );
      })}

      {/* Cinematic letterbox bars */}
      <LetterboxBars />

      {/* Bottom red accent */}
      <RedAccentLine />
    </AbsoluteFill>
  );
};
