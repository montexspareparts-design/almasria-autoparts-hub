import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "@/lib/analytics";

/**
 * Sends a GA4 / Meta page_view on SPA route changes.
 * The initial load page_view is already sent by the gtag snippet in index.html,
 * so we skip the very first render to avoid duplicates.
 */
const AnalyticsRouteTracker = () => {
  const location = useLocation();
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    const id = window.setTimeout(() => {
      trackPageView(location.pathname + location.search);
    }, 60);
    return () => window.clearTimeout(id);
  }, [location.pathname, location.search]);

  return null;
};

export default AnalyticsRouteTracker;
