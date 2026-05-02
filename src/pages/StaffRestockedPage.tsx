import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, PackageCheck, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import RestockedYesterdayCard from "@/components/staff/RestockedYesterdayCard";

/**
 * Standalone page showing items that were restocked yesterday.
 * Mirrored as a tab inside /staff/daily-report?view=restocked, but
 * also accessible directly via /staff/restocked for quick links.
 */
export default function StaffRestockedPage() {
  const navigate = useNavigate();
  const { user, loading, isReporterOnly, signOut } = useAuth();
  const [allowed, setAllowed] = useState(false);

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
      if (!isStaff) {
        navigate("/", { replace: true });
        return;
      }
      setAllowed(true);
    })();
  }, [user, loading, navigate]);

  if (!allowed) return null;

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b border-border/60">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 grid place-items-center shadow-sm shrink-0">
              <PackageCheck className="w-4.5 h-4.5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-bold leading-tight truncate">
                وصل امبارح — فرص بيع جاهزة
              </h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground leading-none mt-0.5">
                الأصناف اللي رصيدها زاد عن امبارح بعد مزامنة الفيصل
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {isReporterOnly ? (
              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  await signOut();
                  navigate("/auth", { replace: true });
                }}
                className="gap-1.5 text-destructive hover:text-destructive"
              >
                <LogOut className="w-4 h-4" />
                خروج
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/staff/daily-report")}
                className="gap-1.5"
              >
                <ArrowRight className="w-4 h-4" />
                رجوع للتقرير
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6">
        <RestockedYesterdayCard />
      </main>
    </div>
  );
}
