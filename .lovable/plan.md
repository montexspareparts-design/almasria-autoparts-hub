## تحسينات احترافية لتقرير موظف الفيصل

التقرير الحالي قوي (13 سؤال + auto stats + sparkline 7 أيام + mood + shoutouts + AI motivation + day-off + shortage requests). دي اقتراحات لرفعه لمستوى «إنتربرايز» مع المحافظة على البساطة للموظف.

---

### 1) KPIs محسوبة تلقائياً (Conversion Rate + Funnel)
دلوقتي الموظف بيدخل الأرقام الخام بس. نضيف **بطاقة KPIs محسوبة لحظياً** فوق الفورم تعرض:
- **معدل التحويل** = `offers_converted / offers_sent × 100%` (لون أخضر لو ≥30%، أصفر 15-30%، أحمر <15%)
- **معدل الإغلاق** = `offers_converted / (offers_converted + lost_opportunities)`
- **متوسط المكالمات لكل عميل جديد** = `calls_count / max(1, new_customers_count)`
- **Funnel بصري صغير**: مكالمات → عروض مرسلة → محوّلة → عملاء جدد (4 أعمدة بطول نسبي)

→ بيخلي الموظف يشوف أداءه فوراً وهو بيدخل الأرقام، والإدارة بتشوف نفس الأرقام في الـ preview/admin.

### 2) أهداف يومية (Daily Targets) مع Progress Rings
جدول جديد `reporter_daily_targets` (admin-managed): لكل موظف هدف لـ `calls_count`، `quotations_count`، `new_customers_count`، `offers_converted_count`. الفورم يعرض **Progress Ring صغير** جنب كل حقل بيمتلي حسب الإدخال.

→ Gamification خفيفة: لو وصل 100% بيظهر ✓ ذهبي. لو فاضل >50% آخر اليوم بيظهر تنبيه «فاضلك X مكالمة للهدف».

### 3) اتساق البيانات (Validation فوري)
الـ `setNum` دلوقتي بيقبل أي رقم. نضيف **تحققات منطقية soft** (warning مش error):
- `offers_converted_count > offers_sent_count` → ⚠️ «المحوّلة أكبر من المرسلة، هل أنت متأكد؟»
- `quotations_count == 0 && offers_sent_count > 0` → ⚠️ «أرسلت عروض بدون عمل عروض أسعار؟»
- `calls_count + whatsapp_count == 0 && new_customers_count > 0` → ⚠️ «إزاي وصلت لعملاء جدد بدون تواصل؟»

Warnings تظهر inline تحت الحقل، الموظف يقدر يكمل لو أكد.

### 4) مقارنة بالفريق (Team Benchmark) — ليه أنت لوحدك؟
حالياً عندك `PersonalCompareCard` لمقارنة شخصية بآخر 7 أيام. نضيف **سطر واحد** تحتها:
- «متوسط الفريق اليوم: X — أنت أعلى/أقل بنسبة Y%»
- بيتحسب من `reporter_daily_reports` لنفس اليوم (anonymous aggregate). 

→ بدون كشف هوية الزملاء، الموظف يعرف موقعه النسبي.

### 5) Streak Counter + Badges
عرض في الـ header:
- 🔥 **سلسلة التسليم**: «أرسلت التقرير X يوم متتالي» — بيتحسب من `reporter_daily_reports.is_submitted`
- 🏆 **شارات** بسيطة: «أول 100 مكالمة الشهر»، «5 عملاء جدد في يوم»، «معدل تحويل >40%»

→ Trigger للذاكرة العضلية (يدخل التقرير كل يوم).

### 6) تنبيه ذكي للحقول الفارغة قبل الإرسال (Smart Submit Guard)
حالياً `submitReport` بيرسل أي حاجة. نضيف check قبل فتح dialog التأكيد:
- لو **أكتر من 60% من الحقول = 0** → modal تحذير «التقرير شبه فاضي، هل أنت متأكد إن ده يومك فعلاً؟» (مع زر «نعم، يومي كان هادي» / «رجوع للتعديل»)
- لو الـ `auto_orders > 0` لكن `offers_converted_count = 0` → ⚠️ «السيستم سجل لك طلبات بس مكتبتش عروض محوّلة، تأكد»

### 7) تصدير PDF احترافي للتقرير اليومي + الأسبوعي
زر «تنزيل PDF» في tab «اليوم» (بعد الإرسال) و tab «الأسبوع»:
- نستخدم `jspdf` + `jspdf-autotable` (موجود بالفعل في المشروع لو تم استخدامه في B2B invoices؛ غير كده نضيفه)
- الـ PDF بيحتوي: ترويسة بشعار المصرية + اسم الموظف + التاريخ + الـ KPIs المحسوبة + الجدول الخام + توقيع الموظف
- مفيد للأرشفة الورقية أو إرسال للإدارة على واتساب كصورة/ملف

### 8) شاشة Admin: Heatmap أسبوعي + Drill-down ساعة بساعة
في `AdminReporterReports.tsx` نضيف tab خامس **«Heatmap»**:
- شبكة 7 أيام × N موظف، كل خانة بلون حسب الـ performance score
- click على خانة → يفتح dialog بكل تفاصيل اليوم
- نظرة سريعة جداً للإدارة: مين شغّال ومين هادي ومتى الذروة

→ Admin يتخذ قرارات أسرع بدون ما يفتح كل تقرير لوحده.

---

## التفاصيل التقنية

### تغييرات قاعدة البيانات
- جدول جديد `reporter_daily_targets` (user_id, calls_target, quotations_target, new_customers_target, offers_converted_target, effective_from, effective_to) + RLS: admin يكتب، الموظف يقرأ تخصه.
- جدول جديد `reporter_badges` (user_id, badge_code, awarded_at, metadata) + view لحساب الـ streak من `reporter_daily_reports`.
- لا تغيير على `reporter_daily_reports` نفسه (الأرقام الموجودة كافية).

### تغييرات الكود
- `src/components/staff/ReporterEnhancements.tsx`:
  - `KPICalculatedCard` (جديد) — بطاقة Conversion + Funnel
  - `TeamBenchmarkLine` (جديد) — سطر مقارنة الفريق
  - `StreakBadge` (جديد) — في الهيدر
  - `DailyTargetsRings` (جديد) — تتغلف حول `NumField`
- `src/components/staff/ReporterDailyForm.tsx`:
  - `validateConsistency()` helper — يرجع array من warnings
  - `smartSubmitGuard()` — قبل فتح `confirmOpen`
  - زر «تنزيل PDF» في `ThankYouDialog` و `RangeSummary`
- `src/lib/reporterPdf.ts` (جديد) — تجميع منطق الـ PDF
- `src/components/admin/AdminReporterReports.tsx`:
  - tab جديد «Heatmap» + component `WeeklyHeatmap`

### نقاط لازم نأكدها قبل التنفيذ
1. تنفّذ كل الـ8 دفعة واحدة، ولا تفضّل أبدأ بأهم 3 بس (KPIs المحسوبة + Daily Targets + Smart Submit Guard)؟
2. جدول `reporter_daily_targets` يكون **هدف موحّد لكل الموظفين** ولا **هدف مخصّص لكل موظف**؟
3. الـ Heatmap في الأدمن: عايزه **شهري** (30 يوم × N موظف) ولا **أسبوعي** (7 أيام)؟
