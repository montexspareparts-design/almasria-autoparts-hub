/**
 * Mobile Error Reporter
 * ─────────────────────
 * يجمع تحذيرات/أخطاء الـ console + يفحص أسباب عدم ظهور المحتوى الأساسي
 * على الجوال (Hero / Navbar / main content) وينشئ تقريراً مختصراً.
 *
 * الاستخدام:
 *   import { installMobileErrorReporter, getMobileErrorReport } from "@/lib/mobileErrorReport";
 *   installMobileErrorReporter();           // مرة واحدة في main.tsx
 *   const report = getMobileErrorReport();  // عند الحاجة
 */

type LogEntry = { level: "warn" | "error"; message: string; ts: number };

const MAX_LOGS = 50;
const buffer: LogEntry[] = [];
let installed = false;

/**
 * أنماط تحذيرات/أخطاء معروفة وغير مؤثرة — يتم تجاهلها تماماً
 * (لا تُسجَّل في buffer التقرير ولا تُطبع في console).
 * تشمل: externalize warnings من Vite، رسائل HMR/preview الداخلية،
 * وتحذيرات React DevTools/source-map الشائعة.
 */
const NOISE_PATTERNS: RegExp[] = [
  /Module ".+" has been externalized for browser compatibility/i,
  /Unknown message type:\s*RESET_BLANK_CHECK/i,
  /Unknown message type:\s*[A-Z_]+_CHECK/i,
  /\[vite\] connecting/i,
  /\[vite\] connected/i,
  /Download the React DevTools/i,
  /\[HMR\]/i,
  /sourcemap/i,
];

const isNoise = (args: unknown[]): boolean => {
  const text = args
    .map((a) => (typeof a === "string" ? a : a instanceof Error ? a.message : ""))
    .join(" ");
  return NOISE_PATTERNS.some((re) => re.test(text));
};

const push = (level: LogEntry["level"], args: unknown[]) => {
  const message = args
    .map((a) => {
      if (a instanceof Error) return `${a.name}: ${a.message}`;
      if (typeof a === "object") {
        try { return JSON.stringify(a); } catch { return String(a); }
      }
      return String(a);
    })
    .join(" ")
    .slice(0, 500);
  buffer.push({ level, message, ts: Date.now() });
  if (buffer.length > MAX_LOGS) buffer.shift();
};

export function installMobileErrorReporter() {
  if (installed || typeof window === "undefined") return;
  installed = true;

  const origWarn = console.warn.bind(console);
  const origError = console.error.bind(console);

  console.warn = (...args: unknown[]) => {
    if (isNoise(args)) return; // تجاهل تام: لا buffer ولا طباعة
    push("warn", args);
    origWarn(...args);
  };
  console.error = (...args: unknown[]) => {
    if (isNoise(args)) return;
    push("error", args);
    origError(...args);
  };

  window.addEventListener("error", (e) => {
    if (isNoise([e.message])) return;
    push("error", [`[window.error] ${e.message} @ ${e.filename}:${e.lineno}`]);
  });
  window.addEventListener("unhandledrejection", (e) => {
    const msg = (e.reason && (e.reason.message || e.reason)) ?? "unknown";
    if (isNoise([String(msg)])) return;
    push("error", [`[unhandledrejection] ${msg}`]);
  });
}

