import { useState, useCallback, Fragment, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  Star, Activity, AlertTriangle, AlertCircle, CheckCircle2, ListOrdered, FileText, RefreshCw, Zap,
  Settings2, RotateCcw,
} from "lucide-react";
import { Slider } from "@/components/ui/slider";
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

// Business type taxonomy used for advanced filtering (mapped from dealer_accounts.business_type)
const BUSINESS_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "trader", label: "تاجر" },
  { value: "workshop", label: "ورشة" },
  { value: "fleet", label: "أسطول" },
  { value: "retail", label: "قطاعي" },
  { value: "other", label: "أخرى" },
];

const TIER_OPTIONS: { value: string; label: string }[] = [
  { value: "wholesale_tier1", label: "جملة درجة أولى" },
  { value: "wholesale_tier2", label: "جملة درجة ثانية" },
  { value: "retail", label: "قطاعي" },
];

const LIFECYCLE_OPTIONS: { value: string; label: string }[] = [
  { value: "vip", label: "VIP" },
  { value: "active", label: "نشط" },
  { value: "idle", label: "خامل (30-90 يوم)" },
  { value: "lost", label: "مفقود (+90 يوم)" },
  { value: "new", label: "جديد" },
];

const RECENT_ACTIVITY_OPTIONS: { value: string; label: string }[] = [
  { value: "any", label: "أي نشاط" },
  { value: "has_cart", label: "عنده سلة نشطة" },
  { value: "searched_no_order", label: "بحث ولم يطلب" },
  { value: "ordered_recently", label: "طلب خلال 7 أيام" },
  { value: "no_orders", label: "لم يطلب أبداً" },
  { value: "missing_phone", label: "بدون رقم هاتف" },
];

