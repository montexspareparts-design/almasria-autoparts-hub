---
name: Transfer Support Request to Colleague
description: زر "تحويل لزميل" — لو الموظف ملقاش معلومة، يحوّل الطلب لزميل تاني مع ملاحظة سريعة وسجل تحويلات شفاف
type: feature
---

## النظام
- **جدول `support_request_transfers`**: يسجّل كل عملية تحويل (from_staff, to_staff, note, timestamp).
- **Trigger `notify_staff_on_transfer`**: عند إدراج تحويل جديد، يُنشئ إشعار تلقائي للموظف المُحوَّل إليه.
- **`TransferToColleagueDialog`**: مودال يعرض قائمة الزملاء (admins + moderators بدون نفسه) + textarea للملاحظة + سجل التحويلات السابقة.

## آلية التحويل
1. يضغط الموظف "تحويل لزميل" (يظهر فقط بعد الـ claim).
2. يختار الزميل ويكتب ملاحظة اختيارية (≤300 حرف).
3. عند الضغط على "تحويل الآن":
   - يُسجَّل التحويل في `support_request_transfers`.
   - يُحدَّث `support_requests.claimed_by` و`assigned_to` للزميل الجديد.
   - الـ DB trigger يُنشئ إشعار للزميل.
4. سجل التحويلات يظهر للجميع داخل المودال (شفاف).

## القيود الأمنية (RLS)
- الموظفون يشوفوا كل التحويلات (شفافية).
- الموظف يقدر يدرج تحويل من حسابه فقط (`from_staff_id = auth.uid()`).
- الأدمن يقدر يدير الكل.
