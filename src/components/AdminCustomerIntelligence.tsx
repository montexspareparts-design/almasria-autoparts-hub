import { useState, useCallback, Fragment, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { Tooltip as UITooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { format, differenceInDays } from "date-fns";
import { ar } from "date-fns/locale";
import * as XLSX from "xlsx-js-style";

const addCompanyHeader = (ws: XLSX.WorkSheet, colCount: number, reportTitle?: string) => {
  const shiftRows = 5; // company + subtitle + contact + report info + separator
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  for (let R = range.e.r; R >= 0; R--) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const oldAddr = XLSX.utils.encode_cell({ r: R, c: C });
      const newAddr = XLSX.utils.encode_cell({ r: R + shiftRows, c: C });
      if (ws[oldAddr]) {
        ws[newAddr] = ws[oldAddr];
        delete ws[oldAddr];
      }
    }
  }
  const companyStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 18, name: "Arial" },
    fill: { fgColor: { rgb: "1A1A2E" } },
    alignment: { horizontal: "center" as const, vertical: "center" as const },
  };
  ws[XLSX.utils.encode_cell({ r: 0, c: 0 })] = { v: "المصرية جروب | Al Masria Group", t: "s", s: companyStyle };
  for (let C = 1; C < colCount; C++) ws[XLSX.utils.encode_cell({ r: 0, c: C })] = { v: "", t: "s", s: companyStyle };

  const subtitleStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11, name: "Arial" },
    fill: { fgColor: { rgb: "C41E3A" } },
    alignment: { horizontal: "center" as const, vertical: "center" as const },
  };
  ws[XLSX.utils.encode_cell({ r: 1, c: 0 })] = { v: "موزع معتمد لقطع غيار وزيوت تويوتا الأصلية", t: "s", s: subtitleStyle };
  for (let C = 1; C < colCount; C++) ws[XLSX.utils.encode_cell({ r: 1, c: C })] = { v: "", t: "s", s: subtitleStyle };

  const contactStyle = {
    font: { sz: 10, color: { rgb: "666666" }, name: "Arial" },
    fill: { fgColor: { rgb: "F5F5F5" } },
    alignment: { horizontal: "center" as const, vertical: "center" as const },
  };
  ws[XLSX.utils.encode_cell({ r: 2, c: 0 })] = { v: "📞 01000000000  |  🌐 almasriaautoparts.com  |  📍 القاهرة - الجيزة - الأقصر - دبي", t: "s", s: contactStyle };
  for (let C = 1; C < colCount; C++) ws[XLSX.utils.encode_cell({ r: 2, c: C })] = { v: "", t: "s", s: contactStyle };

  // Report title + date - Row 4
  const exportDate = format(new Date(), "yyyy/MM/dd - hh:mm a");
  const reportText = reportTitle ? `📋 ${reportTitle}  |  📅 تاريخ التصدير: ${exportDate}` : `📅 تاريخ التصدير: ${exportDate}`;
  const reportStyle = {
    font: { bold: true, sz: 11, color: { rgb: "1A1A2E" }, name: "Arial" },
    fill: { fgColor: { rgb: "E8E8F0" } },
    alignment: { horizontal: "center" as const, vertical: "center" as const },
  };
  ws[XLSX.utils.encode_cell({ r: 3, c: 0 })] = { v: reportText, t: "s", s: reportStyle };
  for (let C = 1; C < colCount; C++) ws[XLSX.utils.encode_cell({ r: 3, c: C })] = { v: "", t: "s", s: reportStyle };

  // Separator row 5
  const sepStyle = { fill: { fgColor: { rgb: "FFFFFF" } } };
  for (let C = 0; C < colCount; C++) ws[XLSX.utils.encode_cell({ r: 4, c: C })] = { v: "", t: "s", s: sepStyle };

  if (!ws["!merges"]) ws["!merges"] = [];
  ws["!merges"].push(
    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: colCount - 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: colCount - 1 } },
  );
  range.e.r += shiftRows;
  ws["!ref"] = XLSX.utils.encode_range(range);
};

