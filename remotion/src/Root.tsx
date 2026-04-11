import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// 6 shots (~390 frames) + stats (90) + logo (150) with overlaps ≈ 595 frames ≈ ~20 seconds
export const RemotionRoot = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={595}
    fps={30}
    width={1920}
    height={1080}
  />
);
