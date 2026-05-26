import { memo, useState, useCallback, useRef } from "react";
import { Package, Lock, Eye, ShoppingCart, Check, Sparkles, Bell, BellOff } from "lucide-react";
import { LazyImage } from "@/components/ui/lazy-image";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageBadge, ImageBadgeColumn } from "@/components/ui/image-badge";
import AnimatedPrice from "@/components/ui/animated-price";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// accent = اللون المميز للبراند (يستخدم في ring + dot على base أسود فاخر موحد)
const brandRouteMap: Record<string, { label: string; accent: string; path: string }> = {
  toyota_genuine: { label: "تويوتا أصلي", accent: "hsl(355 85% 58%)", path: "/products/toyota-genuine" },   // أحمر تويوتا
  toyota_oils:    { label: "زيوت تويوتا", accent: "hsl(40 90% 58%)",  path: "/products/toyota-oils" },     // ذهبي
  mtx_aftermarket:{ label: "MTX",        accent: "hsl(210 90% 60%)", path: "/products/mtx" },              // أزرق
  denso:          { label: "DENSO",      accent: "hsl(160 75% 50%)", path: "/products/denso" },            // أخضر زمردي
  aisin:          { label: "AISIN",      accent: "hsl(270 70% 65%)", path: "/products/aisin" },            // بنفسجي
  fbk:            { label: "FBK",        accent: "hsl(25 90% 58%)",  path: "/products/fbk" },              // برتقالي
};

interface ProductCardProps {
  product: any;
  index: number;
  viewMode: "grid" | "list";
  user: any;
  isDealer: boolean;
  isRetailTier?: boolean;
  viewedProductIds: string[];
  limitReached: boolean;
  dailyViewCount: number;
  dailyLimit: number;
  /** Year extracted from current search query — used to show "fits YYYY" badge */
  searchYear?: number | null;
  getProductPrice: (product: any) => number;
  onProductClick: (product: any) => void;
  onAddToCart: (product: any) => void;
  onRecordView: (productId: string) => void;
  onLoginRequired: () => void;
}

/** Categories where year-coverage badge is irrelevant (e.g. oils — not tied to model year). */
const NO_YEAR_COVERAGE_CATEGORIES = new Set([
  "oils-gasoline",
  "oils-diesel",
  "oils-transmission",
]);

const isOilProduct = (product: any): boolean => {
  if (product?.brand === "toyota_oils") return true;
  const catSlug = product?.product_categories?.slug || product?.category_slug;
  if (catSlug && NO_YEAR_COVERAGE_CATEGORIES.has(catSlug)) return true;
  const catNameAr = product?.product_categories?.name_ar || "";
  if (catNameAr.includes("زيت") || catNameAr.includes("زيوت")) return true;
  return false;
};

/** Build coverage label like "يناسب موديلات 2005-2019 ✓" */
const buildCoverageLabel = (
  product: any,
  searchYear?: number | null
): { text: string; isAlternative: boolean } | null => {
  // الزيوت لا ترتبط بسنة الموديل — لا تعرض بادج التغطية
  if (isOilProduct(product)) return null;

  const yf = product.year_from as number | null;
  const yt = product.year_to as number | null;
  if (!yf) return null;
  const range = yt && yt > yf ? `${yf}-${yt}` : `${yf}+`;
  // Did the user search by a specific year?
  if (searchYear) {
    const fits = (!yt || searchYear <= yt) && searchYear >= yf;
    if (!fits) return null;
    // Check if the product name itself contains the searched year — if not, it's an "alternative"
    const nameHasYear = String(product.name_ar || "").includes(String(searchYear));
    return {
      text: nameHasYear ? `يناسب ${searchYear} ✓` : `يركّب على ${searchYear} ✓ (موديلات ${range})`,
      isAlternative: !nameHasYear,
    };
  }
  return { text: `يناسب موديلات ${range}`, isAlternative: false };
};

