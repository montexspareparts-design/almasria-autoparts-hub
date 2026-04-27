import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ArrowLeft, ListChecks } from "lucide-react";
import StaffRoleTasksPanel from "@/components/staff/StaffRoleTasksPanel";

/**
 * StaffTasksPage — Dedicated full-page view of all role-based tasks.
 *
 * Routes: /admin/tasks and /staff/tasks
 *
 * The page is a thin wrapper around `StaffRoleTasksPanel` which already provides:
 *   • role-aware tasks (admin vs moderator)
 *   • filter chips by status (Critical / High / Today / Urgent / Hot Leads / No-contact / SLA-breached)
 *   • automatic ordering by importance and SLA
 *   • inline quick actions (call / WhatsApp / approve / done / snooze) with undo and audit logging
 *
 * Compared to the dashboard widget, this page raises the limit so the staff member
 * sees the *complete* backlog instead of only the top 10 cards.
 */
export default function StaffTasksPage() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 space-y-4 max-w-6xl" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(-1)}
          className="gap-1"
        >
          <ArrowLeft className="w-4 h-4" />
          رجوع
        </Button>
        <h1 className="text-base sm:text-lg font-semibold flex items-center gap-2">
          <ListChecks className="w-5 h-5 text-primary" />
          كل مهام الفريق
        </h1>
      </div>

      {/* Intro card */}
      <Card className="p-3 sm:p-4 bg-muted/40 border-dashed">
        <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
          هذه الصفحة تعرض <strong>كامل</strong> قائمة المهام المخصصة لدورك. استخدم
          فلاتر الأولوية (عاجل / Hot Leads / بدون تواصل) أو فلاتر الحالة الزمنية
          (Critical / High / Today / SLA متجاوز) لتصفية المهام بسرعة. كل إجراء
          (اتصال، واتساب، اعتماد، تحويل حالة) يُسجَّل تلقائياً مع إمكانية التراجع
          لمدة 5 ثوانٍ.
        </p>
      </Card>

      {/* Full tasks list — high limit so nothing is hidden */}
      <StaffRoleTasksPanel limit={200} />
    </div>
  );
}
