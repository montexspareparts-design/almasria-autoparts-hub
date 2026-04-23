import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, ExternalLink, Eye, AlertTriangle, CheckCircle2, Globe, Twitter, Facebook } from "lucide-react";

const SITE_URL = "https://www.almasriaautoparts.com";
const OG_IMAGE = `${SITE_URL}/og-image.jpg`;

interface RouteMeta {
  ar: { title: string; description: string };
  en: { title: string; description: string };
}

/* Mirror of ROUTE_META in src/components/SEOHead.tsx */
const ROUTE_META: Record<string, RouteMeta> = {
  "/": {
    ar: {
      title: "المصرية جروب | موزع معتمد لقطع غيار تويوتا الأصلية والزيوت في مصر",
      description: "موزع معتمد رسمي لقطع غيار وزيوت تويوتا الأصلية في مصر منذ 1999. شبكة توزيع تغطي جميع المحافظات وتسليم خلال 48 ساعة.",
    },
    en: {
      title: "Al Masria Group | Authorized Toyota Genuine Parts & Oils Distributor in Egypt",
      description: "Official authorized distributor of Toyota genuine parts and oils in Egypt since 1999. Nationwide distribution network with 48-hour delivery.",
    },
  },
  "/about": {
    ar: { title: "من نحن | المصرية جروب — موزع تويوتا المعتمد منذ 1999", description: "تعرف على المصرية جروب، الموزع المعتمد لقطع غيار وزيوت تويوتا الأصلية في مصر. خبرة 25 عامًا، فروع في مصر ودبي، شبكة توزيع وطنية." },
    en: { title: "About Us | Al Masria Group — Authorized Toyota Distributor Since 1999", description: "Learn about Al Masria Group, the authorized distributor of Toyota genuine parts and oils in Egypt. 25 years of experience, offices in Egypt and Dubai." },
  },
  "/products": {
    ar: { title: "منتجاتنا | قطع غيار تويوتا الأصلية وزيوت وMTX — المصرية جروب", description: "تصفح كتالوج قطع غيار تويوتا الأصلية، الزيوت، وقطع MTX البديلة بأسعار الجملة وضمان الجودة." },
    en: { title: "Our Products | Toyota Genuine Parts, Oils & MTX — Al Masria Group", description: "Browse our catalog of Toyota genuine parts, oils, and MTX aftermarket parts at wholesale prices with quality guarantee." },
  },
  "/contact": {
    ar: { title: "اتصل بنا | المصرية جروب — فروع وأرقام تواصل قطع غيار تويوتا", description: "تواصل مع المصرية جروب — فروع التوفيقية وأوسيم والأقصر ودبي. مبيعات وخدمة عملاء على مدار الأسبوع." },
    en: { title: "Contact Us | Al Masria Group — Toyota Parts Branches & Phone Numbers", description: "Contact Al Masria Group — branches in Tawfikiya, Awsim, Luxor, and Dubai. Sales and customer service available." },
  },
  "/mtx": {
    ar: { title: "قطع غيار MTX | البديل المضمون لقطع غيار تويوتا — المصرية جروب", description: "قطع غيار MTX Aftermarket بجودة تضاهي الأصلية وأسعار اقتصادية. علامتنا التجارية الحصرية." },
    en: { title: "MTX Parts | Premium Aftermarket Toyota Parts — Al Masria Group", description: "MTX aftermarket parts with OEM-matching quality and competitive pricing. Our exclusive brand." },
  },
  "/toyota-genuine-parts-egypt": {
    ar: { title: "قطع غيار تويوتا الأصلية في مصر | الموزع المعتمد — المصرية جروب", description: "قطع غيار تويوتا الأصلية 100٪ بضمان المصنع لجميع موديلات تويوتا في مصر. توصيل سريع لجميع المحافظات." },
    en: { title: "Toyota Genuine Parts in Egypt | Authorized Distributor — Al Masria Group", description: "100% genuine Toyota parts with factory warranty for all Toyota models in Egypt. Fast delivery nationwide." },
  },
  "/catalogs": {
    ar: { title: "كشوفات الأسعار | قطع غيار تويوتا والزيوت — المصرية جروب", description: "تحميل كشوفات أسعار قطع غيار تويوتا الأصلية والزيوت وMTX المحدثة." },
    en: { title: "Price Catalogs | Toyota Parts & Oils — Al Masria Group", description: "Download up-to-date price catalogs for Toyota genuine parts, oils, and MTX." },
  },
  "/what-sets-us-apart": {
    ar: { title: "ما يميزنا | لماذا تختار المصرية جروب لقطع غيار تويوتا", description: "اكتشف ما يميز المصرية جروب: شبكة توزيع وطنية، ضمان أصلي، ودعم فني متخصص." },
    en: { title: "What Sets Us Apart | Why Choose Al Masria Group for Toyota Parts", description: "Discover what sets Al Masria Group apart: nationwide distribution, genuine warranty, and expert technical support." },
  },
  "/policies": {
    ar: { title: "السياسات والشروط | المصرية جروب", description: "الشروط والأحكام، سياسة الخصوصية، الشحن، والاسترجاع لخدمات المصرية جروب." },
    en: { title: "Policies & Terms | Al Masria Group", description: "Terms & conditions, privacy policy, shipping, and refund policies for Al Masria Group services." },
  },
  "/install": {
    ar: { title: "حمّل تطبيق المصرية جروب | قطع غيار تويوتا في جيبك", description: "حمّل تطبيق المصرية جروب على Android و iOS لتصفح وطلب قطع غيار تويوتا الأصلية والزيوت بسهولة." },
    en: { title: "Install Al Masria Group App | Toyota Parts in Your Pocket", description: "Install the Al Masria Group app on Android and iOS to browse and order Toyota genuine parts and oils with ease." },
  },
  "/products/genuine-toyota-parts": {
    ar: { title: "قطع غيار تويوتا الأصلية 100٪ | بضمان الموزع المعتمد", description: "تسوق قطع غيار تويوتا الأصلية 100٪ بضمان المصنع — موزع معتمد رسمي في مصر منذ 1999." },
    en: { title: "100% Genuine Toyota Parts | Authorized Distributor Warranty", description: "Shop 100% genuine Toyota parts with factory warranty — official authorized distributor in Egypt since 1999." },
  },
  "/products/toyota-oils": {
    ar: { title: "زيوت تويوتا الأصلية | حماية مثالية لمحرك سيارتك", description: "زيوت تويوتا الأصلية لجميع موديلات المحركات. حماية مثالية وأداء طويل الأمد بضمان الموزع المعتمد." },
    en: { title: "Toyota Genuine Oils | Optimal Engine Protection", description: "Toyota genuine motor oils for all engine models. Optimal protection and long-lasting performance with authorized distributor warranty." },
  },
  "/parts-by-model": {
    ar: { title: "قطع غيار تويوتا حسب الموديل | ابحث بسهولة", description: "تصفح قطع غيار تويوتا الأصلية مرتبة حسب الموديل (كورولا، كامري، هايلكس، فورتشنر، رافور وغيرها)." },
    en: { title: "Toyota Parts by Model | Easy Browsing", description: "Browse genuine Toyota parts sorted by model (Corolla, Camry, Hilux, Fortuner, RAV4, and more)." },
  },
  "/parts-by-type": {
    ar: { title: "قطع غيار تويوتا حسب النوع | فلاتر، فرامل، شموع", description: "ابحث عن قطع غيار تويوتا الأصلية حسب نوع القطعة — فلاتر زيت، فرامل، شموع احتراق، بطاريات وأكثر." },
    en: { title: "Toyota Parts by Type | Filters, Brakes, Spark Plugs", description: "Find genuine Toyota parts by component type — oil filters, brakes, spark plugs, batteries, and more." },
  },
  "/clients": {
    ar: { title: "خدمات المصرية جروب لكل عميل | تجار، شركات، أساطيل", description: "حلول قطع غيار تويوتا المتخصصة لتجار التجزئة والجملة، شركات السيارات، إدارات الأساطيل، ومراكز الخدمة." },
    en: { title: "Al Masria Group Services for Every Client | Dealers, Companies, Fleets", description: "Specialized Toyota parts solutions for retail and wholesale dealers, automotive companies, fleet management, and service centers." },
  },
  "/track-order": {
    ar: { title: "تتبع طلبك | المصرية جروب", description: "تتبع حالة طلب قطع الغيار من المصرية جروب برقم الطلب — تحديثات فورية لكل مرحلة." },
    en: { title: "Track Your Order | Al Masria Group", description: "Track your Al Masria Group parts order status by order number — instant updates at every stage." },
  },
};

