/**
 * Post-build prerenderer.
 * Generates a real static HTML file per public route with unique
 * title / description / canonical / OG tags / JSON-LD and crawlable
 * content, plus a fresh sitemap.xml. React hydrates over it at runtime.
 */
import { mkdirSync, writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { ROUTES, SITE, ORG_SCHEMA, buildBreadcrumb, COMMON_LINKS, FIT_ANSWER } from "./seo-routes.mjs";
import { MODELS, TYPES, BUSINESS, matchModels, matchType } from "../src/data/seoShared.js";
import { LEGACY_REDIRECTS } from "./legacy-redirects.mjs";
import { buildFeeds } from "./product-feed.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");
const shellPath = join(dist, "index.html");

const OG_IMAGE = `${SITE}/pwa-512x512.png`;

const WEBSITE_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "المصرية جروب",
  url: SITE,
  inLanguage: "ar-EG",
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE}/products?search={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

if (!existsSync(shellPath)) {
  console.error("[prerender] dist/index.html not found — run the build first.");
  process.exit(1);
}

const shell = readFileSync(shellPath, "utf8");
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function buildHtml(route) {
  const url = `${SITE}${route.path === "/" ? "/" : route.path}`;
  const image = route.image || OG_IMAGE;
  const schemas = [ORG_SCHEMA, WEBSITE_SCHEMA, ...(route.schema || [])];
  const head = `
    <title>${esc(route.title)}</title>
    <meta name="description" content="${esc(route.description)}" />
    <link rel="canonical" href="${url}" />
    <link rel="alternate" hreflang="ar-EG" href="${url}" />
    <meta name="robots" content="${route.noindex ? "noindex, follow" : "index, follow, max-image-preview:large"}" />
    <meta property="og:type" content="${route.ogType || "website"}" />
    <meta property="og:site_name" content="المصرية جروب" />
    <meta property="og:locale" content="ar_EG" />
    <meta property="og:url" content="${url}" />
    <meta property="og:title" content="${esc(route.title)}" />
    <meta property="og:description" content="${esc(route.description)}" />
    <meta property="og:image" content="${esc(image)}" />
    <meta property="og:image:alt" content="${esc(route.title)}" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${esc(route.title)}" />
    <meta name="twitter:description" content="${esc(route.description)}" />
    <meta name="twitter:image" content="${esc(image)}" />
    ${schemas
      .map((s) => `<script type="application/ld+json">${JSON.stringify(s)}</script>`)
      .join("\n    ")}
  `;

  let html = shell;
  // Remove shell title / description / canonical / og / twitter tags — replaced per route.
  html = html
    .replace(/<title>[\s\S]*?<\/title>/i, "")
    .replace(/<meta\s+name="description"[^>]*>/gi, "")
    .replace(/<link\s+rel="canonical"[^>]*>/gi, "")
    .replace(/<meta\s+property="og:(?:type|url|title|description|site_name|locale|image)"[^>]*>/gi, "")
    .replace(/<meta\s+name="twitter:(?:card|title|description|image)"[^>]*>/gi, "")
    .replace(/<\/head>/i, `${head}\n</head>`);

  const seoBody = `<div id="seo-prerender" data-prerender="1">${route.body}</div>`;
  html = html.replace(/<div id="root">[\s\S]*?<\/div>/i, `<div id="root">${seoBody}</div>`);
  return html;
}


/* ── Individual product pages (fetched from the live catalog) ── */
function readEnv() {
  const out = {};
  for (const f of [".env", ".env.local", ".env.production"]) {
    const p = join(root, f);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?([^"\n\r]*)"?\s*$/);
      if (m) out[m[1]] = m[2];
    }
  }
  return { ...out, ...process.env };
}

const BRAND_LABEL = {
  toyota_genuine: "تويوتا أصلي",
  denso: "DENSO",
  aisin: "AISIN",
  mtx_aftermarket: "MTX",
  fbk: "FBK",
  kyb: "KYB",
  tp: "TP",
};

async function fetchProducts() {
  const env = readEnv();
  const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    throw new Error("[prerender] missing Supabase env — refusing to publish a site without product pages.");
  }
  const all = [];
  const PAGE = 1000;
  for (let from = 0; ; from += PAGE) {
    const res = await fetch(
      `${url}/rest/v1/products?select=sku,base_price,part_number,name_ar,name_en,description_ar,brand,image_url,stock_quantity,erp_item_code,compatible_models,updated_at&is_active=eq.true&order=sku.asc`,
      { headers: { apikey: key, Authorization: `Bearer ${key}`, Range: `${from}-${from + PAGE - 1}`, "Range-Unit": "items" } }
    );
    if (!res.ok) throw new Error(`[prerender] product fetch failed: HTTP ${res.status} — build stopped to keep the last good release.`);
    const batch = await res.json();
    all.push(...batch);
    if (batch.length < PAGE) break;
  }
  if (all.length === 0) throw new Error("[prerender] product fetch returned 0 products — build stopped.");
  return all;
}