const applyExcelStyles = (ws: XLSX.WorkSheet, headerCount: number, reportTitle?: string) => {
  addCompanyHeader(ws, headerCount, reportTitle);

  const headerStyle = {
    font: { bold: true, color: { rgb: "FFFFFF" }, sz: 12, name: "Arial" },
    fill: { fgColor: { rgb: "C41E3A" } },
    alignment: { horizontal: "center" as const, vertical: "center" as const, wrapText: true },
    border: {
      top: { style: "thin" as const, color: { rgb: "999999" } },
      bottom: { style: "thin" as const, color: { rgb: "999999" } },
      left: { style: "thin" as const, color: { rgb: "999999" } },
      right: { style: "thin" as const, color: { rgb: "999999" } },
    },
  };
  const cellStyle = {
    font: { sz: 11, name: "Arial" },
    alignment: { horizontal: "center" as const, vertical: "center" as const, wrapText: true },
    border: {
      top: { style: "thin" as const, color: { rgb: "DDDDDD" } },
      bottom: { style: "thin" as const, color: { rgb: "DDDDDD" } },
      left: { style: "thin" as const, color: { rgb: "DDDDDD" } },
      right: { style: "thin" as const, color: { rgb: "DDDDDD" } },
    },
  };
  const altRowStyle = { ...cellStyle, fill: { fgColor: { rgb: "FFF5F5" } } };
  const range = XLSX.utils.decode_range(ws["!ref"] || "A1");
  // Row 5 (index 5) is now the data header row
  for (let C = range.s.c; C <= range.e.c; C++) {
    const addr = XLSX.utils.encode_cell({ r: 5, c: C });
    if (ws[addr]) ws[addr].s = headerStyle;
  }
  let customerIdx = 0;
  for (let R = 6; R <= range.e.r; R++) {
    const numCell = ws[XLSX.utils.encode_cell({ r: R, c: 0 })];
    if (numCell && numCell.v !== "" && numCell.v !== undefined) customerIdx++;
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      if (ws[addr]) ws[addr].s = customerIdx % 2 === 0 ? altRowStyle : cellStyle;
    }
  }
  ws["!rows"] = [{ hpt: 40 }, { hpt: 24 }, { hpt: 22 }, { hpt: 26 }, { hpt: 10 }, { hpt: 28 }];
};
import { toast } from "@/hooks/use-toast";
import {
  Users, Search, Eye, ShoppingCart, Phone, Mail, Car,
  TrendingUp, TrendingDown, Clock, ChevronDown, ChevronUp, BarChart3,
  Package, Calendar as CalendarIcon, Filter, X, Download,
  MessageCircle, Send, Copy, ExternalLink, Briefcase,
  Star, Activity, AlertTriangle, CheckCircle2, ListOrdered, FileText, RefreshCw,
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

const LIFECYCLE_LABELS: Record<string, { label: string; color: string; icon: typeof Star }> = {
  vip: { label: "VIP", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400", icon: Star },
  active: { label: "نشط", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400", icon: Activity },
  idle: { label: "خامل", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400", icon: Clock },
  lost: { label: "مفقود", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", icon: AlertTriangle },
  new: { label: "جديد", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", icon: Users },
};

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

  // Orders with dates per user
  const { data: ordersData } = useQuery({
    queryKey: ["admin_orders_full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("orders")
        .select("user_id, id, total_amount, status, created_at, order_number")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Dealer quotes per user
  const { data: quotesData } = useQuery({
    queryKey: ["admin_dealer_quotes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dealer_quotes")
        .select("user_id, id, total_amount, status, created_at");
      if (error) throw error;
      return data;
    },
  });

  // Shopping lists per user
  const { data: shoppingListsData } = useQuery({
    queryKey: ["admin_shopping_lists"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dealer_shopping_lists")
        .select("user_id, id, name, created_at");
      if (error) throw error;
      return data;
    },
  });

  // Order items for purchase check
  const { data: orderItemsData } = useQuery({
    queryKey: ["admin_order_items_all"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("order_items")
        .select("order_id, product_id, quantity");
      if (error) throw error;
      return data;
    },
  });

  // Customer communications log (calls/messages by staff)
  const { data: communicationsData } = useQuery({
    queryKey: ["admin_customer_communications"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("customer_communications")
        .select("id, customer_user_id, staff_user_id, comm_type, note, created_at")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data;
    },
  });

  // Cart items count per dealer (for "abandoned cart" alert)
  const { data: cartItemsData } = useQuery({
    queryKey: ["admin_dealer_carts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dealer_cart_items")
        .select("user_id, updated_at");
      if (error) throw error;
      return data;
    },
  });

  // Page visits last seen per user
  const { data: lastVisitData } = useQuery({
    queryKey: ["admin_last_visits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_visits")
        .select("user_id, visited_at")
        .order("visited_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return data;
    },
  });

  // Build orders map with last order date
  const ordersMap = useMemo(() => {
    if (!ordersData) return {} as Record<string, { count: number; total: number; lastOrderDate: string; lastOrderNumber: string }>;
    const map: Record<string, { count: number; total: number; lastOrderDate: string; lastOrderNumber: string }> = {};
    ordersData.forEach(o => {
      if (!map[o.user_id]) {
        map[o.user_id] = { count: 0, total: 0, lastOrderDate: o.created_at, lastOrderNumber: o.order_number };
      }
      map[o.user_id].count++;
      map[o.user_id].total += Number(o.total_amount || 0);
      if (o.created_at > map[o.user_id].lastOrderDate) {
        map[o.user_id].lastOrderDate = o.created_at;
        map[o.user_id].lastOrderNumber = o.order_number;
      }
    });
    return map;
  }, [ordersData]);

  // Build quotes map
  const quotesMap = useMemo(() => {
    if (!quotesData) return {} as Record<string, number>;
    const map: Record<string, number> = {};
    quotesData.forEach(q => {
      map[q.user_id] = (map[q.user_id] || 0) + 1;
    });
    return map;
  }, [quotesData]);

  // Build shopping lists map
  const shoppingListsMap = useMemo(() => {
    if (!shoppingListsData) return {} as Record<string, { count: number; names: string[] }>;
    const map: Record<string, { count: number; names: string[] }> = {};
    shoppingListsData.forEach(sl => {
      if (!map[sl.user_id]) map[sl.user_id] = { count: 0, names: [] };
      map[sl.user_id].count++;
      map[sl.user_id].names.push(sl.name);
    });
    return map;
  }, [shoppingListsData]);

  // Build purchased product IDs per user
  const purchasedProductsByUser = useMemo(() => {
    if (!orderItemsData || !ordersData) return {} as Record<string, Set<string>>;
    const orderUserMap: Record<string, string> = {};
    ordersData.forEach(o => { orderUserMap[o.id] = o.user_id; });
    const map: Record<string, Set<string>> = {};
    orderItemsData.forEach(oi => {
      const userId = orderUserMap[oi.order_id];
      if (!userId) return;
      if (!map[userId]) map[userId] = new Set();
      map[userId].add(oi.product_id);
    });
    return map;
  }, [orderItemsData, ordersData]);

  // Communications grouped by customer
  const communicationsByUser = useMemo(() => {
    const map: Record<string, { id: string; comm_type: string; note: string | null; created_at: string; staff_user_id: string }[]> = {};
    communicationsData?.forEach(c => {
      if (!map[c.customer_user_id]) map[c.customer_user_id] = [];
      map[c.customer_user_id].push(c);
    });
    return map;
  }, [communicationsData]);

  // Cart items grouped by user (last update)
  const cartByUser = useMemo(() => {
    const map: Record<string, { count: number; lastUpdated: string }> = {};
    cartItemsData?.forEach(c => {
      if (!map[c.user_id]) map[c.user_id] = { count: 0, lastUpdated: c.updated_at };
      map[c.user_id].count++;
      if (c.updated_at > map[c.user_id].lastUpdated) map[c.user_id].lastUpdated = c.updated_at;
    });
    return map;
  }, [cartItemsData]);

  // Last visit per user
  const lastVisitByUser = useMemo(() => {
    const map: Record<string, string> = {};
    lastVisitData?.forEach(v => {
      if (!v.user_id) return;
      if (!map[v.user_id] || v.visited_at > map[v.user_id]) map[v.user_id] = v.visited_at;
    });
    return map;
  }, [lastVisitData]);

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

  // Build search heatmap data (hour of day)
  const searchHeatmapData = useMemo(() => {
    if (!searchLogs) return [];
    const hourCounts: Record<number, number> = {};
    for (let i = 0; i < 24; i++) hourCounts[i] = 0;
    searchLogs.forEach((log: any) => {
      const hour = new Date(log.created_at).getHours();
      hourCounts[hour]++;
    });
    return Object.entries(hourCounts).map(([hour, count]) => ({
      hour: `${String(hour).padStart(2, "0")}:00`,
      بحث: count,
      hourNum: Number(hour),
    }));
  }, [searchLogs]);

  // Return rate: distinct days user searched
  const userReturnRate = useMemo(() => {
    if (!searchLogs) return {} as Record<string, number>;
    const map: Record<string, Set<string>> = {};
    searchLogs.forEach((log: any) => {
      const uid = log.user_id;
      if (!uid) return;
      if (!map[uid]) map[uid] = new Set();
      map[uid].add(new Date(log.created_at).toDateString());
    });
    const result: Record<string, number> = {};
    Object.entries(map).forEach(([uid, days]) => { result[uid] = days.size; });
    return result;
  }, [searchLogs]);

  // Lifecycle classification
  const getLifecycleStage = (userId: string): string => {
    const orders = ordersMap?.[userId];
    const now = new Date();

    if (orders && orders.count >= 5 && orders.total >= 10000) return "vip";
    if (orders && orders.count >= 1) {
      const daysSinceLastOrder = differenceInDays(now, new Date(orders.lastOrderDate));
      if (daysSinceLastOrder <= 30) return "active";
      if (daysSinceLastOrder <= 90) return "idle";
      return "lost";
    }
    const searches = userSearchMap[userId];
    if (searches && searches.length > 0) {
      const lastSearch = new Date(Math.max(...searches.map(s => new Date(s.lastAt).getTime())));
      const daysSinceSearch = differenceInDays(now, lastSearch);
      if (daysSinceSearch <= 30) return "active";
      if (daysSinceSearch <= 90) return "idle";
      return "lost";
    }
    return "new";
  };

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

  // Generate quick alerts for a customer (red/orange flags for staff attention)
  const getCustomerAlerts = (userId: string): { icon: string; label: string; color: string; type: "danger" | "warning" | "info" }[] => {
    const alerts: { icon: string; label: string; color: string; type: "danger" | "warning" | "info" }[] = [];
    const orders = ordersMap?.[userId];
    const searches = userSearchMap[userId] || [];
    const cart = cartByUser[userId];
    const lastVisit = lastVisitByUser[userId];
    const purchasedSet = purchasedProductsByUser[userId];

    // 1. Abandoned cart
    if (cart && cart.count > 0) {
      const daysSince = differenceInDays(new Date(), new Date(cart.lastUpdated));
      if (daysSince >= 1) {
        alerts.push({
          icon: "🛒",
          label: `سلة متروكة (${cart.count} صنف منذ ${daysSince} يوم)`,
          color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-300/50",
          type: "danger",
        });
      }
    }

    // 2. Heavy searcher with no orders
    const totalSearchCount = searches.reduce((s, q) => s + q.count, 0);
    if (totalSearchCount >= 5 && !orders) {
      alerts.push({
        icon: "🔥",
        label: `بحث ${totalSearchCount} مرة بدون أي طلب`,
        color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400 border-orange-300/50",
        type: "warning",
      });
    }

    // 3. Customer has not visited in long time
    if (lastVisit) {
      const daysSinceVisit = differenceInDays(new Date(), new Date(lastVisit));
      if (daysSinceVisit >= 14 && orders) {
        alerts.push({
          icon: "👋",
          label: `عميل غايب منذ ${daysSinceVisit} يوم`,
          color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300/50",
          type: "warning",
        });
      }
    }

    // 4. Searched many but didn't buy what they searched
    if (searches.length >= 3 && purchasedSet) {
      const unpurchasedSearches = searches.filter(s => {
        const ql = s.query.toLowerCase();
        return !Object.values(productsMap || {}).some((p: any) =>
          purchasedSet.has(p.id) && (p.name_ar?.toLowerCase().includes(ql) || p.sku?.toLowerCase().includes(ql))
        );
      });
      if (unpurchasedSearches.length >= searches.length * 0.7 && orders) {
        alerts.push({
          icon: "🎯",
          label: `${unpurchasedSearches.length} بحث بدون شراء — فرصة بيع`,
          color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-300/50",
          type: "info",
        });
      }
    }

    // 5. New customer (registered < 3 days, no order)
    const profile = profiles?.find(p => p.user_id === userId);
    if (profile) {
      const daysSinceJoin = differenceInDays(new Date(), new Date(profile.created_at));
      if (daysSinceJoin <= 3 && !orders && totalSearchCount > 0) {
        alerts.push({
          icon: "✨",
          label: "عميل جديد نشط — رحب به!",
          color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300/50",
          type: "info",
        });
      }
    }

    return alerts;
  };

  // Build a ready-to-use call/whatsapp script based on customer behavior
  const buildCallScript = (userId: string): string => {
    const profile = profiles?.find(p => p.user_id === userId);
    const name = profile?.full_name?.split(" ")[0] || "حضرتك";
    const orders = ordersMap?.[userId];
    const searches = userSearchMap[userId] || [];
    const cart = cartByUser[userId];
    const topSearches = [...searches].sort((a, b) => b.count - a.count).slice(0, 3).map(s => s.query);
    const isDealer = dealerUserIds?.has(userId);

    let opening = `السلام عليكم أستاذ/${name}، معاك ${isDealer ? "خدمة عملاء التجار" : "خدمة عملاء"} المصرية جروب.`;
    let body = "";

    if (cart && cart.count > 0) {
      body = `\n\nلاحظت إن حضرتك مضيف ${cart.count} صنف في عربة التسوق ومش كملت الطلب. هل في حاجة محتاج توضيح فيها؟ أنا هنا أساعدك.`;
    } else if (topSearches.length > 0 && !orders) {
      body = `\n\nلاحظت إن حضرتك بتبحث عن: ${topSearches.join("، ")}. الأصناف دي متوفرة عندنا وممكن أساعدك بأفضل سعر وأسرع توصيل.`;
    } else if (orders) {
      const daysSinceLast = differenceInDays(new Date(), new Date(orders.lastOrderDate));
      if (daysSinceLast >= 30) {
        body = `\n\nمر فترة من آخر طلب لحضرتك (${daysSinceLast} يوم). عندنا عروض جديدة ووصول أصناف جديدة، تحب أبعتها لحضرتك؟`;
      } else {
        body = `\n\nأطمن على طلبك الأخير (${orders.lastOrderNumber})، كل حاجة تمام؟ وفي أي حاجة تانية أقدر أساعدك فيها؟`;
      }
    } else if (topSearches.length > 0) {
      body = `\n\nشفت إن حضرتك بحثت عن: ${topSearches.join("، ")}. تحب أساعدك تلاقي أفضل بدائل وأسعار؟`;
    } else {
      body = `\n\nأهلاً بحضرتك في المصرية جروب! هل في صنف معين بتدور عليه أقدر أساعدك فيه؟`;
    }

    return opening + body + "\n\nشكراً لتعاملك معانا 🙏";
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

    const profileRows = filteredProfiles.map(p => {
      const type = getCustomerType(p.user_id);
      const orders = ordersMap?.[p.user_id];
      const searches = userSearchMap[p.user_id] || [];
      const views = userViewsMap[p.user_id] || [];
      const lifecycle = getLifecycleStage(p.user_id);
      const lcLabel = LIFECYCLE_LABELS[lifecycle]?.label || "جديد";
      return {
        "الاسم": p.full_name || "—",
        "الهاتف": p.phone || "—",
        "البريد الإلكتروني": p.email || "—",
        "نوع السيارة": p.car_model || "—",
        "سنة السيارة": p.car_year || "—",
        "تاريخ التسجيل": format(new Date(p.created_at), "yyyy-MM-dd"),
        "تصنيف العميل": type,
        "مرحلة دورة الحياة": lcLabel,
        "عدد الطلبات": orders?.count || 0,
        "إجمالي المشتريات (ج.م)": orders?.total || 0,
        "آخر طلب": orders?.lastOrderDate ? format(new Date(orders.lastOrderDate), "yyyy-MM-dd") : "—",
        "عدد عروض الأسعار": quotesMap[p.user_id] || 0,
        "قوائم التسوق": shoppingListsMap[p.user_id]?.count || 0,
        "عدد عمليات البحث": searches.length,
        "عدد الأصناف المسعّرة": views.length,
        "معدل العودة (أيام)": userReturnRate[p.user_id] || 0,
      };
    });

    const searchRows: any[] = [];
    filteredProfiles.forEach(p => {
      const searches = userSearchMap[p.user_id] || [];
      const purchased = purchasedProductsByUser[p.user_id];
      searches.forEach(s => {
        const queryLower = s.query.toLowerCase();
        const hasPurchased = purchased ? Array.from(purchased).some(pid => {
          const prod = productsMap?.[pid];
          return prod && (prod.name_ar?.toLowerCase().includes(queryLower) || prod.name_en?.toLowerCase().includes(queryLower) || prod.sku?.toLowerCase().includes(queryLower));
        }) : false;
        searchRows.push({
          "الاسم": p.full_name || "—",
          "الهاتف": p.phone || "—",
          "البريد": p.email || "—",
          "كلمة البحث": s.query,
          "عدد المرات": s.count,
          "آخر بحث": format(new Date(s.lastAt), "yyyy-MM-dd HH:mm"),
          "تم الشراء": hasPurchased ? "✓" : "✗",
        });
      });
    });

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

    // Sheet 4: Heatmap summary
    const hourCounts: Record<number, number> = {};
    searchLogs?.forEach((log: any) => {
      const h = new Date(log.created_at).getHours();
      hourCounts[h] = (hourCounts[h] || 0) + 1;
    });
    const heatmapRows = Array.from({ length: 24 }, (_, i) => ({
      "الساعة": `${i}:00`,
      "عدد عمليات البحث": hourCounts[i] || 0,
    }));

    const wb = XLSX.utils.book_new();
    const ws1 = XLSX.utils.json_to_sheet(profileRows);
    const ws2 = XLSX.utils.json_to_sheet(searchRows.length > 0 ? searchRows : [{ "ملاحظة": "لا توجد بيانات بحث" }]);
    const ws3 = XLSX.utils.json_to_sheet(viewRows.length > 0 ? viewRows : [{ "ملاحظة": "لا توجد بيانات تسعير" }]);
    const ws4 = XLSX.utils.json_to_sheet(heatmapRows);

    [ws1, ws2, ws3, ws4].forEach(ws => { ws["!dir"] = "rtl" as any; });
    ws1["!cols"] = [
      { wch: 20 }, { wch: 15 }, { wch: 25 }, { wch: 15 }, { wch: 12 },
      { wch: 14 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 18 },
      { wch: 14 }, { wch: 14 }, { wch: 14 }, { wch: 15 }, { wch: 18 }, { wch: 14 },
    ];
    ws2["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 20 }, { wch: 30 }, { wch: 12 }, { wch: 18 }, { wch: 10 }];
    ws3["!cols"] = [{ wch: 20 }, { wch: 15 }, { wch: 35 }, { wch: 18 }, { wch: 15 }];
    ws4["!cols"] = [{ wch: 10 }, { wch: 20 }];

    applyExcelStyles(ws1, 16, "ملف العملاء");
    applyExcelStyles(ws2, 16, "سجل البحث والشراء");
    applyExcelStyles(ws3, 16, "الأصناف المسعّرة");
    applyExcelStyles(ws4, 16, "ملخص أوقات البحث");
    XLSX.utils.book_append_sheet(wb, ws1, "ملف العملاء");
    XLSX.utils.book_append_sheet(wb, ws2, "سجل البحث والشراء");
    XLSX.utils.book_append_sheet(wb, ws3, "الأصناف المسعّرة");
    XLSX.utils.book_append_sheet(wb, ws4, "أوقات البحث");

    XLSX.writeFile(wb, `تقرير_ذكاء_العملاء_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    toast({ title: "تم تصدير التقرير بنجاح ✅" });
  }, [filteredProfiles, ordersMap, userSearchMap, userViewsMap, productsMap, quotesMap, shoppingListsMap, userReturnRate, purchasedProductsByUser, searchLogs]);

  // Lifecycle distribution
  const lifecycleCounts = useMemo(() => {
    if (!profiles) return {} as Record<string, number>;
    const counts: Record<string, number> = { vip: 0, active: 0, idle: 0, lost: 0, new: 0 };
    profiles.forEach(p => {
      const stage = getLifecycleStage(p.user_id);
      counts[stage] = (counts[stage] || 0) + 1;
    });
    return counts;
  }, [profiles, ordersMap, userSearchMap]);

  // 🔥 Hot leads: customers needing urgent attention (high search activity, no orders yet, recent activity)
  const hotLeads = useMemo(() => {
    if (!filteredProfiles) return [];
    const now = Date.now();
    return filteredProfiles
      .map(p => {
        const searches = userSearchMap[p.user_id] || [];
        const views = userViewsMap[p.user_id] || [];
        const orderInfo = ordersMap?.[p.user_id];
        const ordersCount = orderInfo?.count || 0;
        const totalSearches = searches.reduce((s, x) => s + x.count, 0);
        const lastSearchAt = searches.reduce((max, s) => s.lastAt > max ? s.lastAt : max, "");
        const lastViewAt = (priceViews || []).find(v => v.user_id === p.user_id)?.viewed_at || "";
        const lastActivity = [lastSearchAt, lastViewAt].filter(Boolean).sort().pop() || "";
        const daysSinceActivity = lastActivity ? Math.floor((now - new Date(lastActivity).getTime()) / 86400000) : 999;
        // Top searched query
        const topSearch = [...searches].sort((a, b) => b.count - a.count)[0];
        // Top viewed products (names)
        const topProducts = views.slice(0, 3).map(pid => productsMap?.[pid]?.name_ar).filter(Boolean) as string[];
        // Score: more search + recent activity + no orders = hotter
        const noOrders = ordersCount === 0;
        const score =
          (totalSearches * 3) +
          (views.length * 2) +
          (noOrders && totalSearches >= 3 ? 15 : 0) +
          (daysSinceActivity <= 1 ? 10 : daysSinceActivity <= 3 ? 5 : 0);
        // Need-reason classification
        let needReason = "";
        let needBadge: { label: string; color: string } = { label: "", color: "" };
        if (noOrders && totalSearches >= 5) {
          needReason = `بحث ${totalSearches} مرة بدون طلب — جاهز للتحويل`;
          needBadge = { label: "🔥 فرصة تحويل", color: "bg-red-500/15 text-red-700 dark:text-red-400 border-red-300 dark:border-red-800" };
        } else if (views.length >= 3 && noOrders) {
          needReason = `كشف سعر ${views.length} منتج — قرار شراء قريب`;
          needBadge = { label: "💰 سلة محتملة", color: "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-800" };
        } else if (daysSinceActivity <= 1 && totalSearches >= 2) {
          needReason = `نشط الآن — يبحث عن ${topSearch?.query || "منتجات"}`;
          needBadge = { label: "⚡ نشط الآن", color: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-300 dark:border-emerald-800" };
        } else if (ordersCount >= 2 && daysSinceActivity > 30) {
          needReason = `عميل سابق غايب من ${daysSinceActivity} يوم — يحتاج تنشيط`;
          needBadge = { label: "🔄 إعادة تنشيط", color: "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-300 dark:border-blue-800" };
        } else if (totalSearches >= 3) {
          needReason = `يبحث عن ${topSearch?.query || "منتجات متعددة"}`;
          needBadge = { label: "🔍 باحث نشط", color: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-400 border-cyan-300 dark:border-cyan-800" };
        }
        return {
          profile: p,
          score,
          totalSearches,
          viewsCount: views.length,
          ordersCount,
          daysSinceActivity,
          lastActivity,
          topSearch: topSearch?.query || null,
          topProducts,
          needReason,
          needBadge,
        };
      })
      .filter(x => x.needReason && x.score >= 8)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [filteredProfiles, userSearchMap, userViewsMap, ordersMap, priceViews, productsMap]);


  return (
    <div className="space-y-5" dir="rtl">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-l from-primary/10 via-primary/5 to-transparent border border-primary/10 p-5">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,hsl(var(--primary)/0.08),transparent_60%)]" />
        <div className="relative flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-xl font-black text-foreground flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-primary/15 flex items-center justify-center shadow-sm">
                <BarChart3 className="w-4.5 h-4.5 text-primary" />
              </div>
              تقرير ذكاء العملاء
            </h2>
            <p className="text-muted-foreground text-xs mt-1.5 mr-[44px]">
              تحليل شامل لسلوك العملاء: البحث، التسعير، الطلبات، دورة الحياة
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              onClick={() => setBulkWhatsAppOpen(true)}
              variant="outline"
              size="sm"
              className="gap-1.5 font-bold border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400 dark:hover:bg-emerald-950/30 rounded-xl"
            >
              <MessageCircle className="w-3.5 h-3.5" />
              واتساب جماعي ({filteredWithPhone.length})
            </Button>
            <Button onClick={handleExportExcel} size="sm" className="gap-1.5 font-bold rounded-xl shadow-sm">
              <Download className="w-3.5 h-3.5" />
              تصدير Excel
            </Button>
          </div>
        </div>
      </div>

      {/* KPIs Row */}
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2.5">
        {[
          { icon: Users, value: totalCustomers, label: "إجمالي العملاء", iconBg: "bg-primary/15", iconColor: "text-primary" },
          { icon: Briefcase, value: dealerCount, label: "تاجر", iconBg: "bg-blue-500/15", iconColor: "text-blue-600 dark:text-blue-400" },
          { icon: ShoppingCart, value: retailCount, label: "قطاعي", iconBg: "bg-orange-500/15", iconColor: "text-orange-600 dark:text-orange-400" },
          { icon: Car, value: withCar, label: "حددوا سيارتهم", iconBg: "bg-violet-500/15", iconColor: "text-violet-600 dark:text-violet-400" },
          { icon: Search, value: totalSearches, label: "عمليات بحث", iconBg: "bg-cyan-500/15", iconColor: "text-cyan-600 dark:text-cyan-400" },
          { icon: TrendingUp, value: activeSearchers, label: "عملاء يبحثون", iconBg: "bg-emerald-500/15", iconColor: "text-emerald-600 dark:text-emerald-400" },
        ].map((kpi, idx) => (
          <div key={idx} className="rounded-xl border border-border/40 bg-card p-3 text-center transition-all hover:shadow-sm hover:border-border/60 duration-200">
            <div className={cn("w-8 h-8 rounded-lg mx-auto mb-1.5 flex items-center justify-center", kpi.iconBg)}>
              <kpi.icon className={cn("w-4 h-4", kpi.iconColor)} />
            </div>
            <p className="text-xl font-black text-foreground">{kpi.value}</p>
            <p className="text-[10px] text-muted-foreground font-medium">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* 🔥 Hot Leads — Smart Auto Summary */}
      {hotLeads.length > 0 && (
        <Card className="rounded-2xl border-2 border-primary/20 shadow-sm overflow-hidden bg-gradient-to-l from-primary/5 via-background to-background">
          <CardHeader className="py-3 px-4 border-b border-border/40">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm font-black flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-md">
                  <Zap className="w-3.5 h-3.5 text-white" />
                </div>
                ملخص ذكي — عملاء يحتاجون متابعة الآن
                <Badge variant="secondary" className="text-[10px] h-5 mr-1">{hotLeads.length}</Badge>
              </CardTitle>
              <span className="text-[10px] text-muted-foreground font-medium">
                مرتب حسب الأولوية والاحتياج المحتمل
              </span>
            </div>
          </CardHeader>
          <CardContent className="p-3">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {hotLeads.map((lead) => {
                const p = lead.profile;
                const phoneDigits = p.phone?.replace(/\D/g, "") || "";
                const waNumber = phoneDigits.startsWith("0") ? "20" + phoneDigits.slice(1) : phoneDigits;
                const waMsg = encodeURIComponent(
                  `مرحباً ${p.full_name || "عميلنا الكريم"}، من المصرية جروب. لاحظنا اهتمامك بـ "${lead.topSearch || lead.topProducts[0] || "منتجاتنا"}" — هل يمكنني مساعدتك؟`
                );
                return (
                  <div
                    key={p.user_id}
                    className="rounded-xl border border-border/50 bg-card p-3 hover:shadow-md hover:border-primary/30 transition-all cursor-pointer group"
                    onClick={() => setExpandedUser(p.user_id)}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-foreground truncate">
                          {p.full_name || "عميل بدون اسم"}
                        </p>
                        {p.phone && (
                          <p className="text-[10px] text-muted-foreground font-mono mt-0.5" dir="ltr">{p.phone}</p>
                        )}
                      </div>
                      <Badge variant="outline" className={cn("text-[9px] h-5 px-1.5 font-bold border whitespace-nowrap", lead.needBadge.color)}>
                        {lead.needBadge.label}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-foreground/80 leading-relaxed mb-2 line-clamp-2">
                      💡 {lead.needReason}
                    </p>
                    {lead.topProducts.length > 0 && (
                      <div className="flex items-center gap-1 flex-wrap mb-2">
                        <span className="text-[9px] text-muted-foreground font-bold">شاف سعر:</span>
                        {lead.topProducts.slice(0, 2).map((name, i) => (
                          <Badge key={i} variant="secondary" className="text-[9px] h-4 px-1.5 max-w-[110px] truncate">
                            {name}
                          </Badge>
                        ))}
                        {lead.viewsCount > 2 && (
                          <span className="text-[9px] text-muted-foreground">+{lead.viewsCount - 2}</span>
                        )}
                      </div>
                    )}
                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40">
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                        <span className="flex items-center gap-0.5"><Search className="w-2.5 h-2.5" />{lead.totalSearches}</span>
                        <span className="flex items-center gap-0.5"><Eye className="w-2.5 h-2.5" />{lead.viewsCount}</span>
                        <span className="flex items-center gap-0.5"><ShoppingCart className="w-2.5 h-2.5" />{lead.ordersCount}</span>
                        {lead.daysSinceActivity < 999 && (
                          <span className="flex items-center gap-0.5 font-bold text-foreground/70">
                            <Clock className="w-2.5 h-2.5" />
                            {lead.daysSinceActivity === 0 ? "اليوم" : `${lead.daysSinceActivity}ي`}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        {p.phone && (
                          <>
                            <a
                              href={`tel:${p.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className="w-6 h-6 rounded-md bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
                              title="اتصال"
                            >
                              <Phone className="w-3 h-3 text-primary" />
                            </a>
                            <a
                              href={`https://wa.me/${waNumber}?text=${waMsg}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="w-6 h-6 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 flex items-center justify-center transition-colors"
                              title="واتساب"
                            >
                              <MessageCircle className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            </a>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Charts Row: Heatmap + Customer Type */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Search Heatmap */}
        {searchHeatmapData.length > 0 && (
          <Card className="rounded-xl border-border/40 shadow-sm overflow-hidden">
            <CardHeader className="py-3 px-4 bg-gradient-to-l from-cyan-500/5 to-transparent">
              <CardTitle className="text-sm font-black flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/15 flex items-center justify-center">
                  <Clock className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
                </div>
                خريطة أوقات البحث
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 pt-0">
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={searchHeatmapData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                    <XAxis dataKey="hour" tick={{ fontSize: 9 }} interval={2} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip
                      contentStyle={{ direction: "rtl", borderRadius: 10, fontSize: 11, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                      formatter={(value: number) => [`${value} بحث`, ""]}
                      labelFormatter={(label) => `الساعة ${label}`}
                    />
                    <Bar dataKey="بحث" radius={[3, 3, 0, 0]} barSize={14}>
                      {searchHeatmapData.map((entry, index) => {
                        const max = Math.max(...searchHeatmapData.map(d => d.بحث), 1);
                        const intensity = entry.بحث / max;
                        const hue = intensity > 0.7 ? 0 : intensity > 0.4 ? 25 : 200;
                        const sat = 70 + intensity * 20;
                        const light = 65 - intensity * 20;
                        return <Cell key={index} fill={`hsl(${hue}, ${sat}%, ${light}%)`} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {(() => {
                const sorted = [...searchHeatmapData].sort((a, b) => b.بحث - a.بحث);
                const top3 = sorted.slice(0, 3).filter(d => d.بحث > 0);
                if (top3.length === 0) return null;
                return (
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    <span className="text-[10px] font-bold text-muted-foreground">🔥 الأوقات الأنشط:</span>
                    {top3.map((d, i) => (
                      <Badge key={i} variant="secondary" className="text-[9px] h-5">
                        {d.hour} ({d.بحث})
                      </Badge>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>
        )}

        {/* Customer Type Distribution */}
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
            <Card className="rounded-xl border-border/40 shadow-sm overflow-hidden">
              <CardHeader className="py-3 px-4 bg-gradient-to-l from-violet-500/5 to-transparent">
                <CardTitle className="text-sm font-black flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-violet-500/15 flex items-center justify-center">
                    <BarChart3 className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400" />
                  </div>
                  توزيع أنواع العملاء
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 pt-0">
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={chartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={3}
                        dataKey="value"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {chartData.map((entry, index) => (
                          <Cell key={entry.name} fill={typeColorMap[entry.name] || COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(value: number) => [`${value} عميل`, ""]}
                        contentStyle={{ direction: "rtl", borderRadius: 10, fontSize: 11, boxShadow: '0 4px 16px rgba(0,0,0,0.08)' }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          );
        })()}
      </div>

      {/* Filters & Search - moved up for better UX */}
      <Card className="rounded-xl border-border/40 shadow-sm">
        <CardContent className="py-3 px-4">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="relative flex-1 min-w-[180px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="ابحث بالاسم أو الهاتف أو الإيميل..."
                className="pr-9 h-8 text-xs"
              />
            </div>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("gap-1 text-[11px] h-8", !dateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="w-3 h-3" />
                  {dateFrom ? format(dateFrom, "dd/MM/yyyy") : "من تاريخ"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} disabled={(date) => date > new Date()} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("gap-1 text-[11px] h-8", !dateTo && "text-muted-foreground")}>
                  <CalendarIcon className="w-3 h-3" />
                  {dateTo ? format(dateTo, "dd/MM/yyyy") : "إلى تاريخ"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={dateTo} onSelect={setDateTo} disabled={(date) => date > new Date()} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>
            <Select value={customerTypeFilter} onValueChange={setCustomerTypeFilter}>
              <SelectTrigger className="w-[150px] h-8 text-[11px]">
                <Filter className="w-3 h-3 ml-1" />
                <SelectValue placeholder="نوع العميل" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأنواع</SelectItem>
                {CUSTOMER_TYPES.map(type => (
                  <SelectItem key={type} value={type}>{type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={accountTypeFilter} onValueChange={setAccountTypeFilter}>
              <SelectTrigger className="w-[130px] h-8 text-[11px]">
                <Users className="w-3 h-3 ml-1" />
                <SelectValue placeholder="نوع الحساب" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="dealer">تاجر</SelectItem>
                <SelectItem value="retail">قطاعي</SelectItem>
              </SelectContent>
            </Select>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="gap-1 text-[11px] h-8 text-destructive" onClick={clearFilters}>
                <X className="w-3 h-3" />
                مسح
              </Button>
            )}
            <span className="text-[11px] text-muted-foreground mr-auto font-medium">
              {filteredProfiles?.length || 0} عميل
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Top Searchers vs Orders Report */}
      {profiles && profiles.length > 0 && (() => {
        const now = new Date();
        const cutoff = reportTimeFilter === "7d" ? new Date(now.getTime() - 7 * 86400000)
          : reportTimeFilter === "30d" ? new Date(now.getTime() - 30 * 86400000)
          : reportTimeFilter === "90d" ? new Date(now.getTime() - 90 * 86400000)
          : null;

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

        searcherData.sort((a, b) => b.searches - a.searches);
        const top15 = searcherData.slice(0, 15);
        const maxSearches = Math.max(...top15.map(d => d.searches), 1);
        const maxOrders = Math.max(...top15.map(d => d.orders), 1);

        const totalSearchers = searcherData.length;
        const convertedCount = searcherData.filter(d => d.converted).length;
        const overallConversion = totalSearchers > 0 ? Math.round((convertedCount / totalSearchers) * 100) : 0;
        const avgSearchesPerUser = totalSearchers > 0
          ? Math.round(searcherData.reduce((s, d) => s + d.searches, 0) / totalSearchers)
          : 0;
        const topNonConverted = searcherData.filter(d => !d.converted).slice(0, 5);

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
          <Card className="rounded-xl border-primary/15 shadow-sm overflow-hidden">
            <CardHeader className="py-3 px-4 bg-gradient-to-l from-primary/8 via-primary/3 to-transparent">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-sm font-black flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-primary/15 flex items-center justify-center shadow-sm">
                      <TrendingUp className="w-3.5 h-3.5 text-primary" />
                    </div>
                    أكثر العملاء بحثاً مقابل الطلبات
                  </CardTitle>
                  <p className="text-[10px] text-muted-foreground mt-1 mr-[36px]">
                    مقارنة نشاط البحث وتحويله لطلبات — أداة لاكتشاف الفرص
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-1.5 text-xs font-bold rounded-xl"
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
                    applyExcelStyles(ws, 11, "تقرير أكثر الباحثين");
                    XLSX.utils.book_append_sheet(wb, ws, "أكثر الباحثين");
                    XLSX.writeFile(wb, `تقرير_أكثر_الباحثين_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
                    toast({ title: "تم تصدير التقرير بنجاح ✅" });
                  }}
                >
                  <Download className="w-3.5 h-3.5" />
                  تصدير Excel
                </Button>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap px-1 mt-1">
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
                    className={cn("text-[11px] h-7 px-3 font-bold rounded-lg", reportTimeFilter === opt.value && "shadow-sm")}
                    onClick={() => setReportTimeFilter(opt.value)}
                  >
                    {opt.label}
                  </Button>
                ))}
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Summary KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
                {[
                  { icon: Search, value: totalSearchers, label: "عميل يبحث", change: searchersChange, bg: "bg-gradient-to-br from-primary/8 to-primary/3", iconBg: "bg-primary/15", iconColor: "text-primary", valueColor: "text-foreground" },
                  { icon: ShoppingCart, value: convertedCount, label: "تحوّلوا لطلبات", change: convertedChange, bg: "bg-gradient-to-br from-emerald-500/8 to-emerald-500/3", iconBg: "bg-emerald-500/15", iconColor: "text-emerald-600 dark:text-emerald-400", valueColor: "text-emerald-700 dark:text-emerald-400" },
                  { icon: TrendingUp, value: `${overallConversion}%`, label: "معدل التحويل", change: conversionChange, bg: "bg-gradient-to-br from-amber-500/8 to-amber-500/3", iconBg: "bg-amber-500/15", iconColor: "text-amber-600 dark:text-amber-400", valueColor: "text-amber-700 dark:text-amber-400" },
                  { icon: BarChart3, value: avgSearchesPerUser, label: "متوسط بحث/عميل", change: avgChange, bg: "bg-gradient-to-br from-blue-500/8 to-blue-500/3", iconBg: "bg-blue-500/15", iconColor: "text-blue-600 dark:text-blue-400", valueColor: "text-blue-700 dark:text-blue-400" },
                ].map((kpi, idx) => (
                  <div key={idx} className={cn("rounded-xl p-3 text-center border border-border/30", kpi.bg)}>
                    <div className={cn("w-7 h-7 rounded-lg mx-auto mb-1.5 flex items-center justify-center", kpi.iconBg)}>
                      <kpi.icon className={cn("w-3.5 h-3.5", kpi.iconColor)} />
                    </div>
                    <p className={cn("text-xl font-black tracking-tight", kpi.valueColor)}>{kpi.value}</p>
                    <p className="text-[10px] text-muted-foreground font-medium">{kpi.label}</p>
                    {kpi.change !== null && (
                      <div className={cn(
                        "flex items-center justify-center gap-0.5 mt-2 text-[10px] font-bold rounded-full px-2.5 py-0.5 mx-auto w-fit",
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

              {/* Detailed Table */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-black text-foreground flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Search className="w-3.5 h-3.5 text-primary" />
                    </div>
                    تفاصيل أكثر 15 عميل بحثاً
                  </h4>
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-1.5 text-[10px] h-7 font-bold rounded-xl"
                    onClick={() => {
                      const rows: any[] = [];
                      top15.forEach((d, idx) => {
                        const topSearches = d.searchDetails.slice(0, 10);
                        if (topSearches.length === 0) {
                          rows.push({
                            "#": idx + 1,
                            "اسم العميل": d.name,
                            "نوع الحساب": d.isDealer ? "جملة" : "قطاعي",
                            "رقم الهاتف": d.phone || "—",
                            "الصنف المطلوب": "—",
                            "عدد مرات البحث": 0,
                            "إجمالي عمليات البحث": d.searches,
                            "الحالة": d.converted ? "محوّل ✓" : "لم يشترِ ✗",
                          });
                        } else {
                          topSearches.forEach((s, si) => {
                            rows.push({
                              "#": si === 0 ? idx + 1 : "",
                              "اسم العميل": si === 0 ? d.name : "",
                              "نوع الحساب": si === 0 ? (d.isDealer ? "جملة" : "قطاعي") : "",
                              "رقم الهاتف": si === 0 ? (d.phone || "—") : "",
                              "الصنف المطلوب": s.query,
                              "عدد مرات البحث": s.count,
                              "إجمالي عمليات البحث": si === 0 ? d.searches : "",
                              "الحالة": si === 0 ? (d.converted ? "محوّل ✓" : "لم يشترِ ✗") : "",
                            });
                          });
                        }
                      });
                      if (rows.length === 0) { toast({ title: "لا توجد بيانات", variant: "destructive" }); return; }
                      const wb = XLSX.utils.book_new();
                      const ws = XLSX.utils.json_to_sheet(rows);
                      ws["!dir"] = "rtl" as any;
                      ws["!cols"] = [{ wch: 5 }, { wch: 22 }, { wch: 12 }, { wch: 16 }, { wch: 30 }, { wch: 14 }, { wch: 16 }, { wch: 14 }];
                      applyExcelStyles(ws, 8, "تقرير أكثر 15 عميل بحثاً - تفصيلي");
                      XLSX.utils.book_append_sheet(wb, ws, "أكثر الباحثين تفصيلي");
                      XLSX.writeFile(wb, `أكثر_15_عميل_بحثاً_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
                      toast({ title: "تم تصدير التقرير بنجاح ✅" });
                    }}
                  >
                    <Download className="w-3 h-3" />
                    تصدير Excel
                  </Button>
                </div>
                <div className="overflow-x-auto rounded-2xl border border-border/40 shadow-sm">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gradient-to-l from-muted/80 to-muted/40 text-muted-foreground text-[11px]">
                        <th className="px-3 py-3 text-right font-black">#</th>
                        <th className="px-3 py-3 text-right font-black">العميل</th>
                        <th className="px-3 py-3 text-center font-black">عمليات البحث</th>
                        <th className="px-3 py-3 text-center font-black">استفسارات فريدة</th>
                        <th className="px-3 py-3 text-center font-black">أصناف مسعّرة</th>
                        <th className="px-3 py-3 text-center font-black">الطلبات</th>
                        <th className="px-3 py-3 text-center font-black">إجمالي الإنفاق</th>
                        <th className="px-3 py-3 text-center font-black">التحويل</th>
                        <th className="px-3 py-3 text-right font-black">أهم ما بحث عنه</th>
                        <th className="px-3 py-3 text-center font-black">تواصل</th>
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
                                <div className="h-full bg-blue-500 rounded-full" style={{ width: `${(d.searches / maxSearches) * 100}%` }} />
                              </div>
                              <span className="text-xs font-bold text-foreground">{d.searches}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 text-center text-xs text-foreground">{d.uniqueQueries}</td>
                          <td className="px-3 py-2.5 text-center text-xs text-foreground">{d.priceViews}</td>
                          <td className="px-3 py-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <div className="w-10 h-1.5 bg-muted rounded-full overflow-hidden">
                                <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${maxOrders > 0 ? (d.orders / maxOrders) * 100 : 0}%` }} />
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
                        <AnimatePresence>
                        {expandedSearcher === d.userId && (
                          <motion.tr
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="border-t border-border/30"
                          >
                            <td colSpan={10} className="p-0">
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.3, ease: "easeInOut" }}
                                className="overflow-hidden"
                              >
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
                                       applyExcelStyles(ws, 6, `سجل بحث العميل: ${d.name}`);
                                       const wb = XLSX.utils.book_new();
                                       XLSX.utils.book_append_sheet(wb, ws, "سجل البحث");
                                       const infoWs = XLSX.utils.json_to_sheet([{
                                         "الاسم": d.name,
                                         "الهاتف": d.phone || "—",
                                         "إجمالي البحث": d.searches,
                                         "استفسارات فريدة": d.uniqueQueries,
                                         "الطلبات": d.orders,
                                         "إجمالي الإنفاق": d.totalSpent,
                                         "الحالة": d.converted ? "محوّل" : "لم يشترِ",
                                       }]);
                                       applyExcelStyles(infoWs, 7, `بيانات العميل: ${d.name}`);
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
                              </motion.div>
                            </td>
                          </motion.tr>
                        )}
                        </AnimatePresence>
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Opportunity Alert */}
              {topNonConverted.length > 0 && (
                <div className="bg-gradient-to-l from-amber-500/10 via-amber-500/5 to-transparent border border-amber-200/60 dark:border-amber-800/30 rounded-2xl p-5">
                  <h4 className="text-sm font-black text-amber-800 dark:text-amber-300 flex items-center gap-2.5 mb-4">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/15 flex items-center justify-center">
                      <Eye className="w-4 h-4 text-amber-600" />
                    </div>
                    ⚡ فرص تحويل — عملاء يبحثون ولم يشتروا بعد
                  </h4>
                  <div className="space-y-2.5">
                    {topNonConverted.map((d, i) => (
                      <div key={d.userId} className="flex items-center gap-3 bg-white/70 dark:bg-black/20 rounded-xl p-3 border border-amber-100/50 dark:border-amber-900/20 transition-all hover:shadow-sm">
                        <div className="w-7 h-7 rounded-lg bg-amber-500/15 flex items-center justify-center shrink-0">
                          <span className="text-[11px] font-black text-amber-700 dark:text-amber-400">{i + 1}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-foreground">{d.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
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
                            className="shrink-0 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-3 py-2 rounded-xl hover:bg-emerald-200 dark:hover:bg-emerald-900/50 transition-colors shadow-sm"
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


      {/* Customer list */}
      {loadingProfiles ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-24 bg-muted animate-pulse rounded-2xl" />
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
            const lifecycle = getLifecycleStage(profile.user_id);
            const lcInfo = LIFECYCLE_LABELS[lifecycle] || LIFECYCLE_LABELS.new;
            const quotes = quotesMap[profile.user_id] || 0;
            const shoppingLists = shoppingListsMap[profile.user_id];
            const returnDays = userReturnRate[profile.user_id] || 0;
            const purchasedProducts = purchasedProductsByUser[profile.user_id];

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
                  "rounded-2xl border bg-card overflow-hidden transition-all duration-300",
                  isExpanded ? "border-primary/30 shadow-lg ring-1 ring-primary/10" : "border-border/40 hover:border-border/70 hover:shadow-sm"
                )}
              >
                {/* Header row */}
                <div className="flex items-center gap-3.5 p-4">
                  <div className={cn(
                    "w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-sm transition-colors",
                    dealerUserIds?.has(profile.user_id) ? "bg-blue-500/15" : "bg-primary/10"
                  )}>
                    <Users className={cn("w-5 h-5", dealerUserIds?.has(profile.user_id) ? "text-blue-600 dark:text-blue-400" : "text-primary")} />
                  </div>

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
                      {/* Lifecycle badge */}
                      <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded-md", lcInfo.color)}>
                        {lcInfo.label}
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
                      {/* Quick alert badge — يلفت نظر الموظف من بره */}
                      {(() => {
                        const alerts = getCustomerAlerts(profile.user_id);
                        if (alerts.length === 0) return null;
                        const danger = alerts.find(a => a.type === "danger");
                        const showAlert = danger || alerts[0];
                        return (
                          <span
                            className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 animate-pulse",
                              showAlert.color
                            )}
                            title={alerts.map(a => `${a.icon} ${a.label}`).join("\n")}
                          >
                            <AlertTriangle className="w-3 h-3" />
                            {alerts.length} تنبيه
                          </span>
                        );
                      })()}
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
                      {orders && (
                        <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                          <ShoppingCart className="w-3 h-3" />
                          آخر طلب: {format(new Date(orders.lastOrderDate), "dd/MM/yyyy")}
                        </span>
                      )}
                    </div>
                  </button>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <a
                      href={`/admin/visitor/${profile.user_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-9 h-9 rounded-xl bg-primary/10 hover:bg-primary/20 flex items-center justify-center transition-colors"
                      title="ملخص جلسة الزائر"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Activity className="w-4 h-4 text-primary" />
                    </a>
                    {profile.phone && (
                      <>
                        <a
                          href={`tel:${profile.phone}`}
                          className="w-9 h-9 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 flex items-center justify-center transition-colors"
                          title="اتصال مباشر"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Phone className="w-4 h-4 text-blue-600" />
                        </a>
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
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(profile.phone!);
                            toast({ title: `✅ تم نسخ ${profile.phone}` });
                          }}
                          className="w-9 h-9 rounded-xl bg-muted/60 hover:bg-muted flex items-center justify-center transition-colors"
                          title="نسخ رقم الهاتف"
                        >
                          <Copy className="w-4 h-4 text-muted-foreground" />
                        </button>
                      </>
                    )}

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
                      {quotes > 0 && (
                        <span className="flex items-center gap-0.5 bg-muted/60 rounded-md px-1.5 py-1" title="عروض أسعار">
                          <FileText className="w-3 h-3" />{quotes}
                        </span>
                      )}
                      {returnDays > 1 && (
                        <span className="flex items-center gap-0.5 bg-muted/60 rounded-md px-1.5 py-1" title={`عاد ${returnDays} يوم مختلف`}>
                          <RefreshCw className="w-3 h-3" />{returnDays}
                        </span>
                      )}
                    </div>

                    <button
                      onClick={() => setExpandedUser(isExpanded ? null : profile.user_id)}
                      className="w-8 h-8 rounded-lg hover:bg-muted/50 flex items-center justify-center transition-colors"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                    </button>
                  </div>
                </div>

                <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
                    className="overflow-hidden"
                  >
                  <div className="px-5 pb-5 space-y-4 border-t border-border/30 pt-4 bg-gradient-to-b from-muted/20 to-transparent">
                    {/* === ALERTS BAR — يلفت نظر الموظف للحالات اللي محتاجة تحرك === */}
                    {(() => {
                      const alerts = getCustomerAlerts(profile.user_id);
                      if (alerts.length === 0) return null;
                      return (
                        <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-gradient-to-l from-red-50/50 via-orange-50/30 to-transparent dark:from-red-950/20 dark:via-orange-950/10 border border-red-200/40 dark:border-red-900/30">
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-red-700 dark:text-red-400 shrink-0 ml-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            تنبيهات:
                          </div>
                          {alerts.map((a, i) => (
                            <span
                              key={i}
                              className={cn(
                                "text-[11px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1",
                                a.color
                              )}
                            >
                              <span>{a.icon}</span>
                              {a.label}
                            </span>
                          ))}
                        </div>
                      );
                    })()}

                    {/* === سكريبت اتصال جاهز — يوفر وقت الموظف === */}
                    {profile.phone && (
                      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-blue-500/5 p-4">
                        <div className="flex items-start justify-between gap-3 mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
                              <MessageCircle className="w-4 h-4 text-primary" />
                            </div>
                            <div>
                              <p className="text-xs font-bold text-foreground">سكريبت اتصال مقترح</p>
                              <p className="text-[10px] text-muted-foreground">مبني تلقائياً على سلوك العميل</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(buildCallScript(profile.user_id));
                                toast({ title: "✅ تم نسخ السكريبت" });
                              }}
                              className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary flex items-center gap-1 transition-colors"
                              title="نسخ السكريبت"
                            >
                              <Copy className="w-3 h-3" />
                              نسخ
                            </button>
                            <a
                              href={`https://wa.me/${formatPhoneForWhatsApp(profile.phone)}?text=${encodeURIComponent(buildCallScript(profile.user_id))}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-[10px] font-bold px-2.5 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 flex items-center gap-1 transition-colors"
                              title="إرسال عبر واتساب"
                            >
                              <Send className="w-3 h-3" />
                              إرسال
                            </a>
                          </div>
                        </div>
                        <p className="text-xs text-foreground/85 leading-relaxed whitespace-pre-line bg-background/60 rounded-lg p-3 border border-border/30">
                          {buildCallScript(profile.user_id)}
                        </p>
                      </div>
                    )}

                    {/* === سجل المكالمات السابقة === */}
                    {(() => {
                      const comms = communicationsByUser[profile.user_id] || [];
                      if (comms.length === 0) {
                        return (
                          <div className="rounded-xl border border-dashed border-border/50 bg-muted/10 p-3 flex items-center justify-between">
                            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                              <FileText className="w-3.5 h-3.5" />
                              لا يوجد سجل تواصل سابق مع هذا العميل
                            </div>
                            <span className="text-[10px] text-muted-foreground italic">
                              سجّل مكالمتك من ملف العميل
                            </span>
                          </div>
                        );
                      }
                      const lastComm = comms[0];
                      const daysSince = differenceInDays(new Date(), new Date(lastComm.created_at));
                      const commLabel: Record<string, { label: string; color: string }> = {
                        phone: { label: "📞 مكالمة", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
                        whatsapp: { label: "💬 واتساب", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
                        email: { label: "✉️ إيميل", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
                        meeting: { label: "🤝 مقابلة", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
                      };
                      return (
                        <div className="rounded-xl border border-border/40 bg-card/50 overflow-hidden">
                          <div className="px-3 py-2 bg-muted/30 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FileText className="w-3.5 h-3.5 text-primary" />
                              <span className="text-xs font-bold text-foreground">سجل التواصل</span>
                              <span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">
                                {comms.length}
                              </span>
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              آخر تواصل منذ <strong className="text-foreground">{daysSince === 0 ? "اليوم" : `${daysSince} يوم`}</strong>
                            </span>
                          </div>
                          <div className="divide-y divide-border/30 max-h-48 overflow-y-auto">
                            {comms.slice(0, 5).map(c => {
                              const info = commLabel[c.comm_type] || { label: c.comm_type, color: "bg-muted text-foreground" };
                              return (
                                <div key={c.id} className="px-3 py-2 flex items-start gap-2">
                                  <span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0", info.color)}>
                                    {info.label}
                                  </span>
                                  <div className="min-w-0 flex-1">
                                    {c.note && (
                                      <p className="text-[11px] text-foreground/85 line-clamp-2">{c.note}</p>
                                    )}
                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                      {format(new Date(c.created_at), "dd/MM/yyyy hh:mm a", { locale: ar })}
                                    </p>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}

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

                    {/* Stats row: orders, quotes, shopping lists, return rate */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                      {/* Last order */}
                      <div className="bg-emerald-50/70 dark:bg-emerald-950/20 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">الطلبات</span>
                        </div>
                        {orders ? (
                          <>
                            <p className="text-lg font-black text-foreground">{orders.count}</p>
                            <p className="text-[10px] text-muted-foreground">
                              إجمالي {orders.total.toLocaleString("ar-EG")} ج.م
                            </p>
                            <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">
                              آخر طلب: {format(new Date(orders.lastOrderDate), "dd/MM/yyyy")}
                            </p>
                          </>
                        ) : (
                          <p className="text-sm text-muted-foreground">لا توجد طلبات</p>
                        )}
                      </div>

                      {/* Quotes */}
                      <div className="bg-violet-50/70 dark:bg-violet-950/20 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <FileText className="w-3.5 h-3.5 text-violet-600" />
                          <span className="text-[10px] font-bold text-violet-700 dark:text-violet-400">عروض الأسعار</span>
                        </div>
                        <p className="text-lg font-black text-foreground">{quotes}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {quotes > 0 ? "عرض سعر مقدم" : "لم يطلب عروض"}
                        </p>
                      </div>

                      {/* Shopping Lists */}
                      <div className="bg-cyan-50/70 dark:bg-cyan-950/20 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <ListOrdered className="w-3.5 h-3.5 text-cyan-600" />
                          <span className="text-[10px] font-bold text-cyan-700 dark:text-cyan-400">قوائم التسوق</span>
                        </div>
                        <p className="text-lg font-black text-foreground">{shoppingLists?.count || 0}</p>
                        {shoppingLists && shoppingLists.names.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {shoppingLists.names.slice(0, 3).map((name, ni) => (
                              <span key={ni} className="text-[9px] bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 px-1.5 py-0.5 rounded">{name}</span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Return Rate */}
                      <div className="bg-amber-50/70 dark:bg-amber-950/20 rounded-xl p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <RefreshCw className="w-3.5 h-3.5 text-amber-600" />
                          <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">معدل العودة</span>
                        </div>
                        <p className="text-lg font-black text-foreground">{returnDays} يوم</p>
                        <p className="text-[10px] text-muted-foreground">
                          {returnDays > 5 ? "عميل متكرر 🔥" : returnDays > 1 ? "عاد أكثر من مرة" : "زيارة واحدة"}
                        </p>
                      </div>
                    </div>

                    {/* Searched Products Report with Purchase Status */}
                    {searches.length > 0 && productsMap && (
                      <div>
                        <p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5">
                          <Search className="w-3.5 h-3.5 text-primary" />
                          تقرير الأصناف المبحوث عنها ({searches.length} صنف)
                        </p>
                        <div className="overflow-x-auto rounded-xl border border-border/40">
                          <table className="w-full text-xs">
                            <thead>
                              <tr className="bg-muted/50 text-muted-foreground">
                                <th className="px-3 py-2 text-right font-bold">كلمة البحث</th>
                                <th className="px-3 py-2 text-center font-bold">عدد المرات</th>
                                <th className="px-3 py-2 text-center font-bold">آخر بحث</th>
                                <th className="px-3 py-2 text-center font-bold">حالة الشراء</th>
                              </tr>
                            </thead>
                            <tbody>
                              {searches
                                .sort((a, b) => b.count - a.count)
                                .slice(0, 20)
                                .map((s, i) => {
                                  // Check if any product matching this search query was purchased
                                  const queryLower = s.query.toLowerCase();
                                  const matchedPurchased = purchasedProducts
                                    ? Object.values(productsMap).some(
                                        (p: any) =>
                                          purchasedProducts.has(p.id) &&
                                          (p.name_ar?.toLowerCase().includes(queryLower) || p.sku?.toLowerCase().includes(queryLower))
                                      )
                                    : false;

                                  return (
                                    <tr key={i} className={cn("border-t border-border/30", i % 2 === 0 ? "bg-card" : "bg-muted/10")}>
                                      <td className="px-3 py-2 font-medium text-foreground">{s.query}</td>
                                      <td className="px-3 py-2 text-center">
                                        <Badge variant="secondary" className="text-[10px]">{s.count}×</Badge>
                                      </td>
                                      <td className="px-3 py-2 text-center text-muted-foreground">
                                        {format(new Date(s.lastAt), "dd/MM/yyyy", { locale: ar })}
                                      </td>
                                      <td className="px-3 py-2 text-center">
                                        {matchedPurchased ? (
                                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md">
                                            <CheckCircle2 className="w-3 h-3" />
                                            تم الشراء ✓
                                          </span>
                                        ) : (
                                          <span className="text-[10px] font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">
                                            لم يشترِ
                                          </span>
                                        )}
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
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
                            const wasPurchased = purchasedProducts?.has(pid);
                            return (
                              <div key={pid} className={cn(
                                "flex items-center gap-2.5 rounded-xl p-2.5",
                                wasPurchased ? "bg-emerald-50/60 dark:bg-emerald-950/15 border border-emerald-200/40" : "bg-muted/30"
                              )}>
                                <div className={cn(
                                  "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                                  wasPurchased ? "bg-emerald-500/15" : "bg-primary/10"
                                )}>
                                  {wasPurchased ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Package className="w-3.5 h-3.5 text-primary" />}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className="text-xs font-semibold text-foreground truncate">{product.name_ar}</p>
                                  <p className="text-[10px] text-muted-foreground font-mono">{product.sku}</p>
                                </div>
                                {wasPurchased && (
                                  <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded shrink-0">
                                    تم الشراء ✓
                                  </span>
                                )}
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
                  </motion.div>
                )}
                </AnimatePresence>
              </div>
            );
          })}

          {filteredProfiles?.length === 0 && (
            <div className="text-center py-16 text-muted-foreground rounded-2xl border border-dashed border-border/50 bg-muted/10">
              <Users className="w-14 h-14 mx-auto mb-4 opacity-20" />
              <p className="text-lg font-bold">لا توجد نتائج مطابقة</p>
              <p className="text-sm mt-1">جرّب تغيير الفلاتر أو كلمة البحث</p>
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