/** يفحص الـ DOM ويستنتج سبب عدم ظهور المحتوى الأساسي على الجوال. */
function diagnoseMissingContent(): string[] {
  const reasons: string[] = [];
  if (typeof document === "undefined") return reasons;

  const root = document.getElementById("root");
  if (!root || root.children.length === 0) {
    reasons.push("جذر التطبيق (#root) فارغ — التطبيق لم يُركَّب (mount) بعد أو حدث خطأ في الـ render.");
    return reasons;
  }

  const hero = document.querySelector("section, [data-testid='hero'], header");
  if (!hero) {
    reasons.push("لم يتم العثور على Hero/Header — الصفحة قد تكون أُعيد توجيهها أو الـ Suspense fallback ما زال نشطاً.");
  }

  const main = document.querySelector("main, [role='main']") || root;
  const rect = main.getBoundingClientRect();
  if (rect.height < 100) {
    reasons.push(`المحتوى الأساسي ارتفاعه ${Math.round(rect.height)}px فقط (شبه فارغ).`);
  }

  // overflow أفقي يخفي المحتوى أحياناً على الموبايل
  const docEl = document.documentElement;
  if (docEl.scrollWidth > docEl.clientWidth + 1) {
    reasons.push(`Horizontal overflow: scrollWidth=${docEl.scrollWidth} > clientWidth=${docEl.clientWidth}.`);
  }

  // طبقة overlay/Dialog قد تغطي الشاشة
  const overlays = Array.from(document.querySelectorAll<HTMLElement>(
    "[data-state='open'][role='dialog'], [data-radix-dialog-overlay], .fixed.inset-0"
  ));
  const blocking = overlays.find((el) => {
    const r = el.getBoundingClientRect();
    return r.width >= window.innerWidth * 0.9 && r.height >= window.innerHeight * 0.9;
  });
  if (blocking) {
    reasons.push(`نافذة/Overlay يغطي الشاشة (${blocking.tagName.toLowerCase()}${blocking.id ? "#" + blocking.id : ""}).`);
  }

  // Suspense fallback (سبينر دائري) ما زال ظاهراً
  const spinners = document.querySelectorAll(".animate-spin");
  if (spinners.length >= 3) {
    reasons.push(`عدد ${spinners.length} سبينر تحميل ظاهر — الأقسام المؤجلة (lazy) لم تُحمَّل بعد.`);
  }

  return reasons;
}

export type Severity = "critical" | "high" | "medium" | "low";

export interface TopIssue {
  severity: Severity;
  category: "render" | "content" | "console" | "network" | "layout";
  title: string;
  detail: string;
  suggestedFix: string;
  occurrences: number;
}

export interface MobileErrorReport {
  generatedAt: string;
  viewport: { width: number; height: number; isMobile: boolean };
  url: string;
  userAgent: string;
  warnings: LogEntry[];
  errors: LogEntry[];
  contentIssues: string[];
  /** الخطأ الأهم الواحد فقط — null لو الجلسة سليمة */
  topIssue: TopIssue | null;
  /** عدد إجمالي للسجلات الخام (قبل التجميع) */
  totalLogCount: number;
  summary: string;
}

const SEVERITY_RANK: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 };

/** يصنّف رسالة console واحدة إلى عنوان موحّد + شدة + خطوة إصلاح. */
function classifyLogMessage(msg: string): Omit<TopIssue, "occurrences"> | null {
  if (/chunkloaderror|loading chunk \d+ failed|failed to fetch dynamically imported/i.test(msg)) {
    return {
      severity: "critical", category: "network",
      title: "فشل تحميل ملف JavaScript مؤجل (Chunk)",
      detail: msg.slice(0, 200),
      suggestedFix: "اطلب من المستخدم إعادة تحميل الصفحة (Ctrl+Shift+R). لو تكرر: تحقق من النشر الأخير وامسح كاش الـ CDN.",
    };
  }
  if (/network ?error|err_internet_disconnected|failed to fetch/i.test(msg)) {
    return {
      severity: "high", category: "network",
      title: "فشل في طلب شبكة",
      detail: msg.slice(0, 200),
      suggestedFix: "افحص اتصال الإنترنت وحالة الـ Edge Functions في لوحة Lovable Cloud.",
    };
  }
  if (/cannot read propert(y|ies) of (undefined|null)|undefined is not an object/i.test(msg)) {
    return {
      severity: "high", category: "console",
      title: "Null/Undefined Reference",
      detail: msg.slice(0, 200),
      suggestedFix: "أضف optional chaining (`?.`) أو شرط حماية قبل قراءة الخاصية في المكوّن المسؤول.",
    };
  }
  if (/hydrat|did not match|text content does not match/i.test(msg)) {
    return {
      severity: "high", category: "render",
      title: "عدم تطابق Hydration",
      detail: msg.slice(0, 200),
      suggestedFix: "تأكد من أن نفس المحتوى يُرسم على السيرفر والعميل (تجنّب `window`/`Date.now()` في الـ render الأول).",
    };
  }
  if (/maximum update depth|too many re-?renders/i.test(msg)) {
    return {
      severity: "critical", category: "render",
      title: "حلقة Re-render لا نهائية",
      detail: msg.slice(0, 200),
      suggestedFix: "افحص `useEffect` بدون dependency array صحيح، وضع callbacks داخل `useCallback`.",
    };
  }
  if (/cors|cross-origin|blocked by cors/i.test(msg)) {
    return {
      severity: "high", category: "network",
      title: "CORS Blocked",
      detail: msg.slice(0, 200),
      suggestedFix: "أضف الـ headers الصحيحة في الـ Edge Function، أو استخدم Lovable Cloud client بدل fetch مباشر.",
    };
  }
  if (/401|unauthorized|jwt expired|invalid token/i.test(msg)) {
    return {
      severity: "high", category: "network",
      title: "جلسة تسجيل دخول منتهية",
      detail: msg.slice(0, 200),
      suggestedFix: "نفّذ refresh للجلسة عبر `supabase.auth.refreshSession()` أو وجّه المستخدم لإعادة تسجيل الدخول.",
    };
  }
  if (/each child in a list should have a unique \"key\"/i.test(msg)) {
    return {
      severity: "low", category: "console",
      title: "React Key مفقود",
      detail: msg.slice(0, 200),
      suggestedFix: "أضف `key={item.id}` فريداً على عناصر `.map()`.",
    };
  }
  if (/violation|long task|forced reflow/i.test(msg)) {
    return {
      severity: "medium", category: "render",
      title: "بطء في الأداء (Long Task)",
      detail: msg.slice(0, 200),
      suggestedFix: "استخدم `React.lazy` للأقسام الثقيلة أو `useMemo` للحسابات المتكررة.",
    };
  }
  // fallback عام لأي خطأ غير مصنّف
  return {
    severity: "medium", category: "console",
    title: "خطأ JavaScript غير محدّد",
    detail: msg.slice(0, 200),
    suggestedFix: "افتح stack trace في DevTools واتبع الملف/السطر المذكور في الرسالة.",
  };
}

