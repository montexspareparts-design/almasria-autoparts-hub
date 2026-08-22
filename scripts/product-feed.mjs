/**
 * Generates shopping feeds at build time:
 *  - dist/merchant-feed.xml     → Google Merchant Center (Free listings + Shopping ads)
 *  - dist/facebook-catalog.csv  → Meta (Facebook/Instagram) catalog + remarketing
 *
 * Only products with a public price and a real image are exported —
 * Google rejects items without either.
 */
import { writeFileSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { SITE } from "./seo-routes.mjs";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

const BRAND_LABEL = {
  toyota_genuine: "Toyota",
  denso: "DENSO",
  aisin: "AISIN",
  mtx_aftermarket: "MTX",
  fbk: "FBK",
  kyb: "KYB",
  tp: "TP",
};

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

const esc = (s) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const csvCell = (s) => `"${String(s ?? "").replace(/"/g, '""').replace(/\r?\n/g, " ")}"`;

export async function buildFeeds() {
  const env = readEnv();
  const url = env.VITE_SUPABASE_URL || env.SUPABASE_URL;
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY || env.SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) {
    console.warn("[feeds] no Supabase env — skipping product feeds.");
    return 0;
  }

  let rows = [];
  try {
    const res = await fetch(
      `${url}/rest/v1/products?select=sku,part_number,erp_item_code,name_ar,description_ar,brand,image_url,stock_quantity,base_price&is_active=eq.true&order=sku.asc&limit=3000`,
      { headers: { apikey: key, Authorization: `Bearer ${key}` } }
    );
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    rows = await res.json();
  } catch (err) {
    console.warn(`[feeds] fetch failed (${err.message}) — skipping product feeds.`);
    return 0;
  }

  const items = rows.filter(
    (p) =>
      p.sku &&
      /^[A-Za-z0-9_-]+$/.test(String(p.sku)) &&
      Number(p.base_price) > 0 &&
      p.image_url &&
      /^https?:\/\//.test(p.image_url)
  );

  /* ---------- Google Merchant Center (RSS 2.0) ---------- */
  const xmlItems = items
    .map((p) => {
      const brand = BRAND_LABEL[p.brand] || "Toyota";
      const link = `${SITE}/product/${p.sku}`;
      const availability = Number(p.stock_quantity) > 0 ? "in_stock" : "backorder";
      const title = `${p.name_ar}${p.part_number ? ` ${p.part_number}` : ""}`.slice(0, 150);
      const desc = (p.description_ar || `${p.name_ar} — ${brand}. قطع غيار تويوتا من المصرية جروب.`).slice(0, 4000);
      return `  <item>
    <g:id>${esc(p.sku)}</g:id>
    <g:title>${esc(title)}</g:title>
    <g:description>${esc(desc)}</g:description>
    <g:link>${esc(link)}</g:link>
    <g:image_link>${esc(p.image_url)}</g:image_link>
    <g:availability>${availability}</g:availability>
    <g:price>${Number(p.base_price).toFixed(2)} EGP</g:price>
    <g:condition>new</g:condition>
    <g:brand>${esc(brand)}</g:brand>
    ${p.part_number ? `<g:mpn>${esc(p.part_number)}</g:mpn>` : ""}
    <g:identifier_exists>${p.part_number ? "yes" : "no"}</g:identifier_exists>
    <g:google_product_category>913</g:google_product_category>
    <g:product_type>قطع غيار سيارات &gt; ${esc(brand)}</g:product_type>
    <g:shipping><g:country>EG</g:country><g:service>Standard</g:service><g:price>0 EGP</g:price></g:shipping>
  </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
<channel>
  <title>المصرية جروب — قطع غيار تويوتا</title>
  <link>${SITE}</link>
  <description>كتالوج قطع غيار وزيوت تويوتا الأصلية — المصرية جروب</description>
${xmlItems}
</channel>
</rss>`;
  writeFileSync(join(dist, "merchant-feed.xml"), xml, "utf8");

  /* ---------- Meta (Facebook/Instagram) catalog CSV ---------- */
  const header = [
    "id",
    "title",
    "description",
    "availability",
    "condition",
    "price",
    "link",
    "image_link",
    "brand",
    "mpn",
    "product_type",
  ].join(",");

  const csv = [
    header,
    ...items.map((p) => {
      const brand = BRAND_LABEL[p.brand] || "Toyota";
      return [
        csvCell(p.sku),
        csvCell(`${p.name_ar}${p.part_number ? ` ${p.part_number}` : ""}`.slice(0, 150)),
        csvCell((p.description_ar || `${p.name_ar} — ${brand}`).slice(0, 5000)),
        csvCell(Number(p.stock_quantity) > 0 ? "in stock" : "available for order"),
        csvCell("new"),
        csvCell(`${Number(p.base_price).toFixed(2)} EGP`),
        csvCell(`${SITE}/product/${p.sku}`),
        csvCell(p.image_url),
        csvCell(brand),
        csvCell(p.part_number || ""),
        csvCell(`قطع غيار سيارات > ${brand}`),
      ].join(",");
    }),
  ].join("\n");

  writeFileSync(join(dist, "facebook-catalog.csv"), csv, "utf8");

  return items.length;
}
