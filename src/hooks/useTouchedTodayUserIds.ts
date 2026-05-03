/**
 * useTouchedTodayUserIds — مصدر واحد للحقيقة عبر كل شاشات الموظفين/الإدارة
 *
 * يرجّع Set<user_id> لكل عميل اتعمل عليه إجراء اليوم (بتوقيت القاهرة) من أي موظف
 * في أي شاشة، عشان نخفيه من باقي الشاشات (الزوار النشطون، البحث اليوم، التنبيهات…)
 * ويظهر فقط في "متابعة العملاء" — منع تكرار الشغل.
 *
 * المصادر:
 *   1) customer_communications — أي اتصال/واتساب/ملاحظة/زيارة/لم-يردّ
 *   2) staff_task_handling     — أي إجراء على مهمة من ذكاء العملاء
 *
 * Realtime: يشترك في الجدولين ويحدّث الـ Set فوراً.
 */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { cairoDayBoundsUTC, cairoToday } from "@/lib/handledTasks";

export function useTouchedTodayUserIds(): {
  touchedIds: Set<string>;
  isReady: boolean;
  refresh: () => Promise<void>;
} {
  const [touchedIds, setTouchedIds] = useState<Set<string>>(new Set());
  const [isReady, setIsReady] = useState(false);

  const refresh = async () => {
    const { startMs } = cairoDayBoundsUTC(cairoToday());
    const sinceIso = new Date(startMs).toISOString();

    const [commsRes, handlingRes] = await Promise.all([
      supabase
        .from("customer_communications")
        .select("customer_user_id")
        .gte("created_at", sinceIso),
      supabase
        .from("staff_task_handling")
        .select("customer_user_id, action_at")
        .gte("action_at", sinceIso),
    ]);

    const next = new Set<string>();
    (commsRes.data || []).forEach((r: any) => {
      if (r.customer_user_id) next.add(r.customer_user_id);
    });
    (handlingRes.data || []).forEach((r: any) => {
      if (r.customer_user_id) next.add(r.customer_user_id);
    });
    setTouchedIds(next);
    setIsReady(true);
  };

  useEffect(() => {
    refresh();
    const ch = supabase
      .channel("touched_today_global")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "customer_communications" },
        (payload: any) => {
          const uid = payload.new?.customer_user_id;
          if (!uid) return;
          setTouchedIds((prev) => {
            if (prev.has(uid)) return prev;
            const next = new Set(prev);
            next.add(uid);
            return next;
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "staff_task_handling" },
        (payload: any) => {
          const uid = payload.new?.customer_user_id;
          if (!uid) return;
          setTouchedIds((prev) => {
            if (prev.has(uid)) return prev;
            const next = new Set(prev);
            next.add(uid);
            return next;
          });
        },
      )
      .subscribe();

    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { touchedIds, isReady, refresh };
}
