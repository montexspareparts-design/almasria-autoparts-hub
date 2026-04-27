import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  ArrowLeft,
  RefreshCw,
  Search,
  Sparkles,
  Heart,
  FileText,
  PhoneCall,
  XCircle,
  Trophy,
  Phone,
  MessageCircle,
  ExternalLink,
  Eye,
  Clock,
} from "lucide-react";
import { cn } from "@/lib/utils";
import VisitorPipelineControl, { type PipelineStage } from "@/components/staff/VisitorPipelineControl";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

/**
 * NewVisitorsWorkflowPage
 *
 * صفحة موحّدة تعرض الزوار الجدد اليوم/أمس مع الحالة الحالية في الـ pipeline
 * (جديد / مهتم / عرض سعر مرسل / تم التواصل / غير مهتم / تم البيع) لكل زائر
 * مسجَّل، وتسمح بتحديث الحالة مباشرة من نفس الصف عبر VisitorPipelineControl.
 *
 * البيانات تأتي من:
 *  - profiles               : الزوار المسجّلون
 *  - customer_sessions      : لقياس "اليوم/أمس" والصفحات المُشاهَدة
 *  - visitor_pipeline_status: المرحلة الحالية لكل زائر (إن وجدت)
 *  - orders                 : لتحديد ما إذا كان الزائر تحوّل لطلب فعلي
 */

type Tab = "today" | "yesterday" | "this_week";
type StageFilter = PipelineStage | "all" | "untracked";

interface VisitorRow {
  userId: string;
  name: string | null;
  phone: string | null;
  email: string | null;
  firstSeenAt: string;
  lastSeenAt: string;
  pageViews: number;
  stage: PipelineStage | null; // null => no record yet => "new"
  hasOrder: boolean;
}

const STAGE_META: Record<PipelineStage, { label: string; icon: typeof Sparkles; cls: string }> = {
  new:            { label: "جديد",            icon: Sparkles,  cls: "bg-blue-100 text-blue-700 border-blue-200" },
  interested:     { label: "مهتم",            icon: Heart,     cls: "bg-pink-100 text-pink-700 border-pink-200" },
  quote_sent:     { label: "عرض سعر مرسل",    icon: FileText,  cls: "bg-amber-100 text-amber-800 border-amber-200" },
  contacted:      { label: "تم التواصل",      icon: PhoneCall, cls: "bg-violet-100 text-violet-700 border-violet-200" },
  not_interested: { label: "غير مهتم",        icon: XCircle,   cls: "bg-muted text-muted-foreground border-border" },
  won:            { label: "تم البيع",        icon: Trophy,    cls: "bg-emerald-100 text-emerald-700 border-emerald-200" },
};

export default function NewVisitorsWorkflowPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("today");
  const [stageFilter, setStageFilter] = useState<StageFilter>("all");
  const [search, setSearch] = useState("");
  const [rows, setRows] = useState<VisitorRow[]>([]);
  const [loading, setLoading] = useState(true);

  const dateRange = useMemo(() => {
    const now = new Date();
    const startOfToday = new Date(now); startOfToday.setHours(0, 0, 0, 0);
    if (tab === "today") {
      return { from: startOfToday, to: new Date(startOfToday.getTime() + 86_400_000) };
    }
    if (tab === "yesterday") {
      const y = new Date(startOfToday.getTime() - 86_400_000);
      return { from: y, to: startOfToday };
    }
    // this_week — last 7 days
    return { from: new Date(startOfToday.getTime() - 6 * 86_400_000), to: new Date(startOfToday.getTime() + 86_400_000) };
  }, [tab]);

  const loadVisitors = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // 1) Sessions in window — gives us new/returning user IDs + page views
      const { data: sessions } = await supabase
        .from("customer_sessions")
        .select("user_id, page_views, last_seen_at, session_date")
        .gte("last_seen_at", dateRange.from.toISOString())
        .lt("last_seen_at", dateRange.to.toISOString())
        .order("last_seen_at", { ascending: false })
        .limit(500);

      const userIds = Array.from(new Set((sessions || []).map((s) => s.user_id).filter(Boolean)));
      if (userIds.length === 0) {
        setRows([]);
        return;
      }

      const [profilesRes, stagesRes, ordersRes] = await Promise.all([
        supabase.from("profiles").select("user_id, full_name, phone, email").in("user_id", userIds),
        supabase.from("visitor_pipeline_status").select("customer_user_id, stage, updated_at").in("customer_user_id", userIds),
        supabase.from("orders").select("user_id").in("user_id", userIds),
      ]);

      const profileMap = new Map((profilesRes.data || []).map((p) => [p.user_id, p]));
      const stageMap = new Map(
        (stagesRes.data || []).map((s) => [s.customer_user_id, s.stage as PipelineStage])
      );
      const orderSet = new Set((ordersRes.data || []).map((o) => o.user_id));

      // Aggregate per user (a user may have multiple session rows in window)
      const grouped = new Map<string, { firstSeenAt: string; lastSeenAt: string; pageViews: number }>();
      for (const s of sessions || []) {
        if (!s.user_id) continue;
        const cur = grouped.get(s.user_id);
        if (!cur) {
          grouped.set(s.user_id, {
            firstSeenAt: s.last_seen_at,
            lastSeenAt: s.last_seen_at,
            pageViews: s.page_views || 0,
          });
        } else {
          cur.pageViews += s.page_views || 0;
          if (new Date(s.last_seen_at) > new Date(cur.lastSeenAt)) cur.lastSeenAt = s.last_seen_at;
          if (new Date(s.last_seen_at) < new Date(cur.firstSeenAt)) cur.firstSeenAt = s.last_seen_at;
        }
      }

      const built: VisitorRow[] = userIds.map((uid) => {
        const p = profileMap.get(uid);
        const g = grouped.get(uid)!;
        return {
          userId: uid,
          name: p?.full_name || null,
          phone: p?.phone || null,
          email: p?.email || null,
          firstSeenAt: g.firstSeenAt,
          lastSeenAt: g.lastSeenAt,
          pageViews: g.pageViews,
          stage: stageMap.get(uid) || null,
          hasOrder: orderSet.has(uid),
        };
      });

      built.sort((a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime());
      setRows(built);
    } catch (e) {
      console.error("[NewVisitorsWorkflowPage] load error", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVisitors();
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [tab, user?.id]);

  // Live update — when a child VisitorPipelineControl saves, refetch this row
  const handleStageChanged = (userId: string, newStage: PipelineStage) => {
    setRows((prev) => prev.map((r) => (r.userId === userId ? { ...r, stage: newStage } : r)));
  };

  const filtered = useMemo(() => {
    let list = rows;
    if (stageFilter === "untracked") list = list.filter((r) => r.stage === null);
    else if (stageFilter !== "all") list = list.filter((r) => r.stage === stageFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) =>
        (r.name || "").toLowerCase().includes(q) ||
        (r.phone || "").toLowerCase().includes(q) ||
        (r.email || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [rows, stageFilter, search]);

  // Stage distribution chips
  const stageCounts = useMemo(() => {
    const counts: Record<StageFilter, number> = {
      all: rows.length, untracked: 0,
      new: 0, interested: 0, quote_sent: 0, contacted: 0, not_interested: 0, won: 0,
    };
    for (const r of rows) {
      if (!r.stage) counts.untracked += 1;
      else counts[r.stage] = (counts[r.stage] || 0) + 1;
    }
    return counts;
  }, [rows]);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="sticky top-0 z-20 bg-background border-b">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <Button size="sm" variant="ghost" onClick={() => navigate(-1)}>
              <ArrowLeft className="w-4 h-4 ml-1" /> رجوع
            </Button>
            <div>
              <h1 className="font-bold text-base">الزوار الجدد — حالة المتابعة</h1>
              <p className="text-xs text-muted-foreground">
                {filtered.length} زائر · مرحلة الـ workflow لكل زائر مع تحديث مباشر
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {(["today", "yesterday", "this_week"] as Tab[]).map((t) => (
              <Button
                key={t}
                size="sm"
                variant={tab === t ? "default" : "outline"}
                onClick={() => setTab(t)}
              >
                {t === "today" ? "اليوم" : t === "yesterday" ? "أمس" : "آخر 7 أيام"}
              </Button>
            ))}
            <Button size="sm" variant="outline" onClick={loadVisitors} disabled={loading}>
              <RefreshCw className={cn("w-4 h-4", loading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-5 space-y-4">
        {/* Filters */}
        <Card className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Search className="w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="بحث بالاسم أو الموبايل أو الإيميل..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 text-sm"
            />
          </div>
          <div className="flex items-center gap-1.5 flex-wrap">
            {(
              [
                { key: "all" as StageFilter,        label: "الكل",       cls: "bg-primary/10 text-primary border-primary/30",     activeCls: "bg-primary text-primary-foreground border-primary" },
                { key: "untracked" as StageFilter,  label: "بدون متابعة", cls: "bg-slate-100 text-slate-700 border-slate-200",     activeCls: "bg-slate-700 text-white border-slate-700" },
                { key: "new" as StageFilter,        label: "جديد",       cls: "bg-blue-50 text-blue-700 border-blue-200",         activeCls: "bg-blue-600 text-white border-blue-600" },
                { key: "interested" as StageFilter, label: "مهتم",       cls: "bg-pink-50 text-pink-700 border-pink-200",         activeCls: "bg-pink-600 text-white border-pink-600" },
                { key: "quote_sent" as StageFilter, label: "عرض مرسل",   cls: "bg-amber-50 text-amber-800 border-amber-200",      activeCls: "bg-amber-600 text-white border-amber-600" },
                { key: "contacted" as StageFilter,  label: "تم التواصل", cls: "bg-violet-50 text-violet-700 border-violet-200",   activeCls: "bg-violet-600 text-white border-violet-600" },
                { key: "won" as StageFilter,        label: "تم البيع",   cls: "bg-emerald-50 text-emerald-700 border-emerald-200",activeCls: "bg-emerald-600 text-white border-emerald-600" },
                { key: "not_interested" as StageFilter, label: "غير مهتم", cls: "bg-muted text-muted-foreground border-border",   activeCls: "bg-slate-500 text-white border-slate-500" },
              ]
            ).map((c) => {
              const active = stageFilter === c.key;
              const count = stageCounts[c.key] || 0;
              const dim = count === 0 && c.key !== "all";
              return (
                <button
                  key={c.key}
                  onClick={() => setStageFilter(c.key)}
                  disabled={dim}
                  className={cn(
                    "inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-1 rounded-full border transition-all",
                    active ? c.activeCls : c.cls,
                    dim && "opacity-40 cursor-not-allowed",
                    !active && !dim && "hover:scale-105"
                  )}
                >
                  <span>{c.label}</span>
                  <span className={cn("min-w-[18px] text-center text-[10px] px-1 rounded-full", active ? "bg-white/25" : "bg-background/70 border border-border/50")}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </Card>

        {/* List */}
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 w-full" />)}
          </div>
        ) : filtered.length === 0 ? (
          <Card className="p-10 text-center text-sm text-muted-foreground">
            لا يوجد زوار مطابقون للفلتر الحالي.
          </Card>
        ) : (
          <ul className="space-y-2">
            {filtered.map((r) => {
              const stage: PipelineStage = r.stage || "new";
              const meta = STAGE_META[stage];
              const StageIcon = meta.icon;
              const isUntracked = r.stage === null;
              return (
                <li key={r.userId}>
                  <Card className="p-3 hover:bg-accent/30 transition-colors">
                    <div className="flex items-start gap-3 flex-wrap md:flex-nowrap">
                      {/* Identity column */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-semibold text-sm truncate">
                            {r.name || "زائر بدون اسم"}
                          </span>
                          <Badge variant="outline" className={cn("text-[10px] gap-1", meta.cls)}>
                            <StageIcon className="w-3 h-3" />
                            {meta.label}
                          </Badge>
                          {isUntracked && (
                            <Badge variant="outline" className="text-[10px] bg-slate-100 text-slate-700 border-slate-200">
                              لم تُسجّل بعد
                            </Badge>
                          )}
                          {r.hasOrder && (
                            <Badge variant="outline" className="text-[10px] bg-emerald-100 text-emerald-700 border-emerald-200">
                              ✓ تحوّل لطلب
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-3 flex-wrap">
                          {r.phone && <span dir="ltr">{r.phone}</span>}
                          {r.email && <span className="truncate">{r.email}</span>}
                          <span className="inline-flex items-center gap-1">
                            <Eye className="w-3 h-3" /> {r.pageViews} مشاهدة
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            آخر نشاط منذ {formatDistanceToNow(new Date(r.lastSeenAt), { locale: ar, addSuffix: false })}
                          </span>
                        </div>
                      </div>

                      {/* Quick actions */}
                      <div className="flex items-center gap-1 flex-wrap">
                        {r.phone && (
                          <>
                            <a href={`tel:${r.phone}`}>
                              <Button size="sm" variant="outline" className="h-7 text-xs">
                                <Phone className="w-3 h-3 ml-1" /> اتصال
                              </Button>
                            </a>
                            <a
                              href={`https://wa.me/${r.phone.replace(/^0/, "20").replace(/\D/g, "")}`}
                              target="_blank" rel="noreferrer"
                            >
                              <Button size="sm" variant="outline" className="h-7 text-xs text-green-700">
                                <MessageCircle className="w-3 h-3 ml-1" /> واتساب
                              </Button>
                            </a>
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs"
                          onClick={() => navigate(`/admin/visitor/${r.userId}`)}
                        >
                          <ExternalLink className="w-3 h-3 ml-1" /> ملف الزائر
                        </Button>
                      </div>
                    </div>

                    {/* Pipeline control row — full inline workflow editor */}
                    <div className="mt-2 pt-2 border-t border-border/50">
                      <VisitorPipelineControl
                        userId={r.userId}
                        sessionKey={null}
                        phone={r.phone}
                        fullName={r.name}
                        onChange={(s) => handleStageChanged(r.userId, s)}
                      />
                    </div>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
