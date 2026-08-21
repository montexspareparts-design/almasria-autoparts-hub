---
name: SEO Prerender Pipeline
description: بناء صفحات HTML ثابتة لكل مسار عام وقت الـ build عبر scripts/prerender.mjs + مصدر واحد للمحتوى scripts/seo-routes.mjs + _redirects
type: feature
---

- `scripts/seo-routes.mjs` = المصدر الوحيد لكل مسار عام (title / description / body عربي قابل للزحف / JSON-LD).
- `scripts/prerender.mjs` يشتغل بعد `vite build` (مربوط في `package.json` → `build`) وينتج:
  - ملف `index.html` حقيقي لكل مسار (49 صفحة) بميتا وcanonical وOG وhreflang خاص بالصفحة.
  - `dist/404.html` بـ `noindex` (يُخدم بحالة 404 حقيقية).
  - `sitemap.xml` بتاريخ `lastmod` تلقائي (يُكتب في dist و public).
- `public/_redirects`: 301 لروابط ووردبريس القديمة (عربي + إنجليزي) + قواعد 200 لمسارات التطبيق (admin/dealer/cart/auth…) + catch-all 404.
- أي صفحة عامة جديدة **لازم** تتضاف في `seo-routes.mjs` وإلا هتطلع 404 للزوّار المباشرين.
- علامات تجارية مضافة: `kyb`, `tp` — وموديل `rumion`.
