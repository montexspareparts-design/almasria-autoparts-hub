---
name: Staff Browser Push Notifications
description: نظام Browser Push للموظفين عند وصول طلبات الشات بوت — يشتغل حتى لو اللوحة مغلقة
type: feature
---

# نظام إشعارات Push للموظفين

## كيف يعمل
1. **عند دخول الموظف /admin** → يتم تشغيل `requestPushPermission()` تلقائياً (صامت)
2. **يتسجل subscription** في جدول `push_subscriptions` مربوط بـ `user_id` بتاع الموظف
3. **عند وصول support request جديد** → trigger `notify_admin_whatsapp_new_support_request` ينادي edge function `notify-admin-support-request`
4. **الـ edge function** يبعت واتساب للأرقام المسجلة + يستدعي `notify-staff-push` بالـ parallel
5. **`notify-staff-push`** يجيب كل الـ admins+moderators ويبعت Web Push لكل subscription بتاعتهم

## المكونات
- `supabase/functions/notify-staff-push/index.ts` — edge function تستهدف الموظفين فقط
- `supabase/functions/notify-admin-support-request/index.ts` — يستدعي `notify-staff-push` بعد الواتساب
- `src/pages/AdminDashboard.tsx` — يطلب permission تلقائياً للموظفين
- `src/lib/pushNotifications.ts` — موجود مسبقاً، يستخدم VAPID keys
- `public/sw-push.js` — service worker handler للـ push events

## المزايا
- **يشتغل حتى لو المتصفح مقفول** (Web Push API)
- **بصوت + اهتزاز** (من sw-push.js)
- **عند الضغط** يفتح `/admin?section=daily-dashboard` مباشرة
- **ينظف subscriptions منتهية** (410/404)

## ملاحظات
- لو الموظف رفض الـ permission: مفيش مشكلة، الواتساب لسه شغال
- VAPID keys محفوظين في secrets: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`
- مينفعش يكون للموظف الواحد أكتر من جهاز/متصفح — كل واحد له subscription مستقل
