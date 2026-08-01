import { lazy, Suspense, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { isNativeShell } from "@/lib/nativeShell";
import { useAuth } from "@/contexts/AuthContext";
import NativeLaunchScreen from "./NativeLaunchScreen";

const NativeOnboarding = lazy(() => import("./NativeOnboarding"));

const ONBOARDED_KEY = "almasria_app_onboarded_v1";
const SEGMENT_KEY = "almasria_app_segment";
const LAUNCH_MS = 1750;

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* ignore */
  }
};

/**
 * Native app entry gate.
 *
 * 1. Plays the branded launch animation on cold start.
 * 2. Then, for first-run users, asks whether they are a wholesale dealer or a
 *    retail customer and how they want to enter (sign in / register / guest).
 *
 * Purely a presentation layer: it never blocks the web build, never touches
 * auth logic, and disappears permanently once the user has made a choice.
 */
const NativeAppGate = () => {
  const native = isNativeShell();
  const { user, loading } = useAuth();

  const [phase, setPhase] = useState<"launch" | "onboarding" | "done">(() =>
    native ? "launch" : "done"
  );
  const [exitingLaunch, setExitingLaunch] = useState(false);

  useEffect(() => {
    if (!native) return;
    const fadeAt = window.setTimeout(() => setExitingLaunch(true), LAUNCH_MS);
    const endAt = window.setTimeout(() => {
      const seen = read(ONBOARDED_KEY) === "1";
      setPhase(seen ? "done" : "onboarding");
    }, LAUNCH_MS + 480);
    return () => {
      window.clearTimeout(fadeAt);
      window.clearTimeout(endAt);
    };
  }, [native]);

  // A signed-in user never sees the first-run gate.
  useEffect(() => {
    if (!loading && user) {
      write(ONBOARDED_KEY, "1");
      setPhase((p) => (p === "onboarding" ? "done" : p));
    }
  }, [user, loading]);

  if (!native || phase === "done") return null;

  const finish = (segment: string) => {
    write(SEGMENT_KEY, segment);
    write(ONBOARDED_KEY, "1");
    setPhase("done");
  };

  return (
    <AnimatePresence>
      {phase === "launch" && <NativeLaunchScreen key="launch" exiting={exitingLaunch} />}
      {phase === "onboarding" && (
        <Suspense fallback={null}>
          <NativeOnboarding key="onboarding" onPick={finish} onGuest={finish} />
        </Suspense>
      )}
    </AnimatePresence>
  );
};

export default NativeAppGate;
