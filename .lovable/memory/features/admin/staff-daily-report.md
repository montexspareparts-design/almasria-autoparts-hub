---
name: Staff Daily Report
description: تقرير يومي يدوي يقدّمه الموظف من /admin/staff-home — أرقام (تواصلات/تسجيلات/فواتير/مبلغ/Leads/متابعات) + نصوص (أفضل صفقة/مشاكل/خطة بكرة/ملاحظات). Unique لكل موظف/يوم. الأدمن يستلم إشعار فوري ويراجعها في /admin → "التقارير اليومية للموظفين". تذكير في الواجهة لو 6 مساءً ولم يُقدَّم.
type: feature
---

## الجدول
`staff_daily_reports` — UNIQUE(staff_user_id, report_date)
- أرقام: customers_contacted, customers_registered, customers_with_invoices, total_invoices_amount, hot_leads_count, follow_ups_done
- نصوص (≤1000 حرف): problems_faced, best_deal_today, tomorrow_plan, general_notes

## RLS
- Staff: insert/update/select تقاريرهم فقط (تعديل اليوم فقط)
- Admins: ALL

## أتمتة
- Trigger `trg_notify_admins_daily_report` بيبعت Notification لكل أدمن لما تقرير جديد يُقدَّم

## UI
- `src/components/staff/StaffDailyReport.tsx` — في أعلى صفحة `/admin/staff-home` فوق الـ KPIs
- `src/components/admin/AdminDailyReports.tsx` — لوحة الأدمن (realtime channel) في `/admin → daily-reports`
- تذكير 6 مساءً (badge أحمر pulse) لو الموظف ما قدّمش
