# إعادة تصميم الصفحة الرئيسية — Luxury Toyota Experience

طلبك مفصّل ومحدد بالظبط (ألوان/خطوط/سكاشن)، فهنفّذ مباشرة بدون اقتراح اتجاهات بديلة.

## النطاق

- إعادة تصميم **صفحة `/` للزائر/القطاعي (B2C) فقط**.
- B2B (التجار) عندهم Dashboard منفصل ولن يتأثر — قاعدة فصل B2B/B2C في الذاكرة.
- إخفاء الأسعار للزائر غير المسجّل سيظل كما هو ("سجّل لرؤية السعر") — قاعدة جوهرية.
- الـ Navbar الموجود حالياً هيتم تحديث ستايله فقط (مش استبدال logic) عشان أدوار الـ Admin/Dealer/Moderator تستمر تشتغل.

## التغييرات

### 1. Design Tokens (`src/index.css` + `tailwind.config.ts`)
- إضافة tokens جديدة بصيغة HSL:
  - `--carbon: 0 0% 4%` (#0A0A0A خلفية)
  - `--surface: 0 0% 8%` (#141414 كروت)
  - `--toyota-red: 353 92% 48%` (#EB0A1E)
  - `--gold: 44 53% 54%` (#C9A84C) — موجود بالفعل، نتأكد منه
  - `--text-secondary: 0 0% 60%` (#9A9A9A)
- إضافة gradients: `--gradient-spotlight`, `--gradient-red-glow`
- إضافة shadows: `--shadow-red-glow`, `--shadow-spotlight`
- خطوط Google: **Tajawal** (عربي) + **Space Grotesk** (لاتيني) عبر `<link>` في `index.html` مع `&display=swap`.

### 2. HeroSection جديد (`src/components/HeroSection.tsx` — إعادة كتابة)
- خلفية carbon black بالـ token الجديد.
- نص ضخم خلفي `TOYOTA GENUINE PARTS` بحجم clamp(80px → 180px) ولون أبيض شفاف ~6%.
- صورة منتج Toyota أصلي 3D عائمة في المنتصف (هنولّد صورة فلتر/قرص فرامل أصلي على خلفية شفافة via imagegen premium).
- glow أحمر خلف الصورة + parallax float بسيط (CSS keyframes).
- Overlay: `قطع غيار تويوتا الأصلية` (display) + subtext `ضمان الجودة. ضمان الأمان. ضمان تويوتا.`.
- زر CTA أحمر متوهج `تسوق الآن ←` يوجه لـ `/parts-by-type`.
- خطوط حمراء فاصلة.

### 3. Navbar محدث
- إضافة state للـ scroll: شفاف فوق + frosted glass (`backdrop-blur-xl bg-carbon/70`) بعد scroll > 20px.
- زر `اطلب الآن` أحمر pill على اليسار (RTL).
- نحافظ على كل روابط الأدوار الموجودة.

### 4. شريط الثقة الجديد (`src/components/TrustBadgesStrip.tsx`)
- 4 عدّادات متحركة (CountUp on viewport):
  - +5,000 قطعة غيار أصلية
  - ضمان أصالة 100%
  - توصيل سريع
  - +10 سنوات خبرة
- يحل محل `KeyMetrics`.

### 5. قسم المنتجات الأكثر طلباً (`src/components/PopularProducts.tsx` — جديد)
- يستبدل `FeaturedProducts` على الصفحة الرئيسية.
- Tabs الفئات: محرك / فرامل / زيوت / فلاتر / كهرباء.
- كروت داكنة (#141414) + spotlight gradient خلف الصورة + red glow عند الـ hover + fade-up على scroll.
- يلتزم بقاعدة الذاكرة: 3 أعمدة (كود الصنف + بارت نمبر + اسم الصنف) — حالياً مطبّقة في `ProductCard`.
- زر `أضف للسلة` (يستخدم نفس Cart context الموجود).

### 6. قسم "الأصلي يدوم. الرخيص يكلف." (`src/components/WhyGenuineSection.tsx` — جديد)
- Split layout: يسار عنوان bold + اقتباس، يمين 3 كروت (أمان / ضمان / كفاءة).
- خلفية carbon + Toyota logo watermark شفاف ~3%.
- يحل محل `WhyChooseUs`.

### 7. Footer محدث
- خلفية carbon، روابط سريعة، زر WhatsApp أخضر بارز، tagline.
- سيستخدم نفس `Footer.tsx` الموجود مع تحديث ستايله.

### 8. تحديث `src/pages/Index.tsx`
- ترتيب جديد:
  1. Navbar
  2. HeroSection (جديد)
  3. TrustBadgesStrip (جديد)
  4. PopularProducts (جديد)
  5. WhyGenuineSection (جديد)
  6. MaintenanceBundles (يبقى)
  7. DistributionNetwork (يبقى)
  8. FAQ (يبقى)
  9. ContactSimple (يبقى)
  10. Footer
- حذف: AboutBrief, KeyMetrics, ProductsShowcase, FeaturedProducts, WhyChooseUs, MTXSection, OurClientsSection (تخفيف الزحام لصالح Luxury Feel).

### 9. أصول
- توليد صورة hero بـ imagegen premium: "Toyota genuine engine oil filter, floating in space, dramatic red rim light, photorealistic, transparent background, premium product photography".

## ما الذي **لن** يتغير
- لا تعديل على الـ database أو RLS أو edge functions.
- لا تعديل على B2B/Dealer pages.
- لا تعديل على Auth/Cart/Pricing logic.
- ProductCard الداخلي يفضل بنفس الـ 3-column rule.

## ملاحظات
- بعد التنفيذ، الصفحة محتاجة **إعادة نشر** عشان تظهر مباشرة + يحلّ مشكلة Lighthouse Performance المعلّقة.
- التصميم RTL-first مع fallback LTR.

موافق أمشي؟
