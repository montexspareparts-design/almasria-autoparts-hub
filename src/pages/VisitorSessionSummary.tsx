import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { flushPendingVisits } from "@/lib/pageVisitTracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Activity, ArrowRight, Clock, Eye, FileText, Globe, Hash,
  Search, ShoppingBag, Phone, MessageCircle, Timer, User as UserIcon,
  Calendar, Sparkles, TrendingUp, MousePointerClick, History,
  ExternalLink, Quote, Flame, StickyNote, Loader2, Pencil, Trash2,
  CheckCircle2, Headphones, MapPin, AlertTriangle, ShoppingCart, Layers,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { checkDuplicateCommunication } from "@/lib/duplicateCommCheck";

interface PageVisit { id: string; path: string; page_title: string | null; visited_at: string; referrer: string | null; }
interface SearchEntry { id: string; search_query: string; created_at: string; results_count: number | null; }
interface PriceView { id: string; product_id: string; viewed_at: string; }
interface ProductInfo { id: string; name_ar: string; sku: string; }

const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" });
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString("ar-EG", { dateStyle: "medium", timeStyle: "short" });
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("ar-EG", { dateStyle: "medium" });
const fmtFullDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ar-EG", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const fmtFullTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", hour12: true });
const fmtRelativeShort = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "الآن";
  if (min < 60) return `منذ ${min} د`;
  const h = Math.floor(min / 60);
  if (h < 24) return `منذ ${h} س`;
  const d = Math.floor(h / 24);
  if (d < 30) return `منذ ${d} يوم`;
  const mo = Math.floor(d / 30);
  return `منذ ${mo} شهر`;
};
const fmtDuration = (ms: number) => {
  if (ms <= 0) return "أقل من ثانية";
  const min = Math.floor(ms / 60000);
  const sec = Math.floor((ms % 60000) / 1000);
  if (min < 1) return `${sec} ثانية`;
  if (min < 60) return `${min} د ${sec} ث`;
  const h = Math.floor(min / 60);
  return `${h} س ${min % 60} د`;
};

const friendlyPath = (path: string): string => {
  const p = path.split("?")[0];
  const map: Record<string, string> = {
    "/": "الصفحة الرئيسية",
    "/products": "كل المنتجات",
    "/cart": "السلة",
    "/checkout": "إتمام الطلب",
    "/contact": "تواصل معنا",
    "/about": "من نحن",
    "/auth": "تسجيل الدخول",
    "/dealer": "بوابة التاجر",
    "/dealer-apply": "طلب فتح حساب تاجر",
    "/dealer-register": "تسجيل تاجر",
    "/client-register": "تسجيل عميل",
    "/policies": "السياسات",
    "/catalogs": "الكتالوجات",
    "/track-order": "تتبع الطلب",
    "/my-profile": "الملف الشخصي",
    "/payment": "الدفع",
    "/payment-callback": "تأكيد الدفع",
  };
  if (map[p]) return map[p];
  if (p.startsWith("/products/")) return `منتجات: ${decodeURIComponent(p.split("/")[2] || "")}`;
  if (p.startsWith("/parts-by-model/")) return `قطع موديل: ${decodeURIComponent(p.split("/")[2] || "")}`;
  if (p.startsWith("/parts-by-type/")) return `قطع نوع: ${decodeURIComponent(p.split("/")[2] || "")}`;
  if (p.startsWith("/dealer/product/")) return "تفاصيل منتج (تاجر)";
  return p;
};

const COMM_TYPES: Record<string, { label: string; icon: any; color: string }> = {
  phone: { label: "📞 مكالمة هاتفية", icon: Phone, color: "text-emerald-600" },
  whatsapp: { label: "💬 واتساب", icon: MessageCircle, color: "text-green-600" },
  visit: { label: "🤝 زيارة شخصية", icon: MapPin, color: "text-blue-600" },
  no_answer: { label: "📵 لم يرد", icon: AlertTriangle, color: "text-amber-600" },
  other: { label: "📌 وسيلة أخرى", icon: Headphones, color: "text-purple-600" },
};

