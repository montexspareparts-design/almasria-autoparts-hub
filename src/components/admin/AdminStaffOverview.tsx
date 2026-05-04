import { lazy, Suspense, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Activity, FileText, TrendingUp, ClipboardList } from "lucide-react";

const AdminStaffActivity = lazy(() => import("@/components/AdminStaffActivity"));
const AdminStaffPerformance = lazy(() => import("@/components/AdminStaffPerformance"));
const AdminReporterReports = lazy(() => import("@/components/admin/AdminReporterReports"));
const GeneralReportsReview = lazy(() => import("@/components/staff/GeneralReportsReview"));

const Loader = () => (
  <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
    جارٍ التحميل...
  </div>
);

type TabKey = "activity" | "performance" | "reports" | "general";

const STORAGE_KEY = "admin-staff-overview-tab";

/**
 * صفحة موحّدة للأدمن (الإدارة فقط) تجمع 3 تبويبات:
 * 1) نشاط الموظفين اليوم (مين دخل + جلسات + تصفح)
 * 2) أداء الموظفين (KPIs + Leaderboard)
 * 3) التقارير اليومية للموظفين
 *
 * يدعم ?tab=activity|performance|reports من القائمة الجانبية ويتذكر آخر تبويب.
 */
export default function AdminStaffOverview() {
  const [params, setParams] = useSearchParams();

  const initialTab: TabKey = (() => {
    const fromUrl = params.get("tab");
    if (fromUrl === "activity" || fromUrl === "performance" || fromUrl === "reports") return fromUrl;
    if (typeof window !== "undefined") {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "activity" || saved === "performance" || saved === "reports") return saved;
    }
    return "activity";
  })();

  const [tab, setTab] = useState<TabKey>(initialTab);

  // Sync URL deep-link from sidebar (?tab=...) ↔ state
  useEffect(() => {
    const fromUrl = params.get("tab");
    if (fromUrl === "activity" || fromUrl === "performance" || fromUrl === "reports") {
      if (fromUrl !== tab) setTab(fromUrl);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  function handleChange(v: string) {
    const next = v as TabKey;
    setTab(next);
    try { window.localStorage.setItem(STORAGE_KEY, next); } catch { /* ignore */ }
    // Keep URL in sync without losing other params (like ?section=staff-overview)
    const newParams = new URLSearchParams(params);
    newParams.set("tab", next);
    setParams(newParams, { replace: true });
  }

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5 border-2 border-primary/10 bg-gradient-to-br from-primary/5 via-background to-background">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground">
              متابعة الموظفين — لوحة الإدارة
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              النشاط اليومي + الأداء + التقارير اليومية لكل موظفي الفيصل في مكان واحد
            </p>
          </div>
        </div>
      </Card>

      <Tabs value={tab} onValueChange={handleChange}>
        <TabsList className="grid w-full sm:w-auto grid-cols-3 sm:inline-grid">
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="w-4 h-4" />
            نشاط اليوم
          </TabsTrigger>
          <TabsTrigger value="performance" className="gap-2">
            <TrendingUp className="w-4 h-4" />
            الأداء
          </TabsTrigger>
          <TabsTrigger value="reports" className="gap-2">
            <FileText className="w-4 h-4" />
            التقارير اليومية
          </TabsTrigger>
        </TabsList>

        <TabsContent value="activity" className="mt-4">
          <Suspense fallback={<Loader />}>
            <AdminStaffActivity />
          </Suspense>
        </TabsContent>

        <TabsContent value="performance" className="mt-4">
          <Suspense fallback={<Loader />}>
            <AdminStaffPerformance />
          </Suspense>
        </TabsContent>

        <TabsContent value="reports" className="mt-4">
          <Suspense fallback={<Loader />}>
            <AdminReporterReports />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
