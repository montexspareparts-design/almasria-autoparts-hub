import { useState, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Lock, ShieldCheck, Search, Package, X, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/contexts/AuthContext";
import { useCart, CartItem } from "@/contexts/CartContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const brandConfig: Record<string, { title: string; subtitle: string; description: string; badge: string; brandKey: string }> = {
  "toyota-genuine": {
    title: "قطع غيار تويوتا الأصلية",
    subtitle: "Toyota Genuine Parts",
    description: "قطع غيار أصلية 100% من تويوتا اليابان. نحن موزع معتمد رسمي لجميع أنواع قطع غيار تويوتا الأصلية في مصر.",
    badge: "موزع معتمد رسمي",
    brandKey: "toyota_genuine",
  },
  "toyota-oils": {
    title: "زيوت تويوتا الأصلية",
    subtitle: "Toyota Genuine Motor Oil",
    description: "زيوت تويوتا الأصلية بجميع درجات اللزوجة. زيوت المحرك، زيوت الفتيس، سوائل الفرامل، وجميع سوائل تويوتا الأصلية.",
    badge: "موزع معتمد رسمي",
    brandKey: "toyota_oils",
  },
  "mtx-aftermarket": {
    title: "MTX Aftermarket",
    subtitle: "قطع غيار مستوردة بأعلى جودة",
    description: "MTX هي علامتنا التجارية المسجلة لقطع الغيار المستوردة عالية الجودة بأفضل الأسعار.",
    badge: "علامة تجارية مسجلة",
    brandKey: "mtx_aftermarket",
  },
};

