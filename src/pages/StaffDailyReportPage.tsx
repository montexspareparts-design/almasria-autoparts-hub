import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, ClipboardList, LogOut, Settings2, PackageX, FileText, PackageCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import StaffDailyReport from "@/components/staff/StaffDailyReport";
import ReporterDailyForm from "@/components/staff/ReporterDailyForm";
import TeamShortagesView from "@/components/staff/TeamShortagesView";
import RestockedYesterdayCard from "@/components/staff/RestockedYesterdayCard";
import GeneralReportsReview from "@/components/staff/GeneralReportsReview";
import { cn } from "@/lib/utils";

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
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading, isReporterOnly, isAdmin, signOut } = useAuth();
  const viewParam = searchParams.get("view");
  const view = (
    viewParam === "shortages" ? "shortages" :
    viewParam === "restocked" ? "restocked" :
    viewParam === "general" ? "general" :
    "report"
  ) as "report" | "general" | "shortages" | "restocked";
  const editMode = searchParams.get("edit") === "1" && isAdmin;
  // Force the Al-Faisal (Reporter) form when ?as=reporter is present (admin preview)
  const forceReporter = searchParams.get("as") === "reporter" && isAdmin;
  // Distinct flag: does this user actually hold the reporter role (even if also admin/moderator)?
  const [hasReporterRole, setHasReporterRole] = useState(false);

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
      setHasReporterRole(roles.includes("reporter"));
    })();
  }, [user, loading, navigate]);

  // Show the Al-Faisal 13-question form whenever the user holds the reporter role,
  // OR when an admin previews via ?as=reporter. Pure-admin/moderator (no reporter
  // role) still gets the legacy general KPI report.
  const showReporterForm = hasReporterRole || isReporterOnly || forceReporter;

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
                  : showReporterForm
                  ? "تقرير موظف الفيصل (13 سؤال) — املأ الإجابات قبل نهاية اليوم"
                  : "املأ الإجابات وقدّمها قبل نهاية اليوم"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {editMode && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate("/admin/reporter-sections-editor")}
                className="gap-1.5 text-amber-600 border-amber-500/40 hover:bg-amber-500/10"
                title="تعديل أقسام تقرير موظف الفيصل"
              >
                <Settings2 className="w-4 h-4" />
                <span className="hidden sm:inline">تعديل الأقسام</span>
              </Button>
            )}

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
                onClick={() => navigate("/admin/staff-home")}
                className="gap-1.5"
              >
                <ArrowRight className="w-4 h-4" />
                رجوع
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Tabs strip — pill design ثابت ومريح للموبايل */}
      <div className="sticky top-[57px] z-20 border-b border-border/40 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70">
        <div className="max-w-5xl mx-auto px-2 sm:px-6 py-1.5 sm:py-2">
          <div
            role="tablist"
            aria-label="أقسام التقرير اليومي"
            className="flex items-center gap-1 p-1 rounded-full bg-muted/60 border border-border/50 shadow-inner w-full sm:w-fit"
          >
            {([
              { key: "report",     label: showReporterForm ? "تقرير الفيصل" : "تقريري اليومي", shortLabel: showReporterForm ? "الفيصل" : "تقريري", icon: FileText, show: true },
              { key: "general",    label: "التقرير العام",   shortLabel: "العام",    icon: ClipboardList, show: isAdmin && !isReporterOnly },
              { key: "shortages",  label: "النواقص",          shortLabel: "النواقص", icon: PackageX, show: true },
              { key: "restocked",  label: "وصل امبارح",       shortLabel: "وصل",     icon: PackageCheck, show: true },
            ] as const).filter((t) => t.show).map((t) => {
              const Icon = t.icon;
              const active = view === t.key;
              return (
                <button
                  key={t.key}
                  role="tab"
                  aria-selected={active}
                  onClick={() => {
                    const next = new URLSearchParams(searchParams);
                    if (t.key === "report") next.delete("view");
                    else next.set("view", t.key);
                    setSearchParams(next, { replace: true });
                  }}
                  className={cn(
                    "flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 sm:px-5 h-9 sm:h-10 rounded-full text-xs sm:text-sm font-semibold whitespace-nowrap transition-all duration-200",
                    active
                      ? "bg-card text-primary shadow-sm ring-1 ring-primary/15"
                      : "text-muted-foreground hover:text-foreground hover:bg-card/50"
                  )}
                >
                  <Icon className={cn("w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0", active && "text-primary")} />
                  <span className="sm:hidden">{t.shortLabel}</span>
                  <span className="hidden sm:inline">{t.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className={cn(
        "mx-auto px-3 sm:px-6 py-4 sm:py-6",
        (view === "report" || view === "general") ? "max-w-3xl" : "max-w-5xl"
      )}>
        {view === "shortages" ? (
          <TeamShortagesView />
        ) : view === "restocked" ? (
          <RestockedYesterdayCard />
        ) : view === "general" ? (
          <GeneralReportsReview />
        ) : (
          showReporterForm ? <ReporterDailyForm /> : <StaffDailyReport />
        )}
      </main>
    </div>
  );
}
