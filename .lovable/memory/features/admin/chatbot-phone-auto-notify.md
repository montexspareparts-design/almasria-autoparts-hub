---
name: تنبيه تلقائي للموظفين عند بعت العميل رقم تليفون في الشات بوت
description: لو العميل (جست أو مسجل) بعت رسالة فيها رقم موبايل مصري في الشات، النظام يعمل support_request صامت تلقائياً ويبلغ كل الموظفين
type: feature
---

## المشكلة الأصلية
العميل لما يفتح الشات بوت ويبعت رقم موبايله من نفسه (بدون ما يضغط زر "تواصل مع موظف")، الموظف ماكانش بيتنبه لأن `createSupportRequest` كانت بتتنفذ بس في 3 سيناريوهات محددة.

## الحل
في `AIChatBot.tsx` → `sendMessage()`:

```ts
// بعد signup flow، قبل wantsHumanSupport
const detectedPhone = extractPhone(text);
if (detectedPhone && !notifiedPhonesRef.current.has(detectedPhone)) {
  notifiedPhonesRef.current.add(detectedPhone);
  createSupportRequest(text, detectedPhone); // fire-and-forget
}
```

### السلوك
- **fire-and-forget**: مايعطلش رد الـ AI للعميل
- **deduplication per session**: الرقم الواحد يبعت طلب مرة واحدة بس في الجلسة الحالية (`notifiedPhonesRef`)
- **بيشغل الـ DB triggers الموجودة**: 
  - `notify_staff_new_support_request` → in-app notifications لكل الستاف
  - `notify_admin_whatsapp_new_support_request` → واتساب لأرقام الإدارة
  - + push notifications عبر `notify-admin-support-request` → `notify-staff-push`
- **بيتسجل في console** للتتبع: `[AIChatBot] auto support_request created: ok phone: 010xxxxxxxx`

### الـ regex للتحقق
```ts
/(?:\+?20)?0?1[0125]\d{8}/  // أرقام موبايل مصرية: 010/011/012/015
```

## التأثير
أي عميل يكتب رقمه في الشات (حتى في سياق "01020412358" بدون كلمات تواصل) → الموظف يعرف فوراً ويقدر يبادر بالتواصل.
