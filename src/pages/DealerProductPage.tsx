import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, ArrowLeft, Package, Tag, Plus, Minus, ShoppingCart,
  CheckCircle2, XCircle, Star, ChevronLeft, ChevronRight, Truck, Shield, RefreshCw,
  Heart, Share2, Layers, Car, Hash, Box, Info
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useDealerCart } from "@/hooks/useDealerCart";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import SEOHead from "@/components/SEOHead";
import { ProductSchema } from "@/components/SEOSchemaMarkup";
import { buildProductSEO } from "@/lib/productSeo";

interface Product {
  id: string;
  name_ar: string;
  name_en: string | null;
  sku: string;
  brand: string;
  base_price: number;
  sale_price: number | null;
  is_on_sale: boolean;
  image_url: string | null;
  stock_quantity: number;
  min_order_qty: number;
  description_ar: string | null;
  description_en: string | null;
  compatible_models: string[] | null;
  year_from: number | null;
  year_to: number | null;
  category_id: string | null;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  reviewer_name: string | null;
  created_at: string;
}

const ease = [0.22, 1, 0.36, 1] as const;

const DealerProductPage = () => {
  const { productId } = useParams<{ productId: string }>();
  const navigate = useNavigate();
  const { user, dealerAccount } = useAuth();
  const { lang } = useLanguage();
  const { toast } = useToast();
  const { addItem, items: cartItems } = useDealerCart();
  const isRTL = lang === "ar";

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [tierPrice, setTierPrice] = useState<number | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [alsoOrdered, setAlsoOrdered] = useState<Product[]>([]);
  const [isFavorite, setIsFavorite] = useState(false);

  // Fetch product
  useEffect(() => {
    if (!productId) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("id", productId)
        .eq("is_active", true)
        .gt("stock_quantity", 0)
        .single();
      
      if (data) {
        setProduct(data as Product);
        setQuantity(data.min_order_qty || 1);
      }
      setLoading(false);
    })();
  }, [productId]);

  // Fetch tier price, reviews, related, favorites in parallel
  useEffect(() => {
    if (!product || !user) return;
    const tier = dealerAccount?.tier;

    Promise.all([
      // Tier price
      tier ? supabase.from("product_tier_prices").select("price, discount_price, min_qty_for_discount").eq("product_id", product.id).eq("tier", tier as any).maybeSingle() : null,
      // Reviews
      supabase.from("product_reviews_public").select("id, rating, comment, reviewer_name, created_at").eq("product_id", product.id).eq("is_approved", true).order("created_at", { ascending: false }).limit(10),
      // Related products (same category)
      product.category_id ? supabase.from("products").select("id, name_ar, name_en, sku, image_url, base_price, sale_price, is_on_sale, stock_quantity, brand, min_order_qty, description_ar, description_en, compatible_models, year_from, year_to, category_id").eq("is_active", true).gt("stock_quantity", 0).eq("category_id", product.category_id).neq("id", product.id).limit(6) : null,
      // Favorite check
      supabase.from("dealer_favorites").select("id").eq("user_id", user.id).eq("product_id", product.id).maybeSingle(),
      // Record price view
      supabase.from("dealer_price_views").upsert({ user_id: user.id, product_id: product.id, view_date: new Date().toISOString().split("T")[0] }, { onConflict: "user_id,product_id,view_date" }),
    ]).then(([tierRes, reviewsRes, relatedRes, favRes]) => {
      if (tierRes?.data) setTierPrice(tierRes.data.price);
      if (reviewsRes?.data) setReviews(reviewsRes.data as Review[]);
      if (relatedRes?.data) setRelatedProducts(relatedRes.data as Product[]);
      if (favRes?.data) setIsFavorite(true);
    });
  }, [product, user, dealerAccount]);

  // Fetch "customers also ordered"
  useEffect(() => {
    if (!product) return;
    (async () => {
      // Find orders that contain this product, then find other products in those orders
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("order_id")
        .eq("product_id", product.id)
        .limit(20);
      
      if (!orderItems || orderItems.length === 0) return;

      const orderIds = [...new Set(orderItems.map(oi => oi.order_id))].slice(0, 10);
      const { data: coItems } = await supabase
        .from("order_items")
        .select("product_id")
        .in("order_id", orderIds)
        .neq("product_id", product.id);

      if (!coItems || coItems.length === 0) return;

      // Count occurrences
      const countMap = new Map<string, number>();
      coItems.forEach(ci => countMap.set(ci.product_id, (countMap.get(ci.product_id) || 0) + 1));
      const topIds = [...countMap.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(e => e[0]);

      if (topIds.length === 0) return;
      const { data: prods } = await supabase
        .from("products")
        .select("id, name_ar, name_en, sku, image_url, base_price, sale_price, is_on_sale, stock_quantity, brand, min_order_qty, description_ar, description_en, compatible_models, year_from, year_to, category_id")
        .in("id", topIds)
        .eq("is_active", true)
        .gt("stock_quantity", 0);

      if (prods) setAlsoOrdered(prods as Product[]);
    })();
  }, [product]);

  const handleAddToCart = useCallback(async () => {
    if (!product) return;
    await addItem(product.id, quantity);
    toast({ title: "✅", description: isRTL ? `تم إضافة ${product.name_ar} للسلة` : `Added ${product.name_ar} to cart` });
  }, [product, quantity, addItem, toast, isRTL]);

  const toggleFavorite = useCallback(async () => {
    if (!user || !product) return;
    if (isFavorite) {
      await supabase.from("dealer_favorites").delete().eq("user_id", user.id).eq("product_id", product.id);
      setIsFavorite(false);
    } else {
      await supabase.from("dealer_favorites").insert({ user_id: user.id, product_id: product.id });
      setIsFavorite(true);
    }
  }, [user, product, isFavorite]);

  const displayPrice = tierPrice || (product?.is_on_sale && product?.sale_price ? product.sale_price : product?.base_price) || 0;
  const avgRating = reviews.length > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const inCart = cartItems.find(ci => ci.product_id === productId);

  const brandLabels: Record<string, string> = {
    toyota_genuine: "Toyota Genuine",
    toyota_oils: "Toyota Oils",
    mtx_aftermarket: "MTX",
    denso: "Denso",
    aisin: "Aisin",
    fbk: "FBK",
  };

  if (loading) {
    return (
      <>
        <Navbar />
        <div className="pt-20 pb-24 container mx-auto px-4 max-w-4xl" dir={isRTL ? "rtl" : "ltr"}>
          <Skeleton className="h-8 w-48 mb-6" />
          <div className="grid md:grid-cols-2 gap-8">
            <Skeleton className="aspect-square rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-8 w-3/4" />
              <Skeleton className="h-5 w-1/2" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!product) {
    return (
      <>
        <Navbar />
        <div className="pt-20 pb-24 container mx-auto px-4 max-w-4xl text-center" dir={isRTL ? "rtl" : "ltr"}>
          <Package className="w-16 h-16 text-muted-foreground/20 mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">{isRTL ? "المنتج غير موجود" : "Product not found"}</h1>
          <Button onClick={() => navigate(-1)}>{isRTL ? "رجوع" : "Go Back"}</Button>
        </div>
      </>
    );
  }

  const ProductMiniCard = ({ p }: { p: Product }) => (
    <Link to={`/dealer/product/${p.id}`}>
      <motion.div
        whileHover={{ y: -4 }}
        className="bg-card border border-border/40 rounded-2xl overflow-hidden group
          shadow-[0_1px_3px_rgba(0,0,0,0.04)] hover:shadow-[0_12px_32px_-8px_rgba(0,0,0,0.1)]
          hover:border-primary/20 transition-all duration-500"
      >
        <div className="aspect-square bg-gradient-to-br from-muted/10 to-muted/30 relative overflow-hidden flex items-center justify-center">
          {p.image_url
            ? <img src={p.image_url} alt={p.name_ar} className="w-full h-full object-contain p-3 group-hover:scale-110 transition-transform duration-700" loading="lazy" />
            : <Package className="w-8 h-8 text-muted-foreground/10" />
          }
          <span className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full ring-[2.5px] ring-card ${p.stock_quantity > 0 ? "bg-emerald-500" : "bg-muted-foreground/25"}`} />
        </div>
        <div className="p-2.5 border-t border-border/20">
          <p className="text-[11px] font-bold text-foreground line-clamp-1">{isRTL ? p.name_ar : (p.name_en || p.name_ar)}</p>
          <p className="text-[9px] text-muted-foreground font-mono">{p.sku}</p>
        </div>
      </motion.div>
    </Link>
  );

  const seo = buildProductSEO(product);

  return (
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
      <Navbar />
      <div data-dealer-scope className="pt-16 md:pt-20 pb-28 min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>
        <div className="container mx-auto px-4 max-w-4xl">


          {/* Breadcrumb */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-xs text-muted-foreground py-4"
          >
            <Link to="/" className="hover:text-primary transition-colors">{isRTL ? "الرئيسية" : "Home"}</Link>
            <span>/</span>
            <Link to="/products" className="hover:text-primary transition-colors">{isRTL ? "المنتجات" : "Products"}</Link>
            <span>/</span>
            <span className="text-foreground font-medium truncate max-w-[200px]">{isRTL ? product.name_ar : (product.name_en || product.name_ar)}</span>
          </motion.div>

          {/* Main Grid */}
          <div className="grid md:grid-cols-2 gap-6 md:gap-10">
            
            {/* Image */}
            <motion.div
              initial={{ opacity: 0, x: isRTL ? 20 : -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease }}
            >
              <div className="bg-card border border-border/40 rounded-3xl overflow-hidden shadow-[0_4px_24px_rgba(0,0,0,0.06)] relative group">
                <div className="aspect-square flex items-center justify-center bg-gradient-to-br from-muted/5 to-muted/20 p-6 md:p-10">
                  {product.image_url
                    ? <img src={product.image_url} alt={product.name_ar} className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-700" />
                    : <Package className="w-20 h-20 text-muted-foreground/10" />
                  }
                </div>
                {product.is_on_sale && product.sale_price && (
                  <span className="absolute top-4 left-4 text-sm font-black bg-primary text-primary-foreground px-3 py-1.5 rounded-xl shadow-lg shadow-primary/20">
                    -{Math.round(((product.base_price - product.sale_price) / product.base_price) * 100)}%
                  </span>
                )}
                {/* Action buttons */}
                <div className="absolute top-4 right-4 flex flex-col gap-2">
                  <button
                    onClick={toggleFavorite}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-300 ${
                      isFavorite ? "bg-red-50 text-red-500" : "bg-card/80 backdrop-blur-sm text-muted-foreground hover:text-red-500"
                    } border border-border/40 shadow-sm`}
                  >
                    <Heart className={`w-5 h-5 ${isFavorite ? "fill-current" : ""}`} />
                  </button>
                </div>
              </div>
            </motion.div>

            {/* Details */}
            <motion.div
              initial={{ opacity: 0, x: isRTL ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease, delay: 0.1 }}
              className="space-y-5"
            >
              {/* Brand badge */}
              <Badge variant="secondary" className="text-xs font-bold">
                {brandLabels[product.brand] || product.brand}
              </Badge>

              {/* Name */}
              <h1 className="text-2xl md:text-3xl font-black text-foreground leading-tight">
                {isRTL ? product.name_ar : (product.name_en || product.name_ar)}
              </h1>

              {/* SKU + Rating */}
              <div className="flex items-center gap-4 flex-wrap">
                <span className="text-sm text-muted-foreground font-mono flex items-center gap-1.5">
                  <Hash className="w-3.5 h-3.5" /> {product.sku}
                </span>
                {reviews.length > 0 && (
                  <div className="flex items-center gap-1.5">
                    <div className="flex">
                      {[1,2,3,4,5].map(s => (
                        <Star key={s} className={`w-3.5 h-3.5 ${s <= Math.round(avgRating) ? "text-amber-400 fill-amber-400" : "text-muted-foreground/20"}`} />
                      ))}
                    </div>
                    <span className="text-xs text-muted-foreground">({reviews.length})</span>
                  </div>
                )}
              </div>

              {/* Stock */}
              <div className="flex items-center gap-2">
                {product.stock_quantity > 0 ? (
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-500/10 px-3 py-1.5 rounded-xl">
                    <CheckCircle2 className="w-4 h-4" /> {isRTL ? "متوفر" : "In Stock"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-sm font-bold text-destructive bg-destructive/10 px-3 py-1.5 rounded-xl">
                    <XCircle className="w-4 h-4" /> {isRTL ? "غير متوفر" : "Out of Stock"}
                  </span>
                )}
              </div>

              <Separator />

              {/* Price */}
              {tierPrice ? (
                <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4">
                  <p className="text-xs text-muted-foreground mb-1">{isRTL ? "سعرك الخاص" : "Your Price"}</p>
                  <p className="text-3xl font-black text-primary">{tierPrice.toLocaleString("ar-EG")} <span className="text-lg">ج.م</span></p>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Tag className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{isRTL ? "اضغط تسعير لعرض سعرك" : "Price shown after pricing"}</span>
                </div>
              )}

              {/* Quantity selector + Add to cart */}
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-foreground">{isRTL ? "الكمية:" : "Quantity:"}</span>
                  <div className="flex items-center bg-muted/30 rounded-xl border border-border/50">
                    <button onClick={() => setQuantity(Math.max(product.min_order_qty, quantity - 1))} className="w-10 h-10 flex items-center justify-center hover:bg-muted/50 rounded-l-xl transition-colors">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-14 text-center font-bold text-lg">{quantity}</span>
                    <button onClick={() => setQuantity(Math.min(product.stock_quantity, quantity + 1))} className="w-10 h-10 flex items-center justify-center hover:bg-muted/50 rounded-r-xl transition-colors">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  {product.min_order_qty > 1 && (
                    <span className="text-[10px] text-muted-foreground">{isRTL ? `الحد الأدنى: ${product.min_order_qty}` : `Min: ${product.min_order_qty}`}</span>
                  )}
                </div>

                <Button
                  onClick={handleAddToCart}
                  disabled={product.stock_quantity === 0}
                  className="w-full h-14 text-base font-bold gap-2 rounded-2xl shadow-lg shadow-primary/20"
                  size="lg"
                >
                  <ShoppingCart className="w-5 h-5" />
                  {inCart
                    ? (isRTL ? `تحديث السلة (${inCart.quantity + quantity})` : `Update Cart (${inCart.quantity + quantity})`)
                    : (isRTL ? "أضف للسلة" : "Add to Cart")
                  }
                </Button>
              </div>

              {/* Trust badges */}
              <div className="grid grid-cols-3 gap-2 pt-2">
                {[
                  { icon: Shield, label: isRTL ? "أصلي 100%" : "100% Genuine" },
                  { icon: Truck, label: isRTL ? "شحن سريع" : "Fast Shipping" },
                  { icon: RefreshCw, label: isRTL ? "إرجاع سهل" : "Easy Returns" },
                ].map(b => (
                  <div key={b.label} className="flex items-center gap-1.5 text-[10px] text-muted-foreground bg-muted/20 rounded-lg px-2.5 py-2 justify-center">
                    <b.icon className="w-3.5 h-3.5" />
                    <span className="font-semibold">{b.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>

          {/* Description + Specs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, ease }}
            className="mt-10 grid md:grid-cols-2 gap-6"
          >
            {/* Description */}
            {(product.description_ar || product.description_en) && (
              <div className="bg-card border border-border/40 rounded-2xl p-5">
                <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                  <Info className="w-4 h-4 text-primary" />
                  {isRTL ? "الوصف" : "Description"}
                </h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {isRTL ? product.description_ar : (product.description_en || product.description_ar)}
                </p>
              </div>
            )}

            {/* Specs */}
            <div className="bg-card border border-border/40 rounded-2xl p-5">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2 mb-3">
                <Layers className="w-4 h-4 text-primary" />
                {isRTL ? "المواصفات" : "Specifications"}
              </h3>
              <div className="space-y-2.5">
                {[
                  { label: isRTL ? "رقم القطعة" : "Part Number", value: product.sku, icon: Hash },
                  { label: isRTL ? "الماركة" : "Brand", value: brandLabels[product.brand] || product.brand, icon: Box },
                  { label: isRTL ? "الحد الأدنى للطلب" : "Min Order", value: `${product.min_order_qty}`, icon: Layers },
                  ...(product.compatible_models && product.compatible_models.length > 0 ? [{ label: isRTL ? "الموديلات" : "Models", value: product.compatible_models.join(", "), icon: Car }] : []),
                  ...(product.year_from ? [{ label: isRTL ? "سنة الصنع" : "Year", value: `${product.year_from}${product.year_to ? ` - ${product.year_to}` : "+"}`, icon: Tag }] : []),
                ].map(spec => (
                  <div key={spec.label} className="flex items-start gap-2.5 text-sm">
                    <spec.icon className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{spec.label}:</span>
                    <span className="font-semibold text-foreground">{spec.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Reviews */}
          {reviews.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25, ease }}
              className="mt-8"
            >
              <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-4">
                <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                {isRTL ? `التقييمات (${reviews.length})` : `Reviews (${reviews.length})`}
              </h3>
              <div className="space-y-3">
                {reviews.slice(0, 5).map(r => (
                  <div key={r.id} className="bg-card border border-border/40 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex">
                        {[1,2,3,4,5].map(s => (
                          <Star key={s} className={`w-3 h-3 ${s <= r.rating ? "text-amber-400 fill-amber-400" : "text-muted-foreground/20"}`} />
                        ))}
                      </div>
                      <span className="text-xs font-bold text-foreground">{r.reviewer_name || (isRTL ? "عميل" : "Customer")}</span>
                      <span className="text-[10px] text-muted-foreground">{new Date(r.created_at).toLocaleDateString(isRTL ? "ar-EG" : "en-US")}</span>
                    </div>
                    {r.comment && <p className="text-sm text-muted-foreground">{r.comment}</p>}
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Customers Also Ordered */}
          {alsoOrdered.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, ease }}
              className="mt-10"
            >
              <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-4">
                <ShoppingCart className="w-4 h-4 text-primary" />
                {isRTL ? "عملاء اشتروا أيضاً" : "Customers Also Bought"}
              </h3>
              <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-1 px-1">
                {alsoOrdered.map(p => (
                  <div key={p.id} className="shrink-0 w-[140px] sm:w-[160px]">
                    <ProductMiniCard p={p} />
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Related Products */}
          {relatedProducts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35, ease }}
              className="mt-10 mb-8"
            >
              <h3 className="text-base font-bold text-foreground flex items-center gap-2 mb-4">
                <Layers className="w-4 h-4 text-primary" />
                {isRTL ? "منتجات مشابهة" : "Related Products"}
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {relatedProducts.slice(0, 4).map(p => (
                  <ProductMiniCard key={p.id} p={p} />
                ))}
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </>
  );
};

export default DealerProductPage;
