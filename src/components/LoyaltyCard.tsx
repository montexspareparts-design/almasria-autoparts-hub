import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Gift, TrendingUp, Trophy, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface LoyaltyData {
  balance: number;
  lifetime_earned: number;
  tier: string;
}

interface LoyaltyTx {
  id: string;
  points: number;
  type: string;
  reason: string | null;
  created_at: string;
}

const TIERS = [
  { key: "bronze", label: "برونزي", color: "from-amber-700 to-amber-900", textColor: "text-amber-100", threshold: 0, next: 5000 },
  { key: "silver", label: "فضي", color: "from-slate-400 to-slate-600", textColor: "text-slate-100", threshold: 5000, next: 20000 },
  { key: "gold", label: "ذهبي", color: "from-yellow-400 to-yellow-600", textColor: "text-yellow-50", threshold: 20000, next: 50000 },
  { key: "platinum", label: "بلاتيني", color: "from-violet-500 to-violet-700", textColor: "text-violet-50", threshold: 50000, next: 50000 },
];

const LoyaltyCard = () => {
  const { user } = useAuth();
  const [data, setData] = useState<LoyaltyData | null>(null);
  const [txs, setTxs] = useState<LoyaltyTx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const { data: lp } = await supabase.from("loyalty_points").select("*").eq("user_id", user.id).maybeSingle();
      setData(lp ?? { balance: 0, lifetime_earned: 0, tier: "bronze" });
      const { data: tx } = await supabase
        .from("loyalty_transactions")
        .select("id, points, type, reason, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(10);
      setTxs(tx ?? []);
      setLoading(false);
    })();
  }, [user]);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  if (!data) return null;

  const currentTier = TIERS.find(t => t.key === data.tier) ?? TIERS[0];
  const nextTier = TIERS[TIERS.findIndex(t => t.key === data.tier) + 1];
  const progress = nextTier
    ? Math.min(100, ((data.lifetime_earned - currentTier.threshold) / (nextTier.threshold - currentTier.threshold)) * 100)
    : 100;
  const pointsToNext = nextTier ? Math.max(0, nextTier.threshold - data.lifetime_earned) : 0;

  return (
    <div className="space-y-4">
      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${currentTier.color} p-6 shadow-xl`}
      >
        <div className="absolute -top-12 -left-12 w-40 h-40 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-white/10 blur-xl" />

        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className={`flex items-center gap-2 ${currentTier.textColor}`}>
              <Trophy className="w-5 h-5" />
              <span className="font-bold text-lg">{currentTier.label}</span>
            </div>
            <Badge className="bg-white/20 text-white border-white/30">برنامج الولاء</Badge>
          </div>

          <div className={`${currentTier.textColor}`}>
            <div className="text-sm opacity-80 mb-1">رصيد النقاط</div>
            <div className="text-5xl font-black tracking-tight flex items-baseline gap-2">
              {data.balance.toLocaleString("ar-EG")}
              <Sparkles className="w-6 h-6" />
            </div>
            <div className="text-xs opacity-70 mt-2">إجمالي المكتسب: {data.lifetime_earned.toLocaleString("ar-EG")} نقطة</div>
          </div>

          {nextTier && (
            <div className="mt-5">
              <div className={`flex items-center justify-between text-xs ${currentTier.textColor} opacity-90 mb-1.5`}>
                <span>للوصول للمستوى {nextTier.label}</span>
                <span className="font-bold">{pointsToNext.toLocaleString("ar-EG")} نقطة</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                  className="h-full bg-white rounded-full"
                />
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* How to earn */}
      <Card className="p-5">
        <h3 className="font-bold mb-3 flex items-center gap-2"><Gift className="w-4 h-4 text-primary" /> كيف تكسب النقاط؟</h3>
        <ul className="text-sm space-y-2 text-muted-foreground">
          <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> كل 1 جنيه تشتريه = 1 نقطة (عند تسليم الطلب)</li>
          <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 5,000 نقطة = مستوى فضي (خصومات حصرية)</li>
          <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 20,000 نقطة = مستوى ذهبي (توصيل مجاني + أولوية)</li>
          <li className="flex items-center gap-2"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> 50,000 نقطة = مستوى بلاتيني (مزايا VIP كاملة)</li>
        </ul>
      </Card>

      {/* History */}
      {txs.length > 0 && (
        <Card className="p-5">
          <h3 className="font-bold mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> آخر العمليات</h3>
          <div className="space-y-2">
            {txs.map(t => (
              <div key={t.id} className="flex items-center justify-between text-sm py-2 border-b last:border-0">
                <div>
                  <div className="font-medium">{t.reason ?? (t.type === "earn" ? "نقاط مكتسبة" : "استبدال")}</div>
                  <div className="text-xs text-muted-foreground">{new Date(t.created_at).toLocaleDateString("ar-EG")}</div>
                </div>
                <span className={`font-bold ${t.points > 0 ? "text-emerald-600" : "text-rose-600"}`}>
                  {t.points > 0 ? "+" : ""}{t.points.toLocaleString("ar-EG")}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

export default LoyaltyCard;