const ProductsPage = () => {
  const { brand } = useParams<{ brand: string }>();
  const { isDealer, user, dealerAccount } = useAuth();
  const { addItem } = useCart();
  const config = brand ? brandConfig[brand] : null;
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Fetch tier prices for dealers
  const { data: tierPrices } = useQuery({
    queryKey: ["tier_prices", dealerAccount?.tier, config?.brandKey],
    queryFn: async () => {
      if (!dealerAccount) return {};
      const { data, error } = await supabase
        .from("product_tier_prices")
        .select("product_id, price")
        .eq("tier", dealerAccount.tier as any);
      if (error) throw error;
      const map: Record<string, number> = {};
      data.forEach((tp) => { map[tp.product_id] = tp.price; });
      return map;
    },
    enabled: !!dealerAccount,
  });

  const getProductPrice = (product: any) => {
    if (isDealer && tierPrices && tierPrices[product.id]) {
      return tierPrices[product.id];
    }
    return product.base_price;
  };

  const handleAddToCart = (product: any) => {
    const cartItem: CartItem = {
      id: product.id,
      name_ar: product.name_ar,
      sku: product.sku,
      image_url: product.image_url,
      unit_price: getProductPrice(product),
      quantity: product.min_order_qty || 1,
      stock_quantity: product.stock_quantity,
      min_order_qty: product.min_order_qty,
      brand: product.brand,
    };
    addItem(cartItem);
    toast({ title: "تمت الإضافة للسلة ✅", description: product.name_ar });
  };

  const { data: categories } = useQuery({
    queryKey: ["product_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("product_categories")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", config?.brandKey],
    queryFn: async () => {
      if (!config) return [];
      const { data, error } = await supabase
        .from("products")
        .select("*, product_categories(name_ar)")
        .eq("brand", config.brandKey as any)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!config,
  });

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    return products.filter((p) => {
      const matchesSearch =
        !search ||
        p.name_ar.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());
      const matchesCategory =
        !selectedCategory || p.category_id === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [products, search, selectedCategory]);

  if (!config) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">صفحة غير موجودة</h1>
          <Button asChild>
            <Link to="/">العودة للرئيسية</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Banner */}
      <section className="pt-24 pb-10 bg-dark-section">
        <div className="container mx-auto px-4">
          <Link to="/#products" className="inline-flex items-center gap-2 text-sm text-primary hover:underline mb-6">
            <ArrowRight className="w-4 h-4" />
            العودة للمنتجات
          </Link>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-3xl">
            <div className="inline-flex items-center gap-2 bg-primary/15 border border-primary/30 rounded-full px-4 py-1.5 mb-4">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">{config.badge}</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-dark-section-foreground mb-2">{config.title}</h1>
            <p className="text-lg text-dark-section-foreground/50 mb-2">{config.subtitle}</p>
            <p className="text-dark-section-foreground/70 max-w-2xl leading-relaxed">{config.description}</p>
          </motion.div>
        </div>
      </section>

      {/* Search & Filter */}
      <section className="py-6 bg-background border-b border-border sticky top-16 z-30">
        <div className="container mx-auto px-4">
          {/* Dealer promotion banner */}
          {!isDealer && (
            <div className="bg-muted border border-primary/20 rounded-lg p-3 mb-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-primary shrink-0" />
                <p className="text-foreground text-sm">
                  <strong>تاجر معتمد؟</strong> سجل دخولك للحصول على أسعار الجملة الخاصة.
                </p>
              </div>
              <Button size="sm" className="shrink-0" asChild>
                <Link to="/dealer-login">
                  دخول التجار
                </Link>
              </Button>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ابحث بالاسم أو رقم الصنف (SKU)..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pr-10 bg-card"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Category filter */}
            {categories && categories.length > 0 && config.brandKey !== "toyota_oils" && (
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={selectedCategory === null ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(null)}
                >
                  الكل
                </Button>
                {categories.map((cat) => (
                  <Button
                    key={cat.id}
                    variant={selectedCategory === cat.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(selectedCategory === cat.id ? null : cat.id)}
                  >
                    {cat.name_ar}
                  </Button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 text-sm text-muted-foreground">
            {isLoading ? "جاري التحميل..." : `${filteredProducts.length} منتج`}
          </div>
        </div>
      </section>

      {/* Products Grid */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-lg p-4 animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                  <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-20">
              <Package className="w-16 h-16 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-foreground mb-2">لا توجد منتجات</h3>
              <p className="text-muted-foreground">جرب تغيير كلمة البحث أو الفلتر</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredProducts.map((product, i) => (
                <motion.div
                  key={product.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.5) }}
                  className="bg-card border border-border rounded-lg overflow-hidden hover:border-primary/40 hover:shadow-md transition-all duration-200 group"
                >
                  {/* Product Image */}
                  <div className="aspect-square bg-muted relative overflow-hidden">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name_ar}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12 text-muted-foreground/20" />
                      </div>
                    )}
                  </div>

                  <div className="p-4">
                  {/* SKU Badge */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded">
                      {product.sku}
                    </span>
                    {product.stock_quantity > 0 ? (
                      <span className="text-[11px] text-green-600 bg-green-50 px-2 py-0.5 rounded font-semibold">متوفر</span>
                    ) : (
                      <span className="text-[11px] text-red-600 bg-red-50 px-2 py-0.5 rounded font-semibold">غير متوفر</span>
                    )}
                  </div>

                  {/* Product Name */}
                  <h3 className="font-bold text-card-foreground text-sm leading-relaxed mb-2 group-hover:text-primary transition-colors">
                    {product.name_ar}
                  </h3>

                  {/* Category */}
                  {product.product_categories && (
                    <p className="text-xs text-muted-foreground mb-3">
                      {(product.product_categories as any).name_ar}
                    </p>
                  )}

                  {/* Price */}
                  <div className="text-primary font-black text-lg">
                    {getProductPrice(product).toLocaleString("ar-EG")} ج.م
                  </div>
                  {!isDealer && (
                    <p className="text-[11px] text-muted-foreground">سعر قطاعي</p>
                  )}
                  {isDealer && (
                    <p className="text-[11px] text-green-600 font-semibold">سعر الجملة الخاص بك</p>
                  )}

                  {/* Min Order */}
                  {product.min_order_qty > 1 && (
                    <p className="text-[11px] text-muted-foreground mt-2">
                      الحد الأدنى: {product.min_order_qty} قطعة
                    </p>
                  )}

                  {/* Add to Cart */}
                  {product.stock_quantity > 0 && (
                    <Button
                      size="sm"
                      className="w-full mt-3 gap-2"
                      onClick={() => handleAddToCart(product)}
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      أضف للسلة
                    </Button>
                  )}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ProductsPage;
