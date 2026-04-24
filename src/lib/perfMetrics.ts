/**
 * Performance Metrics Store
 * ─────────────────────────
 * مخزن قياسات أداء بسيط (in-memory + localStorage) لتتبع وقت تحميل
 * StaffCRMCommandCenter ومقارنة الأداء قبل/بعد إيقاف الـ Badges.
 */

export interface PerfSample {
  /** ISO timestamp وقت الالتقاط */
  ts: string;
  /** وقت mount الكامل بالميلي ثانية (من بداية constructor إلى أول paint) */
  mountMs: number;
  /** عدد re-renders حتى اللحظة */
  renderCount: number;
  /** عدد Badges المرسومة في الجلسة */
  badgeCount: number;
  /** هل كانت Badges مفعّلة وقت القياس */
  badgesEnabled: boolean;
  /** متوسط زمن switching بين تبويبين (ms) */
  avgTabSwitchMs: number;
  /** التبويب النشط وقت القياس */
  activeTab: string;
}

const KEY = "perf:staff-crm:samples";
const MAX_SAMPLES = 20;

const loadAll = (): PerfSample[] => {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as PerfSample[]) : [];
  } catch {
    return [];
  }
};

const saveAll = (samples: PerfSample[]) => {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(samples.slice(-MAX_SAMPLES)));
  } catch {
    // quota exceeded — تجاهل
  }
};

export const recordSample = (sample: PerfSample) => {
  const all = loadAll();
  all.push(sample);
  saveAll(all);
};

export const getAllSamples = (): PerfSample[] => loadAll();

export const clearSamples = () => {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(KEY);
  } catch {
    /* ignore */
  }
};

/** متوسط حقل رقمي عبر مجموعة عينات */
export const avgField = <K extends keyof PerfSample>(
  samples: PerfSample[],
  field: K
): number => {
  const nums = samples
    .map((s) => s[field])
    .filter((v): v is number => typeof v === "number");
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
};

/**
 * يحسب فرق الأداء بين عينات Badges-On و Badges-Off.
 * يُرجع نسبة التحسّن (موجب = الـ off أسرع، سالب = أبطأ).
 */
export const compareImpact = (samples: PerfSample[]) => {
  const on = samples.filter((s) => s.badgesEnabled);
  const off = samples.filter((s) => !s.badgesEnabled);
  if (!on.length || !off.length) {
    return null;
  }
  const onMount = avgField(on, "mountMs");
  const offMount = avgField(off, "mountMs");
  const onSwitch = avgField(on, "avgTabSwitchMs");
  const offSwitch = avgField(off, "avgTabSwitchMs");
  return {
    onCount: on.length,
    offCount: off.length,
    mount: {
      on: onMount,
      off: offMount,
      deltaPct: onMount > 0 ? ((onMount - offMount) / onMount) * 100 : 0,
    },
    tabSwitch: {
      on: onSwitch,
      off: offSwitch,
      deltaPct: onSwitch > 0 ? ((onSwitch - offSwitch) / onSwitch) * 100 : 0,
    },
  };
};
