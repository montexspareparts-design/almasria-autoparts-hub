import { useState, useCallback, Fragment } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import * as XLSX from "xlsx";
import { toast } from "@/hooks/use-toast";
import {
  Users, Search, Eye, ShoppingCart, Phone, Mail, Car,
  TrendingUp, TrendingDown, Clock, ChevronDown, ChevronUp, BarChart3,
  Package, Calendar as CalendarIcon, Filter, X, Download,
  MessageCircle, Send, Copy, ExternalLink, Briefcase,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";

interface CustomerProfile {
  user_id: string;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  car_model: string | null;
  car_year: number | null;
  created_at: string;
}

const CUSTOMER_TYPES = [
  "عميل دائم", "عميل نشط", "مستكشف أسعار", "باحث متكرر", "زائر مهتم", "زائر جديد",
] as const;

const AdminCustomerIntelligence = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>("all");
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>("all");
  const [bulkWhatsAppOpen, setBulkWhatsAppOpen] = useState(false);
  const [bulkMessage, setBulkMessage] = useState("مرحباً {{name}}، نود إبلاغكم بأحدث العروض والخصومات الحصرية من المصرية جروب. تواصلوا معنا لمزيد من التفاصيل!");
  const [sendingIndex, setSendingIndex] = useState(-1);
  const [reportTimeFilter, setReportTimeFilter] = useState<string>("all");
  const [expandedSearcher, setExpandedSearcher] = useState<string | null>(null);
  const [searchDetailFilter, setSearchDetailFilter] = useState("");
  const [searchDetailSort, setSearchDetailSort] = useState<"count" | "date">("count");

  // All profiles
  const { data: profiles, isLoading: loadingProfiles } = useQuery({
    queryKey: ["admin_all_profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CustomerProfile[];
    },
  });

  // Search logs aggregated by user
  const { data: searchLogs } = useQuery({
    queryKey: ["admin_search_logs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_search_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data as any[];
    },
  });

  // Price views aggregated
  const { data: priceViews } = useQuery({
    queryKey: ["admin_all_price_views"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dealer_price_views")
        .select("user_id, product_id, viewed_at")
        .order("viewed_at", { ascending: false })
        .limit(1000);
      if (error) throw error;
      return data;
    },
  });

  // Products lookup for names
  const { data: productsMap } = useQuery({
    queryKey: ["admin_products_map"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name_ar, sku, brand");
      if (error) throw error;
      const map: Record<string, any> = {};
      data?.forEach(p => { map[p.id] = p; });
      return map;
    },
  });

  // Dealer user IDs
  const { data: dealerUserIds } = useQuery({
    queryKey: ["admin_dealer_user_ids"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dealer_accounts")
        .select("user_id")
        .eq("is_active", true);
      if (error) throw error;
      return new Set(data?.map(d => d.user_id) || []);
    },
  });

  // Orders count per user
  const { data: ordersMap } = useQuery({
    queryKey: ["admin_orders_per_user"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("user_id, id, total_amount, status");
      if (error) throw error;
      const map: Record<string, { count: number; total: number }> = {};
      data?.forEach(o => {
        if (!map[o.user_id]) map[o.user_id] = { count: 0, total: 0 };
        map[o.user_id].count++;
        map[o.user_id].total += Number(o.total_amount || 0);
      });
      return map;
    },
  });

  // Build user search logs map
  const userSearchMap: Record<string, { query: string; count: number; lastAt: string }[]> = {};
  searchLogs?.forEach((log: any) => {
    const uid = log.user_id || "anonymous";
    if (!userSearchMap[uid]) userSearchMap[uid] = [];
    const existing = userSearchMap[uid].find(s => s.query === log.search_query);
    if (existing) {
      existing.count++;
      if (log.created_at > existing.lastAt) existing.lastAt = log.created_at;
    } else {
      userSearchMap[uid].push({ query: log.search_query, count: 1, lastAt: log.created_at });
    }
  });

  // Build user price views map
  const userViewsMap: Record<string, string[]> = {};
  priceViews?.forEach(v => {
    if (!userViewsMap[v.user_id]) userViewsMap[v.user_id] = [];
    if (!userViewsMap[v.user_id].includes(v.product_id)) {
      userViewsMap[v.user_id].push(v.product_id);
    }
  });

  // Stats
  const totalCustomers = profiles?.length || 0;
  const withCar = profiles?.filter(p => p.car_model).length || 0;
  const totalSearches = searchLogs?.length || 0;
  const activeSearchers = new Set(searchLogs?.map((l: any) => l.user_id).filter(Boolean)).size;
  const dealerCount = profiles?.filter(p => dealerUserIds?.has(p.user_id)).length || 0;
  const retailCount = totalCustomers - dealerCount;

  const getCustomerType = (userId: string): string => {
    const orders = ordersMap?.[userId];
    const searches = userSearchMap[userId];
    const views = userViewsMap[userId];

    if (orders && orders.count >= 3) return "عميل دائم";
    if (orders && orders.count >= 1) return "عميل نشط";
    if (views && views.length >= 5) return "مستكشف أسعار";
    if (searches && searches.length >= 3) return "باحث متكرر";
    if (searches && searches.length >= 1) return "زائر مهتم";
    return "زائر جديد";
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case "عميل دائم": return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "عميل نشط": return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
      case "مستكشف أسعار": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "باحث متكرر": return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
      case "زائر مهتم": return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
      default: return "bg-muted text-muted-foreground";
    }
  };

  // Filter profiles
  const filteredProfiles = profiles?.filter(p => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesText = (
        p.full_name?.toLowerCase().includes(term) ||
        p.phone?.includes(term) ||
        p.email?.toLowerCase().includes(term) ||
        p.car_model?.toLowerCase().includes(term)
      );
      if (!matchesText) return false;
    }
    if (dateFrom) {
      if (new Date(p.created_at) < dateFrom) return false;
    }
    if (dateTo) {
      const endOfDay = new Date(dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      if (new Date(p.created_at) > endOfDay) return false;
    }
    if (customerTypeFilter && customerTypeFilter !== "all") {
      if (getCustomerType(p.user_id) !== customerTypeFilter) return false;
    }
    if (accountTypeFilter !== "all") {
      const isDealer = dealerUserIds?.has(p.user_id);
      if (accountTypeFilter === "dealer" && !isDealer) return false;
      if (accountTypeFilter === "retail" && isDealer) return false;
    }
    return true;
  });

  const hasActiveFilters = !!dateFrom || !!dateTo || (customerTypeFilter !== "all") || (accountTypeFilter !== "all");
  const clearFilters = () => { setDateFrom(undefined); setDateTo(undefined); setCustomerTypeFilter("all"); setAccountTypeFilter("all"); };

  const formatPhone = (phone: string) => {
    const cleaned = phone.replace(/\D/g, "");
    if (cleaned.startsWith("0")) return "2" + cleaned;
    if (cleaned.startsWith("2")) return cleaned;
    return "2" + cleaned;
  };

  const filteredWithPhone = filteredProfiles?.filter(p => p.phone) || [];

  const handleBulkSend = () => {
    if (filteredWithPhone.length === 0) {
      toast({ title: "لا يوجد عملاء بأرقام هاتف", variant: "destructive" });
      return;
    }
    setSendingIndex(0);
    const customer = filteredWithPhone[0];
    const msg = bulkMessage.replace(/\{\{name\}\}/g, customer.full_name || "عميلنا الكريم");
    window.open(`https://wa.me/${formatPhone(customer.phone!)}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleSendNext = () => {
    const nextIndex = sendingIndex + 1;
    if (nextIndex >= filteredWithPhone.length) {
      setSendingIndex(-1);
      setBulkWhatsAppOpen(false);
      toast({ title: `✅ تم إرسال الرسالة لـ ${filteredWithPhone.length} عميل` });
      return;
    }
    setSendingIndex(nextIndex);
    const customer = filteredWithPhone[nextIndex];
    const msg = bulkMessage.replace(/\{\{name\}\}/g, customer.full_name || "عميلنا الكريم");
    window.open(`https://wa.me/${formatPhone(customer.phone!)}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const handleCopyAllNumbers = () => {
    const numbers = filteredWithPhone.map(p => formatPhone(p.phone!)).join("\n");
    navigator.clipboard.writeText(numbers);
    toast({ title: `✅ تم نسخ ${filteredWithPhone.length} رقم` });
  };

  const handleExportExcel = useCallback(() => {
    if (!filteredProfiles || filteredProfiles.length === 0) {
      toast({ title: "لا توجد بيانات للتصدير", variant: "destructive" });
      return;
    }

    // Sheet 1: Customer profiles
    const profileRows = filteredProfiles.map(p => {
      const type = getCustomerType(p.user_id);
      const orders = ordersMap?.[p.user_id];
      const searches = userSearchMap[p.user_id] || [];
      const views = userViewsMap[p.user_id] || [];
      return {
        "الاسم": p.full_name || "—",
        "الهاتف": p.phone || "—",
        "البريد الإلكتروني": p.email || "—",
        "نوع السيارة": p.car_model || "—",
        "سنة السيارة": p.car_year || "—",
        "تاريخ التسجيل": format(new Date(p.created_at), "yyyy-MM-dd"),
        "تصنيف العميل": type,
        "عدد الطلبات": orders?.count || 0,
        "إجمالي المشتريات (ج.م)": orders?.total || 0,
        "عدد عمليات البحث": searches.length,
        "عدد الأصناف المسعّرة": views.length,
      };
    });

    // Sheet 2: Search activity detail
    const searchRows: any[] = [];
    filteredProfiles.forEach(p => {
      const searches = userSearchMap[p.user_id] || [];
      searches.forEach(s => {
        searchRows.push({
          "الاسم": p.full_name || "—",
          "الهاتف": p.phone || "—",
          "كلمة البحث": s.query,
          "عدد المرات": s.count,
          "آخر بحث": format(new Date(s.lastAt), "yyyy-MM-dd HH:mm"),
        });
      });
    });

    // Sheet 3: Price views detail
    const viewRows: any[] = [];
    filteredProfiles.forEach(p => {
      const views = userViewsMap[p.user_id] || [];
      views.slice(0, 50).forEach(pid => {
        const product = productsMap?.[pid];
        if (!product) return;
        viewRows.push({
          "الاسم": p.full_name || "—",
          "الهاتف": p.phone || "—",
          "اسم المنتج": product.name_ar,
          "رقم القطعة": product.sku,
          "الماركة": product.brand,
        });
      });
    });

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(profileRows);
    const ws2 = XLSX.utils.json_to_sheet(searchRows.length > 0 ? searchRows : [{ "ملاحظة": "لا توجد بيانات بحث" }]);
    const ws3 = XLSX.utils.json_to_sheet(viewRows.length > 0 ? viewRows : [{ "ملاحظة": "لا توجد بيانات تسعير" }]);

    // Set RTL and column widths
    [ws1, ws2, ws3].forEach(ws => {
      ws["!dir"] = "rtl" as any;
    });
    ws1["!cols"] = [
      { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 12 },
      { wch: 14 }, { wch: 15 }, { wch: 12 }, { wch: 18 }, { wch: 15 }, { wch: 18 },
    ];
    ws2["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 30 }, { wch: 12 }, { wch: 18 }];
    ws3["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 35 }, { wch: 18 }, { wch: 15 }];

    XLSX.utils.book_append_sheet(wb, ws1, "ملف العملاء");
    XLSX.utils.book_append_sheet(wb, ws2, "سجل البحث");
    XLSX.utils.book_append_sheet(wb, ws3, "الأصناف المسعّرة");

    XLSX.writeFile(wb, `تقرير_ذكاء_العملاء_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast({ title: "تم تصدير التقرير بنجاح ✅" });
  }, [filteredProfiles, ordersMap, userSearchMap, userViewsMap, productsMap, getCustomerType]);

  return (
    <div className="space-y-6" dir="rtl">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary/10 via-primary/5 to-transparent border border-primary/10 p-6">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,hsl(var(--primary)/0.08),transparent_60%)]" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <h2 className="text-2xl font-black text-foreground flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shadow-sm">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              تقرير ذكاء العملاء
            </h2>
            <p className="text-muted-foreground text-sm mt-2 mr-[52px]">
              تحليل شامل لسلوك العملاء: عمليات البحث، الأسعار المشاهدة، الطلبات
            </p>
          </div>
          <div className="flex items-center gap-2.5 flex-wrap">
            <Button
              onClick={() => setBulkWhatsAppOpen(true)}
              variant="outline"
              className="gap-2 font-bold border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30 rounded-xl h-10"
            >
              <MessageCircle className="w-4 h-4" />
              واتساب جماعي ({filteredWithPhone.length})
            </Button>
            <Button onClick={handleExportExcel} className="gap-2 font-bold rounded-xl h-10 shadow-sm">
              <Download className="w-4 h-4" />
              تصدير Excel
            </Button>
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {[
          { icon: Users, value: totalCustomers, label: "إجمالي العملاء", gradient: "from-primary/10 to-primary/5", iconBg: "bg-primary/15", iconColor: "text-primary" },
          { icon: Briefcase, value: dealerCount, label: "تاجر", gradient: "from-blue-500/10 to-blue-500/5", iconBg: "bg-blue-500/15", iconColor: "text-blue-600 dark:text-blue-400" },
          { icon: ShoppingCart, value: retailCount, label: "عميل قطاعي", gradient: "from-orange-500/10 to-orange-500/5", iconBg: "bg-orange-500/15", iconColor: "text-orange-600 dark:text-orange-400" },
          { icon: Car, value: withCar, label: "حددوا سيارتهم", gradient: "from-violet-500/10 to-violet-500/5", iconBg: "bg-violet-500/15", iconColor: "text-violet-600 dark:text-violet-400" },
          { icon: Search, value: totalSearches, label: "عمليات بحث", gradient: "from-cyan-500/10 to-cyan-500/5", iconBg: "bg-cyan-500/15", iconColor: "text-cyan-600 dark:text-cyan-400" },
          { icon: TrendingUp, value: activeSearchers, label: "عملاء يبحثون", gradient: "from-emerald-500/10 to-emerald-500/5", iconBg: "bg-emerald-500/15", iconColor: "text-emerald-600 dark:text-emerald-400" },
        ].map((kpi, idx) => (
          <div key={idx} className={cn("rounded-2xl border border-border/40 bg-gradient-to-br p-4 text-center transition-all hover:shadow-md hover:border-border/70 hover:-translate-y-0.5 duration-200", kpi.gradient)}>
            <div className={cn("w-10 h-10 rounded-xl mx-auto mb-2.5 flex items-center justify-center shadow-sm", kpi.iconBg)}>
              <kpi.icon className={cn("w-5 h-5", kpi.iconColor)} />
            </div>
            <p className="text-2xl font-black text-foreground tracking-tight">{kpi.value}</p>
            <p className="text-[11px] text-muted-foreground font-medium mt-0.5">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Dealers vs Retail Pie Chart */}
      {totalCustomers > 0 && (
        <Card className="rounded-2xl border-border/40 shadow-sm overflow-hidden">
          <CardHeader className="pb-2 bg-gradient-to-l from-blue-500/5 to-transparent">
            <CardTitle className="text-base font-black flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-500/15 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
              نسبة التجار مقابل العملاء القطاعيين
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: "تجار", value: dealerCount },
                      { name: "عملاء قطاعيين", value: retailCount },
                    ]}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    <Cell fill="hsl(217, 91%, 60%)" />
                    <Cell fill="hsl(25, 95%, 53%)" />
                  </Pie>
                  <Tooltip formatter={(value: number) => [`${value} عميل`, ""]} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Customer Type Distribution Chart */}
      {filteredProfiles && filteredProfiles.length > 0 && (() => {
        const typeCounts: Record<string, number> = {};
        filteredProfiles.forEach(p => {
          const t = getCustomerType(p.user_id);
          typeCounts[t] = (typeCounts[t] || 0) + 1;
        });
        const COLORS = [
          "hsl(var(--chart-1, 142 71% 45%))",
          "hsl(var(--chart-2, 217 91% 60%))",
          "hsl(var(--chart-3, 48 96% 53%))",
          "hsl(var(--chart-4, 280 65% 60%))",
          "hsl(var(--chart-5, 25 95% 53%))",
          "hsl(var(--muted-foreground, 215 16% 47%))",
        ];
        const typeColorMap: Record<string, string> = {};
        CUSTOMER_TYPES.forEach((t, i) => { typeColorMap[t] = COLORS[i % COLORS.length]; });
        const chartData = Object.entries(typeCounts).map(([name, value]) => ({ name, value }));

        return (
          <Card className="rounded-2xl border-border/40 shadow-sm overflow-hidden">
            <CardHeader className="pb-2 bg-gradient-to-l from-violet-500/5 to-transparent">
              <CardTitle className="text-base font-black flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-violet-500/15 flex items-center justify-center">
                  <BarChart3 className="w-4 h-4 text-violet-600 dark:text-violet-400" />
                </div>
                توزيع أنواع العملاء
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={3}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    >
                      {chartData.map((entry, index) => (
                        <Cell key={entry.name} fill={typeColorMap[entry.name] || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value: number) => [`${value} عميل`, "العدد"]}
                      contentStyle={{ direction: "rtl", borderRadius: 12, fontSize: 13, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}
                    />
                    <Legend
                      formatter={(value) => <span style={{ fontSize: 12 }}>{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Top Searchers vs Orders Report */}
      {profiles && profiles.length > 0 && (() => {
        // Filter search logs by time
        const now = new Date();
        const cutoff = reportTimeFilter === "7d" ? new Date(now.getTime() - 7 * 86400000)
          : reportTimeFilter === "30d" ? new Date(now.getTime() - 30 * 86400000)
          : reportTimeFilter === "90d" ? new Date(now.getTime() - 90 * 86400000)
          : null;

        // Build filtered search map
        const filteredSearchMap: Record<string, { query: string; count: number; lastAt: string }[]> = {};
        searchLogs?.forEach((log: any) => {
          if (cutoff && new Date(log.created_at) < cutoff) return;
          const uid = log.user_id || "anonymous";
          if (!filteredSearchMap[uid]) filteredSearchMap[uid] = [];
          const existing = filteredSearchMap[uid].find(s => s.query === log.search_query);
          if (existing) {
            existing.count++;
            if (log.created_at > existing.lastAt) existing.lastAt = log.created_at;
          } else {
            filteredSearchMap[uid].push({ query: log.search_query, count: 1, lastAt: log.created_at });
          }
        });

        // Build top searchers data
        const searcherData: {
          userId: string;
          name: string;
          phone: string | null;
          searches: number;
          uniqueQueries: number;
          orders: number;
          totalSpent: number;
          priceViews: number;
          converted: boolean;
          conversionRate: string;
          topQueries: string[];
          searchDetails: { query: string; count: number; lastAt: string }[];
          isDealer: boolean;
        }[] = [];

        profiles.forEach(p => {
          const searches = filteredSearchMap[p.user_id] || [];
          if (searches.length === 0) return;
          const totalSearchCount = searches.reduce((sum, s) => sum + s.count, 0);
          const userOrders = ordersMap?.[p.user_id];
          const views = userViewsMap[p.user_id] || [];
          const converted = !!(userOrders && userOrders.count > 0);

          searcherData.push({
            userId: p.user_id,
            name: p.full_name || "بدون اسم",
            phone: p.phone,
            searches: totalSearchCount,
            uniqueQueries: searches.length,
            orders: userOrders?.count || 0,
            totalSpent: userOrders?.total || 0,
            priceViews: views.length,
            converted,
            conversionRate: totalSearchCount > 0 && userOrders
              ? `${Math.round((userOrders.count / totalSearchCount) * 100)}%`
              : "0%",
            topQueries: searches
              .sort((a, b) => b.count - a.count)
              .slice(0, 3)
              .map(s => s.query),
            searchDetails: searches.sort((a, b) => b.count - a.count),
            isDealer: dealerUserIds?.has(p.user_id) || false,
          });
        });

        // Sort by searches descending
        searcherData.sort((a, b) => b.searches - a.searches);
        const top15 = searcherData.slice(0, 15);
        const maxSearches = Math.max(...top15.map(d => d.searches), 1);
        const maxOrders = Math.max(...top15.map(d => d.orders), 1);

        // Summary stats
        const totalSearchers = searcherData.length;
        const convertedCount = searcherData.filter(d => d.converted).length;
        const overallConversion = totalSearchers > 0 ? Math.round((convertedCount / totalSearchers) * 100) : 0;
        const avgSearchesPerUser = totalSearchers > 0
          ? Math.round(searcherData.reduce((s, d) => s + d.searches, 0) / totalSearchers)
          : 0;
        const topNonConverted = searcherData.filter(d => !d.converted).slice(0, 5);

        // Previous period comparison
        let prevSearchers = 0;
        let prevConverted = 0;
        let prevConversion = 0;
        let prevAvgSearches = 0;
        if (cutoff) {
          const periodMs = now.getTime() - cutoff.getTime();
          const prevCutoff = new Date(cutoff.getTime() - periodMs);
          const prevSearchMap: Record<string, { query: string; count: number }[]> = {};
          searchLogs?.forEach((log: any) => {
            const logDate = new Date(log.created_at);
            if (logDate >= cutoff || logDate < prevCutoff) return;
            const uid = log.user_id || "anonymous";
            if (!prevSearchMap[uid]) prevSearchMap[uid] = [];
            const existing = prevSearchMap[uid].find(s => s.query === log.search_query);
            if (existing) existing.count++;
            else prevSearchMap[uid].push({ query: log.search_query, count: 1 });
          });
          const prevSearcherData: { userId: string; searches: number; converted: boolean }[] = [];
          profiles.forEach(p => {
            const searches = prevSearchMap[p.user_id] || [];
            if (searches.length === 0) return;
            const total = searches.reduce((s, q) => s + q.count, 0);
            const userOrders = ordersMap?.[p.user_id];
            prevSearcherData.push({ userId: p.user_id, searches: total, converted: !!(userOrders && userOrders.count > 0) });
          });
          prevSearchers = prevSearcherData.length;
          prevConverted = prevSearcherData.filter(d => d.converted).length;
          prevConversion = prevSearchers > 0 ? Math.round((prevConverted / prevSearchers) * 100) : 0;
          prevAvgSearches = prevSearchers > 0
            ? Math.round(prevSearcherData.reduce((s, d) => s + d.searches, 0) / prevSearchers)
            : 0;
        }

        const calcChange = (current: number, prev: number) => {
          if (!cutoff) return null;
          if (prev === 0 && current === 0) return 0;
          if (prev === 0) return 100;
          return Math.round(((current - prev) / prev) * 100);
        };

        const searchersChange = calcChange(totalSearchers, prevSearchers);
        const convertedChange = calcChange(convertedCount, prevConverted);
        const conversionChange = calcChange(overallConversion, prevConversion);
        const avgChange = calcChange(avgSearchesPerUser, prevAvgSearches);

        // Chart data for top 10
        const chartData = top15.slice(0, 10).map(d => ({
          name: d.name.length > 12 ? d.name.slice(0, 12) + "…" : d.name,
          بحث: d.searches,
          طلبات: d.orders,
        }));

        const formatPhoneForWA = (phone: string) => {
          let cleaned = phone.replace(/[\s\-()]/g, "");
          cleaned = cleaned.replace(/^002/, "").replace(/^0020/, "");
          if (cleaned.startsWith("0")) cleaned = "20" + cleaned.slice(1);
          if (!cleaned.startsWith("+")) cleaned = "+" + cleaned;
          return cleaned;
        };

        return (
          <Card className="border-primary/20">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-lg font-black flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-primary" />
                    تقرير أكثر العملاء بحثاً مقابل الطلبات
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">
                    مقارنة بين نشاط البحث وتحويله لطلبات فعلية — أداة لاكتشاف الفرص الضائعة
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs font-bold"
                  onClick={() => {
                    const rows = searcherData.map((d, i) => ({
                      "#": i + 1,
                      "الاسم": d.name,
                      "نوع الحساب": d.isDealer ? "جملة" : "قطاعي",
                      "رقم الهاتف": d.phone || "—",
                      "عمليات البحث": d.searches,
                      "استفسارات فريدة": d.uniqueQueries,
                      "أصناف مسعّرة": d.priceViews,
                      "عدد الطلبات": d.orders,
                      "إجمالي الإنفاق (ج.م)": d.totalSpent,
                      "معدل التحويل": d.conversionRate,
                      "الحالة": d.converted ? "محوّل" : "لم يشترِ",
                      "أهم ما بحث عنه": d.topQueries.join(" | "),
                    }));
                    const wb = XLSX.utils.book_new();
                    const ws = XLSX.utils.json_to_sheet(rows);
                    ws["!dir"] = "rtl" as any;
                    ws["!cols"] = [
                      { wch: 5 }, { wch: 22 }, { wch: 16 }, { wch: 14 }, { wch: 16 },
                      { wch: 14 }, { wch: 12 }, { wch: 18 }, { wch: 14 }, { wch: 12 }, { wch: 35 },
                    ];
                    XLSX.utils.book_append_sheet(wb, ws, "أكثر الباحثين");
                    XLSX.writeFile(wb, `تقرير_أكثر_الباحثين_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
                    toast({ title: "تم تصدير التقرير بنجاح ✅" });
                  }}
                >
                  <Download className="w-3.5 h-3.5" />
                  تصدير Excel
                </Button>
              </div>
              {/* Time filter */}
              <div className="flex items-center gap-1.5 flex-wrap px-1">
                {[
                  { value: "7d", label: "آخر 7 أيام" },
                  { value: "30d", label: "آخر 30 يوم" },
                  { value: "90d", label: "آخر 90 يوم" },
                  { value: "all", label: "الكل" },
                ].map(opt => (
                  <Button
                    key={opt.value}
                    size="sm"
                    variant={reportTimeFilter === opt.value ? "default" : "outline"}
                    className="text-[11px] h-7 px-3 font-bold"
                    onClick={() => setReportTimeFilter(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { icon: Search, value: totalSearchers, label: "عميل يبحث", change: searchersChange, bg: "bg-muted/40", iconColor: "text-primary", valueColor: "text-foreground" },
                  { icon: ShoppingCart, value: convertedCount, label: "تحوّلوا لطلبات", change: convertedChange, bg: "bg-emerald-50 dark:bg-emerald-950/20", iconColor: "text-emerald-600 dark:text-emerald-400", valueColor: "text-emerald-700 dark:text-emerald-400" },
                  { icon: TrendingUp, value: `${overallConversion}%`, label: "معدل التحويل", change: conversionChange, bg: "bg-amber-50 dark:bg-amber-950/20", iconColor: "text-amber-600 dark:text-amber-400", valueColor: "text-amber-700 dark:text-amber-400" },
                  { icon: BarChart3, value: avgSearchesPerUser, label: "متوسط بحث/عميل", change: avgChange, bg: "bg-blue-50 dark:bg-blue-950/20", iconColor: "text-blue-600 dark:text-blue-400", valueColor: "text-blue-700 dark:text-blue-400" },
                ].map((kpi, idx) => (
                  <div key={idx} className={cn("rounded-xl p-3 text-center", kpi.bg)}>
                    <kpi.icon className={cn("w-5 h-5 mx-auto mb-1.5", kpi.iconColor)} />
                    <p className={cn("text-2xl font-black", kpi.valueColor)}>{kpi.value}</p>
                    <p className="text-[11px] text-muted-foreground font-medium">{kpi.label}</p>
                    {kpi.change !== null && (
                      <div className={cn(
                        "flex items-center justify-center gap-0.5 mt-1.5 text-[10px] font-bold rounded-full px-2 py-0.5 mx-auto w-fit",
                        kpi.change > 0 ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                          : kpi.change < 0 ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                          : "bg-muted text-muted-foreground"
                      )}>
                        {kpi.change > 0 ? <TrendingUp className="w-3 h-3" /> : kpi.change < 0 ? <TrendingDown className="w-3 h-3" /> : null}
                        {kpi.change > 0 ? "+" : ""}{kpi.change}% عن الفترة السابقة
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Bar Chart: Search vs Orders */}
              {chartData.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-primary" />
                    أعلى 10 عملاء بحثاً — مقارنة بالطلبات
                  </h4>
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} layout="vertical" margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis
                          dataKey="name"
                          type="category"
                          width={100}
                          tick={{ fontSize: 11, textAnchor: "end" }}
                        />
                        <Tooltip
                          contentStyle={{ direction: "rtl", borderRadius: 10, fontSize: 12 }}
                          formatter={(value: number, name: string) => [value, name]}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} />
                        <Bar dataKey="بحث" fill="hsl(217, 91%, 60%)" radius={[0, 4, 4, 0]} barSize={14} />
                        <Bar dataKey="طلبات" fill="hsl(142, 71%, 45%)" radius={[0, 4, 4, 0]} barSize={14} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Detailed Table */}
              <div>
                <h4 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                  <Search className="w-4 h-4 text-primary" />
                  تفاصيل أكثر 15 عميل بحثاً
                </h4>
                <div className="overflow-x-auto rounded-xl border border-border">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-muted/50 text-muted-foreground text-[11px]">
                        <th className="px-3 py-2.5 text-right font-bold">#</th>
                        <th className="px-3 py-2.5 text-right font-bold">العميل</th>
                        <th className="px-3 py-2.5 text-center font-bold">عمليات البحث</th>
                        <th className="px-3 py-2.5 text-center font-bold">استفسارات فريدة</th>
                        <th className="px-3 py-2.5 text-center font-bold">أصناف مسعّرة</th>
                        <th className="px-3 py-2.5 text-center font-bold">الطلبات</th>
                        <th className="px-3 py-2.5 text-center font-bold">إجمالي الإنفاق</th>
                        <th className="px-3 py-2.5 text-center font-bold">التحويل</th>
                        <th className="px-3 py-2.5 text-right font-bold">أهم ما بحث عنه</th>
                        <th className="px-3 py-2.5 text-center font-bold">تواصل</th>
                      </tr>
                    </thead>
                    <tbody>
                      {top15.map((d, i) => (
                        <Fragment key={d.userId}>
                        <tr
                          className={cn(
                            "border-t border-border/50 transition-colors cursor-pointer hover:bg-muted/40",
                            i % 2 === 0 ? "bg-card" : "bg-muted/20",
                            !d.converted && d.searches >= 5 && "bg-amber-50/50 dark:bg-amber-950/10",
                            expandedSearcher === d.userId && "bg-primary/5"
                          )}
                          onClick={() => { setExpandedSearcher(expandedSearcher === d.userId ? null : d.userId); setSearchDetailFilter(""); setSearchDetailSort("count"); }}
                        >
                          <td className="px-3 py-2.5 text-xs text-muted-foreground font-bold">{i + 1}</td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1.5">
                              <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform", expandedSearcher === d.userId && "rotate-180")} />
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={(e) => { e.stopPropagation(); navigate(`/admin?section=customers&search=${encodeURIComponent(d.phone || d.name)}`); }}
                                    className="text-right hover:underline cursor-pointer group"
                                  >
                                    <p className="text-xs font-bold text-primary group-hover:text-primary/80 transition-colors">{d.name}</p>
                                  </button>
                                  <span className={cn(
                                    "text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap",
                                    d.isDealer
                                      ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                                      : "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                                  )}>
                                    {d.isDealer ? "جملة" : "قطاعي"}
                                  </span>
                                </div>
                                {d.phone && (
                                  <p className="text-[10px] text-muted-foreground" dir="ltr">{d.phone}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-blue-500 rounded-full"
                                  style={{ width: `${(d.searches / maxSearches) * 100}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-foreground">{d.searches}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center text-xs text-foreground">{d.uniqueQueries}</td>
                          <td className="px-3 py-2.5 text-center text-xs text-foreground">{d.priceViews}</td>
                          <td className="px-3 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-emerald-500 rounded-full"
                                  style={{ width: `${maxOrders > 0 ? (d.orders / maxOrders) * 100 : 0}%` }}
                                />
                              </div>
                              <span className="text-xs font-bold text-foreground">{d.orders}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center text-xs font-bold text-foreground">
                            {d.totalSpent > 0 ? `${d.totalSpent.toLocaleString("ar-EG")} ج.م` : "—"}
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {d.converted ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                                ✓ محوّل
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">
                                ✗ لم يشترِ
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-wrap gap-1">
                              {d.topQueries.map((q, qi) => (
                                <span key={qi} className="text-[10px] bg-muted/60 rounded px-1.5 py-0.5 text-foreground">
                                  {q}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center">
                            {d.phone && (
                              <a
                                href={`https://wa.me/${formatPhoneForWA(d.phone)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex w-7 h-7 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 items-center justify-center transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MessageCircle className="w-3.5 h-3.5 text-emerald-600" />
                              </a>
                            )}
                          </td>
                        </tr>
                        {expandedSearcher === d.userId && (
                          <tr className="border-t border-border/30">
                            <td colSpan={10} className="p-0">
                              <div className="bg-muted/30 px-6 py-4 space-y-3">
                                <div className="flex items-center justify-between">
                                  <h5 className="text-xs font-black text-foreground flex items-center gap-2">
                                    <Search className="w-3.5 h-3.5 text-primary" />
                                    سجل بحث {d.name} ({d.searchDetails.length} استفسار)
                                  </h5>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="gap-1.5 text-[10px] h-7"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const ws = XLSX.utils.json_to_sheet(
                                        d.searchDetails.map((s, si) => ({
                                          "#": si + 1,
                                          "اسم العميل": d.name,
                                          "رقم الهاتف": d.phone || "—",
                                          "كلمة البحث": s.query,
                                          "عدد المرات": s.count,
                                          "آخر بحث": format(new Date(s.lastAt), "dd/MM/yyyy hh:mm a", { locale: ar }),
                                        }))
                                      );
                                      ws["!cols"] = [{ wch: 5 }, { wch: 22 }, { wch: 16 }, { wch: 35 }, { wch: 12 }, { wch: 22 }];
                                      const wb = XLSX.utils.book_new();
                                      XLSX.utils.book_append_sheet(wb, ws, "سجل البحث");
                                      // Info sheet
                                      const infoWs = XLSX.utils.json_to_sheet([{
                                        "الاسم": d.name,
                                        "الهاتف": d.phone || "—",
                                        "إجمالي البحث": d.searches,
                                        "استفسارات فريدة": d.uniqueQueries,
                                        "الطلبات": d.orders,
                                        "إجمالي الإنفاق": d.totalSpent,
                                        "الحالة": d.converted ? "محوّل" : "لم يشترِ",
                                      }]);
                                      XLSX.utils.book_append_sheet(wb, infoWs, "بيانات العميل");
                                      XLSX.writeFile(wb, `سجل_بحث_${d.name.replace(/\s+/g, "_")}.xlsx`);
                                      toast({ title: "تم تصدير سجل البحث بنجاح ✅" });
                                    }}
                                  >
                                    <Download className="w-3 h-3" />
                                    تصدير Excel
                                  </Button>
                                </div>
                                <div className="relative" onClick={(e) => e.stopPropagation()}>
                                  <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                                  <Input
                                    placeholder="ابحث في كلمات البحث..."
                                    value={searchDetailFilter}
                                    onChange={(e) => setSearchDetailFilter(e.target.value)}
                                    className="h-8 text-xs pr-8 bg-card"
                                  />
                                </div>
                                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                  <span className="text-[10px] text-muted-foreground font-medium">ترتيب:</span>
                                  <Button size="sm" variant={searchDetailSort === "count" ? "default" : "outline"} className="h-6 text-[10px] px-2" onClick={() => setSearchDetailSort("count")}>
                                    الأكثر بحثاً
                                  </Button>
                                  <Button size="sm" variant={searchDetailSort === "date" ? "default" : "outline"} className="h-6 text-[10px] px-2" onClick={() => setSearchDetailSort("date")}>
                                    الأحدث
                                  </Button>
                                </div>
                                {(() => {
                                  const filtered = (searchDetailFilter
                                    ? d.searchDetails.filter(s => s.query.includes(searchDetailFilter))
                                    : [...d.searchDetails]
                                  ).sort((a, b) => searchDetailSort === "count" ? b.count - a.count : new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());
                                  return (
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[200px] overflow-y-auto">
                                      {filtered.length === 0 ? (
                                        <p className="text-xs text-muted-foreground col-span-full text-center py-3">لا توجد نتائج مطابقة</p>
                                      ) : filtered.map((s, si) => (
                                        <div key={si} className="flex items-center gap-2 bg-card rounded-lg px-3 py-2 border border-border/50">
                                          <div className="flex-1 min-w-0">
                                            <p className="text-xs font-bold text-foreground truncate">{s.query}</p>
                                            <p className="text-[10px] text-muted-foreground">
                                              {format(new Date(s.lastAt), "dd MMM yyyy — hh:mm a", { locale: ar })}
                                            </p>
                                          </div>
                                          <Badge variant="secondary" className="text-[10px] shrink-0">
                                            {s.count}×
                                          </Badge>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </div>
                            </td>
                          </tr>
                        )}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Opportunity Alert: Top non-converted searchers */}
              {topNonConverted.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800/40 rounded-xl p-4">
                  <h4 className="text-sm font-black text-amber-800 dark:text-amber-300 flex items-center gap-2 mb-3">
                    <Eye className="w-4 h-4" />
                    ⚡ فرص تحويل — عملاء يبحثون ولم يشتروا بعد
                  </h4>
                  <div className="space-y-2">
                    {topNonConverted.map((d, i) => (
                      <div key={d.userId} className="flex items-center gap-3 bg-white/60 dark:bg-black/20 rounded-lg p-2.5">
                        <span className="text-xs font-bold text-amber-700 dark:text-amber-400 w-5">{i + 1}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground">{d.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {d.searches} عملية بحث • {d.priceViews} صنف مسعّر • أكثر ما بحث عنه: {d.topQueries[0] || "—"}
                          </p>
                        </div>
                        {d.phone && (
                          <a
                            href={`https://wa.me/${formatPhoneForWA(d.phone)}?text=${encodeURIComponent(
                              `مرحباً ${d.name}، لاحظنا اهتمامك بمنتجاتنا. هل يمكننا مساعدتك في إتمام طلبك؟`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2.5 py-1.5 rounded-lg hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            تواصل
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })()}

      {/* Filters bar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          {/* Row 1: Text search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ابحث بالاسم، الهاتف، الإيميل، أو نوع السيارة..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pr-10"
            />
          </div>

          {/* Row 2: Date range + customer type */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Date From */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "gap-1.5 text-xs h-9",
                    !dateFrom && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "من تاريخ"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateFrom}
                  onSelect={setDateFrom}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            {/* Date To */}
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "gap-1.5 text-xs h-9",
                    !dateTo && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="w-3.5 h-3.5" />
                  {dateTo ? format(dateTo, "dd/MM/yyyy") : "إلى تاريخ"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dateTo}
                  onSelect={setDateTo}
                  disabled={(date) => date > new Date()}
                  initialFocus
                  className={cn("p-3 pointer-events-auto")}
                />
              </PopoverContent>
            </Popover>

            {/* Customer Type */}
            <Select value={customerTypeFilter} onValueChange={setCustomerTypeFilter}>
              <SelectTrigger className="w-[180px] h-9 text-xs">
                <Filter className="w-3.5 h-3.5 ml-1.5" />
                <SelectValue placeholder="نوع العميل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأنواع</SelectItem>
                {CUSTOMER_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Account Type (Dealer vs Retail) */}
            <Select value={accountTypeFilter} onValueChange={setAccountTypeFilter}>
              <SelectTrigger className="w-[160px] h-9 text-xs">
                <Users className="w-3.5 h-3.5 ml-1.5" />
                <SelectValue placeholder="نوع الحساب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="dealer">تاجر</SelectItem>
                <SelectItem value="retail">عميل قطاعي</SelectItem>
              </SelectContent>
            </Select>
            {/* Clear filters */}
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="gap-1 text-xs h-9 text-destructive" onClick={clearFilters}>
                <X className="w-3.5 h-3.5" />
                مسح الفلاتر
              </Button>
            )}

            {/* Results count */}
            <span className="text-xs text-muted-foreground mr-auto">
              {filteredProfiles?.length || 0} عميل
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Customer list */}
      {loadingProfiles ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredProfiles?.map((profile) => {
            const isExpanded = expandedUser === profile.user_id;
            const customerType = getCustomerType(profile.user_id);
            const searches = userSearchMap[profile.user_id] || [];
            const viewedProducts = userViewsMap[profile.user_id] || [];
            const orders = ordersMap?.[profile.user_id];

            const formatPhoneForWhatsApp = (phone: string) => {
              let cleaned = phone.replace(/[\s\-()]/g, "");
              cleaned = cleaned.replace(/^002/, "").replace(/^0020/, "");
              if (cleaned.startsWith("0")) cleaned = "20" + cleaned.slice(1);
              if (!cleaned.startsWith("+")) cleaned = "+" + cleaned;
              return cleaned;
            };

            return (
              <div
                key={profile.user_id}
                className={cn(
                  "rounded-2xl border bg-card overflow-hidden transition-all duration-200",
                  isExpanded ? "border-primary/30 shadow-md" : "border-border hover:border-border/80"
                )}
              >
                {/* Header row */}
                <div className="flex items-center gap-3 p-4">
                  {/* Avatar */}
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Users className="w-5 h-5 text-primary" />
                  </div>

                  {/* Main info — clickable to expand */}
                  <button
                    className="flex-1 min-w-0 text-right"
                    onClick={() => setExpandedUser(isExpanded ? null : profile.user_id)}
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-foreground">
                        {profile.full_name || "بدون اسم"}
                      </span>
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md", getTypeBadgeColor(customerType))}>
                        {customerType}
                      </span>
                      {dealerUserIds?.has(profile.user_id) ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400">
                          تاجر
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400">
                          عميل قطاعي
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-1 flex-wrap">
                      {profile.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3" />{profile.phone}
                        </span>
                      )}
                      {profile.car_model && (
                        <span className="flex items-center gap-1">
                          <Car className="w-3 h-3" />{profile.car_model}
                          {profile.car_year && ` (${profile.car_year})`}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3" />
                        {new Date(profile.created_at).toLocaleDateString("ar-EG")}
                      </span>
                    </div>
                  </button>

                  {/* Quick action buttons */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {/* WhatsApp button */}
                    {profile.phone && (
                      <a
                        href={`https://wa.me/${formatPhoneForWhatsApp(profile.phone)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-9 h-9 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 flex items-center justify-center transition-colors"
                        title="تواصل عبر واتساب"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MessageCircle className="w-4 h-4 text-emerald-600" />
                      </a>
                    )}

                    {/* Quick stats badges */}
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      {searches.length > 0 && (
                        <span className="flex items-center gap-0.5 bg-muted/60 rounded-md px-1.5 py-1" title="عمليات بحث">
                          <Search className="w-3 h-3" />{searches.length}
                        </span>
                      )}
                      {viewedProducts.length > 0 && (
                        <span className="flex items-center gap-0.5 bg-muted/60 rounded-md px-1.5 py-1" title="أصناف مسعّرة">
                          <Eye className="w-3 h-3" />{viewedProducts.length}
                        </span>
                      )}
                      {orders && (
                        <span className="flex items-center gap-0.5 bg-muted/60 rounded-md px-1.5 py-1" title="طلبات">
                          <ShoppingCart className="w-3 h-3" />{orders.count}
                        </span>
                      )}
                    </div>

                    {/* Expand toggle */}
                    <button
                      onClick={() => setExpandedUser(isExpanded ? null : profile.user_id)}
                      className="w-8 h-8 rounded-lg hover:bg-muted/50 flex items-center justify-center transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </div>
                </div>

                {/* Expanded detail */}
                {isExpanded && (
                  <div className="px-4 pb-5 space-y-4 border-t border-border/50 pt-4">
                    {/* Contact cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="bg-muted/30 rounded-xl p-3 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Mail className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-muted-foreground">البريد الإلكتروني</p>
                          <p className="text-xs font-semibold text-foreground truncate">{profile.email || "—"}</p>
                        </div>
                      </div>
                      <div className="bg-muted/30 rounded-xl p-3 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Phone className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-muted-foreground">الهاتف</p>
                          <p className="text-xs font-semibold text-foreground" dir="ltr">{profile.phone || "—"}</p>
                        </div>
                      </div>
                      <div className="bg-muted/30 rounded-xl p-3 flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                          <Car className="w-4 h-4 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-[10px] text-muted-foreground">السيارة</p>
                          <p className="text-xs font-semibold text-foreground">
                            {profile.car_model ? `${profile.car_model}${profile.car_year ? ` (${profile.car_year})` : ""}` : "لم يحدد"}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Orders summary */}
                    {orders && (
                      <div className="bg-emerald-50 dark:bg-emerald-950/20 rounded-xl p-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/15 flex items-center justify-center shrink-0">
                          <ShoppingCart className="w-4 h-4 text-emerald-600" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">الطلبات</p>
                          <p className="text-sm text-foreground font-medium">
                            {orders.count} طلب • إجمالي {orders.total.toLocaleString("ar-EG")} ج.م
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Search history */}
                    {searches.length > 0 && (
                      <div>
                        <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                          <Search className="w-3.5 h-3.5 text-primary" />
                          سجل البحث ({searches.length} عملية)
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {searches
                            .sort((a, b) => b.count - a.count)
                            .slice(0, 15)
                            .map((s, i) => (
                              <span key={i} className="inline-flex items-center gap-1 text-xs bg-muted/50 border border-border/50 rounded-lg px-2.5 py-1 font-medium text-foreground">
                                {s.query}
                                {s.count > 1 && (
                                  <span className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded-md font-bold">
                                    {s.count}×
                                  </span>
                                )}
                              </span>
                            ))}
                        </div>
                      </div>
                    )}

                    {/* Viewed products */}
                    {viewedProducts.length > 0 && productsMap && (
                      <div>
                        <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                          <Eye className="w-3.5 h-3.5 text-primary" />
                          الأصناف المسعّرة ({viewedProducts.length} صنف)
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                          {viewedProducts.slice(0, 10).map((pid) => {
                            const product = productsMap[pid];
                            if (!product) return null;
                            return (
                              <div key={pid} className="flex items-center gap-2.5 bg-muted/30 rounded-xl p-2.5">
                                <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                                  <Package className="w-3.5 h-3.5 text-primary" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-foreground truncate">{product.name_ar}</p>
                                  <p className="text-[10px] text-muted-foreground font-mono">{product.sku}</p>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* No activity */}
                    {searches.length === 0 && viewedProducts.length === 0 && !orders && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        لا يوجد نشاط مسجل لهذا العميل بعد
                      </p>
                    )}
                  </div>
                )}
              </div>
            );
          })}

          {filteredProfiles?.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
              <p>لا توجد نتائج مطابقة</p>
            </div>
          )}
        </div>
      )}

      {/* Bulk WhatsApp Dialog */}
      <Dialog open={bulkWhatsAppOpen} onOpenChange={(open) => { setBulkWhatsAppOpen(open); if (!open) setSendingIndex(-1); }}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <MessageCircle className="w-5 h-5 text-emerald-600" />
              إرسال واتساب جماعي
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-xl p-3">
              <Users className="w-4 h-4 shrink-0" />
              <span>سيتم الإرسال لـ <strong className="text-foreground">{filteredWithPhone.length}</strong> عميل لديهم أرقام هاتف</span>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">نص الرسالة</label>
              <Textarea
                value={bulkMessage}
                onChange={(e) => setBulkMessage(e.target.value)}
                rows={4}
                className="resize-none text-sm"
                placeholder="اكتب رسالتك هنا..."
              />
              <p className="text-[11px] text-muted-foreground">
                استخدم <code className="bg-muted px-1 rounded">{"{{name}}"}</code> لإدراج اسم العميل تلقائياً
              </p>
            </div>

            {sendingIndex >= 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">التقدم</span>
                  <span className="font-bold text-foreground">{sendingIndex + 1} / {filteredWithPhone.length}</span>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${((sendingIndex + 1) / filteredWithPhone.length) * 100}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  الحالي: <strong className="text-foreground">{filteredWithPhone[sendingIndex]?.full_name || "—"}</strong> — {filteredWithPhone[sendingIndex]?.phone}
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="flex-row-reverse gap-2 sm:gap-2">
            {sendingIndex < 0 ? (
              <>
                <Button
                  onClick={handleBulkSend}
                  className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                  disabled={filteredWithPhone.length === 0 || !bulkMessage.trim()}
                >
                  <Send className="w-4 h-4" />
                  بدء الإرسال
                </Button>
                <Button
                  variant="outline"
                  onClick={handleCopyAllNumbers}
                  className="gap-2 font-bold"
                >
                  <Copy className="w-4 h-4" />
                  نسخ الأرقام
                </Button>
              </>
            ) : (
              <Button
                onClick={handleSendNext}
                className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
              >
                <ExternalLink className="w-4 h-4" />
                {sendingIndex + 1 >= filteredWithPhone.length ? "إنهاء ✅" : `التالي (${sendingIndex + 2}/${filteredWithPhone.length})`}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminCustomerIntelligence;
