import { lazy, Suspense, useEffect, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { useLocation } from "react-router-dom";
import { isNativeShell } from "@/lib/nativeShell";
import { useAuth } from "@/contexts/AuthContext";
import NativeSplash from "./NativeSplash";
import { ONBOARD_KEY } from "./NativeOnboarding";

const NativeOnboarding = lazy(() => import("./NativeOnboarding"));

const SPLASH_MS = 1900;
const SESSION_SPLASH_KEY = "almasria_splash_shown";

/** Routes that must never be covered (deep links / OAuth returns). */
const BYPASS = ["/auth-callback", "/payment-callback", "/reset-password"];

/**
 * Native launch experience:
 *   1. Cinematic splash (logo zoom + gold shimmer) on every cold start.
 *   2. First-run gate: wholesale vs retail → login / register / continue as guest.
 * Web is completely untouched.
 */
const NativeLaunchGate = () => {
  const native = isNativeShell();
  const { pathname } = useLocation();
  const { user, loading } = useAuth();

  const bypass = BYPASS.some((p) => pathname.startsWith(p));

  const [splash, setSplash] = useState(() => {
    if (!native) return false;
    try {
      return sessionStorage.getItem(SESSION_SPLASH_KEY) !== "1";
    } catch {
      return true;
    }
  });
  const [leaving, setLeaving] = useState(false);
  const [onboarded, setOnboarded] = useState(() => {
    try {
      return localStorage.getItem(ONBOARD_KEY) === "1";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    if (!splash) return;
    const t1 = setTimeout(() => setLeaving(true), SPLASH_MS);
    const t2 = setTimeout(() => {
      setSplash(false);
      try {
        sessionStorage.setItem(SESSION_SPLASH_KEY, "1");
      } catch {
        /* ignore */
      }
    }, SPLASH_MS + 550);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [splash]);

  if (!native || bypass) return null;

  const showOnboarding = !splash && !onboarded && !loading && !user;

  return (
    <>
      <AnimatePresence>{splash && <NativeSplash key="splash" leaving={leaving} />}</AnimatePresence>
      <AnimatePresence>
        {showOnboarding && (
          <Suspense fallback={null}>
            <NativeOnboarding key="onboarding" onDone={() => setOnboarded(true)} />
          </Suspense>
        )}
      </AnimatePresence>
    </>
  );
};

export default NativeLaunchGate;
