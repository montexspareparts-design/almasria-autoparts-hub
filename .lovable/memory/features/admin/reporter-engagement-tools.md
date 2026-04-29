---
name: Reporter Engagement Tools
description: 4 ميزات تفاعلية في تقرير الموظف اليومي — مقارنة شخصية، Mood، شكر زميل (إشعار تلقائي)، وسؤال ذكي للتقييم العالي مع أداء ضعيف
type: feature
---

## في `ReporterDailyForm.tsx` (عبر `ReporterEnhancements.tsx`)

### 1) PersonalCompareCard 📊
- بتعرض في تبويب "اليوم" قبل الفورم
- 3 كروت: امبارح / متوسط آخر 7 أيام / أفضل يوم
- لما الموظف يبدأ يكتب الأرقام → يظهر مقارنة Live بأداء النهاردة vs المتوسط (% trend)
- نفس صيغة `performanceScore` المستخدمة في `reporter-motivational-message`

### 2) Mood Selector 😄😐😞
- 3 emojis (happy/neutral/sad) — حقل `mood` في `reporter_daily_reports`
- مش بيأثر على التقييم، بيتشاف للأدمن (early burnout detection)

### 3) Shoutout 👏
- اختيار زميل من dropdown (reporters + admins + moderators) + سبب اختياري
- DB Trigger `notify_shoutout_recipient` بيبعت notification "شكر من زميل" تلقائياً عند الإرسال

### 4) Why Good Day Question ✨
- بتظهر بشرط: `self_rating >= 9` + `todayScore < 25`
- Textarea اختيارية بـ "إيه اللي خلى يومك حلو؟" — لالتقاط insights عن المزاج

## DB
- 4 أعمدة جديدة: `mood`, `shoutout_user_id`, `shoutout_reason`, `why_good_day`
- Trigger `trg_notify_shoutout_recipient` على `reporter_daily_reports` (AFTER INSERT/UPDATE)

## Cron
- `reporter-daily-reminder-5pm` cron بتشتغل يومياً 5 مساءً وبتبعت notification للموظف اللي مبعتش تقرير
