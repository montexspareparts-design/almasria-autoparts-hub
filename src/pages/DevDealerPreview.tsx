import { useEffect, useMemo, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  scanProjectForLegacyClasses,
  buildEditorLink,
  type LegacyFileReport,
} from "@/lib/devLegacyClassScan";
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
  ChevronDown,
  ExternalLink,
  Copy,
  FileWarning,
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

        {/* Static source scan: legacy Tailwind classes across dealer + admin */}
        <LegacyClassPanel />

        {/* Conversion log */}
        <ConversionLog />
      </div>
    </div>
  );
};

/* ───────────────────────── Legacy class panel ───────────────────────── */

const LegacyClassPanel = () => {
  const [reports, setReports] = useState<LegacyFileReport[]>([]);
  const [open, setOpen] = useState<Record<string, boolean>>({});
  const [scanning, setScanning] = useState(false);

  const runScan = () => {
    setScanning(true);
    // Defer to next frame so the spinner can render
    requestAnimationFrame(() => {
      try {
        const next = scanProjectForLegacyClasses();
        setReports(next);
      } finally {
        setScanning(false);
      }
    });
  };

  useEffect(() => {
    runScan();
  }, []);

  const totals = useMemo(() => {
    const filesWithIssues = reports.length;
    const totalMatches = reports.reduce((acc, r) => acc + r.matches.length, 0);
    return { filesWithIssues, totalMatches };
  }, [reports]);

  const copyPath = async (file: string, line: number) => {
    try {
      await navigator.clipboard.writeText(`${file}:${line}`);
      toast.success(`نسخ: ${file}:${line}`);
    } catch {
      toast.error("تعذّر النسخ");
    }
  };

  const openInEditor = (file: string, line: number) => {
    const url = buildEditorLink(file, line);
    // VS Code custom protocol — silently no-op if handler isn't installed.
    window.location.href = url;
    // Always offer the copy fallback toast
    toast.message(`فتح ${file}:${line}`, {
      description: "إذا لم يفتح المحرر تلقائياً، استخدم زر النسخ.",
    });
  };

  return (
    <Card className="p-4 md:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-black flex items-center gap-2">
            <FileWarning className="w-5 h-5 text-amber-500" />
            مسح الملفات: كلاسات Tailwind قديمة
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            فحص ثابت لمصادر <code className="px-1 bg-muted rounded">src/components/dealer/**</code>،{" "}
            <code className="px-1 bg-muted rounded">src/components/admin/**</code>، و{" "}
            <code className="px-1 bg-muted rounded">src/pages/Dealer*.tsx</code>.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-0">
            ملفات: {totals.filesWithIssues}
          </Badge>
          <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-0">
            مخالفات: {totals.totalMatches}
          </Badge>
          <Button size="sm" variant="outline" onClick={runScan} disabled={scanning}>
            {scanning ? "جارٍ المسح…" : "إعادة المسح"}
          </Button>
        </div>
      </div>

      {reports.length === 0 ? (
        <div className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          ممتاز — لا توجد كلاسات اتجاهية قديمة في النطاق الممسوح.
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => {
            const isOpen = open[r.file] ?? false;
            return (
              <div key={r.file} className="border border-border rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpen((s) => ({ ...s, [r.file]: !isOpen }))}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 text-start hover:bg-muted/50 transition-colors"
                >
                  <div className="min-w-0 flex items-center gap-2">
                    <ChevronDown
                      className={
                        "w-4 h-4 shrink-0 transition-transform " +
                        (isOpen ? "" : "-rotate-90 rtl:rotate-90")
                      }
                    />
                    <code className="text-xs md:text-sm truncate font-mono">{r.file}</code>
                  </div>
                  <Badge className="bg-rose-500/15 text-rose-700 dark:text-rose-400 border-0 shrink-0">
                    {r.matches.length}
                  </Badge>
                </button>

                {isOpen && (
                  <div className="border-t border-border bg-muted/20 divide-y divide-border">
                    {r.matches.slice(0, 50).map((m, i) => (
                      <div
                        key={`${m.line}-${m.column}-${i}`}
                        className="flex items-start justify-between gap-2 px-3 py-2 text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <span className="font-mono">L{m.line}:{m.column}</span>
                            <Badge variant="outline" className="font-mono text-[10px] py-0 px-1.5">
                              {m.match}
                            </Badge>
                          </div>
                          <code className="block mt-1 font-mono text-[11px] text-foreground/80 break-all">
                            {m.snippet}
                          </code>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            title="فتح في المحرر (VS Code)"
                            onClick={() => openInEditor(r.file, m.line)}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7"
                            title="نسخ المسار:السطر"
                            onClick={() => copyPath(r.file, m.line)}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    {r.matches.length > 50 && (
                      <div className="px-3 py-2 text-[11px] text-muted-foreground">
                        …و{r.matches.length - 50} مخالفة إضافية في نفس الملف.
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div className="text-[11px] text-muted-foreground leading-relaxed">
        التحويل المطلوب: <code className="bg-muted rounded px-1">mr/ml → ms/me</code>،{" "}
        <code className="bg-muted rounded px-1">pr/pl → ps/pe</code>،{" "}
        <code className="bg-muted rounded px-1">text-right/left → text-start/end</code>.
      </div>
    </Card>
  );
};

/* ───────────────────────── Conversion log ───────────────────────── */

type ConversionStatus = "done" | "partial" | "pending";

interface ConversionEntry {
  area: string;
  files: string[];
  status: ConversionStatus;
  note?: string;
}

const conversionLog: ConversionEntry[] = [
  {
    area: "Bootstrap اتجاهي بدون Flash",
    files: ["index.html"],
    status: "done",
    note: "ضبط <html dir/lang> فور التحميل من localStorage قبل React.",
  },
  {
    area: "نظام i18n + LanguageContext",
    files: ["src/contexts/LanguageContext.tsx"],
    status: "done",
    note: "تبديل ar/en + تبديل dir تلقائياً + حفظ في localStorage.",
  },
  {
    area: "صفحة DealerDashboard الرئيسية",
    files: ["src/pages/DealerDashboard.tsx"],
    status: "done",
    note: "نظيفة — لا تحتوي كلاسات mr/ml/pr/pl (تفويض للمكونات الفرعية).",
  },
  {
    area: "صفحة DealerProductPage",
    files: ["src/pages/DealerProductPage.tsx"],
    status: "done",
    note: "نظيفة بالكامل — لا توجد كلاسات اتجاهية قديمة.",
  },
  {
    area: "مكونات لوحة الإدارة (admin)",
    files: [
      "AdminClientAccountAttempts.tsx",
      "AdminLeadsReport.tsx",
      "AdminNewOrderAlert.tsx",
      "AdminWhatsAppDeliveryStatus.tsx",
      "CustomerActivitySummary.tsx",
      "CustomerCommunicationLog.tsx",
      "StaffAccountSettings.tsx",
      "StaffCRMCommandCenter.tsx",
      "StaffPerformanceDetail.tsx",
      "StorageImageGallery.tsx",
      "SupportRequestAISummary.tsx",
      "TransferToColleagueDialog.tsx",
    ],
    status: "done",
    note: "تحويل ml/mr→me/ms، pl/pr→pe/ps، text-right/left→text-start/end.",
  },
  {
    area: "صفحة /dev/dealer-preview",
    files: ["src/pages/DevDealerPreview.tsx"],
    status: "done",
    note: "5 فحوصات تلقائية: html dir, legacy classes, directional icons, computed dir, overflow.",
  },
  {
    area: "مكونات Dealer (DealerSidebar / Cart / QuickOrder / ...)",
    files: ["src/components/dealer/*"],
    status: "pending",
    note: "بحاجة لمسح وتحويل لاحق على دفعات لتقليل المخاطر.",
  },
  {
    area: "ترجمة فعلية للنصوص (ar ⇄ en)",
    files: ["src/contexts/LanguageContext.tsx", "dealer pages"],
    status: "pending",
    note: "البنية جاهزة — يبقى ربط مفاتيح الترجمة بالنصوص في الواجهات.",
  },
];

const statusMeta: Record<ConversionStatus, { label: string; cls: string }> = {
  done: { label: "تم", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400" },
  partial: { label: "جزئي", cls: "bg-amber-500/15 text-amber-700 dark:text-amber-400" },
  pending: { label: "متبقّي", cls: "bg-muted text-muted-foreground" },
};

const ConversionLog = () => {
  const counts = useMemo(() => {
    return conversionLog.reduce(
      (acc, e) => ({ ...acc, [e.status]: (acc as any)[e.status] + 1 }),
      { done: 0, partial: 0, pending: 0 } as Record<ConversionStatus, number>,
    );
  }, []);

  return (
    <Card className="p-4 md:p-5 space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-black">سجل التحويل الاتجاهي · Dealer Dashboard</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            ملخص المناطق التي تم تحويلها لكلاسات منطقية (ms/me/ps/pe/text-start/end) ودعم RTL/LTR.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <Badge className={statusMeta.done.cls + " border-0"}>تم: {counts.done}</Badge>
          <Badge className={statusMeta.partial.cls + " border-0"}>جزئي: {counts.partial}</Badge>
          <Badge className={statusMeta.pending.cls + " border-0"}>متبقّي: {counts.pending}</Badge>
        </div>
      </div>

      <div className="overflow-x-auto -mx-4 md:-mx-5 px-4 md:px-5">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-muted-foreground border-b border-border">
              <th className="py-2 ps-0 pe-2 text-start font-semibold">المنطقة</th>
              <th className="py-2 px-2 text-start font-semibold">الملفات</th>
              <th className="py-2 px-2 text-start font-semibold">الحالة</th>
              <th className="py-2 ps-2 pe-0 text-start font-semibold">ملاحظات</th>
            </tr>
          </thead>
          <tbody>
            {conversionLog.map((e, i) => (
              <tr key={i} className="border-b border-border/50 last:border-0 align-top">
                <td className="py-2.5 ps-0 pe-2 font-bold">{e.area}</td>
                <td className="py-2.5 px-2">
                  <div className="flex flex-wrap gap-1">
                    {e.files.slice(0, 4).map((f) => (
                      <code key={f} className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-mono">
                        {f}
                      </code>
                    ))}
                    {e.files.length > 4 && (
                      <span className="text-[10px] text-muted-foreground self-center">
                        +{e.files.length - 4}
                      </span>
                    )}
                  </div>
                </td>
                <td className="py-2.5 px-2">
                  <Badge className={statusMeta[e.status].cls + " border-0"}>
                    {statusMeta[e.status].label}
                  </Badge>
                </td>
                <td className="py-2.5 ps-2 pe-0 text-xs text-muted-foreground leading-relaxed">
                  {e.note}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

export default DevDealerPreview;