const LIFECYCLE_LABELS: Record<string, { label: string; color: string; icon: typeof Star }> = {
  vip: { label: "VIP", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400", icon: Star },
  active: { label: "نشط", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400", icon: Activity },
  idle: { label: "خامل", color: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400", icon: Clock },
  lost: { label: "مفقود", color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400", icon: AlertTriangle },
  new: { label: "جديد", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400", icon: Users },
};

const AdminCustomerIntelligence = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [customerTypeFilter, setCustomerTypeFilter] = useState<string>("all");
  const [accountTypeFilter, setAccountTypeFilter] = useState<string>("all");
  // Advanced filters
  const [businessTypeFilter, setBusinessTypeFilter] = useState<string>("all");
  const [tierFilter, setTierFilter] = useState<string>("all");
  const [lifecycleFilter, setLifecycleFilter] = useState<string>("all");
  const [recentActivityFilter, setRecentActivityFilter] = useState<string>("any");
  const [advancedFiltersOpen, setAdvancedFiltersOpen] = useState(false);
  // Saved filter templates (persisted to localStorage)
  type FilterTemplate = {
    id: string;
    name: string;
    filters: {
      searchTerm: string;
      customerTypeFilter: string;
      accountTypeFilter: string;
      businessTypeFilter: string;
      tierFilter: string;
      lifecycleFilter: string;
      recentActivityFilter: string;
    };
  };
  const TEMPLATES_KEY = "aci_filter_templates_v1";
  const [filterTemplates, setFilterTemplates] = useState<FilterTemplate[]>(() => {
    try {
      const raw = localStorage.getItem(TEMPLATES_KEY);
      return raw ? (JSON.parse(raw) as FilterTemplate[]) : [];
    } catch { return []; }
  });
  const [saveTemplateOpen, setSaveTemplateOpen] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [bulkWhatsAppOpen, setBulkWhatsAppOpen] = useState(false);
  const [bulkMessage, setBulkMessage] = useState("مرحباً {{name}}، نود إبلاغكم بأحدث العروض والخصومات الحصرية من المصرية جروب. تواصلوا معنا لمزيد من التفاصيل!");
  const [sendingIndex, setSendingIndex] = useState(-1);
  const [reportTimeFilter, setReportTimeFilter] = useState<string>("all");
  const [expandedSearcher, setExpandedSearcher] = useState<string | null>(null);
  const [searchDetailFilter, setSearchDetailFilter] = useState("");
  const [searchDetailSort, setSearchDetailSort] = useState<"count" | "date">("count");
  // Quick contact panel: per-user note draft + selected comm type + saving state
  const [quickNoteDraft, setQuickNoteDraft] = useState<Record<string, string>>({});
  const [quickNoteType, setQuickNoteType] = useState<Record<string, string>>({});
  const [savingQuickNote, setSavingQuickNote] = useState<string | null>(null);
  // Missing-fields editor: which user is editing + draft values + saving state
  const [editingMissing, setEditingMissing] = useState<string | null>(null);
  const [missingDraft, setMissingDraft] = useState<{ phone?: string; email?: string; full_name?: string; car_model?: string; car_year?: string }>({});
  const [savingMissing, setSavingMissing] = useState(false);

  // Today's tasks: persistent completion state (resets daily via date-keyed localStorage)
  const todayKey = format(new Date(), "yyyy-MM-dd");
  const tasksStorageKey = `aci_completed_tasks_${todayKey}`;
  const [completedTasks, setCompletedTasks] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(tasksStorageKey);
      return new Set(raw ? (JSON.parse(raw) as string[]) : []);
    } catch { return new Set(); }
  });
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);
  const [analyticsOpen, setAnalyticsOpen] = useState(false);
  const [tasksOpen, setTasksOpen] = useState(true);

  // === Priority weights (configurable, persisted in localStorage) ===
  type PriorityWeights = { alerts: number; recency: number; buyability: number };
  const DEFAULT_WEIGHTS: PriorityWeights = { alerts: 30, recency: 40, buyability: 30 };
  const WEIGHTS_STORAGE_KEY = "aci_priority_weights_v1";
  const [priorityWeights, setPriorityWeights] = useState<PriorityWeights>(() => {
    try {
      const raw = localStorage.getItem(WEIGHTS_STORAGE_KEY);
      if (!raw) return DEFAULT_WEIGHTS;
      const parsed = JSON.parse(raw);
      if (
        typeof parsed?.alerts === "number" &&
        typeof parsed?.recency === "number" &&
        typeof parsed?.buyability === "number"
      ) return parsed;
      return DEFAULT_WEIGHTS;
    } catch { return DEFAULT_WEIGHTS; }
  });
  const [weightsDialogOpen, setWeightsDialogOpen] = useState(false);
  const updatePriorityWeights = (next: PriorityWeights) => {
    setPriorityWeights(next);
    try { localStorage.setItem(WEIGHTS_STORAGE_KEY, JSON.stringify(next)); } catch {}
  };
  const weightsTotal = priorityWeights.alerts + priorityWeights.recency + priorityWeights.buyability;

  // === Task time window filter (persisted) ===
  // Options: 1 = آخر 24 ساعة، 3 = آخر 3 أيام، 7 = آخر 7 أيام، 30 = آخر 30 يوم، 0 = الكل
  const TASK_WINDOW_STORAGE_KEY = "aci_task_window_days_v1";
  const [taskWindowDays, setTaskWindowDays] = useState<number>(() => {
    try {
      const raw = localStorage.getItem(TASK_WINDOW_STORAGE_KEY);
      const n = raw ? parseInt(raw, 10) : 7;
      return [0, 1, 3, 7, 30].includes(n) ? n : 7;
    } catch { return 7; }
  });
  const updateTaskWindow = (days: number) => {
    setTaskWindowDays(days);
    try { localStorage.setItem(TASK_WINDOW_STORAGE_KEY, String(days)); } catch {}
  };

  const toggleTaskComplete = (taskId: string) => {
    setCompletedTasks(prev => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId); else next.add(taskId);
      try { localStorage.setItem(tasksStorageKey, JSON.stringify(Array.from(next))); } catch {}
      return next;
    });
  };

  const detectMissingFields = (p: { phone: string | null; email: string | null; full_name: string | null; car_model?: string | null; car_year?: number | null }) => {
    const missing: { key: string; label: string; icon: string }[] = [];
    if (!p.phone || p.phone.trim() === "") missing.push({ key: "phone", label: "رقم الموبايل", icon: "📱" });
    if (!p.email || p.email.trim() === "" || p.email.endsWith("@phone.almasria.local")) missing.push({ key: "email", label: "البريد الإلكتروني", icon: "✉️" });
    if (!p.full_name || p.full_name.trim() === "") missing.push({ key: "full_name", label: "الاسم الكامل", icon: "👤" });
    if (!p.car_model) missing.push({ key: "car_model", label: "موديل السيارة", icon: "🚗" });
    return missing;
  };

  const buildMissingFieldsRequest = (name: string, missing: { label: string }[]) => {
    const fields = missing.map((m) => `• ${m.label}`).join("\n");
    return `مرحباً ${name || "عميلنا الكريم"} 👋\n\nمن المصرية جروب — لاستكمال خدمتك بشكل أسرع وإرسال عروض الأسعار والطلبات في وقتها، نحتاج منك تحديث البيانات التالية:\n\n${fields}\n\nيمكنك تحديثها مباشرة من صفحة "حسابي" على الموقع، أو ترد علينا هنا بالبيانات وسنحدّثها لك.\n\nشكراً لثقتك 🌟`;
  };

  const openMissingEditor = (p: any) => {
    setMissingDraft({
      phone: p.phone || "",
      email: p.email && !p.email.endsWith("@phone.almasria.local") ? p.email : "",
      full_name: p.full_name || "",
      car_model: p.car_model || "",
      car_year: p.car_year ? String(p.car_year) : "",
    });
    setEditingMissing(p.user_id);
  };

  const saveMissingFields = async (userId: string) => {
    // Light validation
    if (missingDraft.phone && !/^01[0-9]{9}$/.test(missingDraft.phone.trim())) {
      toast({ title: "رقم موبايل غير صحيح", description: "يجب أن يبدأ بـ 01 ومكون من 11 رقم", variant: "destructive" });
      return;
    }
    if (missingDraft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(missingDraft.email.trim())) {
      toast({ title: "بريد إلكتروني غير صحيح", variant: "destructive" });
      return;
    }
    if (missingDraft.car_year && (isNaN(Number(missingDraft.car_year)) || Number(missingDraft.car_year) < 1980 || Number(missingDraft.car_year) > 2100)) {
      toast({ title: "سنة الصنع غير صحيحة", variant: "destructive" });
      return;
    }

    setSavingMissing(true);
    const updates: any = {};
    if (missingDraft.phone?.trim()) updates.phone = missingDraft.phone.trim();
    if (missingDraft.email?.trim()) updates.email = missingDraft.email.trim();
    if (missingDraft.full_name?.trim()) updates.full_name = missingDraft.full_name.trim();
    if (missingDraft.car_model?.trim()) updates.car_model = missingDraft.car_model.trim();
    if (missingDraft.car_year?.trim()) updates.car_year = Number(missingDraft.car_year);

    if (Object.keys(updates).length === 0) {
      toast({ title: "لا يوجد ما يتم حفظه" });
      setSavingMissing(false);
      return;
    }

    const { error } = await supabase.from("profiles").update(updates).eq("user_id", userId);
    setSavingMissing(false);
    if (error) {
      toast({ title: "خطأ في الحفظ", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "✅ تم تحديث البيانات" });
    setEditingMissing(null);
    queryClient.invalidateQueries({ queryKey: ["admin-profiles-intel"] });
    queryClient.invalidateQueries({ queryKey: ["admin-profiles"] });
  };

  const saveQuickNote = async (customerUserId: string) => {
    const note = (quickNoteDraft[customerUserId] || "").trim();
    const commType = quickNoteType[customerUserId] || "phone";
    if (!note) {
      toast({ title: "اكتب ملاحظة قبل الحفظ", variant: "destructive" });
      return;
    }
    if (!user) {
      toast({ title: "يجب تسجيل الدخول", variant: "destructive" });
      return;
    }
    setSavingQuickNote(customerUserId);
    const { error } = await supabase.from("customer_communications").insert({
      customer_user_id: customerUserId,
      staff_user_id: user.id,
      comm_type: commType,
      note,
    });
    setSavingQuickNote(null);
    if (error) {
      toast({ title: "فشل حفظ الملاحظة", description: error.message, variant: "destructive" });
      return;
    }
    setQuickNoteDraft(prev => ({ ...prev, [customerUserId]: "" }));
    toast({ title: "✅ تم حفظ ملاحظة المتابعة" });
    queryClient.invalidateQueries({ queryKey: ["admin_customer_communications"] });
  };


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

  // Dealer accounts (with business_type, tier, vehicle_types) for advanced filtering
  const { data: dealerAccountsData } = useQuery({
    queryKey: ["admin_dealer_accounts_full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("dealer_accounts")
        .select("user_id, business_type, tier, vehicle_types")
        .eq("is_active", true);
      if (error) throw error;
      return data || [];
    },
  });

  // Derived: Set of dealer user IDs (for backward-compatible has() checks)
  const dealerUserIds = useMemo(
    () => new Set(dealerAccountsData?.map(d => d.user_id) || []),
    [dealerAccountsData]
  );

  // Derived: Map of dealer info by user_id for advanced filtering
  const dealerInfoByUser = useMemo(() => {
    const map: Record<string, { business_type: string | null; tier: string | null; vehicle_types: string[] | null }> = {};
    dealerAccountsData?.forEach(d => {
      map[d.user_id] = {
        business_type: d.business_type ?? null,
        tier: d.tier ?? null,
        vehicle_types: (d.vehicle_types as string[] | null) ?? null,
      };
    });
    return map;
  }, [dealerAccountsData]);

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
    // Advanced: business type (تاجر/ورشة/أسطول/قطاعي/أخرى)
    if (businessTypeFilter !== "all") {
      const info = dealerInfoByUser[p.user_id];
      const bt = info?.business_type || (dealerUserIds?.has(p.user_id) ? "trader" : "retail");
      if (businessTypeFilter === "other") {
        const known = ["trader", "workshop", "fleet", "retail"];
        if (known.includes(bt)) return false;
      } else if (bt !== businessTypeFilter) {
        return false;
      }
    }
    // Advanced: tier (wholesale_tier1 / wholesale_tier2 / retail)
    if (tierFilter !== "all") {
      const info = dealerInfoByUser[p.user_id];
      const tier = info?.tier || "retail";
      if (tier !== tierFilter) return false;
    }
    // Advanced: lifecycle stage
    if (lifecycleFilter !== "all") {
      if (getLifecycleStage(p.user_id) !== lifecycleFilter) return false;
    }
    // Advanced: recent activity / need
    if (recentActivityFilter !== "any") {
      const orders = ordersMap?.[p.user_id];
      const cartCount = cartByUser?.[p.user_id]?.count || 0;
      const searches = userSearchMap[p.user_id] || [];
      const totalSearches = searches.reduce((s, q) => s + q.count, 0);
      if (recentActivityFilter === "has_cart" && cartCount <= 0) return false;
      if (recentActivityFilter === "searched_no_order" && !(totalSearches >= 3 && !orders)) return false;
      if (recentActivityFilter === "ordered_recently") {
        if (!orders) return false;
        const lastOrderAt = orders.lastOrderDate ? new Date(orders.lastOrderDate) : null;
        if (!lastOrderAt || differenceInDays(new Date(), lastOrderAt) > 7) return false;
      }
      if (recentActivityFilter === "no_orders" && !!orders) return false;
      if (recentActivityFilter === "missing_phone" && !!p.phone) return false;
    }
    return true;
  });

  const hasActiveFilters =
    !!dateFrom || !!dateTo ||
    (customerTypeFilter !== "all") || (accountTypeFilter !== "all") ||
    (businessTypeFilter !== "all") || (tierFilter !== "all") ||
    (lifecycleFilter !== "all") || (recentActivityFilter !== "any") ||
    !!searchTerm;
  const clearFilters = () => {
    setDateFrom(undefined); setDateTo(undefined);
    setCustomerTypeFilter("all"); setAccountTypeFilter("all");
    setBusinessTypeFilter("all"); setTierFilter("all");
    setLifecycleFilter("all"); setRecentActivityFilter("any");
    setSearchTerm("");
  };

  // Filter templates: save / apply / delete (persisted to localStorage)
  const persistTemplates = (templates: FilterTemplate[]) => {
    setFilterTemplates(templates);
    try { localStorage.setItem(TEMPLATES_KEY, JSON.stringify(templates)); } catch {}
  };
  const saveCurrentAsTemplate = () => {
    const name = newTemplateName.trim();
    if (!name) {
      toast({ title: "اسم القالب مطلوب", variant: "destructive" });
      return;
    }
    const tpl: FilterTemplate = {
      id: `tpl_${Date.now()}`,
      name,
      filters: {
        searchTerm,
        customerTypeFilter,
        accountTypeFilter,
        businessTypeFilter,
        tierFilter,
        lifecycleFilter,
        recentActivityFilter,
      },
    };
    persistTemplates([tpl, ...filterTemplates]);
    setNewTemplateName("");
    setSaveTemplateOpen(false);
    toast({ title: "تم حفظ القالب", description: `"${name}" متاح الآن للتطبيق السريع.` });
  };
  const applyTemplate = (tpl: FilterTemplate) => {
    setSearchTerm(tpl.filters.searchTerm || "");
    setCustomerTypeFilter(tpl.filters.customerTypeFilter || "all");
    setAccountTypeFilter(tpl.filters.accountTypeFilter || "all");
    setBusinessTypeFilter(tpl.filters.businessTypeFilter || "all");
    setTierFilter(tpl.filters.tierFilter || "all");
    setLifecycleFilter(tpl.filters.lifecycleFilter || "all");
    setRecentActivityFilter(tpl.filters.recentActivityFilter || "any");
    toast({ title: "تم تطبيق القالب", description: tpl.name });
  };
  const deleteTemplate = (id: string) => {
    persistTemplates(filterTemplates.filter(t => t.id !== id));
    toast({ title: "تم حذف القالب" });
  };

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

  // ============ Today's Tasks for Staff ============
  const todayTasks = useMemo(() => {
    type Task = {
      id: string; userId: string; userName: string; phone: string | null;
      title: string; reason: string; priority: 1 | 2 | 3; icon: string;
      lifecycle: string; isDealer: boolean;
      score: number; // 0-100 unified urgency score
      scoreBreakdown: { alerts: number; recency: number; buyability: number };
      freshestDays: number | null;
    };
    if (!profiles) return [] as Task[];

    // Recency score from days (0d => 40, 7d => ~34, 30d => ~21, 90d+ => ~5)
    const recencyScore = (days: number | null) => {
      if (days === null || days === undefined) return 5;
      if (days < 0) return 0;
      return Math.round(40 * Math.exp(-days / 45));
    };

    const tasks: Task[] = [];
    for (const p of profiles) {
      const lifecycle = getLifecycleStage(p.user_id);
      const isDealer = !!dealerUserIds?.has(p.user_id);
      const orders = ordersMap?.[p.user_id];
      const cart = cartByUser[p.user_id];
      const alerts = getCustomerAlerts(p.user_id);
      const searches = userSearchMap[p.user_id] || [];
      const totalSearch = searches.reduce((s, q) => s + q.count, 0);
      const lastVisitRaw = lastVisitByUser?.[p.user_id];
      const daysSinceJoin = differenceInDays(new Date(), new Date(p.created_at));

      // Freshest activity day across cart/order/visit/signup
      const candidateDays: number[] = [];
      if (cart?.lastUpdated) candidateDays.push(differenceInDays(new Date(), new Date(cart.lastUpdated)));
      if (orders?.lastOrderDate) candidateDays.push(differenceInDays(new Date(), new Date(orders.lastOrderDate)));
      if (lastVisitRaw) candidateDays.push(differenceInDays(new Date(), new Date(lastVisitRaw)));
      candidateDays.push(daysSinceJoin);
      const freshestDays = candidateDays.length ? Math.min(...candidateDays) : null;

      // === Raw scoring components (base scale: 30/40/30) ===
      // 1) Alerts (raw 0-30): weighted by emoji severity
      const alertWeights: Record<string, number> = {
        "🛒": 18, "🔥": 16, "⚠️": 14, "👋": 10, "✨": 6, "💰": 8,
      };
      const alertsRaw = Math.min(30, alerts.reduce((s, a) => s + (alertWeights[a.icon] ?? 4), 0));

      // 2) Recency (raw 0-40)
      const recRaw = recencyScore(freshestDays);

      // 3) Buyability (raw 0-30): conversion likelihood
      let buyRaw = 0;
      if (cart && cart.count > 0) buyRaw += 12;
      if (totalSearch >= 10) buyRaw += 10; else if (totalSearch >= 3) buyRaw += 6;
      if (orders && orders.count > 0) buyRaw += 6;
      if (orders && orders.count >= 3) buyRaw += 2;
      if (isDealer) buyRaw += 4;
      if (p.phone) buyRaw += 2;
      if (lifecycle === "vip" || lifecycle === "active") buyRaw += 2;
      buyRaw = Math.min(30, buyRaw);

      // Apply configurable weights — rescale each raw component to its configured ceiling
      // (raw / baseMax) * configuredWeight  → so total still sums to ~100 when weights sum to 100
      const alertsScore = Math.round((alertsRaw / 30) * priorityWeights.alerts);
      const recScore = Math.round((recRaw / 40) * priorityWeights.recency);
      const buyScore = Math.round((buyRaw / 30) * priorityWeights.buyability);

      const totalScore = alertsScore + recScore + buyScore;
      const breakdown = { alerts: alertsScore, recency: recScore, buyability: buyScore };

      const baseUser = {
        userId: p.user_id,
        userName: p.full_name || "بدون اسم",
        phone: p.phone,
        lifecycle,
        isDealer,
        score: totalScore,
        scoreBreakdown: breakdown,
        freshestDays,
      };

      // Priority bucket from unified score
      const bucket = (s: number): 1 | 2 | 3 => (s >= 55 ? 1 : s >= 30 ? 2 : 3);

      if (cart && cart.count > 0) {
        const days = differenceInDays(new Date(), new Date(cart.lastUpdated));
        if (days >= 1) {
          tasks.push({ ...baseUser, id: `${p.user_id}:cart`, title: "متابعة سلة متروكة", reason: `${cart.count} صنف بالعربة منذ ${days} يوم`, priority: bucket(totalScore), icon: "🛒" });
        }
      }

      if (totalSearch >= 5 && !orders) {
        tasks.push({ ...baseUser, id: `${p.user_id}:hot-search`, title: "اتصل بعميل يبحث كثيراً", reason: `${totalSearch} عملية بحث بدون طلب`, priority: bucket(totalScore), icon: "🔥" });
      }

      if (lifecycle === "idle" && orders) {
        const days = differenceInDays(new Date(), new Date(orders.lastOrderDate));
        tasks.push({ ...baseUser, id: `${p.user_id}:idle`, title: "عميل خامل — أعد تنشيطه", reason: `آخر طلب منذ ${days} يوم`, priority: bucket(totalScore), icon: "⏰" });
      }

      if (lifecycle === "lost" && orders) {
        tasks.push({ ...baseUser, id: `${p.user_id}:lost`, title: "عميل مفقود — حاول استرجاعه", reason: "لم يطلب منذ أكثر من 90 يوم", priority: bucket(totalScore), icon: "📞" });
      }

      if (daysSinceJoin <= 3 && !orders && totalSearch > 0) {
        tasks.push({ ...baseUser, id: `${p.user_id}:welcome`, title: "رحّب بعميل جديد نشط", reason: `سجّل منذ ${daysSinceJoin} يوم وبدأ يبحث`, priority: bucket(totalScore), icon: "✨" });
      }

      const absentAlert = alerts.find(a => a.icon === "👋");
      if (absentAlert) {
        tasks.push({ ...baseUser, id: `${p.user_id}:absent`, title: "تواصل مع عميل غايب", reason: absentAlert.label, priority: bucket(totalScore), icon: "👋" });
      }
    }
    // Apply time-window filter (0 = all). Tasks without freshness signal are kept only when window is "all".
    const filtered = taskWindowDays === 0
      ? tasks
      : tasks.filter(t => t.freshestDays !== null && t.freshestDays <= taskWindowDays);
    // Sort by unified score desc, then by priority bucket
    return filtered.sort((a, b) => b.score - a.score || a.priority - b.priority);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profiles, ordersMap, cartByUser, userSearchMap, dealerUserIds, lastVisitByUser, priorityWeights, taskWindowDays]);

  const visibleTasks = todayTasks.filter(t => showCompletedTasks || !completedTasks.has(t.id));
  const pendingTasksCount = todayTasks.filter(t => !completedTasks.has(t.id)).length;
  const completedTasksCount = todayTasks.length - pendingTasksCount;

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

  // Filters for Hot Leads summary
  const [hotLeadsCategory, setHotLeadsCategory] = useState<"all" | "parts" | "oils">("all");
  const [hotLeadsPeriod, setHotLeadsPeriod] = useState<"all" | "30d" | "90d">("all");

  // Helper: is this product/query an "oil" item?
  const isOilText = (text?: string | null) => {
    if (!text) return false;
    const t = text.toLowerCase();
    return /زيت|زيوت|oil|atf|gear\s*oil|motor\s*oil|coolant|brake\s*fluid|محرك|فرامل/i.test(t);
  };
  const productMatchesCategory = (pid: string, cat: "all" | "parts" | "oils") => {
    if (cat === "all") return true;
    const prod = productsMap?.[pid];
    if (!prod) return cat === "parts"; // unknown defaults to parts
    const brand = (prod.brand || "").toLowerCase();
    const isOil = isOilText(prod.name_ar) || isOilText(prod.sku) || /oil|lubricant/i.test(brand);
    return cat === "oils" ? isOil : !isOil;
  };

  // 🔥 Hot leads: customers needing urgent attention (high search activity, no orders yet, recent activity)
  const hotLeads = useMemo(() => {
    if (!filteredProfiles) return [];
    const now = Date.now();
    const periodMs = hotLeadsPeriod === "30d" ? 30 * 86400000 : hotLeadsPeriod === "90d" ? 90 * 86400000 : Infinity;
    const cutoff = hotLeadsPeriod === "all" ? 0 : now - periodMs;
    return filteredProfiles
      .map(p => {
        let searches = userSearchMap[p.user_id] || [];
        let views = userViewsMap[p.user_id] || [];

        // Apply period filter
        if (hotLeadsPeriod !== "all") {
          searches = searches.filter(s => new Date(s.lastAt).getTime() >= cutoff);
          // For views, we don't have per-product timestamps in userViewsMap; fallback: use priceViews to filter
          const recentViewedIds = new Set(
            (priceViews || [])
              .filter(v => v.user_id === p.user_id && new Date(v.viewed_at).getTime() >= cutoff)
              .map(v => v.product_id)
          );
          views = views.filter(pid => recentViewedIds.has(pid));
        }

        // Apply category filter
        if (hotLeadsCategory !== "all") {
          searches = searches.filter(s => {
            // match query text directly
            if (hotLeadsCategory === "oils") return isOilText(s.query);
            return !isOilText(s.query);
          });
          views = views.filter(pid => productMatchesCategory(pid, hotLeadsCategory));
        }
        const orderInfo = ordersMap?.[p.user_id];
        const ordersCount = orderInfo?.count || 0;
        const totalSearches = searches.reduce((s, x) => s + x.count, 0);
        const lastSearchAt = searches.reduce((max, s) => s.lastAt > max ? s.lastAt : max, "");
        const lastViewAt = (priceViews || []).find(v => v.user_id === p.user_id)?.viewed_at || "";
        const lastActivity = [lastSearchAt, lastViewAt].filter(Boolean).sort().pop() || "";
        const daysSinceActivity = lastActivity ? Math.floor((now - new Date(lastActivity).getTime()) / 86400000) : 999;
        // Top searched query
        const topSearch = [...searches].sort((a, b) => b.count - a.count)[0];
        // Top viewed products (with id+sku for smart routing)
        const topProductsRich = views.slice(0, 3)
          .map(pid => {
            const prod = productsMap?.[pid];
            if (!prod?.name_ar) return null;
            return { id: pid, name: prod.name_ar as string, sku: (prod.sku as string) || null };
          })
          .filter(Boolean) as { id: string; name: string; sku: string | null }[];
        const topProducts = topProductsRich.map(x => x.name);
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
          topProductsRich,
          needReason,
          needBadge,
        };
      })
      .filter(x => x.needReason && x.score >= 8)
      .sort((a, b) => b.score - a.score)
      .slice(0, 6);
  }, [filteredProfiles, userSearchMap, userViewsMap, ordersMap, priceViews, productsMap, hotLeadsCategory, hotLeadsPeriod]);


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
            {/* Advanced filters: business type, tier, lifecycle, recent activity */}
            <Popover open={advancedFiltersOpen} onOpenChange={setAdvancedFiltersOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    "gap-1 text-[11px] h-8 font-bold",
                    (businessTypeFilter !== "all" || tierFilter !== "all" || lifecycleFilter !== "all" || recentActivityFilter !== "any") &&
                      "border-primary text-primary bg-primary/5"
                  )}
                >
                  <Filter className="w-3 h-3" />
                  فلاتر متقدمة
                  {(() => {
                    const count =
                      (businessTypeFilter !== "all" ? 1 : 0) +
                      (tierFilter !== "all" ? 1 : 0) +
                      (lifecycleFilter !== "all" ? 1 : 0) +
                      (recentActivityFilter !== "any" ? 1 : 0);
                    return count > 0 ? (
                      <Badge variant="secondary" className="text-[9px] h-4 px-1 mr-0.5">{count}</Badge>
                    ) : null;
                  })()}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[320px] p-3" align="end">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold flex items-center gap-1.5">
                      <Filter className="w-3.5 h-3.5 text-primary" />
                      فلاتر متقدمة
                    </h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[10px] h-6 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        setBusinessTypeFilter("all"); setTierFilter("all");
                        setLifecycleFilter("all"); setRecentActivityFilter("any");
                      }}
                    >
                      إعادة تعيين
                    </Button>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground mb-1 block">نوع النشاط (تاجر/ورشة/أسطول)</label>
                    <Select value={businessTypeFilter} onValueChange={setBusinessTypeFilter}>
                      <SelectTrigger className="h-8 text-[11px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">الكل</SelectItem>
                        {BUSINESS_TYPE_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground mb-1 block">درجة التاجر (Tier)</label>
                    <Select value={tierFilter} onValueChange={setTierFilter}>
                      <SelectTrigger className="h-8 text-[11px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">الكل</SelectItem>
                        {TIER_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground mb-1 block">مرحلة دورة الحياة</label>
                    <Select value={lifecycleFilter} onValueChange={setLifecycleFilter}>
                      <SelectTrigger className="h-8 text-[11px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">الكل</SelectItem>
                        {LIFECYCLE_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-muted-foreground mb-1 block">الاحتياج / النشاط الأخير</label>
                    <Select value={recentActivityFilter} onValueChange={setRecentActivityFilter}>
                      <SelectTrigger className="h-8 text-[11px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {RECENT_ACTIVITY_OPTIONS.map(o => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Separator />
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full gap-1.5 text-[11px] h-8 font-bold"
                    onClick={() => { setSaveTemplateOpen(true); setAdvancedFiltersOpen(false); }}
                  >
                    <Star className="w-3 h-3" />
                    حفظ هذه الفلاتر كقالب
                  </Button>
                </div>
              </PopoverContent>
            </Popover>

            {/* Filter Templates dropdown */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1 text-[11px] h-8 font-bold">
                  <Star className="w-3 h-3 text-amber-500" />
                  القوالب
                  {filterTemplates.length > 0 && (
                    <Badge variant="secondary" className="text-[9px] h-4 px-1 mr-0.5">{filterTemplates.length}</Badge>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[280px] p-2" align="end">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between px-2 py-1">
                    <h4 className="text-xs font-bold">قوالب الفلاتر المحفوظة</h4>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-[10px] h-6 px-2"
                      onClick={() => setSaveTemplateOpen(true)}
                    >
                      + جديد
                    </Button>
                  </div>
                  <Separator />
                  {filterTemplates.length === 0 ? (
                    <p className="text-[11px] text-muted-foreground text-center py-3">
                      لا توجد قوالب محفوظة بعد.<br />
                      اضبط فلاتر ثم احفظها للوصول السريع.
                    </p>
                  ) : (
                    <div className="max-h-[260px] overflow-y-auto space-y-1">
                      {filterTemplates.map(tpl => (
                        <div
                          key={tpl.id}
                          className="flex items-center gap-1 px-2 py-1.5 rounded-md hover:bg-accent/50 group"
                        >
                          <button
                            type="button"
                            onClick={() => applyTemplate(tpl)}
                            className="flex-1 text-right text-[11px] font-medium truncate"
                          >
                            {tpl.name}
                          </button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10"
                            onClick={() => deleteTemplate(tpl.id)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="gap-1 text-[11px] h-8 text-destructive" onClick={clearFilters}>
                <X className="w-3 h-3" />
                مسح الكل
              </Button>
            )}
            <span className="text-[11px] text-muted-foreground mr-auto font-medium">
              {filteredProfiles?.length || 0} عميل
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Save filter template dialog */}
      <Dialog open={saveTemplateOpen} onOpenChange={setSaveTemplateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Star className="w-4 h-4 text-amber-500" />
              حفظ الفلاتر الحالية كقالب
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-xs font-bold text-muted-foreground mb-1 block">اسم القالب</label>
              <Input
                value={newTemplateName}
                onChange={(e) => setNewTemplateName(e.target.value)}
                placeholder="مثال: ورش نشطة بدون طلبات"
                className="text-sm"
                onKeyDown={(e) => { if (e.key === "Enter") saveCurrentAsTemplate(); }}
                autoFocus
              />
            </div>
            <div className="bg-muted/40 rounded-lg p-2.5 space-y-1 text-[11px]">
              <p className="font-bold mb-1">الفلاتر المحفوظة:</p>
              {searchTerm && <p>• بحث: <span className="text-foreground font-medium">{searchTerm}</span></p>}
              {customerTypeFilter !== "all" && <p>• نوع العميل: <span className="text-foreground font-medium">{customerTypeFilter}</span></p>}
              {accountTypeFilter !== "all" && <p>• نوع الحساب: <span className="text-foreground font-medium">{accountTypeFilter === "dealer" ? "تاجر" : "قطاعي"}</span></p>}
              {businessTypeFilter !== "all" && <p>• النشاط: <span className="text-foreground font-medium">{BUSINESS_TYPE_OPTIONS.find(o => o.value === businessTypeFilter)?.label}</span></p>}
              {tierFilter !== "all" && <p>• الدرجة: <span className="text-foreground font-medium">{TIER_OPTIONS.find(o => o.value === tierFilter)?.label}</span></p>}
              {lifecycleFilter !== "all" && <p>• دورة الحياة: <span className="text-foreground font-medium">{LIFECYCLE_OPTIONS.find(o => o.value === lifecycleFilter)?.label}</span></p>}
              {recentActivityFilter !== "any" && <p>• النشاط الأخير: <span className="text-foreground font-medium">{RECENT_ACTIVITY_OPTIONS.find(o => o.value === recentActivityFilter)?.label}</span></p>}
              {!hasActiveFilters && <p className="text-muted-foreground">لا توجد فلاتر نشطة حالياً.</p>}
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setSaveTemplateOpen(false)}>إلغاء</Button>
            <Button size="sm" onClick={saveCurrentAsTemplate} className="gap-1.5">
              <Star className="w-3.5 h-3.5" />
              حفظ القالب
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ===== Today's Tasks for Staff ===== */}
      {(profiles && profiles.length > 0) && (
        <Card className="rounded-2xl border-2 border-primary/25 shadow-sm overflow-hidden bg-gradient-to-l from-primary/5 via-background to-background">
          <CardHeader className="py-3 px-4 border-b border-border/40">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <CardTitle className="text-sm font-black flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-blue-600 flex items-center justify-center shadow-md">
                  <ListOrdered className="w-3.5 h-3.5 text-white" />
                </div>
                مهام اليوم
                <Badge variant="secondary" className="text-[10px] h-5 mr-1">
                  {pendingTasksCount} متبقي
                </Badge>
                {completedTasksCount > 0 && (
                  <Badge className="text-[10px] h-5 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-300/30">
                    <CheckCircle2 className="w-3 h-3 ml-1" />
                    {completedTasksCount} مكتمل
                  </Badge>
                )}
              </CardTitle>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground font-medium hidden md:inline">
                  {format(new Date(), "EEEE dd MMMM yyyy", { locale: ar })}
                </span>
                <Select value={String(taskWindowDays)} onValueChange={(v) => updateTaskWindow(parseInt(v, 10))}>
                  <SelectTrigger
                    className="h-7 text-[11px] gap-1 px-2 w-auto min-w-[110px] border-primary/30 bg-primary/5 font-bold"
                    title="نافذة عرض المهام حسب آخر نشاط"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="end">
                    <SelectItem value="1" className="text-xs">⚡ آخر 24 ساعة</SelectItem>
                    <SelectItem value="3" className="text-xs">🔥 آخر 3 أيام</SelectItem>
                    <SelectItem value="7" className="text-xs">📅 آخر 7 أيام</SelectItem>
                    <SelectItem value="30" className="text-xs">🗓️ آخر 30 يوم</SelectItem>
                    <SelectItem value="0" className="text-xs">♾️ كل المهام</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-[11px] gap-1"
                  onClick={() => setShowCompletedTasks(v => !v)}
                >
                  {showCompletedTasks ? "إخفاء المكتمل" : "إظهار المكتمل"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setWeightsDialogOpen(true)}
                  title="إعدادات أوزان الأولوية"
                >
                  <Settings2 className="w-4 h-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0"
                  onClick={() => setTasksOpen(v => !v)}
                  title={tasksOpen ? "طي المهام" : "إظهار المهام"}
                >
                  <ChevronDown className={cn("w-4 h-4 transition-transform", !tasksOpen && "-rotate-90")} />
                </Button>
              </div>
            </div>
          </CardHeader>
          {tasksOpen && (
          <CardContent className="p-3">
            {visibleTasks.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground text-xs flex flex-col items-center gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                <p className="font-bold">
                  {todayTasks.length === 0 && taskWindowDays !== 0
                    ? `مفيش مهام ضمن ${taskWindowDays === 1 ? "آخر 24 ساعة" : `آخر ${taskWindowDays} يوم`} — جرّب توسيع النافذة`
                    : "رائع! خلصت كل مهام اليوم 🎉"}
                </p>
                {todayTasks.length === 0 && taskWindowDays !== 0 ? (
                  <button
                    className="text-[11px] text-primary hover:underline"
                    onClick={() => updateTaskWindow(0)}
                  >
                    عرض كل المهام
                  </button>
                ) : completedTasksCount > 0 && (
                  <button
                    className="text-[11px] text-primary hover:underline"
                    onClick={() => setShowCompletedTasks(true)}
                  >
                    إظهار {completedTasksCount} مهمة مكتملة
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {visibleTasks.slice(0, 30).map((task) => {
                  const isDone = completedTasks.has(task.id);
                  const phoneDigits = task.phone?.replace(/\D/g, "") || "";
                  const waNumber = phoneDigits.startsWith("0") ? "20" + phoneDigits.slice(1) : phoneDigits;
                  const priorityColor =
                    task.priority === 1 ? "border-red-300/60 bg-red-50/60 dark:bg-red-950/15 dark:border-red-800/40"
                    : task.priority === 2 ? "border-amber-300/60 bg-amber-50/60 dark:bg-amber-950/15 dark:border-amber-800/40"
                    : "border-border/50 bg-muted/20";
                  const priorityLabel = task.priority === 1 ? "عاجل" : task.priority === 2 ? "متوسط" : "عادي";
                  const priorityBadge =
                    task.priority === 1 ? "bg-red-500/15 text-red-700 dark:text-red-400"
                    : task.priority === 2 ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                    : "bg-muted text-muted-foreground";
                  return (
                    <div
                      key={task.id}
                      onClick={() => {
                        setExpandedUser(task.userId);
                        // smooth scroll to the customer card after a tiny delay to allow expand
                        setTimeout(() => {
                          const el = document.getElementById(`customer-card-${task.userId}`);
                          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                        }, 100);
                      }}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setExpandedUser(task.userId);
                        }
                      }}
                      className={cn(
                        "rounded-xl border p-3 transition-all flex flex-col gap-2 cursor-pointer hover:shadow-md hover:scale-[1.01]",
                        isDone
                          ? "border-emerald-200/40 bg-emerald-50/20 dark:bg-emerald-950/5 opacity-40 hover:opacity-60 grayscale-[0.5]"
                          : priorityColor
                      )}
                      title="اضغط لفتح تفاصيل العميل"
                    >
                      <div className="flex items-start gap-2">
                        <span className={cn("text-lg leading-none", isDone && "grayscale opacity-50")}>{task.icon}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap mb-1">
                            <span className={cn("text-[9px] font-black px-1.5 py-0.5 rounded", priorityBadge, isDone && "opacity-60")}>
                              {priorityLabel}
                            </span>
                            <span className={cn(
                              "text-[9px] font-bold px-1.5 py-0.5 rounded",
                              task.isDealer ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" : "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400",
                              isDone && "opacity-60"
                            )}>
                              {task.isDealer ? "تاجر" : "قطاعي"}
                            </span>
                            {/* Unified urgency score badge */}
                            <span
                              className={cn(
                                "text-[9px] font-black px-1.5 py-0.5 rounded inline-flex items-center gap-0.5",
                                task.score >= weightsTotal * 0.70 ? "bg-red-500/20 text-red-700 dark:text-red-400"
                                : task.score >= weightsTotal * 0.50 ? "bg-orange-500/20 text-orange-700 dark:text-orange-400"
                                : task.score >= weightsTotal * 0.30 ? "bg-amber-500/20 text-amber-700 dark:text-amber-400"
                                : "bg-muted text-muted-foreground",
                                isDone && "opacity-60"
                              )}
                              title={`درجة الأولوية: ${task.score}/${weightsTotal}\n• إنذارات: ${task.scoreBreakdown.alerts}/${priorityWeights.alerts}\n• حداثة النشاط: ${task.scoreBreakdown.recency}/${priorityWeights.recency}\n• إمكانية الشراء: ${task.scoreBreakdown.buyability}/${priorityWeights.buyability}`}
                            >
                              ⚡{task.score}
                            </span>
                            {isDone && (
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 inline-flex items-center gap-1">
                                <CheckCircle2 className="w-2.5 h-2.5" /> مكتمل
                              </span>
                            )}
                          </div>
                          <p className={cn("text-xs font-black text-foreground", isDone && "line-through text-muted-foreground")}>{task.title}</p>
                          <p className={cn("text-[10px] text-muted-foreground mt-0.5 line-clamp-2", isDone && "opacity-70")}>{task.reason}</p>
                          <p
                            className={cn("text-[11px] font-bold text-primary mt-1 truncate max-w-full text-right", isDone && "opacity-70")}
                            title={task.userName}
                          >
                            {task.userName}
                          </p>
                        </div>
                        {/* Eye icon — opens customer details */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedUser(task.userId);
                            setTimeout(() => {
                              const el = document.getElementById(`customer-card-${task.userId}`);
                              if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                            }, 100);
                          }}
                          title="عرض تفاصيل العميل"
                          className={cn(
                            "shrink-0 inline-flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary transition-colors",
                            isDone && "opacity-60"
                          )}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {/* Score breakdown panel — visualizes how alerts/recency/buyability contribute */}
                      <div
                        className={cn(
                          "rounded-lg border border-border/40 bg-background/60 px-2 py-1.5 space-y-1",
                          isDone && "opacity-60"
                        )}
                        onClick={(e) => e.stopPropagation()}
                        title="تفصيل درجة الأولوية الموحدة"
                      >
                        <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground">
                          <span>تفصيل الأولوية</span>
                          <span className="font-black text-foreground">{task.score}<span className="opacity-60">/{weightsTotal}</span></span>
                        </div>
                        {/* Stacked bar — width relative to current configured weight totals */}
                        <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-muted/40">
                          <div
                            className="bg-red-500/80 transition-all"
                            style={{ width: `${weightsTotal > 0 ? (task.scoreBreakdown.alerts / weightsTotal) * 100 : 0}%` }}
                            title={`إنذارات: ${task.scoreBreakdown.alerts}/${priorityWeights.alerts}`}
                          />
                          <div
                            className="bg-amber-500/80 transition-all"
                            style={{ width: `${weightsTotal > 0 ? (task.scoreBreakdown.recency / weightsTotal) * 100 : 0}%` }}
                            title={`حداثة النشاط: ${task.scoreBreakdown.recency}/${priorityWeights.recency}`}
                          />
                          <div
                            className="bg-emerald-500/80 transition-all"
                            style={{ width: `${weightsTotal > 0 ? (task.scoreBreakdown.buyability / weightsTotal) * 100 : 0}%` }}
                            title={`إمكانية الشراء: ${task.scoreBreakdown.buyability}/${priorityWeights.buyability}`}
                          />
                        </div>
                        {/* Legend with values */}
                        <div className="flex items-center justify-between gap-1 text-[9px] font-bold">
                          <span className="inline-flex items-center gap-1 text-red-700 dark:text-red-400" title="مساهمة الإنذارات (حد أقصى 30)">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                            إنذارات {task.scoreBreakdown.alerts}
                          </span>
                          <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-400" title="حداثة آخر نشاط (حد أقصى 40)">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            حداثة {task.scoreBreakdown.recency}
                          </span>
                          <span className="inline-flex items-center gap-1 text-emerald-700 dark:text-emerald-400" title="إمكانية الشراء (حد أقصى 30)">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            شراء {task.scoreBreakdown.buyability}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap pt-1.5 border-t border-border/30" onClick={(e) => e.stopPropagation()}>
                        {task.phone && (
                          <>
                            <a
                              href={`tel:${task.phone}`}
                              onClick={(e) => e.stopPropagation()}
                              className={cn(
                                "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors",
                                isDone && "opacity-60"
                              )}
                            >
                              <Phone className="w-3 h-3" /> اتصال
                            </a>
                            <a
                              href={`https://wa.me/${waNumber}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className={cn(
                                "inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md bg-green-500/15 text-green-700 dark:text-green-400 hover:bg-green-500/25 transition-colors",
                                isDone && "opacity-60"
                              )}
                            >
                              <MessageCircle className="w-3 h-3" /> واتساب
                            </a>
                          </>
                        )}
                        <Button
                          variant={isDone ? "outline" : "default"}
                          size="sm"
                          onClick={(e) => { e.stopPropagation(); toggleTaskComplete(task.id); }}
                          className="h-7 text-[10px] gap-1 mr-auto"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          {isDone ? "إلغاء" : "تم"}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {visibleTasks.length > 30 && (
              <p className="text-center text-[10px] text-muted-foreground mt-3">
                يتم عرض أول 30 مهمة من إجمالي {visibleTasks.length}
              </p>
            )}
          </CardContent>
          )}
        </Card>
      )}

      {/* Customer list with top-level tabs (All / Needs Follow-up Now) */}
      {(() => {
        // Build "needs follow-up now" list with urgency scoring
        type FollowUpItem = {
          profile: typeof filteredProfiles extends (infer T)[] | undefined ? T : never;
          score: number;
          reasons: { icon: string; label: string }[];
        };
        const followUpList: FollowUpItem[] = [];
        filteredProfiles?.forEach((p) => {
          const reasons: { icon: string; label: string }[] = [];
          let score = 0;
          const orders = ordersMap?.[p.user_id];
          const cart = cartByUser?.[p.user_id];
          const searches = userSearchMap[p.user_id] || [];
          const totalSearches = searches.reduce((s, q) => s + q.count, 0);
          const lifecycle = getLifecycleStage(p.user_id);
          const lastVisit = lastVisitByUser?.[p.user_id];

          // 🛒 سلة متروكة منذ يوم+
          if (cart && cart.count > 0) {
            const days = differenceInDays(new Date(), new Date(cart.lastUpdated));
            if (days >= 1) {
              score += 50 + Math.min(cart.count * 2, 20);
              reasons.push({ icon: "🛒", label: `سلة متروكة (${cart.count} صنف منذ ${days} يوم)` });
            }
          }
          // 🔥 بحث كثيف بدون طلب
          if (totalSearches >= 5 && !orders) {
            score += 40 + Math.min(totalSearches, 20);
            reasons.push({ icon: "🔥", label: `${totalSearches} بحث بدون طلب — عميل ساخن` });
          } else if (totalSearches >= 3 && !orders) {
            score += 20;
            reasons.push({ icon: "🎯", label: `${totalSearches} بحث بدون طلب` });
          }
          // ⏰ عميل خامل
          if (lifecycle === "idle") {
            score += 25;
            reasons.push({ icon: "⏰", label: "خامل (30-90 يوم) — يحتاج تنشيط" });
          }
          // 👋 عميل غايب 14+ يوم لكن سبق وطلب
          if (lastVisit && orders) {
            const daysSinceVisit = differenceInDays(new Date(), new Date(lastVisit));
            if (daysSinceVisit >= 14) {
              score += 20;
              reasons.push({ icon: "👋", label: `غايب منذ ${daysSinceVisit} يوم` });
            }
          }
          // ✨ عميل جديد نشط
          const daysSinceJoin = differenceInDays(new Date(), new Date(p.created_at));
          if (daysSinceJoin <= 3 && !orders && totalSearches > 0) {
            score += 15;
            reasons.push({ icon: "✨", label: "عميل جديد نشط — رحب به" });
          }
          // 📞 لم يتم التواصل + لديه أي إشارة
          if (score > 0) {
            followUpList.push({ profile: p, score, reasons });
          }
        });
        followUpList.sort((a, b) => b.score - a.score);

        const formatPhoneForWA = (phone: string) => {
          let cleaned = phone.replace(/[\s\-()]/g, "");
          cleaned = cleaned.replace(/^002/, "").replace(/^0020/, "");
          if (cleaned.startsWith("0")) cleaned = "20" + cleaned.slice(1);
          return cleaned;
        };

        const buildQuickMessage = (name: string | null, reasons: { label: string }[]) => {
          const greeting = `مرحباً ${name || "عميلنا الكريم"} 👋`;
          const body = reasons.length > 0
            ? `\n\nنود متابعة طلبك معنا. لاحظنا: ${reasons[0].label}.\nفريق المصرية جروب يمكنه مساعدتك بأفضل العروض والأسعار.`
            : `\n\nنود التواصل معك ومتابعة احتياجاتك من قطع غيار تويوتا.`;
          return encodeURIComponent(greeting + body);
        };

        return (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-auto p-1 bg-muted/40 rounded-xl mb-3">
              <TabsTrigger value="all" className="text-[12px] font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-2.5">
                <Users className="w-3.5 h-3.5" />
                كل العملاء
                <Badge variant="secondary" className="text-[10px] h-5 mr-1">{filteredProfiles?.length || 0}</Badge>
              </TabsTrigger>
              <TabsTrigger value="followup" className="text-[12px] font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-2.5">
                <Zap className="w-3.5 h-3.5 text-orange-500" />
                يحتاجون متابعة الآن
                {followUpList.length > 0 && (
                  <Badge className="text-[10px] h-5 mr-1 bg-orange-500 hover:bg-orange-600 text-white">{followUpList.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* ===== Tab: Needs Follow-up Now ===== */}
            <TabsContent value="followup" className="space-y-2.5 mt-0 focus-visible:outline-none">
              {loadingProfiles ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted animate-pulse rounded-xl" />)}
                </div>
              ) : followUpList.length === 0 ? (
                <Card className="rounded-2xl border-dashed border-2 border-emerald-300/50 bg-emerald-50/30 dark:bg-emerald-950/10">
                  <CardContent className="py-10 text-center">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
                    <h3 className="font-black text-base text-emerald-700 dark:text-emerald-400 mb-1">ممتاز! لا يوجد عملاء يحتاجون متابعة عاجلة</h3>
                    <p className="text-xs text-muted-foreground">جميع العملاء في الفلتر الحالي تحت السيطرة 🎉</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {followUpList.slice(0, 50).map((item, idx) => {
                    const p = item.profile;
                    const isDealer = dealerUserIds?.has(p.user_id);
                    const urgencyColor =
                      item.score >= 70 ? "border-r-4 border-r-red-500 bg-red-50/40 dark:bg-red-950/10" :
                      item.score >= 40 ? "border-r-4 border-r-orange-500 bg-orange-50/40 dark:bg-orange-950/10" :
                      "border-r-4 border-r-amber-400 bg-amber-50/30 dark:bg-amber-950/10";
                    const urgencyLabel =
                      item.score >= 70 ? { label: "عاجل جداً", color: "bg-red-500 text-white" } :
                      item.score >= 40 ? { label: "عاجل", color: "bg-orange-500 text-white" } :
                      { label: "متوسط", color: "bg-amber-400 text-amber-950" };
                    return (
                      <Card
                        key={p.user_id}
                        className={cn("rounded-xl shadow-sm hover:shadow-md transition-all overflow-hidden", urgencyColor)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-start gap-3 flex-wrap">
                            {/* Rank + Avatar */}
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="w-8 h-8 rounded-lg bg-background border border-border/50 flex items-center justify-center font-black text-xs text-muted-foreground">
                                #{idx + 1}
                              </div>
                              <div className={cn(
                                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                                isDealer ? "bg-blue-500/15" : "bg-primary/10"
                              )}>
                                <Users className={cn("w-5 h-5", isDealer ? "text-blue-600 dark:text-blue-400" : "text-primary")} />
                              </div>
                            </div>

                            {/* Customer info */}
                            <div className="flex-1 min-w-[180px]">
                              <div className="flex items-center gap-2 flex-wrap mb-1">
                                <button
                                  type="button"
                                  onClick={() => { setExpandedUser(p.user_id); }}
                                  className="font-bold text-sm text-foreground hover:text-primary text-right"
                                >
                                  {p.full_name || "غير محدد"}
                                </button>
                                <Badge className={cn("text-[9px] h-5 font-black", urgencyLabel.color)}>
                                  {urgencyLabel.label} · {item.score}
                                </Badge>
                                {isDealer ? (
                                  <Badge variant="outline" className="text-[9px] h-5 border-blue-300 text-blue-700 dark:text-blue-400">تاجر</Badge>
                                ) : (
                                  <Badge variant="outline" className="text-[9px] h-5">قطاعي</Badge>
                                )}
                              </div>
                              {/* Phone */}
                              <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                {p.phone ? (
                                  <span className="font-mono font-medium text-foreground" dir="ltr">{p.phone}</span>
                                ) : (
                                  <span className="text-red-600 font-bold">⚠ لا يوجد رقم هاتف</span>
                                )}
                              </div>
                              {/* Reasons */}
                              <div className="flex flex-wrap gap-1.5 mt-1.5">
                                {item.reasons.map((r, ri) => (
                                  <span
                                    key={ri}
                                    className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-background border border-border/40 font-medium"
                                  >
                                    <span>{r.icon}</span>{r.label}
                                  </span>
                                ))}
                              </div>
                            </div>

                            {/* One-click action buttons */}
                            <div className="flex items-center gap-1.5 shrink-0 ms-auto">
                              {p.phone ? (
                                <>
                                  <Button
                                    asChild
                                    size="sm"
                                    className="h-9 gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-sm"
                                  >
                                    <a
                                      href={`https://wa.me/${formatPhoneForWA(p.phone)}?text=${buildQuickMessage(p.full_name, item.reasons)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      title="فتح محادثة واتساب"
                                    >
                                      <MessageCircle className="w-3.5 h-3.5" />
                                      واتساب
                                    </a>
                                  </Button>
                                  <Button
                                    asChild
                                    size="sm"
                                    variant="outline"
                                    className="h-9 gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950/30 font-bold"
                                  >
                                    <a href={`tel:${p.phone}`} title="بدء مكالمة">
                                      <Phone className="w-3.5 h-3.5" />
                                      اتصل
                                    </a>
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-9 gap-1.5 text-[11px]"
                                  onClick={() => setExpandedUser(p.user_id)}
                                >
                                  <AlertCircle className="w-3.5 h-3.5" />
                                  أضف رقم
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-9 px-2 text-[11px]"
                                onClick={() => setExpandedUser(p.user_id)}
                                title="فتح ملف العميل"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                  {followUpList.length > 50 && (
                    <p className="text-center text-[11px] text-muted-foreground mt-2">
                      يتم عرض أعلى 50 من إجمالي {followUpList.length} عميل يحتاج متابعة
                    </p>
                  )}
                </>
              )}
            </TabsContent>

            {/* ===== Tab: All Customers (existing list) ===== */}
            <TabsContent value="all" className="mt-0 focus-visible:outline-none">
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
                id={`customer-card-${profile.user_id}`}
                className={cn(
                  "rounded-2xl border bg-card overflow-hidden transition-all duration-300 scroll-mt-24",
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
                      onClick={(e) => {
                        e.stopPropagation();
                        setExpandedUser(isExpanded ? null : profile.user_id);
                      }}
                      title={isExpanded ? "إخفاء التفاصيل" : "عرض تفاصيل العميل"}
                      aria-label={isExpanded ? "إخفاء التفاصيل" : "عرض تفاصيل العميل"}
                      className={cn(
                        "shrink-0 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl font-bold text-[11px] transition-all border",
                        isExpanded
                          ? "bg-primary text-primary-foreground border-primary shadow-md hover:bg-primary/90"
                          : "bg-primary/10 text-primary border-primary/30 hover:bg-primary/20 hover:border-primary/50 hover:shadow-sm"
                      )}
                    >
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline">{isExpanded ? "إخفاء" : "تفاصيل"}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
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
                  <div className="px-5 pb-5 border-t border-border/30 pt-4 bg-gradient-to-b from-muted/20 to-transparent">
                    {(() => {
                      const alerts = getCustomerAlerts(profile.user_id);
                      const comms = communicationsByUser[profile.user_id] || [];
                      const hasNoActivity = searches.length === 0 && viewedProducts.length === 0 && !orders;
                      if (hasNoActivity && alerts.length === 0) {
                        return (<p className="text-sm text-muted-foreground text-center py-6">لا يوجد نشاط مسجل لهذا العميل بعد</p>);
                      }
                      const commLabel: Record<string, { label: string; color: string }> = {
                        phone: { label: "📞 مكالمة", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400" },
                        whatsapp: { label: "💬 واتساب", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" },
                        email: { label: "✉️ إيميل", color: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400" },
                        meeting: { label: "🤝 مقابلة", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" },
                      };
                      const lastComm = comms[0];
                      const daysSince = lastComm ? differenceInDays(new Date(), new Date(lastComm.created_at)) : 0;
                      const brandCounts: Record<string, number> = {};
                      if (productsMap) { viewedProducts.forEach(pid => { const b = productsMap[pid]?.brand; if (b) brandCounts[b] = (brandCounts[b] || 0) + 1; }); }
                      const topBrands = Object.entries(brandCounts).sort((a, b) => b[1] - a[1]).slice(0, 4);
                      const phoneRaw = profile.phone || "";
                      const phoneWA = phoneRaw ? formatPhoneForWhatsApp(phoneRaw) : "";
                      const customerName = profile.full_name || "عميلنا الكريم";
                      const topSearchQuery = searches[0]?.query || "";
                      const waMessage = topSearchQuery
                        ? `أهلاً ${customerName}، من المصرية جروب لقطع غيار تويوتا. لاحظنا اهتمامك بـ "${topSearchQuery}" — هل يمكنني مساعدتك؟`
                        : `أهلاً ${customerName}، من المصرية جروب لقطع غيار تويوتا. كيف يمكنني خدمتك اليوم؟`;
                      const emailSubject = `متابعة من المصرية جروب لقطع غيار تويوتا`;
                      const emailBody = topSearchQuery
                        ? `أهلاً ${customerName},\n\nلاحظنا اهتمامك بـ "${topSearchQuery}" على موقعنا. يسعدنا مساعدتك في إيجاد القطعة المناسبة.\n\nللتواصل: 01027815696\nمع تحيات،\nفريق المصرية جروب`
                        : `أهلاً ${customerName},\n\nنود التواصل معك بخصوص خدمتك من المصرية جروب لقطع غيار تويوتا.\n\nللتواصل: 01027815696\nمع تحيات،\nفريق المصرية جروب`;
                      const noteDraft = quickNoteDraft[profile.user_id] || "";
                      const selectedType = quickNoteType[profile.user_id] || "phone";
                      const isSavingNote = savingQuickNote === profile.user_id;
                      return (
                        <>
                          {/* ===== Quick Contact Panel — لوحة تواصل سريعة ===== */}
                          <div className="mb-4 rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 via-emerald-500/5 to-blue-500/5 dark:from-primary/10 dark:via-emerald-950/15 dark:to-blue-950/15 p-3.5 shadow-sm">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center"><MessageCircle className="w-4 h-4 text-primary" /></div>
                                <div>
                                  <p className="text-xs font-black text-foreground">لوحة تواصل سريعة</p>
                                  <p className="text-[10px] text-muted-foreground">تواصل وسجّل المتابعة بضغطة واحدة</p>
                                </div>
                              </div>
                              {!phoneRaw && !profile.email && (
                                <span className="text-[10px] font-bold bg-amber-500/15 text-amber-700 dark:text-amber-400 px-2 py-1 rounded-md">⚠️ لا توجد بيانات تواصل</span>
                              )}
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                              <a
                                href={phoneRaw ? `tel:${phoneRaw}` : undefined}
                                onClick={(e) => { e.stopPropagation(); if (!phoneRaw) { e.preventDefault(); toast({ title: "لا يوجد رقم هاتف", variant: "destructive" }); } }}
                                className={cn("flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all", phoneRaw ? "bg-blue-500 hover:bg-blue-600 text-white shadow-sm hover:shadow active:scale-95" : "bg-muted/40 text-muted-foreground cursor-not-allowed")}
                                title={phoneRaw ? `اتصل بـ ${phoneRaw}` : "لا يوجد رقم"}
                              ><Phone className="w-3.5 h-3.5" />اتصال</a>
                              <a
                                href={phoneRaw ? `https://wa.me/${phoneWA}?text=${encodeURIComponent(waMessage)}` : undefined}
                                target="_blank" rel="noopener noreferrer"
                                onClick={(e) => { e.stopPropagation(); if (!phoneRaw) { e.preventDefault(); toast({ title: "لا يوجد رقم واتساب", variant: "destructive" }); } }}
                                className={cn("flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all", phoneRaw ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm hover:shadow active:scale-95" : "bg-muted/40 text-muted-foreground cursor-not-allowed")}
                                title={phoneRaw ? "إرسال رسالة واتساب جاهزة" : "لا يوجد رقم"}
                              ><MessageCircle className="w-3.5 h-3.5" />واتساب</a>
                              <a
                                href={profile.email ? `mailto:${profile.email}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}` : undefined}
                                onClick={(e) => { e.stopPropagation(); if (!profile.email) { e.preventDefault(); toast({ title: "لا يوجد بريد إلكتروني", variant: "destructive" }); } }}
                                className={cn("flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold transition-all", profile.email ? "bg-purple-500 hover:bg-purple-600 text-white shadow-sm hover:shadow active:scale-95" : "bg-muted/40 text-muted-foreground cursor-not-allowed")}
                                title={profile.email ? `إرسال بريد إلى ${profile.email}` : "لا يوجد بريد"}
                              ><Mail className="w-3.5 h-3.5" />بريد</a>
                              <button
                                onClick={(e) => { e.stopPropagation(); const text = [phoneRaw && `📞 ${phoneRaw}`, profile.email && `✉️ ${profile.email}`].filter(Boolean).join("\n"); if (!text) { toast({ title: "لا توجد بيانات للنسخ", variant: "destructive" }); return; } navigator.clipboard.writeText(text); toast({ title: "✅ تم نسخ بيانات التواصل" }); }}
                                className="flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-xs font-bold bg-slate-700 hover:bg-slate-800 dark:bg-slate-600 dark:hover:bg-slate-700 text-white shadow-sm hover:shadow active:scale-95 transition-all"
                                title="نسخ الهاتف والإيميل"
                              ><Copy className="w-3.5 h-3.5" />نسخ</button>
                            </div>

                            <div className="rounded-xl bg-background/70 border border-border/50 p-2.5">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-[11px] font-bold text-foreground flex items-center gap-1.5"><FileText className="w-3.5 h-3.5 text-primary" />سجّل ملاحظة متابعة</p>
                                <div className="flex items-center gap-1">
                                  {(["phone", "whatsapp", "email", "meeting"] as const).map(t => {
                                    const labels: Record<string, string> = { phone: "📞", whatsapp: "💬", email: "✉️", meeting: "🤝" };
                                    return (
                                      <button key={t} onClick={(e) => { e.stopPropagation(); setQuickNoteType(prev => ({ ...prev, [profile.user_id]: t })); }}
                                        className={cn("text-[11px] px-2 py-0.5 rounded-md font-bold transition-all", selectedType === t ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted/50 hover:bg-muted text-muted-foreground")}
                                        title={t}
                                      >{labels[t]}</button>
                                    );
                                  })}
                                </div>
                              </div>
                              <div className="flex gap-1.5">
                                <Textarea
                                  value={noteDraft}
                                  onChange={(e) => setQuickNoteDraft(prev => ({ ...prev, [profile.user_id]: e.target.value }))}
                                  onClick={(e) => e.stopPropagation()}
                                  placeholder="مثال: تم الاتصال — العميل مهتم بفلتر زيت كامري 2020 وسيرد خلال يومين..."
                                  rows={2}
                                  className="text-xs resize-none flex-1 bg-background"
                                  onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) { e.preventDefault(); saveQuickNote(profile.user_id); } }}
                                />
                                <Button size="sm" onClick={(e) => { e.stopPropagation(); saveQuickNote(profile.user_id); }} disabled={isSavingNote || !noteDraft.trim()} className="self-end gap-1 h-9">
                                  {isSavingNote ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}حفظ
                                </Button>
                              </div>
                              <p className="text-[10px] text-muted-foreground mt-1.5">💡 تلميح: Ctrl+Enter للحفظ السريع</p>
                            </div>
                          </div>

                          <Tabs defaultValue="contact" className="w-full">
                          <TabsList className="grid w-full grid-cols-3 sm:grid-cols-5 h-auto p-1 bg-muted/40 rounded-xl">
                            <TabsTrigger value="contact" className="text-[11px] font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-2"><Phone className="w-3.5 h-3.5" />التواصل</TabsTrigger>
                            <TabsTrigger value="needs" className="text-[11px] font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-2"><AlertTriangle className="w-3.5 h-3.5" />احتياجات{alerts.length > 0 && (<span className="text-[9px] bg-red-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-black">{alerts.length}</span>)}</TabsTrigger>
                            <TabsTrigger value="basic" className="text-[11px] font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-2"><Users className="w-3.5 h-3.5" />الملف</TabsTrigger>
                            <TabsTrigger value="prefs" className="text-[11px] font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-2"><Car className="w-3.5 h-3.5" />تفضيلات</TabsTrigger>
                            <TabsTrigger value="activity" className="text-[11px] font-bold gap-1.5 data-[state=active]:bg-background data-[state=active]:shadow-sm rounded-lg py-2"><Search className="w-3.5 h-3.5" />سجل التصفح</TabsTrigger>
                          </TabsList>

                          {/* === تبويب التواصل السريع === */}
                          <TabsContent value="contact" className="space-y-3 mt-4 focus-visible:outline-none">
                            <div className="rounded-2xl border-2 border-primary/30 bg-gradient-to-br from-primary/[0.08] via-primary/[0.04] to-emerald-500/[0.04] p-4 sm:p-5 shadow-sm">
                              <div className="flex items-start justify-between gap-3 mb-3">
                                <div className="min-w-0 flex-1">
                                  <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wide">العميل</p>
                                  <p className="text-base sm:text-lg font-black text-foreground truncate">
                                    {profile.full_name || <span className="text-muted-foreground italic">بدون اسم</span>}
                                  </p>
                                  {dealerUserIds?.has(profile.user_id) ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold mt-1 bg-blue-500/15 text-blue-700 dark:text-blue-400 px-2 py-0.5 rounded-md">
                                      <Briefcase className="w-3 h-3" />تاجر
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold mt-1 bg-muted text-muted-foreground px-2 py-0.5 rounded-md">
                                      عميل قطاعي
                                    </span>
                                  )}
                                </div>
                                {alerts.length > 0 && (
                                  <span className="text-[10px] font-bold bg-red-500/15 text-red-700 dark:text-red-400 px-2 py-1 rounded-lg flex items-center gap-1 shrink-0">
                                    <AlertTriangle className="w-3 h-3" />{alerts.length} تنبيه
                                  </span>
                                )}
                              </div>

                              {profile.phone ? (
                                <>
                                  <div className="bg-background/80 rounded-xl border border-border/40 p-3 mb-3">
                                    <p className="text-[10px] text-muted-foreground font-bold mb-1">📱 رقم الموبايل</p>
                                    <p className="text-2xl sm:text-3xl font-black text-foreground tracking-wider font-mono" dir="ltr">
                                      {profile.phone}
                                    </p>
                                  </div>
                                  <div className="grid grid-cols-3 gap-2">
                                    <a href={`tel:${profile.phone}`} onClick={(e) => e.stopPropagation()} className="flex flex-col items-center justify-center gap-1 h-16 rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-500/30 font-bold text-[11px] transition-colors">
                                      <Phone className="w-5 h-5" />اتصال
                                    </a>
                                    <a href={`https://wa.me/${formatPhoneForWhatsApp(profile.phone)}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex flex-col items-center justify-center gap-1 h-16 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-bold text-[11px] transition-colors">
                                      <MessageCircle className="w-5 h-5" />واتساب
                                    </a>
                                    <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(profile.phone || ""); toast({ title: "✅ تم نسخ الرقم" }); }} className="flex flex-col items-center justify-center gap-1 h-16 rounded-xl bg-muted hover:bg-muted/70 text-foreground border border-border/50 font-bold text-[11px] transition-colors">
                                      <Copy className="w-5 h-5" />نسخ
                                    </button>
                                  </div>
                                </>
                              ) : (
                                <div className="rounded-xl border-2 border-dashed border-amber-300/60 bg-amber-50/40 dark:bg-amber-950/15 p-4 text-center">
                                  <Phone className="w-8 h-8 text-amber-500 mx-auto mb-2 opacity-70" />
                                  <p className="text-sm font-bold text-amber-800 dark:text-amber-300">لا يوجد رقم موبايل لهذا العميل</p>
                                  <p className="text-[11px] text-muted-foreground mt-1">انتقل لتبويب "الملف" لإدخال الرقم يدوياً</p>
                                </div>
                              )}

                              {profile.email && !profile.email.endsWith("@phone.almasria.local") && (
                                <a href={`mailto:${profile.email}`} onClick={(e) => e.stopPropagation()} className="mt-2 flex items-center gap-2 rounded-lg bg-background/60 border border-border/40 px-3 py-2 text-xs text-foreground hover:bg-background transition-colors">
                                  <Mail className="w-3.5 h-3.5 text-primary shrink-0" />
                                  <span className="truncate" dir="ltr">{profile.email}</span>
                                </a>
                              )}
                            </div>

                            {profile.phone && (
                              <div className="rounded-xl border border-primary/20 bg-card/60 p-3.5">
                                <div className="flex items-start justify-between gap-3 mb-2">
                                  <div className="flex items-center gap-2 min-w-0">
                                    <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center shrink-0"><MessageCircle className="w-4 h-4 text-primary" /></div>
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-foreground">سكريبت اتصال جاهز</p>
                                      <p className="text-[10px] text-muted-foreground">مبني تلقائياً على سلوك العميل</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-1.5 shrink-0">
                                    <button onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(buildCallScript(profile.user_id)); toast({ title: "✅ تم نسخ السكريبت" }); }} className="text-[10px] font-bold px-2 py-1.5 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary flex items-center gap-1 transition-colors"><Copy className="w-3 h-3" />نسخ</button>
                                    <a href={`https://wa.me/${formatPhoneForWhatsApp(profile.phone)}?text=${encodeURIComponent(buildCallScript(profile.user_id))}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[10px] font-bold px-2 py-1.5 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 flex items-center gap-1 transition-colors"><Send className="w-3 h-3" />إرسال</a>
                                  </div>
                                </div>
                                <p className="text-xs text-foreground/85 leading-relaxed whitespace-pre-line bg-background/60 rounded-lg p-3 border border-border/30">{buildCallScript(profile.user_id)}</p>
                              </div>
                            )}

                            {comms.length === 0 ? (
                              <div className="rounded-xl border border-dashed border-border/50 bg-muted/10 p-3 flex items-center justify-between"><div className="flex items-center gap-2 text-[11px] text-muted-foreground"><FileText className="w-3.5 h-3.5" />لا يوجد سجل تواصل سابق</div><span className="text-[10px] text-muted-foreground italic">سجّل مكالمتك من ملف العميل</span></div>
                            ) : (
                              <div className="rounded-xl border border-border/40 bg-card/50 overflow-hidden">
                                <div className="px-3 py-2 bg-muted/30 flex items-center justify-between"><div className="flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-bold text-foreground">آخر تواصل</span><span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">{comms.length}</span></div><span className="text-[10px] text-muted-foreground">منذ <strong className="text-foreground">{daysSince === 0 ? "اليوم" : `${daysSince} يوم`}</strong></span></div>
                                <div className="divide-y divide-border/30 max-h-48 overflow-y-auto">{comms.slice(0, 5).map(c => { const info = commLabel[c.comm_type] || { label: c.comm_type, color: "bg-muted text-foreground" }; return (<div key={c.id} className="px-3 py-2 flex items-start gap-2"><span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0", info.color)}>{info.label}</span><div className="min-w-0 flex-1">{c.note && (<p className="text-[11px] text-foreground/85 line-clamp-2">{c.note}</p>)}<p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(c.created_at), "dd/MM/yyyy hh:mm a", { locale: ar })}</p></div></div>); })}</div>
                              </div>
                            )}
                          </TabsContent>

                          <TabsContent value="basic" className="space-y-3 mt-4 focus-visible:outline-none">
                            {(() => {
                              const missing = detectMissingFields(profile);
                              if (missing.length === 0) return null;
                              const isEditing = editingMissing === profile.user_id;
                              const phoneForWA = profile.phone ? formatPhoneForWhatsApp(profile.phone) : "";
                              const requestMsg = buildMissingFieldsRequest(profile.full_name || "", missing);
                              return (
                                <div className="rounded-xl border-2 border-amber-300/60 dark:border-amber-700/40 bg-gradient-to-br from-amber-50/80 to-orange-50/40 dark:from-amber-950/20 dark:to-orange-950/10 p-3 sm:p-3.5 shadow-sm">
                                  <div className="flex items-start justify-between gap-3 mb-2.5">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-9 h-9 rounded-xl bg-amber-500/15 flex items-center justify-center shrink-0">
                                        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                                      </div>
                                      <div className="min-w-0">
                                        <p className="text-xs font-black text-foreground flex items-center gap-1.5 flex-wrap">
                                          حقول ناقصة في ملف العميل
                                          <span className="text-[10px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-400 px-1.5 py-0.5 rounded-md">{missing.length}</span>
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">حدّث البيانات يدوياً أو اطلبها من العميل مباشرة</p>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex flex-wrap gap-1.5 mb-3">
                                    {missing.map((m) => (
                                      <span key={m.key} className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-background/70 border border-amber-300/50 text-amber-800 dark:text-amber-300 flex items-center gap-1.5">
                                        <span>{m.icon}</span>{m.label}
                                      </span>
                                    ))}
                                  </div>
                                  {!isEditing ? (
                                    <div className="flex flex-wrap gap-2">
                                      <Button size="sm" onClick={(e) => { e.stopPropagation(); openMissingEditor(profile); }} className="h-8 text-[11px] font-bold gap-1.5 bg-primary hover:bg-primary/90">
                                        <FileText className="w-3.5 h-3.5" />تحديث يدوي الآن
                                      </Button>
                                      <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(requestMsg); toast({ title: "✅ تم نسخ نص الطلب" }); }} className="h-8 text-[11px] font-bold gap-1.5 border-amber-300/60">
                                        <Copy className="w-3.5 h-3.5" />نسخ نص الطلب
                                      </Button>
                                      {phoneForWA && (
                                        <a href={`https://wa.me/${phoneForWA}?text=${encodeURIComponent(requestMsg)}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[11px] font-bold bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 transition-colors">
                                          <MessageCircle className="w-3.5 h-3.5" />طلب البيانات واتساب
                                        </a>
                                      )}
                                      {profile.email && !profile.email.endsWith("@phone.almasria.local") && (
                                        <a href={`mailto:${profile.email}?subject=${encodeURIComponent("استكمال بيانات حسابك — المصرية جروب")}&body=${encodeURIComponent(requestMsg)}`} onClick={(e) => e.stopPropagation()} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md text-[11px] font-bold bg-blue-500/10 hover:bg-blue-500/20 text-blue-700 dark:text-blue-400 border border-blue-500/30 transition-colors">
                                          <Mail className="w-3.5 h-3.5" />إرسال بريد
                                        </a>
                                      )}
                                    </div>
                                  ) : (
                                    <div className="space-y-2 rounded-lg bg-background/70 border border-amber-300/50 p-3" onClick={(e) => e.stopPropagation()}>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {missing.some(m => m.key === "full_name") && (
                                          <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-muted-foreground">الاسم الكامل</label>
                                            <Input value={missingDraft.full_name || ""} onChange={(e) => setMissingDraft(d => ({ ...d, full_name: e.target.value }))} placeholder="اسم العميل" className="h-8 text-xs" />
                                          </div>
                                        )}
                                        {missing.some(m => m.key === "phone") && (
                                          <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-muted-foreground">رقم الموبايل</label>
                                            <Input value={missingDraft.phone || ""} onChange={(e) => setMissingDraft(d => ({ ...d, phone: e.target.value }))} placeholder="01xxxxxxxxx" maxLength={11} dir="ltr" inputMode="tel" className="h-8 text-xs" />
                                          </div>
                                        )}
                                        {missing.some(m => m.key === "email") && (
                                          <div className="space-y-1">
                                            <label className="text-[10px] font-bold text-muted-foreground">البريد الإلكتروني</label>
                                            <Input value={missingDraft.email || ""} onChange={(e) => setMissingDraft(d => ({ ...d, email: e.target.value }))} placeholder="example@email.com" dir="ltr" inputMode="email" className="h-8 text-xs" />
                                          </div>
                                        )}
                                        {missing.some(m => m.key === "car_model") && (
                                          <>
                                            <div className="space-y-1">
                                              <label className="text-[10px] font-bold text-muted-foreground">موديل السيارة</label>
                                              <Input value={missingDraft.car_model || ""} onChange={(e) => setMissingDraft(d => ({ ...d, car_model: e.target.value }))} placeholder="مثال: كورولا" className="h-8 text-xs" />
                                            </div>
                                            <div className="space-y-1">
                                              <label className="text-[10px] font-bold text-muted-foreground">سنة الصنع</label>
                                              <Input value={missingDraft.car_year || ""} onChange={(e) => setMissingDraft(d => ({ ...d, car_year: e.target.value }))} placeholder="2020" maxLength={4} dir="ltr" inputMode="numeric" className="h-8 text-xs" />
                                            </div>
                                          </>
                                        )}
                                      </div>
                                      <div className="flex gap-2 pt-1">
                                        <Button size="sm" onClick={() => saveMissingFields(profile.user_id)} disabled={savingMissing} className="h-8 text-[11px] font-bold gap-1.5">
                                          {savingMissing ? "جاري الحفظ..." : (<><CheckCircle2 className="w-3.5 h-3.5" />حفظ التحديثات</>)}
                                        </Button>
                                        <Button size="sm" variant="ghost" onClick={() => setEditingMissing(null)} disabled={savingMissing} className="h-8 text-[11px]">إلغاء</Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                              <div className="bg-muted/30 rounded-xl p-3 flex items-center gap-2.5"><div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Mail className="w-4 h-4 text-primary" /></div><div className="min-w-0"><p className="text-[10px] text-muted-foreground">البريد الإلكتروني</p><p className="text-xs font-semibold text-foreground truncate">{profile.email || "—"}</p></div></div>
                              <div className="bg-muted/30 rounded-xl p-3 flex items-center gap-2.5"><div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><Phone className="w-4 h-4 text-primary" /></div><div className="min-w-0"><p className="text-[10px] text-muted-foreground">الهاتف</p><p className="text-xs font-semibold text-foreground" dir="ltr">{profile.phone || "—"}</p></div></div>
                              <div className="bg-muted/30 rounded-xl p-3 flex items-center gap-2.5"><div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0"><CalendarIcon className="w-4 h-4 text-primary" /></div><div className="min-w-0"><p className="text-[10px] text-muted-foreground">تاريخ التسجيل</p><p className="text-xs font-semibold text-foreground">{format(new Date(profile.created_at), "dd/MM/yyyy", { locale: ar })}</p></div></div>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                              <div className="bg-emerald-50/70 dark:bg-emerald-950/20 rounded-xl p-3"><div className="flex items-center gap-2 mb-1"><ShoppingCart className="w-3.5 h-3.5 text-emerald-600" /><span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400">الطلبات</span></div>{orders ? (<><p className="text-lg font-black text-foreground">{orders.count}</p><p className="text-[10px] text-muted-foreground">إجمالي {orders.total.toLocaleString("ar-EG")} ج.م</p><p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium mt-0.5">آخر طلب: {format(new Date(orders.lastOrderDate), "dd/MM/yyyy")}</p></>) : (<p className="text-sm text-muted-foreground">لا توجد طلبات</p>)}</div>
                              <div className="bg-violet-50/70 dark:bg-violet-950/20 rounded-xl p-3"><div className="flex items-center gap-2 mb-1"><FileText className="w-3.5 h-3.5 text-violet-600" /><span className="text-[10px] font-bold text-violet-700 dark:text-violet-400">عروض الأسعار</span></div><p className="text-lg font-black text-foreground">{quotes}</p><p className="text-[10px] text-muted-foreground">{quotes > 0 ? "عرض سعر مقدم" : "لم يطلب عروض"}</p></div>
                              <div className="bg-cyan-50/70 dark:bg-cyan-950/20 rounded-xl p-3"><div className="flex items-center gap-2 mb-1"><Search className="w-3.5 h-3.5 text-cyan-600" /><span className="text-[10px] font-bold text-cyan-700 dark:text-cyan-400">عمليات البحث</span></div><p className="text-lg font-black text-foreground">{searches.reduce((s, x) => s + x.count, 0)}</p><p className="text-[10px] text-muted-foreground">{searches.length} كلمة فريدة</p></div>
                              <div className="bg-amber-50/70 dark:bg-amber-950/20 rounded-xl p-3"><div className="flex items-center gap-2 mb-1"><RefreshCw className="w-3.5 h-3.5 text-amber-600" /><span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">معدل العودة</span></div><p className="text-lg font-black text-foreground">{returnDays} يوم</p><p className="text-[10px] text-muted-foreground">{returnDays > 5 ? "عميل متكرر 🔥" : returnDays > 1 ? "عاد أكثر من مرة" : "زيارة واحدة"}</p></div>
                            </div>
                            {comms.length === 0 ? (
                              <div className="rounded-xl border border-dashed border-border/50 bg-muted/10 p-3 flex items-center justify-between"><div className="flex items-center gap-2 text-[11px] text-muted-foreground"><FileText className="w-3.5 h-3.5" />لا يوجد سجل تواصل سابق مع هذا العميل</div><span className="text-[10px] text-muted-foreground italic">سجّل مكالمتك من ملف العميل</span></div>
                            ) : (
                              <div className="rounded-xl border border-border/40 bg-card/50 overflow-hidden">
                                <div className="px-3 py-2 bg-muted/30 flex items-center justify-between"><div className="flex items-center gap-2"><FileText className="w-3.5 h-3.5 text-primary" /><span className="text-xs font-bold text-foreground">سجل التواصل</span><span className="text-[10px] font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded-md">{comms.length}</span></div><span className="text-[10px] text-muted-foreground">آخر تواصل منذ <strong className="text-foreground">{daysSince === 0 ? "اليوم" : `${daysSince} يوم`}</strong></span></div>
                                <div className="divide-y divide-border/30 max-h-48 overflow-y-auto">{comms.slice(0, 5).map(c => { const info = commLabel[c.comm_type] || { label: c.comm_type, color: "bg-muted text-foreground" }; return (<div key={c.id} className="px-3 py-2 flex items-start gap-2"><span className={cn("text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0", info.color)}>{info.label}</span><div className="min-w-0 flex-1">{c.note && (<p className="text-[11px] text-foreground/85 line-clamp-2">{c.note}</p>)}<p className="text-[10px] text-muted-foreground mt-0.5">{format(new Date(c.created_at), "dd/MM/yyyy hh:mm a", { locale: ar })}</p></div></div>); })}</div>
                              </div>
                            )}
                          </TabsContent>
                          <TabsContent value="needs" className="space-y-3 mt-4 focus-visible:outline-none">
                            {alerts.length > 0 ? (
                              <div className="flex flex-wrap gap-2 p-3 rounded-xl bg-gradient-to-l from-red-50/50 via-orange-50/30 to-transparent dark:from-red-950/20 dark:via-orange-950/10 border border-red-200/40 dark:border-red-900/30"><div className="flex items-center gap-1.5 text-[11px] font-bold text-red-700 dark:text-red-400 shrink-0 ml-1"><AlertTriangle className="w-3.5 h-3.5" />تنبيهات عاجلة:</div>{alerts.map((a, i) => (<span key={i} className={cn("text-[11px] font-bold px-2.5 py-1 rounded-lg border flex items-center gap-1", a.color)}><span>{a.icon}</span>{a.label}</span>))}</div>
                            ) : (
                              <div className="rounded-xl border border-dashed border-emerald-200/50 dark:border-emerald-900/30 bg-emerald-50/30 dark:bg-emerald-950/10 p-3 flex items-center gap-2 text-[11px] text-emerald-700 dark:text-emerald-400"><CheckCircle2 className="w-4 h-4" />لا توجد تنبيهات عاجلة لهذا العميل حالياً</div>
                            )}
                            {profile.phone && (
                              <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-3 flex items-center gap-2 text-[11px] text-foreground/80">
                                <Phone className="w-3.5 h-3.5 text-primary shrink-0" />
                                للاتصال أو إرسال السكريبت — افتح تبويب <strong className="text-foreground">"التواصل"</strong> الأول.
                              </div>
                            )}
                          </TabsContent>
                          <TabsContent value="prefs" className="space-y-3 mt-4 focus-visible:outline-none">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                              <div className="bg-muted/30 rounded-xl p-3 flex items-center gap-2.5"><div className="w-9 h-9 rounded-lg bg-violet-500/15 flex items-center justify-center shrink-0"><Car className="w-4 h-4 text-violet-600 dark:text-violet-400" /></div><div className="min-w-0"><p className="text-[10px] text-muted-foreground">سيارة العميل</p><p className="text-sm font-bold text-foreground">{profile.car_model ? `${profile.car_model}${profile.car_year ? ` (${profile.car_year})` : ""}` : "لم يحدد"}</p>{!profile.car_model && (<p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5">💡 اسأل العميل عن موديل سيارته</p>)}</div></div>
                              <div className="bg-muted/30 rounded-xl p-3 flex items-center gap-2.5"><div className="w-9 h-9 rounded-lg bg-cyan-500/15 flex items-center justify-center shrink-0"><ListOrdered className="w-4 h-4 text-cyan-600 dark:text-cyan-400" /></div><div className="min-w-0 flex-1"><p className="text-[10px] text-muted-foreground">قوائم التسوق</p><p className="text-sm font-bold text-foreground">{shoppingLists?.count || 0}</p>{shoppingLists && shoppingLists.names.length > 0 && (<div className="flex flex-wrap gap-1 mt-1">{shoppingLists.names.slice(0, 3).map((name, ni) => (<span key={ni} className="text-[9px] bg-cyan-100 dark:bg-cyan-900/30 text-cyan-700 dark:text-cyan-400 px-1.5 py-0.5 rounded">{name}</span>))}</div>)}</div></div>
                            </div>
                            {topBrands.length > 0 && (
                              <div className="rounded-xl border border-border/40 bg-card/50 p-3"><p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5"><Star className="w-3.5 h-3.5 text-amber-500" />الماركات المفضلة (حسب التصفح)</p><div className="flex flex-wrap gap-1.5">{topBrands.map(([brand, cnt]) => (<span key={brand} className="text-[11px] font-bold bg-primary/10 text-primary px-2.5 py-1 rounded-lg flex items-center gap-1.5">{brand}<span className="text-[9px] bg-primary/20 px-1.5 py-0.5 rounded-full">{cnt}</span></span>))}</div></div>
                            )}
                            {dealerUserIds?.has(profile.user_id) && (
                              <div className="rounded-xl border border-blue-200/40 dark:border-blue-900/30 bg-blue-50/40 dark:bg-blue-950/15 p-3"><p className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5"><Briefcase className="w-3.5 h-3.5" />حساب تاجر — راجع تفضيلاته من ملف التاجر</p></div>
                            )}
                          </TabsContent>
                          <TabsContent value="activity" className="space-y-3 mt-4 focus-visible:outline-none">
                            {searches.length > 0 && productsMap && (
                              <div><p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5"><Search className="w-3.5 h-3.5 text-primary" />تقرير الأصناف المبحوث عنها ({searches.length} صنف)</p>
                                <div className="overflow-x-auto rounded-xl border border-border/40"><table className="w-full text-xs"><thead><tr className="bg-muted/50 text-muted-foreground"><th className="px-3 py-2 text-right font-bold">كلمة البحث</th><th className="px-3 py-2 text-center font-bold">عدد المرات</th><th className="px-3 py-2 text-center font-bold">آخر بحث</th><th className="px-3 py-2 text-center font-bold">حالة الشراء</th></tr></thead><tbody>{searches.sort((a, b) => b.count - a.count).slice(0, 20).map((s, i) => { const queryLower = s.query.toLowerCase(); const matchedPurchased = purchasedProducts ? Object.values(productsMap).some((p: any) => purchasedProducts.has(p.id) && (p.name_ar?.toLowerCase().includes(queryLower) || p.sku?.toLowerCase().includes(queryLower))) : false; return (<tr key={i} className={cn("border-t border-border/30", i % 2 === 0 ? "bg-card" : "bg-muted/10")}><td className="px-3 py-2 font-medium text-foreground">{s.query}</td><td className="px-3 py-2 text-center"><Badge variant="secondary" className="text-[10px]">{s.count}×</Badge></td><td className="px-3 py-2 text-center text-muted-foreground">{format(new Date(s.lastAt), "dd/MM/yyyy", { locale: ar })}</td><td className="px-3 py-2 text-center">{matchedPurchased ? (<span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-2 py-0.5 rounded-md"><CheckCircle2 className="w-3 h-3" />تم الشراء ✓</span>) : (<span className="text-[10px] font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-md">لم يشترِ</span>)}</td></tr>); })}</tbody></table></div>
                              </div>
                            )}
                            {viewedProducts.length > 0 && productsMap && (
                              <div><p className="text-xs font-bold text-foreground mb-2 flex items-center gap-1.5"><Eye className="w-3.5 h-3.5 text-primary" />الأصناف المسعّرة ({viewedProducts.length} صنف)</p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">{viewedProducts.slice(0, 10).map((pid) => { const product = productsMap[pid]; if (!product) return null; const wasPurchased = purchasedProducts?.has(pid); return (<div key={pid} className={cn("flex items-center gap-2.5 rounded-xl p-2.5", wasPurchased ? "bg-emerald-50/60 dark:bg-emerald-950/15 border border-emerald-200/40" : "bg-muted/30")}><div className={cn("w-7 h-7 rounded-lg flex items-center justify-center shrink-0", wasPurchased ? "bg-emerald-500/15" : "bg-primary/10")}>{wasPurchased ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Package className="w-3.5 h-3.5 text-primary" />}</div><div className="min-w-0 flex-1"><p className="text-xs font-semibold text-foreground truncate">{product.name_ar}</p><p className="text-[10px] text-muted-foreground font-mono">{product.sku}</p></div>{wasPurchased && (<span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/30 px-1.5 py-0.5 rounded shrink-0">تم الشراء ✓</span>)}</div>); })}</div>
                              </div>
                            )}
                            {searches.length === 0 && viewedProducts.length === 0 && (<p className="text-sm text-muted-foreground text-center py-6">لا يوجد سجل تصفح لهذا العميل</p>)}
                          </TabsContent>
                        </Tabs>
                        </>
                      );
                    })()}
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
            </TabsContent>
          </Tabs>
        );
      })()}

      {/* ===== Analytics & Insights Section ===== */}
      <div className="relative pt-2">
        <div className="flex items-center gap-3 mb-3">
          <div className="h-px flex-1 bg-gradient-to-l from-border via-border to-transparent" />
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/40 border border-border/40">
            <BarChart3 className="w-3.5 h-3.5 text-primary" />
            <span className="text-[11px] font-black text-foreground">تحليلات وتقارير</span>
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-border via-border to-transparent" />
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

      {/* Note: "ملخص ذكي" was removed — same data is now available in:
          • "مهام اليوم" card above
          • "يحتاجون متابعة الآن" tab inside the customer list */}

      {/* === Analytics Section (Collapsed by default to shorten the page) === */}
      <Collapsible open={analyticsOpen} onOpenChange={setAnalyticsOpen} className="rounded-xl border border-border/40 bg-card/50 overflow-hidden">
        <CollapsibleTrigger className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/40 transition-colors group">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 to-cyan-500 flex items-center justify-center shadow-sm">
              <BarChart3 className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-sm font-black text-foreground">📊 التحليلات والإحصائيات</span>
            <Badge variant="secondary" className="text-[9px] h-5 font-bold">
              خرائط حرارية + توزيع + أعلى الباحثين
            </Badge>
          </div>
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", analyticsOpen && "rotate-180")} />
        </CollapsibleTrigger>
        <CollapsibleContent className="border-t border-border/40 p-4 space-y-4">

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

        </CollapsibleContent>
      </Collapsible>


      {/* Priority Weights Settings Dialog */}
      <Dialog open={weightsDialogOpen} onOpenChange={setWeightsDialogOpen}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-black">
              <Settings2 className="w-5 h-5 text-primary" />
              إعدادات أوزان الأولوية
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="text-[11px] text-muted-foreground bg-muted/40 rounded-lg p-2.5 leading-relaxed">
              تتحكم هذه الأوزان في كيفية ترتيب مهام اليوم. التغييرات <strong className="text-foreground">تُطبَّق فوراً</strong> وتُحفظ على هذا الجهاز.
              <br />
              المجموع المثالي = <strong className="text-foreground">100</strong> (المجموع الحالي: <strong className={cn(weightsTotal === 100 ? "text-emerald-600" : "text-amber-600")}>{weightsTotal}</strong>).
            </div>

            {/* Alerts weight */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-500" />
                  الإنذارات (سلة، بحث ساخن، حرج…)
                </label>
                <span className="text-xs font-black text-foreground tabular-nums">{priorityWeights.alerts}</span>
              </div>
              <Slider
                value={[priorityWeights.alerts]}
                onValueChange={([v]) => updatePriorityWeights({ ...priorityWeights, alerts: v })}
                min={0} max={100} step={5}
                className="w-full"
              />
            </div>

            {/* Recency weight */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  حداثة آخر نشاط (سلة/طلب/زيارة)
                </label>
                <span className="text-xs font-black text-foreground tabular-nums">{priorityWeights.recency}</span>
              </div>
              <Slider
                value={[priorityWeights.recency]}
                onValueChange={([v]) => updatePriorityWeights({ ...priorityWeights, recency: v })}
                min={0} max={100} step={5}
                className="w-full"
              />
            </div>

            {/* Buyability weight */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  إمكانية الشراء (سلة، بحث، تاجر، تاريخ…)
                </label>
                <span className="text-xs font-black text-foreground tabular-nums">{priorityWeights.buyability}</span>
              </div>
              <Slider
                value={[priorityWeights.buyability]}
                onValueChange={([v]) => updatePriorityWeights({ ...priorityWeights, buyability: v })}
                min={0} max={100} step={5}
                className="w-full"
              />
            </div>

            {/* Live preview bar */}
            <div className="rounded-lg border border-border/40 bg-background/60 p-2.5 space-y-1.5">
              <p className="text-[10px] font-bold text-muted-foreground">معاينة التوزيع النسبي</p>
              <div className="flex h-2 w-full rounded-full overflow-hidden bg-muted/40">
                {weightsTotal > 0 && (
                  <>
                    <div className="bg-red-500/80" style={{ width: `${(priorityWeights.alerts / weightsTotal) * 100}%` }} />
                    <div className="bg-amber-500/80" style={{ width: `${(priorityWeights.recency / weightsTotal) * 100}%` }} />
                    <div className="bg-emerald-500/80" style={{ width: `${(priorityWeights.buyability / weightsTotal) * 100}%` }} />
                  </>
                )}
              </div>
              <div className="flex items-center justify-between text-[9px] font-bold text-muted-foreground">
                <span>إنذارات {weightsTotal > 0 ? Math.round((priorityWeights.alerts / weightsTotal) * 100) : 0}%</span>
                <span>حداثة {weightsTotal > 0 ? Math.round((priorityWeights.recency / weightsTotal) * 100) : 0}%</span>
                <span>شراء {weightsTotal > 0 ? Math.round((priorityWeights.buyability / weightsTotal) * 100) : 0}%</span>
              </div>
            </div>

            {/* Quick presets */}
            <div className="space-y-1.5">
              <p className="text-[10px] font-bold text-muted-foreground">قوالب سريعة</p>
              <div className="grid grid-cols-3 gap-1.5">
                <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold" onClick={() => updatePriorityWeights({ alerts: 50, recency: 30, buyability: 20 })}>
                  🚨 إنذارات أولاً
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold" onClick={() => updatePriorityWeights({ alerts: 20, recency: 50, buyability: 30 })}>
                  ⏰ النشاط أولاً
                </Button>
                <Button variant="outline" size="sm" className="h-8 text-[10px] font-bold" onClick={() => updatePriorityWeights({ alerts: 25, recency: 25, buyability: 50 })}>
                  💰 شراء أولاً
                </Button>
              </div>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => updatePriorityWeights(DEFAULT_WEIGHTS)}
              className="gap-1.5"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              استعادة الافتراضي (30/40/30)
            </Button>
            <Button size="sm" onClick={() => setWeightsDialogOpen(false)}>
              تم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