const products = (await fetchProducts()).filter((p) => p.sku && /^[A-Za-z0-9_-]+$/.test(String(p.sku)));

const productRoutes = products.map((p) => {
  const brand = BRAND_LABEL[p.brand] || "تويوتا";
  const partNumber = p.part_number || "";
  const typeAr = TYPES.find((t) => t.slug === matchType(p.name_ar))?.ar;
  const fits = matchModels(p.name_ar).map((slug) => MODELS.find((m) => m.slug === slug));
  // Part-number-first titles: shoppers search by part number (e.g. 90915-YZZN2).
  const pnCompact = partNumber.replace(/[\s-]/g, "");
  const priceTxt = Number(p.base_price) > 0 ? ` بسعر ${Number(p.base_price).toFixed(0)} ج.م` : "";
  const title = (partNumber
    ? `${partNumber} ${p.name_ar} ${brand} أصلي${priceTxt} | المصرية`
    : `${p.name_ar} ${brand} أصلي${priceTxt} | المصرية`).slice(0, 110);
  const waText = encodeURIComponent(`عايز أطلب: ${p.name_ar}\nكود الصنف: ${p.erp_item_code || p.sku}\n${SITE}/product/${p.sku}`);
  const description =
    `${partNumber ? `${partNumber} (${pnCompact}) ` : ""}${p.name_ar} — ${brand} أصلي${priceTxt}. ${Number(p.stock_quantity) > 0 ? "متوفر الآن" : "اطلبه"} من المصرية جروب، موزع معتمد تويوتا — شحن لكل محافظات مصر ومجاني فوق 3000 ج.م.`.slice(
      0,
      300
    );
  return {
    path: `/product/${p.sku}`,
    lastmod: p.updated_at ? String(p.updated_at).slice(0, 10) : undefined,
    title,
    description,
    ogType: "product",
    image: p.image_url && /^https?:\/\//.test(p.image_url) ? p.image_url : undefined,
    body: `<h1>${esc(p.name_ar)}</h1>
      <ul>
        <li>كود الصنف: ${esc(p.erp_item_code || p.sku)}</li>
        ${partNumber ? `<li>بارت نمبر: ${esc(partNumber)}${pnCompact !== partNumber ? ` (${esc(pnCompact)})` : ""}</li>` : ""}
        <li>العلامة: ${esc(brand)}</li>
        ${Number(p.base_price) > 0 ? `<li>السعر: ${Number(p.base_price).toFixed(2)} جنيه</li>` : ""}
        <li>الحالة: ${Number(p.stock_quantity) > 0 ? "متوفر" : "غير متوفر حاليًا"}</li>
      </ul>
      <p>${esc(p.description_ar || `${p.name_ar} من المصرية جروب — موزع معتمد لقطع غيار وزيوت تويوتا الأصلية في مصر. للاستعلام عن السعر والتوفر تواصل معنا.`)}</p>
      ${typeAr ? `<p>نوع القطعة: ${esc(typeAr)}</p>` : ""}
      ${fits.length ? `<h2>السيارات المتوافقة</h2><table><tr><th>الموديل</th><th>الصفحة</th></tr>${fits.map((m) => `<tr><td>تويوتا ${m.ar} (${m.en})</td><td><a href="/parts-by-model/${m.slug}">قطع غيار ${m.ar}</a></td></tr>`).join("")}</table>` : ""}
      <p><a href="https://wa.me/${BUSINESS.whatsapp}?text=${waText}">اطلب القطعة على واتساب</a> · <a href="/products">تصفح كل الكتالوج</a></p>
      ${FIT_ANSWER}
      ${COMMON_LINKS}`,
    schema: [
      {
        "@context": "https://schema.org",
        "@type": "Product",
        name: p.name_ar,
        sku: String(p.erp_item_code || p.sku),
        ...(partNumber ? { mpn: partNumber } : {}),
        brand: { "@type": "Brand", name: brand },
        ...(p.image_url && /^https?:\/\//.test(p.image_url) ? { image: p.image_url } : {}),
        description: p.description_ar || p.name_ar,
        url: `${SITE}/product/${p.sku}`,
        offers: {
          "@type": "Offer",
          priceCurrency: "EGP",
          ...(Number(p.base_price) > 0 ? { price: Number(p.base_price).toFixed(2) } : {}),
          availability:
            Number(p.stock_quantity) > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          url: `${SITE}/product/${p.sku}`,
          seller: { "@type": "Organization", name: "المصرية جروب" },
        },
      },
      buildBreadcrumb([
        { name: "الرئيسية", path: "/" },
        { name: "الكتالوج", path: "/products" },
        { name: p.name_ar, path: `/product/${p.sku}` },
      ]),
    ],
  };
});

const productCard = (p) => {
  const price = Number(p.base_price) > 0 ? `${Number(p.base_price).toFixed(2)} جنيه` : "السعر عند الطلب";
  return `<li><a href="/product/${p.sku}">${esc(p.name_ar)}</a> — كود ${esc(p.erp_item_code || p.sku)}${p.part_number ? ` — بارت نمبر ${esc(p.part_number)}` : ""} — ${price} — ${Number(p.stock_quantity) > 0 ? "متوفر" : "غير متوفر حاليًا"}</li>`;
};
const classified = products.map((p) => ({ p, models: matchModels(p.name_ar), type: matchType(p.name_ar) }));
let emptyCross = 0;
const categoryRoutes = ROUTES.map((r) => {
  if (!r.seoModel && !r.seoType) return r;
  const list = classified
    .filter((c) => (!r.seoModel || c.models.includes(r.seoModel)) && (!r.seoType || c.type === r.seoType))
    .map((c) => c.p)
    .sort((a, b) => (Number(b.stock_quantity) > 0) - (Number(a.stock_quantity) > 0));
  const isCross = r.seoModel && r.seoType;
  if (isCross && list.length === 0) {
    emptyCross++;
    return { ...r, noindex: true, noSitemap: true };
  }
  if (list.length === 0) return { ...r, body: r.body.replace(COMMON_LINKS, `${FIT_ANSWER}${COMMON_LINKS}`) };
  const shown = list.slice(0, 40);
  const block = `<section><h2>منتجات متاحة (${list.length} صنف)</h2><ul>${shown.map(productCard).join("")}</ul></section>${FIT_ANSWER}`;
  const itemList = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: r.title,
    numberOfItems: list.length,
    itemListElement: shown.map((p, i) => ({ "@type": "ListItem", position: i + 1, url: `${SITE}/product/${p.sku}`, name: p.name_ar })),
  };
  return { ...r, body: r.body.replace(COMMON_LINKS, `${block}${COMMON_LINKS}`), schema: [...(r.schema || []), itemList] };
});

