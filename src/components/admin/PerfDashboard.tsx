import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Activity,
  Zap,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Trash2,
  ChevronDown,
} from "lucide-react";
import {
  getAllSamples,
  clearSamples,
  compareImpact,
  avgField,
  type PerfSample,
} from "@/lib/perfMetrics";
import { cn } from "@/lib/utils";

interface PerfDashboardProps {
  /** القيم اللحظية من usePerfTracker */
  live: {
    mountMs: number;
    renderCount: number;
    badgeCount: number;
    avgTabSwitchMs: number;
  };
  badgesEnabled: boolean;
  onToggleBadges: (enabled: boolean) => void;
  /** التقاط عينة يدوية */
  onSnapshot?: () => void;
}

const fmtMs = (n: number) => (n < 1 ? "<1ms" : `${Math.round(n)}ms`);
const ratingFor = (ms: number, good: number, ok: number) =>
  ms <= good ? "good" : ms <= ok ? "ok" : "bad";

const RATING_STYLES: Record<string, string> = {
  good: "text-emerald-600 dark:text-emerald-400",
  ok: "text-yellow-600 dark:text-yellow-400",
  bad: "text-destructive",
};

const PerfDashboard = ({
  live,
  badgesEnabled,
  onToggleBadges,
  onSnapshot,
}: PerfDashboardProps) => {
  const [samples, setSamples] = useState<PerfSample[]>([]);
  const [expanded, setExpanded] = useState(false);

  const refresh = () => setSamples(getAllSamples());

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 2000);
    return () => clearInterval(id);
  }, []);

  const impact = compareImpact(samples);
  const avgMount = avgField(samples, "mountMs");
  const avgSwitch = avgField(samples, "avgTabSwitchMs");

  const mountRating = ratingFor(live.mountMs, 200, 500);
  const switchRating = ratingFor(live.avgTabSwitchMs, 50, 150);

  return (
    <Card className="p-4 mb-4 border-primary/20 bg-gradient-to-br from-primary/[0.02] to-background">
      {/* الصف العلوي: عنوان + توجل + أزرار */}
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
            <Activity className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h3 className="font-bold text-sm flex items-center gap-2">
              لوحة مؤشرات الأداء
              <span className="text-[10px] font-normal text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                StaffCRMCommandCenter
              </span>
            </h3>
            <p className="text-[10px] text-muted-foreground">
              قياس حيّ + مقارنة قبل/بعد إيقاف Badges
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2 py-1 rounded-md border bg-background">
            <Switch
              id="badges-toggle"
              checked={badgesEnabled}
              onCheckedChange={onToggleBadges}
            />
            <Label htmlFor="badges-toggle" className="text-xs font-semibold cursor-pointer">
              Badges {badgesEnabled ? "مفعّلة" : "معطّلة"}
            </Label>
          </div>
          {onSnapshot && (
            <Button size="sm" variant="outline" onClick={onSnapshot}>
              <Zap className="w-3.5 h-3.5 ml-1" /> التقط عينة
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={refresh}>
            <RefreshCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* مؤشرات لحظية: 4 KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
        <KpiTile
          label="وقت التحميل (Mount)"
          value={fmtMs(live.mountMs)}
          rating={mountRating}
          benchmark="جيد <200ms"
        />
        <KpiTile
          label="تبديل التبويبات (متوسط)"
          value={fmtMs(live.avgTabSwitchMs)}
          rating={switchRating}
          benchmark="جيد <50ms"
        />
        <KpiTile
          label="Badges في الـ DOM"
          value={String(live.badgeCount)}
          rating={live.badgeCount < 30 ? "good" : live.badgeCount < 80 ? "ok" : "bad"}
          benchmark={badgesEnabled ? "مفعّلة" : "معطّلة"}
        />
        <KpiTile
          label="Re-renders"
          value={String(live.renderCount)}
          rating={live.renderCount < 10 ? "good" : live.renderCount < 25 ? "ok" : "bad"}
          benchmark="جيد <10"
        />
      </div>

      {/* مقارنة الأثر */}
      {impact ? (
        <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
          <p className="text-xs font-bold flex items-center gap-1.5">
            📊 أثر إيقاف Badges على الأداء
            <span className="text-[10px] font-normal text-muted-foreground">
              ({impact.onCount} عينة On / {impact.offCount} عينة Off)
            </span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            <ImpactRow
              label="وقت التحميل"
              on={impact.mount.on}
              off={impact.mount.off}
              deltaPct={impact.mount.deltaPct}
            />
            <ImpactRow
              label="تبديل التبويب"
              on={impact.tabSwitch.on}
              off={impact.tabSwitch.off}
              deltaPct={impact.tabSwitch.deltaPct}
            />
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-dashed border-border bg-muted/30 p-3 text-center">
          <p className="text-xs text-muted-foreground">
            🔬 بدّل بين Badges مفعّلة/معطّلة وغيّر التبويبات لتجميع عينات للمقارنة
            {samples.length > 0 && ` (${samples.length} عينة محفوظة حتى الآن)`}
          </p>
        </div>
      )}

      {/* تفاصيل الجلسة */}
      {samples.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setExpanded((s) => !s)}
            className="text-[11px] text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <ChevronDown className={cn("w-3 h-3 transition-transform", expanded && "rotate-180")} />
            {expanded ? "إخفاء" : "عرض"} آخر {samples.length} عينة
            {avgMount > 0 && ` — متوسط mount: ${fmtMs(avgMount)} | tab switch: ${fmtMs(avgSwitch)}`}
          </button>
          {expanded && (
            <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
              {samples.slice().reverse().map((s, i) => (
                <div
                  key={i}
                  className="text-[10px] font-mono flex items-center gap-2 p-1.5 rounded bg-muted/50"
                  dir="ltr"
                >
                  <span
                    className={cn(
                      "px-1.5 py-0.5 rounded text-white font-bold",
                      s.badgesEnabled ? "bg-blue-500" : "bg-gray-500"
                    )}
                  >
                    {s.badgesEnabled ? "ON" : "OFF"}
                  </span>
                  <span className="text-muted-foreground">{s.activeTab}</span>
                  <span className="ml-auto">mount: {fmtMs(s.mountMs)}</span>
                  <span>switch: {fmtMs(s.avgTabSwitchMs)}</span>
                  <span>badges: {s.badgeCount}</span>
                </div>
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              clearSamples();
              refresh();
            }}
            className="text-[10px] text-destructive hover:underline mt-2 flex items-center gap-1"
          >
            <Trash2 className="w-3 h-3" /> مسح كل العينات
          </button>
        </div>
      )}
    </Card>
  );
};

const KpiTile = ({
  label,
  value,
  rating,
  benchmark,
}: {
  label: string;
  value: string;
  rating: string;
  benchmark: string;
}) => (
  <div className="rounded-lg border bg-background p-2.5">
    <p className="text-[10px] text-muted-foreground font-semibold leading-tight">{label}</p>
    <p className={cn("text-lg font-black tabular-nums leading-tight mt-0.5", RATING_STYLES[rating])}>
      {value}
    </p>
    <p className="text-[9px] text-muted-foreground mt-0.5">{benchmark}</p>
  </div>
);

const ImpactRow = ({
  label,
  on,
  off,
  deltaPct,
}: {
  label: string;
  on: number;
  off: number;
  deltaPct: number;
}) => {
  const improved = deltaPct > 1;
  const worse = deltaPct < -1;
  return (
    <div className="text-xs space-y-0.5">
      <p className="font-semibold">{label}</p>
      <div className="flex items-center gap-2 font-mono text-[11px]" dir="ltr">
        <span>ON: {fmtMs(on)}</span>
        <span className="text-muted-foreground">→</span>
        <span>OFF: {fmtMs(off)}</span>
      </div>
      <div
        className={cn(
          "flex items-center gap-1 text-[11px] font-bold",
          improved && "text-emerald-600",
          worse && "text-destructive",
          !improved && !worse && "text-muted-foreground"
        )}
      >
        {improved ? (
          <TrendingDown className="w-3 h-3" />
        ) : worse ? (
          <TrendingUp className="w-3 h-3" />
        ) : null}
        {improved && `أسرع بـ ${Math.abs(deltaPct).toFixed(1)}%`}
        {worse && `أبطأ بـ ${Math.abs(deltaPct).toFixed(1)}%`}
        {!improved && !worse && "بدون فرق ملحوظ"}
      </div>
    </div>
  );
};

export default PerfDashboard;
