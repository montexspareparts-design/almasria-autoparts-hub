import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MessageCircle, ShoppingCart, Clock, Loader2, ArrowLeft, UserCheck,
  PhoneCall, UserPlus, Search, Trophy, Star, Zap, Target,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface WelcomeStats {
  assignedConversations: number;
  pendingOrdersCount: number;
  unreadMessagesCount: number;
  myCallsToday: number;
  myLeadsToday: number;
  myAvgRating: number | null;
  myRank: number | null;
  totalStaff: number;
}

interface RecentConversation {
  id: string;
  contact_name: string | null;
  phone: string;
  last_message_preview: string | null;
  last_message_at: string;
  unread_count: number;
}

interface PendingOrder {
  id: string;
  order_number: string;
  total_amount: number;
  created_at: string;
  status: string;
}

interface StaffWelcomeDashboardProps {
  onNavigate?: (section: string) => void;
}

export default function StaffWelcomeDashboard({ onNavigate }: StaffWelcomeDashboardProps) {
  const { user } = useAuth();
  const [stats, setStats] = useState<WelcomeStats | null>(null);
  const [conversations, setConversations] = useState<RecentConversation[]>([]);
  const [pendingOrders, setPendingOrders] = useState<PendingOrder[]>([]);
  const [staffName, setStaffName] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) fetchData();
  }, [user]);

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);

    const [profileRes, assignedRes, unreadRes, pendingCountRes, recentConvRes, pendingOrdersRes] = await Promise.all([
      supabase.from("profiles").select("full_name, email").eq("user_id", user.id).maybeSingle(),
      supabase.from("whatsapp_conversations").select("*", { count: "exact", head: true }).eq("assigned_to", user.id).eq("is_archived", false),
      supabase.from("whatsapp_conversations").select("unread_count").eq("assigned_to", user.id).eq("is_archived", false),
      supabase.from("orders").select("*", { count: "exact", head: true }).in("status", ["pending", "awaiting_payment"]),
      supabase.from("whatsapp_conversations").select("id, contact_name, phone, last_message_preview, last_message_at, unread_count").eq("is_archived", false).order("last_message_at", { ascending: false }).limit(5),
      supabase.from("orders").select("id, order_number, total_amount, created_at, status").in("status", ["pending", "awaiting_payment"]).order("created_at", { ascending: false }).limit(5),
    ]);

    setStaffName(profileRes.data?.full_name || profileRes.data?.email?.split("@")[0] || "");

    const unreadTotal = (unreadRes.data || []).reduce((sum, c) => sum + (c.unread_count || 0), 0);

    setStats({
      assignedConversations: assignedRes.count || 0,
      pendingOrdersCount: pendingCountRes.count || 0,
      unreadMessagesCount: unreadTotal,
    });

    setConversations(recentConvRes.data || []);
    setPendingOrders(pendingOrdersRes.data || []);
    setLoading(false);
  };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return "صباح الخير";
    if (h < 18) return "مساء الخير";
    return "مساء النور";
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 mb-6">
      {/* Welcome Header */}
      <Card className="bg-gradient-to-l from-primary/10 via-primary/5 to-transparent border-primary/20">
        <CardContent className="p-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
              <UserCheck className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground">
                {greeting()}{staffName ? `، ${staffName}` : ""} 👋
              </h2>
              <p className="text-sm text-muted-foreground">إليك ملخص يومك والمهام المسندة لك</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Personal KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card
          className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-emerald-500"
          onClick={() => onNavigate?.("whatsapp-inbox")}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-2xl font-bold text-foreground">{stats?.assignedConversations || 0}</p>
              <p className="text-xs text-muted-foreground">محادثات مسندة لي</p>
            </div>
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-amber-500"
          onClick={() => onNavigate?.("whatsapp-inbox")}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
              <MessageCircle className="w-5 h-5 text-amber-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-2xl font-bold text-foreground">{stats?.unreadMessagesCount || 0}</p>
              <p className="text-xs text-muted-foreground">رسائل غير مقروءة</p>
            </div>
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
          onClick={() => onNavigate?.("orders")}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <ShoppingCart className="w-5 h-5 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-2xl font-bold text-foreground">{stats?.pendingOrdersCount || 0}</p>
              <p className="text-xs text-muted-foreground">طلبات بانتظار الرد</p>
            </div>
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent WhatsApp Conversations */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-600" />
              آخر محادثات الواتساب
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onNavigate?.("whatsapp-inbox")}>
              الكل
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">لا توجد محادثات حديثة</p>
            ) : (
              conversations.map(conv => (
                <div
                  key={conv.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onNavigate?.("whatsapp-inbox")}
                >
                  <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                    <span className="text-xs font-bold text-emerald-700">
                      {(conv.contact_name || conv.phone).slice(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm text-foreground truncate">
                        {conv.contact_name || conv.phone}
                      </p>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: true, locale: ar })}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {conv.last_message_preview || "—"}
                    </p>
                  </div>
                  {conv.unread_count > 0 && (
                    <Badge className="bg-emerald-600 text-white text-[10px] h-5 min-w-5 px-1.5 shrink-0">
                      {conv.unread_count}
                    </Badge>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Pending Orders */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-bold flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-600" />
              طلبات بانتظار الرد
            </CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => onNavigate?.("orders")}>
              الكل
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingOrders.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center py-4">لا توجد طلبات بانتظار الرد 🎉</p>
            ) : (
              pendingOrders.map(order => (
                <div
                  key={order.id}
                  className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onNavigate?.("orders")}
                >
                  <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <ShoppingCart className="w-4 h-4 text-amber-700" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm text-foreground truncate">
                        #{order.order_number}
                      </p>
                      <span className="text-[10px] text-muted-foreground shrink-0">
                        {formatDistanceToNow(new Date(order.created_at), { addSuffix: true, locale: ar })}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs text-muted-foreground">
                        {order.total_amount.toLocaleString("ar-EG")} ج.م
                      </p>
                      <Badge variant="outline" className="text-[10px] h-4 border-amber-300 text-amber-700">
                        {order.status === "pending" ? "بانتظار المراجعة" : "بانتظار الدفع"}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
