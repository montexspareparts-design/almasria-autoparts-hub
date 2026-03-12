import { useState, useEffect, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCart, CartItem } from "@/contexts/CartContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  FileText,
  Download,
  Lock,
  Loader2,
  Filter,
  Search,
  ArrowRight,
  BookOpen,
  ShieldCheck,
  Eye,
  X,
  Maximize2,
  DollarSign,
  ShoppingCart,
  Package,
  AlertTriangle,
  CheckCircle2,
  Plus,
  Minus,
  TrendingUp,
  BarChart3,
  ClipboardList,
  Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface Catalog {
  id: string;
  title_ar: string;
  title_en: string | null;
  category: string | null;
  description_ar: string | null;
  file_url: string | null;
  is_active: boolean;
  sort_order: number | null;
}

interface Product {
  id: string;
  sku: string;
  name_ar: string;
  name_en: string | null;
  brand: string;
  base_price: number;
  sale_price: number | null;
  is_on_sale: boolean;
  stock_quantity: number;
  min_order_qty: number;
  image_url: string | null;
}

interface TierPrice {
  price: number;
  discount_price: number | null;
  min_qty_for_discount: number | null;
}

const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  toyota_genuine:  { bg: "bg-blue-500/10",   text: "text-blue-400",   border: "border-blue-500/30"   },
  toyota_oils:     { bg: "bg-amber-500/10",  text: "text-amber-400",  border: "border-amber-500/30"  },
  mtx_aftermarket: { bg: "bg-violet-500/10", text: "text-violet-400", border: "border-violet-500/30" },
  denso:           { bg: "bg-green-500/10",  text: "text-green-400",  border: "border-green-500/30"  },
  aisin:           { bg: "bg-rose-500/10",   text: "text-rose-400",   border: "border-rose-500/30"   },
  general:         { bg: "bg-muted",         text: "text-muted-foreground", border: "border-border"  },
};

const categoryLabels: Record<string, string> = {
  toyota_genuine:  "قطع أصلية تويوتا",
  toyota_oils:     "زيوت تويوتا",
  mtx_aftermarket: "قطع MTX",
  denso:           "DENSO",
  aisin:           "AISIN",
  general:         "عام",
};

const brandLabels: Record<string, string> = {
  toyota_genuine:  "تويوتا أصلي",
  toyota_oils:     "زيوت تويوتا",
  mtx_aftermarket: "MTX",
  denso:           "DENSO",
  aisin:           "AISIN",
};

const ALL_KEY = "__all__";
const MAX_DAILY_LOOKUPS = 20;

const cardVariants = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.4, ease: "easeOut" as const },
  }),
};

/* ────────────────────────────────────────────────────────────── */