const ALL_ROUTES = [...categoryRoutes, ...productRoutes];

let count = 0;
for (const route of ALL_ROUTES) {
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
const priority = (p) =>
  p === "/" ? "1.0" : p.startsWith("/product/") ? "0.6" : p.split("/").length <= 2 ? "0.9" : "0.8";
const encodeLoc = (p) =>
  `${SITE}${p === "/" ? "/" : p}`.replace(/&/g, "&amp;");
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${ALL_ROUTES.filter((r) => !r.noSitemap).map(
  (r) => `  <url>
    <loc>${encodeLoc(r.path)}</loc>
${r.lastmod ? `    <lastmod>${r.lastmod}</lastmod>\n` : ""}    <changefreq>weekly</changefreq>
    <priority>${priority(r.path)}</priority>
  </url>`
).join("\n")}
</urlset>
`;
writeFileSync(join(dist, "sitemap.xml"), sitemap, "utf8");
writeFileSync(join(root, "public", "sitemap.xml"), sitemap, "utf8");

const feedCount = await buildFeeds();

console.log(
  `[prerender] wrote ${count} pages (${productRoutes.length} products, ${emptyCross} empty model×type pages noindexed) + ${redirectCount} legacy redirects + 404.html + sitemap.xml + feeds (${feedCount} items)`
);

