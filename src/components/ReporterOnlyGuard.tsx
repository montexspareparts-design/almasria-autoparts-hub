import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

/**
 * Locks reporter-only accounts (e.g. Al-Faisal staff like كرم) to the daily
 * report page. Any attempt to navigate elsewhere — root, products, cart,
 * /admin, /dealer, etc. — is silently redirected back to /admin/daily-report.
 *
 * Only `/auth` and `/reset-password` remain accessible so they can sign in
 * or recover their password if logged out.
 *
 * Mounted globally inside AuthProvider so the guard runs on EVERY route.
 */
const ALLOWED_PATHS = ["/admin/daily-report", "/staff/daily-report", "/auth", "/reset-password"];

export default function ReporterOnlyGuard() {
  const { isReporterOnly, loading } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!isReporterOnly) return;
    const path = location.pathname;
    const allowed = ALLOWED_PATHS.some((p) => path === p || path.startsWith(p + "/"));
    if (!allowed) {
      navigate("/admin/daily-report", { replace: true });
    }
  }, [isReporterOnly, loading, location.pathname, navigate]);

  return null;
}