const CatalogsPage = () => {
  const { user, dealerAccount, isDealer, loading: authLoading } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Catalogs state
  const [catalogs, setCatalogs]     = useState<Catalog[]>([]);
  const [loading, setLoading]       = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>(ALL_KEY);
  const [catalogSearch, setCatalogSearch] = useState("");

  // PDF viewer state
  const [pdfCatalog, setPdfCatalog] = useState<Catalog | null>(null);
  const [pdfUrl, setPdfUrl]         = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Price lookup state
  const [priceSearch, setPriceSearch] = useState("");
  const [priceResults, setPriceResults] = useState<(Product & { tierPrice?: TierPrice })[]>([]);
  const [priceLoading, setPriceLoading] = useState(false);
  const [dailyLookups, setDailyLookups] = useState(0);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  // Quick order state
  const [quickSkuInput, setQuickSkuInput] = useState("");
  const [quickResults, setQuickResults] = useState<{
    sku: string;
    product?: Product & { tierPrice?: TierPrice };
    found: boolean;
  }[]>([]);
  const [quickLoading, setQuickLoading] = useState(false);
  const [quickQuantities, setQuickQuantities] = useState<Record<string, number>>({});
  const [addingAllToCart, setAddingAllToCart] = useState(false);

  // Active tab
  const [activeTab, setActiveTab] = useState("catalogs");

  const isWholesale =
    isDealer &&
    !!dealerAccount?.is_active &&
    (dealerAccount?.tier === "wholesale_tier1" || dealerAccount?.tier === "wholesale_tier2");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    if (!isWholesale) { setLoading(false); return; }
    fetchCatalogs();
    fetchDailyLookupCount();
  }, [authLoading, user, isWholesale]);

  const fetchCatalogs = async () => {
    const { data } = await supabase
      .from("catalogs")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    setCatalogs(data || []);
    setLoading(false);
  };

  const fetchDailyLookupCount = async () => {
    if (!user) return;
    const { data } = await supabase.rpc("get_daily_view_count", { _user_id: user.id });
    setDailyLookups(data ?? 0);
  };

  /** Get a 10-minute signed URL */
  const getSignedUrl = async (catalog: Catalog) => {
    if (!catalog.file_url) return null;
    const { data, error } = await supabase.storage
      .from("catalogs")
      .createSignedUrl(catalog.file_url, 600);
    if (error || !data?.signedUrl) return null;
    return data.signedUrl;
  };

  const handlePreview = async (catalog: Catalog) => {
    if (!catalog.file_url) {
      toast({ title: "الملف غير متوفر", variant: "destructive" });
      return;
    }
    setPreviewing(catalog.id);
    setPdfLoading(true);
    const url = await getSignedUrl(catalog);
    setPreviewing(null);
    if (!url) {
      toast({ title: "تعذّر فتح الملف، حاول مجدداً", variant: "destructive" });
      return;
    }
    setPdfUrl(url);
    setPdfCatalog(catalog);
    setPdfLoading(false);
  };

  const handleDownload = async (catalog: Catalog) => {
    if (!catalog.file_url) {
      toast({ title: "الملف غير متوفر", variant: "destructive" });
      return;
    }
    setDownloading(catalog.id);
    const url = await getSignedUrl(catalog);
    if (!url) {
      toast({ title: "تعذّر تحميل الملف، حاول مجدداً", variant: "destructive" });
    } else {
      const a = document.createElement("a");
      a.href = url;
      a.download = `${catalog.title_ar}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast({ title: `جاري تحميل: ${catalog.title_ar}` });
    }
    setDownloading(null);
  };

  const handleOpenExternal = () => {
    if (pdfUrl) window.open(pdfUrl, "_blank");
  };

  const closePdf = () => {
    setPdfCatalog(null);
    setPdfUrl(null);
  };

  // Price lookup
  const handlePriceSearch = useCallback(async () => {
    if (!priceSearch.trim()) {
      toast({ title: "أدخل رقم القطعة أو اسم المنتج", variant: "destructive" });
      return;
    }

    if (dailyLookups >= MAX_DAILY_LOOKUPS) {
      toast({ 
        title: "تم استنفاد الحد اليومي", 
        description: `الحد الأقصى ${MAX_DAILY_LOOKUPS} استعلام يومياً. يتجدد منتصف الليل.`,
        variant: "destructive" 
      });
      return;
    }

    setPriceLoading(true);
    setPriceResults([]);

    try {
      // Search products
      const { data: products, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .or(`sku.ilike.%${priceSearch}%,name_ar.ilike.%${priceSearch}%,name_en.ilike.%${priceSearch}%`)
        .limit(10);

      if (error) throw error;

      if (!products || products.length === 0) {
        toast({ title: "لا توجد نتائج", description: "جرّب رقم قطعة أو اسم مختلف" });
        setPriceLoading(false);
        return;
      }

      // Get tier prices for these products
      const productIds = products.map(p => p.id);
      type CustomerTier = "wholesale_tier1" | "wholesale_tier2" | "corporate" | "retail";
      const tierValue: CustomerTier = (dealerAccount?.tier as CustomerTier) ?? "retail";
      const { data: tierPrices } = await supabase
        .from("product_tier_prices")
        .select("*")
        .in("product_id", productIds)
        .eq("tier", tierValue);

      // Log view for each product (upsert to avoid duplicate counting)
      const today = new Date().toISOString().split("T")[0];
      for (const product of products) {
        await supabase.from("dealer_price_views").upsert(
          { user_id: user!.id, product_id: product.id, view_date: today },
          { onConflict: "user_id,product_id,view_date" }
        );
      }

      // Merge tier prices with products
      const resultsWithPrices = products.map(product => {
        const tierPrice = tierPrices?.find(tp => tp.product_id === product.id);
        return {
          ...product,
          tierPrice: tierPrice ? {
            price: tierPrice.price,
            discount_price: tierPrice.discount_price,
            min_qty_for_discount: tierPrice.min_qty_for_discount,
          } : undefined,
        };
      });

      setPriceResults(resultsWithPrices);
      setDailyLookups(prev => prev + products.length);
      
      // Initialize quantities
      const initQty: Record<string, number> = {};
      resultsWithPrices.forEach(p => {
        initQty[p.id] = p.min_order_qty || 1;
      });
      setQuantities(initQty);

    } catch (err) {
      console.error(err);
      toast({ title: "حدث خطأ أثناء البحث", variant: "destructive" });
    }

    setPriceLoading(false);
  }, [priceSearch, dailyLookups, user, dealerAccount, toast]);

  const handleAddToCart = async (product: Product & { tierPrice?: TierPrice }) => {
    setAddingToCart(product.id);
    
    const qty = quantities[product.id] || product.min_order_qty || 1;
    const price = product.tierPrice?.price ?? (product.is_on_sale && product.sale_price ? product.sale_price : product.base_price);
    
    const cartItem: CartItem = {
      id: product.id,
      name_ar: product.name_ar,
      sku: product.sku,
      image_url: product.image_url,
      unit_price: price,
      quantity: qty,
      stock_quantity: product.stock_quantity,
      min_order_qty: product.min_order_qty,
      brand: product.brand,
    };

    addItem(cartItem);
    toast({ 
      title: "تمت الإضافة للسلة",
      description: `${product.name_ar} (${qty} قطعة)`,
    });
    
    setTimeout(() => setAddingToCart(null), 500);
  };

  const updateQuantity = (productId: string, delta: number, min: number, max: number) => {
    setQuantities(prev => {
      const current = prev[productId] || min;
      const next = Math.max(min, Math.min(max, current + delta));
      return { ...prev, [productId]: next };
    });
  };

  // ── Quick Order ──
  const handleQuickOrder = useCallback(async () => {
    if (!quickSkuInput.trim()) {
      toast({ title: "أدخل أرقام القطع", variant: "destructive" });
      return;
    }

    const rawSkus = quickSkuInput
      .split(/[\n,;\t]+/)
      .map(s => s.trim().toUpperCase())
      .filter(Boolean);
    const uniqueSkus = [...new Set(rawSkus)];

    if (uniqueSkus.length === 0) {
      toast({ title: "لا توجد أرقام قطع صالحة", variant: "destructive" });
      return;
    }
    if (uniqueSkus.length > 50) {
      toast({ title: "الحد الأقصى 50 رقم قطعة في المرة", variant: "destructive" });
      return;
    }
    if (dailyLookups + uniqueSkus.length > MAX_DAILY_LOOKUPS) {
      toast({
        title: "تجاوز الحد اليومي",
        description: `متبقي ${MAX_DAILY_LOOKUPS - dailyLookups} استعلام. قلل عدد الأرقام.`,
        variant: "destructive",
      });
      return;
    }

    setQuickLoading(true);
    setQuickResults([]);

    try {
      const { data: products, error } = await supabase
        .from("products")
        .select("*")
        .eq("is_active", true)
        .in("sku", uniqueSkus);

      if (error) throw error;

      const foundIds = (products || []).map(p => p.id);
      type CustomerTier = "wholesale_tier1" | "wholesale_tier2" | "corporate" | "retail";
      const tierValue: CustomerTier = (dealerAccount?.tier as CustomerTier) ?? "retail";
      let tierPrices: { product_id: string; price: number; discount_price: number | null; min_qty_for_discount: number | null }[] = [];

      if (foundIds.length > 0) {
        const { data: tp } = await supabase
          .from("product_tier_prices")
          .select("*")
          .in("product_id", foundIds)
          .eq("tier", tierValue);
        tierPrices = tp || [];

        const today = new Date().toISOString().split("T")[0];
        for (const product of products!) {
          await supabase.from("dealer_price_views").upsert(
            { user_id: user!.id, product_id: product.id, view_date: today },
            { onConflict: "user_id,product_id,view_date" }
          );
        }
        setDailyLookups(prev => prev + foundIds.length);
      }

      const results = uniqueSkus.map(sku => {
        const product = products?.find(p => p.sku.toUpperCase() === sku);
        if (!product) return { sku, found: false };
        const tierPrice = tierPrices.find(tp => tp.product_id === product.id);
        return {
          sku,
          found: true,
          product: {
            ...product,
            tierPrice: tierPrice
              ? { price: tierPrice.price, discount_price: tierPrice.discount_price, min_qty_for_discount: tierPrice.min_qty_for_discount }
              : undefined,
          },
        };
      });

      setQuickResults(results);
      const initQty: Record<string, number> = {};
      results.forEach(r => { if (r.product) initQty[r.product.id] = r.product.min_order_qty || 1; });
      setQuickQuantities(initQty);

      const notFound = results.filter(r => !r.found).length;
      toast({
        title: `تم البحث: ${results.filter(r => r.found).length} منتج`,
        description: notFound > 0 ? `${notFound} رقم قطعة غير موجود` : "تم العثور على جميع القطع",
      });
    } catch (err) {
      console.error(err);
      toast({ title: "حدث خطأ أثناء البحث", variant: "destructive" });
    }

    setQuickLoading(false);
  }, [quickSkuInput, dailyLookups, user, dealerAccount, toast]);

  const handleAddAllToCart = useCallback(() => {
    const validItems = quickResults.filter(r => r.found && r.product && r.product.stock_quantity > 0);
    if (validItems.length === 0) {
      toast({ title: "لا توجد قطع متوفرة للإضافة", variant: "destructive" });
      return;
    }
    setAddingAllToCart(true);
    validItems.forEach(r => {
      const product = r.product!;
      const qty = quickQuantities[product.id] || product.min_order_qty || 1;
      const price = product.tierPrice?.price ?? (product.is_on_sale && product.sale_price ? product.sale_price : product.base_price);
      addItem({ id: product.id, name_ar: product.name_ar, sku: product.sku, image_url: product.image_url, unit_price: price, quantity: qty, stock_quantity: product.stock_quantity, min_order_qty: product.min_order_qty, brand: product.brand });
    });
    toast({ title: `تمت إضافة ${validItems.length} منتج للسلة`, description: "يمكنك مراجعة السلة لتعديل الكميات" });
    setTimeout(() => setAddingAllToCart(false), 600);
  }, [quickResults, quickQuantities, addItem, toast]);

  const updateQuickQuantity = (productId: string, delta: number, min: number, max: number) => {
    setQuickQuantities(prev => {
      const current = prev[productId] || min;
      const next = Math.max(min, Math.min(max, current + delta));
      return { ...prev, [productId]: next };
    });
  };

  const categories = [ALL_KEY, ...Array.from(new Set(catalogs.map(c => c.category || "general")))];

  const filteredCatalogs = catalogs.filter(c => {
    const catKey = c.category || "general";
    const matchCat    = activeCategory === ALL_KEY || catKey === activeCategory;
    const matchSearch = !catalogSearch || c.title_ar.includes(catalogSearch) || (c.title_en ?? "").toLowerCase().includes(catalogSearch.toLowerCase());
    return matchCat && matchSearch;
  });

  /* ── Loading ── */
  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  /* ── Locked ── */
  if (!isWholesale) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-background flex items-center justify-center px-4 py-20">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
            className="max-w-md w-full text-center"
          >
            <div className="w-20 h-20 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
              <Lock className="w-9 h-9 text-primary/60" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-3">محتوى حصري لتجار الجملة</h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              كشوفات المصرية متاحة فقط لتجار الجملة المعتمدين (درجة أولى أو ثانية).
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild size="lg"><Link to="/dealer-apply">التقديم كتاجر جملة</Link></Button>
              <Button asChild variant="outline" size="lg"><Link to="/">العودة للرئيسية</Link></Button>
            </div>
          </motion.div>
        </main>
        <Footer />
      </>
    );
  }

  /* ── Main ── */
  return (
    <>
      <Navbar />

      {/* Hero */}
      <section className="relative pt-28 pb-12 overflow-hidden" style={{ background: "hsl(var(--section-dark))" }}>
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4 text-center" dir="rtl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-sm px-4 py-1.5 rounded-full mb-6">
              <ShieldCheck className="w-4 h-4" />
              حصري لتجار الجملة المعتمدين
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">كشوفات المصرية</h1>
            <p className="text-lg text-white/60 max-w-xl mx-auto">تصفّح الكتالوجات واستعلم عن أسعار الجملة وأضف للسلة مباشرة</p>
          </motion.div>

          {/* Quick Stats */}
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
            className="flex items-center justify-center gap-6 md:gap-10 mt-8 flex-wrap"
          >
            <div className="flex items-center gap-2 text-white/70 text-sm bg-white/5 px-4 py-2 rounded-full border border-white/10">
              <BookOpen className="w-4 h-4 text-primary" />
              <span>{catalogs.length} كتالوج</span>
            </div>
            <div className="flex items-center gap-2 text-white/70 text-sm bg-white/5 px-4 py-2 rounded-full border border-white/10">
              <BarChart3 className="w-4 h-4 text-primary" />
              <span>{dailyLookups}/{MAX_DAILY_LOOKUPS} استعلام اليوم</span>
            </div>
            <div className="flex items-center gap-2 text-white/70 text-sm bg-white/5 px-4 py-2 rounded-full border border-white/10">
              <TrendingUp className="w-4 h-4 text-primary" />
              <span>أسعار {dealerAccount?.tier === "wholesale_tier1" ? "الدرجة الأولى" : "الدرجة الثانية"}</span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Tabs Section */}
      <section className="max-w-6xl mx-auto px-4 -mt-6 relative z-10" dir="rtl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full max-w-2xl mx-auto grid-cols-3 h-12 bg-card border border-border shadow-lg">
            <TabsTrigger value="catalogs" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <FileText className="w-4 h-4" />
              الكتالوجات
            </TabsTrigger>
            <TabsTrigger value="prices" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <DollarSign className="w-4 h-4" />
              استعلام الأسعار
            </TabsTrigger>
            <TabsTrigger value="quick-order" className="gap-2 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Zap className="w-4 h-4" />
              طلب جملة سريع
            </TabsTrigger>
          </TabsList>

          {/* Catalogs Tab */}
          <TabsContent value="catalogs" className="mt-6">
            {/* Filters */}
            <div className="bg-card border border-border rounded-xl p-4 mb-6 shadow-sm">
              <div className="flex flex-col sm:flex-row gap-3 items-center">
                <div className="relative flex-1 w-full sm:max-w-xs">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder="ابحث عن كتالوج..."
                    value={catalogSearch}
                    onChange={e => setCatalogSearch(e.target.value)}
                    className="w-full pr-9 pl-4 py-2 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Filter className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  {categories.map(cat => {
                    const isActive = activeCategory === cat;
                    const colors   = cat === ALL_KEY ? null : categoryColors[cat] ?? categoryColors.general;
                    return (
                      <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-all ${
                          isActive
                            ? "bg-primary text-primary-foreground border-primary"
                            : colors
                            ? `${colors.bg} ${colors.text} ${colors.border} hover:opacity-80`
                            : "bg-muted text-muted-foreground border-border hover:bg-muted/70"
                        }`}
                      >
                        {cat === ALL_KEY ? "الكل" : categoryLabels[cat] ?? cat}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Grid */}
            {filteredCatalogs.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">لا توجد كتالوجات مطابقة</p>
                <p className="text-sm mt-1">جرّب تغيير الفئة أو كلمة البحث</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                  {filteredCatalogs.map((catalog, i) => {
                    const catKey = catalog.category || "general";
                    const colors = categoryColors[catKey] ?? categoryColors.general;
                    return (
                      <motion.div
                        key={catalog.id}
                        custom={i}
                        variants={cardVariants}
                        initial="hidden"
                        animate="visible"
                        exit={{ opacity: 0, scale: 0.95 }}
                        layout
                        className="group relative bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 hover:shadow-lg hover:shadow-primary/5 transition-all duration-300"
                      >
                        <div className={`h-1 w-full ${colors.bg.replace("/10", "/60")}`} />

                        <div className="p-5">
                          {/* Icon + title */}
                          <div className="flex items-start gap-3 mb-4">
                            <div className={`w-12 h-14 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${colors.bg} group-hover:scale-105`}>
                              <FileText className={`w-6 h-6 ${colors.text}`} />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-foreground text-sm leading-snug line-clamp-2">{catalog.title_ar}</h3>
                              {catalog.title_en && (
                                <p className="text-xs text-muted-foreground mt-0.5 truncate" dir="ltr">{catalog.title_en}</p>
                              )}
                            </div>
                          </div>

                          {catalog.description_ar && (
                            <p className="text-xs text-muted-foreground leading-relaxed mb-3 line-clamp-2">{catalog.description_ar}</p>
                          )}

                          <span className={`inline-block text-xs px-2.5 py-1 rounded-full border font-medium mb-4 ${colors.bg} ${colors.text} ${colors.border}`}>
                            {categoryLabels[catKey] ?? catKey}
                          </span>

                          {/* Two action buttons */}
                          <div className="flex gap-2">
                            {/* Preview */}
                            <Button
                              size="sm"
                              variant="default"
                              className="flex-1 gap-1.5 rounded-xl"
                              onClick={() => handlePreview(catalog)}
                              disabled={previewing === catalog.id || !catalog.file_url}
                            >
                              {previewing === catalog.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Eye className="w-3.5 h-3.5" />
                              )}
                              معاينة
                            </Button>

                            {/* Download */}
                            <Button
                              size="sm"
                              variant="outline"
                              className="flex-1 gap-1.5 rounded-xl"
                              onClick={() => handleDownload(catalog)}
                              disabled={downloading === catalog.id || !catalog.file_url}
                            >
                              {downloading === catalog.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <Download className="w-3.5 h-3.5" />
                              )}
                              تحميل
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </TabsContent>

          {/* Price Lookup Tab */}
          <TabsContent value="prices" className="mt-6">
            {/* Search Box */}
            <div className="bg-card border border-border rounded-xl p-6 mb-6 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <DollarSign className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-foreground">استعلام أسعار الجملة</h2>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full mr-auto">
                  {dailyLookups}/{MAX_DAILY_LOOKUPS} استعلام
                </span>
              </div>
              
              <p className="text-sm text-muted-foreground mb-4">
                ابحث برقم القطعة أو اسم المنتج لعرض سعر الجملة الخاص بدرجتك
              </p>

              <div className="flex gap-3">
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="رقم القطعة أو اسم المنتج..."
                    value={priceSearch}
                    onChange={e => setPriceSearch(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handlePriceSearch()}
                    className="pr-10"
                  />
                </div>
                <Button 
                  onClick={handlePriceSearch} 
                  disabled={priceLoading || dailyLookups >= MAX_DAILY_LOOKUPS}
                  className="gap-2"
                >
                  {priceLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  بحث
                </Button>
              </div>

              {dailyLookups >= MAX_DAILY_LOOKUPS && (
                <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2 text-amber-600 text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>تم استنفاد الحد اليومي للاستعلامات ({MAX_DAILY_LOOKUPS} صنف). يتجدد منتصف الليل.</span>
                </div>
              )}
            </div>

            {/* Results */}
            {priceResults.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span>تم العثور على {priceResults.length} منتج</span>
                </div>

                <div className="grid gap-4">
                  {priceResults.map((product) => {
                    const price = product.tierPrice?.price ?? (product.is_on_sale && product.sale_price ? product.sale_price : product.base_price);
                    const hasDiscount = product.tierPrice?.discount_price && product.tierPrice?.min_qty_for_discount;
                    const qty = quantities[product.id] || product.min_order_qty || 1;
                    const isInStock = product.stock_quantity > 0;

                    return (
                      <motion.div
                        key={product.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-all"
                      >
                        <div className="flex gap-4">
                          {/* Image */}
                          <div className="w-20 h-20 rounded-lg overflow-hidden bg-muted shrink-0">
                            {product.image_url ? (
                              <img src={product.image_url} alt={product.name_ar} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <Package className="w-8 h-8 text-muted-foreground/30" />
                              </div>
                            )}
                          </div>

                          {/* Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h3 className="font-bold text-foreground text-sm line-clamp-1">{product.name_ar}</h3>
                                <p className="text-xs text-muted-foreground font-mono mt-0.5">{product.sku}</p>
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${categoryColors[product.brand]?.bg ?? "bg-muted"} ${categoryColors[product.brand]?.text ?? "text-muted-foreground"}`}>
                                {brandLabels[product.brand] ?? product.brand}
                              </span>
                            </div>

                            <div className="flex items-center gap-3 mt-3">
                              <div>
                                <p className="text-lg font-bold text-primary">{price.toLocaleString("ar-EG")} ج.م</p>
                                {hasDiscount && (
                                  <p className="text-xs text-green-600">
                                    {product.tierPrice!.discount_price!.toLocaleString("ar-EG")} ج.م لأكثر من {product.tierPrice!.min_qty_for_discount} قطعة
                                  </p>
                                )}
                              </div>
                              <span className={`text-xs px-2 py-0.5 rounded-full ${isInStock ? "bg-green-500/10 text-green-600" : "bg-red-500/10 text-red-500"}`}>
                                {isInStock ? "متوفر" : "غير متوفر"}
                              </span>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col items-end justify-between">
                            {/* Quantity */}
                            <div className="flex items-center gap-1 bg-muted rounded-lg">
                              <button
                                onClick={() => updateQuantity(product.id, -1, product.min_order_qty || 1, product.stock_quantity)}
                                className="p-1.5 hover:bg-border rounded-r-lg transition-colors"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="text-sm font-bold min-w-[2.5rem] text-center">{qty}</span>
                              <button
                                onClick={() => updateQuantity(product.id, 1, product.min_order_qty || 1, product.stock_quantity)}
                                disabled={qty >= product.stock_quantity}
                                className="p-1.5 hover:bg-border rounded-l-lg transition-colors disabled:opacity-30"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Add to cart */}
                            <Button
                              size="sm"
                              className="gap-1.5"
                              disabled={!isInStock || addingToCart === product.id}
                              onClick={() => handleAddToCart(product)}
                            >
                              {addingToCart === product.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <ShoppingCart className="w-3.5 h-3.5" />
                              )}
                              أضف للسلة
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Empty state */}
            {!priceLoading && priceResults.length === 0 && priceSearch && (
              <div className="text-center py-16 text-muted-foreground">
                <Package className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p className="text-lg font-medium">ابحث عن منتج</p>
                <p className="text-sm mt-1">أدخل رقم القطعة أو اسم المنتج لعرض السعر</p>
              </div>
            )}
          </TabsContent>

          {/* ── Quick Order Tab ── */}
          <TabsContent value="quick-order" className="mt-6">
            {/* Input Area */}
            <div className="bg-card border border-border rounded-xl p-6 mb-6 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-primary" />
                <h2 className="font-bold text-foreground">طلب جملة سريع</h2>
                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full mr-auto">
                  {dailyLookups}/{MAX_DAILY_LOOKUPS} استعلام
                </span>
              </div>
              <p className="text-sm text-muted-foreground mb-4">
                الصق أرقام القطع مفصولة بسطر جديد أو فاصلة — الحد الأقصى 50 رقم في المرة الواحدة
              </p>
              <div className="space-y-3">
                <div className="relative">
                  <Textarea
                    placeholder={"TF-001\nTF-002\nTF-003\nأو: TF-001, TF-002, TF-003"}
                    value={quickSkuInput}
                    onChange={e => setQuickSkuInput(e.target.value)}
                    className="min-h-[140px] font-mono text-sm resize-none"
                    dir="ltr"
                  />
                  {quickSkuInput && (
                    <button
                      onClick={() => { setQuickSkuInput(""); setQuickResults([]); }}
                      className="absolute top-2 left-2 p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    {quickSkuInput.split(/[\n,;\t]+/).filter(s => s.trim()).length} رقم قطعة
                  </p>
                  <Button
                    onClick={handleQuickOrder}
                    disabled={quickLoading || !quickSkuInput.trim() || dailyLookups >= MAX_DAILY_LOOKUPS}
                    className="gap-2"
                  >
                    {quickLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                    استعلام عن الأسعار
                  </Button>
                </div>
              </div>
              {dailyLookups >= MAX_DAILY_LOOKUPS && (
                <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 flex items-start gap-2 text-amber-600 text-sm">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>تم استنفاد الحد اليومي للاستعلامات ({MAX_DAILY_LOOKUPS} صنف). يتجدد منتصف الليل.</span>
                </div>
              )}
            </div>

            {/* Results */}
            {quickResults.length > 0 && (
              <div className="space-y-4">
                {/* Summary Bar */}
                <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-4 text-sm flex-wrap">
                    <span className="flex items-center gap-1.5 text-green-600">
                      <CheckCircle2 className="w-4 h-4" />
                      {quickResults.filter(r => r.found && (r.product?.stock_quantity ?? 0) > 0).length} متوفر
                    </span>
                    {quickResults.filter(r => !r.found).length > 0 && (
                      <span className="flex items-center gap-1.5 text-red-500">
                        <AlertTriangle className="w-4 h-4" />
                        {quickResults.filter(r => !r.found).length} غير موجود
                      </span>
                    )}
                    {quickResults.filter(r => r.found && r.product?.stock_quantity === 0).length > 0 && (
                      <span className="flex items-center gap-1.5 text-amber-500">
                        <Package className="w-4 h-4" />
                        {quickResults.filter(r => r.found && r.product?.stock_quantity === 0).length} نافد
                      </span>
                    )}
                  </div>
                  <Button
                    onClick={handleAddAllToCart}
                    disabled={addingAllToCart || quickResults.filter(r => r.found && (r.product?.stock_quantity ?? 0) > 0).length === 0}
                    className="gap-2"
                  >
                    {addingAllToCart ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                    أضف الكل للسلة ({quickResults.filter(r => r.found && (r.product?.stock_quantity ?? 0) > 0).length})
                  </Button>
                </div>

                {/* Results Table */}
                <div className="bg-card border border-border rounded-xl overflow-hidden">
                  {/* Header */}
                  <div className="hidden md:grid grid-cols-[2fr_3fr_1.5fr_1.5fr_auto] gap-0 text-xs font-medium text-muted-foreground bg-muted/50 px-4 py-2.5 border-b border-border" dir="rtl">
                    <span>رقم القطعة</span>
                    <span>المنتج</span>
                    <span>سعر الجملة</span>
                    <span>الكمية</span>
                    <span></span>
                  </div>
                  <div className="divide-y divide-border">
                    {quickResults.map((result, idx) => {
                      if (!result.found) {
                        return (
                          <div key={result.sku + idx} className="px-4 py-3 flex items-center gap-3 bg-red-500/5" dir="rtl">
                            <div className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
                            <span className="font-mono text-sm text-muted-foreground">{result.sku}</span>
                            <span className="text-xs text-red-500 mr-auto bg-red-500/10 px-2 py-0.5 rounded-full">غير موجود</span>
                          </div>
                        );
                      }

                      const product = result.product!;
                      const price = product.tierPrice?.price ?? (product.is_on_sale && product.sale_price ? product.sale_price : product.base_price);
                      const qty = quickQuantities[product.id] || product.min_order_qty || 1;
                      const isInStock = product.stock_quantity > 0;
                      const hasDiscount = product.tierPrice?.discount_price && product.tierPrice?.min_qty_for_discount;

                      return (
                        <motion.div
                          key={product.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          className={`px-4 py-3 flex flex-wrap md:grid md:grid-cols-[2fr_3fr_1.5fr_1.5fr_auto] items-center gap-3 hover:bg-muted/20 transition-colors ${!isInStock ? "opacity-60" : ""}`}
                          dir="rtl"
                        >
                          {/* SKU */}
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`w-2 h-2 rounded-full shrink-0 ${isInStock ? "bg-green-400" : "bg-amber-400"}`} />
                            <span className="font-mono text-xs text-muted-foreground truncate">{product.sku}</span>
                          </div>

                          {/* Product */}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-foreground line-clamp-1">{product.name_ar}</p>
                            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                              <span className={`text-xs px-1.5 py-0.5 rounded ${categoryColors[product.brand]?.bg ?? "bg-muted"} ${categoryColors[product.brand]?.text ?? "text-muted-foreground"}`}>
                                {brandLabels[product.brand] ?? product.brand}
                              </span>
                              <span className={`text-xs ${isInStock ? "text-green-600" : "text-amber-500"}`}>
                                {isInStock ? "متوفر" : "نافد"}
                              </span>
                            </div>
                          </div>

                          {/* Price */}
                          <div>
                            <p className="text-sm font-bold text-primary">{price.toLocaleString("ar-EG")} ج.م</p>
                            {hasDiscount && (
                              <p className="text-xs text-green-600 whitespace-nowrap">
                                {product.tierPrice!.discount_price!.toLocaleString("ar-EG")} لـ +{product.tierPrice!.min_qty_for_discount}ق
                              </p>
                            )}
                          </div>

                          {/* Quantity */}
                          <div className="flex items-center gap-1 bg-muted rounded-lg w-fit">
                            <button
                              onClick={() => updateQuickQuantity(product.id, -1, product.min_order_qty || 1, product.stock_quantity)}
                              disabled={!isInStock}
                              className="p-1.5 hover:bg-border rounded-r-lg transition-colors disabled:opacity-30"
                            >
                              <Minus className="w-3 h-3" />
                            </button>
                            <span className="text-sm font-bold min-w-[2.5rem] text-center">{qty}</span>
                            <button
                              onClick={() => updateQuickQuantity(product.id, 1, product.min_order_qty || 1, product.stock_quantity)}
                              disabled={!isInStock || qty >= product.stock_quantity}
                              className="p-1.5 hover:bg-border rounded-l-lg transition-colors disabled:opacity-30"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          </div>

                          {/* Add single */}
                          <Button
                            size="sm"
                            variant={isInStock ? "default" : "outline"}
                            className="gap-1 shrink-0"
                            disabled={!isInStock || addingToCart === product.id}
                            onClick={() => handleAddToCart(product)}
                          >
                            {addingToCart === product.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ShoppingCart className="w-3 h-3" />}
                            <span className="hidden sm:inline text-xs">أضف</span>
                          </Button>
                        </motion.div>
                      );
                    })}
                  </div>
                </div>

                {/* Order Total */}
                {quickResults.filter(r => r.found && (r.product?.stock_quantity ?? 0) > 0).length > 0 && (
                  <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 flex items-center justify-between gap-4 flex-wrap" dir="rtl">
                    <div>
                      <p className="text-sm text-muted-foreground">إجمالي الطلب (قبل الضريبة)</p>
                      <p className="text-2xl font-bold text-foreground mt-0.5">
                        {quickResults
                          .filter(r => r.found && (r.product?.stock_quantity ?? 0) > 0)
                          .reduce((sum, r) => {
                            const p = r.product!;
                            const price = p.tierPrice?.price ?? (p.is_on_sale && p.sale_price ? p.sale_price : p.base_price);
                            return sum + price * (quickQuantities[p.id] || p.min_order_qty || 1);
                          }, 0)
                          .toLocaleString("ar-EG")} ج.م
                      </p>
                    </div>
                    <Button onClick={handleAddAllToCart} disabled={addingAllToCart} size="lg" className="gap-2">
                      {addingAllToCart ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                      أضف الكل للسلة
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Empty state */}
            {!quickLoading && quickResults.length === 0 && (
              <div className="text-center py-16 text-muted-foreground">
                <ClipboardList className="w-14 h-14 mx-auto mb-4 opacity-20" />
                <p className="text-lg font-medium">الصق أرقام القطع للبدء</p>
                <p className="text-sm mt-2 max-w-sm mx-auto leading-relaxed">
                  انسخ قائمة أرقام القطع من أي مصدر والصقها في الحقل أعلاه، وسنعرض لك أسعار الجملة فوراً
                </p>
              </div>
            )}
          </TabsContent>

        </Tabs>
      </section>

      <div className="max-w-6xl mx-auto px-4 py-8" dir="rtl">
        <div className="flex justify-center">
          <Button asChild variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
            <Link to="/dealer">
              <ArrowRight className="w-4 h-4" />
              العودة للوحة التحكم
            </Link>
          </Button>
        </div>
      </div>

      <Footer />

      {/* ── PDF Viewer Modal ── */}
      <Dialog open={!!pdfCatalog} onOpenChange={(open) => { if (!open) closePdf(); }}>
        <DialogContent className="max-w-5xl w-[95vw] h-[90vh] flex flex-col p-0 gap-0 overflow-hidden" dir="rtl">
          {/* Header */}
          <DialogHeader className="flex-shrink-0 flex flex-row items-center justify-between px-5 py-3 border-b border-border bg-card">
            <DialogTitle className="text-sm font-bold text-foreground truncate max-w-[60%]">
              {pdfCatalog?.title_ar}
            </DialogTitle>
            <div className="flex items-center gap-2">
              {/* Open in new tab */}
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 text-xs h-8"
                onClick={handleOpenExternal}
              >
                <Maximize2 className="w-3.5 h-3.5" />
                فتح في تبويب جديد
              </Button>
              {/* Download from modal */}
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-xs h-8"
                onClick={() => pdfCatalog && handleDownload(pdfCatalog)}
                disabled={downloading === pdfCatalog?.id}
              >
                {downloading === pdfCatalog?.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Download className="w-3.5 h-3.5" />
                )}
                تحميل
              </Button>
              {/* Close */}
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={closePdf}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </DialogHeader>

          {/* PDF iframe */}
          <div className="flex-1 bg-muted/30 relative overflow-hidden">
            {pdfLoading ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : pdfUrl ? (
              <iframe
                src={`${pdfUrl}#toolbar=1&navpanes=1&scrollbar=1&view=FitH`}
                className="w-full h-full border-0"
                title={pdfCatalog?.title_ar || "PDF Viewer"}
                onLoad={() => setPdfLoading(false)}
              />
            ) : null}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default CatalogsPage;
