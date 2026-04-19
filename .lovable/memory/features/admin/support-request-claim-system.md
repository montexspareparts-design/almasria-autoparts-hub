---
name: Support Request Claim System
description: نظام Claim لطلبات الشات بوت — أول موظف يضغط "أنا هرد" يحجز الطلب ويختفي من الباقي
type: feature
---

# نظام Claim لمنع تكرار الرد

## المشكلة
لما العميل يطلب التواصل من الشات بوت، الإشعار كان بيوصل لكل الموظفين، فممكن أكتر من واحد يكلم العميل في نفس الوقت = إهدار وقت وإحراج.

## الحل
نظام **Claim ذري (Atomic)**:
- أول موظف يضغط **"🎯 أنا هرد"** يحجز الطلب على نفسه فوراً.
- الـ UPDATE يحصل بشرط `claimed_by IS NULL` → لو موظفين ضغطوا في نفس الثانية، واحد بس ينجح.
- باقي الموظفين يشوفوا الطلب باهت + بادج "أحمد بيرد" (الشفافية كاملة).
- اللي حجز يشوف بادج أخضر "أنت بترد" + أزرار: واتساب / اتصال / ملخص / تم الرد.

## التطبيق التقني
- **DB columns**: `support_requests.claimed_by (uuid)`, `claimed_at (timestamptz)`.
- **Realtime**: تم تفعيل `ALTER PUBLICATION supabase_realtime ADD TABLE support_requests` + `REPLICA IDENTITY FULL` لبث UPDATE events.
- **RLS**: سياسة `Staff can claim support requests` تسمح للستاف فقط بالـ UPDATE.
- **Atomic Claim Pattern**:
  ```ts
  .update({ claimed_by: user.id, ... })
  .eq("id", reqId)
  .is("claimed_by", null)  // ← الشرط الذري
  .select("id").maybeSingle();
  ```
  لو ما رجعش data → يبقى زميل سبقك، نعرض toast "⏱️ سبقك زميل!".

## الواجهات المتأثرة
1. **`AdminSupportRequestAlert`** (Popup الفوري): زر رئيسي "🎯 أنا هرد"، أزرار واتساب/اتصال تعمل claim تلقائي. لما حد يحجز → الـ popup يختفي عند الكل realtime.
2. **`StaffCRMCommandCenter` → تبويب "طلبات الشات بوت"**: 
   - Pending → زر "🎯 أنا هرد".
   - محجوز عندي → بادج خضراء + كل الأكشنز + زر "تم الرد".
   - محجوز عند زميل → باهت (opacity-60) + بادج "{اسم} بيرد" + بدون أزرار.

## السلوك المهم
- زر **"إخفاء (X)"** في الـ popup يخفي محلياً فقط — الطلب يفضل متاح لباقي الزملاء.
- زر **"تم الرد"** يضع `status='resolved'` وبكده يختفي من الكل.
