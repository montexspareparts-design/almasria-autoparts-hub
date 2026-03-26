import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";

// 8 images × 120 frames each, with 25-frame overlaps between scenes
// Total: 8*120 - 7*25 = 960 - 175 = 785 frames ≈ 26 seconds
export const RemotionRoot = () => (
  <Composition
    id="main"
    component={MainVideo}
    durationInFrames={785}
    fps={30}
    width={1920}
    height={1080}
  />
);
