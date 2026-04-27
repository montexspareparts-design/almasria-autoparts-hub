import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowLeft, ListChecks, Search, X } from "lucide-react";
import StaffRoleTasksPanel from "@/components/staff/StaffRoleTasksPanel";

/**
 * StaffTasksPage — Dedicated full-page view of all role-based tasks.
 *
 * Routes: /admin/tasks and /staff/tasks
 *
 * Features:
 *   • role-aware tasks (admin vs moderator)
 *   • filter chips by status (Critical / High / Today / Urgent / Hot Leads / No-contact / SLA-breached)
 *   • free-text search across customer name, order number, business/shop name and phone
 *   • automatic ordering by importance and SLA
 *   • inline quick actions (call / WhatsApp / approve / done / snooze) with undo and audit logging
 *
 * The search bar narrows results WITHIN the active filter chip — i.e. filter first,
 * then search. Phone matching is digits-only so "+20" / "0" prefixes don't matter.
 */
export default function StaffTasksPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

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

      {/* Search bar — searches within the currently filtered results */}
      <Card className="p-3 sm:p-4">
        <label htmlFor="tasks-search" className="text-xs font-medium text-muted-foreground mb-2 block">
          بحث ضمن النتائج
        </label>
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <Input
            id="tasks-search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="اسم العميل، رقم الطلب، اسم الشركة، أو رقم الموبايل…"
            className="pr-10 pl-10"
            dir="rtl"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="مسح البحث"
              className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted text-muted-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
          يتم البحث داخل نفس نتائج الفلتر النشط — اكتب جزء من الاسم أو رقم الطلب
          (مثل <code className="bg-muted px-1 rounded">ORD-2025</code>) أو رقم الموبايل.
        </p>
      </Card>

      {/* Full tasks list — high limit so nothing is hidden */}
      <StaffRoleTasksPanel limit={200} searchQuery={search} />
    </div>
  );
}
