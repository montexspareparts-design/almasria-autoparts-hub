import { useState, useRef, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Package, ShoppingCart, ZoomIn, ZoomOut, Lock, Eye, Tag, Layers, Hash, Box, Info, Car, Sparkles } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { Separator } from "@/components/ui/separator";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";
import SEOHead from "@/components/SEOHead";
import { ProductSchema } from "@/components/SEOSchemaMarkup";
import { buildProductSEO, buildProductCanonical } from "@/lib/productSeo";
import ProductFitmentSection from "@/components/ProductFitmentSection";

interface ProductDetailDialogProps {
  product: any | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  price: number | null;
  priceLabel?: string;
  onAddToCart?: (product: any) => void;
  canAddToCart?: boolean;
  isLoggedIn?: boolean;
  isDealer?: boolean;
  onLoginPrompt?: () => void;
  onRevealPrice?: (productId: string) => void;
  remainingViews?: number;
  limitReached?: boolean;
  /** Year extracted from the search query — drives the live "fits your year" indicator. */
  searchYear?: number | null;
}

const ProductDetailDialog = ({
  product,
  open,
  onOpenChange,
  price,
  priceLabel,
  onAddToCart,
  canAddToCart = false,
  isLoggedIn = false,
  isDealer = false,
  onLoginPrompt,
  onRevealPrice,
  remainingViews = 0,
  limitReached = false,
  searchYear = null,
}: ProductDetailDialogProps) => {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const [zoomed, setZoomed] = useState(false);
  const [zoomPosition, setZoomPosition] = useState({ x: 50, y: 50 });
  const imageRef = useRef<HTMLDivElement>(null);

  const { data: profile } = useQuery({
    queryKey: ["user_car_profile_detail", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("car_model, car_year")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    enabled: !!user,
  });

  const carModel = profile?.car_model;
  const carYear = profile?.car_year;

  const { data: carProducts } = useQuery({
    queryKey: ["car_recs_detail", carModel, carYear, product?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name_ar, sku, brand, image_url")
        .eq("is_active", true)
        .contains("compatible_models", [carModel!])
        .neq("id", product!.id)
        .limit(4);

      // Fallback to name search if not enough
      if (!data || data.length < 4) {
        const existingIds = (data || []).map(p => p.id);
        const { data: fallback } = await supabase
          .from("products")
          .select("id, name_ar, sku, brand, image_url")
          .eq("is_active", true)
          .ilike("name_ar", `%${carModel}%`)
          .neq("id", product!.id)
          .limit(4);
        const extra = (fallback || []).filter(p => !existingIds.includes(p.id));
        return [...(data || []), ...extra].slice(0, 4);
      }
      return data;
    },
    enabled: !!carModel && !!product,
  });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!zoomed || !imageRef.current) return;
    const rect = imageRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setZoomPosition({ x, y });
  }, [zoomed]);

  const handleClose = () => {
    setZoomed(false);
    onOpenChange(false);
  };

  if (!product) return null;

  const brandMap: Record<string, string> = {
    toyota_genuine: "toyota-genuine",
    toyota_oils: "toyota-oils",
    mtx_aftermarket: "mtx-aftermarket",
    denso: "denso",
    aisin: "aisin",
    fbk: "fbk",
  };

  const brandLabels: Record<string, string> = {
    toyota_genuine: "تويوتا الأصلية",
    toyota_oils: "زيوت تويوتا",
    mtx_aftermarket: "MTX",
    denso: "DENSO",
    aisin: "AISIN",
    fbk: "تيل فرامل FBK",
  };

  // Bilingual SEO meta + Product JSON-LD — only emitted while the dialog
  // is open so it doesn't pollute SEO of the underlying listing page.
  const seo = buildProductSEO(product);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      {open && (
        <>
          <SEOHead
            titleAr={seo.titleAr}
            titleEn={seo.titleEn}
            descriptionAr={seo.descriptionAr}
            descriptionEn={seo.descriptionEn}
            keywordsAr={seo.keywordsAr}
            keywordsEn={seo.keywordsEn}
            ogType="product"
            image={product.image_url || undefined}
          />
          <ProductSchema
            name={product.name_ar || product.name_en || product.sku}
            sku={product.sku}
            description={product.description_ar || product.description_en || undefined}
            image={product.image_url || undefined}
            brand={seo.schemaBrand}
            availability={(product.stock_quantity ?? 0) > 0}
          />
        </>
      )}
      <DialogContent className="max-w-2xl max-h-[90vh] sm:max-h-[90vh] p-0 gap-0 overflow-hidden w-[95vw] sm:w-full rounded-2xl sm:rounded-lg" dir="rtl">
        <DialogHeader className="sr-only">
          <DialogTitle>{product.name_ar}</DialogTitle>
          <DialogDescription>تفاصيل المنتج</DialogDescription>
        </DialogHeader>

        <div className="overflow-y-auto max-h-[85vh] sm:max-h-[90vh]">
        <div
          ref={imageRef}
          className={`relative bg-white overflow-hidden rounded-t-2xl sm:rounded-t-lg shrink-0 ${isMobile ? 'aspect-square' : 'aspect-[3/2] cursor-crosshair'}`}
          onClick={() => !isMobile && setZoomed(!zoomed)}
          onMouseMove={handleMouseMove}
          onMouseLeave={() => { if (zoomed) setZoomPosition({ x: 50, y: 50 }); }}
        >
          {product.image_url ? (
            <img
              src={product.image_url}
              alt={product.name_ar}
              className="w-full h-full object-contain p-4 sm:p-6 transition-transform duration-300 mix-blend-multiply"
              style={
                zoomed
                  ? {
                      transform: "scale(2.5)",
                      transformOrigin: `${zoomPosition.x}% ${zoomPosition.y}%`,
                    }
                  : undefined
              }
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <Package className="w-14 h-14 sm:w-20 sm:h-20 text-muted-foreground/20" />
            </div>
          )}

          {/* Zoom toggle - desktop only */}
          {!isMobile && (
            <button
              className="absolute bottom-3 left-3 bg-background/80 backdrop-blur-sm border border-border rounded-full p-2 text-foreground hover:bg-background transition-colors"
              onClick={(e) => { e.stopPropagation(); setZoomed(!zoomed); }}
            >
              {zoomed ? <ZoomOut className="w-4 h-4" /> : <ZoomIn className="w-4 h-4" />}
            </button>
          )}

          {zoomed && (
            <div className="absolute top-3 right-3 bg-primary/90 text-primary-foreground text-[11px] px-2 py-1 rounded-full font-semibold">
              حرّك الماوس للتكبير • اضغط للتصغير
            </div>
          )}

          {/* Sale badge */}
          {product.is_on_sale && product.sale_price && (
            <div className="absolute top-3 left-3 bg-destructive text-destructive-foreground text-xs font-bold px-2.5 py-1 rounded-full">
              تخفيض
            </div>
          )}
        </div>

        {/* Details section */}
        <div className="p-4 sm:p-5 space-y-3 sm:space-y-4">
          {/* Header: SKU + Stock + Brand */}
          <div className="flex items-center flex-wrap gap-1.5 sm:gap-2">
            <Badge variant="outline" className="font-mono text-[10px] sm:text-xs gap-1 px-1.5 sm:px-2">
              <Hash className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              {product.sku}
            </Badge>
            {product.stock_quantity > 0 ? (
              <Badge variant="secondary" className="bg-green-50 text-green-700 border-green-200 text-[10px] sm:text-xs gap-1 px-1.5 sm:px-2">
                <Box className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                متوفر
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-[10px] sm:text-xs">غير متوفر</Badge>
            )}
            {product.brand && brandLabels[product.brand] && (
              <Badge variant="secondary" className="text-[10px] sm:text-xs gap-1 px-1.5 sm:px-2">
                <Tag className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                {brandLabels[product.brand]}
              </Badge>
            )}
          </div>

          {/* Product Name */}
          <h2 className="text-lg sm:text-xl font-bold text-foreground leading-relaxed">
            {product.name_ar}
          </h2>
          {product.name_en && (
            <p className="text-xs sm:text-sm text-muted-foreground -mt-1.5 sm:-mt-2">{product.name_en}</p>
          )}

          {/* ── Fitment / Compatibility ──
              Surfaces year-range, compatible models, and a live verdict
              against (a) the year the user searched for and (b) the year
              from the user's saved car profile. Hidden for oils. */}
          <ProductFitmentSection
            product={product}
            searchYear={searchYear}
            profileCarYear={carYear ?? null}
            profileCarModel={carModel ?? null}
          />

          <Separator />

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3 text-sm">
            {/* Category */}
            {product.product_categories && (
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-[11px] text-muted-foreground">التصنيف</p>
                  <p className="font-semibold text-foreground">{(product.product_categories as any).name_ar}</p>
                </div>
              </div>
            )}

            {/* Min Order */}
            {product.min_order_qty > 1 && (
              <div className="flex items-center gap-2">
                <Box className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-[11px] text-muted-foreground">الحد الأدنى</p>
                  <p className="font-semibold text-foreground">{product.min_order_qty} قطعة</p>
                </div>
              </div>
            )}

            {/* Brand */}
            {product.brand && (
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-[11px] text-muted-foreground">العلامة التجارية</p>
                  <p className="font-semibold text-foreground">{brandLabels[product.brand] || product.brand}</p>
                </div>
              </div>
            )}

            {/* Featured */}
            {product.is_featured && (
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-primary shrink-0" />
                <div>
                  <p className="text-[11px] text-muted-foreground">حالة المنتج</p>
                  <p className="font-semibold text-foreground">منتج مميز ⭐</p>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          {product.description_ar && (
            <>
              <Separator />
              <div>
                <p className="text-xs font-semibold text-muted-foreground mb-1.5">الوصف</p>
                <p className="text-sm text-foreground leading-relaxed">
                  {product.description_ar}
                </p>
              </div>
            </>
          )}

          <Separator />

          {/* Price Section */}
          <div className="bg-muted/50 rounded-xl sm:rounded-lg p-3 sm:p-4">
            {!isLoggedIn ? (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={onLoginPrompt}
              >
                <Lock className="w-4 h-4" />
                سجل دخولك لعرض السعر
              </Button>
            ) : price !== null ? (
              <div>
                {product.is_on_sale && product.sale_price && !isDealer && (
                  <div className="text-muted-foreground line-through text-sm mb-1">
                    {product.base_price.toLocaleString("ar-EG")} ج.م
                  </div>
                )}
                <div className="text-primary font-black text-xl sm:text-2xl">
                  {price.toLocaleString("ar-EG")} ج.م
                </div>
                {priceLabel && (
                  <p className="text-xs text-muted-foreground mt-1">{priceLabel}</p>
                )}
              </div>
            ) : isDealer && !limitReached && onRevealPrice ? (
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => onRevealPrice(product.id)}
              >
                <Eye className="w-4 h-4" />
                اعرض السعر ({remainingViews} متبقي)
              </Button>
            ) : isDealer && limitReached ? (
              <div className="flex items-center gap-2 text-muted-foreground text-sm justify-center py-1">
                <Lock className="w-4 h-4" />
                <span><span><span>استنفدت الحد اليومي (20 صنف)</span></span></span>
              </div>
            ) : null}
          </div>

          {/* Add to Cart */}
          {canAddToCart && product.stock_quantity > 0 && onAddToCart && (
            <Button
              className="w-full gap-2"
              size="lg"
              onClick={() => onAddToCart(product)}
            >
              <ShoppingCart className="w-4 h-4" />
              أضف للسلة
            </Button>
          )}

          {/* Alternative Products from different brands in same category */}
          {price !== null && product.category_id && (
            <AlternativeProducts
              product={product}
              currentPrice={price}
              brandLabels={brandLabels}
              onClose={handleClose}
              brandMap={brandMap}
            />
          )}

          {/* Car-based Recommendations */}
          {carProducts && carProducts.length > 0 && (
            <>
              <Separator />
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <p className="text-sm font-bold text-foreground">
                    قطع غيار لـ <span className="text-primary">{carModel}</span>
                    {carYear && <span className="text-muted-foreground text-xs mr-1">({carYear})</span>}
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {carProducts.map((rec) => (
                    <Link
                      key={rec.id}
                      to={`/products/${brandMap[rec.brand] || "toyota-genuine"}?search=${encodeURIComponent(rec.sku)}`}
                      onClick={handleClose}
                      className="group flex gap-2 p-2 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all"
                    >
                      <div className="w-12 h-12 rounded-md bg-white shrink-0 overflow-hidden">
                        {rec.image_url ? (
                          <img src={rec.image_url} alt={rec.name_ar} className="w-full h-full object-contain" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><Car className="w-5 h-5 text-muted-foreground/30" /></div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="text-[10px] font-mono text-muted-foreground">{rec.sku}</p>
                        <p className="text-xs font-semibold text-card-foreground leading-tight line-clamp-2 group-hover:text-primary transition-colors">{rec.name_ar}</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

/* ── Alternative Products Sub-component ── */
const AlternativeProducts = ({ product, currentPrice, brandLabels, onClose, brandMap }: {
  product: any;
  currentPrice: number;
  brandLabels: Record<string, string>;
  onClose: () => void;
  brandMap: Record<string, string>;
}) => {
  const { data: alternatives } = useQuery({
    queryKey: ["alternative_products", product.id, product.category_id, product.brand],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name_ar, sku, brand, image_url, base_price, stock_quantity")
        .eq("is_active", true)
        .eq("category_id", product.category_id)
        .neq("brand", product.brand)
        .neq("id", product.id)
        .gt("stock_quantity", 0)
        .order("base_price", { ascending: true })
        .limit(4);
      return data || [];
    },
    enabled: !!product.category_id,
    staleTime: 5 * 60 * 1000,
  });

  if (!alternatives || alternatives.length === 0) return null;

  return (
    <>
      <Separator />
      <div>
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-primary" />
          <p className="text-sm font-bold text-foreground">بدائل متاحة من ماركات أخرى</p>
        </div>
        <div className="grid grid-cols-1 gap-2">
          {alternatives.map((alt) => {
            const priceDiff = alt.base_price - currentPrice;
            const priceDiffPct = currentPrice > 0 ? Math.round((priceDiff / currentPrice) * 100) : 0;
            return (
              <Link
                key={alt.id}
                to={`/products/${brandMap[alt.brand] || "toyota-genuine"}?search=${encodeURIComponent(alt.sku)}`}
                onClick={onClose}
                className="group flex items-center gap-3 p-2.5 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all"
              >
                <div className="w-12 h-12 rounded-md bg-white shrink-0 overflow-hidden">
                  {alt.image_url ? (
                    <img src={alt.image_url} alt={alt.name_ar} className="w-full h-full object-contain" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center"><Package className="w-5 h-5 text-muted-foreground/30" /></div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                      {brandLabels[alt.brand] || alt.brand}
                    </Badge>
                    <span className="text-[10px] font-mono text-muted-foreground">{alt.sku}</span>
                  </div>
                  <p className="text-xs font-semibold text-card-foreground leading-tight line-clamp-1 group-hover:text-primary transition-colors">{alt.name_ar}</p>
                </div>
                <div className="text-left shrink-0">
                  <p className="text-sm font-bold text-foreground">{alt.base_price.toLocaleString("ar-EG")} ج.م</p>
                  {priceDiff !== 0 && (
                    <p className={`text-[10px] font-semibold ${priceDiff < 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {priceDiff < 0 ? `أوفر ${Math.abs(priceDiffPct)}%` : `أغلى ${priceDiffPct}%`}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default ProductDetailDialog;
