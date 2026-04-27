import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Eye, X } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * ImpersonationBanner — Sticky red bar shown across every page when an admin
 * is currently viewing the app "as an employee" (frontend-only role swap).
 *
 * Exposes a one-click exit so the admin can never get stuck in employee mode,
 * and a quick jump back to the admin dashboard. Hidden when not impersonating.
 *
 * Note: the underlying Supabase session still belongs to the admin — this is
 * purely a UI behavior switch. All audit logs / RLS continue to use auth.uid().
 */
export default function ImpersonationBanner() {
  const { isImpersonating, impersonatedName, stopImpersonation } = useAuth();
  const navigate = useNavigate();

  if (!isImpersonating) return null;

  const handleExit = () => {
    stopImpersonation();
    // Jump back to the admin home so the UI matches the now-restored role.
    navigate("/admin/staff-home");
  };

  return (
    <div
      className="sticky top-0 z-[60] w-full bg-red-600 text-white shadow-md"
      role="status"
      aria-live="polite"
      dir="rtl"
    >
      <div className="max-w-7xl mx-auto px-3 sm:px-4 py-2 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2 text-xs sm:text-sm font-semibold">
          <Eye className="w-4 h-4 shrink-0" />
          <span>
            وضع المعاينة كموظف:{" "}
            <span className="underline underline-offset-2">{impersonatedName}</span>
          </span>
          <span className="hidden sm:inline opacity-80 font-normal">
            — جلستك الفعلية ما زالت كأدمن، أي إجراء يتم تسجيله باسمك.
          </span>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={handleExit}
          className="h-7 gap-1 bg-white text-red-700 hover:bg-red-50"
        >
          <X className="w-3.5 h-3.5" />
          إنهاء المعاينة
        </Button>
      </div>
    </div>
  );
}
