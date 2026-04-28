// Single source of truth for staff/moderator section access.
// Used by AdminDashboard sidebar filter, StaffWelcomeDashboard StatusIndicatorsBar,
// Quick Actions, and the safeNavigate wrapper — so the UI and the permission
// preview screen never drift apart.

export interface SectionMeta {
  id: string;
  label: string;
  description: string;
}

// Sections an Admin can grant to a Moderator. Admins always have access to everything.
export const MODERATOR_SECTIONS_LIST: SectionMeta[] = [
  { id: "daily-dashboard", label: "لوحة المهام اليومية", description: "مركز قيادة الموظف اليومي + مؤشرات الحالة + المهام العاجلة" },
  { id: "customer-intel", label: "ذكاء العملاء", description: "تحليلات سلوك العملاء وأنماط الشراء" },
  { id: "analytics", label: "التحليلات", description: "KPIs عامة، خرائط حرارية، ولوحات الأداء" },
  { id: "customers", label: "ملف العملاء", description: "البحث عن عميل، عرض ملفه، تسجيل تواصل" },
  { id: "orders", label: "الطلبات", description: "إدارة الطلبات، تحديث الحالة، رفع الإيصال" },
  { id: "leads", label: "Leads", description: "إدارة العملاء المحتملين والمتابعة" },
  { id: "visitor-leads", label: "ليدز الزوار (واتساب)", description: "أرقام واتساب للزوار غير المسجلين من الـ popup" },
  { id: "account-settings", label: "إعدادات حسابي", description: "تغيير كلمة المرور والإعدادات الشخصية" },
];

// Admin-only sections (used to show what the Moderator does NOT see in the preview screen).
export const ADMIN_ONLY_SECTIONS_LIST: SectionMeta[] = [
  { id: "staff-performance", label: "أداء الموظفين", description: "تقارير وتفاصيل أداء كل موظف — أدمن فقط" },
  { id: "whatsapp-inbox", label: "صندوق واتساب", description: "محادثات الواتساب — أدمن فقط" },
  { id: "products", label: "المنتجات", description: "إدارة الكتالوج" },
  { id: "dealers", label: "التجار", description: "اعتماد طلبات التجار" },
  { id: "staff-roles", label: "الأدوار والصلاحيات", description: "إدارة موظفي النظام" },
  { id: "audit-log", label: "سجل المراجعة", description: "Audit Log" },
  { id: "erp", label: "ERP / الفيصل", description: "إدارة المزامنة" },
  { id: "instapay-receipts", label: "إيصالات InstaPay", description: "مراجعة الإيصالات" },
];

export const MODERATOR_SECTIONS: Set<string> = new Set(MODERATOR_SECTIONS_LIST.map(s => s.id));

export interface RoleFlags {
  isAdmin: boolean;
  isModerator?: boolean;
}

/**
 * Single permission check used by sidebar filter, StatusIndicatorsBar, Quick Actions,
 * and the safeNavigate wrapper. Admins can access everything; moderators only the
 * sections in MODERATOR_SECTIONS.
 */
export function canAccessSection(section: string, roles: RoleFlags): boolean {
  if (roles.isAdmin) return true;
  return MODERATOR_SECTIONS.has(section);
}

/**
 * Safe navigation helper — falls back to a default section if the target is forbidden.
 */
export function buildSafeNavigate(
  onNavigate: ((section: string) => void) | undefined,
  roles: RoleFlags,
  fallback: string = "daily-dashboard",
) {
  return (section: string, customFallback?: string) => {
    if (!onNavigate) return;
    const target = canAccessSection(section, roles) ? section : (customFallback ?? fallback);
    onNavigate(target);
  };
}
