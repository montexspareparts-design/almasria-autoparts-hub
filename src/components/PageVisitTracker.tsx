import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageVisit, flushPendingVisits } from "@/lib/pageVisitTracker";
import { trackCustomerSession } from "@/lib/sessionTracker";

/**
 * Mounted once inside the router. Tracks every navigation as a page_visit
 * and bumps the daily customer_sessions counter for logged-in users.
 *
 * Reliability features:
 * - Flushes any visits queued by previous sessions on mount.
 * - Re-tries flushing when the tab becomes visible again.
 * - Forces a final flush on pagehide / beforeunload so quick visits never get lost.
 */
export default function PageVisitTracker() {
  const location = useLocation();

  // On mount: flush any leftover visits from previous tabs/sessions
  useEffect(() => {
    flushPendingVisits();

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        flushPendingVisits();
      }
    };
    const handlePageHide = () => {
      // Best-effort flush before the tab disappears
      flushPendingVisits();
    };

    document.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("pagehide", handlePageHide);
    window.addEventListener("beforeunload", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("pagehide", handlePageHide);
      window.removeEventListener("beforeunload", handlePageHide);
    };
  }, []);

  // Track every navigation
  useEffect(() => {
    const fullPath = location.pathname + location.search;
    // Use a small delay so document.title gets a chance to update,
    // but the visit is queued synchronously inside trackPageVisit so it survives a fast close.
    const t = setTimeout(() => {
      trackPageVisit(fullPath, document.title);
      trackCustomerSession();
    }, 150);
    return () => clearTimeout(t);
  }, [location.pathname, location.search]);

  return null;
}
