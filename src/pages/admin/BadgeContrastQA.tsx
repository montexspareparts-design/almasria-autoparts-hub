import { useEffect, useMemo, useState } from "react";
import { Helmet } from "react-helmet-async";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ImageBadge, ImageBadgeColumn } from "@/components/ui/image-badge";
import { Sparkles, Check, ArrowRight } from "lucide-react";

/**
 * /admin/badge-qa
 * ---------------------------------------------------------------
 * صفحة اختبار داخلية للتحقق من وضوح بادجات كارت المنتج فوق
 * خلفيات متنوعة: فاتحة، داكنة، ومزدحمة (صور حقيقية).
 *
 * نستنسخ نفس فئات Tailwind المستخدمة داخل ProductCard.tsx بحرفها
 * حتى يكون الاختبار مرآة دقيقة لما يراه العميل النهائي. أي تغيير
 * مستقبلي في الكارت يجب أن يُعكس هنا أيضاً.
 */

type SwatchKind = "solid-light" | "solid-dark" | "noise" | "image-light" | "image-dark" | "image-busy";

interface Swatch {
  id: string;
  label: string;
  kind: SwatchKind;
  bg: string; // CSS background (image url or gradient)
}

const SWATCHES: Swatch[] = [
  {
    id: "white",
    label: "أبيض ناصع",
    kind: "solid-light",
    bg: "#ffffff",
  },
  {
    id: "cream",
    label: "كريمي فاتح",
    kind: "solid-light",
    bg: "#f5f1e8",
  },
  {
    id: "sky",
    label: "سماوي شفاف",
    kind: "solid-light",
    bg: "linear-gradient(135deg,#e0f2fe,#fef9c3)",
  },
  {
    id: "black",
    label: "أسود مطلق",
    kind: "solid-dark",
    bg: "#000000",
  },
  {
    id: "navy",
    label: "كحلي",
    kind: "solid-dark",
    bg: "#0c1e3d",
  },
  {
    id: "noise",
    label: "نقشة مزدحمة",
    kind: "noise",
    bg: "repeating-linear-gradient(45deg,#fbbf24 0 10px,#1e3a8a 10px 20px,#dc2626 20px 30px,#059669 30px 40px)",
  },
  {
    id: "img-engine",
    label: "محرك (مزدحم)",
    kind: "image-busy",
    bg: "url('https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?w=800&q=80') center/cover",
  },
  {
    id: "img-rim",
    label: "جنط لامع (فاتح)",
    kind: "image-light",
    bg: "url('https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&q=80') center/cover",
  },
  {
    id: "img-night",
    label: "إطار ليلي (داكن)",
    kind: "image-dark",
    bg: "url('https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?w=800&q=80') center/cover",
  },
];

type BreakpointKey = "mobile" | "tablet" | "desktop";

const BREAKPOINTS: Record<BreakpointKey, { label: string; width: string; tw: string }> = {
  mobile:  { label: "Mobile (≤640px)",   width: "180px", tw: "max-w-[180px]" },
  tablet:  { label: "Tablet (641–1024)", width: "240px", tw: "max-w-[240px] sm:max-w-[240px]" },
  desktop: { label: "Desktop (≥1024)",   width: "320px", tw: "lg:max-w-[320px]" },
};

/**
 * BadgeStack — يستخدم نفس مكوّن <ImageBadge> الموحّد المستعمل داخل
 * src/components/ProductCard.tsx، فيكون هذا الاختبار مرآة حقيقية
 * 1:1 لما يراه المستخدم النهائي (بدون أي class مكرّر).
 */
function BadgeStack({ stockAvailable, onSale, hasViewed }: { stockAvailable: boolean; onSale: boolean; hasViewed: boolean }) {
  return (
    <>
      <ImageBadgeColumn corner="top-start">
        <ImageBadge tone="brand" size="sm" colorClass="bg-red-600/95 text-white">
          تويوتا أصلي
        </ImageBadge>
      </ImageBadgeColumn>

      <ImageBadgeColumn corner="top-end">
        <ImageBadge tone="stock" size="sm" stockAvailable={stockAvailable}>
          {stockAvailable ? "متوفر" : "غير متوفر"}
        </ImageBadge>
        {onSale && (
          <ImageBadge tone="sale" size="sm" icon={<Sparkles />}>
            تخفيض
          </ImageBadge>
        )}
      </ImageBadgeColumn>

      {hasViewed && (
        <ImageBadgeColumn corner="bottom-end" level={40}>
          <ImageBadge tone="priced" size="sm" icon={<Check />}>
            مسعّر
          </ImageBadge>
        </ImageBadgeColumn>
      )}
    </>
  );
}

