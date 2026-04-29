import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ClipboardList, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import StaffDailyReport from "@/components/staff/StaffDailyReport";
import ReporterDailyForm from "@/components/staff/ReporterDailyForm";

/**
 * Dedicated page for filling out the daily staff report.
 * Linked from the StaffHome dashboard via a tab/card.
 *
 * Accessible to: admin, moderator, AND reporter (Al-Faisal staff).
 * For reporter-only accounts, this is the ONLY page they can access —
 * the "back" button is replaced with a sign-out button so they can't
 * navigate elsewhere in the admin panel.
 */
export default function StaffDailyReportPage() {
  const navigate = useNavigate();
  const { user, loading, isReporterOnly, signOut } = useAuth();

  // Guard: only staff (admin/moderator/reporter) can access this page
  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/auth", { replace: true });
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      const roles = (data || []).map((r) => r.role as string);
      const isStaff =
        roles.includes("admin") ||
        roles.includes("moderator") ||
        roles.includes("reporter");
      if (!isStaff) navigate("/", { replace: true });
    })();
  }, [user, loading, navigate]);

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border/60">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 grid place-items-center shadow-sm shrink-0">
              <ClipboardList className="w-4.5 h-4.5 text-primary-foreground" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold leading-tight truncate">
                التقرير اليومي للموظف
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground leading-none mt-0.5">
                {isReporterOnly
                  ? "املأ الإجابات وقدّمها — هذه الصفحة الوحيدة المتاحة لحسابك"
                  : "املأ الإجابات وقدّمها قبل نهاية اليوم"}
              </p>
            </div>
          </div>

          {isReporterOnly ? (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                await signOut();
                navigate("/auth", { replace: true });
              }}
              className="shrink-0 gap-1.5 text-destructive hover:text-destructive"
            >
              <LogOut className="w-4 h-4" />
              خروج
            </Button>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate("/admin/staff-home")}
              className="shrink-0 gap-1.5"
            >
              <ArrowRight className="w-4 h-4" />
              رجوع
            </Button>
          )}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        <StaffDailyReport />
      </main>
    </div>
  );
}
