import { lazy, Suspense, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { isNativeShell } from "@/lib/nativeShell";
import { useAuth } from "@/contexts/AuthContext";
import NativeSplash from "./NativeSplash";
import { ONBOARD_KEY } from "./NativeOnboarding";

const NativeOnboarding = lazy(() => import("./NativeOnboarding"));

const MIN_SPLASH_MS = 1800;
const MAX_SPLASH_MS = 4500; // never hang if auth stalls
const FADE_MS = 550;
const SESSION_SPLASH_KEY = "almasria_splash_shown";

/** Routes that must never be covered (deep links / OAuth returns). */
const BYPASS = ["/auth-callback", "/payment-callback", "/reset-password"];

/**
 * Native launch experience — single, uninterrupted sequence:
 *   splash (held until auth resolves) → onboarding (already mounted beneath
 *   the fading splash) → app. The app is never visible in between, so there
 *   is no flash of the home screen and no overlap between layers.
 */
const NativeLaunchGate = () => {
  const native = isNativeShell();
  const { pathname } = useLocation();
  const { user, loading } = useAuth();

  const bypass = BYPASS.some((p) => pathname.startsWith(p));

  const [splashActive, setSplashActive] = useState(() => {
    if (!native) return false;
    try {
      return sessionStorage.getItem(SESSION_SPLASH_KEY) !== "1";
    } catch {
      return true;
    }
  });
  const [minElapsed, setMinElapsed] = useState(!splashActive);
  const [timedOut, setTimedOut] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [onboarded, setOnboarded] = useState(() => {
    try {
      return localStorage.getItem(ONBOARD_KEY) === "1";
    } catch {
      return true;
    }
  });

  // minimum + maximum splash timers
  useEffect(() => {
    if (!splashActive) return;
    const t1 = setTimeout(() => setMinElapsed(true), MIN_SPLASH_MS);
    const t2 = setTimeout(() => setTimedOut(true), MAX_SPLASH_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [splashActive]);

  // splash may hand off only once auth state is known (or we timed out)
  const canHandOff = splashActive && minElapsed && (!loading || timedOut);

  useEffect(() => {
    if (!canHandOff) return;
    setLeaving(true);
  }, [canHandOff]);

  // Unmount the splash after the fade — kept in its own effect so the
  // timer isn't cleared by the `leaving` state change itself.
  useEffect(() => {
    if (!leaving) return;
    const t = setTimeout(() => {
      setSplashActive(false);
      try {
        sessionStorage.setItem(SESSION_SPLASH_KEY, "1");
      } catch {
        /* ignore */
      }
    }, FADE_MS);
    return () => clearTimeout(t);
  }, [leaving]);


  const needsOnboarding = !onboarded && !user;
  // Mount onboarding as soon as the splash starts fading so it is already
  // painted underneath — the user never sees the app in between.
  const showOnboarding = native && !bypass && needsOnboarding && (leaving || !splashActive);
  const locked = native && !bypass && (splashActive || showOnboarding);

  useEffect(() => {
    if (!locked) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [locked]);

  if (!native || bypass) return null;

  return (
    <>
      <AnimatePresence>
        {showOnboarding && (
          <Suspense fallback={null}>
            <NativeOnboarding key="onboarding" onDone={() => setOnboarded(true)} />
          </Suspense>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {splashActive && <NativeSplash key="splash" leaving={leaving} />}
      </AnimatePresence>
    </>
  );
};

export default NativeLaunchGate;
