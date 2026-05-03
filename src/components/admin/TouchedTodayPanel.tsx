/**
 * TouchedTodayPanel — قائمة العملاء اللي اتعمل عليهم إجراء اليوم (المخفيين من باقي الشاشات)
 *
 * يستعمل نفس useTouchedTodayUserIds (المصدر الموحّد لقاعدة "تمت اليوم")
 * ويعرض لكل عميل: الاسم، الموبايل، آخر إجراء + الموظف + الوقت + الملاحظة.
 * فيه فلتر تبويبات حسب نوع الإجراء (الكل / اتصال / واتساب / لم يردّ / زيارة / ملاحظة)
 * + بحث + روابط سريعة (ملف العميل، اتصال، واتساب).
 *
 * Realtime: يحدّث القائمة فوراً مع كل إجراء جديد عبر useTouchedTodayUserIds.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Phone, MessageCircle, Eye, Search, Loader2, CheckCircle2,
  Clock, Users, RefreshCw, Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useTouchedTodayUserIds } from "@/hooks/useTouchedTodayUserIds";
import { cairoDayBoundsUTC, cairoToday } from "@/lib/handledTasks";

type CommType = "phone" | "whatsapp" | "no_answer" | "visit" | "note";
type FilterKey = "all" | CommType;

interface TouchedRow {
  user_id: string;
  name: string | null;
  phone: string | null;
  last_action_at: string;
  last_action_type: CommType | "task" | null;
  last_action_by: string | null;
  last_action_note: string | null;
  total_actions: number;
  staff_count: number;
}

const TYPE_META: Record<CommType, { label: string; icon: string; cls: string; activeCls: string }> = {
  phone:     { label: "اتصال",   icon: "📞", cls: "bg-blue-50 dark:bg-blue-950/30 border-blue-300/50 text-blue-800 dark:text-blue-300",       activeCls: "bg-blue-600 border-blue-600 text-white" },
  whatsapp:  { label: "واتساب",  icon: "💬", cls: "bg-green-50 dark:bg-green-950/30 border-green-300/50 text-green-800 dark:text-green-300",  activeCls: "bg-[#25D366] border-[#25D366] text-white" },
  no_answer: { label: "لم يردّ", icon: "🚫", cls: "bg-red-50 dark:bg-red-950/30 border-red-300/50 text-red-800 dark:text-red-300",            activeCls: "bg-red-600 border-red-600 text-white" },
  visit:     { label: "زيارة",   icon: "🏬", cls: "bg-purple-50 dark:bg-purple-950/30 border-purple-300/50 text-purple-800 dark:text-purple-300", activeCls: "bg-purple-600 border-purple-600 text-white" },
  note:      { label: "ملاحظة",  icon: "📝", cls: "bg-amber-50 dark:bg-amber-950/30 border-amber-300/50 text-amber-800 dark:text-amber-300",   activeCls: "bg-amber-600 border-amber-600 text-white" },
};

const normalizeEgyptianPhone = (raw: string | null | undefined) => {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("20") && digits.length === 12) return digits;
  if (digits.startsWith("01") && digits.length === 11) return `20${digits.slice(1)}`;
  return digits;
};

const fmtSince = (iso: string) => {
  const min = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (min < 1) return "الآن";
  if (min < 60) return `من ${min}د`;
  if (min < 1440) return `من ${Math.floor(min / 60)}س`;
  return `من ${Math.floor(min / 1440)} يوم`;
};

export default function TouchedTodayPanel() {
  const { touchedIds, refresh } = useTouchedTodayUserIds();
  const [rows, setRows] = useState<TouchedRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

  const fetchRows = async () => {
    const { startMs } = cairoDayBoundsUTC(cairoToday());
    const sinceIso = new Date(startMs).toISOString();
    const ids = Array.from(touchedIds);

    if (ids.length === 0) {
      setRows([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    // 1) كل تواصلات اليوم لهؤلاء العملاء
    const { data: comms } = await supabase
      .from("customer_communications")
      .select("customer_user_id, comm_type, note, staff_user_id, created_at")
      .in("customer_user_id", ids)
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false });

    // 2) أسماء الموظفين
    const staffIds = Array.from(
      new Set((comms || []).map((c: any) => c.staff_user_id).filter(Boolean)),
    );
    const staffNameMap = new Map<string, string>();
    if (staffIds.length > 0) {
      const { data: staffProfs } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", staffIds);
      (staffProfs || []).forEach((p: any) => {
        if (p.full_name) staffNameMap.set(p.user_id, p.full_name);
      });
    }

    // 3) ملفات العملاء (اسم + موبايل)
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, phone")
      .in("user_id", ids);
    const profMap = new Map<string, any>(
      (profiles || []).map((p: any) => [p.user_id, p]),
    );

    // 4) دمج: لكل عميل ناخد آخر تواصل + إجمالي الإجراءات + عدد موظفين متفرّدين
    const byUser = new Map<string, TouchedRow>();
    (comms || []).forEach((c: any) => {
      const uid = c.customer_user_id;
      if (!uid) return;
      const prof = profMap.get(uid);
      const existing = byUser.get(uid);
      if (!existing) {
        byUser.set(uid, {
          user_id: uid,
          name: prof?.full_name || null,
          phone: prof?.phone || null,
          last_action_at: c.created_at,
          last_action_type: (c.comm_type as CommType) || null,
          last_action_by: c.staff_user_id ? (staffNameMap.get(c.staff_user_id) || null) : null,
          last_action_note: c.note || null,
          total_actions: 1,
          staff_count: c.staff_user_id ? 1 : 0,
        });
      } else {
        existing.total_actions++;
      }
    });

    // عدّاد الموظفين المتفرّدين لكل عميل
    const staffByUser = new Map<string, Set<string>>();
    (comms || []).forEach((c: any) => {
      if (!c.customer_user_id || !c.staff_user_id) return;
      if (!staffByUser.has(c.customer_user_id)) staffByUser.set(c.customer_user_id, new Set());
      staffByUser.get(c.customer_user_id)!.add(c.staff_user_id);
    });
    staffByUser.forEach((s, uid) => {
      const r = byUser.get(uid);
      if (r) r.staff_count = s.size;
    });

    // 5) لو فيه عميل في touchedIds جاي من staff_task_handling فقط (مفيش customer_communications اليوم)
    //    نضيفه بكارت أساسي بدون "آخر إجراء" تفصيلي.
    ids.forEach((uid) => {
      if (byUser.has(uid)) return;
      const prof = profMap.get(uid);
      byUser.set(uid, {
        user_id: uid,
        name: prof?.full_name || null,
        phone: prof?.phone || null,
        last_action_at: sinceIso,
        last_action_type: "task",
        last_action_by: null,
        last_action_note: null,
        total_actions: 0,
        staff_count: 0,
      });
    });

    const arr = Array.from(byUser.values()).sort(
      (a, b) => new Date(b.last_action_at).getTime() - new Date(a.last_action_at).getTime(),
    );
    setRows(arr);
    setLoading(false);
    setRefreshing(false);
  };

  // كلما اتغيّر الـ touchedIds (أي إجراء جديد لحظي) — نعيد جلب التفاصيل
  useEffect(() => {
    fetchRows();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [touchedIds]);

  const counts = useMemo(() => {
    const c: Record<FilterKey, number> = { all: rows.length, phone: 0, whatsapp: 0, no_answer: 0, visit: 0, note: 0 };
    rows.forEach((r) => {
      if (r.last_action_type && r.last_action_type !== "task") {
        c[r.last_action_type as CommType]++;
      }
    });
    return c;
  }, [rows]);

  const filtered = useMemo(() => {
    let list = rows;
    if (activeFilter !== "all") {
      list = list.filter((r) => r.last_action_type === activeFilter);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          (r.name || "").toLowerCase().includes(q) ||
          (r.phone || "").includes(q) ||
          (r.last_action_by || "").toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, activeFilter, search]);

  const FILTERS: Array<{ key: FilterKey; label: string; icon: string; activeCls: string }> = [
    { key: "all",       label: "الكل",     icon: "📋", activeCls: "bg-emerald-600 border-emerald-600 text-white" },
    { key: "phone",     label: TYPE_META.phone.label,     icon: TYPE_META.phone.icon,     activeCls: TYPE_META.phone.activeCls },
    { key: "whatsapp",  label: TYPE_META.whatsapp.label,  icon: TYPE_META.whatsapp.icon,  activeCls: TYPE_META.whatsapp.activeCls },
    { key: "no_answer", label: TYPE_META.no_answer.label, icon: TYPE_META.no_answer.icon, activeCls: TYPE_META.no_answer.activeCls },
    { key: "visit",     label: TYPE_META.visit.label,     icon: TYPE_META.visit.icon,     activeCls: TYPE_META.visit.activeCls },
    { key: "note",      label: TYPE_META.note.label,      icon: TYPE_META.note.icon,      activeCls: TYPE_META.note.activeCls },
  ];

  return (
    <div className="space-y-3" dir="rtl">
      {/* Header strip */}
      <div className="flex items-center justify-between gap-3 flex-wrap bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/40 rounded-lg p-3">
        <div className="flex items-center gap-2 text-[12px] text-emerald-900 dark:text-emerald-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <div>
            <span className="font-bold">العملاء اللي اتعمل عليهم إجراء اليوم</span>
            <span className="opacity-80"> — مخفيين تلقائياً من «الزوار النشطين» و«بحثوا اليوم» و«التنبيهات السلوكية» لمنع تكرار الشغل.</span>
          </div>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => { setRefreshing(true); refresh().then(fetchRows); }}
          disabled={refreshing}
          className="gap-1.5 shrink-0"
        >
          {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          تحديث
        </Button>
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 flex-wrap bg-muted/30 p-1.5 rounded-lg border border-border/40">
        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-muted-foreground px-1.5">
          <Filter className="w-3.5 h-3.5" />
          نوع الإجراء:
        </span>
        {FILTERS.map((t) => {
          const active = activeFilter === t.key;
          const count = counts[t.key] || 0;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveFilter(t.key)}
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-[11px] font-bold border transition",
                active ? cn(t.activeCls, "shadow-sm") : "bg-background border-border text-foreground hover:bg-muted",
              )}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
              <Badge
                variant={active ? "secondary" : "outline"}
                className={cn("h-4 px-1 text-[10px]", active && "bg-white/25 text-white border-0")}
              >
                {count}
              </Badge>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="بحث بالاسم، الموبايل، أو الموظف..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ps-9"
        />
      </div>

      {/* List */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            جاري التحميل...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <Users className="w-10 h-10 opacity-40" />
            <p className="text-sm">
              {rows.length === 0
                ? "لسه مفيش أي إجراءات اليوم — لما الموظفين يبدأوا اتصالات وواتساب هتلاقيهم هنا."
                : "مفيش عملاء بنوع الإجراء ده."}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map((r) => {
              const phoneNorm = normalizeEgyptianPhone(r.phone);
              const wpUrl = phoneNorm
                ? `https://wa.me/${phoneNorm}?text=${encodeURIComponent("السلام عليكم 👋 معك المصرية جروب — تابعنا معاك بخصوص استفسارك.")}`
                : null;
              const meta = r.last_action_type && r.last_action_type !== "task"
                ? TYPE_META[r.last_action_type as CommType]
                : null;

              return (
                <div key={r.user_id} className="p-4 hover:bg-muted/30 transition">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-[220px]">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <h3 className="font-bold text-sm text-foreground">
                          {r.name || "عميل بدون اسم"}
                        </h3>
                        {r.staff_count > 1 && (
                          <Badge variant="secondary" className="text-[10px] h-5 gap-1 bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300">
                            <Users className="w-3 h-3" />
                            {r.staff_count} موظفين
                          </Badge>
                        )}
                        {r.total_actions > 1 && (
                          <Badge variant="outline" className="text-[10px] h-5">
                            {r.total_actions} إجراءات
                          </Badge>
                        )}
                      </div>

                      {meta && (
                        <div className={cn("text-[11px] flex items-center gap-1.5 mb-1.5 p-1.5 rounded border flex-wrap", meta.cls)}>
                          <span>{meta.icon}</span>
                          <span className="font-bold">آخر إجراء: {meta.label}</span>
                          {r.last_action_by && (
                            <>
                              <span className="opacity-60">·</span>
                              <span>بواسطة <span className="font-bold">{r.last_action_by}</span></span>
                            </>
                          )}
                          <span className="opacity-60">·</span>
                          <span className="tabular-nums inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {fmtSince(r.last_action_at)}
                          </span>
                          {r.last_action_note && (
                            <span className="truncate opacity-80 max-w-[280px]">— {r.last_action_note}</span>
                          )}
                        </div>
                      )}

                      {r.phone && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5">
                          <Phone className="w-3 h-3" />
                          <span className="font-mono" dir="ltr">{r.phone}</span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap">
                      {r.phone && (
                        <a
                          href={`tel:${r.phone}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition"
                          title="اتصال"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          اتصال
                        </a>
                      )}
                      {wpUrl && (
                        <a
                          href={wpUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-bold bg-[#25D366] hover:bg-[#1ebe57] text-white transition"
                          title="واتساب"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          واتساب
                        </a>
                      )}
                      <Link
                        to={`/admin/visitor/${r.user_id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-bold bg-secondary hover:bg-secondary/80 text-secondary-foreground transition"
                        title="ملف العميل"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        الملف
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </div>
  );
}
