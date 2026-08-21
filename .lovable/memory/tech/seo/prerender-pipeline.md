---
name: SEO Prerender Pipeline
description: بناء صفحات HTML ثابتة لكل مسار عام وقت الـ build عبر scripts/prerender.mjs + مصدر واحد للمحتوى scripts/seo-routes.mjs + تحويلات قديمة كصفحات ثابتة من scripts/legacy-redirects.mjs
type: feature
---

- `scripts/seo-routes.mjs` = المصدر الوحيد لكل مسار عام (title / description / body عربي قابل للزحف / JSON-LD). العدد الحالي: **49 مسار**.
- `scripts/prerender.mjs` يشتغل بعد `vite build` (مربوط في `package.json` → `build`) وينتج:
  - ملف `index.html` حقيقي لكل مسار (49 صفحة) بميتا وcanonical وOG وhreflang خاص بالصفحة.
  - **25 صفحة تحويل ثابتة** للروابط القديمة (canonical + `meta http-equiv="refresh" content="0; …"` + `location.replace`، **بدون noindex**) — الاستضافة بتتجاهل `public/_redirects` فمقدرش نعمل 301 حقيقي.
  - `dist/404.html` بـ `noindex`.
  - `sitemap.xml` بتاريخ `lastmod` تلقائي (يُكتب في dist و public) — **بدون** أي رابط قديم.
- `scripts/legacy-redirects.mjs` = المصدر الوحيد للروابط القديمة `{ oldPath: newPath }`. أي رابط ووردبريس قديم جديد يتضاف هنا فقط، مش في `seo-routes.mjs`.
- الـ404: الاستضافة بترجع 200 لأي مسار مجهول، فالاعتماد على catch-all في راوتر الـSPA (`src/pages/NotFound.tsx`) اللي بيحقن `noindex, follow` عبر react-helmet-async وقت التشغيل (حل soft-404 المعتمد في الـSPA).
- `public/_redirects` متسيب كتوثيق/توافق فقط، وبلوك مسارات التطبيق مابقاش فيه المسارات العامة المفهرسة (`/products/*`, `/parts-by-model/*`, `/parts-by-type/*`, `/clients/*`, `/guides/*`).
- علامات تجارية مضافة: `kyb`, `tp` — وموديل `rumion`.

