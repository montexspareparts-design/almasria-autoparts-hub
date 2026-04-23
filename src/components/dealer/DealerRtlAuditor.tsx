import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import { auditDirectionalAndWarn } from "@/lib/devDirectionalAudit";

/**
 * Dev-only component: mounts inside dealer pages and runs a directional audit
 * after the page settles. Logs a warning + shows a one-time toast if any
 * legacy mr/ml/pr/pl/text-right/text-left classes are detected.
 *
 * In production it renders nothing and does no work.
 */
const DealerRtlAuditor = () => {
  const location = useLocation();

  useEffect(() => {
    if (!import.meta.env.DEV) return;
    if (!location.pathname.startsWith("/dealer")) return;

    let toastShown = false;
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      // Only scan inside the dealer page container so we don't flag
      // shared shell components (Navbar, toasts, floating buttons, etc.)
      const scope = document.querySelector<HTMLElement>("[data-dealer-scope]");
      if (!scope) return;
      const offenders = auditDirectionalAndWarn(`route ${location.pathname}`, scope);
      if (offenders.length > 0 && !toastShown) {
        toastShown = true;
        toast.warning(
          `RTL Audit: ${offenders.length} كلاس اتجاهي قديم في ${location.pathname}`,
          {
            description:
              "افتح الكونسول لرؤية القائمة الكاملة. حوّل mr/ml → ms/me و pr/pl → ps/pe.",
            duration: 6000,
          },
        );
      }
    };

    // Pass 1: right after the browser commits the first paint of this route.
    // Double rAF guarantees React has flushed and layout is computed.
    let raf1 = 0;
    let raf2 = 0;
    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(run);
    });

    // Pass 2: after lazy/suspended dealer content typically resolves.
    // Prefer requestIdleCallback so we never block interactions.
    type IdleHandle = number;
    let idleHandle: IdleHandle | null = null;
    let fallbackTimer: number | null = null;
    const ric = (window as unknown as {
      requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => IdleHandle;
      cancelIdleCallback?: (h: IdleHandle) => void;
    });
    if (typeof ric.requestIdleCallback === "function") {
      idleHandle = ric.requestIdleCallback(run, { timeout: 3000 });
    } else {
      fallbackTimer = window.setTimeout(run, 2500);
    }

    return () => {
      cancelled = true;
      if (raf1) window.cancelAnimationFrame(raf1);
      if (raf2) window.cancelAnimationFrame(raf2);
      if (idleHandle !== null && typeof ric.cancelIdleCallback === "function") {
        ric.cancelIdleCallback(idleHandle);
      }
      if (fallbackTimer !== null) window.clearTimeout(fallbackTimer);
    };
  }, [location.pathname]);

  return null;
};

export default DealerRtlAuditor;