export default function VisitorSessionSummary() {
  const { userId = "" } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user, isAdmin, isModerator, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ full_name: string | null; email: string | null; phone: string | null; created_at: string | null } | null>(null);
  const [isDealer, setIsDealer] = useState(false);
  const [visits, setVisits] = useState<PageVisit[]>([]);
  const [searches, setSearches] = useState<SearchEntry[]>([]);
  const [priceViews, setPriceViews] = useState<PriceView[]>([]);
  const [productMap, setProductMap] = useState<Map<string, ProductInfo>>(new Map());
  const [hasOrders, setHasOrders] = useState(false);
  const [hasCart, setHasCart] = useState(false);
  const [orders, setOrders] = useState<Array<{ id: string; order_number: string; status: string; total_amount: number; created_at: string }>>([]);

  // Notes
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [notes, setNotes] = useState<Array<{ id: string; note: string; created_at: string; staff_user_id: string; staff_name?: string | null }>>([]);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [focusedSection, setFocusedSection] = useState<string | null>(null);

  // Communications log (تسجيل تواصل لمنع التكرار)
  const [comms, setComms] = useState<Array<{ id: string; comm_type: string; note: string | null; created_at: string; staff_user_id: string; staff_name?: string | null }>>([]);
  const [commOpen, setCommOpen] = useState(false);
  const [commType, setCommType] = useState<string>("phone");
  const [commNote, setCommNote] = useState("");
  const [savingComm, setSavingComm] = useState(false);

  // Session viewers (other staff who opened this customer's session)
  const [viewers, setViewers] = useState<Array<{ staff_user_id: string; staff_name: string | null; first_viewed_at: string; last_viewed_at: string; view_count: number }>>([]);

  const clearFocus = () => {
    document.querySelectorAll("[data-focus-target='true']").forEach((n) => {
      n.classList.remove("ring-4", "ring-primary", "ring-offset-2", "shadow-2xl", "scale-[1.01]");
      (n as HTMLElement).removeAttribute("data-focus-target");
    });
    setFocusedSection(null);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (!el) {
      toast({ title: "لا توجد بيانات في هذا القسم", description: "هذا الزائر لم يسجّل نشاطًا هنا بعد." });
      return;
    }
    // Clear any previous focus highlight
    clearFocus();
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    el.classList.add("ring-4", "ring-primary", "ring-offset-2", "shadow-2xl", "scale-[1.01]", "transition-all");
    el.setAttribute("data-focus-target", "true");
    setFocusedSection(id);
  };

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin && !isModerator) {
      navigate("/", { replace: true });
    }
  }, [authLoading, isAdmin, isModerator, navigate]);

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        // Flush any visits that were queued in this admin's own browser before fetching
        await flushPendingVisits().catch(() => 0);

        const [profRes, dealerRes, visitsRes, searchesRes, viewsRes, ordersRes, cartRes, notesRes, commsRes] = await Promise.all([
          supabase.from("profiles").select("full_name, email, phone, created_at").eq("user_id", userId).maybeSingle(),
          supabase.from("dealer_accounts").select("id").eq("user_id", userId).maybeSingle(),
          supabase.from("page_visits").select("id, path, page_title, visited_at, referrer").eq("user_id", userId).order("visited_at", { ascending: true }).limit(500),
          supabase.from("customer_search_logs").select("id, search_query, created_at, results_count").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
          supabase.from("dealer_price_views").select("id, product_id, viewed_at").eq("user_id", userId).order("viewed_at", { ascending: false }).limit(50),
          supabase.from("orders").select("id, order_number, status, total_amount, created_at").eq("user_id", userId).order("created_at", { ascending: false }).limit(50),
          supabase.from("dealer_cart_items").select("id", { count: "exact", head: true }).eq("user_id", userId),
          supabase.from("customer_notes").select("id, note, created_at, staff_user_id").eq("customer_user_id", userId).order("created_at", { ascending: false }).limit(50),
          supabase.from("customer_communications").select("id, comm_type, note, created_at, staff_user_id").eq("customer_user_id", userId).order("created_at", { ascending: false }).limit(50),
        ]);

        if (cancelled) return;

        setProfile(profRes.data || null);
        setIsDealer(!!dealerRes.data);
        setVisits(visitsRes.data || []);
        setSearches(searchesRes.data || []);
        setPriceViews(viewsRes.data || []);
        const ordersList = (ordersRes as any).data || [];
        setOrders(ordersList);
        setHasOrders(ordersList.length > 0);
        setHasCart((cartRes.count || 0) > 0);

        // Resolve staff display names (notes + comms)
        const staffIds = [...new Set([
          ...((notesRes.data || []).map((n: any) => n.staff_user_id)),
          ...((commsRes.data || []).map((c: any) => c.staff_user_id)),
        ])];
        let staffMap = new Map<string, string | null>();
        if (staffIds.length > 0) {
          const { data: staffProfiles } = await supabase
            .from("profiles")
            .select("user_id, full_name, email")
            .in("user_id", staffIds);
          staffMap = new Map((staffProfiles || []).map((p: any) => [p.user_id, p.full_name || p.email]));
        }
        if (!cancelled) {
          setNotes((notesRes.data || []).map((n: any) => ({ ...n, staff_name: staffMap.get(n.staff_user_id) || "موظف" })));
          setComms((commsRes.data || []).map((c: any) => ({ ...c, staff_name: staffMap.get(c.staff_user_id) || "موظف" })));
        }

        const productIds = [...new Set((viewsRes.data || []).map((v: any) => v.product_id))];
        if (productIds.length > 0) {
          const { data: products } = await supabase
            .from("products")
            .select("id, name_ar, sku")
            .in("id", productIds);
          if (!cancelled) {
            setProductMap(new Map((products || []).map((p: any) => [p.id, p])));
          }
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [userId]);

  // Detect whether the param is a UUID (registered customer) or a session_key (anonymous)
  const isAnonTarget = useMemo(() => {
    return !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);
  }, [userId]);

  // Record this staff member's view + fetch full viewer list
  useEffect(() => {
    if (!userId || !user || (!isAdmin && !isModerator)) return;
    let cancelled = false;
    (async () => {
      const target = isAnonTarget
        ? { session_key: userId, customer_user_id: null }
        : { customer_user_id: userId, session_key: null };

      // Upsert: if record exists for this staff+target, bump view_count + last_viewed_at
      const { data: existing } = await supabase
        .from("visitor_session_views")
        .select("id, view_count")
        .eq("staff_user_id", user.id)
        .eq(isAnonTarget ? "session_key" : "customer_user_id", userId)
        .maybeSingle();

      if (existing) {
        await supabase
          .from("visitor_session_views")
          .update({ last_viewed_at: new Date().toISOString(), view_count: (existing.view_count || 1) + 1 })
          .eq("id", existing.id);
      } else {
        await supabase.from("visitor_session_views").insert({
          staff_user_id: user.id,
          ...target,
        });
      }

      // Fetch all viewers for this target (newest first)
      const { data: rows } = await supabase
        .from("visitor_session_views")
        .select("staff_user_id, first_viewed_at, last_viewed_at, view_count")
        .eq(isAnonTarget ? "session_key" : "customer_user_id", userId)
        .order("last_viewed_at", { ascending: false });

      if (cancelled || !rows) return;

      const ids = [...new Set(rows.map((r: any) => r.staff_user_id))];
      const { data: profs } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", ids);
      const nameMap = new Map((profs || []).map((p: any) => [p.user_id, p.full_name || p.email]));

      if (!cancelled) {
        setViewers(rows.map((r: any) => ({ ...r, staff_name: nameMap.get(r.staff_user_id) || "موظف" })));
      }
    })();
    return () => { cancelled = true; };
  }, [userId, user, isAdmin, isModerator, isAnonTarget]);

  // Group visits into sessions (gap > 30 min = new session)
  const sessions = useMemo(() => {
    if (visits.length === 0) return [] as { start: string; end: string; durationMs: number; pages: PageVisit[] }[];
    const SESSION_GAP_MS = 30 * 60 * 1000;
    const groups: PageVisit[][] = [];
    let current: PageVisit[] = [];
    let lastTime = 0;
    for (const v of visits) {
      const t = new Date(v.visited_at).getTime();
      if (current.length === 0 || t - lastTime > SESSION_GAP_MS) {
        if (current.length > 0) groups.push(current);
        current = [v];
      } else {
        current.push(v);
      }
      lastTime = t;
    }
    if (current.length > 0) groups.push(current);
    return groups
      .map((pages) => {
        const start = pages[0].visited_at;
        const end = pages[pages.length - 1].visited_at;
        const durationMs = new Date(end).getTime() - new Date(start).getTime();
        return { start, end, durationMs, pages };
      })
      .reverse(); // newest first
  }, [visits]);

  const lastSession = sessions[0];
  const lastSessionStart = lastSession ? new Date(lastSession.start).getTime() - 60_000 : 0;
  const lastSessionEnd = lastSession ? new Date(lastSession.end).getTime() + 60_000 : 0;
  const lastSessionSearches = searches.filter((s) => {
    const t = new Date(s.created_at).getTime();
    return t >= lastSessionStart && t <= lastSessionEnd;
  });
  const lastSessionPriceViews = priceViews.filter((v) => {
    const t = new Date(v.viewed_at).getTime();
    return t >= lastSessionStart && t <= lastSessionEnd;
  });

  const totalDurationMs = sessions.reduce((sum, s) => sum + s.durationMs, 0);
  const avgPagesPerSession = sessions.length > 0 ? Math.round(visits.length / sessions.length) : 0;
  const initials = (profile?.full_name || "?").trim().split(" ").map(s => s[0]).slice(0, 2).join("").toUpperCase();

  // Top viewed products (aggregated from price views)
  const topProducts = useMemo(() => {
    const counts = new Map<string, { count: number; lastAt: string }>();
    for (const v of priceViews) {
      const cur = counts.get(v.product_id);
      if (cur) {
        cur.count += 1;
        if (v.viewed_at > cur.lastAt) cur.lastAt = v.viewed_at;
      } else {
        counts.set(v.product_id, { count: 1, lastAt: v.viewed_at });
      }
    }
    return Array.from(counts.entries())
      .map(([product_id, { count, lastAt }]) => ({
        product_id,
        count,
        lastAt,
        product: productMap.get(product_id),
      }))
      .sort((a, b) => b.count - a.count || (b.lastAt > a.lastAt ? 1 : -1))
      .slice(0, 5);
  }, [priceViews, productMap]);

  // Top search queries (aggregated)
  const topSearches = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of searches) {
      const q = s.search_query.trim();
      if (!q) continue;
      counts.set(q, (counts.get(q) || 0) + 1);
    }
    return Array.from(counts.entries())
      .map(([query, count]) => ({ query, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [searches]);

  // Unified activity timeline — combines ALL events into one chronological log
  const unifiedTimeline = useMemo(() => {
    type Evt = {
      id: string;
      at: string;
      kind: "session" | "search" | "comm" | "note" | "order";
      title: string;
      detail?: string;
      icon: any;
      color: string;
    };
    const events: Evt[] = [];

    sessions.forEach((s, idx) => {
      events.push({
        id: `session-${idx}`,
        at: s.start,
        kind: "session",
        title: `جلسة #${sessions.length - idx} — ${s.pages.length} صفحة`,
        detail: `المدة: ${fmtDuration(s.durationMs)} • آخر صفحة: ${friendlyPath(s.pages[s.pages.length - 1].path)}`,
        icon: Globe,
        color: "text-purple-600 bg-purple-500/10 border-purple-500/30",
      });
    });

    searches.forEach((s) => {
      events.push({
        id: `search-${s.id}`,
        at: s.created_at,
        kind: "search",
        title: `بحث: "${s.search_query}"`,
        detail: `${s.results_count || 0} نتيجة`,
        icon: Search,
        color: "text-orange-600 bg-orange-500/10 border-orange-500/30",
      });
    });

    comms.forEach((c) => {
      const meta = COMM_TYPES[c.comm_type] || COMM_TYPES.other;
      events.push({
        id: `comm-${c.id}`,
        at: c.created_at,
        kind: "comm",
        title: `${meta.label} — ${c.staff_name || "موظف"}`,
        detail: c.note || undefined,
        icon: meta.icon,
        color: "text-blue-600 bg-blue-500/10 border-blue-500/30",
      });
    });

    notes.forEach((n) => {
      events.push({
        id: `note-${n.id}`,
        at: n.created_at,
        kind: "note",
        title: `ملاحظة — ${n.staff_name || "موظف"}`,
        detail: n.note,
        icon: StickyNote,
        color: "text-amber-600 bg-amber-500/10 border-amber-500/30",
      });
    });

    orders.forEach((o) => {
      events.push({
        id: `order-${o.id}`,
        at: o.created_at,
        kind: "order",
        title: `طلب #${o.order_number}`,
        detail: `الحالة: ${o.status} • المبلغ: ${Number(o.total_amount || 0).toLocaleString("ar-EG")} ج.م`,
        icon: ShoppingCart,
        color: "text-emerald-600 bg-emerald-500/10 border-emerald-500/30",
      });
    });

    return events.sort((a, b) => (a.at > b.at ? -1 : 1));
  }, [sessions, searches, comms, notes, orders]);

  const buildQuoteWhatsApp = (productLabel: string) => {
    const phone = "201027815696"; // WhatsMeta CRM number
    const customer = profile?.full_name || "العميل";
    const text = encodeURIComponent(
      `طلب عرض سعر للعميل: ${customer}\nالمنتج: ${productLabel}\n${profile?.phone ? `هاتف العميل: ${profile.phone}` : ""}`
    );
    return `https://wa.me/${phone}?text=${text}`;
  };

  // Lead scoring (visit=5, search=10, repeat product view=20, cart=40)
  const leadScore = useMemo(() => {
    let score = 0;
    if (visits.length > 0) score += 5;
    score += Math.min(searches.length, 5) * 10;
    const dupViews = topProducts.filter(p => p.count > 1).length;
    score += dupViews * 20;
    if (hasCart) score += 40;
    return score;
  }, [visits.length, searches.length, topProducts, hasCart]);

  const leadTier: "hot" | "warm" | "cold" = hasOrders
    ? "warm"
    : leadScore >= 70 ? "hot" : leadScore >= 30 ? "warm" : "cold";

  const lastActivityLabel = useMemo(() => {
    if (lastSessionPriceViews.length > 0) return `شاف سعر منتج (${lastSessionPriceViews.length})`;
    if (lastSessionSearches.length > 0) return `بحث: "${lastSessionSearches[0].search_query}"`;
    if (lastSession?.pages?.length) return `زار: ${friendlyPath(lastSession.pages[lastSession.pages.length - 1].path)}`;
    return "لا يوجد نشاط حديث";
  }, [lastSession, lastSessionPriceViews, lastSessionSearches]);

  const saveNote = async () => {
    if (!noteText.trim() || !user?.id) return;
    setSavingNote(true);
    try {
      if (editingNoteId) {
        const { error } = await supabase
          .from("customer_notes")
          .update({ note: noteText.trim() })
          .eq("id", editingNoteId);
        if (error) throw error;
        setNotes((prev) => prev.map((n) => (n.id === editingNoteId ? { ...n, note: noteText.trim() } : n)));
        toast({ title: "✅ تم تحديث الملاحظة" });
      } else {
        const { data, error } = await supabase
          .from("customer_notes")
          .insert({
            customer_user_id: userId,
            staff_user_id: user.id,
            note: noteText.trim(),
          })
          .select("id, note, created_at, staff_user_id")
          .single();
        if (error) throw error;
        if (data) {
          setNotes((prev) => [
            { ...data, staff_name: user?.user_metadata?.full_name || user?.email || "أنا" },
            ...prev,
          ]);
        }
        toast({ title: "✅ تم حفظ الملاحظة" });
      }
      setNoteText("");
      setEditingNoteId(null);
      setNoteOpen(false);
    } catch (e: any) {
      toast({ title: "فشل الحفظ", description: e.message, variant: "destructive" });
    } finally {
      setSavingNote(false);
    }
  };

  const openEditNote = (n: { id: string; note: string }) => {
    setEditingNoteId(n.id);
    setNoteText(n.note);
    setNoteOpen(true);
  };

  const deleteNote = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذه الملاحظة؟ لا يمكن التراجع.")) return;
    setDeletingNoteId(id);
    try {
      const { error } = await supabase.from("customer_notes").delete().eq("id", id);
      if (error) throw error;
      setNotes((prev) => prev.filter((n) => n.id !== id));
      toast({ title: "🗑️ تم حذف الملاحظة" });
    } catch (e: any) {
      toast({ title: "فشل الحذف", description: e.message, variant: "destructive" });
    } finally {
      setDeletingNoteId(null);
    }
  };

  const saveCommunication = async () => {
    if (!user?.id) return;
    const dup = await checkDuplicateCommunication({ customerUserId: userId!, commType });
    if (dup.isDuplicate && !dup.shouldProceed) return;
    setSavingComm(true);
    try {
      const { data, error } = await supabase
        .from("customer_communications")
        .insert({
          customer_user_id: userId,
          staff_user_id: user.id,
          comm_type: commType,
          note: commNote.trim() || null,
        })
        .select("id, comm_type, note, created_at, staff_user_id")
        .single();
      if (error) throw error;
      if (data) {
        setComms((prev) => [
          { ...data, staff_name: user?.user_metadata?.full_name || user?.email || "أنا" },
          ...prev,
        ]);
      }
      toast({ title: "✅ تم تسجيل التواصل", description: "تم تسجيل تعاملك مع العميل لمنع التكرار." });
      setCommNote("");
      setCommType("phone");
      setCommOpen(false);
    } catch (e: any) {
      toast({ title: "فشل الحفظ", description: e.message, variant: "destructive" });
    } finally {
      setSavingComm(false);
    }
  };

  const lastComm = comms[0];

  const callPhone = () => { if (profile?.phone) window.location.href = `tel:${profile.phone}`; };
  const openWhatsApp = () => {
    if (!profile?.phone) return;
    const cleaned = profile.phone.replace(/\D/g, "").replace(/^0/, "20");
    const msg = encodeURIComponent(`أهلاً ${profile.full_name || ""}، معاك المصرية جروب 🚗 — حابب أساعدك في طلبك؟`);
    window.open(`https://wa.me/${cleaned}?text=${msg}`, "_blank");
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-slate-100 dark:from-slate-950 dark:via-background dark:to-slate-900 p-4" dir="rtl">
        <div className="max-w-6xl mx-auto space-y-4">
          <Skeleton className="h-44 w-full rounded-2xl" />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)}
          </div>
          <Skeleton className="h-96 w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-background to-slate-100/60 dark:from-slate-950 dark:via-background dark:to-slate-900/60 p-3 md:p-6 pb-12" dir="rtl">
      <div className="max-w-6xl mx-auto space-y-5">
        {/* Top bar */}
        <div className="flex items-center justify-between gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5 hover:bg-background/80">
            <ArrowRight className="w-4 h-4" />
            رجوع
          </Button>
          <Badge variant="outline" className="gap-1.5 bg-background/60 backdrop-blur">
            <Activity className="w-3 h-3" />
            ملخص جلسة الزائر
          </Badge>
        </div>

        {/* Quick Links Bar — ينقل بسرعة لأي قسم في الصفحة */}
        <div className="sticky top-2 z-30 bg-background/80 backdrop-blur-md rounded-xl border shadow-sm p-2 flex items-center gap-1.5 overflow-x-auto">
          <span className="text-[10px] font-bold text-muted-foreground px-2 shrink-0 hidden sm:inline">قفز إلى:</span>
          {[
            { id: "section-latest-session", label: "آخر جلسة", icon: Sparkles, count: lastSession ? 1 : 0 },
            { id: "section-pages", label: "الصفحات", icon: Eye, count: visits.length },
            { id: "section-sessions", label: "كل الجلسات", icon: Hash, count: sessions.length },
            { id: "section-searches", label: "البحث", icon: Search, count: searches.length },
            { id: "section-products", label: "منتجات شاف سعرها", icon: ShoppingBag, count: priceViews.length },
            { id: "section-timeline", label: "الطلبات", icon: ShoppingCart, count: orders.length },
            { id: "section-comms", label: "تواصل", icon: Phone, count: comms.length },
            { id: "section-notes", label: "ملاحظات", icon: StickyNote, count: notes.length },
            { id: "section-timeline", label: "Timeline", icon: History, count: 0 },
          ].map((link) => {
            const disabled = link.count === 0 && link.id !== "section-timeline";
            return (
              <button
                key={link.id}
                onClick={() => scrollToSection(link.id)}
                disabled={disabled}
                className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition ${
                  disabled
                    ? "text-muted-foreground/40 cursor-not-allowed"
                    : "text-foreground hover:bg-muted active:scale-95"
                }`}
                title={disabled ? "لا توجد بيانات" : `الانتقال إلى ${link.label}`}
              >
                <link.icon className="w-3.5 h-3.5" />
                <span>{link.label}</span>
                {link.count > 0 && (
                  <Badge variant="secondary" className="h-4 px-1 text-[9px] font-bold">
                    {link.count}
                  </Badge>
                )}
              </button>
            );
          })}
        </div>

        {/* Hero / Visitor profile */}
        <Card className="overflow-hidden border-0 shadow-xl bg-gradient-to-br from-primary/95 via-primary to-primary/80 text-primary-foreground">
          <CardContent className="p-5 md:p-7">
            <div className="flex flex-col md:flex-row md:items-center gap-5">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-2xl bg-white/15 backdrop-blur ring-4 ring-white/10 flex items-center justify-center shrink-0">
                  <span className="text-2xl md:text-3xl font-black tracking-wide">{initials}</span>
                </div>
                <div className="md:hidden">
                  <h1 className="text-xl font-black">{profile?.full_name || "زائر بدون اسم"}</h1>
                  <p className="text-xs opacity-80 mt-0.5">{isDealer ? "حساب تاجر" : "عميل قطاعي"}</p>
                </div>
              </div>

              <div className="flex-1 min-w-0">
                <div className="hidden md:block">
                  <h1 className="text-2xl md:text-3xl font-black leading-tight">{profile?.full_name || "زائر بدون اسم"}</h1>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <Badge className={
                      leadTier === "hot"
                        ? "bg-red-500 text-white border-0 hover:bg-red-600"
                        : leadTier === "warm"
                        ? "bg-amber-500 text-white border-0 hover:bg-amber-600"
                        : "bg-white/20 text-primary-foreground border-white/20 backdrop-blur"
                    }>
                      {leadTier === "hot" ? "🔥 جاهز يشتري" : leadTier === "warm" ? "🟡 مهتم" : "🔴 بارد"}
                      <span className="opacity-80 mr-1">· {leadScore}</span>
                    </Badge>
                    <Badge className="bg-white/20 hover:bg-white/30 text-primary-foreground border-white/20 backdrop-blur">
                      {isDealer ? "🏢 حساب تاجر" : "👤 عميل قطاعي"}
                    </Badge>
                    <Badge variant="outline" className="border-white/30 text-primary-foreground/90 bg-white/5 backdrop-blur gap-1">
                      <Activity className="w-3 h-3" />
                      {lastActivityLabel}
                    </Badge>
                    {profile?.created_at && (
                      <Badge variant="outline" className="border-white/30 text-primary-foreground/90 bg-white/5 backdrop-blur gap-1">
                        <Calendar className="w-3 h-3" />
                        مسجّل من {fmtDate(profile.created_at)}
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-4">
                  {profile?.phone && (
                    <div className="flex items-center gap-2 flex-wrap">
                      <a href={`tel:${profile.phone}`} className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-white/15 hover:bg-white/25 backdrop-blur font-bold transition">
                        <Phone className="w-3.5 h-3.5" />
                        {profile.phone}
                      </a>
                      <a
                        href={`https://wa.me/${profile.phone.replace(/^0/, "20").replace(/\D/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-white font-bold transition shadow-md"
                      >
                        <MessageCircle className="w-3.5 h-3.5" />
                        واتساب
                      </a>
                    </div>
                  )}
                  {profile?.email && !profile.email.includes("@phone.almasria.local") && (
                    <p className="text-xs opacity-80 truncate">📧 {profile.email}</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <KpiCard icon={Eye} label="إجمالي الصفحات المشاهدة" value={visits.length} sub={`${avgPagesPerSession || 0} صفحة/جلسة`} color="blue" onClick={() => scrollToSection(visits.length > 0 ? "section-pages" : "section-latest-session")} emptyHint={visits.length === 0 ? "لم يتصفح أي صفحة بعد" : undefined} />
          <KpiCard icon={Hash} label="عدد الجلسات" value={sessions.length} sub={sessions.length > 1 ? "زائر عائد" : "زيارة واحدة"} color="purple" onClick={() => scrollToSection(sessions.length > 1 ? "section-sessions" : "section-latest-session")} emptyHint={sessions.length === 0 ? "لا توجد جلسات مسجّلة" : undefined} />
          <KpiCard icon={Search} label="عمليات البحث" value={searches.length} sub={searches.length > 0 ? "نشاط بحث" : "لم يبحث"} color="orange" onClick={() => scrollToSection(searches.length > 0 ? "section-searches" : "section-latest-session")} emptyHint={searches.length === 0 ? "لم يبحث عن أي منتج" : undefined} />
          <KpiCard icon={Timer} label="إجمالي الوقت" valueText={fmtDuration(totalDurationMs)} sub={lastSession ? `آخر زيارة: ${fmtDate(lastSession.start)}` : "—"} color="emerald" onClick={() => scrollToSection("section-latest-session")} emptyHint={!lastSession ? "لا يوجد نشاط بعد" : undefined} />
        </div>

        {/* Session Viewers — who already opened this customer's session */}
        {viewers.length > 0 && (
          <Card className="border-emerald-200/60 dark:border-emerald-900/40 shadow-sm overflow-hidden">
            <CardHeader className="pb-2 bg-gradient-to-l from-emerald-500/10 via-emerald-500/5 to-transparent border-b">
              <CardTitle className="flex items-center gap-2 text-sm">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/15 flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                </div>
                تمت المشاهدة بواسطة
                <Badge variant="secondary" className="text-[10px] bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-0">
                  {viewers.length} موظف
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-3 pb-3">
              <div className="flex flex-wrap gap-2">
                {viewers.map((v) => {
                  const isMe = v.staff_user_id === user?.id;
                  const lastSeen = new Date(v.last_viewed_at);
                  const diffMin = Math.floor((Date.now() - lastSeen.getTime()) / 60000);
                  const relTime =
                    diffMin < 1 ? "الآن" :
                    diffMin < 60 ? `منذ ${diffMin} د` :
                    diffMin < 1440 ? `منذ ${Math.floor(diffMin / 60)} س` :
                    `منذ ${Math.floor(diffMin / 1440)} يوم`;
                  return (
                    <div
                      key={v.staff_user_id}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs border ${
                        isMe
                          ? "bg-primary/10 border-primary/30 text-primary font-bold"
                          : "bg-muted/60 border-border text-foreground"
                      }`}
                      title={`${v.view_count} مرة مشاهدة • أول مرة ${fmtDateTime(v.first_viewed_at)}`}
                    >
                      <UserIcon className="w-3 h-3" />
                      <span>{isMe ? "أنت" : v.staff_name}</span>
                      <span className="text-[10px] text-muted-foreground">• {relTime}</span>
                      {v.view_count > 1 && (
                        <Badge variant="outline" className="text-[9px] h-4 px-1 border-current">
                          ×{v.view_count}
                        </Badge>
                      )}
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-muted-foreground mt-2 leading-relaxed">
                💡 كل موظف يفتح هذه الصفحة يُسجَّل تلقائيًا — لتجنّب تكرار الاتصال بنفس العميل من أكثر من موظف.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Top Searched Products & Queries */}
        {(topProducts.length > 0 || topSearches.length > 0) && (
          <div id="section-products" className="scroll-mt-24" />
        )}
        {(topProducts.length > 0 || topSearches.length > 0) && (
          <Card className="border-orange-200/60 dark:border-orange-900/40 shadow-md overflow-hidden">
            <CardHeader className="pb-3 bg-gradient-to-l from-orange-500/10 via-orange-500/5 to-transparent border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="w-9 h-9 rounded-xl bg-orange-500/15 flex items-center justify-center">
                  <Flame className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                </div>
                المنتجات الأكثر اهتمامًا
                <Badge variant="secondary" className="text-[10px]">{topProducts.length + topSearches.length}</Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1.5 mr-11">
                ملخص لأكثر ما بحث وشاف سعره — اضغط لفتح المنتج أو إرسال عرض سعر فورًا.
              </p>
            </CardHeader>
            <CardContent className="pt-4 space-y-4">
              {topProducts.length > 0 && (
                <div>
                  <SectionTitle icon={ShoppingBag} title="منتجات شاف سعرها أكثر" count={topProducts.length} />
                  <div className="space-y-2 mt-3">
                    {topProducts.map((tp, idx) => {
                      const label = tp.product?.name_ar || `منتج ${tp.product_id.slice(0, 8)}`;
                      const sku = tp.product?.sku;
                      return (
                        <div
                          key={tp.product_id}
                          className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition flex-wrap"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="w-7 h-7 rounded-lg bg-orange-100 dark:bg-orange-950/50 text-orange-700 dark:text-orange-400 flex items-center justify-center text-xs font-black shrink-0">
                              {idx + 1}
                            </span>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm text-foreground truncate">{label}</p>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                {sku && (
                                  <span className="text-[10px] text-muted-foreground font-mono">SKU: {sku}</span>
                                )}
                                <span className="text-[10px] text-orange-700 dark:text-orange-400 font-bold">
                                  شاف السعر {tp.count}× • آخر مرة {fmtTime(tp.lastAt)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex gap-1.5 shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 gap-1 text-xs"
                              onClick={() => window.open(`/dealer/product/${tp.product_id}`, "_blank")}
                            >
                              <ExternalLink className="w-3 h-3" />
                              فتح المنتج
                            </Button>
                            <Button
                              size="sm"
                              className="h-8 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => window.open(buildQuoteWhatsApp(`${label}${sku ? ` (${sku})` : ""}`), "_blank")}
                            >
                              <Quote className="w-3 h-3" />
                              عرض سعر
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {topSearches.length > 0 && (
                <div>
                  <SectionTitle icon={Search} title="أكثر كلمات البحث تكرارًا" count={topSearches.length} />
                  <div className="space-y-2 mt-3">
                    {topSearches.map((ts, idx) => (
                      <div
                        key={ts.query}
                        className="flex items-center justify-between gap-3 p-3 rounded-lg bg-muted/40 hover:bg-muted/70 transition flex-wrap"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <span className="w-7 h-7 rounded-lg bg-blue-100 dark:bg-blue-950/50 text-blue-700 dark:text-blue-400 flex items-center justify-center text-xs font-black shrink-0">
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-foreground truncate">"{ts.query}"</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">بحث {ts.count}×</p>
                          </div>
                        </div>
                        <div className="flex gap-1.5 shrink-0">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 gap-1 text-xs"
                            onClick={() => window.open(`/products?search=${encodeURIComponent(ts.query)}`, "_blank")}
                          >
                            <Search className="w-3 h-3" />
                            عرض النتائج
                          </Button>
                          <Button
                            size="sm"
                            className="h-8 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => window.open(buildQuoteWhatsApp(ts.query), "_blank")}
                          >
                            <Quote className="w-3 h-3" />
                            عرض سعر
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {visits.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-20 text-center">
              <div className="w-16 h-16 mx-auto rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Globe className="w-8 h-8 text-muted-foreground" />
              </div>
              <p className="text-base font-bold text-foreground">لا يوجد نشاط مسجّل بعد</p>
              <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
                لم يفتح هذا الزائر أي صفحة بعد. سيبدأ التسجيل تلقائياً مع أول صفحة يدخلها.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Unified Activity Timeline — combines ALL events */}
            {unifiedTimeline.length > 0 && (
              <Card id="section-timeline" className="border-primary/30 shadow-xl overflow-hidden scroll-mt-24 rounded-2xl">
                <CardHeader className="pb-4 bg-gradient-to-l from-primary/10 via-primary/5 to-transparent border-b">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                        <Layers className="w-5 h-5 text-primary" />
                      </div>
                      السجل الموحَّد لكل النشاط
                      <Badge variant="secondary" className="text-[10px]">{unifiedTimeline.length}</Badge>
                    </CardTitle>
                    <div className="flex flex-wrap gap-1.5 text-[10px]">
                      <Badge variant="outline" className="gap-1"><Globe className="w-2.5 h-2.5" />{sessions.length} جلسة</Badge>
                      <Badge variant="outline" className="gap-1"><Search className="w-2.5 h-2.5" />{searches.length} بحث</Badge>
                      <Badge variant="outline" className="gap-1"><CheckCircle2 className="w-2.5 h-2.5" />{comms.length} تواصل</Badge>
                      <Badge variant="outline" className="gap-1"><StickyNote className="w-2.5 h-2.5" />{notes.length} ملاحظة</Badge>
                      <Badge variant="outline" className="gap-1"><ShoppingCart className="w-2.5 h-2.5" />{orders.length} طلب</Badge>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2 mr-11">
                    كل زيارة وكل بحث وكل اتصال وكل ملاحظة وكل طلب — مرتّبين زمنياً في خط واحد.
                  </p>
                </CardHeader>
                <CardContent className="pt-4">
                  <div className="relative pr-4 border-r-2 border-dashed border-border space-y-3 max-h-[600px] overflow-y-auto">
                    {unifiedTimeline.map((evt) => {
                      const Icon = evt.icon;
                      return (
                        <div key={evt.id} className="relative">
                          <div className={`absolute -right-[26px] top-2 w-9 h-9 rounded-full border-2 flex items-center justify-center ${evt.color}`}>
                            <Icon className="w-4 h-4" />
                          </div>
                          <div className="mr-6 p-3 rounded-lg bg-muted/40 border border-border hover:bg-muted/60 transition">
                            <div className="flex items-start justify-between gap-2 flex-wrap">
                              <span className="font-bold text-sm text-foreground">{evt.title}</span>
                              <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-5 shrink-0">
                                {fmtRelativeShort(evt.at)}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-1.5 text-[11px] text-muted-foreground flex-wrap">
                              <span className="inline-flex items-center gap-1">
                                <span className="opacity-70">📅</span>
                                <span className="font-medium text-foreground/75">{fmtFullDate(evt.at)}</span>
                              </span>
                              <span className="inline-flex items-center gap-1 font-mono">
                                <span className="opacity-70">🕐</span>
                                <span className="font-medium text-foreground/75">{fmtFullTime(evt.at)}</span>
                              </span>
                            </div>
                            {evt.detail && (
                              <p className="text-xs text-muted-foreground mt-2 whitespace-pre-wrap leading-relaxed">{evt.detail}</p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Latest Session — main highlight */}
            {lastSession && (
              <Card id="section-latest-session" className="border-primary/20 shadow-lg overflow-hidden scroll-mt-24 rounded-2xl">
                <CardHeader className="pb-4 bg-gradient-to-l from-primary/8 via-primary/4 to-transparent border-b">
                  <div className="flex items-start justify-between flex-wrap gap-3">
                    <div>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-primary" />
                        </div>
                        أحدث جلسة
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mt-2 mr-11">
                        {fmtDateTime(lastSession.start)}
                      </p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="secondary" className="gap-1.5 px-2.5 py-1">
                        <FileText className="w-3 h-3" />
                        {lastSession.pages.length} صفحة
                      </Badge>
                      <Badge variant="secondary" className="gap-1.5 px-2.5 py-1">
                        <Timer className="w-3 h-3" />
                        {fmtDuration(lastSession.durationMs)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-5 space-y-6">
                  {/* Quick session insights */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                    <InsightChip
                      icon={MousePointerClick}
                      label="بدأ من"
                      value={friendlyPath(lastSession.pages[0].path)}
                      tone="blue"
                    />
                    <InsightChip
                      icon={TrendingUp}
                      label="آخر صفحة"
                      value={friendlyPath(lastSession.pages[lastSession.pages.length - 1].path)}
                      tone="purple"
                    />
                    <InsightChip
                      icon={lastSessionSearches.length > 0 ? Search : ShoppingBag}
                      label={lastSessionSearches.length > 0 ? "أهم بحث" : "نشاط الأسعار"}
                      value={lastSessionSearches[0]?.search_query || (lastSessionPriceViews.length > 0 ? `${lastSessionPriceViews.length} منتج` : "بدون")}
                      tone="orange"
                    />
                  </div>

                  {/* Pages timeline */}
                  <div id="section-pages" className="scroll-mt-24 rounded-xl">
                    <SectionTitle icon={FileText} title="رحلة الصفحات" count={lastSession.pages.length} />
                    <ol className="relative border-r-2 border-primary/15 pr-5 mt-3 space-y-2">
                      {lastSession.pages.map((p, idx) => (
                        <li key={p.id} className="relative">
                          <span className="absolute -right-[26px] top-3 w-3.5 h-3.5 rounded-full bg-primary ring-4 ring-primary/15 shadow" />
                          <div className="bg-muted/40 hover:bg-muted/70 rounded-lg p-3 transition group">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                              <p className="font-bold text-sm flex items-center gap-2">
                                <span className="text-[10px] font-mono text-muted-foreground bg-background rounded px-1.5 py-0.5">#{idx + 1}</span>
                                {friendlyPath(p.path)}
                              </p>
                              <span className="text-[11px] text-muted-foreground font-mono shrink-0">{fmtTime(p.visited_at)}</span>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-1 break-all font-mono opacity-70 group-hover:opacity-100">{p.path}</p>
                          </div>
                        </li>
                      ))}
                    </ol>
                  </div>

                  {/* Searches */}
                  {lastSessionSearches.length > 0 && (
                    <>
                      <Separator />
                      <div id="section-searches" className="scroll-mt-24 rounded-xl">
                        <SectionTitle icon={Search} title="عمليات البحث" count={lastSessionSearches.length} />
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {lastSessionSearches.map((s) => (
                            <Badge key={s.id} variant="outline" className="gap-1.5 text-xs px-2.5 py-1.5 border-orange-200 bg-orange-50 text-orange-700 dark:bg-orange-950/30 dark:text-orange-400 dark:border-orange-900/50">
                              <Search className="w-3 h-3" />
                              "{s.search_query}"
                              {s.results_count !== null && (
                                <span className="text-[10px] opacity-70 mr-1">({s.results_count})</span>
                              )}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Price views */}
                  {lastSessionPriceViews.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <SectionTitle icon={ShoppingBag} title="منتجات شاف سعرها" count={lastSessionPriceViews.length} />
                        <div className="space-y-1.5 mt-3">
                          {lastSessionPriceViews.map((v) => {
                            const prod = productMap.get(v.product_id);
                            return (
                              <div key={v.id} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-muted/40 hover:bg-muted/70 transition">
                                <div className="flex-1 min-w-0">
                                  <p className="font-bold text-foreground truncate">{prod?.name_ar || "منتج"}</p>
                                  {prod?.sku && <p className="text-[10px] text-muted-foreground font-mono mt-0.5">SKU: {prod.sku}</p>}
                                </div>
                                <span className="text-[10px] text-muted-foreground shrink-0 ms-2 font-mono">{fmtTime(v.viewed_at)}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </>
                  )}

                  {lastSessionSearches.length === 0 && lastSessionPriceViews.length === 0 && (
                    <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-center">
                      <p className="text-xs text-muted-foreground">
                        💡 الزائر تصفح صفحات فقط بدون بحث أو مشاهدة أسعار خلال هذه الجلسة.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Previous sessions */}
            {sessions.length > 1 && (
              <Card id="section-sessions" className="scroll-mt-24 rounded-2xl">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <History className="w-5 h-5 text-muted-foreground" />
                    الجلسات السابقة
                    <Badge variant="secondary" className="text-xs">{sessions.length - 1}</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {sessions.slice(1, 11).map((s, idx) => (
                    <details key={idx} className="group rounded-lg bg-muted/30 hover:bg-muted/60 transition">
                      <summary className="cursor-pointer p-3 flex items-center justify-between flex-wrap gap-2 text-sm list-none">
                        <span className="font-bold flex items-center gap-2">
                          <span className="w-6 h-6 rounded-md bg-background flex items-center justify-center text-[10px] font-mono text-muted-foreground">{idx + 2}</span>
                          {fmtDateTime(s.start)}
                        </span>
                        <div className="flex gap-1.5">
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <FileText className="w-2.5 h-2.5" />
                            {s.pages.length}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] gap-1">
                            <Timer className="w-2.5 h-2.5" />
                            {fmtDuration(s.durationMs)}
                          </Badge>
                        </div>
                      </summary>
                      <div className="px-3 pb-3 space-y-1">
                        {s.pages.map((p) => (
                          <div key={p.id} className="text-xs flex items-center justify-between gap-2 p-2 rounded bg-background/60">
                            <span className="truncate">{friendlyPath(p.path)}</span>
                            <span className="text-[10px] text-muted-foreground font-mono shrink-0">{fmtTime(p.visited_at)}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        )}

        {/* Communications Log — سجل التواصل لمنع التكرار */}
        {comms.length > 0 && (
          <Card id="section-comms" className="border-blue-200/60 dark:border-blue-900/40 shadow-md overflow-hidden scroll-mt-24 rounded-2xl">
            <CardHeader className="pb-3 bg-gradient-to-l from-blue-500/10 via-blue-500/5 to-transparent border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="w-9 h-9 rounded-xl bg-blue-500/15 flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                سجل التواصل مع العميل
                <Badge variant="secondary" className="text-[10px]">{comms.length}</Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1.5 mr-11">
                كل تعامل سابق مع العميل مسجّل هنا — لمنع تكرار نفس الخطوة من موظف آخر.
              </p>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
              {comms.map((c) => {
                const meta = COMM_TYPES[c.comm_type] || COMM_TYPES.other;
                const Icon = meta.icon;
                const isMine = c.staff_user_id === user?.id;
                return (
                  <div
                    key={c.id}
                    className={`p-3 rounded-lg border transition ${
                      isMine
                        ? "bg-blue-500/5 border-blue-500/20 hover:bg-blue-500/10"
                        : "bg-muted/40 border-border hover:bg-muted/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 text-[11px] flex-wrap">
                        <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
                        <span className="font-bold text-foreground">{meta.label}</span>
                        <span className="text-muted-foreground">•</span>
                        <UserIcon className="w-3 h-3 text-muted-foreground" />
                        <span className="font-bold text-muted-foreground">{c.staff_name}</span>
                        {isMine && <Badge variant="outline" className="text-[9px] h-4 px-1 border-blue-500/40 text-blue-600">أنت</Badge>}
                      </div>
                      <span className="text-[11px] text-muted-foreground font-mono">{fmtDateTime(c.created_at)}</span>
                    </div>
                    {c.note && (
                      <p className="text-sm text-foreground mt-2 whitespace-pre-wrap leading-relaxed">{c.note}</p>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Saved Notes */}
        {notes.length > 0 && (
          <Card id="section-notes" className="border-amber-200/60 dark:border-amber-900/40 shadow-md overflow-hidden scroll-mt-24 rounded-2xl">
            <CardHeader className="pb-3 bg-gradient-to-l from-amber-500/10 via-amber-500/5 to-transparent border-b">
              <CardTitle className="flex items-center gap-2 text-base">
                <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center">
                  <StickyNote className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                </div>
                ملاحظات الفريق
                <Badge variant="secondary" className="text-[10px]">{notes.length}</Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1.5 mr-11">
                سجل المتابعات والمكالمات — يمكنك تعديل أو حذف ملاحظاتك التي أضفتها.
              </p>
            </CardHeader>
            <CardContent className="pt-4 space-y-2">
              {notes.map((n) => {
                const isMine = n.staff_user_id === user?.id;
                const canManage = isMine || isAdmin;
                return (
                  <div
                    key={n.id}
                    className={`group p-3 rounded-lg border transition ${
                      isMine
                        ? "bg-primary/5 border-primary/20 hover:bg-primary/10"
                        : "bg-muted/40 border-border hover:bg-muted/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                        <UserIcon className="w-3 h-3" />
                        <span className="font-bold">{n.staff_name}</span>
                        {isMine && <Badge variant="outline" className="text-[9px] h-4 px-1 border-primary/40 text-primary">أنت</Badge>}
                        <span>•</span>
                        <span className="font-mono">{fmtDateTime(n.created_at)}</span>
                      </div>
                      {canManage && (
                        <div className="flex gap-1 opacity-60 group-hover:opacity-100 transition">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0"
                            onClick={() => openEditNote(n)}
                            disabled={!isMine}
                            title={isMine ? "تعديل" : "فقط صاحب الملاحظة يمكنه تعديلها"}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => deleteNote(n.id)}
                            disabled={deletingNoteId === n.id}
                            title="حذف"
                          >
                            {deletingNoteId === n.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </div>
                      )}
                    </div>
                    <p className="text-sm text-foreground mt-2 whitespace-pre-wrap leading-relaxed">{n.note}</p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        <div className="text-center pt-4 pb-24">
          <Link to="/admin" className="text-xs text-muted-foreground hover:text-primary underline">
            ← الرجوع إلى لوحة الإدارة
          </Link>
          <p className="text-[10px] text-muted-foreground/60 mt-2 font-mono">UID: {userId}</p>
        </div>
      </div>

      {/* Sticky Action Bar — اتصال / واتساب / تواصل / ملاحظة */}
      <div className="fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-xl border-t border-border shadow-2xl">
        {lastComm && (
          <div className="max-w-6xl mx-auto px-3 pt-2">
            <div className="flex items-center gap-2 text-[11px] bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded-lg px-3 py-1.5 flex-wrap">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
              <span className="font-bold">
                آخر تواصل: {COMM_TYPES[lastComm.comm_type]?.label || lastComm.comm_type}
              </span>
              <span className="opacity-80">• {lastComm.staff_name}</span>
              <span className="opacity-70 ms-auto font-mono">{fmtDateTime(lastComm.created_at)}</span>
            </div>
          </div>
        )}
        <div className="max-w-6xl mx-auto px-3 py-2.5 grid grid-cols-2 md:grid-cols-4 gap-2">
          <Button
            onClick={callPhone}
            disabled={!profile?.phone}
            className="h-12 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-md"
          >
            <Phone className="w-5 h-5" />
            اتصال
          </Button>
          <Button
            onClick={openWhatsApp}
            disabled={!profile?.phone}
            className="h-12 gap-2 bg-green-600 hover:bg-green-700 text-white font-bold shadow-md"
          >
            <MessageCircle className="w-5 h-5" />
            واتساب
          </Button>
          <Button
            onClick={() => setCommOpen(true)}
            className="h-12 gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-md"
          >
            <CheckCircle2 className="w-5 h-5" />
            تسجيل تواصل
          </Button>
          <Button
            onClick={() => setNoteOpen(true)}
            variant="outline"
            className="h-12 gap-2 border-2 border-primary/40 text-primary hover:bg-primary/10 font-bold"
          >
            <StickyNote className="w-5 h-5" />
            تسجيل ملاحظة
          </Button>
        </div>
      </div>

      {/* Quick Note Dialog */}
      <Dialog
        open={noteOpen}
        onOpenChange={(open) => {
          setNoteOpen(open);
          if (!open) {
            setEditingNoteId(null);
            setNoteText("");
          }
        }}
      >
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {editingNoteId ? <Pencil className="w-5 h-5 text-primary" /> : <StickyNote className="w-5 h-5 text-primary" />}
              {editingNoteId
                ? "تعديل الملاحظة"
                : `تسجيل ملاحظة عن ${profile?.full_name || "العميل"}`}
            </DialogTitle>
          </DialogHeader>
          <Textarea
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            placeholder="اكتب تفاصيل المكالمة، اهتمامات العميل، أو خطوة المتابعة القادمة..."
            rows={5}
            className="resize-none"
            autoFocus
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setNoteOpen(false); setEditingNoteId(null); setNoteText(""); }} disabled={savingNote}>
              إلغاء
            </Button>
            <Button onClick={saveNote} disabled={!noteText.trim() || savingNote} className="gap-2">
              {savingNote ? <Loader2 className="w-4 h-4 animate-spin" /> : (editingNoteId ? <Pencil className="w-4 h-4" /> : <StickyNote className="w-4 h-4" />)}
              {editingNoteId ? "حفظ التعديلات" : "حفظ الملاحظة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Communication Log Dialog */}
      <Dialog
        open={commOpen}
        onOpenChange={(open) => {
          setCommOpen(open);
          if (!open) {
            setCommNote("");
            setCommType("phone");
          }
        }}
      >
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-blue-600" />
              تسجيل تواصل مع {profile?.full_name || "العميل"}
            </DialogTitle>
            <p className="text-xs text-muted-foreground mt-1">
              سجّل تعاملك مع العميل عشان باقي الفريق يعرف وما يكررش نفس الخطوة.
            </p>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1.5 block">نوع التواصل</label>
              <Select value={commType} onValueChange={setCommType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(COMM_TYPES).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1.5 block">ملاحظة (اختياري)</label>
              <Textarea
                value={commNote}
                onChange={(e) => setCommNote(e.target.value)}
                placeholder="نتيجة التواصل، اهتمام العميل، أو خطوة المتابعة..."
                rows={4}
                maxLength={500}
                className="resize-none"
              />
              <p className="text-[10px] text-muted-foreground mt-1 text-left">{commNote.length}/500</p>
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => { setCommOpen(false); setCommNote(""); setCommType("phone"); }}
              disabled={savingComm}
            >
              إلغاء
            </Button>
            <Button
              onClick={saveCommunication}
              disabled={savingComm}
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              {savingComm ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              تسجيل التواصل
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {focusedSection && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2 rounded-full bg-primary text-primary-foreground shadow-2xl border border-primary-foreground/20 px-4 py-2">
            <span className="w-2 h-2 rounded-full bg-primary-foreground animate-pulse" />
            <span className="text-xs font-bold">وضع التركيز مُفعّل</span>
            <button
              onClick={clearFocus}
              className="ml-1 rounded-full bg-primary-foreground/15 hover:bg-primary-foreground/25 px-3 py-1 text-[11px] font-bold transition"
            >
              ✕ إنهاء التركيز
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, valueText, sub, color, onClick, emptyHint }: { icon: any; label: string; value?: number; valueText?: string; sub?: string; color: string; onClick?: () => void; emptyHint?: string }) {
  const map: Record<string, string> = {
    blue: "from-blue-500/15 to-blue-500/5 text-blue-700 dark:text-blue-400 border-blue-200/60 dark:border-blue-900/40",
    purple: "from-purple-500/15 to-purple-500/5 text-purple-700 dark:text-purple-400 border-purple-200/60 dark:border-purple-900/40",
    orange: "from-orange-500/15 to-orange-500/5 text-orange-700 dark:text-orange-400 border-orange-200/60 dark:border-orange-900/40",
    emerald: "from-emerald-500/15 to-emerald-500/5 text-emerald-700 dark:text-emerald-400 border-emerald-200/60 dark:border-emerald-900/40",
  };
  const interactive = !!onClick;
  const isEmpty = !!emptyHint;
  return (
    <div
      onClick={onClick}
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={interactive ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick?.(); } } : undefined}
      className={`rounded-2xl p-4 border bg-gradient-to-br ${map[color]} shadow-sm transition ${interactive ? "cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current/40" : "hover:shadow-md"} ${isEmpty ? "opacity-80" : ""}`}
    >
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-5 h-5" />
        {interactive && !isEmpty && <span className="text-[9px] opacity-60 font-bold">اضغط للتفاصيل ↓</span>}
      </div>
      <p className="text-2xl md:text-3xl font-black leading-none">{valueText ?? value ?? 0}</p>
      <p className="text-[11px] mt-2 font-bold opacity-90">{label}</p>
      {isEmpty ? (
        <div className="mt-2 rounded-lg bg-background/60 dark:bg-background/30 border border-current/10 px-2 py-1.5 text-[10px] font-bold opacity-90 flex items-center gap-1">
          <span className="text-base leading-none">🚫</span>
          <span>{emptyHint}</span>
        </div>
      ) : (
        sub && <p className="text-[10px] mt-1 opacity-70">{sub}</p>
      )}
    </div>
  );
}

function SectionTitle({ icon: Icon, title, count }: { icon: any; title: string; count?: number }) {
  return (
    <h3 className="text-sm font-black flex items-center gap-2 text-foreground">
      <Icon className="w-4 h-4 text-primary" />
      {title}
      {typeof count === "number" && <Badge variant="secondary" className="text-[10px] h-5">{count}</Badge>}
    </h3>
  );
}

function InsightChip({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: string }) {
  const map: Record<string, string> = {
    blue: "bg-blue-50 text-blue-900 dark:bg-blue-950/30 dark:text-blue-300 border-blue-100 dark:border-blue-900/40",
    purple: "bg-purple-50 text-purple-900 dark:bg-purple-950/30 dark:text-purple-300 border-purple-100 dark:border-purple-900/40",
    orange: "bg-orange-50 text-orange-900 dark:bg-orange-950/30 dark:text-orange-300 border-orange-100 dark:border-orange-900/40",
  };
  return (
    <div className={`rounded-xl border p-3 ${map[tone]}`}>
      <div className="flex items-center gap-1.5 text-[10px] font-bold opacity-80 mb-1">
        <Icon className="w-3 h-3" />
        {label}
      </div>
      <p className="text-xs font-black truncate" title={value}>{value}</p>
    </div>
  );
}
