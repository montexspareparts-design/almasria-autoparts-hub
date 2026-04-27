import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Check, X, ShieldCheck, Info } from "lucide-react";
import {
  MODERATOR_SECTIONS_LIST,
  ADMIN_ONLY_SECTIONS_LIST,
} from "@/lib/staffPermissions";

/**
 * Admin-only preview screen showing exactly which sections each role can access.
 * The lists come from `src/lib/staffPermissions.ts` — the same module used by:
 *   - AdminDashboard sidebar filter
 *   - StaffWelcomeDashboard StatusIndicatorsBar / Quick Actions
 *   - safeNavigate wrapper
 * so this screen is always a faithful preview, never a separate hard-coded copy.
 */
export default function AdminRolePermissions() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <ShieldCheck className="w-6 h-6 text-primary" />
        <div>
          <h2 className="text-2xl font-bold">صلاحيات الأدوار</h2>
          <p className="text-sm text-muted-foreground">
            عرض الأقسام المسموح بها لكل دور — نفس المصدر الذي تستخدمه لوحة المهام و StatusIndicatorsBar و Quick Actions.
          </p>
        </div>
      </div>

      <Alert>
        <Info className="w-4 h-4" />
        <AlertDescription>
          أي تعديل على هذه القائمة يجب أن يتم في ملف واحد فقط:{" "}
          <code className="px-1 py-0.5 rounded bg-muted text-xs">src/lib/staffPermissions.ts</code> —
          وكل الواجهات تتحدّث تلقائياً.
        </AlertDescription>
      </Alert>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Badge className="bg-green-500/15 text-green-700 border-green-500/30">Moderator</Badge>
              <span>الموظف — مسموح ({MODERATOR_SECTIONS_LIST.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {MODERATOR_SECTIONS_LIST.map((s) => (
              <div key={s.id} className="flex items-start gap-3 p-3 rounded-lg border bg-card">
                <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{s.label}</div>
                  <div className="text-xs text-muted-foreground">{s.description}</div>
                  <code className="text-[10px] text-muted-foreground/70">{s.id}</code>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Badge className="bg-amber-500/15 text-amber-700 border-amber-500/30">Admin only</Badge>
              <span>محظور على الموظف ({ADMIN_ONLY_SECTIONS_LIST.length}+)</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {ADMIN_ONLY_SECTIONS_LIST.map((s) => (
              <div key={s.id} className="flex items-start gap-3 p-3 rounded-lg border bg-muted/30">
                <X className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{s.label}</div>
                  <div className="text-xs text-muted-foreground">{s.description}</div>
                  <code className="text-[10px] text-muted-foreground/70">{s.id}</code>
                </div>
              </div>
            ))}
            <div className="text-xs text-muted-foreground pt-2 border-t">
              + أي قسم غير مذكور في القائمة اليسرى = محظور تلقائياً (Default deny).
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
