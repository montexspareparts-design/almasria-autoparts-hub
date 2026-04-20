---
name: AI Summary for Chatbot Support Requests
description: زر "ملخص AI" في كارت طلب الشات بوت — يحلل المحادثة كاملة بـ Lovable AI ويعرض الأهداف والأولوية والقطع المذكورة
type: feature
---

# ملخص AI ذكي للمحادثات

## الفكرة
قبل ما الموظف يبدأ يرد على عميل من الشات بوت، يضغط زر **"🤖 ملخص AI"** ويشوف في ثواني:
- ملخص في 2-3 أسطر للي العميل عايزه
- القطع/الفئات اللي اتذكرت في المحادثة
- درجة الإلحاح (urgent/normal/inquiry)
- نية العميل (price_quote/availability/complaint/...)
- خطوة مقترحة للبدء

## التطبيق التقني
- **Edge Function**: `summarize-support-conversation`
  - يقرأ `support_requests.context.chat_history` (المحفوظ من AIChatBot)
  - يستدعي Lovable AI (`google/gemini-2.5-flash`) بـ tool calling لإخراج structured JSON
  - يحفظ النتيجة في `context.ai_summary` كـ cache دائم (حتى يضغط الموظف "تحديث")
  - مصرح للستاف فقط (فحص `is_staff` بـ JWT)
- **UI**: `SupportRequestAISummary.tsx` — Dialog بـ:
  - Skeleton loader أثناء التحليل
  - Badge ملوّن للإلحاح + Badge للنية
  - بطاقة بنفسجية للملخص + بطاقة خضراء للخطوة المقترحة
  - أزرار: "تحديث" (لو cached) + "تم"
- **Trigger**: زر "🤖 ملخص AI" في كارت `StaffCRMCommandCenter` تبويب "طلبات الشات بوت" — يظهر فقط لو الموظف هو اللي عمل Claim للطلب.

## السلوك
- أول ضغطة: استدعاء AI (~2 ثانية) + حفظ cache.
- الضغطات التالية: رجوع فوري من cache + بادج "من الكاش" + زر "تحديث" لإعادة التحليل.
- لو AI رجع 429/402: toast واضح بالعربية ويقفل الـ Dialog.
