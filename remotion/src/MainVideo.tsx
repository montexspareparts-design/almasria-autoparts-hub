import { AbsoluteFill, useCurrentFrame, interpolate, Img, staticFile, Sequence } from "remotion";

const images = [
  staticFile("images/hero-parts-1.jpg"),
  staticFile("images/hero-toyota-car.jpg"),
  staticFile("images/hero-oil.jpg"),
  staticFile("images/hero-warehouse.jpg"),
  staticFile("images/hero-parts-2.jpg"),
];

const SCENE_DURATION = 150; // 5 seconds per scene
const TRANSITION = 30; // 1 second crossfade overlap

const Scene = ({ src, index }: { src: string; index: number }) => {
  const frame = useCurrentFrame();

  // Ken Burns: slow zoom + subtle pan
  const directions = [
    { scaleFrom: 1, scaleTo: 1.15, xFrom: 0, xTo: -30, yFrom: 0, yTo: -20 },
    { scaleFrom: 1.1, scaleTo: 1, xFrom: -20, xTo: 20, yFrom: -10, yTo: 10 },
    { scaleFrom: 1, scaleTo: 1.12, xFrom: 10, xTo: -15, yFrom: 5, yTo: -15 },
    { scaleFrom: 1.08, scaleTo: 1, xFrom: 15, xTo: -10, yFrom: -5, yTo: 5 },
    { scaleFrom: 1, scaleTo: 1.1, xFrom: -10, xTo: 10, yFrom: 0, yTo: -10 },
  ];

  const d = directions[index % directions.length];

  const scale = interpolate(frame, [0, SCENE_DURATION], [d.scaleFrom, d.scaleTo], { extrapolateRight: "clamp" });
  const x = interpolate(frame, [0, SCENE_DURATION], [d.xFrom, d.xTo], { extrapolateRight: "clamp" });
  const y = interpolate(frame, [0, SCENE_DURATION], [d.yFrom, d.yTo], { extrapolateRight: "clamp" });

  // Fade in/out
  const opacity = interpolate(frame, [0, TRANSITION, SCENE_DURATION - TRANSITION, SCENE_DURATION], [0, 1, 1, 0], { extrapolateRight: "clamp" });

  return (
    <AbsoluteFill style={{ opacity }}>
      <Img
        src={src}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transform: `scale(${scale}) translate(${x}px, ${y}px)`,
        }}
      />
      {/* Dark cinematic overlay */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "linear-gradient(180deg, rgba(0,0,0,0.5) 0%, rgba(0,0,0,0.2) 40%, rgba(0,0,0,0.3) 60%, rgba(0,0,0,0.7) 100%)",
      }} />
      {/* Red accent vignette */}
      <div style={{
        position: "absolute",
        inset: 0,
        background: "radial-gradient(ellipse at 70% 70%, rgba(220,38,38,0.08), transparent 60%)",
      }} />
    </AbsoluteFill>
  );
};

export const MainVideo = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0a0a1a" }}>
      {images.map((src, i) => {
        const start = i * (SCENE_DURATION - TRANSITION);
        return (
          <Sequence key={i} from={start} durationInFrames={SCENE_DURATION}>
            <Scene src={src} index={i} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
