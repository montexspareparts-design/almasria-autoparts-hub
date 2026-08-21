/**
 * Post-build prerenderer.
 * Generates a real static HTML file per public route with unique
 * title / description / canonical / OG tags / JSON-LD and crawlable
 * content, plus a fresh sitemap.xml. React hydrates over it at runtime.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ROUTES, SITE } from "./seo-routes.mjs";
import { LEGACY_REDIRECTS } from "./legacy-redirects.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const shellPath = join(dist, "index.html");

if (!existsSync(shellPath)) {
  console.error("[prerender] dist/index.html not found — run the build first.");
  process.exit(1);
}

const shell = readFileSync(shellPath, "utf8");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function buildHtml(route) {
  const url = `${SITE}${route.path === "/" ? "/" : route.path}`;
  const head = `
    <title>${esc(route.title)}</title>
    <meta name="description" content="${esc(route.description)}" />
    <link rel="canonical" href="${url}" />
    <link rel="alternate" hreflang="ar-EG" href="${url}" />
    <link rel="alternate" hreflang="x-default" href="${url}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="المصرية جروب" />
    <meta property="og:locale" content="ar_EG" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${esc(route.title)}" />
    <meta property="og:description" content="${esc(route.description)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(route.title)}" />
    <meta name="twitter:description" content="${esc(route.description)}" />
    ${(route.schema || [])
      .map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`)
      .join("\n    ")}
  `;

  let html = shell;
  // Remove shell title / description / canonical / og / twitter tags — replaced per route.
  html = html
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+name="description"[^>]*>/gi, "")
    .replace(/<link\s+rel="canonical"[^>]*>/gi, "")
    .replace(/<meta\s+property="og:(?:type|url|title|description|site_name|locale)"[^>]*>/gi, "")
    .replace(/<meta\s+name="twitter:(?:card|title|description)"[^>]*>/gi, "")
    .replace(/<\/head>/i, `${head}\n</head>`);

  const seoBody = `<div id="seo-prerender" data-prerender="1">${route.body}</div>`;
  html = html.replace(/<div id="root">[\s\S]*?<\/div>/i, `<div id="root">${seoBody}</div>`);
  return html;
}

let count = 0;
for (const route of ROUTES) {
  const outDir = route.path === "/" ? dist : join(dist, route.path.replace(/^\//, ""));
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), buildHtml(route), "utf8");
  count++;
}

// Legacy URL redirects as real static pages (hosting ignores _redirects).
function buildRedirectHtml(newPath) {
  const target = `${SITE}${newPath}`;
  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>تم نقل الصفحة | المصرية جروب</title>
<link rel="canonical" href="${target}" />
<meta http-equiv="refresh" content="0; url=${newPath}" />
</head>
<body>
<p>تم نقل هذه الصفحة إلى عنوان جديد. لو لم يتم تحويلك تلقائيًا، اضغط على الرابط:</p>
<p><a href="${newPath}">${target}</a></p>
<script>location.replace(${JSON.stringify(newPath)});</script>
</body>
</html>
`;
}

let redirectCount = 0;
for (const [oldPath, newPath] of Object.entries(LEGACY_REDIRECTS)) {
  const outDir = join(dist, oldPath.replace(/^\//, ""));
  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, "index.html"), buildRedirectHtml(newPath), "utf8");
  redirectCount++;
}


// Real 404 page (host serves it with a 404 status).
const notFound = buildHtml({
  path: "/404",
  title: "الصفحة غير موجودة (404) | المصرية جروب",
  description: "الصفحة المطلوبة غير موجودة. تصفح كتالوج قطع غيار وزيوت تويوتا الأصلية من المصرية جروب.",
  body: `<h1>الصفحة غير موجودة</h1><p>الرابط اللي فتحته مش موجود. جرّب الرجوع للرئيسية أو تصفح الكتالوج.</p>
    <ul><li><a href="/">الرئيسية</a></li><li><a href="/products">الكتالوج</a></li><li><a href="/parts-by-model">حسب الموديل</a></li></ul>`,
}).replace(
  /<meta name="robots"[^>]*>/i,
  '<meta name="robots" content="noindex, follow" />'
);
writeFileSync(join(dist, "404.html"), notFound, "utf8");

// Sitemap generated from the same source of truth.
const today = new Date().toISOString().slice(0, 10);
const priority = (p) => (p === "/" ? "1.0" : p.split("/").length <= 2 ? "0.9" : "0.8");
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ROUTES.map(
  (r) => `  <url>
    <loc>${SITE}${r.path === "/" ? "/" : r.path}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${priority(r.path)}</priority>
  </url>`
).join("\n")}
</urlset>
`;
writeFileSync(join(dist, "sitemap.xml"), sitemap, "utf8");
writeFileSync(join(root, "public", "sitemap.xml"), sitemap, "utf8");

console.log(`[prerender] wrote ${count} pages + 404.html + sitemap.xml`);
