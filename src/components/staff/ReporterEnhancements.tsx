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
import { TrendingUp, TrendingDown, Minus, Trophy, Sparkles } from "lucide-react";

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
    return { avg: Math.round(avg), best, yesterday, count: scores.length };
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
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id")
        .in("role", ["reporter", "admin", "moderator"]);
      const ids = (roles || []).map((r) => r.user_id).filter((id) => id !== currentUserId);
      if (ids.length === 0) return;
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", ids);
      setColleagues(
        (profs || [])
          .map((p) => ({ user_id: p.user_id, name: p.full_name || p.email?.split("@")[0] || "زميل" }))
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
