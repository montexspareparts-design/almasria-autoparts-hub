import { memo } from "react";
import { Package, Lock, Eye, ShoppingCart, Check } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const brandRouteMap: Record<string, { label: string; color: string; path: string }> = {
  toyota_genuine: { label: "تويوتا أصلي", color: "bg-red-500/90 text-white", path: "/products/toyota-genuine" },
  toyota_oils: { label: "زيوت تويوتا", color: "bg-amber-500/90 text-white", path: "/products/toyota-oils" },
  mtx_aftermarket: { label: "MTX", color: "bg-blue-500/90 text-white", path: "/products/mtx" },
  denso: { label: "DENSO", color: "bg-emerald-600/90 text-white", path: "/products/denso" },
  aisin: { label: "AISIN", color: "bg-purple-500/90 text-white", path: "/products/aisin" },
  fbk: { label: "FBK", color: "bg-orange-500/90 text-white", path: "/products/fbk" },
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
  getProductPrice: (product: any) => number;
  onProductClick: (product: any) => void;
  onAddToCart: (product: any) => void;
  onRecordView: (productId: string) => void;
  onLoginRequired: () => void;
}

const ProductCard = memo(({
  product, index, viewMode, user, isDealer, isRetailTier = false, viewedProductIds,
  limitReached, dailyViewCount, dailyLimit,
  getProductPrice, onProductClick, onAddToCart, onRecordView, onLoginRequired,
}: ProductCardProps) => {

  const stockAvailable = product.stock_quantity > 0;
  const hasViewed = viewedProductIds.includes(product.id);
  const canSeePrice = user && (!isDealer || isRetailTier || hasViewed);
  const price = canSeePrice ? (isDealer && !isRetailTier ? getProductPrice(product) : product.base_price) : null;

  if (viewMode === "list") {
    return (
      <div
        className="bg-card border border-border/50 rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 cursor-pointer flex group"
        onClick={() => onProductClick(product)}
      >
        {/* Image */}
        <div className="w-24 sm:w-44 shrink-0 bg-gradient-to-br from-white to-muted/20 relative flex items-center justify-center p-3 sm:p-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 ease-in-out z-10 pointer-events-none" />
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name_ar}
              className="w-full h-full object-contain mix-blend-multiply group-hover:scale-110 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <Package className="w-8 h-8 sm:w-10 sm:h-10 text-muted-foreground/15" />
          )}
          {product.is_on_sale && (
            <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5 h-auto shadow-lg shadow-destructive/20">
              تخفيض
            </Badge>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 p-3 sm:p-4 flex flex-col justify-center min-w-0 gap-1.5 sm:gap-2" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
            <span className="text-[8px] sm:text-[10px] font-mono bg-muted/60 text-muted-foreground px-1.5 sm:px-2 py-0.5 rounded-md leading-none tracking-wider">{product.sku}</span>
            <StockBadge available={stockAvailable} />
            {brandRouteMap[product.brand] && (
              <Link
                to={brandRouteMap[product.brand].path}
                className={`text-[7px] sm:text-[9px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md hover:opacity-80 transition-opacity ${brandRouteMap[product.brand].color}`}
                onClick={(e) => e.stopPropagation()}
              >
                {brandRouteMap[product.brand].label}
              </Link>
            )}
          </div>
          <h3 className="font-bold text-card-foreground text-[11px] sm:text-sm leading-snug sm:leading-relaxed line-clamp-2 group-hover:text-primary transition-colors">
            {product.name_ar}
          </h3>
          {product.product_categories && (
            <p className="text-[9px] sm:text-xs text-muted-foreground/60 leading-none">{(product.product_categories as any).name_ar}</p>
          )}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap mt-0.5">
            <PriceSection
              user={user}
              isDealer={isDealer}
              price={price}
              hasViewed={hasViewed}
              limitReached={limitReached}
              dailyViewCount={dailyViewCount}
              dailyLimit={dailyLimit}
              productId={product.id}
              onRecordView={onRecordView}
              onLoginRequired={onLoginRequired}
              compact
            />
            {stockAvailable && canSeePrice && (
              <Button size="sm" className="gap-1.5 text-[9px] sm:text-xs h-7 sm:h-8 px-3 sm:px-4 rounded-lg" onClick={() => onAddToCart(product)}>
                <ShoppingCart className="w-3 h-3" />أضف
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Grid mode — Premium luxurious card design
  return (
    <div
      className="bg-card rounded-2xl overflow-hidden group cursor-pointer relative flex flex-col
        border border-border/30
        shadow-[0_1px_3px_rgba(0,0,0,0.04)]
        hover:border-primary/25
        hover:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.12),0_4px_16px_rgba(0,0,0,0.06)]
        hover:-translate-y-1
        transition-all duration-500 ease-out"
      onClick={() => onProductClick(product)}
    >
      {/* ── Image Section ── */}
      <div className="aspect-[4/3] bg-white relative overflow-hidden">
        {/* Elegant inner shadow */}
        <div className="absolute inset-0 shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.04)] z-10 pointer-events-none" />
        
        {/* Luxury shimmer on hover */}
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out z-10 pointer-events-none" />

        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.name_ar}
            className="w-full h-full object-contain p-4 sm:p-5
              group-hover:scale-105 transition-transform duration-700 ease-out"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-muted/5 to-muted/15">
            <Package className="w-12 h-12 text-muted-foreground/10" />
          </div>
        )}

        {/* Sale badge — top left with premium styling */}
        {product.is_on_sale && (
          <Badge className="absolute top-3 left-3 bg-destructive text-destructive-foreground text-[9px] font-black px-2.5 py-1 shadow-lg shadow-destructive/30 z-20 rounded-lg tracking-wide">
            تخفيض
          </Badge>
        )}

        {/* Stock indicator — top right, elegant dot */}
        <div className="absolute top-3 right-3 z-20">
          <div className={`w-2.5 h-2.5 rounded-full ring-2 ring-white/90 shadow-sm ${
            stockAvailable ? "bg-emerald-500" : "bg-red-400"
          }`} />
        </div>

        {/* Priced badge — bottom left */}
        {hasViewed && (
          <div className="absolute bottom-2.5 left-2.5 z-20">
            <span className="inline-flex items-center gap-1 bg-emerald-500/90 backdrop-blur-sm text-white text-[8px] font-bold px-2 py-0.5 rounded-lg shadow-sm">
              <Check className="w-2.5 h-2.5" /> مسعّر
            </span>
          </div>
        )}
      </div>

      {/* ── Content Section ── */}
      <div className="flex-1 flex flex-col p-3.5 sm:p-4 border-t border-border/20" onClick={(e) => e.stopPropagation()}>
        {/* Top row: SKU + Brand + Stock */}
        <div className="flex items-center justify-between gap-1 mb-2">
          <div className="flex items-center gap-1.5">
            <StockBadge available={stockAvailable} />
            {brandRouteMap[product.brand] && (
              <Link
                to={brandRouteMap[product.brand].path}
                className={`text-[7px] sm:text-[8px] font-bold px-1.5 py-0.5 rounded-md hover:opacity-80 transition-opacity ${brandRouteMap[product.brand].color}`}
                onClick={(e) => e.stopPropagation()}
              >
                {brandRouteMap[product.brand].label}
              </Link>
            )}
          </div>
          <span className="text-[8px] sm:text-[9px] font-mono text-muted-foreground/40 tracking-wider leading-none select-all">
            {product.sku}
          </span>
        </div>

        {/* Name — with stable height */}
        <h3 className="font-bold text-card-foreground text-[11px] sm:text-[13px] leading-snug line-clamp-2 min-h-[2.6em] mb-1
          group-hover:text-primary transition-colors duration-300">
          {product.name_ar}
        </h3>

        {/* Category */}
        {product.product_categories && (
          <p className="text-[8px] sm:text-[10px] text-muted-foreground/45 leading-none truncate mb-2">
            {(product.product_categories as any).name_ar}
          </p>
        )}

        {/* Spacer to push price/button to bottom */}
        <div className="flex-1" />

        {/* Price / Action */}
        <div className="pt-1 border-t border-border/10">
          <PriceSection
            user={user}
            isDealer={isDealer}
            price={price}
            hasViewed={hasViewed}
            limitReached={limitReached}
            dailyViewCount={dailyViewCount}
            dailyLimit={dailyLimit}
            productId={product.id}
            onRecordView={onRecordView}
            onLoginRequired={onLoginRequired}
          />
        </div>

        {/* Add to cart */}
        {stockAvailable && canSeePrice && (
          <Button
            size="sm"
            className="w-full gap-1.5 text-[10px] sm:text-xs h-9 rounded-xl font-bold mt-2
              shadow-sm hover:shadow-md hover:shadow-primary/15 active:scale-[0.98] transition-all duration-200"
            onClick={() => onAddToCart(product)}
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            أضف للسلة
          </Button>
        )}
      </div>
    </div>
  );
});

