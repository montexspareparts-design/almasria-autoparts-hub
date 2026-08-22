import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageView } from "@/lib/analytics";

/** Sends a GA4 / Meta page_view on every SPA route change. */
const AnalyticsRouteTracker = () => {
  const location = useLocation();

  useEffect(() => {
    const id = window.setTimeout(() => {
      trackPageView(location.pathname + location.search);
    }, 60);
    return () => window.clearTimeout(id);
  }, [location.pathname, location.search]);

  return null;
};

export default AnalyticsRouteTracker;
