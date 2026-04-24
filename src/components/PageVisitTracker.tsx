import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { trackPageVisit } from "@/lib/pageVisitTracker";
import { trackCustomerSession } from "@/lib/sessionTracker";

/**
 * Mounted once inside the router. Tracks every navigation as a page_visit
 * and bumps the daily customer_sessions counter for logged-in users.
 */
export default function PageVisitTracker() {
  const location = useLocation();

  useEffect(() => {
    const fullPath = location.pathname + location.search;
    // wait a tick so document.title gets updated by the new page
    const t = setTimeout(() => {
      trackPageVisit(fullPath, document.title);
      trackCustomerSession();
    }, 250);
    return () => clearTimeout(t);
  }, [location.pathname, location.search]);

  return null;
}