ProductCard.displayName = "ProductCard";

/* ── Sub-components ── */

const StockBadge = ({ available }: { available: boolean }) => (
  <span className={`inline-flex items-center gap-0.5 text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-md font-semibold leading-none ${
    available
      ? "text-emerald-700 bg-emerald-50/80 dark:text-emerald-400 dark:bg-emerald-950/30"
      : "text-red-600 bg-red-50/80 dark:text-red-400 dark:bg-red-950/30"
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
      <Button variant="outline" size="sm" className="gap-1.5 text-[10px] sm:text-xs h-7 sm:h-8 rounded-lg border-border/60" onClick={onLoginRequired}>
        <Lock className="w-3 h-3" />سجل لعرض السعر
      </Button>
    ) : (
      <Button variant="outline" size="sm" className="w-full gap-1.5 sm:gap-2 text-[10px] sm:text-xs h-8 sm:h-9 rounded-xl border-border/60 font-semibold hover:bg-primary/5 hover:border-primary/30 transition-colors" onClick={onLoginRequired}>
        <Lock className="w-3.5 h-3.5 text-muted-foreground" />سجل دخولك لعرض السعر
      </Button>
    );
  }

  if (price !== null) {
    return (
      <div className={compact ? "flex items-baseline gap-1.5" : "space-y-0.5 py-1"}>
        <div className="text-primary font-black text-base sm:text-lg tracking-tight leading-tight">
          {price.toLocaleString("ar-EG")} <span className="text-[10px] sm:text-xs font-bold text-primary/60">ج.م</span>
        </div>
        <p className={`text-[8px] sm:text-[10px] font-medium leading-none ${
          isDealer && hasViewed ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground/50"
        }`}>
          {isDealer && hasViewed ? "✓ سعر الجملة الخاص بك" : "سعر قطاعي"}
        </p>
      </div>
    );
  }

  if (isDealer && !limitReached) {
    return compact ? (
      <Button variant="outline" size="sm" className="gap-1.5 text-[10px] sm:text-xs h-7 sm:h-8 rounded-lg" onClick={() => onRecordView(productId)}>
        <Eye className="w-3 h-3" />اعرض السعر
      </Button>
    ) : (
      <button
        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] sm:text-xs font-bold
          bg-primary/8 text-primary border border-primary/15
          hover:bg-primary/15 hover:border-primary/25 active:scale-[0.98]
          transition-all duration-200"
        onClick={() => onRecordView(productId)}
      >
        <Eye className="w-3.5 h-3.5" />
        <span>اعرض السعر</span>
        <span className="text-primary/50 text-[9px]">({dailyLimit - dailyViewCount} متبقي)</span>
      </button>
    );
  }

  if (isDealer && limitReached) {
    return (
      <div className="flex items-center justify-center gap-1.5 text-muted-foreground/60 text-[10px] sm:text-xs py-2.5 rounded-xl bg-muted/30">
        <Lock className="w-3 h-3" />
        <span>استنفدت الحد اليومي</span>
      </div>
    );
  }

  return null;
};

export default ProductCard;