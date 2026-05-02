import { lazy, Suspense, useState } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Activity, FileText } from "lucide-react";

const AdminStaffActivity = lazy(() => import("@/components/AdminStaffActivity"));
const AdminReporterReports = lazy(() => import("@/components/admin/AdminReporterReports"));

const Loader = () => (
  <div className="flex items-center justify-center py-16 text-sm text-muted-foreground">
    جارٍ التحميل...
  </div>
);

/**
 * صفحة موحّدة للأدمن (الإدارة فقط) تجمع:
 * - نشاط الموظفين اليومي (مين دخل النهاردة + جلسات + تصفح)
 * - التقارير اليومية للموظفين (الفيصل)
 */
export default function AdminStaffOverview() {
  const [tab, setTab] = useState<"activity" | "reports">("activity");

  return (
    <div className="space-y-4">
      <Card className="p-4 sm:p-5 border-2 border-primary/10 bg-gradient-to-br from-primary/5 via-background to-background">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-foreground">
              متابعة الموظفين — لوحة الإدارة
            </h2>
            <p className="text-xs sm:text-sm text-muted-foreground mt-1">
              نشاط اليوم والتقارير اليومية لكل موظفي الفيصل في مكان واحد
            </p>
          </div>
        </div>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as "activity" | "reports")}>
        <TabsList className="grid w-full sm:w-auto grid-cols-2 sm:inline-grid">
          <TabsTrigger value="activity" className="gap-2">
            <Activity className="w-4 h-4" />
            نشاط اليوم
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

        <TabsContent value="reports" className="mt-4">
          <Suspense fallback={<Loader />}>
            <AdminReporterReports />
          </Suspense>
        </TabsContent>
      </Tabs>
    </div>
  );
}
