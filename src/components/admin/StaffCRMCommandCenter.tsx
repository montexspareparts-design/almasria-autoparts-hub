import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  Flame, Search, UserCheck, Users, Trophy, Phone, Eye,
  CheckCircle2, Clock, Building2, ShoppingBag, Loader2, RefreshCw, Briefcase, Activity, Bot, MessageSquare, ExternalLink, Mail, AlertTriangle, Download
} from "lucide-react";
import { Link } from "react-router-dom";
import WhatsAppQuickChat from "./WhatsAppQuickChat";
import CustomerActivitySummary from "./CustomerActivitySummary";
import SupportRequestAISummary from "./SupportRequestAISummary";
import TransferToColleagueDialog from "./TransferToColleagueDialog";
import PerfDashboard from "./PerfDashboard";
import { usePerfTracker } from "@/hooks/usePerfTracker";
import { ArrowRightLeft } from "lucide-react";

// =================== Types ===================
interface UrgentOrder {
  id: string;
  order_number: string;
  total_amount: number;
  created_at: string;
  user_id: string;
  customer_name: string;
  customer_phone: string | null;
  is_dealer: boolean;
  minutes_ago: number;
}
interface SearchLead {
  user_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  search_count: number;
  last_search: string;
  last_query: string;
  is_dealer: boolean;
}
interface YesterdayCustomer {
  user_id: string;
  name: string;
  phone: string | null;
  last_seen: string;
  page_views: number;
  is_dealer: boolean;
}
interface StaffStat {
  user_id: string;
  name: string;
  contacts_today: number;
  orders_handled: number;
}
interface SupportReq {
  id: string;
  user_id: string | null;
  customer_name: string | null;
  customer_phone: string | null;
  message: string | null;
  request_type: string;
  is_dealer: boolean;
  created_at: string;
  minutes_ago: number;
  status: string;
  claimed_by: string | null;
  claimed_by_name: string | null;
  claimed_at: string | null;
}

// =================== Helpers ===================
const minutesBetween = (iso: string) => Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
const fmtMinutes = (m: number) => {
  if (m < 60) return `${m}د`;
  if (m < 1440) return `${Math.floor(m / 60)}س ${m % 60}د`;
  return `${Math.floor(m / 1440)}ي`;
};

interface Props {
  onNavigate?: (section: string) => void;
}

