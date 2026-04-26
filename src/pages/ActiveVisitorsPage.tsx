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
import { cn } from "@/lib/utils";
import {
  Users, Phone, MessageCircle, Eye, RefreshCw, Search,
  Clock, MapPin, ArrowLeft, Activity, Loader2, AlertTriangle, Filter,
} from "lucide-react";

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
  has_open_reminder: boolean;       // عنده تذكير معلّق غير منفّذ
}

// أكبر نافذة زمنية ممكن نعرضها — نجلب البيانات لها مرة واحدة ونفلتر عميل-جانب.
const MAX_WINDOW_HOURS = 24;
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
  const [visitors, setVisitors] = useState<ActiveVisitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState("");

  const fetchActive = async () => {
    const since = new Date(Date.now() - WINDOW_MIN * 60 * 1000).toISOString();

    // 1) جلسات نشطة آخر 30 دقيقة
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
      .select("id, full_name, phone")
      .in("id", userIds);
    const profMap = new Map((profiles || []).map((p: any) => [p.id, p]));

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

    // دمج
    const merged: ActiveVisitor[] = userIds.map((uid) => {
      const sess = byUser.get(uid)!;
      const ent = entryMap.get(uid);
      const prof: any = profMap.get(uid);
      return {
        user_id: uid,
        name: prof?.full_name || null,
        phone: prof?.phone || dealerPhoneMap.get(uid) || null,
        entry_at: ent?.entry_at || sess.last_seen_at,
        last_seen_at: sess.last_seen_at,
        page_views: sess.page_views,
        last_path: ent?.last_path || null,
        last_page_title: ent?.last_page_title || null,
      };
    });

    // ترتيب: الأحدث نشاطاً أولاً
    merged.sort((a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime());

    setVisitors(merged);
    setLoading(false);
    setRefreshing(false);
  };

  useEffect(() => {
    fetchActive();
    const interval = setInterval(fetchActive, 30_000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return visitors;
    return visitors.filter((v) =>
      (v.name || "").toLowerCase().includes(q) ||
      (v.phone || "").includes(q) ||
      (v.last_path || "").toLowerCase().includes(q)
    );
  }, [visitors, search]);

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
              المتصفحون خلال آخر {WINDOW_MIN} دقيقة · يتحدّث كل 30 ثانية
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1.5 px-3 py-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold">{visitors.length}</span>
            <span className="text-muted-foreground">زائر مباشر</span>
          </Badge>
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
          <ScrollArea className="max-h-[70vh]">
            <div className="divide-y">
              {filtered.map((v) => {
                const phoneNorm = normalizeEgyptianPhone(v.phone);
                const wpUrl = phoneNorm
                  ? `https://wa.me/${phoneNorm}?text=${encodeURIComponent("السلام عليكم 👋 معك المصرية جروب — تحب نساعدك في إيه؟")}`
                  : null;
                return (
                  <div key={v.user_id} className="p-4 hover:bg-muted/30 transition-colors">
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
          </ScrollArea>
        )}
      </Card>
    </div>
  );
}
