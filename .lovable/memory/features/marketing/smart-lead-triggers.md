---
name: Smart lead capture triggers
description: 3 محفّزات سلوكية ذكية لجمع رقم الزائر المجهول بدون إزعاج — Exit Intent + Scroll 65% + Idle 90s — يظهر شريط سفلي صغير
type: feature
---

# نظام جمع رقم الزائر المجهول الذكي

عشان نحوّل الزوار المجهولين لـ Leads بدون ضغط، فيه **3 طبقات** بتشتغل بالتسلسل:

## 1. HeroLeadCapture (دائم)
بطاقة في الـ Hero للزائر غير المسجل — مفيش timing، بتظهر من أول لحظة.
File: `src/components/HeroLeadCapture.tsx`

## 2. VisitorLeadCapture (Modal بعد 30s)
Popup مركزي بعد 30 ثانية — زائر متفاعل لكن ما تكلّمش.
File: `src/components/VisitorLeadCapture.tsx`
Storage key: `visitor_lead_capture_v1`

## 3. SmartLeadTriggers (شريط سفلي ذكي) — الجديد
شريط Bottom Slide-in خفيف جداً (مش modal بيقطع التصفّح) بيطلق على أول واحد من 3 محفّزات:

| المحفّز | المنطق | التطبيق |
|--------|--------|---------|
| **Exit Intent** | الماوس بتطلع برة الصفحة من فوق (≥768px فقط) | `mouseleave` event |
| **Scroll 65%** | الزائر وصل لـ 65% من الصفحة → مهتم | `scroll` listener |
| **Idle 90s** | قعد دقيقة ونص بدون أي تفاعل | `setTimeout` يتعاد عند أي activity |

### قواعد ضرورية
- ما يظهرش قبل **8 ثواني** من فتح الصفحة (يدي وقت للـ Hero/Modal الأول).
- يتجاهل المسار: `/admin /dealer /checkout /payment /auth /reset-password`.
- يتجاهل لو المستخدم مسجّل دخول.
- يتجاهل لو سبق وأرسل رقمه عبر أي من الـ 3 طبقات (يفحص الـ keys: `smart_lead_trigger_v1` + `hero_lead_capture_submitted_v1` + `visitor_lead_capture_v1`).
- يظهر **مرة واحدة فقط للأبد** بعد الإرسال أو الإغلاق.

File: `src/components/SmartLeadTriggers.tsx`
Storage key: `smart_lead_trigger_v1`
Mounted في `App.tsx` بـ delay 7s (بعد VisitorLeadCapture بثانية).

## الفلسفة
الـ 3 طبقات بتدّي الزائر فرص متعددة بسياقات مختلفة (Hero عند الدخول، Modal بعد تفاعل، شريط سفلي عند نية خروج/اهتمام عميق) — كلها بتسجّل في جدول `visitor_leads` ومرتبطة بـ `session_key` عشان تربط الجلسة بالرقم.
