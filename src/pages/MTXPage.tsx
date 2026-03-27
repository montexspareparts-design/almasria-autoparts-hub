import { useState, useMemo, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShieldCheck, Wrench, CheckCircle2, ArrowLeft, MessageCircle, Users,
  Truck, Award, Target, Globe, DollarSign, Building2, Search, TestTube,
  BarChart3, BadgeCheck, ChevronLeft, Lock, Package, ShoppingCart, Eye,
  AlertTriangle, Grid3X3, List, ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Helmet } from "react-helmet-async";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCart, CartItem } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import AdvancedProductFilter, { ProductFilters } from "@/components/AdvancedProductFilter";
import ProductDetailDialog from "@/components/ProductDetailDialog";

// Brand logos
import brandMtx from "@/assets/brand-mtx.webp";
import brandDenso from "@/assets/brand-denso.webp";
import brandAisin from "@/assets/brand-aisin.webp";

// Hero & backgrounds
import mtxHeroBg from "@/assets/mtx-hero-bg.jpg";

// Category images
import catFilters from "@/assets/cat-mtx-filters.jpg";
import catBrakes from "@/assets/cat-mtx-brakes.jpg";
import catSuspension from "@/assets/cat-mtx-suspension.jpg";
import catElectrical from "@/assets/cat-mtx-electrical.jpg";
import catBelts from "@/assets/cat-mtx-belts.jpg";

/* ─── Data ─── */

const distributedBrands = [
  {
    logo: brandMtx,
    name: "MTX Aftermarket",
    desc: "علامتنا الخاصة — قطع غيار مستوردة بجودة تضاهي الأصلية وبسعر تنافسي.",
    to: "/products/mtx-aftermarket",
    scale: "scale-150",
  },
  {
    logo: brandDenso,
    name: "DENSO",
    desc: "الشركة اليابانية الرائدة في تصنيع مكونات السيارات عالية الأداء.",
    to: "/products/denso",
    scale: "scale-100",
  },
  {
    logo: brandAisin,
    name: "AISIN",
    desc: "قطع غيار يابانية أصلية متخصصة في أنظمة نقل الحركة والتعليق.",
    to: "/products/aisin",
    scale: "scale-100",
  },
];

const advantages = [
  {
    icon: CheckCircle2,
    title: "جودة تضاهي الأصلية",
    desc: "يتم اختبار جميع منتجات MTX لضمان أداء موثوق وعمر افتراضي ممتاز.",
  },
  {
    icon: Globe,
    title: "ماركات عالمية",
    desc: "تعتمد MTX على موردين عالميين لديهم خبرة في تصنيع مكونات سيارات بجودة عالية.",
  },
  {
    icon: DollarSign,
    title: "قيمة مقابل سعر",
    desc: "تقدم MTX جودة قوية بسعر تنافسي يناسب الفئات المختلفة من العملاء.",
  },
  {
    icon: Building2,
    title: "دعم المصرية جروب",
    desc: "تستفيد MTX من خبرة 25 عامًا للمصرية جروب وشبكة توزيع تضم أكثر من 2000 عميل.",
  },
];

const categories = [
  { image: catFilters, name: "فلاتر", detail: "زيت – هواء – وقود – تكييف", slug: "filters" },
  { image: catBrakes, name: "تيل فرامل", detail: "أقراص وتيل فرامل عالية الأداء", slug: "brakes" },
  { image: catSuspension, name: "قطع تعليق", detail: "مقصات – جلب – كراسي موتور", slug: "suspension" },
  { image: catElectrical, name: "كهرباء سيارات", detail: "بوجيهات – حساسات – ريلايات", slug: "electrical" },
  { image: catBelts, name: "سيور ومحركات", detail: "سيور توقيت – سيور مروحة", slug: "belts" },
];

const qualitySteps = [
  { icon: Search, label: "فحص الجودة" },
  { icon: TestTube, label: "مراجعة المواصفات" },
  { icon: BarChart3, label: "مقارنة الأداء" },
  { icon: BadgeCheck, label: "اعتماد المنتج" },
];

