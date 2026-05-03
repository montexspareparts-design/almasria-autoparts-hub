/**
 * ActiveVisitorsPage — قائمة الزوار النشطين الآن (آخر 30 دقيقة).
 *
 * يعرض لكل زائر:
 *   - الاسم + رقم الموبايل (لو متاح)
 *   - وقت أول دخول (entry_at) ووقت آخر تفاعل (last_seen_at)
 *   - مدة الجلسة + عدد الصفحات
 *   - آخر صفحة تم تصفحها (path + title)
 *   - أزرار تواصل سريع: اتصال، واتساب، فتح ملف الزائر
 *
 * Polling كل 30 ثانية لإبقاء القائمة محدّثة.
 *
 * مصادر البيانات:
 *   - customer_sessions (last_seen_at >= now() - 30m)
 *   - page_visits (آخر زيارة لكل user_id لمعرفة آخر صفحة + entry time)
 *   - profiles (name + phone للقطاعي)
 *   - dealer_applications (phone للتجار - fallback)
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  Users, Phone, MessageCircle, Eye, RefreshCw, Search,
  Clock, MapPin, ArrowLeft, Activity, Loader2, AlertTriangle, Filter, CheckCircle2, PenLine,
} from "lucide-react";

type CommType = "phone" | "whatsapp" | "no_answer" | "visit" | "note";

interface ActiveVisitor {
  user_id: string;
  name: string | null;
  phone: string | null;
  entry_at: string;          // أول page_visit في الجلسة
  last_seen_at: string;      // من customer_sessions
  page_views: number;
  last_path: string | null;
  last_page_title: string | null;
  last_contacted_at: string | null; // آخر تواصل مسجّل لهذا الزائر
  last_contact_type: CommType | null; // نوع آخر إجراء
  last_contact_by: string | null;     // اسم الموظف اللي عمل آخر إجراء
  last_contact_note: string | null;   // ملاحظة آخر إجراء
  has_open_reminder: boolean;       // عنده تذكير معلّق غير منفّذ
}

// أكبر نافذة زمنية ممكن نعرضها — نجلب البيانات لها مرة واحدة ونفلتر عميل-جانب.
// وُسّعت إلى 7 أيام لدعم فلاتر "أمس" و"آخر 7 أيام".
const MAX_WINDOW_HOURS = 24 * 7;
// عتبة "متأخر": زائر نشط ولم يُتواصل معه خلال آخر N ساعات (افتراضي 2 ساعة)
const OVERDUE_HOURS = 2;

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });

const fmtDuration = (fromIso: string, toIso: string) => {
  const ms = new Date(toIso).getTime() - new Date(fromIso).getTime();
  const min = Math.max(0, Math.round(ms / 60000));
  if (min < 1) return "أقل من دقيقة";
  if (min < 60) return `${min} دقيقة`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return `${h}س ${m}د`;
};

const fmtSinceLast = (iso: string) => {
  const sec = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (sec < 60) return `نشط منذ ${sec}ث`;
  const min = Math.floor(sec / 60);
  return `نشط منذ ${min}د`;
};

const normalizeEgyptianPhone = (raw: string | null | undefined) => {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("20") && digits.length === 12) return digits;
  if (digits.startsWith("01") && digits.length === 11) return `20${digits.slice(1)}`;
  return digits;
};

export default function ActiveVisitorsPage() {
  const { toast } = useToast();
  const [visitors, setVisitors] = useState<ActiveVisitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");
  // فلتر "خلال X" — يحدد نافذة آخر نشاط للزائر (30د، 1س، 3س، 6س، 24س، أمس، 7 أيام)
  const [hoursFilter, setHoursFilter] = useState<"30m" | "1h" | "3h" | "6h" | "24h" | "yesterday" | "7d" | "all">("30m");
  // فلتر "متأخر" — يعرض فقط الزوار النشطين اللي مفيش معاهم تواصل في آخر OVERDUE_HOURS ساعة
  const [overdueOnly, setOverdueOnly] = useState(false);

  // Dialog لتسجيل إجراء التواصل من نفس الكارت (يبدأ تأثير fade فور الحفظ)
  const [actionFor, setActionFor] = useState<ActiveVisitor | null>(null);
  const [actionType, setActionType] = useState<"phone" | "whatsapp" | "no_answer" | "visit" | "note">("phone");
  const [actionNote, setActionNote] = useState("");
  const [savingAction, setSavingAction] = useState(false);
  // user_ids تم تسجيل إجراء لها للتو في هذه الجلسة — لإظهار تأثير "بهتان اللون"
  const [recentlyHandled, setRecentlyHandled] = useState<Set<string>>(new Set());

  const fetchActive = async () => {
    // نافذة الجلب تتوسّع لو المستخدم اختار "كل الأيام" (حتى 90 يوم) عشان يشوف كل الزوار
    const windowHours = hoursFilter === "all" ? 24 * 90 : MAX_WINDOW_HOURS;
    const since = new Date(Date.now() - windowHours * 60 * 60 * 1000).toISOString();

    // 1) جلسات نشطة آخر 24 ساعة
    const { data: sessions, error } = await supabase
      .from("customer_sessions")
      .select("user_id, last_seen_at, page_views")
      .gte("last_seen_at", since)
      .order("last_seen_at", { ascending: false });

    if (error) {
      console.error("[ActiveVisitors] sessions", error);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    // dedupe بأحدث جلسة لكل user_id
    const byUser = new Map<string, { last_seen_at: string; page_views: number }>();
    (sessions || []).forEach((s) => {
      if (!s.user_id) return;
      const existing = byUser.get(s.user_id);
      if (!existing || new Date(s.last_seen_at) > new Date(existing.last_seen_at)) {
        byUser.set(s.user_id, { last_seen_at: s.last_seen_at, page_views: s.page_views || 0 });
      }
    });
    const userIds = Array.from(byUser.keys());

    if (userIds.length === 0) {
      setVisitors([]);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    // 2) آخر/أول زيارة صفحة في النافذة لكل مستخدم
    const { data: pageHits } = await supabase
      .from("page_visits")
      .select("user_id, path, page_title, visited_at")
      .in("user_id", userIds)
      .gte("visited_at", since)
      .order("visited_at", { ascending: true });

    const entryMap = new Map<string, { entry_at: string; last_path: string | null; last_page_title: string | null; last_at: string }>();
    (pageHits || []).forEach((p) => {
      if (!p.user_id) return;
      const existing = entryMap.get(p.user_id);
      if (!existing) {
        entryMap.set(p.user_id, {
          entry_at: p.visited_at,
          last_path: p.path,
          last_page_title: p.page_title,
          last_at: p.visited_at,
        });
      } else if (new Date(p.visited_at) > new Date(existing.last_at)) {
        existing.last_path = p.path;
        existing.last_page_title = p.page_title;
        existing.last_at = p.visited_at;
      }
    });

    // 3) بيانات الملف الشخصي (اسم + موبايل)
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, phone")
      .in("user_id", userIds);
    const profMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

    // 4) fallback لأرقام التجار من dealer_applications
    const missingPhone = userIds.filter((uid) => !profMap.get(uid)?.phone);
    let dealerPhoneMap = new Map<string, string>();
    if (missingPhone.length > 0) {
      const { data: dealers } = await supabase
        .from("dealer_applications")
        .select("user_id, phone, business_name")
        .in("user_id", missingPhone);
      (dealers || []).forEach((d: any) => {
        if (d.phone) dealerPhoneMap.set(d.user_id, d.phone);
      });
    }

    // 5) سجلات التواصل لكل المستخدمين النشطين — لتحديد "متأخر" + إخفاء من تم التواصل معه مؤخراً
    //    نجلب آخر 30 يوم فقط ونحتفظ بأحدث تواصل + أي تذكير معلّق غير منفّذ.
    const commsSince = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const { data: commsRows } = await supabase
      .from("customer_communications")
      .select("customer_user_id, created_at, reminder_at, is_done")
      .in("customer_user_id", userIds)
      .gte("created_at", commsSince);
    const commsByUser = new Map<string, { last_contacted_at: string | null; has_open_reminder: boolean }>();
    (commsRows || []).forEach((c: any) => {
      const cur = commsByUser.get(c.customer_user_id) || { last_contacted_at: null, has_open_reminder: false };
      if (!cur.last_contacted_at || c.created_at > cur.last_contacted_at) {
        cur.last_contacted_at = c.created_at;
      }
      if (c.reminder_at && !c.is_done) cur.has_open_reminder = true;
      commsByUser.set(c.customer_user_id, cur);
    });

    // دمج
    const merged: ActiveVisitor[] = userIds.map((uid) => {
      const sess = byUser.get(uid)!;
      const ent = entryMap.get(uid);
      const prof: any = profMap.get(uid);
      const cc = commsByUser.get(uid);
      return {
        user_id: uid,
        name: prof?.full_name || null,
        phone: prof?.phone || dealerPhoneMap.get(uid) || null,
        entry_at: ent?.entry_at || sess.last_seen_at,
        last_seen_at: sess.last_seen_at,
        page_views: sess.page_views,
        last_path: ent?.last_path || null,
        last_page_title: ent?.last_page_title || null,
        last_contacted_at: cc?.last_contacted_at || null,
        has_open_reminder: cc?.has_open_reminder || false,
      };
    });

    // ترتيب أولوي:
    //   1) عنده رقم تليفون أولاً (سواء سجّل في الموقع أو ترك رقمه في popup)
    //   2) ثم الأحدث نشاطاً
    merged.sort((a, b) => {
      const ap = a.phone ? 1 : 0;
      const bp = b.phone ? 1 : 0;
      if (ap !== bp) return bp - ap;
      return new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime();
    });

    setVisitors(merged);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchActive();
    const interval = setInterval(fetchActive, 30_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hoursFilter]);

  // نطاق زمني [from, to] بناءً على الفلتر — يدعم "أمس" كنافذة محدودة وليس "آخر X"
  const range = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date(); startOfToday.setHours(0, 0, 0, 0);
    switch (hoursFilter) {
      case "30m": return { from: now - 30 * 60 * 1000, to: now };
      case "1h": return { from: now - 60 * 60 * 1000, to: now };
      case "3h": return { from: now - 3 * 60 * 60 * 1000, to: now };
      case "6h": return { from: now - 6 * 60 * 60 * 1000, to: now };
      case "24h": return { from: now - 24 * 60 * 60 * 1000, to: now };
      case "yesterday": {
        const endOfYesterday = startOfToday.getTime();
        const startOfYesterday = endOfYesterday - 24 * 60 * 60 * 1000;
        return { from: startOfYesterday, to: endOfYesterday };
      }
      case "7d": return { from: now - 7 * 24 * 60 * 60 * 1000, to: now };
      case "all": return { from: 0, to: now };
    }
  }, [hoursFilter]);

  // "متأخر" = نشط داخل النافذة + (لم يُتواصل معه أبداً) أو (آخر تواصل أقدم من OVERDUE_HOURS)
  const isOverdue = (v: ActiveVisitor) => {
    if (v.has_open_reminder) return false; // فيه تذكير معلّق — مش متأخر
    if (!v.last_contacted_at) return true; // لم يُتواصل معه إطلاقاً
    return Date.now() - new Date(v.last_contacted_at).getTime() > OVERDUE_HOURS * 60 * 60 * 1000;
  };

  const inRange = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= range.from && t <= range.to;
  };

  // عداد الزوار المتأخرين داخل النافذة الزمنية الحالية — للبادج
  const overdueCount = useMemo(() => {
    return visitors.filter((v) => inRange(v.last_seen_at) && isOverdue(v)).length;
  }, [visitors, range]);

  const filtered = useMemo(() => {
    let list = visitors.filter((v) => inRange(v.last_seen_at));
    if (overdueOnly) list = list.filter(isOverdue);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((v) =>
        (v.name || "").toLowerCase().includes(q) ||
        (v.phone || "").includes(q) ||
        (v.last_path || "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [visitors, search, range, overdueOnly]);

  const hoursLabel: Record<typeof hoursFilter, string> = {
    "30m": "30 دقيقة",
    "1h": "ساعة",
    "3h": "3 ساعات",
    "6h": "6 ساعات",
    "24h": "24 ساعة",
    "yesterday": "أمس",
    "7d": "آخر 7 أيام",
    "all": "كل الأيام",
  };

  // حفظ إجراء التواصل من نفس الكارت (يخفي الكارت تدريجياً ويسجل في customer_communications)
  const saveAction = async () => {
    if (!actionFor) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({ title: "يجب تسجيل الدخول", variant: "destructive" });
      return;
    }
    setSavingAction(true);
    try {
      const { error } = await supabase.from("customer_communications").insert({
        customer_user_id: actionFor.user_id,
        staff_user_id: user.id,
        comm_type: actionType,
        note: actionNote.trim() || null,
      });
      if (error) throw error;
      // علّم الكارت كـ "تم التعامل" — يبدأ تأثير fade
      setRecentlyHandled((prev) => {
        const next = new Set(prev);
        next.add(actionFor.user_id);
        return next;
      });
      // حدّث last_contacted_at في الذاكرة فوراً (بدل ما ننتظر refetch)
      setVisitors((prev) =>
        prev.map((v) =>
          v.user_id === actionFor.user_id
            ? { ...v, last_contacted_at: new Date().toISOString() }
            : v
        )
      );
      toast({ title: "✅ تم تسجيل الإجراء", description: "الكارت سيختفي تدريجياً." });
      setActionFor(null);
      setActionNote("");
      setActionType("phone");
    } catch (e: any) {
      toast({ title: "فشل الحفظ", description: e.message, variant: "destructive" });
    } finally {
      setSavingAction(false);
    }
  };

  return (
    <div className="container mx-auto p-4 max-w-6xl space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            to="/admin"
            className="p-2 rounded-lg hover:bg-muted transition"
            title="رجوع للوحة الإدارة"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600" />
              الزوار النشطون الآن
            </h1>
            <p className="text-xs text-muted-foreground">
              المتصفحون خلال آخر {hoursLabel[hoursFilter]} · يتحدّث كل 30 ثانية
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold">{filtered.length}</span>
            <span className="text-muted-foreground">/ {visitors.length} زائر</span>
          </Badge>
          {overdueCount > 0 && (
            <Badge variant="destructive" className="gap-1.5 px-3 py-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span className="font-bold">{overdueCount}</span>
              <span className="opacity-90">متأخر</span>
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setRefreshing(true); fetchActive(); }}
            disabled={refreshing}
            className="gap-1.5"
          >
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            تحديث
          </Button>
        </div>
      </div>

      {/* Quick filters: time window + "متأخر" toggle */}
      <div className="flex items-center gap-2 flex-wrap bg-muted/40 p-2 rounded-lg border border-border/50">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground px-1.5">
          <Filter className="w-3.5 h-3.5" />
          خلال:
        </span>
        {(["30m", "1h", "3h", "6h", "24h", "yesterday", "7d", "all"] as const).map((h) => {
          const active = hoursFilter === h;
          const isExtended = h === "yesterday" || h === "7d" || h === "all";
          return (
            <button
              key={h}
              onClick={() => setHoursFilter(h)}
              className={cn(
                "px-2.5 py-1 rounded-md text-[11px] font-bold border transition",
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-sm"
                  : isExtended
                    ? "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100"
                    : "bg-background border-border text-foreground hover:bg-muted"
              )}
            >
              {hoursLabel[h]}
            </button>
          );
        })}
        <span className="opacity-30 mx-1">|</span>
        <button
          onClick={() => setOverdueOnly((v) => !v)}
          className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold border transition",
            overdueOnly
              ? "bg-red-600 text-white border-red-600 shadow-sm"
              : "bg-background border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
          )}
          title={`زوار نشطون لم يُتواصل معهم خلال آخر ${OVERDUE_HOURS} ساعة`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          متأخر فقط
          {overdueCount > 0 && (
            <Badge
              variant={overdueOnly ? "secondary" : "destructive"}
              className={cn("h-4 px-1 text-[9px]", overdueOnly && "bg-white/20 text-white border-0")}
            >
              {overdueCount}
            </Badge>
          )}
        </button>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="بحث بالاسم، الموبايل، أو الصفحة..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ps-9"
        />
      </div>

      {/* List */}
      <Card className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16 text-muted-foreground gap-2">
            <Loader2 className="w-5 h-5 animate-spin" />
            جاري التحميل...
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
            <Users className="w-10 h-10 opacity-40" />
            <p className="text-sm">
              {visitors.length === 0 ? "لا يوجد زوار نشطون الآن" : "لا نتائج مطابقة للبحث"}
            </p>
          </div>
        ) : (
          <div className="divide-y">
            {filtered.map((v) => {
              const phoneNorm = normalizeEgyptianPhone(v.phone);
              const wpUrl = phoneNorm
                ? `https://wa.me/${phoneNorm}?text=${encodeURIComponent("السلام عليكم 👋 معك المصرية جروب — تحب نساعدك في إيه؟")}`
                : null;
              const handled = recentlyHandled.has(v.user_id);
              return (
                <div
                  key={v.user_id}
                  className={cn(
                    "p-4 hover:bg-muted/30 transition-all duration-700",
                    handled && "opacity-40 grayscale bg-muted/40"
                  )}
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    {/* User info */}
                    <div className="flex-1 min-w-[220px]">
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                        <h3 className="font-bold text-sm text-foreground">
                          {v.name || "زائر بدون اسم"}
                        </h3>
                        <Badge variant="outline" className="text-[10px] h-5">
                          {fmtSinceLast(v.last_seen_at)}
                        </Badge>
                        {isOverdue(v) && (
                          <Badge variant="destructive" className="text-[10px] h-5 gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            متأخر
                          </Badge>
                        )}
                        {v.has_open_reminder && (
                          <Badge variant="secondary" className="text-[10px] h-5 gap-1 bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300 border-amber-300/40">
                            <Clock className="w-3 h-3" />
                            تذكير معلّق
                          </Badge>
                        )}
                        {handled && (
                          <Badge className="text-[10px] h-5 gap-1 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300 border-emerald-300/40">
                            <CheckCircle2 className="w-3 h-3" />
                            تم التعامل
                          </Badge>
                        )}
                      </div>

                      {v.phone && (
                        <div className="text-xs text-muted-foreground flex items-center gap-1.5 mb-1.5">
                          <Phone className="w-3 h-3" />
                          <span className="font-mono">{v.phone}</span>
                        </div>
                      )}

                      {/* Times */}
                      <div className="flex items-center gap-3 text-[11px] text-muted-foreground flex-wrap mb-1.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          دخل: <span className="font-mono font-bold">{fmtTime(v.entry_at)}</span>
                        </span>
                        <span className="opacity-50">·</span>
                        <span>
                          مدة الجلسة:{" "}
                          <span className="font-bold text-foreground">
                            {fmtDuration(v.entry_at, v.last_seen_at)}
                          </span>
                        </span>
                        <span className="opacity-50">·</span>
                        <span>
                          <span className="font-bold text-foreground">{v.page_views}</span> صفحة
                        </span>
                      </div>

                      {/* Last interaction */}
                      {v.last_path && (
                        <div className="flex items-center gap-1.5 text-[11px] mt-1 p-1.5 rounded bg-muted/50">
                          <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
                          <span className="text-muted-foreground">آخر تفاعل:</span>
                          <span className="font-medium text-foreground truncate" dir="ltr">
                            {v.last_page_title || v.last_path}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Quick actions */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {v.phone && (
                        <a
                          href={`tel:${v.phone}`}
                          className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-bold",
                            "bg-emerald-600 hover:bg-emerald-700 text-white transition-colors"
                          )}
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
                          className={cn(
                            "inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-bold",
                            "bg-[#25D366] hover:bg-[#1ebe57] text-white transition-colors"
                          )}
                          title="واتساب"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          واتساب
                        </a>
                      )}
                      <button
                        onClick={() => { setActionFor(v); setActionType("phone"); setActionNote(""); }}
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-bold",
                          "bg-amber-500 hover:bg-amber-600 text-white transition-colors"
                        )}
                        title="سجّل إجراء التواصل (يُخفي الكارت تدريجياً)"
                      >
                        <PenLine className="w-3.5 h-3.5" />
                        سجّل إجراء
                      </button>
                      <Link
                        to={`/admin/visitor/${v.user_id}`}
                        className={cn(
                          "inline-flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-bold",
                          "bg-secondary hover:bg-secondary/80 text-secondary-foreground transition-colors"
                        )}
                        title="ملف الزائر التفصيلي"
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

      {/* Dialog: تسجيل إجراء التواصل */}
      <Dialog open={!!actionFor} onOpenChange={(o) => !o && setActionFor(null)}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">
              تسجيل إجراء — {actionFor?.name || "زائر بدون اسم"}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">نوع الإجراء</label>
              <Select value={actionType} onValueChange={(v: any) => setActionType(v)}>
                <SelectTrigger className="bg-background">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className="z-[100] bg-popover">
                  <SelectItem value="phone">📞 اتصال هاتفي</SelectItem>
                  <SelectItem value="whatsapp">💬 واتساب</SelectItem>
                  <SelectItem value="no_answer">🚫 لم يردّ</SelectItem>
                  <SelectItem value="visit">🏬 زيارة فرع</SelectItem>
                  <SelectItem value="note">📝 ملاحظة</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">ملاحظات (اختياري)</label>
              <Textarea
                value={actionNote}
                onChange={(e) => setActionNote(e.target.value)}
                placeholder="مثال: طلب عرض سعر للفلتر — هرجعله بكرة"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setActionFor(null)} disabled={savingAction}>
              إلغاء
            </Button>
            <Button onClick={saveAction} disabled={savingAction} className="gap-1.5">
              {savingAction ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              حفظ الإجراء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
