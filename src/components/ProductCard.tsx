import { memo, useState, useCallback } from "react";
import { Package, Lock, Eye, ShoppingCart, Check, Sparkles, Bell, BellOff } from "lucide-react";
import { LazyImage } from "@/components/ui/lazy-image";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
        {/* Image — fixed square frame across breakpoints, consistent inner padding */}
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
              />
            ) : (
              <Package className="w-10 h-10 text-muted-foreground/15 relative z-[1]" />
            )}
          </div>
          {product.is_on_sale && (
            <Badge className="absolute top-2 end-2 z-20 bg-destructive text-destructive-foreground text-[8px] font-black px-2 py-0.5 shadow-lg shadow-destructive/30 rounded-lg">
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
          while idle (image is static) — blur is re-enabled on hover/focus only. */}
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
            />
          ) : (
            <Package className="w-14 h-14 text-muted-foreground/15" />
          )}
        </div>

        {/*
          Image overlays — deterministic stacking system
          ──────────────────────────────────────────────
          Two flex columns are anchored to the image corners. Each column lays
          out its badges with a fixed `gap`, so badges always stack in a stable
          order with consistent spacing — no matter which combination of badges
          is present (Brand, Stock, Sale, Priced).

          STACK ORDER (top → bottom inside each column) — RTL/LTR aware via logical props:
            ▸ TOP-START  : Brand (Toyota Genuine, MTX, etc.)   — right in RTL, left in LTR
            ▸ TOP-END    : Stock (متوفر / غير متوفر) → Sale (تخفيض) — left in RTL, right in LTR
            ▸ BOTTOM-END : Priced (مسعّر)                     — left in RTL, right in LTR

          We use Tailwind's logical `start-*` / `end-*` utilities so the badges
          flip automatically with the document/component direction — no manual
          dir checks, no empty corners, no unexpected mirroring.

          Z-index hierarchy:
            - z-10 : decorative layers (vignette, fade, shimmer)
            - z-30 : informational badges (Brand, Stock)
            - z-40 : promotional badges (Sale, Priced)

          Auto-contrast strategy on every floating badge:
            1. Opaque-enough fill (≥95%) of a saturated color → readable text.
            2. `.badge-glass` → progressive frosted background: opaque
               fallback for low-end / older browsers, blur+saturate only
               where supported and not on touch/idle (see index.css).
               backgrounds behind the badge.
            3. White text + `[text-shadow:0_1px_2px_rgba(0,0,0,0.35)]` keeps
               characters legible at the edges.
            4. White ring + colored outer shadow → halo separates the badge
               from both light and dark image areas.
        */}

        {/* TOP-START column: Brand only (right in RTL, left in LTR) */}
        {brandRouteMap[product.brand] && (
          <div className="absolute top-1.5 start-1.5 sm:top-2 sm:start-2 lg:top-2.5 lg:start-2.5 z-30 flex flex-col items-start gap-1 sm:gap-1.5 max-w-[48%] sm:max-w-[55%] pointer-events-none">
            <Link
              to={brandRouteMap[product.brand].path}
              onClick={(e) => e.stopPropagation()}
              className={`pointer-events-auto inline-flex items-center max-w-full truncate
                text-[7px] sm:text-[9px] lg:text-[10px] font-extrabold
                px-1.5 py-[2px] sm:px-2 sm:py-[3px] lg:px-2.5 lg:py-1
                rounded-md leading-none whitespace-nowrap
                badge-glass
                ring-1 ring-white/30 shadow-[0_2px_8px_rgba(0,0,0,0.25)]
                [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]
                hover:opacity-90 transition-opacity
                ${brandRouteMap[product.brand].color}`}
            >
              {brandRouteMap[product.brand].label}
            </Link>
          </div>
        )}

        {/*
          TOP-END column: Stock then Sale (when present) — left in RTL, right in LTR.
          Flex + gap means hiding Sale keeps Stock in place, and Sale always
          slides directly under Stock without manual top offsets.
        */}
        <div className="absolute top-1.5 end-1.5 sm:top-2 sm:end-2 lg:top-2.5 lg:end-2.5 z-30 flex flex-col items-end gap-1 sm:gap-1.5 max-w-[48%] sm:max-w-[55%] pointer-events-none">
          <span
            className={`pointer-events-auto inline-flex items-center gap-0.5 sm:gap-1
              text-[7px] sm:text-[9px] lg:text-[10px] font-bold
              px-1.5 py-[2px] sm:px-2 sm:py-[3px] lg:px-2.5 lg:py-1
              rounded-md leading-none whitespace-nowrap text-white
              badge-glass
              ring-1 ring-white/30
              [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]
              ${
                stockAvailable
                  ? "bg-emerald-600/95 shadow-[0_2px_10px_rgba(16,185,129,0.35)]"
                  : "bg-red-600/95 shadow-[0_2px_10px_rgba(239,68,68,0.35)]"
              }`}
          >
            <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.6)]" />
            {stockAvailable ? "متوفر" : "غير متوفر"}
          </span>

          {product.is_on_sale && (
            <Badge
              className="pointer-events-auto relative z-[1] bg-destructive/95 text-destructive-foreground
              text-[7px] sm:text-[9px] lg:text-[10px] font-black
                px-1.5 py-[2px] sm:px-2 sm:py-0.5 lg:px-2.5 lg:py-1
                rounded-md tracking-wide
                badge-glass
                ring-1 ring-white/25 shadow-[0_2px_10px_rgba(220,38,38,0.4)]
                [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]"
            >
              <Sparkles className="w-2 h-2 sm:w-2.5 sm:h-2.5 mr-0.5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]" />
              تخفيض
            </Badge>
          )}
        </div>

        {/* BOTTOM-END column: Priced indicator — own corner, can never overlap top stack (left in RTL, right in LTR) */}
        {hasViewed && (
          <div className="absolute bottom-2 end-2 sm:bottom-2.5 sm:end-2.5 lg:bottom-3 lg:end-3 z-40 flex flex-col items-end gap-1 sm:gap-1.5 pointer-events-none">
            <span
              className="pointer-events-auto inline-flex items-center gap-0.5 sm:gap-1 bg-emerald-600/95 text-white
              text-[7px] sm:text-[9px] lg:text-[10px] font-bold
                px-1.5 py-[2px] sm:px-2 sm:py-0.5 lg:px-2.5 lg:py-1
                rounded-md
                badge-glass
                ring-1 ring-white/30 shadow-[0_2px_10px_rgba(16,185,129,0.35)]
                [text-shadow:0_1px_2px_rgba(0,0,0,0.35)]"
            >
              <Check className="w-2 h-2 sm:w-2.5 sm:h-2.5 drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]" /> مسعّر
            </span>
          </div>
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
    return compact ? (
      <Button variant="outline" size="sm" className="w-full sm:w-auto flex-row-reverse gap-1.5 text-[10px] sm:text-xs h-8 sm:h-8 rounded-xl border-border/50 font-bold" onClick={onLoginRequired}>
        <Lock className="w-3 h-3" />
        سجل لعرض السعر
      </Button>
    ) : (
      <Button variant="outline" size="sm" className="w-full flex-row-reverse gap-2 text-[10px] sm:text-xs h-9 rounded-xl border-border/40 font-bold hover:bg-primary/5 hover:border-primary/25 transition-all duration-300" onClick={onLoginRequired}>
        <Lock className="w-3.5 h-3.5 text-muted-foreground/60" />
        سجل دخولك لعرض السعر
      </Button>
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
