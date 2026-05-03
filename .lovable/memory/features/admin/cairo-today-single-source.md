---
name: Cairo Today Single Source
description: handledMeta + visibleTasks + customer_communications يستخدمون نفس مرشّح Cairo TZ عبر helpers
type: feature
---

كل منطق "تم اليوم" في `AdminCustomerIntelligence` بيمر عبر `src/lib/handledTasks.ts`:

- `cairoToday()` — مفتاح `YYYY-MM-DD` للقاهرة (المصدر الوحيد).
- `cairoDaysAgo(n)` — حساب `cutoffDate` لـ `staff_task_handling`.
- `cairoDayBoundsUTC(day)` — يرجع `[startMs, endMs)` بـ UTC (يحترم الـ DST: مايو–أكتوبر = UTC+3، باقي السنة UTC+2).
- `isWithinCairoToday(at)` — الفحص الموحّد المستخدم في:
  1. فلتر `handledMeta` داخل `customerTouchedToday`.
  2. فلتر الـ realtime payload في `aci_customer_comms_today`.
  3. حساب `fromTs` لجلب `customer_communications` (بدل `T00:00:00.000Z` اللي كان UTC مش Cairo).

البق المُصلَّح: الكود القديم استخدم `new Date(\`${day}T00:00:00\`)` (local time للمتصفح) و `T00:00:00.000Z` (UTC) — الاتنين بيشيلوا أو يضيفوا 2-3 ساعات غلط حسب TZ المستخدم/الموسم. ده كان بيخلي الإجراءات بعد منتصف الليل القاهرة لا تظهر/تختفي صح.

الـ tests:
- `src/lib/cairoDate.test.ts` — 7 اختبارات (شامل DST + regression).
- `src/lib/doneTodayParity.test.ts` — 10 اختبارات (badge==cards parity).
- `src/lib/handledTasks.test.ts` — 17 اختبار للـ helpers الأساسية.
