import { useState, useCallback } from "react";
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
  TrendingUp, Clock, ChevronDown, ChevronUp, BarChart3,
  Package, Calendar as CalendarIcon, Filter, X, Download,
  MessageCircle, Send, Copy, ExternalLink,
} from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

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
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>("all");
  const [bulkWhatsAppOpen, setBulkWhatsAppOpen] = useState(false);
  const [bulkMessage, setBulkMessage] = useState("مرحباً {{name}}، نود إبلاغكم بأحدث العروض والخصومات الحصرية من المصرية جروب. تواصلوا معنا لمزيد من التفاصيل!");
  const [sendingIndex, setSendingIndex] = useState(-1);

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
    return true;
  });

  const hasActiveFilters = !!dateFrom || !!dateTo || (customerTypeFilter !== "all");
  const clearFilters = () => { setDateFrom(undefined); setDateTo(undefined); setCustomerTypeFilter("all"); };

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
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-primary" />
            تقرير ذكاء العملاء
          </h2>
          <p className="text-muted-foreground text-sm mt-1">
            تحليل شامل لسلوك العملاء: عمليات البحث، الأسعار المشاهدة، الطلبات
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            onClick={() => setBulkWhatsAppOpen(true)}
            variant="outline"
            className="gap-2 font-bold border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30"
          >
            <MessageCircle className="w-4 h-4" />
            واتساب جماعي ({filteredWithPhone.length})
          </Button>
          <Button onClick={handleExportExcel} className="gap-2 font-bold">
            <Download className="w-4 h-4" />
            تصدير Excel
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-black text-foreground">{totalCustomers}</p>
            <p className="text-xs text-muted-foreground">إجمالي العملاء</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Car className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-black text-foreground">{withCar}</p>
            <p className="text-xs text-muted-foreground">حددوا سيارتهم</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Search className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-black text-foreground">{totalSearches}</p>
            <p className="text-xs text-muted-foreground">عمليات بحث</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="w-8 h-8 text-primary mx-auto mb-2" />
            <p className="text-2xl font-black text-foreground">{activeSearchers}</p>
            <p className="text-xs text-muted-foreground">عملاء يبحثون</p>
          </CardContent>
        </Card>
      </div>

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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
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
                      contentStyle={{ direction: "rtl", borderRadius: 8, fontSize: 13 }}
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