function classifyContentIssue(issue: string): Omit<TopIssue, "occurrences"> {
  if (/جذر التطبيق.*فارغ|#root.*فارغ/.test(issue)) {
    return {
      severity: "critical", category: "render",
      title: "التطبيق لم يتم تركيبه (Mount)",
      detail: issue,
      suggestedFix: "افحص أخطاء JavaScript في bootstrap (`main.tsx` / `App.tsx`). على الأرجح خطأ في الـ render الأول يمنع React من العمل.",
    };
  }
  if (/Overlay.*يغطي|نافذة.*يغطي/.test(issue)) {
    return {
      severity: "high", category: "layout",
      title: "Modal/Overlay عالق فوق الشاشة",
      detail: issue,
      suggestedFix: "تحقق من إغلاق الـ Dialogs بعد كل route change، وأن `data-state` يتغير من `open` إلى `closed`.",
    };
  }
  if (/Horizontal overflow|scrollWidth/.test(issue)) {
    return {
      severity: "medium", category: "layout",
      title: "تجاوز أفقي يكسر التصميم على الموبايل",
      detail: issue,
      suggestedFix: "ابحث عن عنصر بعرض ثابت كبير. أضف `overflow-x-hidden` على الـ body أو استخدم `max-w-full`.",
    };
  }
  if (/سبينر تحميل ظاهر/.test(issue)) {
    return {
      severity: "medium", category: "render",
      title: "أقسام lazy لم تنتهِ من التحميل",
      detail: issue,
      suggestedFix: "ابحث عن chunk بطيء في Network tab — قد يحتاج preload أو دمج مع الـ main bundle.",
    };
  }
  if (/شبه فارغ|ارتفاعه/.test(issue)) {
    return {
      severity: "high", category: "content",
      title: "المحتوى الأساسي فارغ",
      detail: issue,
      suggestedFix: "افحص query للبيانات (loading state عالق؟) وتحقق من أن الـ route الحالي يُرجع محتوى.",
    };
  }
  if (/Hero\/Header/.test(issue)) {
    return {
      severity: "medium", category: "content",
      title: "Hero/Header غير ظاهر",
      detail: issue,
      suggestedFix: "تأكد من أن المكوّن لم يُحجب بـ `hidden` أو `display: none` على الموبايل.",
    };
  }
  return {
    severity: "low", category: "content",
    title: "ملاحظة عرض",
    detail: issue,
    suggestedFix: "افحص الـ DOM يدوياً في DevTools → Elements.",
  };
}

