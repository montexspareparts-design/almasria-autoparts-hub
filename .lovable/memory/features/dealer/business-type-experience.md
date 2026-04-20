---
name: Dealer Business Type Experience
description: تخصيص واجهة التاجر حسب نوع نشاطه (ورشة/شركة/قطاعي/جملة) — بانر ترحيبي + نصائح متغيرة + أصناف ذات أولوية
type: feature
---

## نظرة عامة
- جدول `dealer_accounts` يحتوي عمود `business_type` بـ 4 قيم: `retail` (قطاعي), `corporate` (شركة/هيئة), `wholesale` (جملة), `workshop` (ورشة/مركز صيانة).
- يُحفظ تلقائياً عند إنشاء حساب من lead عبر edge function `create-client-account`.
- التسعير منفصل عن نوع النشاط: workshop + wholesale → `wholesale_tier1`، retail + corporate → `retail`.

## المكون
- `src/components/dealer/DealerBusinessBanner.tsx` يظهر فقط لـ workshop و corporate.
- 3 أقسام:
  1. **Hero Banner**: ترحيب مخصص بالاسم + شارة "خدمة مخصصة لـ..."
  2. **Rotating Tip**: 4 نصائح متغيرة كل 6 ثوان (نصائح صيانة للورش / إدارة أساطيل للشركات).
  3. **Priority Products**: 8 أصناف مفلترة من جدول products بكلمات مفتاحية ذات صلة (workshop: فلتر/زيت/فحمات/بوجي/سير | corporate: فلتر/زيت/محرك/قير).

## التكامل
- في `DealerDashboard.tsx` تبويب `quotes`: البانر يظهر فوق CTA "ابدأ طلبية جديدة".
- النقر على منتج ذا أولوية ينقل إلى `/dealer-product/{id}`.
- `AuthContext` يجلب `business_type` ضمن `dealerAccount`.

## كيف تتغير القيمة
- تلقائي من lead عند إنشاء الحساب (الأدمن يختار النوع في AdminLeads).
- لا يوجد UI لتغييرها لاحقاً (مستقبلاً يمكن إضافتها في AdminCustomerProfile).