export default function BadgeContrastQA() {
  const { user, isAdmin, isModerator, loading } = useAuth();
  const [breakpoint, setBreakpoint] = useState<BreakpointKey>("desktop");
  const [showSale, setShowSale] = useState(true);
  const [showPriced, setShowPriced] = useState(true);
  const [outOfStock, setOutOfStock] = useState(false);

  useEffect(() => {
    document.documentElement.dir = "rtl";
  }, []);

  const allowed = useMemo(() => isAdmin || isModerator, [isAdmin, isModerator]);

  if (loading) return <div className="min-h-screen grid place-items-center text-muted-foreground">جارٍ التحقق…</div>;
  if (!user || !allowed) return <Navigate to="/admin" replace />;

  const card = BREAKPOINTS[breakpoint];

  return (
    <div className="min-h-screen bg-muted/30" dir="rtl">
      <Helmet>
        <title>اختبار وضوح البادجات | لوحة الإدارة</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      <header className="sticky top-0 z-40 bg-card/80 backdrop-blur border-b border-border">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/admin"><ArrowRight className="w-4 h-4 ml-1" /> رجوع للإدارة</Link>
          </Button>
          <div className="flex-1">
            <h1 className="text-lg font-bold">اختبار وضوح البادجات على خلفيات متعددة</h1>
            <p className="text-xs text-muted-foreground">
              مرآة حرفية لكروت المنتج — تأكد أن النص يبقى مقروءاً فوق الفاتح والداكن والمزدحم.
            </p>
          </div>
        </div>
      </header>

      {/* Controls */}
      <div className="max-w-7xl mx-auto px-4 py-4">
        <Card className="p-4 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground">حجم العرض:</span>
            {(Object.keys(BREAKPOINTS) as BreakpointKey[]).map((bp) => (
              <Button
                key={bp}
                size="sm"
                variant={breakpoint === bp ? "default" : "outline"}
                onClick={() => setBreakpoint(bp)}
              >
                {BREAKPOINTS[bp].label}
              </Button>
            ))}
          </div>
          <div className="h-5 w-px bg-border" />
          <Button size="sm" variant={showSale ? "default" : "outline"} onClick={() => setShowSale(v => !v)}>
            تخفيض: {showSale ? "ظاهر" : "مخفي"}
          </Button>
          <Button size="sm" variant={showPriced ? "default" : "outline"} onClick={() => setShowPriced(v => !v)}>
            مسعّر: {showPriced ? "ظاهر" : "مخفي"}
          </Button>
          <Button size="sm" variant={outOfStock ? "destructive" : "outline"} onClick={() => setOutOfStock(v => !v)}>
            {outOfStock ? "غير متوفر" : "متوفر"}
          </Button>
        </Card>
      </div>

      {/* Grid of swatches */}
      <main className="max-w-7xl mx-auto px-4 pb-16">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {SWATCHES.map((s) => (
            <div key={s.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold">{s.label}</h2>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{s.kind}</span>
              </div>

              <div
                className={`relative aspect-square rounded-2xl overflow-hidden border border-border shadow-sm mx-auto ${card.tw}`}
                style={{ background: s.bg, width: card.width }}
              >
                <BadgeStack stockAvailable={!outOfStock} onSale={showSale} hasViewed={showPriced} />

                {/* Mock product centerpiece — يحاكي وجود صورة منتج خلف البادجات */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className={`text-center px-4 ${s.kind.includes("dark") ? "text-white/40" : "text-black/30"}`}>
                    <div className="text-[10px] font-mono">SKU-12345</div>
                    <div className="text-xs font-bold mt-1">منتج تجريبي</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <Card className="mt-8 p-4 text-xs text-muted-foreground leading-relaxed">
          <p className="font-semibold text-foreground mb-2">📋 معايير القبول:</p>
          <ul className="list-disc pr-5 space-y-1">
            <li>كل بادج يجب أن يكون نصه مقروءاً بوضوح في كل الخلفيات (لا يلتبس بالخلفية).</li>
            <li>الـ ring الأبيض (ring-white/30) يجب أن يفصل البادج عن الخلفية الفاتحة جداً.</li>
            <li>الـ text-shadow يجب أن يبقي الحروف ظاهرة فوق الصور المزدحمة.</li>
            <li>عند تبديل الـ breakpoint: لا يغطّي أي بادج اسم المنتج (المنتصف يبقى مرئياً).</li>
            <li>اتجاه RTL: البراند في اليمين، التوفر/التخفيض/المسعّر في اليسار — لا فراغ.</li>
          </ul>
        </Card>
      </main>
    </div>
  );
}
