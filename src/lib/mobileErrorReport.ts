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

  console.warn = (...args: unknown[]) => { push("warn", args); origWarn(...args); };
  console.error = (...args: unknown[]) => { push("error", args); origError(...args); };

  window.addEventListener("error", (e) => {
    push("error", [`[window.error] ${e.message} @ ${e.filename}:${e.lineno}`]);
  });
  window.addEventListener("unhandledrejection", (e) => {
    push("error", [`[unhandledrejection] ${(e.reason && (e.reason.message || e.reason)) ?? "unknown"}`]);
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

export interface MobileErrorReport {
  generatedAt: string;
  viewport: { width: number; height: number; isMobile: boolean };
  url: string;
  userAgent: string;
  warnings: LogEntry[];
  errors: LogEntry[];
  contentIssues: string[];
  summary: string;
}

export function getMobileErrorReport(): MobileErrorReport {
  const warnings = buffer.filter((l) => l.level === "warn");
  const errors = buffer.filter((l) => l.level === "error");
  const contentIssues = diagnoseMissingContent();
  const w = typeof window !== "undefined" ? window.innerWidth : 0;
  const h = typeof window !== "undefined" ? window.innerHeight : 0;

  const summaryParts: string[] = [];
  if (errors.length) summaryParts.push(`${errors.length} خطأ`);
  if (warnings.length) summaryParts.push(`${warnings.length} تحذير`);
  if (contentIssues.length) summaryParts.push(`${contentIssues.length} مشكلة عرض`);
  const summary = summaryParts.length
    ? `تم رصد: ${summaryParts.join("، ")}.`
    : "لا توجد مشاكل مرصودة على هذه الشاشة.";

  return {
    generatedAt: new Date().toISOString(),
    viewport: { width: w, height: h, isMobile: w < 768 },
    url: typeof window !== "undefined" ? window.location.href : "",
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
    warnings: warnings.slice(-10),
    errors: errors.slice(-10),
    contentIssues,
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
  if (r.contentIssues.length) {
    lines.push("— مشاكل عرض المحتوى:");
    r.contentIssues.forEach((m, i) => lines.push(`  ${i + 1}. ${m}`));
    lines.push("");
  }
  if (r.errors.length) {
    lines.push("— أخطاء الـ Console:");
    r.errors.forEach((e) => lines.push(`  • ${e.message}`));
    lines.push("");
  }
  if (r.warnings.length) {
    lines.push("— تحذيرات الـ Console:");
    r.warnings.forEach((w) => lines.push(`  • ${w.message}`));
  }
  return lines.join("\n");
}
