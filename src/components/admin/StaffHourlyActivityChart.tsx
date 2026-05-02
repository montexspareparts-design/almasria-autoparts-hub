import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

interface Props { date: string }

interface HourRow { hour: number; event_count: number; unique_staff: number }

export default function StaffHourlyActivityChart({ date }: Props) {
  const [hourly, setHourly] = useState<HourRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase.rpc("get_staff_activity_dashboard", { target_date: date });
        if (error) throw error;
        if (!cancelled) {
          const h = (data as any)?.hourly ?? [];
          setHourly(h as HourRow[]);
        }
      } catch (e) {
        console.error("hourly activity error", e);
        if (!cancelled) setHourly([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [date]);

  const peak = useMemo(() => {
    if (!hourly.length) return null;
    return hourly.reduce((m, h) => (h.event_count > (m?.event_count ?? -1) ? h : m), hourly[0]);
  }, [hourly]);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base">توزيع النشاط بالساعة</CardTitle>
          {peak && peak.event_count > 0 && (
            <Badge variant="outline" className="bg-amber-50 border-amber-300 text-amber-700">
              ⚡ ذروة الساعة {peak.hour}:00 ({peak.event_count} حركة)
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-[240px] w-full" />
        ) : (
          <div className="h-[240px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={hourly} margin={{ top: 6, right: 12, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="hour"
                  tickFormatter={(v) => `${v}`}
                  tick={{ fontSize: 11 }}
                  stroke="hsl(var(--muted-foreground))"
                />
                <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  labelFormatter={(v) => `الساعة ${v}:00`}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(value: any, name: string) => [
                    value,
                    name === "event_count" ? "حركات" : "موظفين",
                  ]}
                />
                <Legend
                  formatter={(v) => (v === "event_count" ? "عدد الحركات" : "الموظفين النشطين")}
                  wrapperStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="event_count" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
                <Bar dataKey="unique_staff" fill="hsl(var(--accent))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
