---
name: Reporter Role (Al-Faisal Staff)
description: دور جديد `reporter` لموظفي الفيصل — يدخلوا /admin/daily-report فقط لرفع التقرير اليومي. UI معزولة 100% (لا sidebar، لا popups طلبات/تسجيلات، لا أي قسم تاني).
type: feature
---

## الـ Role
- إضافة `reporter` لـ enum `app_role` (admin/moderator/user/reporter)
- `is_staff()` بترجع true للـ reporter (علشان يقدر يقرأ أسئلة التقرير ويحفظ إجاباته)
- دالة جديدة `is_reporter_only(uuid)` = reporter ومش admin/moderator

## AuthContext
- أضيف `isReporter` و `isReporterOnly` للـ context
- في AdminDashboard: لو `isReporterOnly` → redirect فوراً لـ `/admin/daily-report`
- StaffDailyReportPage: السماح للـ reporter + لو reporterOnly → زر تسجيل خروج بدل "رجوع"

## Popups معزولة تلقائياً
AdminNewOrderAlert + AdminNewSignupAlert بيفلتروا `.in("role", ["admin","moderator"])` → reporter ما يشوفش الـ popups.

## إنشاء الحسابات
- `create-staff-account` edge function يقبل `role: "moderator" | "reporter"` (default moderator)
- AdminStaffRoles: dropdown اختيار الدور (موظف عام / موظف فيصل) + بادج ملوّن في القائمة + رسالة واتساب/إيميل مخصصة (للـ reporter اللينك = /auth)
- كلمة السر بتتخزن في `staff_passwords` زي الموظفين العاديين

## أسئلة التقرير
حالياً الـ reporters يشوفوا أسئلة `target_scope='all'`. لو عايز أسئلة خاصة بيهم بس → نضيف option `'reporter'` في AdminDailyReportEditor (مش معمول لسه).