const audiences = [
  { icon: Users, label: "تجار الجملة" },
  { icon: Wrench, label: "مراكز الخدمة والصيانة" },
  { icon: Truck, label: "شركات قطاع النقل" },
  { icon: Target, label: "أساطيل التشغيل" },
  { icon: Award, label: "الباحثون عن جودة بسعر مناسب" },
];

/* ─── Animations ─── */

const fadeUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, amount: 0.05 },
};

const stagger = (i: number) => ({ delay: i * 0.1 });

/* ─── Page ─── */

const ITEMS_PER_PAGE = 24;

const MTXPage = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isDealer, user, dealerAccount } = useAuth();
  const { addItem } = useCart();
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState<ProductFilters>({
    search: "", model: null, year: null, chassisNumber: "", partNumber: "", categoryId: null, brandKey: null, priceMin: "", priceMax: "", sortBy: "newest",
  });
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const DAILY_LIMIT = 20;

  useEffect(() => { setCurrentPage(1); }, [filters]);

  const { data: viewedProductIds = [] } = useQuery({
    queryKey: ["dealer_views_today", user?.id],
    queryFn: async () => {
      const today = new Date().toISOString().split("T")[0];
      const { data, error } = await supabase.from("dealer_price_views").select("product_id").eq("user_id", user!.id).eq("view_date", today);
      if (error) throw error;
      return data.map((v) => v.product_id);
    },
    enabled: !!isDealer && !!user,
  });
  const dailyViewCount = viewedProductIds.length;
  const limitReached = dailyViewCount >= DAILY_LIMIT;

  const recordView = useCallback(async (productId: string) => {
    if (!user || !isDealer || viewedProductIds.includes(productId) || limitReached) return;
    await supabase.from("dealer_price_views").upsert(
      { user_id: user.id, product_id: productId, view_date: new Date().toISOString().split("T")[0] },
      { onConflict: "user_id,product_id,view_date" }
    );
    queryClient.invalidateQueries({ queryKey: ["dealer_views_today", user.id] });
  }, [user, isDealer, viewedProductIds, limitReached, queryClient]);

  const { data: tierPrices } = useQuery({
    queryKey: ["tier_prices_mtx", dealerAccount?.tier],
    queryFn: async () => {
      if (!dealerAccount) return {};
      const { data, error } = await supabase.from("product_tier_prices").select("product_id, price").eq("tier", dealerAccount.tier as any);
      if (error) throw error;
      const map: Record<string, number> = {};
      data.forEach((tp) => { map[tp.product_id] = tp.price; });
      return map;
    },
    enabled: !!dealerAccount,
  });

  const getProductPrice = (product: any) => {
    if (isDealer && tierPrices && tierPrices[product.id]) return tierPrices[product.id];
    return product.base_price;
  };

  const handleAddToCart = (product: any) => {
    const cartItem: CartItem = {
      id: product.id, name_ar: product.name_ar, sku: product.sku, image_url: product.image_url,
      unit_price: getProductPrice(product), quantity: product.min_order_qty || 1,
      stock_quantity: product.stock_quantity, min_order_qty: product.min_order_qty, brand: product.brand,
    };
    addItem(cartItem);
    toast({ title: "تمت الإضافة للسلة ✅", description: product.name_ar });
  };

  const { data: dbCategories } = useQuery({
    queryKey: ["product_categories"],
    queryFn: async () => {
      const { data, error } = await supabase.from("product_categories").select("*").order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    const categorySlug = searchParams.get("category");
    if (categorySlug && dbCategories) {
      const matched = dbCategories.find((c) => c.slug === categorySlug);
      if (matched) setFilters((prev) => ({ ...prev, categoryId: matched.id }));
    }
  }, [dbCategories, searchParams]);

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", "mtx_aftermarket"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("*, product_categories(name_ar)")
        .eq("brand", "mtx_aftermarket" as any)
        .eq("is_active", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const filteredProducts = useMemo(() => {
    if (!products) return [];
    let result = products.filter((p) => {
      const s = filters.search?.toLowerCase() || "";
      const matchesSearch = !s || p.name_ar.toLowerCase().includes(s) || p.sku.toLowerCase().includes(s);
      const matchesCategory = !filters.categoryId || p.category_id === filters.categoryId;
      const matchesModel = !filters.model || p.name_ar.includes(filters.model);
      const matchesYear = !filters.year || p.name_ar.includes(filters.year);
      const matchesPartNumber = !filters.partNumber || p.sku.toLowerCase().includes(filters.partNumber.toLowerCase());
      const matchesPriceMin = !filters.priceMin || p.base_price >= Number(filters.priceMin);
      const matchesPriceMax = !filters.priceMax || p.base_price <= Number(filters.priceMax);
      return matchesSearch && matchesCategory && matchesModel && matchesYear && matchesPartNumber && matchesPriceMin && matchesPriceMax;
    });
    switch (filters.sortBy) {
      case "price_asc": result.sort((a, b) => a.base_price - b.base_price); break;
      case "price_desc": result.sort((a, b) => b.base_price - a.base_price); break;
      case "name_asc": result.sort((a, b) => a.name_ar.localeCompare(b.name_ar, "ar")); break;
    }
    return result;
  }, [products, filters]);

  const totalPages = Math.ceil(filteredProducts.length / ITEMS_PER_PAGE);
  const paginatedProducts = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredProducts.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredProducts, currentPage]);

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Helmet>
        <title>MTX | العلامة التابعة للمصرية جروب والمتخصصة في استيراد قطع غيار تويوتا</title>
        <meta
          name="description"
          content="MTX إحدى شركات المصرية جروب، توفر قطع غيار تويوتا مستوردة من أفضل الموردين العالميين بجودة تضاهي الأصلية وبسعر تنافسي، لخدمة التجار ومراكز الصيانة والشركات."
        />
        <meta name="keywords" content="MTX, قطع غيار تويوتا, استيراد قطع غيار, موزع معتمد, أفترماركت, جودة تضاهي الأصلية, DENSO, AISIN" />
        <link rel="canonical" href="https://almasriaautoparts.com/mtx" />
      </Helmet>
      <Navbar />

      {/* ═══════════════════════════════════════════
          Section 1 — Hero: Brands We Distribute
      ═══════════════════════════════════════════ */}
      <section className="relative pt-24 pb-20 md:pt-32 md:pb-28 overflow-hidden">
        {/* Background */}
        <img src={mtxHeroBg} alt="" className="absolute inset-0 w-full h-full object-cover" loading="eager" />
        <div className="absolute inset-0 bg-secondary/80 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-secondary/30 to-secondary" />
        <div className="absolute top-1/4 left-[10%] w-[500px] h-[500px] rounded-full bg-primary/8 blur-[180px]" />

        <div className="container mx-auto px-4 relative z-10">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-primary hover:underline mb-8 group">
            <ChevronLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            العودة للرئيسية
          </Link>

          {/* Title */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
            className="text-center mb-14"
          >
            <motion.span
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-full bg-primary/15 border border-primary/30 text-primary text-sm font-bold mb-6"
            >
              <ShieldCheck className="w-4 h-4" />
              إحدى شركات المصرية جروب
            </motion.span>

            <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-dark-section-foreground leading-[1.15] tracking-tight mb-5">
              <span className="shimmer-text">MTX</span> — إحدى شركات{" "}
              <span className="text-primary">المصرية جروب</span>
            </h1>

            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              className="text-dark-section-foreground/60 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed"
            >
              MTX هي إحدى شركات المصرية جروب، متخصصة في استيراد وتوزيع قطع غيار
              تويوتا، وتركّز على تلبية احتياجات السوق المحلي من خلال توفير علامات
              تجارية عالمية بمعايير جودة تضاهي قطع الغيار الأصلية.
            </motion.p>
          </motion.div>

          {/* 3 Brand Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {distributedBrands.map((brand, i) => (
              <motion.div
                key={brand.name}
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 + i * 0.15, type: "spring", stiffness: 80 }}
              >
                <Link
                  to={brand.to}
                  className="block bg-dark-section-foreground/5 backdrop-blur-sm border border-dark-section-foreground/10 rounded-2xl p-6 hover:border-primary/40 hover:bg-dark-section-foreground/10 transition-all duration-500 group"
                >
                  {/* Logo */}
                  <div className="bg-white rounded-xl aspect-[4/3] flex items-center justify-center mb-5 overflow-hidden shadow-lg group-hover:shadow-primary/20 transition-shadow duration-500">
                    <motion.img
                      src={brand.logo}
                      alt={brand.name}
                      className={`w-[80%] h-[80%] object-contain ${brand.scale}`}
                      whileHover={{ scale: 1.08 }}
                      transition={{ duration: 0.4 }}
                    />
                  </div>

                  {/* Info */}
                  <h3 className="text-lg font-bold text-dark-section-foreground mb-2 group-hover:text-primary transition-colors">
                    {brand.name}
                  </h3>
                  <p className="text-dark-section-foreground/50 text-sm leading-relaxed mb-4">
                    {brand.desc}
                  </p>

                  {/* CTA */}
                  <span className="inline-flex items-center gap-2 text-primary text-sm font-bold group-hover:gap-3 transition-all">
                    استعرض المنتجات
                    <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
                  </span>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          Section 2 — About MTX
      ═══════════════════════════════════════════ */}
      <section className="py-20 md:py-28 bg-background">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
              من نحن — <span className="text-primary">MTX</span>
            </h2>
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "4rem" }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="h-1 bg-primary mx-auto rounded-full mb-8"
            />
            <p className="text-muted-foreground text-lg md:text-xl leading-[2] tracking-wide">
              MTX هي إحدى العلامات التابعة للمصرية جروب، وتعمل على توفير قطع غيار
              تويوتا بطريقة احترافية تعتمد على استيراد منتجات عالية الجودة من موردين
              عالميين، مما يجعلها خيارًا موثوقًا يلبي احتياجات العملاء الباحثين عن
              جودة قريبة من الأصلية وبسعر مناسب.
            </p>
          </motion.div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          Section 3 — Key Advantages
      ═══════════════════════════════════════════ */}
      <section className="py-20 md:py-28 bg-dark-section">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black text-dark-section-foreground mb-3">
              لماذا <span className="shimmer-text">MTX</span>؟
            </h2>
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "4rem" }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="h-1 bg-primary mx-auto rounded-full"
            />
          </motion.div>

          <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {advantages.map((item, i) => (
              <motion.div
                key={item.title}
                {...fadeUp}
                transition={{ ...stagger(i), duration: 0.5 }}
                className="relative bg-dark-section-foreground/5 border border-dark-section-foreground/10 rounded-2xl p-7 hover:border-primary/30 transition-all duration-300 group overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-transparent transition-all duration-500 rounded-2xl" />
                <div className="relative z-10 flex items-start gap-4">
                  <div className="w-14 h-14 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/25 transition-colors">
                    <item.icon className="w-7 h-7 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-bold text-dark-section-foreground text-lg mb-2">{item.title}</h3>
                    <p className="text-dark-section-foreground/55 text-sm leading-relaxed">{item.desc}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          Section 4 — Product Categories (with real images)
      ═══════════════════════════════════════════ */}
      <section className="py-20 md:py-28 bg-background">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
              فئات منتجات <span className="text-primary">MTX</span>
            </h2>
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "4rem" }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="h-1 bg-primary mx-auto rounded-full"
            />
          </motion.div>

          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-5 max-w-6xl mx-auto">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.name}
                {...fadeUp}
                transition={{ ...stagger(i), duration: 0.5 }}
              >
                <Link
                  to={`/products/mtx-aftermarket?category=${cat.slug}`}
                  className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/30 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full"
                >
                  {/* Image */}
                  <div className="aspect-square overflow-hidden">
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      loading="lazy"
                    />
                  </div>

                  {/* Info */}
                  <div className="p-4 text-center flex-1 flex flex-col">
                    <h3 className="font-bold text-foreground text-base mb-1.5">{cat.name}</h3>
                    <p className="text-muted-foreground text-xs leading-relaxed mb-4 flex-1">{cat.detail}</p>
                    <span className="mx-auto text-xs border border-primary/20 text-primary rounded-md px-3 py-1.5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      اطلب عرض سعر
                    </span>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          Section 4.5 — Product Search & Browse
      ═══════════════════════════════════════════ */}
      <section id="mtx-products" className="py-12 md:py-16 bg-muted/30 border-y border-border">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
              تصفح منتجات <span className="text-primary">MTX</span>
            </h2>
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "4rem" }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="h-1 bg-primary mx-auto rounded-full"
            />
          </motion.div>

          {/* Dealer banners */}
          {!isDealer && (
            <div className="bg-muted/50 border border-primary/15 rounded-xl p-3.5 mb-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="w-3 h-3 text-primary shrink-0" />
                <p className="text-foreground text-sm"><strong>تاجر معتمد؟</strong> سجل دخولك للحصول على أسعار الجملة الخاصة.</p>
              </div>
              <Button size="sm" className="shrink-0 rounded-lg" asChild><Link to="/dealer-login">التسجيل كتاجر</Link></Button>
            </div>
          )}

          {isDealer && (
            <div className={`rounded-xl p-3.5 mb-4 flex items-center justify-between flex-wrap gap-3 border ${limitReached ? "bg-destructive/5 border-destructive/20" : "bg-muted/50 border-primary/15"}`}>
              <div className="flex items-center gap-2.5">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${limitReached ? "bg-destructive/10" : "bg-primary/10"}`}>
                  <Eye className="w-4 h-4 text-primary" />
                </div>
                <p className="text-foreground text-sm">
                  {limitReached ? <><strong>استنفدت الحد اليومي.</strong> يمكنك مشاهدة أسعار جديدة غداً.</> : <>شاهدت <strong>{dailyViewCount}</strong> من <strong>{DAILY_LIMIT}</strong> صنف اليوم</>}
                </p>
              </div>
            </div>
          )}

          <AdvancedProductFilter
            filters={filters}
            onFiltersChange={setFilters}
            categories={dbCategories?.filter(cat => products?.some(p => p.category_id === cat.id))}
            showCategories={true}
            totalResults={filteredProducts.length}
            isLoading={isLoading}
          />

          {/* View mode toggle */}
          <div className="flex items-center justify-between mb-5 mt-6">
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <button onClick={() => setViewMode("grid")} className={`p-2 rounded-md transition-all ${viewMode === "grid" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode("list")} className={`p-2 rounded-md transition-all ${viewMode === "list" ? "bg-card shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                <List className="w-4 h-4" />
              </button>
            </div>
            {totalPages > 1 && <p className="text-xs text-muted-foreground">صفحة {currentPage} من {totalPages}</p>}
          </div>

          {isLoading ? (
            <div className={viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4" : "space-y-3"}>
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-4 animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-3" />
                  <div className="h-3 bg-muted rounded w-1/2 mb-2" />
                  <div className="h-3 bg-muted rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : paginatedProducts.length === 0 ? (
            <div className="text-center py-24">
              <div className="w-20 h-20 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-5">
                <Package className="w-10 h-10 text-muted-foreground/30" />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">لا توجد منتجات</h3>
              <p className="text-muted-foreground text-sm mb-4">جرب تغيير كلمة البحث أو الفلتر</p>
              <Button variant="outline" size="sm" onClick={() => setFilters({ search: "", model: null, year: null, chassisNumber: "", partNumber: "", categoryId: null, brandKey: null, priceMin: "", priceMax: "", sortBy: "newest" })}>
                مسح جميع الفلاتر
              </Button>
            </div>
          ) : viewMode === "grid" ? (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {paginatedProducts.map((product, i) => (
                <motion.div key={product.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.02, 0.4) }}
                  className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 hover:-translate-y-1 transition-all duration-300 group cursor-pointer"
                  onClick={() => setSelectedProduct(product)}
                >
                  <div className="aspect-square bg-white relative overflow-hidden">
                    {product.image_url ? (
                      <img src={product.image_url} alt={product.name_ar} className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-500" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center"><Package className="w-12 h-12 text-muted-foreground/20" /></div>
                    )}
                    {product.is_on_sale && <span className="absolute top-2 left-2 bg-destructive text-destructive-foreground text-[10px] font-bold px-2 py-0.5 rounded-full">تخفيض</span>}
                  </div>
                  <div className="p-3 sm:p-4" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] sm:text-[11px] font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded">{product.sku}</span>
                      {product.stock_quantity > 0 ? (
                        <span className="text-[10px] sm:text-[11px] text-green-600 bg-green-50 px-2 py-0.5 rounded font-semibold">متوفر</span>
                      ) : (
                        <span className="text-[10px] sm:text-[11px] text-red-600 bg-red-50 px-2 py-0.5 rounded font-semibold">غير متوفر</span>
                      )}
                    </div>
                    <h3 className="font-bold text-card-foreground text-xs sm:text-sm leading-relaxed mb-1.5 line-clamp-2 group-hover:text-primary transition-colors">{product.name_ar}</h3>
                    {product.product_categories && <p className="text-[10px] sm:text-xs text-muted-foreground mb-3">{(product.product_categories as any).name_ar}</p>}
                    {!user ? (
                      <Button variant="outline" size="sm" className="w-full mt-1 gap-2 text-xs" onClick={() => { toast({ title: "يجب تسجيل الدخول أولاً", description: "سجل دخولك لتتمكن من عرض أسعار المنتجات" }); navigate("/auth"); }}>
                        <Lock className="w-3.5 h-3.5" />سجل دخولك لعرض السعر
                      </Button>
                    ) : !isDealer ? (
                      <>
                        <div className="text-primary font-black text-base sm:text-lg">{product.base_price.toLocaleString("ar-EG")} ج.م</div>
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground">سعر قطاعي</p>
                      </>
                    ) : viewedProductIds.includes(product.id) ? (
                      <>
                        <div className="text-primary font-black text-base sm:text-lg">{getProductPrice(product).toLocaleString("ar-EG")} ج.م</div>
                        <p className="text-[10px] sm:text-[11px] text-green-600 font-semibold">سعر الجملة الخاص بك</p>
                      </>
                    ) : !limitReached ? (
                      <Button variant="outline" size="sm" className="w-full mt-1 gap-2 text-xs" onClick={() => recordView(product.id)}>
                        <Eye className="w-3.5 h-3.5" />اعرض السعر ({DAILY_LIMIT - dailyViewCount} متبقي)
                      </Button>
                    ) : (
                      <div className="flex items-center gap-2 text-muted-foreground text-xs py-1"><Lock className="w-3.5 h-3.5" /><span>استنفدت الحد اليومي</span></div>
                    )}
                    {product.min_order_qty > 1 && <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-2">الحد الأدنى: {product.min_order_qty} قطعة</p>}
                    {product.stock_quantity > 0 && user && (!isDealer || viewedProductIds.includes(product.id)) && (
                      <Button size="sm" className="w-full mt-3 gap-2 text-xs" onClick={() => handleAddToCart(product)}>
                        <ShoppingCart className="w-3.5 h-3.5" />أضف للسلة
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {paginatedProducts.map((product, i) => (
                <motion.div key={product.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: Math.min(i * 0.02, 0.3) }}
                  className="bg-card border border-border rounded-xl overflow-hidden hover:border-primary/40 hover:shadow-lg transition-all duration-300 cursor-pointer flex"
                  onClick={() => setSelectedProduct(product)}
                >
                  <div className="w-28 sm:w-36 shrink-0 bg-white flex items-center justify-center p-3">
                    {product.image_url ? <img src={product.image_url} alt={product.name_ar} className="w-full h-full object-contain" loading="lazy" /> : <Package className="w-10 h-10 text-muted-foreground/20" />}
                  </div>
                  <div className="flex-1 p-3 sm:p-4 flex flex-col justify-center" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className="text-[10px] font-mono bg-muted text-muted-foreground px-2 py-0.5 rounded">{product.sku}</span>
                      {product.stock_quantity > 0 ? <span className="text-[10px] text-green-600 bg-green-50 px-2 py-0.5 rounded font-semibold">متوفر</span> : <span className="text-[10px] text-red-600 bg-red-50 px-2 py-0.5 rounded font-semibold">غير متوفر</span>}
                    </div>
                    <h3 className="font-bold text-card-foreground text-sm leading-relaxed mb-1">{product.name_ar}</h3>
                    {product.product_categories && <p className="text-xs text-muted-foreground mb-2">{(product.product_categories as any).name_ar}</p>}
                    <div className="flex items-center gap-3 flex-wrap">
                      {!user ? (
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => navigate("/auth")}><Lock className="w-3 h-3" />سجل لعرض السعر</Button>
                      ) : !isDealer ? (
                        <span className="text-primary font-black text-lg">{product.base_price.toLocaleString("ar-EG")} ج.م</span>
                      ) : viewedProductIds.includes(product.id) ? (
                        <span className="text-primary font-black text-lg">{getProductPrice(product).toLocaleString("ar-EG")} ج.م</span>
                      ) : !limitReached ? (
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" onClick={() => recordView(product.id)}><Eye className="w-3 h-3" />اعرض السعر</Button>
                      ) : null}
                      {product.stock_quantity > 0 && user && (!isDealer || viewedProductIds.includes(product.id)) && (
                        <Button size="sm" className="gap-1.5 text-xs h-8" onClick={() => handleAddToCart(product)}><ShoppingCart className="w-3 h-3" />أضف للسلة</Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-10">
              <Button variant="outline" size="sm" disabled={currentPage <= 1} onClick={() => { setCurrentPage((p) => p - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="gap-1">
                <ChevronRight className="w-4 h-4" />السابق
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
                  let page: number;
                  if (totalPages <= 7) page = i + 1;
                  else if (currentPage <= 4) page = i + 1;
                  else if (currentPage >= totalPages - 3) page = totalPages - 6 + i;
                  else page = currentPage - 3 + i;
                  return (
                    <button key={page} onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      className={`w-9 h-9 rounded-lg text-sm font-medium transition-all ${currentPage === page ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}>
                      {page}
                    </button>
                  );
                })}
              </div>
              <Button variant="outline" size="sm" disabled={currentPage >= totalPages} onClick={() => { setCurrentPage((p) => p + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }} className="gap-1">
                التالي<ChevronLeft className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </section>

      <ProductDetailDialog
        product={selectedProduct}
        open={!!selectedProduct}
        onOpenChange={(open) => { if (!open) setSelectedProduct(null); }}
        price={selectedProduct ? !user ? null : !isDealer ? selectedProduct.base_price : viewedProductIds.includes(selectedProduct.id) ? getProductPrice(selectedProduct) : null : null}
        priceLabel={selectedProduct && user ? isDealer && viewedProductIds.includes(selectedProduct.id) ? "سعر الجملة الخاص بك" : !isDealer ? "سعر قطاعي" : undefined : undefined}
        canAddToCart={!!user && (!isDealer || (selectedProduct && viewedProductIds.includes(selectedProduct.id)))}
        onAddToCart={handleAddToCart}
        isLoggedIn={!!user}
        isDealer={isDealer}
        onLoginPrompt={() => { toast({ title: "يجب تسجيل الدخول أولاً", description: "سجل دخولك لتتمكن من عرض أسعار المنتجات" }); navigate("/auth"); }}
        onRevealPrice={(productId) => recordView(productId)}
        remainingViews={DAILY_LIMIT - dailyViewCount}
        limitReached={limitReached}
      />

      {/* ═══════════════════════════════════════════
          Section 5 — Quality Process
      ═══════════════════════════════════════════ */}
      <section className="py-20 md:py-28 bg-dark-section">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} className="text-center mb-8">
            <h2 className="text-3xl md:text-4xl font-black text-dark-section-foreground mb-3">
              كيفية اختيار منتجات <span className="shimmer-text">MTX</span>
            </h2>
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "4rem" }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="h-1 bg-primary mx-auto rounded-full mb-8"
            />
            <p className="text-dark-section-foreground/60 text-base md:text-lg leading-[2] max-w-3xl mx-auto">
              تعتمد MTX على عملية دقيقة لاختيار الموردين تشمل فحص الجودة، مراجعة
              المواصفات، مقارنة الأداء مع القطع الأصلية، وضمان اتساق المنتج قبل
              التوريد للسوق المصري.
            </p>
          </motion.div>

          <div className="flex flex-wrap justify-center gap-6 md:gap-10 mt-14 max-w-3xl mx-auto">
            {qualitySteps.map((step, i) => (
              <motion.div
                key={step.label}
                {...fadeUp}
                transition={{ ...stagger(i), duration: 0.5 }}
                className="flex flex-col items-center gap-3 text-center"
              >
                <div className="relative">
                  <div className="w-20 h-20 rounded-2xl bg-primary/15 border border-primary/20 flex items-center justify-center">
                    <step.icon className="w-9 h-9 text-primary" />
                  </div>
                  <span className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center shadow-lg">
                    {i + 1}
                  </span>
                </div>
                <p className="text-dark-section-foreground/80 text-sm font-semibold">{step.label}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          Section 6 — Target Audience
      ═══════════════════════════════════════════ */}
      <section className="py-20 md:py-28 bg-card border-y border-border">
        <div className="container mx-auto px-4">
          <motion.div {...fadeUp} className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
              من يخدمهم <span className="text-primary">MTX</span>؟
            </h2>
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: "4rem" }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.3 }}
              className="h-1 bg-primary mx-auto rounded-full"
            />
          </motion.div>

          <div className="flex flex-wrap justify-center gap-8 max-w-4xl mx-auto">
            {audiences.map((a, i) => (
              <motion.div
                key={a.label}
                {...fadeUp}
                transition={{ ...stagger(i), duration: 0.5 }}
                className="flex flex-col items-center gap-4 text-center w-[calc(33.333%-2rem)] min-w-[160px]"
              >
                <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/15 flex items-center justify-center">
                  <a.icon className="w-8 h-8 text-primary" />
                </div>
                <h3 className="font-bold text-foreground text-sm">{a.label}</h3>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════
          Section 7 — Final CTA
      ═══════════════════════════════════════════ */}
      <section className="py-20 md:py-28 bg-dark-section relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-[500px] h-[300px] rounded-full bg-primary/8 blur-[160px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[250px] rounded-full bg-primary/5 blur-[140px]" />

        <div className="container mx-auto px-4 text-center relative z-10">
          <motion.div {...fadeUp}>
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-black text-dark-section-foreground mb-4">
              ابدأ تعاملاتك مع <span className="shimmer-text">MTX</span> الآن
            </h2>
            <p className="text-dark-section-foreground/50 text-lg mb-10 max-w-xl mx-auto">
              انضم لأكثر من 2000 عميل يثقون في منتجات المصرية جروب
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button
                size="lg"
                className="gap-3 font-bold text-base px-8 py-6 bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/20 group"
                asChild
              >
                <a href="https://wa.me/201153961008?text=أريد كتالوج MTX" target="_blank" rel="noopener noreferrer">
                  اطلب كتالوج MTX
                  <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
                </a>
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="gap-3 font-bold text-base px-8 py-6 border-2 border-dark-section-foreground/20 text-dark-section-foreground bg-transparent hover:bg-dark-section-foreground/10"
                asChild
              >
                <a href="https://wa.me/201153961008?text=أريد التحدث مع قسم المبيعات" target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-5 h-5" />
                  تواصل مع قسم المبيعات
                </a>
              </Button>

              <Button
                size="lg"
                variant="outline"
                className="gap-3 font-bold text-base px-8 py-6 border-2 border-dark-section-foreground/20 text-dark-section-foreground bg-transparent hover:bg-dark-section-foreground/10"
                asChild
              >
                <Link to="/dealer-apply">
                  <Users className="w-5 h-5" />
                  انضم كموزع معتمد
                </Link>
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Internal Links */}
      <section className="py-10 bg-background border-t border-border">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <Link to="/" className="text-muted-foreground hover:text-primary transition-colors font-medium">الرئيسية</Link>
            <span className="text-border">|</span>
            <Link to="/products/mtx-aftermarket" className="text-muted-foreground hover:text-primary transition-colors font-medium">منتجات MTX</Link>
            <span className="text-border">|</span>
            <Link to="/what-sets-us-apart" className="text-muted-foreground hover:text-primary transition-colors font-medium">ما يميزنا</Link>
            <span className="text-border">|</span>
            <Link to="/contact" className="text-muted-foreground hover:text-primary transition-colors font-medium">اتصل بنا</Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default MTXPage;
