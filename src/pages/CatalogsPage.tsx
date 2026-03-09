import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

const ALL_KEY = "__all__";

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
  const navigate = useNavigate();
  const { toast } = useToast();

  const [catalogs, setCatalogs]     = useState<Catalog[]>([]);
  const [loading, setLoading]       = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState<string | null>(null);
  const [activeCategory, setActiveCategory] = useState<string>(ALL_KEY);
  const [search, setSearch]         = useState("");

  // PDF viewer state
  const [pdfCatalog, setPdfCatalog] = useState<Catalog | null>(null);
  const [pdfUrl, setPdfUrl]         = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  const isWholesale =
    isDealer &&
    !!dealerAccount?.is_active &&
    (dealerAccount?.tier === "wholesale_tier1" || dealerAccount?.tier === "wholesale_tier2");

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    if (!isWholesale) { setLoading(false); return; }
    fetchCatalogs();
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

  const categories = [ALL_KEY, ...Array.from(new Set(catalogs.map(c => c.category || "general")))];

  const filtered = catalogs.filter(c => {
    const catKey = c.category || "general";
    const matchCat    = activeCategory === ALL_KEY || catKey === activeCategory;
    const matchSearch = !search || c.title_ar.includes(search) || (c.title_en ?? "").toLowerCase().includes(search.toLowerCase());
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
              الكتالوجات التفصيلية متاحة فقط لتجار الجملة المعتمدين (درجة أولى أو ثانية).
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
      <section className="relative pt-28 pb-16 overflow-hidden" style={{ background: "hsl(var(--section-dark))" }}>
        <div className="absolute top-0 left-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-72 h-72 bg-primary/5 rounded-full blur-3xl translate-x-1/3 translate-y-1/3 pointer-events-none" />
        <div className="relative max-w-6xl mx-auto px-4 text-center" dir="rtl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary text-sm px-4 py-1.5 rounded-full mb-6">
              <ShieldCheck className="w-4 h-4" />
              حصري لتجار الجملة المعتمدين
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">كتالوجات المنتجات</h1>
            <p className="text-lg text-white/60 max-w-xl mx-auto">تصفّح وحمّل الكتالوجات التفصيلية لجميع الماركات والفئات</p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.5 }}
            className="flex items-center justify-center gap-8 mt-10 flex-wrap"
          >
            {[
              { icon: BookOpen, label: `${catalogs.length} كتالوج متاح` },
              { icon: Eye,      label: "معاينة مباشرة" },
              { icon: Download, label: "تحميل مجاني" },
            ].map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2 text-white/50 text-sm">
                <Icon className="w-4 h-4 text-primary" />
                {label}
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <section className="sticky top-[64px] z-20 bg-background/90 backdrop-blur border-b border-border shadow-sm">
        <div className="max-w-6xl mx-auto px-4 py-3 flex flex-col sm:flex-row gap-3 items-center" dir="rtl">
          <div className="relative flex-1 w-full sm:max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="ابحث عن كتالوج..."
              value={search}
              onChange={e => setSearch(e.target.value)}
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
      </section>

      {/* Grid */}
      <main className="max-w-6xl mx-auto px-4 py-12" dir="rtl">
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <FileText className="w-12 h-12 mx-auto mb-4 opacity-30" />
            <p className="text-lg font-medium">لا توجد كتالوجات مطابقة</p>
            <p className="text-sm mt-1">جرّب تغيير الفئة أو كلمة البحث</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <AnimatePresence mode="popLayout">
              {filtered.map((catalog, i) => {
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

        <div className="mt-12 flex justify-center">
          <Button asChild variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
            <Link to="/dealer">
              <ArrowRight className="w-4 h-4" />
              العودة للوحة التحكم
            </Link>
          </Button>
        </div>
      </main>

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