const TITLE_MIN = 30;
const TITLE_MAX = 60;
const DESC_MIN = 70;
const DESC_MAX = 160;

interface ScoreResult {
  level: "good" | "warn" | "bad";
  label: string;
}

const scoreText = (text: string, min: number, max: number): ScoreResult => {
  const len = text.length;
  if (len === 0) return { level: "bad", label: "فارغ" };
  if (len < min) return { level: "warn", label: `قصير (${len})` };
  if (len > max) return { level: "warn", label: `طويل (${len})` };
  return { level: "good", label: `${len}` };
};

const scoreColor = (level: ScoreResult["level"]) => {
  switch (level) {
    case "good": return "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
    case "warn": return "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30";
    case "bad": return "bg-destructive/15 text-destructive border-destructive/30";
  }
};

/* Google SERP-like preview */
const GooglePreview = ({ title, description, url }: { title: string; description: string; url: string }) => (
  <div className="bg-background border rounded-xl p-5 max-w-2xl">
    <div className="flex items-center gap-2 mb-1">
      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-xs font-bold">
        AM
      </div>
      <div className="text-sm">
        <div className="text-foreground font-medium">المصرية جروب</div>
        <div className="text-muted-foreground text-xs">{url}</div>
      </div>
    </div>
    <h3 className="text-xl text-blue-700 dark:text-blue-400 hover:underline cursor-pointer leading-tight mb-1 font-normal">
      {title || "بدون عنوان"}
    </h3>
    <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
      {description || "بدون وصف"}
    </p>
  </div>
);

