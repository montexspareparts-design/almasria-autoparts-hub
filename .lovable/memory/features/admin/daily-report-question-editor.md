---
name: Daily Report Question Editor & Teams
description: محرر أسئلة ديناميكية للتقرير اليومي + نظام فرق العمل — الأدمن يضيف أسئلة (نص/رقم/اختيار/منطقي) ويوجهها حسب الكل/الدور/الفريق/موظفين محددين
type: feature
---

## الموقع
- محرر الأسئلة + إدارة الفرق: `/admin` → "محرر أسئلة التقرير اليومي" → تبويبان (الأسئلة، الفرق)
- الموظف يشوف "أسئلة فريقك" (قسم منفصل بشارات الفريق + عدد الإجباري) ثم "أسئلة إضافية من الإدارة" — مرتّبة `sort_order` تصاعدياً
- الأدمن يقرأ الإجابات ضمن تفاصيل التقرير في "التقارير اليومية للموظفين"

## الجداول
- `teams` (id, name, description, color, is_active)
- `team_members` (team_id, user_id) — UNIQUE per pair
- `daily_report_questions` (question_text, question_type, options jsonb, placeholder, is_required, sort_order, is_active, target_scope, target_role, target_team_ids[], target_user_ids[])
- `daily_report_answers` (question_id, user_id, report_date, answer_text/number/boolean/choice) — UNIQUE per (question, user, date)

## RLS
- الأدمن يدير كل شيء
- الموظف يشوف الأسئلة المفعّلة الموجّهة له (حسب scope) فقط
- الموظف يقرأ/يكتب إجاباته فقط؛ الأدمن يقرأ كل الإجابات

## أنواع التوجيه (target_scope)
- `all` — كل الموظفين
- `role` — admin أو moderator
- `team` — array من فرق
- `users` — موظفين محددين

## Helper
- `user_team_ids(uuid)` — security definer لاسترداد فرق المستخدم