const ProductCard = memo(({
  product, index, viewMode, user, isDealer, isRetailTier = false, viewedProductIds,
  limitReached, dailyViewCount, dailyLimit, searchYear,
  getProductPrice, onProductClick, onAddToCart, onRecordView, onLoginRequired,
}: ProductCardProps) => {

  const stockAvailable = product.stock_quantity > 0;
  const hasViewed = viewedProductIds.includes(product.id);
  const canSeePrice = user && (!isDealer || isRetailTier || hasViewed);
  const price = canSeePrice ? (isDealer && !isRetailTier ? getProductPrice(product) : product.base_price) : null;
  const coverage = buildCoverageLabel(product, searchYear);

  if (viewMode === "list") {
    return (
      <div
        dir="rtl"
        className="group relative bg-card rounded-2xl overflow-hidden cursor-pointer flex
          border border-border/40
          shadow-[0_2px_8px_rgba(0,0,0,0.04)]
          hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)]
          hover:border-primary/30
          transition-all duration-500"
        onClick={() => onProductClick(product)}
      >
        {/* Image — fixed square frame across breakpoints, consistent inner padding.
            Z-INDEX LADDER (list mode) — keep in sync with grid mode below:
              z-0  : LazyImage skeleton (inside the padded box)
              z-1  : The image itself, hover shimmer base
              z-10 : Decorative sweep overlay
              z-30 : Floating badges (Sale here, Stock/Brand on grid)
            The skeleton MUST stay at the bottom so badges remain visually
            anchored while the image is still decoding. */}
        <div className="w-28 sm:w-40 md:w-48 aspect-square shrink-0 bg-white relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white via-white to-muted/10" />
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out z-10 pointer-events-none" />
          {/* Padded inner box keeps every product image inside the same usable area */}
          <div className="absolute inset-0 p-3 sm:p-4 flex items-center justify-center">
            {product.image_url ? (
              <LazyImage
                src={product.image_url}
                alt={product.name_ar}
                wrapperClassName="w-full h-full flex items-center justify-center"
                className="max-w-full max-h-full w-auto h-auto object-contain mix-blend-multiply relative z-[1] group-hover:scale-110 transition-transform duration-700"
                optimizeWidth={240}
                placeholderIcon={
                  <Package
                    className="w-10 h-10 text-muted-foreground/25"
                    strokeWidth={1.25}
                  />
                }
              />
            ) : (
              // Same icon, same color, same stroke as the LazyImage placeholder
              // → cards without an image look identical to cards still loading.
              <Package
                className="w-10 h-10 text-muted-foreground/25 relative z-[1]"
                strokeWidth={1.25}
              />
            )}
          </div>
          {product.is_on_sale && (
            <Badge className="absolute top-2 end-2 z-30 bg-destructive text-destructive-foreground text-[8px] font-black px-2 py-0.5 shadow-lg shadow-destructive/30 rounded-lg">
              تخفيض
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-3 sm:p-4 flex flex-col justify-center min-w-0 gap-1.5 sm:gap-2 text-right" onClick={(e) => e.stopPropagation()}>
          {/* Top row: badges only — SKU lives on its own line */}
          <div className="flex items-center justify-end gap-1.5 sm:gap-2 flex-nowrap">
            <StockBadge available={stockAvailable} />
            {brandRouteMap[product.brand] && (
              <Link
                to={brandRouteMap[product.brand].path}
                className="inline-flex items-center gap-1 text-[7px] sm:text-[9px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md hover:opacity-80 transition-opacity shadow-sm whitespace-nowrap bg-gradient-to-b from-[hsl(220_25%_14%)] to-[hsl(220_30%_7%)] text-white ring-1"
                style={{ ['--accent' as any]: brandRouteMap[product.brand].accent, boxShadow: `inset 0 0 0 1px ${brandRouteMap[product.brand].accent}55` }}
                onClick={(e) => e.stopPropagation()}
              >
                <span aria-hidden className="w-1 h-1 rounded-full" style={{ background: brandRouteMap[product.brand].accent, boxShadow: `0 0 4px ${brandRouteMap[product.brand].accent}` }} />
                {brandRouteMap[product.brand].label}
              </Link>
            )}
          </div>
          {/* Part Number — single line, logical alignment so it sits at the inline-start in both RTL and LTR */}
          <div className="w-full text-start overflow-hidden">
            <bdi
              title={(product as any).part_number || product.sku}
              className="inline-block max-w-full truncate align-middle text-[8px] sm:text-[10px] font-mono bg-muted/40 text-muted-foreground/70 px-1.5 sm:px-2 py-0.5 rounded-md leading-none tracking-widest whitespace-nowrap select-all"
            >
              {(product as any).part_number || product.sku}
            </bdi>
          </div>
          <h3 className="font-bold text-card-foreground text-[11px] sm:text-sm leading-snug sm:leading-relaxed line-clamp-2 group-hover:text-primary transition-colors duration-300 text-right">
            {product.name_ar}
          </h3>
          {coverage && (
            <span
              className={`group/cov relative inline-flex items-center gap-1.5 self-end text-[9px] sm:text-[10px] font-semibold px-2 py-0.5 rounded-full leading-none backdrop-blur-sm transition-all duration-300 hover:scale-[1.03] ${
                coverage.isAlternative
                  ? "bg-amber-500/8 text-amber-700 dark:text-amber-300"
                  : "bg-emerald-500/8 text-emerald-700 dark:text-emerald-300"
              }`}
            >
              <span
                aria-hidden
                className={`relative flex h-1.5 w-1.5 rounded-full ${
                  coverage.isAlternative ? "bg-amber-500" : "bg-emerald-500"
                }`}
              >
                <span
                  className={`absolute inset-0 rounded-full animate-ping opacity-60 ${
                    coverage.isAlternative ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                />
              </span>
              <span className="tracking-wide">{coverage.text}</span>
            </span>
          )}
          {product.product_categories && (
            <p className="text-[9px] sm:text-xs text-muted-foreground/50 leading-none text-right">{(product.product_categories as any).name_ar}</p>
          )}
          <div className="mt-1 flex flex-col items-stretch gap-2 sm:mt-0.5 sm:flex-row sm:items-center sm:justify-between">
            <PriceSection
              user={user} isDealer={isDealer} price={price} hasViewed={hasViewed}
              limitReached={limitReached} dailyViewCount={dailyViewCount} dailyLimit={dailyLimit}
              productId={product.id} onRecordView={onRecordView} onLoginRequired={onLoginRequired} compact
            />
            {stockAvailable && canSeePrice && (
              <Button
                size="sm"
                className="w-full sm:w-auto flex-row-reverse gap-1.5 text-[9px] sm:text-xs h-8 sm:h-8 px-3 sm:px-4 rounded-xl font-bold shadow-sm"
                onClick={() => onAddToCart(product)}
              >
                <ShoppingCart className="w-3 h-3" />
                أضف
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════
  // Grid mode — Editorial Luxury Card
  // ───────────────────────────────────────────────────────────────
  // Design language: Navy + Gold hairline + bone-white photo stage,
  // refined typography rhythm, generous breathing room. Inspired by
  // luxury automotive print catalogs (Lexus / Aston Martin) — the
  // product is the hero, every element around it whispers.
  // ═══════════════════════════════════════════════════════════════
  // 3D tilt handlers (Apple-style) — driven by CSS variables on pointermove
  const tiltRef = useRef<HTMLDivElement>(null);
  const handleTiltMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const el = tiltRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;  // 0..1
    const py = (e.clientY - rect.top) / rect.height;  // 0..1
    const max = 5; // degrees
    const ry = (px - 0.5) * (max * 2);
    const rx = (0.5 - py) * (max * 2);
    el.style.setProperty("--tilt-x", `${rx.toFixed(2)}deg`);
    el.style.setProperty("--tilt-y", `${ry.toFixed(2)}deg`);
  }, []);
  const handleTiltLeave = useCallback(() => {
    const el = tiltRef.current;
    if (!el) return;
    el.style.setProperty("--tilt-x", "0deg");
    el.style.setProperty("--tilt-y", "0deg");
  }, []);

  return (
    <div
      ref={tiltRef}
      dir="rtl"
      onPointerMove={handleTiltMove}
      onPointerLeave={handleTiltLeave}
      className="card-tilt group relative bg-card cursor-pointer flex flex-col rounded-[22px] overflow-hidden
        ring-1 ring-border/40
        shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_18px_-8px_rgba(15,23,42,0.08)]
        hover:ring-[hsl(40_80%_55%/0.55)]
        hover:shadow-[0_28px_55px_-20px_rgba(15,23,42,0.28),0_12px_24px_-12px_rgba(40,30,10,0.18),0_0_0_1px_hsl(40_80%_55%/0.15)]
        transition-[box-shadow,border-color] duration-500
        will-change-transform"
      onClick={() => onProductClick(product)}
    >
      {/* ── Top gold hairline (reveals on hover — signature accent) ── */}
      <span
        aria-hidden
        className="absolute top-0 left-6 right-6 h-px z-30 pointer-events-none
          bg-gradient-to-r from-transparent via-[hsl(40_80%_55%)] to-transparent
          opacity-0 group-hover:opacity-90 transition-opacity duration-700"
      />

      {/* ── Image Stage — pristine bone-white frame with corner accents ──
          Z-INDEX LADDER (grid mode) — single source of truth, do not deviate:
            z-0  : Skeleton shimmer (inside <LazyImage> wrapper)
            z-1  : The decoded <img> tag itself
            z-10 : Decorative overlays (vignette, bottom fade, hover sweep)
            z-20 : Corner registration marks (gold)
            z-30 : Informational badges (Brand on top-start, Stock on top-end)
            z-40 : Promotional / state badges (Sale, Priced)
      */}
      <div className="badges-static relative aspect-square bg-white overflow-hidden z-[1]">
        {/* Soft radial vignette — subtle depth */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,transparent_55%,rgba(15,23,42,0.045)_100%)] z-10 pointer-events-none" />

        {/* Bottom fade for seamless transition into content section */}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-gradient-to-t from-card via-card/70 to-transparent z-10 pointer-events-none" />

        {/* Luxury shimmer sweep on hover */}
        <div className="absolute inset-0 -translate-x-[150%] group-hover:translate-x-[150%]
          bg-gradient-to-r from-transparent via-white/55 to-transparent
          transition-transform duration-[1500ms] ease-[cubic-bezier(0.22,1,0.36,1)] z-10 pointer-events-none" />

        {/* Corner registration marks — like a fine catalog */}
        <span aria-hidden className="absolute top-2.5 left-2.5 w-3 h-3 z-20 pointer-events-none border-t border-l border-[hsl(40_80%_55%/0.55)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <span aria-hidden className="absolute top-2.5 right-2.5 w-3 h-3 z-20 pointer-events-none border-t border-r border-[hsl(40_80%_55%/0.55)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <span aria-hidden className="absolute bottom-2.5 left-2.5 w-3 h-3 z-20 pointer-events-none border-b border-l border-[hsl(40_80%_55%/0.55)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
        <span aria-hidden className="absolute bottom-2.5 right-2.5 w-3 h-3 z-20 pointer-events-none border-b border-r border-[hsl(40_80%_55%/0.55)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

        {/* Reserved padded inner box — ensures every product image fits the same usable area */}
        <div className="absolute inset-0 p-5 sm:p-6 flex items-center justify-center">
          {product.image_url ? (
            <LazyImage
              src={product.image_url}
              alt={product.name_ar}
              wrapperClassName="w-full h-full flex items-center justify-center"
              className="max-w-full max-h-full w-auto h-auto object-contain mix-blend-multiply
                group-hover:scale-[1.07] transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
              optimizeWidth={400}
              placeholderIcon={
                <Package className="w-14 h-14 text-muted-foreground/25" strokeWidth={1.25} />
              }
            />
          ) : (
            <Package className="w-14 h-14 text-muted-foreground/25" strokeWidth={1.25} />
          )}
        </div>

        {/* TOP-START : Brand */}
        {brandRouteMap[product.brand] && (
          <ImageBadgeColumn corner="top-start">
            <Link
              to={brandRouteMap[product.brand].path}
              onClick={(e) => e.stopPropagation()}
              className="hover:opacity-90 transition-opacity max-w-full animate-brand-slide-in"
            >
              <ImageBadge
                tone="brand"
                size="sm"
                className="!ring-[color:var(--brand-accent)]/70 gap-1"
                style={{ ['--brand-accent' as any]: brandRouteMap[product.brand].accent }}
              >
                <span
                  aria-hidden
                  className="w-1.5 h-1.5 rounded-full shrink-0"
                  style={{
                    background: brandRouteMap[product.brand].accent,
                    boxShadow: `0 0 6px ${brandRouteMap[product.brand].accent}`,
                  }}
                />
                {brandRouteMap[product.brand].label}
              </ImageBadge>
            </Link>
          </ImageBadgeColumn>
        )}

        {/* TOP-END : Stock + Sale */}
        <ImageBadgeColumn corner="top-end">
          <ImageBadge tone="stock" size="sm" stockAvailable={stockAvailable}>
            {stockAvailable ? "متوفر" : "غير متوفر"}
          </ImageBadge>
          {product.is_on_sale && (
            <ImageBadge tone="sale" size="sm" icon={<Sparkles />}>
              تخفيض
            </ImageBadge>
          )}
        </ImageBadgeColumn>

        {/* BOTTOM-END : Priced */}
        {hasViewed && (
          <ImageBadgeColumn corner="bottom-end" level={40}>
            <ImageBadge tone="priced" size="sm" icon={<Check />}>
              مسعّر
            </ImageBadge>
          </ImageBadgeColumn>
        )}
      </div>

      {/* ── Content Section ── refined editorial typography */}
      <div className="relative flex-1 flex flex-col p-3.5 sm:p-5 z-[2] text-right" onClick={(e) => e.stopPropagation()}>

        {/* Part Number strip — monospaced, quietly elegant, sits above the title like a reference number */}
        <div className="mb-1.5 flex items-center justify-end gap-2">
          <bdi
            title={(product as any).part_number || product.sku}
            className="inline-block max-w-[70%] truncate align-middle text-[9px] sm:text-[10px] font-mono
              text-[hsl(210_8%_45%)] tracking-[0.18em] leading-none whitespace-nowrap select-all
              uppercase"
          >
            {(product as any).part_number || product.sku}
          </bdi>
          <span aria-hidden className="h-px flex-1 bg-gradient-to-l from-transparent via-border/60 to-transparent" />
        </div>

        {/* Product name — serif-weight headline, tight tracking */}
        <h3 className="font-extrabold text-card-foreground text-[12.5px] sm:text-[14px] leading-[1.45] line-clamp-2 min-h-[2.5em] mb-2 text-right tracking-tight
          group-hover:text-primary transition-colors duration-500">
          {product.name_ar}
        </h3>

        {/* Year coverage badge — minimal, refined, with pulsing dot + shimmer sweep */}
        {coverage && (
          <div className="mb-2 flex justify-end">
            <span
              className={`group/cov relative inline-flex items-center gap-1.5 text-[9px] sm:text-[10px] font-semibold px-2.5 py-1 rounded-full leading-none backdrop-blur-sm overflow-hidden transition-all duration-300 hover:scale-[1.04] ${
                coverage.isAlternative
                  ? "bg-amber-500/8 text-amber-700 dark:text-amber-300"
                  : "bg-emerald-500/8 text-emerald-700 dark:text-emerald-300"
              }`}
            >
              <span aria-hidden className="absolute inset-0 coverage-shimmer-bg animate-coverage-shimmer pointer-events-none opacity-70" />
              <span
                aria-hidden
                className={`relative flex h-1.5 w-1.5 rounded-full ${
                  coverage.isAlternative ? "bg-amber-500" : "bg-emerald-500"
                }`}
              >
                <span
                  className={`absolute inset-0 rounded-full animate-ping opacity-60 ${
                    coverage.isAlternative ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                />
              </span>
              <span className="relative tracking-wide">{coverage.text}</span>
            </span>
          </div>
        )}

        {/* Category — whisper-quiet meta line */}
        {product.product_categories && (
          <p className="text-[9px] sm:text-[10px] text-muted-foreground/55 leading-none truncate mb-3 text-right tracking-wide">
            {(product.product_categories as any).name_ar}
          </p>
        )}

        {/* Spacer — pushes price/CTA to the bottom for grid alignment */}
        <div className="flex-1" />

        {/* Price / CTA — separated by a gold-tinted hairline (signature) */}
        <div className="relative pt-3">
          <span aria-hidden className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(40_80%_55%/0.35)] to-transparent" />
          <PriceSection
            user={user} isDealer={isDealer} price={price} hasViewed={hasViewed}
            limitReached={limitReached} dailyViewCount={dailyViewCount} dailyLimit={dailyLimit}
            productId={product.id} onRecordView={onRecordView} onLoginRequired={onLoginRequired}
          />
        </div>

        {/* Add to cart — premium navy button with gold hover ring + burst on click */}
        {stockAvailable && canSeePrice && (
          <AddToCartButton onAdd={() => onAddToCart(product)} />
        )}

        {/* Alert button for out-of-stock — dealers only */}
        {!stockAvailable && user && isDealer && (
          <StockAlertButton productId={product.id} userId={user.id} productName={product.name_ar} />
        )}
      </div>
    </div>
  );
});

ProductCard.displayName = "ProductCard";

/* ── AddToCartButton — premium with magnetic hover, cart bounce, success burst ── */
const AddToCartButton = ({ onAdd }: { onAdd: () => void }) => {
  const btnRef = useRef<HTMLButtonElement>(null);
  const [success, setSuccess] = useState(false);

  // Magnetic hover effect
  const handleMove = useCallback((e: React.PointerEvent<HTMLButtonElement>) => {
    const el = btnRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) * 0.18;
    const y = (e.clientY - r.top - r.height / 2) * 0.25;
    el.style.setProperty("--mag-x", `${x.toFixed(1)}px`);
    el.style.setProperty("--mag-y", `${y.toFixed(1)}px`);
  }, []);
  const handleLeave = useCallback(() => {
    const el = btnRef.current;
    if (!el) return;
    el.style.setProperty("--mag-x", "0px");
    el.style.setProperty("--mag-y", "0px");
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onAdd();
    setSuccess(true);
    window.setTimeout(() => setSuccess(false), 900);
  }, [onAdd]);

  // 8 burst particles distributed in a circle
  const particles = Array.from({ length: 8 }).map((_, i) => {
    const angle = (i / 8) * Math.PI * 2;
    const dx = Math.cos(angle) * 28;
    const dy = Math.sin(angle) * 28;
    return { dx, dy, i };
  });

  return (
    <button
      ref={btnRef}
      onClick={handleClick}
      onPointerMove={handleMove}
      onPointerLeave={handleLeave}
      className="btn-magnetic group/cta relative w-full flex flex-row-reverse items-center justify-center gap-2 text-[10px] sm:text-xs h-9 sm:h-11 rounded-xl font-extrabold mt-2.5 sm:mt-3 overflow-hidden
        bg-[hsl(210_11%_12%)] text-white hover:bg-[hsl(210_11%_8%)]
        ring-1 ring-[hsl(210_11%_12%)] hover:ring-[hsl(40_80%_55%/0.7)]
        shadow-[0_4px_14px_-3px_rgba(15,23,42,0.35)]
        hover:shadow-[0_10px_28px_-6px_rgba(40,80,55,0.45)]
        active:scale-[0.97]"
      aria-label="أضف للسلة"
    >
      {/* gold shimmer sweep on hover */}
      <span aria-hidden className="absolute inset-0 -translate-x-full group-hover/cta:translate-x-full transition-transform duration-[1100ms] ease-out bg-gradient-to-r from-transparent via-[hsl(40_80%_75%/0.25)] to-transparent" />

      {/* Success burst particles */}
      {success && (
        <span aria-hidden className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          {particles.map(p => (
            <span
              key={p.i}
              className="absolute w-1 h-1 rounded-full bg-[hsl(40_90%_65%)] shadow-[0_0_8px_hsl(40_90%_60%)] animate-burst-particle"
              style={{ ['--burst-end' as any]: `translate(${p.dx}px, ${p.dy}px)` }}
            />
          ))}
        </span>
      )}

      {success ? (
        <span className="relative z-10 flex items-center gap-1.5 animate-checkmark-pop">
          <Check className="w-4 h-4 text-emerald-300" strokeWidth={3} />
          <span>تمت الإضافة</span>
        </span>
      ) : (
        <>
          <ShoppingCart className="w-4 h-4 relative z-10 group-hover/cta:animate-cart-bounce" />
          <span className="relative z-10">أضف للسلة</span>
        </>
      )}
    </button>
  );
};

/* ── Stock Alert Button ── */
const StockAlertButton = ({ productId, userId, productName }: { productId: string; userId: string; productName: string }) => {
  const [subscribed, setSubscribed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checked, setChecked] = useState(false);

  const checkAndToggle = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    if (!checked) {
      // First click: check if already subscribed
      const { data } = await supabase
        .from("stock_alerts")
        .select("id")
        .eq("user_id", userId)
        .eq("product_id", productId)
        .eq("is_active", true)
        .maybeSingle();
      setChecked(true);
      if (data) {
        setSubscribed(true);
        // Unsubscribe
        await supabase.from("stock_alerts").delete().eq("id", data.id);
        setSubscribed(false);
        toast({ title: "تم إلغاء التنبيه", description: productName });
      } else {
        // Subscribe
        await supabase.from("stock_alerts").insert([
          { user_id: userId, product_id: productId, alert_type: "back_in_stock" },
          { user_id: userId, product_id: productId, alert_type: "price_drop" },
        ]);
        setSubscribed(true);
        toast({ title: "🔔 سيتم تنبيهك", description: `عند توفر "${productName}" أو نزول عرض عليه` });
      }
    } else {
      if (subscribed) {
        await supabase.from("stock_alerts").delete().eq("user_id", userId).eq("product_id", productId);
        setSubscribed(false);
        toast({ title: "تم إلغاء التنبيه" });
      } else {
        await supabase.from("stock_alerts").insert([
          { user_id: userId, product_id: productId, alert_type: "back_in_stock" },
          { user_id: userId, product_id: productId, alert_type: "price_drop" },
        ]);
        setSubscribed(true);
        toast({ title: "🔔 سيتم تنبيهك", description: `عند توفر "${productName}"` });
      }
    }
    setLoading(false);
  }, [checked, subscribed, loading, productId, userId, productName]);

  return (
    <Button
      size="sm"
      variant="outline"
      className={`w-full flex-row-reverse gap-1.5 text-[9px] sm:text-xs h-8 sm:h-9 rounded-xl font-bold mt-2 sm:mt-2.5 transition-all duration-300
        ${subscribed 
          ? "border-amber-400/40 bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-700/30" 
          : "border-border/40 hover:border-primary/30 hover:bg-primary/5"
        }`}
      onClick={checkAndToggle}
      disabled={loading}
    >
      {subscribed ? <BellOff className="w-3.5 h-3.5" /> : <Bell className="w-3.5 h-3.5" />}
      {subscribed ? "إلغاء التنبيه" : "نبّهني عند التوفر"}
    </Button>
  );
};

