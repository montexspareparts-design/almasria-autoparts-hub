import { memo, useState, useCallback } from "react";
import { Package, Lock, Eye, ShoppingCart, Check, Sparkles, Bell, BellOff } from "lucide-react";
import { LazyImage } from "@/components/ui/lazy-image";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ImageBadge, ImageBadgeColumn } from "@/components/ui/image-badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const brandRouteMap: Record<string, { label: string; color: string; path: string }> = {
  toyota_genuine: { label: "تويوتا أصلي", color: "bg-red-600 text-white", path: "/products/toyota-genuine" },
  toyota_oils: { label: "زيوت تويوتا", color: "bg-amber-600 text-white", path: "/products/toyota-oils" },
  mtx_aftermarket: { label: "MTX", color: "bg-blue-600 text-white", path: "/products/mtx" },
  denso: { label: "DENSO", color: "bg-emerald-600 text-white", path: "/products/denso" },
  aisin: { label: "AISIN", color: "bg-purple-600 text-white", path: "/products/aisin" },
  fbk: { label: "FBK", color: "bg-orange-600 text-white", path: "/products/fbk" },
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
                className={`text-[7px] sm:text-[9px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md hover:opacity-80 transition-opacity shadow-sm whitespace-nowrap ${brandRouteMap[product.brand].color}`}
                onClick={(e) => e.stopPropagation()}
              >
                {brandRouteMap[product.brand].label}
              </Link>
            )}
          </div>
          {/* SKU — single line, logical alignment so it sits at the inline-start in both RTL and LTR */}
          <div className="w-full text-start overflow-hidden">
            <bdi
              title={product.sku}
              className="inline-block max-w-full truncate align-middle text-[8px] sm:text-[10px] font-mono bg-muted/40 text-muted-foreground/70 px-1.5 sm:px-2 py-0.5 rounded-md leading-none tracking-widest whitespace-nowrap select-all"
            >
              {product.sku}
            </bdi>
          </div>
          <h3 className="font-bold text-card-foreground text-[11px] sm:text-sm leading-snug sm:leading-relaxed line-clamp-2 group-hover:text-primary transition-colors duration-300 text-right">
            {product.name_ar}
          </h3>
          {coverage && (
            <span className={`inline-flex items-center gap-1 self-end text-[9px] sm:text-[10px] font-bold px-2 py-0.5 rounded-md leading-none border ${
              coverage.isAlternative
                ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-700/50"
                : "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-700/50"
            }`}>
              {coverage.text}
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

  // ═══════════════════════════════════════════════
  // Grid mode — Ultra Premium Card
  // ═══════════════════════════════════════════════
  return (
    <div
      dir="rtl"
      className="group relative bg-card rounded-[20px] overflow-hidden cursor-pointer flex flex-col
        border border-border/20
        shadow-[0_2px_12px_rgba(0,0,0,0.03),0_1px_3px_rgba(0,0,0,0.02)]
        hover:border-primary/20
        hover:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15),0_8px_24px_-8px_rgba(0,0,0,0.08)]
        hover:-translate-y-1.5
        transition-all duration-600 ease-[cubic-bezier(0.23,1,0.32,1)]"
      onClick={() => onProductClick(product)}
    >
      {/* ── Ambient glow on hover ── */}
      <div className="absolute -inset-[1px] rounded-[20px] bg-gradient-to-b from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none z-0" />

      {/* ── Image Section ── unified 1:1 frame, identical inner padding everywhere.
          `badges-static` opts the inner badge-glass layers out of backdrop-filter
          while idle (image is static) — blur is re-enabled on hover/focus only.

          Z-INDEX LADDER (grid mode) — single source of truth, do not deviate:
            z-0  : Skeleton shimmer (inside <LazyImage> wrapper)
            z-1  : The decoded <img> tag itself
            z-10 : Decorative overlays (vignette, bottom fade, hover sweep)
            z-30 : Informational badges (Brand on top-start, Stock on top-end)
            z-40 : Promotional / state badges (Sale, Priced)
          The skeleton is *always* the lowest layer so badges stay perfectly
          anchored from first paint, even before the image bytes arrive. */}
      <div className="badges-static relative aspect-square bg-white overflow-hidden z-[1]">
        {/* Subtle vignette */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_60%,rgba(0,0,0,0.02)_100%)] z-10 pointer-events-none" />

        {/* Bottom fade for seamless transition into the content section */}
        <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-card to-transparent z-10 pointer-events-none" />

        {/* Luxury shimmer sweep */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent -translate-x-[200%] group-hover:translate-x-[200%] transition-transform duration-[1.4s] ease-in-out z-10 pointer-events-none" />

        {/*
          Reserved padded inner box ensures every product image — regardless of its
          natural dimensions — fits inside the SAME usable area, so cards stay
          perfectly aligned across the grid on every screen size.
        */}
        <div className="absolute inset-0 p-4 sm:p-5 flex items-center justify-center">
          {product.image_url ? (
            <LazyImage
              src={product.image_url}
              alt={product.name_ar}
              wrapperClassName="w-full h-full flex items-center justify-center"
              className="max-w-full max-h-full w-auto h-auto object-contain mix-blend-multiply group-hover:scale-[1.06] transition-transform duration-[800ms] ease-[cubic-bezier(0.23,1,0.32,1)]"
              optimizeWidth={400}
              placeholderIcon={
                <Package
                  className="w-14 h-14 text-muted-foreground/25"
                  strokeWidth={1.25}
                />
              }
            />
          ) : (
            // Same icon, same color, same stroke as the LazyImage placeholder
            // → cards without an image visually match cards still loading.
            <Package
              className="w-14 h-14 text-muted-foreground/25"
              strokeWidth={1.25}
            />
          )}
        </div>

        {/*
          Image overlays — deterministic stacking system
          ──────────────────────────────────────────────
          Every floating badge here is rendered through the unified
          <ImageBadge /> primitive (src/components/ui/image-badge.tsx).
          That component owns the entire auto-contrast recipe — frosted
          backdrop fallback, white halo ring, drop shadow, text-shadow,
          responsive sizing, RTL-aware corner anchoring — so all card
          surfaces (grid, list, dialog, admin QA) stay pixel-consistent.
          To tweak how badges look on photos, edit ImageBadge — never
          re-derive these classes inline here.

          STACK ORDER (top → bottom inside each corner column):
            ▸ TOP-START  : Brand     — z-30
            ▸ TOP-END    : Stock → Sale — z-30
            ▸ BOTTOM-END : Priced    — z-40 (sits above corner shadow)
        */}

        {/* TOP-START : Brand */}
        {brandRouteMap[product.brand] && (
          <ImageBadgeColumn corner="top-start">
            <Link
              to={brandRouteMap[product.brand].path}
              onClick={(e) => e.stopPropagation()}
              className="hover:opacity-90 transition-opacity max-w-full"
            >
              <ImageBadge tone="brand" size="sm" colorClass={brandRouteMap[product.brand].color}>
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

      {/* ── Content Section ── (separate stacking context above image overlays) */}
      <div className="relative flex-1 flex flex-col p-2.5 sm:p-4 z-[2] text-right" onClick={(e) => e.stopPropagation()}>

        {/* Name */}
        <h3 className="font-bold text-card-foreground text-[11px] sm:text-[13px] leading-[1.5] line-clamp-2 min-h-[2.4em] mb-1 text-right
          group-hover:text-primary transition-colors duration-400">
          {product.name_ar}
        </h3>

        {/* SKU — single line, RTL-safe (LTR digits stay readable but block aligns to start in RTL) */}
        <div className="mb-2 w-full overflow-hidden text-start">
          <bdi
            title={product.sku}
            className="inline-block max-w-full truncate align-middle text-[8px] sm:text-[9px] font-mono text-muted-foreground/50 tracking-[0.1em] leading-none whitespace-nowrap select-all"
          >
            {product.sku}
          </bdi>
        </div>

        {/* Year coverage badge — shows "fits 2008 ✓" when user searched by year */}
        {coverage && (
          <div className="mb-1.5 flex justify-end">
            <span className={`inline-flex items-center gap-1 text-[8px] sm:text-[10px] font-bold px-2 py-1 rounded-md leading-none border ${
              coverage.isAlternative
                ? "bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-700/50"
                : "bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-700/50"
            }`}>
              {coverage.text}
            </span>
          </div>
        )}

        {/* Category */}
        {product.product_categories && (
          <p className="text-[8px] sm:text-[10px] text-muted-foreground/40 leading-none truncate mb-2.5 text-right">
            {(product.product_categories as any).name_ar}
          </p>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Price / Action — separated with subtle line */}
        <div className="pt-2.5 border-t border-border/10">
          <PriceSection
            user={user} isDealer={isDealer} price={price} hasViewed={hasViewed}
            limitReached={limitReached} dailyViewCount={dailyViewCount} dailyLimit={dailyLimit}
            productId={product.id} onRecordView={onRecordView} onLoginRequired={onLoginRequired}
          />
        </div>

        {/* Add to cart — premium button */}
        {stockAvailable && canSeePrice && (
          <Button
            size="sm"
            className="w-full flex-row-reverse gap-1.5 text-[9px] sm:text-xs h-8 sm:h-10 rounded-xl font-extrabold mt-2 sm:mt-3
              bg-primary hover:bg-primary/90
              shadow-[0_4px_14px_-3px_hsl(var(--primary)/0.4)]
              hover:shadow-[0_6px_20px_-3px_hsl(var(--primary)/0.5)]
              active:scale-[0.97] active:shadow-[0_2px_8px_-2px_hsl(var(--primary)/0.3)]
              transition-all duration-300 ease-out"
            onClick={() => onAddToCart(product)}
          >
            <ShoppingCart className="w-4 h-4" />
            أضف للسلة
          </Button>
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
    // Luxury "Unlock Price" CTA — navy base + gold shimmer sweep, designed to make
    // the user *want* to log in. Includes a subtle "wholesale price" tease.
    return compact ? (
      <button
        onClick={onLoginRequired}
        className="group relative w-full sm:w-auto h-8 px-3 rounded-xl overflow-hidden
          bg-gradient-to-l from-[hsl(220_60%_15%)] via-[hsl(220_55%_22%)] to-[hsl(220_60%_15%)]
          text-white font-bold text-[10px] sm:text-xs
          ring-1 ring-[hsl(43_74%_55%)]/40 hover:ring-[hsl(43_74%_55%)]/80
          shadow-[0_4px_14px_-4px_hsl(220_60%_15%/0.5)]
          hover:shadow-[0_8px_24px_-6px_hsl(43_74%_55%/0.5)]
          active:scale-[0.97] transition-all duration-300
          flex flex-row-reverse items-center justify-center gap-1.5"
        aria-label="سجل لعرض السعر"
      >
        <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-[hsl(43_74%_75%)]/30 to-transparent" />
        <Lock className="w-3 h-3 relative z-10 text-[hsl(43_74%_70%)]" />
        <span className="relative z-10">اعرض السعر</span>
      </button>
    ) : (
      <button
        onClick={onLoginRequired}
        className="group relative w-full h-11 rounded-xl overflow-hidden
          bg-gradient-to-l from-[hsl(220_60%_13%)] via-[hsl(220_55%_20%)] to-[hsl(220_60%_13%)]
          ring-1 ring-[hsl(43_74%_55%)]/40 hover:ring-[hsl(43_74%_55%)]/90
          shadow-[0_6px_20px_-6px_hsl(220_60%_15%/0.55)]
          hover:shadow-[0_12px_32px_-8px_hsl(43_74%_55%/0.55)]
          active:scale-[0.98] transition-all duration-500
          flex flex-row-reverse items-center justify-center gap-2.5"
        aria-label="سجل دخولك لعرض السعر"
      >
        {/* shimmer sweep */}
        <span className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-[1100ms] ease-out bg-gradient-to-r from-transparent via-[hsl(43_74%_75%)]/25 to-transparent" />
        {/* subtle gold hairline at bottom */}
        <span className="absolute bottom-0 left-4 right-4 h-px bg-gradient-to-r from-transparent via-[hsl(43_74%_60%)]/60 to-transparent" />
        {/* gold lock badge */}
        <span className="relative z-10 flex items-center justify-center w-6 h-6 rounded-full bg-gradient-to-br from-[hsl(43_74%_65%)] to-[hsl(38_70%_45%)] shadow-[0_2px_8px_hsl(43_74%_55%/0.4)] ring-1 ring-[hsl(43_74%_80%)]/40">
          <Lock className="w-3 h-3 text-[hsl(220_60%_15%)]" strokeWidth={2.8} />
        </span>
        <span className="relative z-10 flex flex-col items-end leading-none gap-0.5">
          <span className="text-[11px] sm:text-xs font-extrabold text-white tracking-tight">سجل دخولك لعرض السعر</span>
          <span className="text-[9px] font-semibold text-[hsl(43_74%_72%)]/90 tracking-wide">سعر خاص للعملاء فقط</span>
        </span>
      </button>
    );
  }

  if (price !== null) {
    return (
      <div className={compact ? "flex flex-wrap items-baseline justify-start gap-1.5 text-right" : "space-y-1 py-1 text-right"}>
        <div className="inline-flex items-baseline gap-1 text-primary font-black text-lg sm:text-xl tracking-tight leading-tight">
          <span>{price.toLocaleString("ar-EG")}</span>
          <span className="text-[10px] sm:text-xs font-bold text-primary/50">ج.م</span>
        </div>
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
