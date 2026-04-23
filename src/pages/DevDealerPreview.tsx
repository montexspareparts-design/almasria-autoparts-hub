import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ArrowRight,
  ShoppingCart,
  Search,
  Languages,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

/* ───────────────────────── Check definitions ───────────────────────── */

type Severity = "ok" | "warn" | "fail";
interface CheckResult {
  id: string;
  label: string;
  severity: Severity;
  detail: string;
}

const runChecks = (root: HTMLElement, dir: "rtl" | "ltr"): CheckResult[] => {
  const results: CheckResult[] = [];

  // 1. <html dir> reflects the active language
  const htmlDir = document.documentElement.dir;
  results.push({
    id: "html-dir",
    label: "اتجاه <html dir>",
    severity: htmlDir === dir ? "ok" : "fail",
    detail: `expected="${dir}", actual="${htmlDir}"`,
  });

  // 2. Tokens that should be logical (start/end) — flag any legacy left/right padding/margin inside the preview area
  const all = root.querySelectorAll<HTMLElement>("[class]");
  const legacyPattern = /\b(?:sm:|md:|lg:|xl:|2xl:)?(?:-?(?:mr|ml|pr|pl)-(?:\d|px|\[|auto)|text-(?:right|left))\b/;
  const legacyOffenders: string[] = [];
  all.forEach((el) => {
    const cls = el.getAttribute("class") || "";
    if (legacyPattern.test(cls)) {
      legacyOffenders.push(`<${el.tagName.toLowerCase()}> · ${cls.match(legacyPattern)?.[0]}`);
    }
  });
  results.push({
    id: "legacy-classes",
    label: "كلاسات اتجاهية قديمة (mr/ml/pr/pl/text-right/text-left)",
    severity: legacyOffenders.length === 0 ? "ok" : "warn",
    detail:
      legacyOffenders.length === 0
        ? "كل الكلاسات منطقية ✓"
        : `${legacyOffenders.length} عنصر يستخدم كلاس اتجاهي قديم — مثال: ${legacyOffenders.slice(0, 3).join(" | ")}`,
  });

  // 3. Directional icons orientation
  // ChevronLeft/ArrowLeft should visually point toward the "back" direction.
  // In RTL, "back/previous" is on the right — so a ChevronLeft icon usually needs to be flipped (or replaced with ChevronRight).
  // We can't read the SVG path, but we can detect icons marked with data-directional="true" and verify they have rotate-180 in LTR is absent / RTL is present (or vice-versa) as user expects.
  const directional = root.querySelectorAll<HTMLElement>("[data-directional='true']");
  const wrongFlip: string[] = [];
  directional.forEach((el) => {
    const flipped = el.classList.contains("rtl:rotate-180") || el.style.transform.includes("scaleX(-1)");
    // Convention adopted here: directional icons must have `rtl:rotate-180` so they flip in RTL automatically.
    if (!flipped) wrongFlip.push(el.getAttribute("data-icon-name") || "icon");
  });
  results.push({
    id: "directional-icons",
    label: "أيقونات اتجاهية تُعكس تلقائياً (data-directional)",
    severity: directional.length === 0 ? "warn" : wrongFlip.length === 0 ? "ok" : "fail",
    detail:
      directional.length === 0
        ? "لم يتم وسم أي أيقونة بـ data-directional='true' في هذه المعاينة"
        : wrongFlip.length === 0
        ? `${directional.length} أيقونة موسومة وتنعكس بشكل صحيح ✓`
        : `${wrongFlip.length} أيقونة بدون كلاس rtl:rotate-180 — مثال: ${wrongFlip.slice(0, 3).join(", ")}`,
  });

  // 4. Body/root computed direction matches
  const bodyDir = getComputedStyle(document.body).direction;
  results.push({
    id: "computed-dir",
    label: "Computed direction على <body>",
    severity: bodyDir === dir ? "ok" : "fail",
    detail: `expected="${dir}", computed="${bodyDir}"`,
  });

  // 5. Scrollbar / horizontal overflow at mobile width (380px)
  const overflowX = root.scrollWidth > root.clientWidth + 1;
  results.push({
    id: "overflow-x",
    label: "عدم وجود overflow أفقي عند عرض 380px",
    severity: overflowX ? "warn" : "ok",
    detail: overflowX
      ? `scrollWidth=${root.scrollWidth}px > clientWidth=${root.clientWidth}px — قد يدل على عنصر مثبت بـ left/right ثابت`
      : "لا يوجد overflow أفقي ✓",
  });

  return results;
};

/* ───────────────────────── Sample dealer UI fragments ───────────────────────── */

const SampleBreadcrumb = () => (
  <nav className="flex items-center gap-1 text-sm text-muted-foreground">
    <span>الرئيسية</span>
    <ChevronLeft data-directional="true" data-icon-name="ChevronLeft" className="w-4 h-4 rtl:rotate-180" />
    <span>المنتجات</span>
    <ChevronLeft data-directional="true" data-icon-name="ChevronLeft" className="w-4 h-4 rtl:rotate-180" />
    <span className="text-foreground font-semibold">فلتر زيت</span>
  </nav>
);

const SampleProductCard = () => (
  <Card className="p-3 space-y-2">
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <div className="text-sm font-bold truncate">فلتر زيت تويوتا 90915-YZZD2</div>
        <div className="text-[11px] text-muted-foreground">SKU: 90915-YZZD2</div>
      </div>
      <Badge variant="secondary" className="shrink-0">متوفر</Badge>
    </div>
    <div className="flex items-center justify-between">
      <span className="text-base font-black text-primary">125 ج.م</span>
      <Button size="sm" className="gap-1.5">
        <ShoppingCart className="w-3.5 h-3.5" />
        أضف
      </Button>
    </div>
  </Card>
);

const SampleSearchBar = () => (
  <div className="relative">
    <Search className="absolute top-1/2 -translate-y-1/2 start-3 w-4 h-4 text-muted-foreground" />
    <input
      className="w-full h-10 ps-10 pe-3 rounded-lg border border-border bg-background text-sm"
      placeholder="ابحث عن قطعة..."
    />
  </div>
);

const SampleNavRow = () => (
  <div className="flex items-center justify-between p-3 rounded-lg border border-border">
    <div className="flex items-center gap-2">
      <ArrowLeft data-directional="true" data-icon-name="ArrowLeft" className="w-4 h-4 rtl:rotate-180" />
      <span className="text-sm">السابق</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-sm">التالي</span>
      <ArrowRight data-directional="true" data-icon-name="ArrowRight" className="w-4 h-4 rtl:rotate-180" />
    </div>
  </div>
);

/* ───────────────────────── Page ───────────────────────── */

const DevDealerPreview = () => {
  const { lang, setLang, dir } = useLanguage();
  const previewRef = useRef<HTMLDivElement>(null);
  const [results, setResults] = useState<CheckResult[]>([]);
  const [tick, setTick] = useState(0);

  // Re-run checks on language change + on demand
  useEffect(() => {
    if (!previewRef.current) return;
    // Wait a frame for re-render with new dir
    const id = requestAnimationFrame(() => {
      if (previewRef.current) setResults(runChecks(previewRef.current, dir));
    });
    return () => cancelAnimationFrame(id);
  }, [dir, tick]);

  const summary = useMemo(() => {
    const ok = results.filter((r) => r.severity === "ok").length;
    const warn = results.filter((r) => r.severity === "warn").length;
    const fail = results.filter((r) => r.severity === "fail").length;
    return { ok, warn, fail };
  }, [results]);

  return (
    <div className="min-h-screen bg-background p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-black">معاينة شاشة التاجر · فحص الاتجاه</h1>
            <p className="text-sm text-muted-foreground">
              لقطة بصرية + فحص آلي لاتجاه العناصر عند تبديل العربية/الإنجليزية.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLang(lang === "ar" ? "en" : "ar")}
              className="gap-2"
            >
              <Languages className="w-4 h-4" />
              {lang === "ar" ? "Switch to English (LTR)" : "التبديل للعربية (RTL)"}
            </Button>
            <Button size="sm" onClick={() => setTick((t) => t + 1)}>
              إعادة الفحص
            </Button>
          </div>
        </div>

        {/* Status strip */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <Badge variant="outline">
            اللغة: <strong className="ms-1">{lang.toUpperCase()}</strong>
          </Badge>
          <Badge variant="outline">
            الاتجاه: <strong className="ms-1">{dir.toUpperCase()}</strong>
          </Badge>
          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0">
            <CheckCircle2 className="w-3 h-3 me-1" /> ناجح: {summary.ok}
          </Badge>
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0">
            <AlertTriangle className="w-3 h-3 me-1" /> تحذير: {summary.warn}
          </Badge>
          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-0">
            <AlertTriangle className="w-3 h-3 me-1" /> فشل: {summary.fail}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-6">
          {/* Mobile preview frame */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              معاينة موبايل (380px)
            </div>
            <div
              ref={previewRef}
              dir={dir}
              className="w-[380px] mx-auto lg:mx-0 rounded-2xl border-2 border-border bg-card p-4 space-y-3 overflow-hidden"
              style={{ minHeight: 600 }}
            >
              <SampleBreadcrumb />
              <SampleSearchBar />
              <SampleProductCard />
              <SampleProductCard />
              <SampleNavRow />
            </div>
          </div>

          {/* Checklist */}
          <div className="space-y-2">
            <div className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              قائمة الفحص الآلي
            </div>
            <div className="space-y-2">
              {results.map((r) => (
                <Card
                  key={r.id}
                  className={
                    "p-3 border-l-4 " +
                    (r.severity === "ok"
                      ? "border-l-emerald-500"
                      : r.severity === "warn"
                      ? "border-l-amber-500"
                      : "border-l-rose-500")
                  }
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-bold">{r.label}</div>
                      <div className="text-xs text-muted-foreground mt-1 break-words">{r.detail}</div>
                    </div>
                    <Badge
                      className={
                        r.severity === "ok"
                          ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0"
                          : r.severity === "warn"
                          ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0"
                          : "bg-rose-500/15 text-rose-700 dark:text-rose-400 border-0"
                      }
                    >
                      {r.severity === "ok" ? "OK" : r.severity === "warn" ? "WARN" : "FAIL"}
                    </Badge>
                  </div>
                </Card>
              ))}
              {results.length === 0 && (
                <div className="text-sm text-muted-foreground">جارٍ تشغيل الفحص…</div>
              )}
            </div>

            <div className="text-[11px] text-muted-foreground pt-3 leading-relaxed">
              ملاحظة: الفحص يجري على شجرة المعاينة فقط (يسار الشاشة). لتوسيع الفحص ليشمل مكوناً
              فعلياً من شاشة التاجر، أضف <code className="px-1 bg-muted rounded">data-directional="true"</code>{" "}
              على الأيقونات الاتجاهية في ذلك المكون وارفع الفحص لاحقاً.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DevDealerPreview;