/* ── Sub-components ── */

const StockBadge = ({ available }: { available: boolean }) => (
  <span className={`inline-flex items-center gap-0.5 text-[8px] sm:text-[10px] px-2 py-[3px] rounded-lg font-bold leading-none tracking-tight ${
    available
      ? "text-emerald-700 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/40 ring-1 ring-emerald-200/50 dark:ring-emerald-800/30"
      : "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950/40 ring-1 ring-red-200/50 dark:ring-red-800/30"
  }`}>
    {available ? "متوفر" : "غير متوفر"}
  </span>
);

interface PriceSectionProps {
  user: any;
  isDealer: boolean;
  price: number | null;
  hasViewed: boolean;
  limitReached: boolean;
  dailyViewCount: number;
  dailyLimit: number;
  productId: string;
  onRecordView: (id: string) => void;
  onLoginRequired: () => void;
  compact?: boolean;
}

const PriceSection = ({
  user, isDealer, price, hasViewed, limitReached,
  dailyViewCount, dailyLimit, productId,
  onRecordView, onLoginRequired, compact,
}: PriceSectionProps) => {
  if (!user) {
    // Modern Minimal — خلفية بيضاء نظيفة، حد رفيع، أيقونة قفل دائرية،
    // hover ناعم بدون ألوان صارخة. مريح للعين ومودرن.
    return compact ? (
      <button
        onClick={onLoginRequired}
        className="group relative w-full sm:w-auto h-9 px-4 rounded-full
          bg-white text-foreground font-bold text-[10px] sm:text-xs
          border border-border/70 hover:border-foreground/40
          hover:bg-foreground hover:text-background
          active:scale-[0.97] transition-all duration-300
          flex flex-row-reverse items-center justify-center gap-1.5"
        aria-label="سجل لعرض السعر"
      >
        <Lock className="w-3 h-3" strokeWidth={2.25} />
        <span>اعرض السعر</span>
      </button>
    ) : (
      <button
        onClick={onLoginRequired}
        className="group relative w-full
          flex flex-row-reverse items-center gap-3
          rounded-2xl px-3.5 py-2.5
          bg-white
          border border-border/70
          hover:border-foreground/30
          hover:shadow-[0_8px_24px_-12px_rgba(0,0,0,0.18)]
          hover:-translate-y-px active:translate-y-0
          transition-all duration-300 ease-out"
        aria-label="سجل دخولك لعرض السعر"
      >
        {/* أيقونة قفل دائرية */}
        <span className="relative flex items-center justify-center w-9 h-9 shrink-0
          rounded-full bg-foreground/[0.04]
          group-hover:bg-foreground group-hover:text-background
          transition-colors duration-300">
          <Lock className="w-4 h-4 text-foreground/70 group-hover:text-background transition-colors duration-300" strokeWidth={2.25} />
        </span>

        {/* النص */}
        <span className="flex-1 flex flex-col items-end justify-center gap-0.5 text-right">
          <span className="text-[13px] font-bold text-foreground tracking-tight leading-tight">
            سجل دخولك لعرض السعر
          </span>
          <span className="text-[10px] font-medium text-muted-foreground tracking-wide leading-tight">
            اضغط للمتابعة
          </span>
        </span>

        {/* سهم خفيف */}
        <span aria-hidden className="text-muted-foreground/60 group-hover:text-foreground group-hover:-translate-x-0.5 transition-all duration-300 text-base font-light">
          ←
        </span>
      </button>
    );
  }

  if (price !== null) {
    return (
      <div className={compact ? "flex flex-wrap items-baseline justify-start gap-1.5 text-right" : "space-y-1 py-1 text-right"}>
        <AnimatedPrice
          key={`price-${productId}-${price}`}
          value={price}
          duration={900}
          className="text-primary font-black text-lg sm:text-xl tracking-tight leading-tight"
          currencyClassName="text-[10px] sm:text-xs font-bold text-primary/50 ms-1"
        />
        <p className={`w-full text-[8px] sm:text-[10px] font-semibold leading-none ${
          isDealer && hasViewed ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/40"
        }`}>
          {isDealer && hasViewed ? "✓ سعر الجملة الخاص بك" : "سعر قطاعي"}
        </p>
      </div>
    );
  }

  if (isDealer && !limitReached) {
    return compact ? (
      <Button variant="outline" size="sm" className="w-full sm:w-auto flex-row-reverse gap-1.5 text-[10px] sm:text-xs h-8 sm:h-8 rounded-xl font-bold" onClick={() => onRecordView(productId)}>
        <Eye className="w-3 h-3" />
        اعرض السعر
      </Button>
    ) : (
      <button
        className="w-full flex flex-row-reverse items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] sm:text-xs font-bold
          bg-primary/8 text-primary border border-primary/15
          hover:bg-primary/15 hover:border-primary/25 active:scale-[0.97]
          transition-all duration-300"
        onClick={() => onRecordView(productId)}
      >
        <Eye className="w-3.5 h-3.5" />
        <span>اعرض السعر</span>
        <span className="text-primary/40 text-[9px]">({dailyLimit - dailyViewCount} متبقي)</span>
      </button>
    );
  }

  if (isDealer && limitReached) {
    return (
      <div className="flex flex-row-reverse items-center justify-center gap-1.5 text-muted-foreground/50 text-[10px] sm:text-xs py-2.5 rounded-xl bg-muted/20">
        <Lock className="w-3 h-3" />
        <span>استنفدت الحد اليومي</span>
      </div>
    );
  }

  return null;
};

export default ProductCard;
