import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// 8 shots × 75 frames, 7 overlaps × 20 = 460 frames for shots
// + 120 frames logo reveal (overlaps 30 frames) = 550 total ≈ 18.3 seconds
export const RemotionRoot = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={550}
    fps={30}
    width={1920}
    height={1080}
  />
);
