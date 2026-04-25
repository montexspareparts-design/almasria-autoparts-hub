---
name: نظام طلب الصلاحيات من الأدمن
description: لما الموظف (moderator) يحاول إجراء خارج صلاحياته، يظهر RequestPermissionDialog ليطلب الإذن، ويتسجّل في permission_requests وتتبعت notifications للأدمن، والأدمن يوافق/يرفض من /admin → "طلبات الصلاحيات"
type: feature
---

## التدفق
1. الموظف يحاول إجراء (مثلاً إنشاء حساب عميل) ويرجع 403/serverMsg فيه "صلاحية" أو "Forbidden".
2. الكود (مثل AdminLeads) يستدعي `usePermissionRequest().requestPermission({ actionType, actionDescription, contextData })`.
3. يظهر RequestPermissionDialog مع حقل "السبب" (اختياري).
4. عند الإرسال → INSERT في `permission_requests` + trigger يبعت notification لكل الأدمن.
5. الأدمن يفتح `AdminDashboard → طلبات الصلاحيات` (admin-only) → موافقة/رفض مع رد اختياري.
6. trigger ثاني يبعت notification للموظف بنتيجة الطلب.

## المكوّنات
- جدول: `public.permission_requests` (status: pending/approved/rejected)
- Provider مغلّف في `App.tsx`: `PermissionRequestProvider` من `src/hooks/usePermissionRequest.tsx`
- Dialog: `src/components/RequestPermissionDialog.tsx`
- لوحة الأدمن: `src/components/admin/AdminPermissionRequests.tsx` (sidebar id: `permission-requests`)

## للتوسعة
لأي زر جديد محظور على الموظفين، اكتشف خطأ 403 من السيرفر واستدعِ `requestPermission(...)` بدل ما تعرض toast بس.
