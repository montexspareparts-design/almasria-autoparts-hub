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

  const showOnboarding = native && !bypass && !splash && !onboarded && !loading && !user;
  // While auth is still resolving we keep an opaque cover so the home screen
  // never flashes behind the splash/onboarding (that was the visual "clash").
  const showCover = native && !bypass && !splash && !onboarded && loading;
  const locked = native && !bypass && (splash || showOnboarding || showCover);

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
      <AnimatePresence>{splash && <NativeSplash key="splash" leaving={leaving} />}</AnimatePresence>
      {showCover && (
        <div
          className="fixed inset-0 z-[140]"
          style={{
            background:
              "radial-gradient(130% 90% at 50% -10%, #16305a 0%, #0d2140 38%, #0A1A2F 68%, #050c17 100%)",
          }}
        />
      )}
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
