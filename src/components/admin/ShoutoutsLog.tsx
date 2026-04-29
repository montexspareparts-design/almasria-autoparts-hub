import { useEffect, useState } from "react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Heart, Loader2, ArrowLeft } from "lucide-react";

type Row = {
  id: string;
  user_id: string;
  shoutout_user_id: string;
  shoutout_reason: string | null;
  report_date: string;
  created_at: string;
  sender_name?: string;
  recipient_name?: string;
};

export default function ShoutoutsLog({ from, to, label }: { from: string; to: string; label: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("reporter_daily_reports")
        .select("id, user_id, shoutout_user_id, shoutout_reason, report_date, created_at")
        .gte("report_date", from)
        .lte("report_date", to)
        .not("shoutout_user_id", "is", null)
        .order("report_date", { ascending: false });

      const list = (data ?? []) as Row[];
      const ids = Array.from(new Set(list.flatMap((r) => [r.user_id, r.shoutout_user_id]).filter(Boolean)));
      let nameMap: Record<string, string> = {};
      if (ids.length) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("user_id, full_name")
          .in("user_id", ids);
        (profs ?? []).forEach((p: any) => { nameMap[p.user_id] = p.full_name || "موظف"; });
      }
      setRows(list.map((r) => ({
        ...r,
        sender_name: nameMap[r.user_id] || "موظف",
        recipient_name: nameMap[r.shoutout_user_id] || "موظف",
      })));
      setLoading(false);
    })();
  }, [from, to]);

  // Tally: who got most shoutouts
  const tally = rows.reduce<Record<string, { name: string; count: number }>>((acc, r) => {
    const k = r.shoutout_user_id;
    acc[k] = acc[k] || { name: r.recipient_name || "موظف", count: 0 };
    acc[k].count += 1;
    return acc;
  }, {});
  const topRecipients = Object.values(tally).sort((a, b) => b.count - a.count).slice(0, 3);

  return (
    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
      <Card className="p-4 bg-gradient-to-br from-pink-50 to-rose-50 dark:from-pink-950/20 dark:to-rose-950/20 border-pink-200 dark:border-pink-900">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-pink-500/15 grid place-items-center">
              <Heart className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <h3 className="font-extrabold">سجل الشكر بين الزملاء</h3>
              <p className="text-xs text-muted-foreground">من شكر مين ولـيه — خلال {label}</p>
            </div>
          </div>
          <Badge className="bg-pink-600">{rows.length} رسالة شكر</Badge>
        </div>

        {topRecipients.length > 0 && (
          <div className="mt-3 flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground">الأكثر شُكراً:</span>
            {topRecipients.map((t, i) => (
              <Badge key={i} variant="outline" className="bg-white dark:bg-pink-950/40">
                {["🥇","🥈","🥉"][i]} {t.name} · {t.count}
              </Badge>
            ))}
          </div>
        )}
      </Card>

      {loading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin mr-2" /> جاري التحميل...
        </div>
      ) : rows.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <Heart className="w-10 h-10 mx-auto mb-2 opacity-40" />
          مفيش رسائل شكر في الفترة دي.
        </Card>
      ) : (
        <div className="space-y-2">
          {rows.map((r) => (
            <Card key={r.id} className="p-3 hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="secondary" className="font-semibold">{r.sender_name}</Badge>
                <ArrowLeft className="w-4 h-4 text-pink-500" />
                <Badge className="bg-pink-600">{r.recipient_name}</Badge>
                <span className="text-[11px] text-muted-foreground ml-auto">
                  {format(new Date(r.report_date), "EEEE d MMMM", { locale: ar })}
                </span>
              </div>
              {r.shoutout_reason && (
                <p className="mt-2 text-sm bg-pink-50 dark:bg-pink-950/20 rounded-lg p-2 border border-pink-100 dark:border-pink-900/50">
                  💬 {r.shoutout_reason}
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </motion.div>
  );
}