/** يُجمّع كل المشاكل المتشابهة ويختار الأخطر — يُرجع خطأ واحد فقط أو null. */
function pickTopIssue(
  errors: LogEntry[],
  warnings: LogEntry[],
  contentIssues: string[]
): TopIssue | null {
  const grouped = new Map<string, TopIssue>();

  for (const issue of contentIssues) {
    const c = classifyContentIssue(issue);
    const existing = grouped.get(c.title);
    if (existing) existing.occurrences++;
    else grouped.set(c.title, { ...c, occurrences: 1 });
  }

  for (const e of errors) {
    const c = classifyLogMessage(e.message);
    if (!c) continue;
    const existing = grouped.get(c.title);
    if (existing) existing.occurrences++;
    else grouped.set(c.title, { ...c, occurrences: 1 });
  }

  for (const w of warnings) {
    const c = classifyLogMessage(w.message);
    if (!c) continue;
    // التحذيرات شدتها أقل من الخطأ بدرجة
    const downgraded: Severity =
      c.severity === "critical" ? "high" : c.severity === "high" ? "medium" : "low";
    const existing = grouped.get(c.title);
    if (existing) existing.occurrences++;
    else grouped.set(c.title, { ...c, severity: downgraded, occurrences: 1 });
  }

  const candidates = [...grouped.values()];
  if (!candidates.length) return null;

  candidates.sort((a, b) => {
    const r = SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity];
    return r !== 0 ? r : b.occurrences - a.occurrences;
  });

  return candidates[0];
}

const SEVERITY_LABEL: Record<Severity, string> = {
  critical: "🔴 حرج",
  high: "🟠 عالي",
  medium: "🟡 متوسط",
  low: "🟢 منخفض",
};

const CATEGORY_LABEL: Record<TopIssue["category"], string> = {
  render: "Render",
  content: "محتوى",
  console: "Console",
  network: "شبكة",
  layout: "تخطيط",
};

export function getMobileErrorReport(): MobileErrorReport {
  const warnings = buffer.filter((l) => l.level === "warn");
  const errors = buffer.filter((l) => l.level === "error");
  const contentIssues = diagnoseMissingContent();
  const w = typeof window !== "undefined" ? window.innerWidth : 0;
  const h = typeof window !== "undefined" ? window.innerHeight : 0;

  const topIssue = pickTopIssue(errors, warnings, contentIssues);
  const totalLogCount = errors.length + warnings.length + contentIssues.length;

  let summary: string;
  if (!topIssue) {
    summary = "✅ الجلسة سليمة — لا توجد مشاكل مرصودة على هذه الشاشة.";
  } else {
    const noiseCount = totalLogCount - topIssue.occurrences;
    const noiseNote = noiseCount > 0 ? ` — تم تجميع ${noiseCount} رسالة إضافية` : "";
    summary = `${SEVERITY_LABEL[topIssue.severity]} — ${topIssue.title}${noiseNote}`;
  }

  return {
    generatedAt: new Date().toISOString(),
    viewport: { width: w, height: h, isMobile: w < 768 },
    url: typeof window !== "undefined" ? window.location.href : "",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    warnings: warnings.slice(-10),
    errors: errors.slice(-10),
    contentIssues,
    topIssue,
    totalLogCount,
    summary,
  };
}

export function formatReportText(r: MobileErrorReport): string {
  const lines = [
    `📱 تقرير خطأ الجوال — ${new Date(r.generatedAt).toLocaleString("ar-EG")}`,
    `الشاشة: ${r.viewport.width}×${r.viewport.height}${r.viewport.isMobile ? " (موبايل)" : ""}`,
    `الصفحة: ${r.url}`,
    "",
    `الخلاصة: ${r.summary}`,
    "",
  ];

  if (r.topIssue) {
    lines.push("═══ أهم مشكلة في هذه الجلسة ═══");
    lines.push(`الشدة:    ${SEVERITY_LABEL[r.topIssue.severity]}`);
    lines.push(`النوع:    ${CATEGORY_LABEL[r.topIssue.category]}`);
    lines.push(`العنوان:  ${r.topIssue.title}`);
    lines.push(`التكرار:  ${r.topIssue.occurrences}× في هذه الجلسة`);
    lines.push(`التفاصيل: ${r.topIssue.detail}`);
    lines.push("");
    lines.push("🛠 خطوة الإصلاح المقترحة:");
    lines.push(`   ${r.topIssue.suggestedFix}`);
    lines.push("");
    if (r.totalLogCount > r.topIssue.occurrences) {
      lines.push(
        `ℹ️ تم حجب ${r.totalLogCount - r.topIssue.occurrences} رسالة إضافية (مكررة أو أقل أهمية).`
      );
    }
  } else {
    lines.push("✅ لا توجد مشاكل مرصودة على هذه الشاشة.");
  }

  return lines.join("\n");
}