export default function StaffCRMCommandCenter({ onNavigate }: Props) {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [tab, setTab] = useState<"urgent" | "chatbot" | "search" | "yesterday" | "leaderboard">("urgent");
  const [segmentFilter, setSegmentFilter] = useState<"all" | "b2b" | "b2c">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [badgesEnabled, setBadgesEnabled] = useState(true);
  const [perfPanelOpen, setPerfPanelOpen] = useState(false);

  // Performance tracker — يقيس mount, renders, badges, tab switches
  const perf = usePerfTracker({
    componentName: "StaffCRMCommandCenter",
    badgesEnabled,
    activeTab: tab,
  });

  // Data
  const [urgentOrders, setUrgentOrders] = useState<UrgentOrder[]>([]);
  const [searchLeads, setSearchLeads] = useState<SearchLead[]>([]);
  const [yesterdayCustomers, setYesterdayCustomers] = useState<YesterdayCustomer[]>([]);
  const [staffLeaderboard, setStaffLeaderboard] = useState<StaffStat[]>([]);
  const [contactedToday, setContactedToday] = useState<Set<string>>(new Set());
  const [supportRequests, setSupportRequests] = useState<SupportReq[]>([]);
  const [summaryUser, setSummaryUser] = useState<{ id: string; name: string; phone: string | null; isDealer: boolean } | null>(null);
  const [aiSummaryReq, setAiSummaryReq] = useState<{ id: string; name: string | null } | null>(null);
  const [transferReq, setTransferReq] = useState<{ id: string; name: string | null } | null>(null);

  // =================== Fetch ===================
  const fetchAll = async () => {
    setRefreshing(true);
    try {
      const today = new Date().toISOString().slice(0, 10);
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
      const last48h = new Date(Date.now() - 48 * 3600 * 1000).toISOString();

      // 1) Urgent orders (no first_contacted_at, recent or pending)
      const { data: orders } = await supabase
        .from("orders")
        .select("id, order_number, total_amount, created_at, user_id, first_contacted_at, status")
        .is("first_contacted_at", null)
        .in("status", ["pending", "confirmed", "awaiting_payment"])
        .gte("created_at", last48h)
        .order("created_at", { ascending: false })
        .limit(50);

      const urgentList: UrgentOrder[] = [];
      if (orders && orders.length > 0) {
        const userIds = [...new Set(orders.map((o: any) => o.user_id))];
        const [{ data: profiles }, { data: dealers }] = await Promise.all([
          supabase.from("profiles").select("user_id, full_name, phone").in("user_id", userIds),
          supabase.from("dealer_accounts").select("user_id").in("user_id", userIds).eq("is_active", true),
        ]);
        const dealerSet = new Set((dealers || []).map((d: any) => d.user_id));
        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        for (const o of orders as any[]) {
          const p = profileMap.get(o.user_id) as any;
          urgentList.push({
            id: o.id,
            order_number: o.order_number,
            total_amount: Number(o.total_amount),
            created_at: o.created_at,
            user_id: o.user_id,
            customer_name: p?.full_name || "عميل",
            customer_phone: p?.phone || null,
            is_dealer: dealerSet.has(o.user_id),
            minutes_ago: minutesBetween(o.created_at),
          });
        }
      }
      setUrgentOrders(urgentList);

      // 2) Search leads (5+ searches, 0 orders, in last 7 days)
      const last7d = new Date(Date.now() - 7 * 86400000).toISOString();
      const { data: searches } = await supabase
        .from("customer_search_logs")
        .select("user_id, search_query, created_at")
        .not("user_id", "is", null)
        .gte("created_at", last7d)
        .order("created_at", { ascending: false })
        .limit(500);

      const searchMap: Record<string, { count: number; last: string; query: string }> = {};
      for (const s of searches || []) {
        const uid = s.user_id as string;
        if (!searchMap[uid]) {
          searchMap[uid] = { count: 1, last: s.created_at, query: s.search_query };
        } else {
          searchMap[uid].count++;
        }
      }

      const searchUserIds = Object.entries(searchMap)
        .filter(([, v]) => v.count >= 3)
        .map(([uid]) => uid);

      const searchLeadsList: SearchLead[] = [];
      if (searchUserIds.length > 0) {
        const [{ data: ordersForUsers }, { data: profiles }, { data: dealers }] = await Promise.all([
          supabase.from("orders").select("user_id").in("user_id", searchUserIds),
          supabase.from("profiles").select("user_id, full_name, phone, email").in("user_id", searchUserIds),
          supabase.from("dealer_accounts").select("user_id").in("user_id", searchUserIds),
        ]);
        const usersWithOrders = new Set((ordersForUsers || []).map((o: any) => o.user_id));
        const dealerSet = new Set((dealers || []).map((d: any) => d.user_id));
        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

        for (const uid of searchUserIds) {
          if (usersWithOrders.has(uid)) continue;
          const p = profileMap.get(uid) as any;
          if (!p) continue;
          const sd = searchMap[uid];
          searchLeadsList.push({
            user_id: uid,
            name: p.full_name || p.email || "عميل",
            phone: p.phone || null,
            email: p.email || null,
            search_count: sd.count,
            last_search: sd.last,
            last_query: sd.query,
            is_dealer: dealerSet.has(uid),
          });
        }
        searchLeadsList.sort((a, b) => b.search_count - a.search_count);
      }
      setSearchLeads(searchLeadsList);

      // 3) Yesterday customers (visited yesterday, not contacted today)
      const { data: sessions } = await supabase
        .from("customer_sessions")
        .select("user_id, last_seen_at, page_views")
        .eq("session_date", yesterday)
        .order("last_seen_at", { ascending: false })
        .limit(100);

      const yesterdayList: YesterdayCustomer[] = [];
      if (sessions && sessions.length > 0) {
        const userIds = [...new Set(sessions.map((s: any) => s.user_id))];
        const [{ data: profiles }, { data: dealers }] = await Promise.all([
          supabase.from("profiles").select("user_id, full_name, phone").in("user_id", userIds),
          supabase.from("dealer_accounts").select("user_id").in("user_id", userIds),
        ]);
        const dealerSet = new Set((dealers || []).map((d: any) => d.user_id));
        const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));
        for (const s of sessions as any[]) {
          const p = profileMap.get(s.user_id) as any;
          if (!p) continue;
          yesterdayList.push({
            user_id: s.user_id,
            name: p.full_name || "عميل",
            phone: p.phone || null,
            last_seen: s.last_seen_at,
            page_views: s.page_views,
            is_dealer: dealerSet.has(s.user_id),
          });
        }
      }
      setYesterdayCustomers(yesterdayList);

      // 4) Contact marks for today
      const { data: marks } = await supabase
        .from("staff_contact_marks")
        .select("customer_user_id")
        .eq("marked_date", today);
      setContactedToday(new Set((marks || []).map((m: any) => m.customer_user_id)));

      // 4b) Active support requests from chatbot (pending OR claimed but not yet resolved)
      const { data: supportRows } = await (supabase as any)
        .from("support_requests")
        .select("id, user_id, customer_name, customer_phone, message, request_type, is_dealer, created_at, status, claimed_by, claimed_at")
        .in("status", ["pending", "in_progress"])
        .order("created_at", { ascending: false })
        .limit(50);

      // Resolve names for claimed_by
      const claimedIds = [...new Set(((supportRows || []) as any[]).map((r) => r.claimed_by).filter(Boolean))];
      let staffNameMap = new Map<string, string>();
      if (claimedIds.length > 0) {
        const { data: staffProfs } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", claimedIds);
        staffNameMap = new Map((staffProfs || []).map((p: any) => [p.user_id, p.full_name || p.email || "موظف"]));
      }

      setSupportRequests(
        ((supportRows || []) as any[]).map((r) => ({
          id: r.id,
          user_id: r.user_id,
          customer_name: r.customer_name,
          customer_phone: r.customer_phone,
          message: r.message,
          request_type: r.request_type,
          is_dealer: !!r.is_dealer,
          created_at: r.created_at,
          status: r.status,
          minutes_ago: minutesBetween(r.created_at),
          claimed_by: r.claimed_by || null,
          claimed_by_name: r.claimed_by ? staffNameMap.get(r.claimed_by) || "موظف" : null,
          claimed_at: r.claimed_at || null,
        }))
      );

      // 5) Leaderboard (admin only)
      if (isAdmin) {
        const { data: staffRoles } = await supabase
          .from("user_roles")
          .select("user_id")
          .in("role", ["admin", "moderator"]);
        const staffIds = [...new Set((staffRoles || []).map((r: any) => r.user_id))];
        if (staffIds.length > 0) {
          const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
          const [{ data: staffProfiles }, { data: todayMarks }, { data: comms }] = await Promise.all([
            supabase.from("profiles").select("user_id, full_name, email").in("user_id", staffIds),
            supabase.from("staff_contact_marks").select("staff_user_id").eq("marked_date", today),
            supabase.from("customer_communications").select("staff_user_id").gte("created_at", todayStart.toISOString()),
          ]);
          const profileMap = new Map((staffProfiles || []).map((p: any) => [p.user_id, p]));
          const board: StaffStat[] = staffIds.map((sid) => {
            const p = profileMap.get(sid) as any;
            const contacts = (todayMarks || []).filter((m: any) => m.staff_user_id === sid).length
              + (comms || []).filter((c: any) => c.staff_user_id === sid).length;
            return {
              user_id: sid,
              name: p?.full_name || p?.email || "موظف",
              contacts_today: contacts,
              orders_handled: 0,
            };
          });
          board.sort((a, b) => b.contacts_today - a.contacts_today);
          setStaffLeaderboard(board);
        }
      }
    } catch (err) {
      console.error("CRM fetch error:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchAll(); }, [isAdmin]);

  // Realtime subscription for support requests (INSERT new + UPDATE for claim sync)
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("crm-support-requests")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "support_requests" },
        (payload) => {
          const r = payload.new as any;
          if (r.status !== "pending") return;
          setSupportRequests((prev) => {
            if (prev.find((x) => x.id === r.id)) return prev;
            return [{
              id: r.id,
              user_id: r.user_id,
              customer_name: r.customer_name,
              customer_phone: r.customer_phone,
              message: r.message,
              request_type: r.request_type,
              is_dealer: !!r.is_dealer,
              created_at: r.created_at,
              status: r.status,
              minutes_ago: minutesBetween(r.created_at),
              claimed_by: null,
              claimed_by_name: null,
              claimed_at: null,
            }, ...prev];
          });
        }
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "support_requests" },
        async (payload) => {
          const r = payload.new as any;
          // Remove from list if resolved
          if (r.status === "resolved" || r.status === "closed") {
            setSupportRequests((prev) => prev.filter((x) => x.id !== r.id));
            return;
          }
          // Resolve claimed_by name if needed
          let claimedName: string | null = null;
          if (r.claimed_by) {
            if (r.claimed_by === user.id) {
              claimedName = "أنت";
            } else {
              const { data: prof } = await supabase
                .from("profiles")
                .select("full_name, email")
                .eq("user_id", r.claimed_by)
                .maybeSingle();
              claimedName = (prof as any)?.full_name || (prof as any)?.email || "موظف";
            }
          }
          setSupportRequests((prev) =>
            prev.map((x) =>
              x.id === r.id
                ? { ...x, status: r.status, claimed_by: r.claimed_by, claimed_by_name: claimedName, claimed_at: r.claimed_at }
                : x
            )
          );
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [user]);

  // =================== Actions ===================
  const markContacted = async (customerUserId: string, context: string) => {
    if (!user) return;
    const { error } = await supabase
      .from("staff_contact_marks")
      .insert({ customer_user_id: customerUserId, staff_user_id: user.id, context });
    if (error && !error.message.includes("duplicate")) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }
    setContactedToday((prev) => new Set([...prev, customerUserId]));
    toast({ title: "✅ تم التسجيل", description: "تمت إضافة العميل لقائمة المعالجين اليوم" });
  };

  const markOrderContacted = async (orderId: string, customerUserId: string) => {
    if (!user) return;
    await supabase.from("orders").update({ first_contacted_at: new Date().toISOString() } as any).eq("id", orderId);
    await supabase.from("staff_contact_marks")
      .insert({ customer_user_id: customerUserId, staff_user_id: user.id, context: "order" })
      .then(() => {});
    setUrgentOrders((prev) => prev.filter((o) => o.id !== orderId));
    toast({ title: "✅ تم التواصل", description: "تم تسجيل الطلب كمُتواصَل عليه" });
  };

  // Atomic claim — only succeeds if no one else has claimed it yet
  const claimSupportRequest = async (reqId: string) => {
    if (!user) return false;
    const { data, error } = await (supabase as any)
      .from("support_requests")
      .update({ claimed_by: user.id, claimed_at: new Date().toISOString(), assigned_to: user.id, status: "in_progress" })
      .eq("id", reqId)
      .is("claimed_by", null)
      .select("id")
      .maybeSingle();
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return false;
    }
    if (!data) {
      toast({ title: "⏱️ سبقك زميل!", description: "هذا الطلب تم الرد عليه بالفعل", variant: "destructive" });
      return false;
    }
    toast({ title: "🎯 الطلب لك!", description: "تم تخصيص الطلب لك. تواصل مع العميل الآن" });
    return true;
  };

  const resolveSupportRequest = async (reqId: string) => {
    if (!user) return;
    const { error } = await (supabase as any)
      .from("support_requests")
      .update({ status: "resolved", resolved_at: new Date().toISOString() })
      .eq("id", reqId);
    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      return;
    }
    setSupportRequests((prev) => prev.filter((r) => r.id !== reqId));
    toast({ title: "✅ تم الإغلاق", description: "تم إغلاق الطلب" });
  };

  // =================== Filtering ===================
  const applySegmentFilter = <T extends { is_dealer: boolean }>(arr: T[]) => {
    if (segmentFilter === "all") return arr;
    if (segmentFilter === "b2b") return arr.filter((x) => x.is_dealer);
    return arr.filter((x) => !x.is_dealer);
  };

  const applySearch = <T extends { name?: string; customer_name?: string; phone?: string | null; customer_phone?: string | null }>(arr: T[]) => {
    if (!searchQuery.trim()) return arr;
    const q = searchQuery.trim().toLowerCase();
    return arr.filter((x: any) => {
      const name = (x.name || x.customer_name || "").toLowerCase();
      const phone = (x.phone || x.customer_phone || "").toLowerCase();
      return name.includes(q) || phone.includes(q);
    });
  };

  const filteredUrgent = useMemo(() =>
    applySearch(applySegmentFilter(urgentOrders.filter((o) => !contactedToday.has(o.user_id)))),
    [urgentOrders, segmentFilter, searchQuery, contactedToday]);
  const filteredSearch = useMemo(() =>
    applySearch(applySegmentFilter(searchLeads.filter((s) => !contactedToday.has(s.user_id)))),
    [searchLeads, segmentFilter, searchQuery, contactedToday]);
  const filteredYesterday = useMemo(() =>
    applySearch(applySegmentFilter(yesterdayCustomers.filter((y) => !contactedToday.has(y.user_id)))),
    [yesterdayCustomers, segmentFilter, searchQuery, contactedToday]);
  const filteredSupport = useMemo(() => {
    let arr = supportRequests;
    if (segmentFilter === "b2b") arr = arr.filter((r) => r.is_dealer);
    else if (segmentFilter === "b2c") arr = arr.filter((r) => !r.is_dealer);
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      arr = arr.filter((r) =>
        (r.customer_name || "").toLowerCase().includes(q) ||
        (r.customer_phone || "").toLowerCase().includes(q) ||
        (r.message || "").toLowerCase().includes(q)
      );
    }
    return arr;
  }, [supportRequests, segmentFilter, searchQuery]);

  const counts = {
    urgent: filteredUrgent.length,
    chatbot: filteredSupport.length,
    search: filteredSearch.length,
    yesterday: filteredYesterday.length,
  };

  // =================== CSV Export (top customers / search leads) ===================
  const exportTopCustomersCSV = () => {
    const rows = filteredSearch;
    if (!rows || rows.length === 0) {
      toast({ title: "لا يوجد بيانات للتصدير", description: "جرّب تغيير الفلاتر أو حدّث القائمة", variant: "destructive" });
      return;
    }
    const headers = [
      "الاسم",
      "النوع",
      "رقم التليفون",
      "البريد الإلكتروني",
      "عدد عمليات البحث",
      "آخر كلمة بحث",
      "آخر نشاط",
      "سبب المتابعة",
      "رابط الملخص",
    ];
    const escape = (val: any) => {
      const s = String(val ?? "");
      if (/[",\n\r;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    };
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const lines = rows.map((s: any) => {
      const reason = s.search_count >= 10
        ? `بحث مكثّف (${s.search_count}×) بدون أي طلب — فرصة تحويل عالية`
        : `بحث ${s.search_count}× بدون شراء — يحتاج متابعة`;
      const lastActivity = new Date(s.last_search).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" });
      return [
        s.name || "",
        s.is_dealer ? "تاجر" : "قطاعي",
        s.phone || "",
        s.email || "",
        s.search_count,
        s.last_query || "",
        lastActivity,
        reason,
        `${baseUrl}/admin/visitor/${s.user_id}`,
      ].map(escape).join(",");
    });
    // UTF-8 BOM so Excel renders Arabic correctly
    const csv = "\uFEFF" + headers.map(escape).join(",") + "\n" + lines.join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `top-customers-followup-${stamp}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast({ title: "تم التصدير", description: `تم تنزيل ${rows.length} عميل في ملف CSV/Excel` });
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-12 w-full" />
        <div className="grid grid-cols-3 gap-3"><Skeleton className="h-24" /><Skeleton className="h-24" /><Skeleton className="h-24" /></div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }


  return (
    <div
      className="space-y-5 [&[data-badges-off='true']_.tab-badge]:hidden"
      data-badges-off={!badgesEnabled}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Briefcase className="w-5 h-5 text-primary" />
            مركز قيادة المتابعة
          </h2>
          <p className="text-sm text-muted-foreground">كل ما يحتاج متابعتك في مكان واحد</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant={perfPanelOpen ? "default" : "outline"}
            onClick={() => setPerfPanelOpen((s) => !s)}
            className="gap-1.5"
          >
            <Activity className="w-4 h-4" />
            الأداء
            <span className="text-[10px] font-mono opacity-80">
              {perf.mountMs}ms
            </span>
          </Button>
          <Button size="sm" variant="outline" onClick={fetchAll} disabled={refreshing} className="gap-1.5">
            {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            تحديث
          </Button>
        </div>
      </div>

      {/* Performance dashboard — قابل للطي */}
      {perfPanelOpen && (
        <PerfDashboard
          live={{
            mountMs: perf.mountMs,
            renderCount: perf.renderCount,
            badgeCount: perf.badgeCount,
            avgTabSwitchMs: perf.avgTabSwitchMs,
          }}
          badgesEnabled={badgesEnabled}
          onToggleBadges={setBadgesEnabled}
          onSnapshot={perf.takeSnapshot}
        />
      )}

      {/* Filters bar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1 rounded-lg bg-muted p-1">
          {([["all", "الكل", Users], ["b2b", "تجار", Building2], ["b2c", "قطاعي", ShoppingBag]] as const).map(([key, label, Icon]) => (
            <button
              key={key}
              onClick={() => setSegmentFilter(key as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                segmentFilter === key ? "bg-background text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="بحث بالاسم أو الموبايل..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="ps-8 h-9 text-sm"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} dir="rtl">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5 h-auto">
          <TabsTrigger value="urgent" className="flex flex-col gap-0.5 py-2.5 data-[state=active]:bg-red-50 data-[state=active]:text-red-700">
            <div className="flex items-center gap-1.5">
              <Flame className="w-4 h-4" />
              <span className="font-semibold">طلبات عاجلة</span>
            </div>
            <span className={counts.urgent > 0 ? "inline-flex h-4 items-center rounded-full border border-transparent bg-destructive px-2 text-[10px] font-semibold text-destructive-foreground" : "inline-flex h-4 items-center rounded-full border border-transparent bg-secondary px-2 text-[10px] font-semibold text-secondary-foreground"}>{counts.urgent}</span>
          </TabsTrigger>
          <TabsTrigger value="chatbot" className="flex flex-col gap-0.5 py-2.5 data-[state=active]:bg-purple-50 data-[state=active]:text-purple-700">
            <div className="flex items-center gap-1.5">
              <Bot className="w-4 h-4" />
              <span className="font-semibold">طلبات الشات بوت</span>
            </div>
            <span className={counts.chatbot > 0 ? "inline-flex h-4 items-center rounded-full border border-transparent bg-primary px-2 text-[10px] font-semibold text-primary-foreground animate-pulse" : "inline-flex h-4 items-center rounded-full border border-transparent bg-secondary px-2 text-[10px] font-semibold text-secondary-foreground"}>{counts.chatbot}</span>
          </TabsTrigger>
          <TabsTrigger value="search" className="flex flex-col gap-0.5 py-2.5 data-[state=active]:bg-orange-50 data-[state=active]:text-orange-700">
            <div className="flex items-center gap-1.5">
              <Search className="w-4 h-4" />
              <span className="font-semibold">بحث بدون شراء</span>
            </div>
            <span className="inline-flex h-4 items-center rounded-full border border-transparent bg-secondary px-2 text-[10px] font-semibold text-secondary-foreground">{counts.search}</span>
          </TabsTrigger>
          <TabsTrigger value="yesterday" className="flex flex-col gap-0.5 py-2.5 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700">
            <div className="flex items-center gap-1.5">
              <UserCheck className="w-4 h-4" />
              <span className="font-semibold">دخلوا أمس</span>
            </div>
            <span className="inline-flex h-4 items-center rounded-full border border-transparent bg-secondary px-2 text-[10px] font-semibold text-secondary-foreground">{counts.yesterday}</span>
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="leaderboard" className="flex flex-col gap-0.5 py-2.5 data-[state=active]:bg-amber-50 data-[state=active]:text-amber-700">
              <div className="flex items-center gap-1.5">
                <Trophy className="w-4 h-4" />
                <span className="font-semibold">لوحة الأداء</span>
              </div>
              <span className="inline-flex h-4 items-center rounded-full border border-transparent bg-secondary px-2 text-[10px] font-semibold text-secondary-foreground">{staffLeaderboard.length}</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* === Urgent orders === */}
        <TabsContent value="urgent" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[60vh]">
                {filteredUrgent.length === 0 ? (
                  <EmptyState icon={CheckCircle2} title="لا توجد طلبات عاجلة" subtitle="ممتاز! تم التواصل مع كل الطلبات" />
                ) : (
                  <div className="divide-y">
                    {filteredUrgent.map((o) => {
                      const isLate = o.minutes_ago >= 15;
                      return (
                        <div key={o.id} className={`p-3 hover:bg-muted/30 transition-colors ${isLate ? "bg-red-50/30" : ""}`}>
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex-1 min-w-[200px]">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-bold text-sm">{o.order_number}</span>
                                <Badge variant={o.is_dealer ? "default" : "secondary"} className="text-[10px] h-5">
                                  {o.is_dealer ? "تاجر" : "قطاعي"}
                                </Badge>
                                <Badge variant={isLate ? "destructive" : "outline"} className={`text-[10px] h-5 gap-1 ${isLate ? "animate-pulse" : ""}`}>
                                  <Clock className="w-3 h-3" />
                                  {fmtMinutes(o.minutes_ago)}
                                </Badge>
                              </div>
                              <p className="text-sm text-foreground">{o.customer_name}</p>
                              {o.customer_phone && (
                                <a href={`tel:${o.customer_phone}`} className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5">
                                  <Phone className="w-3 h-3" />
                                  {o.customer_phone}
                                </a>
                              )}
                              <p className="text-sm font-bold text-primary mt-1">
                                {Number(o.total_amount).toLocaleString("ar-EG")} ج.م
                              </p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {o.customer_phone && (
                                <>
                                  <Button asChild size="sm" variant="outline" className="h-7 gap-1 text-xs border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400">
                                    <a href={`tel:${o.customer_phone}`}>
                                      <Phone className="w-3 h-3" />
                                      اتصال
                                    </a>
                                  </Button>
                                  <WhatsAppQuickChat
                                    phone={o.customer_phone}
                                    customerName={o.customer_name}
                                    context={`بخصوص طلبك رقم ${o.order_number} بقيمة ${Number(o.total_amount).toLocaleString("ar-EG")} ج.م. هل تحب نأكد الطلب الآن؟`}
                                    size="sm"
                                  />
                                </>
                              )}
                              <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setSummaryUser({ id: o.user_id, name: o.customer_name, phone: o.customer_phone, isDealer: o.is_dealer })}>
                                <Activity className="w-3 h-3" />
                                ملخص
                              </Button>
                              <Button asChild size="sm" variant="ghost" className="h-7 w-7 p-0" title="فتح صفحة الملخص الكاملة">
                                <Link to={`/admin/visitor/${o.user_id}`} target="_blank" rel="noopener">
                                  <ExternalLink className="w-3 h-3" />
                                </Link>
                              </Button>
                              <Button size="sm" className="h-7 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => markOrderContacted(o.id, o.user_id)}>
                                <CheckCircle2 className="w-3 h-3" />
                                تم
                              </Button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Chatbot Support Requests === */}
        <TabsContent value="chatbot" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[60vh]">
                {filteredSupport.length === 0 ? (
                  <EmptyState icon={Bot} title="لا توجد طلبات تواصل من الشات بوت" subtitle="هتظهر هنا لما عميل يطلب التواصل من الشات بوت" />
                ) : (
                  <div className="divide-y">
                    {filteredSupport.map((r) => {
                      const isLate = r.minutes_ago >= 5;
                      const isClaimed = !!r.claimed_by;
                      const isMine = isClaimed && r.claimed_by === user?.id;
                      const claimedByOther = isClaimed && !isMine;
                      return (
                        <div
                          key={r.id}
                          className={`p-3 transition-colors ${
                            claimedByOther
                              ? "bg-muted/40 opacity-60"
                              : isMine
                                ? "bg-emerald-50/40 dark:bg-emerald-950/10 border-r-4 border-emerald-500"
                                : isLate
                                  ? "bg-purple-50/30 dark:bg-purple-950/10 hover:bg-muted/30"
                                  : "hover:bg-muted/30"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3 flex-wrap">
                            <div className="flex-1 min-w-[200px]">
                              <div className="flex items-center gap-2 mb-1 flex-wrap">
                                <Bot className="w-3.5 h-3.5 text-purple-600" />
                                <span className="font-bold text-sm">{r.customer_name || "عميل"}</span>
                                <Badge variant={r.is_dealer ? "default" : "secondary"} className="text-[10px] h-5">
                                  {r.is_dealer ? "تاجر" : "قطاعي"}
                                </Badge>
                                {!r.user_id && <Badge variant="outline" className="text-[10px] h-5">ضيف</Badge>}
                                <Badge variant={isLate && !isClaimed ? "destructive" : "outline"} className={`text-[10px] h-5 gap-1 ${isLate && !isClaimed ? "animate-pulse" : ""}`}>
                                  <Clock className="w-3 h-3" />
                                  {fmtMinutes(r.minutes_ago)}
                                </Badge>
                                {isMine && (
                                  <Badge className="text-[10px] h-5 gap-1 bg-emerald-600 hover:bg-emerald-600">
                                    <UserCheck className="w-3 h-3" />
                                    أنت بترد
                                  </Badge>
                                )}
                                {claimedByOther && (
                                  <Badge variant="secondary" className="text-[10px] h-5 gap-1">
                                    <UserCheck className="w-3 h-3" />
                                    {r.claimed_by_name} بيرد
                                  </Badge>
                                )}
                              </div>
                              {r.customer_phone && (
                                <a href={`tel:${r.customer_phone}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                                  <Phone className="w-3 h-3" />
                                  {r.customer_phone}
                                </a>
                              )}
                              {r.message && (
                                <p className="text-xs text-muted-foreground bg-muted/50 rounded-md p-2 mt-1.5 line-clamp-2 flex items-start gap-1">
                                  <MessageSquare className="w-3 h-3 shrink-0 mt-0.5" />
                                  <span>{r.message}</span>
                                </p>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {!isClaimed && (
                                <Button
                                  size="sm"
                                  className="h-7 gap-1 text-xs bg-primary hover:bg-primary/90 shadow-md"
                                  onClick={() => claimSupportRequest(r.id)}
                                >
                                  🎯 أنا هرد
                                </Button>
                              )}
                              {isMine && r.customer_phone && (
                                <>
                                  <Button asChild size="sm" variant="outline" className="h-7 gap-1 text-xs border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400">
                                    <a href={`tel:${r.customer_phone}`}>
                                      <Phone className="w-3 h-3" />
                                      اتصال
                                    </a>
                                  </Button>
                                  <WhatsAppQuickChat
                                    phone={r.customer_phone}
                                    customerName={r.customer_name || undefined}
                                    context="استلمنا طلبك للتواصل من خلال المساعد الذكي. كيف نقدر نساعدك؟"
                                    size="sm"
                                  />
                                </>
                              )}
                              {isMine && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 gap-1 text-xs border-purple-300 text-purple-700 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400"
                                  onClick={() => setAiSummaryReq({ id: r.id, name: r.customer_name })}
                                >
                                  <Bot className="w-3 h-3" />
                                  ملخص AI
                                </Button>
                              )}
                              {isMine && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 gap-1 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400"
                                  onClick={() => setTransferReq({ id: r.id, name: r.customer_name })}
                                >
                                  <ArrowRightLeft className="w-3 h-3" />
                                  تحويل لزميل
                                </Button>
                              )}
                              {isMine && r.user_id && (
                                <>
                                  <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setSummaryUser({ id: r.user_id!, name: r.customer_name || "عميل", phone: r.customer_phone, isDealer: r.is_dealer })}>
                                    <Activity className="w-3 h-3" />
                                    نشاط العميل
                                  </Button>
                                  <Button asChild size="sm" variant="ghost" className="h-7 w-7 p-0" title="فتح صفحة الملخص الكاملة">
                                    <Link to={`/admin/visitor/${r.user_id}`} target="_blank" rel="noopener">
                                      <ExternalLink className="w-3 h-3" />
                                    </Link>
                                  </Button>
                                </>
                              )}
                              {isMine && (
                                <Button size="sm" className="h-7 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => resolveSupportRequest(r.id)}>
                                  <CheckCircle2 className="w-3 h-3" />
                                  تم الرد
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Search leads === */}
        <TabsContent value="search" className="mt-4">
          <Card>
            <div className="flex items-center justify-between gap-2 p-3 border-b bg-muted/20">
              <div className="text-xs text-muted-foreground">
                {filteredSearch.length > 0
                  ? `${filteredSearch.length} عميل مرشح للمتابعة`
                  : "لا يوجد عملاء حالياً"}
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={exportTopCustomersCSV}
                disabled={filteredSearch.length === 0}
                className="h-8 gap-1.5 text-xs border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-400"
              >
                <Download className="w-3.5 h-3.5" />
                تصدير CSV / Excel
              </Button>
            </div>
            <CardContent className="p-0">
              <ScrollArea className="h-[60vh]">
                {filteredSearch.length === 0 ? (
                  <EmptyState icon={Search} title="لا يوجد عملاء للمتابعة" subtitle="لم نجد عملاء بحثوا بدون شراء" />
                ) : (
                  <div className="divide-y">
                    {filteredSearch.map((s) => (
                      <div key={s.user_id} className="p-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex-1 min-w-[200px]">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-sm">{s.name}</span>
                              <Badge variant={s.is_dealer ? "default" : "secondary"} className="text-[10px] h-5">
                                {s.is_dealer ? "تاجر" : "قطاعي"}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] h-5 text-orange-600 border-orange-300">
                                <Search className="w-3 h-3 me-0.5" />
                                {s.search_count} بحث
                              </Badge>
                            </div>
                            {s.phone ? (
                              <a href={`tel:${s.phone}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {s.phone}
                              </a>
                            ) : s.email ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <a href={`mailto:${s.email}`} className="text-xs text-blue-700 dark:text-blue-400 hover:underline flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {s.email}
                                </a>
                                <Badge variant="outline" className="text-[10px] h-5 text-amber-700 border-amber-400 bg-amber-50 dark:bg-amber-950/30">
                                  <AlertTriangle className="w-3 h-3 me-0.5" />
                                  لا يوجد رقم تليفون
                                </Badge>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-[10px] h-5 text-red-700 border-red-400 bg-red-50 dark:bg-red-950/30">
                                <AlertTriangle className="w-3 h-3 me-0.5" />
                                لا توجد بيانات تواصل
                              </Badge>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              آخر بحث: <span className="font-medium text-foreground">"{s.last_query}"</span>
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {s.phone && (
                              <>
                                <Button asChild size="sm" variant="outline" className="h-7 gap-1 text-xs border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400">
                                  <a href={`tel:${s.phone}`}>
                                    <Phone className="w-3 h-3" />
                                    اتصال
                                  </a>
                                </Button>
                                <WhatsAppQuickChat
                                  phone={s.phone}
                                  customerName={s.name}
                                  context={`لاحظنا اهتمامك بـ "${s.last_query}". هل نقدر نساعدك في إيجاد القطعة المناسبة؟`}
                                  size="sm"
                                />
                              </>
                            )}
                            {!s.phone && s.email && (
                              <Button asChild size="sm" variant="outline" className="h-7 gap-1 text-xs border-amber-300 text-amber-700 hover:bg-amber-50 dark:border-amber-700 dark:text-amber-400">
                                <a href={`mailto:${s.email}?subject=${encodeURIComponent('المصرية جروب — نحتاج رقم تواصلك')}&body=${encodeURIComponent(`مرحباً ${s.name}،\n\nلاحظنا اهتمامك بـ "${s.last_query}" على موقع المصرية جروب.\nلتقديم أفضل خدمة وعرض السعر بسرعة، يرجى تحديث ملفك الشخصي بإضافة رقم الموبايل من خلال الرابط:\nhttps://almasriaautoparts.com/my-profile\n\nأو يمكنك الرد على هذا الإيميل بالرقم مباشرةً.\n\nشكراً،\nفريق المصرية جروب`)}`}>
                                  <Mail className="w-3 h-3" />
                                  طلب الرقم
                                </a>
                              </Button>
                            )}
                            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setSummaryUser({ id: s.user_id, name: s.name, phone: s.phone, isDealer: s.is_dealer })}>
                              <Activity className="w-3 h-3" />
                              ملخص
                            </Button>
                            <Button asChild size="sm" variant="ghost" className="h-7 w-7 p-0" title="فتح صفحة الملخص الكاملة">
                              <Link to={`/admin/visitor/${s.user_id}`} target="_blank" rel="noopener">
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            </Button>
                            <Button size="sm" className="h-7 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => markContacted(s.user_id, "search_lead")}>
                              <CheckCircle2 className="w-3 h-3" />
                              تم
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Yesterday customers === */}
        <TabsContent value="yesterday" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <ScrollArea className="h-[60vh]">
                {filteredYesterday.length === 0 ? (
                  <EmptyState icon={UserCheck} title="لا يوجد عملاء أمس بدون متابعة" subtitle="تم التواصل مع كل من زار الموقع أمس" />
                ) : (
                  <div className="divide-y">
                    {filteredYesterday.map((y) => (
                      <div key={y.user_id} className="p-3 hover:bg-muted/30 transition-colors">
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex-1 min-w-[200px]">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-sm">{y.name}</span>
                              <Badge variant={y.is_dealer ? "default" : "secondary"} className="text-[10px] h-5">
                                {y.is_dealer ? "تاجر" : "قطاعي"}
                              </Badge>
                              <Badge variant="outline" className="text-[10px] h-5 text-blue-600 border-blue-300">
                                {y.page_views} مشاهدة
                              </Badge>
                            </div>
                            {y.phone && (
                              <a href={`tel:${y.phone}`} className="text-xs text-primary hover:underline flex items-center gap-1">
                                <Phone className="w-3 h-3" />
                                {y.phone}
                              </a>
                            )}
                          </div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {y.phone && (
                              <>
                                <Button asChild size="sm" variant="outline" className="h-7 gap-1 text-xs border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-700 dark:text-blue-400">
                                  <a href={`tel:${y.phone}`}>
                                    <Phone className="w-3 h-3" />
                                    اتصال
                                  </a>
                                </Button>
                                <WhatsAppQuickChat
                                  phone={y.phone}
                                  customerName={y.name}
                                  context="لاحظنا زيارتك للموقع أمس. هل تحتاج مساعدة في طلب معين؟"
                                  size="sm"
                                />
                              </>
                            )}
                            <Button size="sm" variant="outline" className="h-7 gap-1 text-xs" onClick={() => setSummaryUser({ id: y.user_id, name: y.name, phone: y.phone, isDealer: y.is_dealer })}>
                              <Activity className="w-3 h-3" />
                              ملخص
                            </Button>
                            <Button asChild size="sm" variant="ghost" className="h-7 w-7 p-0" title="فتح صفحة الملخص الكاملة">
                              <Link to={`/admin/visitor/${y.user_id}`} target="_blank" rel="noopener">
                                <ExternalLink className="w-3 h-3" />
                              </Link>
                            </Button>
                            <Button size="sm" className="h-7 gap-1 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={() => markContacted(y.user_id, "yesterday")}>
                              <CheckCircle2 className="w-3 h-3" />
                              تم
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        {/* === Leaderboard === */}
        {isAdmin && (
          <TabsContent value="leaderboard" className="mt-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-amber-500" />
                  أداء الموظفين اليوم
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {staffLeaderboard.length === 0 ? (
                  <EmptyState icon={Trophy} title="لا توجد بيانات" subtitle="لم يبدأ أي موظف بالعمل اليوم" />
                ) : (
                  <div className="divide-y">
                    {staffLeaderboard.map((s, i) => (
                      <div key={s.user_id} className="flex items-center justify-between p-3 hover:bg-muted/30">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                            i === 0 ? "bg-amber-100 text-amber-700" :
                            i === 1 ? "bg-gray-100 text-gray-700" :
                            i === 2 ? "bg-orange-100 text-orange-700" :
                            "bg-muted text-muted-foreground"
                          }`}>
                            {i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `#${i + 1}`}
                          </div>
                          <span className="font-medium text-sm">{s.name}</span>
                        </div>
                        <div className="flex items-center gap-3 text-xs">
                          <Badge variant="outline" className="gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            {s.contacts_today} تواصل
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Activity Summary Drawer */}
      <CustomerActivitySummary
        open={!!summaryUser}
        onOpenChange={(o) => { if (!o) setSummaryUser(null); }}
        userId={summaryUser?.id || null}
        customerName={summaryUser?.name}
        customerPhone={summaryUser?.phone}
        isDealer={summaryUser?.isDealer}
      />

      {/* AI Summary for chatbot conversations */}
      <SupportRequestAISummary
        open={!!aiSummaryReq}
        onOpenChange={(o) => { if (!o) setAiSummaryReq(null); }}
        requestId={aiSummaryReq?.id || null}
        customerName={aiSummaryReq?.name}
      />

      {/* Transfer to colleague dialog */}
      <TransferToColleagueDialog
        open={!!transferReq}
        onOpenChange={(o) => { if (!o) setTransferReq(null); }}
        requestId={transferReq?.id || null}
        customerName={transferReq?.name}
        onTransferred={() => fetchAll()}
      />
    </div>
  );
}

function EmptyState({ icon: Icon, title, subtitle }: { icon: any; title: string; subtitle: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center mb-3">
        <Icon className="w-7 h-7 text-emerald-500" />
      </div>
      <p className="font-bold text-foreground">{title}</p>
      <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
    </div>
  );
}
