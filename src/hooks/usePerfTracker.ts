import { useEffect, useRef, useState, useCallback } from "react";
import { recordSample, type PerfSample } from "@/lib/perfMetrics";

interface UsePerfTrackerOpts {
  componentName: string;
  badgesEnabled: boolean;
  activeTab: string;
  /** لتحديد عدد Badges المرسومة في dom */
  badgeSelector?: string;
}

/**
 * يقيس وقت mount الأول، عدد re-renders، متوسط زمن تبديل التبويبات،
 * ويسجّل عينة كل ما يتغيّر التبويب أو يتغيّر badgesEnabled.
 */
export const usePerfTracker = ({
  componentName,
  badgesEnabled,
  activeTab,
  badgeSelector = "[class*='inline-flex'][class*='rounded-full']",
}: UsePerfTrackerOpts) => {
  const mountStartRef = useRef<number>(performance.now());
  const renderCountRef = useRef<number>(0);
  const lastTabRef = useRef<string>(activeTab);
  const tabSwitchStartRef = useRef<number | null>(null);
  const tabSwitchDurationsRef = useRef<number[]>([]);

  const [mountMs, setMountMs] = useState<number>(0);
  const [renderCount, setRenderCount] = useState<number>(0);
  const [badgeCount, setBadgeCount] = useState<number>(0);
  const [avgTabSwitchMs, setAvgTabSwitchMs] = useState<number>(0);

  // تتبع عدد renders
  renderCountRef.current += 1;

  // قياس mount مرة واحدة بعد أول paint
  useEffect(() => {
    const raf = requestAnimationFrame(() => {
      const ms = performance.now() - mountStartRef.current;
      setMountMs(Math.round(ms));
    });
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // مزامنة renderCount + badgeCount بعد كل render
  useEffect(() => {
    setRenderCount(renderCountRef.current);
    if (typeof document !== "undefined") {
      try {
        setBadgeCount(document.querySelectorAll(badgeSelector).length);
      } catch {
        setBadgeCount(0);
      }
    }
  });

  // قياس زمن تبديل تبويب
  useEffect(() => {
    if (lastTabRef.current !== activeTab) {
      // بداية التبديل
      tabSwitchStartRef.current = performance.now();
      const start = tabSwitchStartRef.current;
      const raf = requestAnimationFrame(() => {
        const dur = performance.now() - start;
        tabSwitchDurationsRef.current.push(dur);
        const arr = tabSwitchDurationsRef.current;
        const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
        setAvgTabSwitchMs(Math.round(avg));
      });
      lastTabRef.current = activeTab;
      return () => cancelAnimationFrame(raf);
    }
  }, [activeTab]);

  // تسجيل عينة عند تغيّر التبويب أو badgesEnabled (بعد ما mount يكتمل)
  useEffect(() => {
    if (mountMs === 0) return;
    const sample: PerfSample = {
      ts: new Date().toISOString(),
      mountMs,
      renderCount: renderCountRef.current,
      badgeCount,
      badgesEnabled,
      avgTabSwitchMs,
      activeTab,
    };
    recordSample(sample);
    // eslint-disable-next-line no-console
    console.debug(`[perf:${componentName}]`, sample);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, badgesEnabled, mountMs]);

  const takeSnapshot = useCallback(() => {
    const sample: PerfSample = {
      ts: new Date().toISOString(),
      mountMs,
      renderCount: renderCountRef.current,
      badgeCount,
      badgesEnabled,
      avgTabSwitchMs,
      activeTab,
    };
    recordSample(sample);
    return sample;
  }, [mountMs, badgeCount, badgesEnabled, avgTabSwitchMs, activeTab]);

  return {
    mountMs,
    renderCount,
    badgeCount,
    avgTabSwitchMs,
    takeSnapshot,
  };
};
