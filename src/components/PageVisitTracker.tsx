import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageVisit, trackHeartbeatVisit, flushPendingVisits } from "@/lib/pageVisitTracker";
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
    // Track immediately so fast bounces (esp. from FB in-app browser) don't get lost.
    // Run title-dependent metadata enrichment in a microtask but the visit itself is queued sync.
    trackPageVisit(fullPath, document.title || "");
    trackCustomerSession();

    const heartbeat = window.setInterval(() => {
      if (document.visibilityState === "visible") {
        trackHeartbeatVisit(fullPath, document.title);
        trackCustomerSession({ countPageView: false });
      }
    }, 20000);

    return () => {
      clearInterval(heartbeat);
    };
  }, [location.pathname, location.search]);

  return null;
}
