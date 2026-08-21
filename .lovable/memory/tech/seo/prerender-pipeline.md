---
name: SEO Prerender Pipeline
description: بناء صفحات HTML ثابتة لكل مسار عام وقت الـ build عبر scripts/prerender.mjs + مصدر واحد للمحتوى scripts/seo-routes.mjs + صفحات منتجات ديناميكية + فروع + تقاطع موديل×نوع + تحويلات قديمة ثابتة
type: feature
---

- `scripts/seo-routes.mjs` = المصدر الوحيد للمسارات الثابتة (title / description / body عربي / JSON-LD). دلوقتي بيشمل:
  - المسارات الأساسية + العلامات + الأدلة + `/clients/*`
  - **77 صفحة تقاطع** `/parts-by-model/:model/:type` (11 موديل × 7 أنواع) مع لينكات داخلية متبادلة
  - `/branches` + 3 صفحات فرع (`osim`, `tawfikia`, `luxor`) بـ `AutoPartsStore` schema (Local SEO)
  - يصدّر كمان `ORG_SCHEMA` و`buildBreadcrumb` و`COMMON_LINKS` لاستخدام prerender
- `scripts/prerender.mjs` بيشتغل بعد `vite build` وبينتج **588 صفحة** = المسارات الثابتة + **459 صفحة منتج** `/product/:sku` بتتسحب وقت البناء من REST API لجدول `products` (`is_active=true`) بـ anon key من `.env` (fail-soft لو مفيش env).
  - كل صفحة فيها `og:image` + `twitter:image` + `Organization` + `WebSite` schema تلقائيًا، وصفحات المنتج فيها `Product` + `Offer` (بدون سعر — الأسعار مخفية للزوار) + breadcrumbs.
  - **26 صفحة تحويل ثابتة** من `scripts/legacy-redirects.mjs` (canonical + meta refresh + `location.replace`، بدون noindex) لأن الاستضافة بتتجاهل `public/_redirects`.
  - `dist/404.html` بـ `noindex` + `sitemap.xml` (588 رابط، يُكتب في dist و public).
- نظائر React للمسارات الجديدة: `src/pages/ModelPartTypePage.tsx`, `src/pages/BranchesPage.tsx`, `src/pages/PublicProductPage.tsx` + بيانات مشتركة في `src/data/seoTaxonomy.ts` (**لازم تفضل متطابقة مع seo-routes.mjs**).
- توحيد النطاق: سكربت في `<head>` بـ `index.html` بيحوّل apex → `www.almasriaautoparts.com`.
- `genuine-toyota-parts` اتشال كمسار مكرر وبقى legacy redirect لـ `/products/toyota-genuine`.
- الـ404: الاستضافة بترجع 200، فالاعتماد على catch-all في الراوتر (`NotFound.tsx`) اللي بيحقن `noindex, follow`.
- `public/_redirects` و`public/_headers` توثيقيين فقط (الاستضافة مش بتقراهم).
