import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import StaffDailyReport from "@/components/staff/StaffDailyReport";

/**
 * Dedicated page for filling out the daily staff report.
 * Linked from the StaffHome dashboard via a tab/card.
 */
export default function StaffDailyReportPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  // Guard: redirect non-staff to home
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
      const roles = (data || []).map((r) => r.role);
      const isStaff = roles.includes("admin") || roles.includes("moderator");
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
                املأ الإجابات وقدّمها قبل نهاية اليوم
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate("/admin/staff-home")}
            className="shrink-0 gap-1.5"
          >
            <ArrowRight className="w-4 h-4" />
            رجوع
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        <StaffDailyReport />
      </main>
    </div>
  );
}
