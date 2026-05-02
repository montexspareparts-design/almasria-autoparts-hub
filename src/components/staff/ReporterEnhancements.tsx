// مكونات إضافية للتقرير اليومي:
// 1) PersonalCompareCard — مقارنة آخر 7 أيام + متوسط + أفضل يوم
// 2) MoodShoutoutSection — مزاج اليوم + شكر زميل + سؤال "إيه اللي خلى يومك حلو" لو الـ self_rating عالي والأداء ضعيف
import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Minus, Trophy, Sparkles, Flame, Target, CheckCircle2, AlertCircle, Users2 } from "lucide-react";

// ============================================================
// نفس صيغة احتساب الأداء المستخدمة في الـ edge function
// ============================================================
export function performanceScore(r: any): number {
  if (!r) return 0;
  return Math.max(
    0,
    Number(r.offers_converted_count || 0) * 3 +
      Number(r.new_customers_count || 0) * 2 +
      Number(r.calls_count || 0) +
      Number(r.followups_count || 0) -
      Number(r.incomplete_orders_count || 0)
  );
}

const fmtDateAr = (s: string) =>
  new Date(s).toLocaleDateString("ar-EG", { weekday: "short", day: "numeric", month: "short" });

// ============================================================
// Sparkline — مخطط اتجاه صغير لآخر 7 أيام (SVG بسيط بدون مكتبة)
// ============================================================
function SparklineChart({
  points,
  avg,
  todayScore,
}: {
  points: { date: string; score: number }[];
  avg: number;
  todayScore: number | null;
}) {
  // ندمج "النهاردة" مع التاريخ لو فيه قيمة، عشان نوضّح فين الأداء الحالي
  const series = todayScore != null
    ? [...points, { date: "today", score: todayScore }]
    : points;

  if (series.length < 2) return null;

  const W = 280;
  const H = 70;
  const PAD_X = 12;
  const PAD_Y = 12;
  const maxScore = Math.max(...series.map((p) => p.score), avg, 10);
  const minScore = 0;
  const stepX = (W - PAD_X * 2) / (series.length - 1);
  const yFor = (v: number) =>
    H - PAD_Y - ((v - minScore) / Math.max(1, maxScore - minScore)) * (H - PAD_Y * 2);

  const coords = series.map((p, i) => ({
    x: PAD_X + i * stepX,
    y: yFor(p.score),
    score: p.score,
    date: p.date,
    isToday: p.date === "today",
  }));

  const linePath = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`).join(" ");
  const areaPath = `${linePath} L ${coords[coords.length - 1].x.toFixed(1)} ${H - PAD_Y} L ${coords[0].x.toFixed(1)} ${H - PAD_Y} Z`;
  const avgY = yFor(avg);

  // أول قيمة vs آخر قيمة (اتجاه عام)
  const trendUp = series[series.length - 1].score >= series[0].score;
  const lineColor = trendUp ? "hsl(160 84% 39%)" : "hsl(346 87% 50%)"; // emerald / rose
  const areaColor = trendUp ? "hsl(160 84% 39% / 0.18)" : "hsl(346 87% 50% / 0.18)";

  return (
    <div className="mt-3 p-2.5 rounded-lg bg-white/70 dark:bg-slate-900/50 border border-white/80 dark:border-slate-700/50">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[10px] font-semibold text-muted-foreground">📈 اتجاه أدائك</span>
        <span className="text-[9px] text-muted-foreground">
          آخر {points.length} يوم{todayScore != null ? " + النهاردة" : ""}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-[70px] block"
        preserveAspectRatio="none"
        role="img"
        aria-label="مخطط أداء آخر 7 أيام"
      >
        {/* خط المتوسط (مرجع متقطع) */}
        <line
          x1={PAD_X} x2={W - PAD_X} y1={avgY} y2={avgY}
          stroke="hsl(var(--muted-foreground))"
          strokeOpacity={0.35}
          strokeDasharray="3 3"
          strokeWidth={1}
        />
        <text
          x={W - PAD_X - 2}
          y={avgY - 3}
          textAnchor="end"
          fontSize="8"
          fill="hsl(var(--muted-foreground))"
          opacity={0.7}
        >
          متوسط {avg}
        </text>

        {/* المساحة تحت المنحنى */}
        <path d={areaPath} fill={areaColor} />

        {/* الخط نفسه */}
        <path
          d={linePath}
          fill="none"
          stroke={lineColor}
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* النقاط */}
        {coords.map((c, i) => (
          <g key={i}>
            <circle
              cx={c.x}
              cy={c.y}
              r={c.isToday ? 4 : 2.5}
              fill={c.isToday ? "hsl(217 91% 60%)" : lineColor}
              stroke={c.isToday ? "white" : "none"}
              strokeWidth={c.isToday ? 2 : 0}
            />
            {c.isToday && (
              <text
                x={c.x}
                y={c.y - 8}
                textAnchor="middle"
                fontSize="9"
                fontWeight="bold"
                fill="hsl(217 91% 50%)"
              >
                النهاردة
              </text>
            )}
          </g>
        ))}
      </svg>
      <div className="flex items-center justify-between mt-1 text-[9px] text-muted-foreground">
        <span>{fmtDateAr(points[0].date)}</span>
        <span className={trendUp ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
          {trendUp ? "📈 اتجاه صاعد" : "📉 اتجاه نازل"}
        </span>
        <span>{fmtDateAr(points[points.length - 1].date)}</span>
      </div>
    </div>
  );
}


// ============================================================
// 1) كارت المقارنة الشخصية (آخر 7 أيام)
// ============================================================
export function PersonalCompareCard({
  userId,
  todayScore,
}: {
  userId: string;
  todayScore: number;
}) {
  const [history, setHistory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const today = new Date();
        const weekAgo = new Date();
        weekAgo.setDate(today.getDate() - 8); // ناخد 8 علشان لو فيه فجوات
        const { data } = await supabase
          .from("reporter_daily_reports")
          .select("report_date, calls_count, offers_converted_count, new_customers_count, followups_count, incomplete_orders_count")
          .eq("user_id", userId)
          .eq("is_submitted", true)
          .gte("report_date", weekAgo.toISOString().slice(0, 10))
          .lt("report_date", today.toISOString().slice(0, 10))
          .order("report_date", { ascending: false })
          .limit(7);
        setHistory(data || []);
      } finally {
        setLoading(false);
      }
    })();
  }, [userId]);

  const stats = useMemo(() => {
    if (history.length === 0) return null;
    const scores = history.map((r) => ({ date: r.report_date, score: performanceScore(r) }));
    const avg = scores.reduce((a, b) => a + b.score, 0) / scores.length;
    const best = scores.reduce((a, b) => (b.score > a.score ? b : a), scores[0]);
    const yesterday = scores[0];
    // chronological for the chart (oldest → newest)
    const chrono = [...scores].reverse();
    return { avg: Math.round(avg), best, yesterday, count: scores.length, chrono };
  }, [history]);

  if (loading || !stats) return null;

  const vsAvg = todayScore - stats.avg;
  const vsAvgPct = stats.avg > 0 ? Math.round((vsAvg / stats.avg) * 100) : 0;

  const Trend = ({ delta }: { delta: number }) =>
    delta > 0 ? (
      <span className="inline-flex items-center gap-0.5 text-emerald-600 font-bold">
        <TrendingUp className="w-3 h-3" />+{delta}
      </span>
    ) : delta < 0 ? (
      <span className="inline-flex items-center gap-0.5 text-rose-600 font-bold">
        <TrendingDown className="w-3 h-3" />{delta}
      </span>
    ) : (
      <span className="inline-flex items-center gap-0.5 text-muted-foreground font-bold">
        <Minus className="w-3 h-3" />0
      </span>
    );

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="p-4 bg-gradient-to-br from-indigo-50 via-blue-50 to-cyan-50 dark:from-indigo-950/30 dark:via-blue-950/30 dark:to-cyan-950/30 border-indigo-200 dark:border-indigo-800/50">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/20 grid place-items-center">
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <div>
            <h3 className="font-bold text-sm">📊 مقارنتك الشخصية</h3>
            <p className="text-[10px] text-muted-foreground">من واقع آخر {stats.count} تقرير مُسلَّم</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-lg bg-white/60 dark:bg-slate-900/40 border border-white/80 dark:border-slate-700/50">
            <div className="text-[10px] text-muted-foreground">امبارح</div>
            <div className="text-xl font-extrabold">{stats.yesterday.score}</div>
            <div className="text-[9px] text-muted-foreground mt-0.5">{fmtDateAr(stats.yesterday.date)}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-white/60 dark:bg-slate-900/40 border border-white/80 dark:border-slate-700/50">
            <div className="text-[10px] text-muted-foreground">متوسط الأسبوع</div>
            <div className="text-xl font-extrabold">{stats.avg}</div>
            <div className="text-[9px] text-muted-foreground mt-0.5">من {stats.count} يوم</div>
          </div>
          <div className="p-2.5 rounded-lg bg-gradient-to-br from-amber-100 to-yellow-100 dark:from-amber-950/40 dark:to-yellow-950/40 border border-amber-300/50">
            <div className="text-[10px] text-amber-800 dark:text-amber-300 flex items-center gap-1">
              <Trophy className="w-3 h-3" />أفضل يوم
            </div>
            <div className="text-xl font-extrabold text-amber-700 dark:text-amber-400">{stats.best.score}</div>
            <div className="text-[9px] text-amber-700/70 mt-0.5">{fmtDateAr(stats.best.date)}</div>
          </div>
        </div>

        {/* Sparkline trend chart */}
        <SparklineChart
          points={stats.chrono}
          avg={stats.avg}
          todayScore={todayScore > 0 ? todayScore : null}
        />

        {todayScore > 0 && (
          <div className="mt-3 p-2.5 rounded-lg bg-white/70 dark:bg-slate-900/50 border border-white/80 dark:border-slate-700/50 text-xs">
            <div className="flex items-center justify-between flex-wrap gap-1">
              <span className="text-muted-foreground">أداؤك المُدخَل النهاردة:</span>
              <span className="font-extrabold text-base">{todayScore}</span>
            </div>
            <div className="flex items-center justify-between mt-1.5 pt-1.5 border-t border-dashed">
              <span className="text-muted-foreground">مقارنة بمتوسطك:</span>
              <Trend delta={vsAvg} />
            </div>
            {vsAvgPct !== 0 && (
              <p className="text-[10px] text-muted-foreground mt-1.5 leading-relaxed">
                {vsAvg > 0
                  ? `🔥 أعلى من متوسطك بـ ${Math.abs(vsAvgPct)}% — كمّل كده!`
                  : `💪 أقل من متوسطك بـ ${Math.abs(vsAvgPct)}% — لسه في وقت تعوّض.`}
              </p>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  );
}

// ============================================================
// 2) قسم المزاج + شكر زميل + سؤال ذكي للتقييم العالي مع أداء ضعيف
// ============================================================
const MOODS = [
  { value: "happy", emoji: "😄", label: "مبسوط", color: "from-emerald-400 to-green-500" },
  { value: "neutral", emoji: "😐", label: "عادي", color: "from-slate-400 to-slate-500" },
  { value: "sad", emoji: "😞", label: "تعبان", color: "from-rose-400 to-red-500" },
];

export function MoodShoutoutSection({
  data,
  setData,
  locked,
  currentUserId,
  todayScore,
}: {
  data: any;
  setData: (fn: (d: any) => any) => void;
  locked: boolean;
  currentUserId: string;
  todayScore: number;
}) {
  const [colleagues, setColleagues] = useState<{ user_id: string; name: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { data: list, error } = await (supabase as any).rpc("list_staff_colleagues");
      if (error || !list) return;
      setColleagues(
        (list as any[])
          .filter((p) => p.user_id !== currentUserId)
          .map((p) => ({ user_id: p.user_id, name: p.full_name || "زميل" }))
          .sort((a, b) => a.name.localeCompare(b.name, "ar"))
      );
    })();
  }, [currentUserId]);

  // الشرط الذكي: قيّم نفسه 9-10 لكن النقاط الفعلية أقل من 25
  const showWhyGoodDay =
    !!data.self_rating && data.self_rating >= 9 && todayScore < 25 && todayScore >= 0;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* Mood */}
      <Card className="p-4">
        <Label className="text-xs font-bold mb-2.5 flex items-center gap-1.5 text-foreground">
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          إحساسك في الشغل النهاردة؟
        </Label>
        <div className="grid grid-cols-3 gap-2">
          {MOODS.map((m) => {
            const active = data.mood === m.value;
            return (
              <button
                key={m.value}
                type="button"
                disabled={locked}
                onClick={() => setData((d) => ({ ...d, mood: m.value }))}
                className={`p-3 rounded-xl border-2 transition-all flex flex-col items-center gap-1 ${
                  active
                    ? `bg-gradient-to-br ${m.color} text-white border-transparent shadow-md scale-105`
                    : "bg-card border-border hover:border-primary/40 hover:scale-[1.02]"
                } ${locked ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <span className="text-2xl leading-none">{m.emoji}</span>
                <span className="text-xs font-bold">{m.label}</span>
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
          ده عشان نعرف إحساسك بشكل عام — مش بيأثر على تقييمك.
        </p>
      </Card>

      {/* Why good day — تظهر بشرط */}
      {showWhyGoodDay && (
        <motion.div
          initial={{ opacity: 0, y: -8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
        >
          <Card className="p-4 bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-amber-950/30 dark:to-yellow-950/30 border-amber-300 dark:border-amber-800/50">
            <Label className="text-xs font-bold mb-2 flex items-center gap-1.5 text-amber-900 dark:text-amber-200">
              ✨ قيّمت نفسك {data.self_rating}/10 — حلو إن يومك حلو! إيه اللي خلاه كده؟
            </Label>
            <Textarea
              placeholder="عشان نعرف الحاجات اللي بتديك طاقة (مش إجباري)…"
              value={data.why_good_day || ""}
              onChange={(e) => setData((d) => ({ ...d, why_good_day: e.target.value }))}
              disabled={locked}
              className="min-h-[60px] resize-none bg-white/70 dark:bg-slate-900/40 text-sm"
            />
            <Badge variant="outline" className="mt-2 text-[9px] bg-amber-100/50 text-amber-800 border-amber-300">
              اختياري • المعلومة بتتشارك مع الإدارة لتحسين بيئة العمل
            </Badge>
          </Card>
        </motion.div>
      )}

      {/* Shoutout */}
      <Card className="p-4">
        <Label className="text-xs font-bold mb-2.5 flex items-center gap-1.5 text-foreground">
          👏 موظف ساعدك النهاردة؟ <span className="text-muted-foreground font-normal">(اختياري — هنبعتله شكر تلقائي)</span>
        </Label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          <Select
            value={data.shoutout_user_id || "none"}
            onValueChange={(v) =>
              setData((d) => ({
                ...d,
                shoutout_user_id: v === "none" ? null : v,
                shoutout_reason: v === "none" ? null : d.shoutout_reason,
              }))
            }
            disabled={locked}
          >
            <SelectTrigger className="h-10">
              <SelectValue placeholder="اختر زميل…" />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              <SelectItem value="none">— مفيش —</SelectItem>
              {colleagues.map((c) => (
                <SelectItem key={c.user_id} value={c.user_id}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {data.shoutout_user_id && (
            <Textarea
              placeholder="ساعدني في إيه؟ (اختياري)"
              value={data.shoutout_reason || ""}
              onChange={(e) => setData((d) => ({ ...d, shoutout_reason: e.target.value }))}
              disabled={locked}
              className="min-h-[40px] resize-none text-sm"
            />
          )}
        </div>
        {data.shoutout_user_id && (
          <p className="text-[10px] text-muted-foreground mt-2">
            ✓ هيوصل لزميلك إشعار "شكر من زميل" بعد إرسال التقرير.
          </p>
        )}
      </Card>
    </motion.div>
  );
}

// ============================================================
// 3) KPICalculatedCard — معدل التحويل + الإغلاق + Funnel بصري
// ============================================================
export function KPICalculatedCard({ data }: { data: any }) {
  const callsW = Number(data.calls_count || 0) + Number(data.whatsapp_count || 0);
  const sent = Number(data.offers_sent_count || 0);
  const conv = Number(data.offers_converted_count || 0);
  const lost = Number(data.lost_opportunities_count || 0);
  const newC = Number(data.new_customers_count || 0);

  const convRate = sent > 0 ? Math.round((conv / sent) * 100) : null;
  const closeRate = (conv + lost) > 0 ? Math.round((conv / (conv + lost)) * 100) : null;
  const callsPerNew = newC > 0 ? (callsW / newC).toFixed(1) : null;

  const colorFor = (pct: number | null) => {
    if (pct == null) return "text-muted-foreground bg-muted/40 border-muted";
    if (pct >= 30) return "text-emerald-700 bg-emerald-50 border-emerald-300 dark:text-emerald-300 dark:bg-emerald-950/40 dark:border-emerald-800";
    if (pct >= 15) return "text-amber-700 bg-amber-50 border-amber-300 dark:text-amber-300 dark:bg-amber-950/40 dark:border-amber-800";
    return "text-rose-700 bg-rose-50 border-rose-300 dark:text-rose-300 dark:bg-rose-950/40 dark:border-rose-800";
  };

  const funnelMax = Math.max(callsW, sent, conv, newC, 1);
  const FunnelBar = ({ value, label, color }: { value: number; label: string; color: string }) => {
    const pct = (value / funnelMax) * 100;
    return (
      <div className="flex items-center gap-2">
        <div className="text-[10px] text-muted-foreground w-20 shrink-0 text-left">{label}</div>
        <div className="flex-1 h-5 bg-muted/50 rounded-full overflow-hidden relative">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(pct, 2)}%` }}
            transition={{ duration: 0.5 }}
            className={`h-full rounded-full ${color}`}
          />
          <div className="absolute inset-0 flex items-center justify-end pr-2 text-[10px] font-bold text-foreground/80">
            {value}
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="p-4 bg-gradient-to-br from-violet-50 via-fuchsia-50 to-pink-50 dark:from-violet-950/30 dark:via-fuchsia-950/30 dark:to-pink-950/30 border-violet-200 dark:border-violet-800/50">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-lg bg-violet-500/20 grid place-items-center">
            <Sparkles className="w-4 h-4 text-violet-600" />
          </div>
          <div>
            <h3 className="font-bold text-sm">📊 مؤشرات أداء فورية</h3>
            <p className="text-[10px] text-muted-foreground">بتتحدّث وأنت بتدخّل الأرقام</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-3">
          <div className={`p-2.5 rounded-lg border ${colorFor(convRate)}`}>
            <div className="text-[10px] font-medium opacity-80">معدل التحويل</div>
            <div className="text-lg font-extrabold leading-tight">
              {convRate != null ? `${convRate}%` : "—"}
            </div>
            <div className="text-[9px] opacity-60 mt-0.5">عروض محوّلة / مرسلة</div>
          </div>
          <div className={`p-2.5 rounded-lg border ${colorFor(closeRate)}`}>
            <div className="text-[10px] font-medium opacity-80">معدل الإغلاق</div>
            <div className="text-lg font-extrabold leading-tight">
              {closeRate != null ? `${closeRate}%` : "—"}
            </div>
            <div className="text-[9px] opacity-60 mt-0.5">محوّلة / (محوّلة+ضائعة)</div>
          </div>
          <div className="p-2.5 rounded-lg border border-cyan-300 bg-cyan-50 dark:bg-cyan-950/40 dark:border-cyan-800 text-cyan-700 dark:text-cyan-300">
            <div className="text-[10px] font-medium opacity-80">مكالمات / عميل جديد</div>
            <div className="text-lg font-extrabold leading-tight">{callsPerNew ?? "—"}</div>
            <div className="text-[9px] opacity-60 mt-0.5">كفاءة التواصل</div>
          </div>
        </div>

        <div className="space-y-1.5 pt-2 border-t border-white/60 dark:border-slate-700/40">
          <div className="text-[10px] font-bold text-muted-foreground mb-1">قمع المبيعات اليومي</div>
          <FunnelBar value={callsW} label="تواصل" color="bg-gradient-to-r from-blue-500 to-indigo-500" />
          <FunnelBar value={sent} label="عروض مرسلة" color="bg-gradient-to-r from-cyan-500 to-teal-500" />
          <FunnelBar value={conv} label="محوّلة" color="bg-gradient-to-r from-emerald-500 to-green-500" />
          <FunnelBar value={newC} label="عملاء جدد" color="bg-gradient-to-r from-amber-500 to-orange-500" />
        </div>
      </Card>
    </motion.div>
  );
}

// ============================================================
// 4) DailyTargetsRings — حلقات تقدّم الأهداف اليومية
// ============================================================
type Targets = {
  calls_target: number;
  quotations_target: number;
  new_customers_target: number;
  offers_converted_target: number;
  is_custom: boolean;
};

export function DailyTargetsRings({ userId, data }: { userId: string; data: any }) {
  const [targets, setTargets] = useState<Targets | null>(null);

  useEffect(() => {
    (async () => {
      const { data: rows, error } = await (supabase as any).rpc("get_effective_targets", { _user_id: userId });
      if (error || !rows || !rows.length) return;
      setTargets(rows[0] as Targets);
    })();
  }, [userId]);

  if (!targets) return null;

  const items = [
    { label: "مكالمات", value: Number(data.calls_count || 0), target: targets.calls_target, color: "stroke-purple-500", text: "text-purple-600" },
    { label: "عروض أسعار", value: Number(data.quotations_count || 0), target: targets.quotations_target, color: "stroke-indigo-500", text: "text-indigo-600" },
    { label: "محوّلة", value: Number(data.offers_converted_count || 0), target: targets.offers_converted_target, color: "stroke-emerald-500", text: "text-emerald-600" },
    { label: "عملاء جدد", value: Number(data.new_customers_count || 0), target: targets.new_customers_target, color: "stroke-amber-500", text: "text-amber-600" },
  ];

  const Ring = ({ value, target, color, text, label }: any) => {
    const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
    const reached = value >= target && target > 0;
    const R = 22;
    const C = 2 * Math.PI * R;
    const offset = C - (pct / 100) * C;
    return (
      <div className="flex flex-col items-center gap-1">
        <div className="relative">
          <svg width={56} height={56} viewBox="0 0 56 56" className="-rotate-90">
            <circle cx="28" cy="28" r={R} fill="none" stroke="currentColor" strokeWidth="4" className="text-muted/40" />
            <motion.circle
              cx="28" cy="28" r={R} fill="none" strokeWidth="4" strokeLinecap="round"
              className={color}
              strokeDasharray={C}
              initial={{ strokeDashoffset: C }}
              animate={{ strokeDashoffset: offset }}
              transition={{ duration: 0.6, ease: "easeOut" }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {reached ? (
              <CheckCircle2 className="w-5 h-5 text-amber-500" />
            ) : (
              <span className={`text-xs font-extrabold ${text}`}>{Math.round(pct)}%</span>
            )}
          </div>
        </div>
        <div className="text-[9px] font-bold text-foreground text-center leading-tight">{label}</div>
        <div className="text-[9px] text-muted-foreground">{value}/{target}</div>
      </div>
    );
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Card className="p-4 bg-gradient-to-br from-amber-50 via-orange-50 to-yellow-50 dark:from-amber-950/30 dark:via-orange-950/30 dark:to-yellow-950/30 border-amber-200 dark:border-amber-800/50">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 grid place-items-center">
              <Target className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <h3 className="font-bold text-sm">🎯 أهدافك اليومية</h3>
              <p className="text-[10px] text-muted-foreground">
                {targets.is_custom ? "هدف مخصّص ليك" : "هدف الفريق الافتراضي"}
              </p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {items.map((it) => <Ring key={it.label} {...it} />)}
        </div>
      </Card>
    </motion.div>
  );
}

// ============================================================
// 5) StreakBadge — سلسلة التسليم المتتالية
// ============================================================
export function StreakBadge({ userId }: { userId: string }) {
  const [streak, setStreak] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any).rpc("get_submit_streak", { _user_id: userId });
      if (error) return;
      setStreak(typeof data === "number" ? data : 0);
    })();
  }, [userId]);

  if (streak == null || streak === 0) return null;

  const milestone = streak >= 30 ? "🏆" : streak >= 14 ? "💎" : streak >= 7 ? "🔥" : "✨";
  const tone =
    streak >= 30 ? "from-amber-500 to-orange-500" :
    streak >= 14 ? "from-violet-500 to-fuchsia-500" :
    streak >= 7 ? "from-rose-500 to-red-500" :
    "from-sky-500 to-blue-500";

  return (
    <Badge className={`gap-1.5 bg-gradient-to-r ${tone} text-white border-0 text-[11px] py-1 px-2.5`}>
      <Flame className="w-3 h-3" />
      {milestone} {streak} يوم متتالي
    </Badge>
  );
}

// ============================================================
// 6) TeamBenchmarkLine — مقارنة بمتوسط الفريق اليوم
// ============================================================
export function TeamBenchmarkLine({ todayScore }: { todayScore: number }) {
  const [team, setTeam] = useState<{ team_size: number; avg_score: number } | null>(null);

  useEffect(() => {
    (async () => {
      const { data, error } = await (supabase as any).rpc("get_team_avg_today");
      if (error || !data || !data.length) return;
      setTeam({ team_size: data[0].team_size, avg_score: Number(data[0].avg_score) });
    })();
  }, []);

  if (!team || team.team_size < 2) return null; // لازم على الأقل زميل تاني سلّم

  const avg = team.avg_score || 0;
  const diff = todayScore - avg;
  const pct = avg > 0 ? Math.round((diff / avg) * 100) : 0;
  const above = diff >= 0;

  return (
    <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-700/50 text-xs">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        <Users2 className="w-3.5 h-3.5" />
        <span>متوسط الفريق اليوم: <strong className="text-foreground">{avg}</strong> ({team.team_size} زميل)</span>
      </div>
      {todayScore > 0 && (
        <span className={`font-bold ${above ? "text-emerald-600" : "text-rose-600"}`}>
          {above ? "↑" : "↓"} {Math.abs(pct)}%
        </span>
      )}
    </div>
  );
}

