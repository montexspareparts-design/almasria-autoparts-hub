---
name: Reporter Sections Editor
description: محرّر أقسام/حقول تقرير موظف الفيصل (Reporter) — Admin-only CRUD
type: feature
---
- جدولين: `reporter_report_sections` + `reporter_report_fields` (Admin-only RLS عبر has_role)
- صفحة `/admin/reporter-sections-editor` لإضافة/حذف/ترتيب/تفعيل الأقسام والحقول
- الوصول: Admin يفتح `/admin/daily-report?edit=1` فيظهر زر "✏️ تعديل الأقسام" يوصّله للمحرّر
- الحفظ تلقائي onBlur/onChange — مفيش زر Save منفصل
- Seed جاهز للأقسام الستة: production/communication/conversion/growth/problems/lost
- ملاحظة: `ReporterDailyForm` لسه بيستخدم schema الـ `reporter_daily_reports` الثابت — المحرّر دلوقتي بيتحكم في الـ metadata/visibility فقط، التوسعة الكاملة لاحقاً
