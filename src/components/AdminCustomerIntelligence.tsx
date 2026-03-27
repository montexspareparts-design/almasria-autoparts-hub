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
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import * as XLSX from "xlsx";
import { toast } from "@/hooks/use-toast";
import {
  Users, Search, Eye, ShoppingCart, Phone, Mail, Car,
  TrendingUp, Clock, ChevronDown, ChevronUp, BarChart3,
  Package, Calendar as CalendarIcon, Filter, X, Download,
} from "lucide-react";

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

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <BarChart3 className="w-6 h-6 text-primary" />
          تقرير ذكاء العملاء
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          تحليل شامل لسلوك العملاء: عمليات البحث، الأسعار المشاهدة، الطلبات
        </p>
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
        <div className="space-y-3">
          {filteredProfiles?.map((profile) => {
            const isExpanded = expandedUser === profile.user_id;
            const customerType = getCustomerType(profile.user_id);
            const searches = userSearchMap[profile.user_id] || [];
            const viewedProducts = userViewsMap[profile.user_id] || [];
            const orders = ordersMap?.[profile.user_id];

            return (
              <Card key={profile.user_id} className="overflow-hidden">
                <CardContent className="p-0">
                  {/* Header row */}
                  <button
                    className="w-full p-4 flex items-center gap-4 hover:bg-muted/30 transition-colors text-right"
                    onClick={() => setExpandedUser(isExpanded ? null : profile.user_id)}
                  >
                    {/* Avatar */}
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-primary" />
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-foreground">
                          {profile.full_name || "بدون اسم"}
                        </span>
                        <Badge className={`text-[10px] ${getTypeBadgeColor(customerType)}`}>
                          {customerType}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1 flex-wrap">
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
                          <Calendar className="w-3 h-3" />
                          {new Date(profile.created_at).toLocaleDateString("ar-EG")}
                        </span>
                      </div>
                    </div>

                    {/* Quick stats */}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground shrink-0">
                      {searches.length > 0 && (
                        <span className="flex items-center gap-1" title="عمليات بحث">
                          <Search className="w-3.5 h-3.5" />{searches.length}
                        </span>
                      )}
                      {viewedProducts.length > 0 && (
                        <span className="flex items-center gap-1" title="أصناف تم تسعيرها">
                          <Eye className="w-3.5 h-3.5" />{viewedProducts.length}
                        </span>
                      )}
                      {orders && (
                        <span className="flex items-center gap-1" title="طلبات">
                          <ShoppingCart className="w-3.5 h-3.5" />{orders.count}
                        </span>
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-4 border-t border-border pt-4">
                      {/* Contact info */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-[11px] text-muted-foreground mb-1">البريد الإلكتروني</p>
                          <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                            <Mail className="w-3.5 h-3.5 text-primary" />
                            {profile.email || "—"}
                          </p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-[11px] text-muted-foreground mb-1">الهاتف</p>
                          <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                            <Phone className="w-3.5 h-3.5 text-primary" />
                            {profile.phone || "—"}
                          </p>
                        </div>
                        <div className="bg-muted/50 rounded-lg p-3">
                          <p className="text-[11px] text-muted-foreground mb-1">السيارة</p>
                          <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                            <Car className="w-3.5 h-3.5 text-primary" />
                            {profile.car_model ? `${profile.car_model}${profile.car_year ? ` (${profile.car_year})` : ""}` : "لم يحدد"}
                          </p>
                        </div>
                      </div>

                      {/* Orders summary */}
                      {orders && (
                        <div className="bg-green-50 dark:bg-green-950/20 rounded-lg p-3">
                          <p className="text-xs font-bold text-green-800 dark:text-green-400 mb-1 flex items-center gap-1">
                            <ShoppingCart className="w-3.5 h-3.5" />
                            الطلبات
                          </p>
                          <p className="text-sm text-foreground">
                            {orders.count} طلب • إجمالي {orders.total.toLocaleString("ar-EG")} ج.م
                          </p>
                        </div>
                      )}

                      {/* Search history */}
                      {searches.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1">
                            <Search className="w-3.5 h-3.5 text-primary" />
                            سجل البحث ({searches.length} عملية)
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {searches
                              .sort((a, b) => b.count - a.count)
                              .slice(0, 15)
                              .map((s, i) => (
                                <Badge key={i} variant="outline" className="text-xs gap-1">
                                  {s.query}
                                  {s.count > 1 && (
                                    <span className="text-[9px] bg-primary/10 text-primary px-1 rounded-full">
                                      {s.count}×
                                    </span>
                                  )}
                                </Badge>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* Viewed products */}
                      {viewedProducts.length > 0 && productsMap && (
                        <div>
                          <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5 text-primary" />
                            الأصناف التي تم تسعيرها ({viewedProducts.length} صنف)
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {viewedProducts.slice(0, 10).map((pid) => {
                              const product = productsMap[pid];
                              if (!product) return null;
                              return (
                                <div key={pid} className="flex items-center gap-2 bg-muted/30 rounded-lg p-2">
                                  <Package className="w-4 h-4 text-primary shrink-0" />
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
                </CardContent>
              </Card>
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
    </div>
  );
};

export default AdminCustomerIntelligence;