/* Facebook OG preview */
const FacebookPreview = ({ title, description, url, image }: { title: string; description: string; url: string; image: string }) => (
  <div className="bg-background border rounded-xl overflow-hidden max-w-2xl">
    <div className="aspect-[1200/630] bg-muted relative overflow-hidden">
      <img
        src={image}
        alt={title}
        className="w-full h-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
          const parent = (e.target as HTMLElement).parentElement;
          if (parent) {
            parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-muted-foreground text-sm">⚠️ صورة OG غير موجودة (${image})</div>`;
          }
        }}
      />
    </div>
    <div className="p-3 bg-muted/30 border-t">
      <div className="text-[10px] text-muted-foreground uppercase mb-1 truncate">
        {url.replace(/^https?:\/\//, "").split("/")[0]}
      </div>
      <div className="font-semibold text-sm text-foreground line-clamp-2 leading-snug">
        {title || "بدون عنوان"}
      </div>
      <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
        {description || "بدون وصف"}
      </div>
    </div>
  </div>
);

/* Twitter card preview */
const TwitterPreview = ({ title, description, url, image }: { title: string; description: string; url: string; image: string }) => (
  <div className="bg-background border rounded-2xl overflow-hidden max-w-2xl">
    <div className="aspect-[1200/630] bg-muted relative overflow-hidden">
      <img
        src={image}
        alt={title}
        className="w-full h-full object-cover"
        onError={(e) => {
          (e.target as HTMLImageElement).style.display = "none";
          const parent = (e.target as HTMLElement).parentElement;
          if (parent) {
            parent.innerHTML = `<div class="w-full h-full flex items-center justify-center text-muted-foreground text-sm">⚠️ صورة OG غير موجودة</div>`;
          }
        }}
      />
    </div>
    <div className="p-3">
      <div className="font-semibold text-sm text-foreground line-clamp-1">
        {title || "بدون عنوان"}
      </div>
      <div className="text-xs text-muted-foreground line-clamp-2 mt-0.5">
        {description || "بدون وصف"}
      </div>
      <div className="text-xs text-muted-foreground mt-1.5 truncate">
        🔗 {url.replace(/^https?:\/\//, "")}
      </div>
    </div>
  </div>
);

const AdminSEOPreview = () => {
  const [search, setSearch] = useState("");
  const [selectedPath, setSelectedPath] = useState<string>("/");
  const [lang, setLang] = useState<"ar" | "en">("ar");

  const routes = useMemo(() => {
    const list = Object.keys(ROUTE_META).sort();
    if (!search.trim()) return list;
    const q = search.toLowerCase();
    return list.filter((path) => {
      const m = ROUTE_META[path];
      return (
        path.toLowerCase().includes(q) ||
        m.ar.title.toLowerCase().includes(q) ||
        m.en.title.toLowerCase().includes(q) ||
        m.ar.description.toLowerCase().includes(q) ||
        m.en.description.toLowerCase().includes(q)
      );
    });
  }, [search]);

  const meta = ROUTE_META[selectedPath] || ROUTE_META["/"];
  const { title, description } = meta[lang];
  const canonical = `${SITE_URL}${selectedPath === "/" ? "/" : selectedPath}`;

  const titleScore = scoreText(title, TITLE_MIN, TITLE_MAX);
  const descScore = scoreText(description, DESC_MIN, DESC_MAX);

  /* Bulk-audit summary across all routes */
  const auditSummary = useMemo(() => {
    let titleIssues = 0;
    let descIssues = 0;
    Object.values(ROUTE_META).forEach((m) => {
      (["ar", "en"] as const).forEach((l) => {
        const t = scoreText(m[l].title, TITLE_MIN, TITLE_MAX);
        const d = scoreText(m[l].description, DESC_MIN, DESC_MAX);
        if (t.level !== "good") titleIssues++;
        if (d.level !== "good") descIssues++;
      });
    });
    const total = Object.keys(ROUTE_META).length * 2; // ar + en
    return { titleIssues, descIssues, total };
  }, []);

  return (
    <div className="space-y-6">
      {/* Header & summary */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Eye className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>معاينة SEO قبل النشر</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  راجع Title و Description و OG/Twitter Cards لكل صفحة كما ستظهر في Google و Facebook و Twitter.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="gap-1.5">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                {Object.keys(ROUTE_META).length} صفحة
              </Badge>
              {auditSummary.titleIssues > 0 && (
                <Badge variant="outline" className={scoreColor("warn") + " gap-1.5"}>
                  <AlertTriangle className="h-3 w-3" />
                  {auditSummary.titleIssues} عنوان للمراجعة
                </Badge>
              )}
              {auditSummary.descIssues > 0 && (
                <Badge variant="outline" className={scoreColor("warn") + " gap-1.5"}>
                  <AlertTriangle className="h-3 w-3" />
                  {auditSummary.descIssues} وصف للمراجعة
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid lg:grid-cols-[320px_1fr] gap-6">
        {/* Routes list */}
        <Card className="lg:sticky lg:top-4 lg:self-start lg:max-h-[calc(100vh-2rem)] lg:overflow-hidden flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">الصفحات</CardTitle>
            <div className="relative mt-2">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="ابحث عن صفحة..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="ps-10 h-9"
              />
            </div>
          </CardHeader>
          <CardContent className="overflow-y-auto pb-4 space-y-1">
            {routes.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-6">لا نتائج</p>
            )}
            {routes.map((path) => {
              const m = ROUTE_META[path];
              const tAr = scoreText(m.ar.title, TITLE_MIN, TITLE_MAX);
              const dAr = scoreText(m.ar.description, DESC_MIN, DESC_MAX);
              const hasIssue = tAr.level !== "good" || dAr.level !== "good";
              const isActive = path === selectedPath;
              return (
                <button
                  key={path}
                  onClick={() => setSelectedPath(path)}
                  className={`w-full text-start p-2.5 rounded-lg transition-colors border ${
                    isActive
                      ? "bg-primary/10 border-primary/40"
                      : "hover:bg-muted/60 border-transparent"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <code className="text-xs font-mono text-foreground truncate">{path}</code>
                    {hasIssue && <AlertTriangle className="h-3 w-3 text-amber-500 flex-shrink-0" />}
                  </div>
                  <div className="text-xs text-muted-foreground line-clamp-1">
                    {m.ar.title}
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>

        {/* Preview panel */}
        <div className="space-y-4 min-w-0">
          {/* Selected route header */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <code className="text-sm font-mono bg-muted px-2 py-1 rounded">{selectedPath}</code>
                  <a
                    href={canonical}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-primary hover:underline ms-2 inline-flex items-center gap-1"
                  >
                    فتح الصفحة <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <div className="flex gap-1 bg-muted p-1 rounded-lg">
                  <Button
                    size="sm"
                    variant={lang === "ar" ? "default" : "ghost"}
                    onClick={() => setLang("ar")}
                    className="h-7 px-3 text-xs"
                  >
                    🇪🇬 العربية
                  </Button>
                  <Button
                    size="sm"
                    variant={lang === "en" ? "default" : "ghost"}
                    onClick={() => setLang("en")}
                    className="h-7 px-3 text-xs"
                  >
                    🇬🇧 English
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-muted-foreground">Title</label>
                  <Badge variant="outline" className={`text-[10px] ${scoreColor(titleScore.level)}`}>
                    {titleScore.label} / {TITLE_MAX} حرف
                  </Badge>
                </div>
                <div className="bg-muted/40 rounded-lg p-3 text-sm" dir={lang === "ar" ? "rtl" : "ltr"}>
                  {title}
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-muted-foreground">Description</label>
                  <Badge variant="outline" className={`text-[10px] ${scoreColor(descScore.level)}`}>
                    {descScore.label} / {DESC_MAX} حرف
                  </Badge>
                </div>
                <div className="bg-muted/40 rounded-lg p-3 text-sm" dir={lang === "ar" ? "rtl" : "ltr"}>
                  {description}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground mb-1 block">Canonical URL</label>
                <code className="block bg-muted/40 rounded-lg p-3 text-xs font-mono break-all">
                  {canonical}
                </code>
              </div>
            </CardContent>
          </Card>

          {/* Visual previews */}
          <Tabs defaultValue="google" className="space-y-4">
            <TabsList className="grid grid-cols-3 w-full max-w-md">
              <TabsTrigger value="google" className="gap-1.5 text-xs">
                <Globe className="h-3.5 w-3.5" /> Google
              </TabsTrigger>
              <TabsTrigger value="facebook" className="gap-1.5 text-xs">
                <Facebook className="h-3.5 w-3.5" /> Facebook
              </TabsTrigger>
              <TabsTrigger value="twitter" className="gap-1.5 text-xs">
                <Twitter className="h-3.5 w-3.5" /> Twitter / X
              </TabsTrigger>
            </TabsList>

            <TabsContent value="google" className="mt-0">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">معاينة نتائج بحث Google</CardTitle>
                </CardHeader>
                <CardContent>
                  <GooglePreview title={title} description={description} url={canonical} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="facebook" className="mt-0">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">معاينة Facebook (Open Graph)</CardTitle>
                </CardHeader>
                <CardContent>
                  <FacebookPreview title={title} description={description} url={canonical} image={OG_IMAGE} />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="twitter" className="mt-0">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm">معاينة Twitter Card (summary_large_image)</CardTitle>
                </CardHeader>
                <CardContent>
                  <TwitterPreview title={title} description={description} url={canonical} image={OG_IMAGE} />
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

          {/* Raw meta tags */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">وسوم Meta الكاملة</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted/40 rounded-lg p-3 text-xs overflow-x-auto leading-relaxed" dir="ltr">
{`<title>${title}</title>
<meta name="description" content="${description}" />
<link rel="canonical" href="${canonical}" />
<meta property="og:type" content="website" />
<meta property="og:title" content="${title}" />
<meta property="og:description" content="${description}" />
<meta property="og:url" content="${canonical}" />
<meta property="og:image" content="${OG_IMAGE}" />
<meta property="og:locale" content="${lang === "ar" ? "ar_EG" : "en_US"}" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${title}" />
<meta name="twitter:description" content="${description}" />
<meta name="twitter:image" content="${OG_IMAGE}" />`}
              </pre>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminSEOPreview;
