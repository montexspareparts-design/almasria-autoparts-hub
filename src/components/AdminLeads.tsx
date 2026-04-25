import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissionRequest } from "@/hooks/usePermissionRequest";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Phone, Store, User, Loader2, Trash2, Edit2, Check, X, Link2, UserPlus, Copy, Eye, EyeOff, MessageCircle, KeyRound, RotateCcw, History, CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import WhatsAppQuickChat from "@/components/admin/WhatsAppQuickChat";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const FILTERS_STORAGE_KEY = "admin_leads_filters_v1";

type LeadsFilters = {
  search: string;
  status: string;
  clientType: string;
  erp: "all" | "linked" | "unlinked";
  account: "all" | "with_account" | "without_account";
  attemptStatus: "all" | "success" | "failed" | "none";
  errorSearch: string;
};

const defaultFilters: LeadsFilters = {
  search: "",
  status: "all",
  clientType: "all",
  erp: "all",
  account: "all",
  attemptStatus: "all",
  errorSearch: "",
};

type LeadAttemptInfo = {
  attempt_type: "create" | "reset_password" | string;
  status: "success" | "failure" | string;
  error_message: string | null;
  created_at: string;
};

const loadStoredFilters = (): LeadsFilters => {
  if (typeof window === "undefined") return defaultFilters;
  try {
    const raw = window.localStorage.getItem(FILTERS_STORAGE_KEY);
    if (!raw) return defaultFilters;
    const parsed = JSON.parse(raw);
    return { ...defaultFilters, ...parsed } as LeadsFilters;
  } catch {
    return defaultFilters;
  }
};

interface Lead {
  id: string;
  name: string;
  phone: string;
  shop_name: string | null;
  notes: string | null;
  status: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  erp_customer_code: string | null;
  client_type: string;
}

interface LeadCredentials {
  username: string;
  password: string;
}

interface ERPCustomer {
  code: string;
  name: string;
}

type EdgeFunctionErrorLike = {
  message?: string;
  context?: {
    json?: () => Promise<any>;
    text?: () => Promise<string>;
  };
};

const statusLabels: Record<string, string> = {
  new: "جديد",
  contacted: "تم التواصل",
  converted: "تم التحويل لتاجر",
  rejected: "مرفوض",
};

const statusColors: Record<string, string> = {
  new: "bg-blue-500/15 text-blue-700",
  contacted: "bg-amber-500/15 text-amber-700",
  converted: "bg-emerald-500/15 text-emerald-700",
  rejected: "bg-red-500/15 text-red-700",
};

const clientTypeLabels: Record<string, string> = {
  retail: "قطاعي",
  corporate: "شركات وهيئات",
  wholesale: "جملة",
  workshop: "مركز صيانة / ورشة",
};

// Pricing tier mapping for display + conversion
const clientTypeTier: Record<string, "retail" | "wholesale_tier1"> = {
  retail: "retail",
  corporate: "retail",
  wholesale: "wholesale_tier1",
  workshop: "wholesale_tier1",
};

const AdminLeads = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState<LeadsFilters>(() => loadStoredFilters());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [registering, setRegistering] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", phone: "", shop_name: "", notes: "", erp_customer_code: "", client_type: "retail" });

  // ERP customers
  const [erpCustomers, setErpCustomers] = useState<ERPCustomer[]>([]);
  const [erpSearch, setErpSearch] = useState("");
  const [loadingErp, setLoadingErp] = useState(false);
  const [showErpDropdown, setShowErpDropdown] = useState(false);
  const [erpVerified, setErpVerified] = useState(false);

  // Credentials dialog
  const [credentials, setCredentials] = useState<{ username: string; password: string; phone: string } | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  // Cached credentials per erp_customer_code for table display
  const [leadCredentials, setLeadCredentials] = useState<Record<string, LeadCredentials>>({});
  const [showTablePasswords, setShowTablePasswords] = useState<Record<string, boolean>>({});

  // Latest account-creation/reset attempt per lead (for status & error filtering)
  const [leadAttempts, setLeadAttempts] = useState<Record<string, LeadAttemptInfo>>({});

  // Last attempt details dialog
  type AttemptDetail = LeadAttemptInfo & { lead: Lead };
  const [attemptDetail, setAttemptDetail] = useState<AttemptDetail | null>(null);

  // Pre-flight check dialog
  type PreflightState =
    | { kind: "no_erp"; lead: Lead }
    | { kind: "no_account"; lead: Lead }
    | { kind: "has_password"; lead: Lead; password: string }
    | { kind: "no_password"; lead: Lead };
  const [preflight, setPreflight] = useState<PreflightState | null>(null);
  const [preflightChecking, setPreflightChecking] = useState<string | null>(null);

  // Auto-create confirmation (when reset_password discovers no account exists yet)
  type AutoCreateConfirm = {
    lead: Lead;
    reason: "no_dealer_account" | "user_not_found";
  };
  const [autoCreateConfirm, setAutoCreateConfirm] = useState<AutoCreateConfirm | null>(null);
  const autoCreateResolverRef = useRef<((v: boolean) => void) | null>(null);

  const requestAutoCreateConfirmation = (lead: Lead, reason: AutoCreateConfirm["reason"]) =>
    new Promise<boolean>((resolve) => {
      autoCreateResolverRef.current = resolve;
      setAutoCreateConfirm({ lead, reason });
    });

  const resolveAutoCreateConfirm = (confirmed: boolean) => {
    autoCreateResolverRef.current?.(confirmed);
    autoCreateResolverRef.current = null;
    setAutoCreateConfirm(null);
  };

  // Pre-flight check before any Edge Function call
  const runPreflight = async (lead: Lead) => {
    setPreflightChecking(lead.id);
    try {
      if (!lead.erp_customer_code) {
        setPreflight({ kind: "no_erp", lead });
        return;
      }
      const { data: account } = await supabase
        .from("dealer_accounts")
        .select("id")
        .eq("erp_customer_code", lead.erp_customer_code)
        .maybeSingle();
      if (!account) {
        setPreflight({ kind: "no_account", lead });
        return;
      }
      const { data: pw } = await supabase
        .from("dealer_passwords" as any)
        .select("initial_password")
        .eq("dealer_account_id", (account as any).id)
        .maybeSingle();
      const stored = (pw as any)?.initial_password as string | undefined;
      if (stored) {
        setPreflight({ kind: "has_password", lead, password: stored });
      } else {
        setPreflight({ kind: "no_password", lead });
      }
    } catch (e: any) {
      toast({ title: "خطأ", description: e?.message || "فشل الفحص", variant: "destructive" });
    } finally {
      setPreflightChecking(null);
    }
  };

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const leadsList = data as Lead[];
      setLeads(leadsList);
      fetchLeadCredentials(leadsList);
      fetchLeadAttempts(leadsList);
    }
    setLoading(false);
  };

  // Fetch the latest account-creation/reset attempt per lead
  const fetchLeadAttempts = useCallback(async (leadsList: Lead[]) => {
    if (leadsList.length === 0) return;
    const ids = leadsList.map(l => l.id);
    const { data } = await supabase
      .from("client_account_attempts" as any)
      .select("lead_id, attempt_type, status, error_message, created_at")
      .in("lead_id", ids)
      .order("created_at", { ascending: false });
    if (!data) return;
    const map: Record<string, LeadAttemptInfo> = {};
    for (const row of data as any[]) {
      const lid = row.lead_id as string;
      if (lid && !map[lid]) {
        map[lid] = {
          attempt_type: row.attempt_type,
          status: row.status,
          error_message: row.error_message ?? null,
          created_at: row.created_at,
        };
      }
    }
    setLeadAttempts(map);
  }, []);

  // Fetch credentials for converted leads
  const fetchLeadCredentials = useCallback(async (leadsList: Lead[]) => {
    const convertedLeads = leadsList.filter(l => l.status === "converted" && l.erp_customer_code);
    if (convertedLeads.length === 0) return;
    
    const erpCodes = convertedLeads.map(l => l.erp_customer_code!);
    // Get dealer account IDs by ERP codes
    const { data: accounts } = await supabase
      .from("dealer_accounts")
      .select("id, erp_customer_code")
      .in("erp_customer_code", erpCodes);
    
    const creds: Record<string, LeadCredentials> = {};
    if (accounts && accounts.length > 0) {
      const accountIds = accounts.map(a => a.id);
      const { data: passwords } = await supabase
        .from("dealer_passwords" as any)
        .select("dealer_account_id, initial_password")
        .in("dealer_account_id", accountIds);

      for (const lead of convertedLeads) {
        const account = accounts.find(a => a.erp_customer_code === lead.erp_customer_code);
        if (!account) continue; // no dealer account → skip (no creds row)
        const pw = (passwords as any[])?.find((p: any) => p.dealer_account_id === account?.id);
        const cleanPhone = lead.phone.replace(/\D/g, "");
        if (pw?.initial_password) {
          creds[lead.id] = { username: cleanPhone, password: pw.initial_password };
        }
        // If no stored password → leave undefined so UI shows "عرض/إنشاء" button
      }
    }
    setLeadCredentials(creds);
  }, []);

  useEffect(() => { 
    fetchLeads();
  }, []);

  // Persist filters across sessions
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters));
    } catch {
      // ignore quota errors
    }
  }, [filters]);

  const updateFilter = <K extends keyof LeadsFilters>(key: K, value: LeadsFilters[K]) => {
    setFilters(f => ({ ...f, [key]: value }));
  };

  const resetFilters = () => setFilters(defaultFilters);
  const hasActiveFilters =
    filters.search.trim() !== "" ||
    filters.status !== "all" ||
    filters.clientType !== "all" ||
    filters.erp !== "all" ||
    filters.account !== "all" ||
    filters.attemptStatus !== "all" ||
    filters.errorSearch.trim() !== "";

  const fetchErpCustomers = useCallback(async () => {
    if (erpCustomers.length > 0) return;
    setLoadingErp(true);
    try {
      const { data } = await supabase.functions.invoke("erp-sync-outbound", {
        body: { action: "fetch_erp_customers" },
      });
      if (data?.customers && Array.isArray(data.customers)) {
        setErpCustomers(data.customers.map((c: any) => ({
          code: c.id || "",
          name: c.name || "",
        })).filter((c: ERPCustomer) => c.code));
      }
    } catch (err) {
      console.error("[ERP] Failed to fetch customers:", err);
    }
    setLoadingErp(false);
  }, [erpCustomers.length]);

  const filteredErpCustomers = erpCustomers.filter(c =>
    c.name.toLowerCase().includes(erpSearch.toLowerCase()) ||
    c.code.toLowerCase().includes(erpSearch.toLowerCase())
  ).slice(0, 15);

  const validatePhone = (phone: string) => /^01[0125]\d{8}$/.test(phone);

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      toast({ title: "خطأ", description: "يرجى إدخال اسم العميل", variant: "destructive" });
      return;
    }
    if (!validatePhone(form.phone)) {
      toast({ title: "خطأ", description: "رقم الهاتف غير صحيح (يجب أن يبدأ بـ 01 ويتكون من 11 رقم)", variant: "destructive" });
      return;
    }
    if (!form.erp_customer_code.trim() || !erpVerified) {
      toast({ title: "خطأ", description: "يجب اختيار كود العميل من نظام الفيصل", variant: "destructive" });
      return;
    }

    setSaving(true);

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      shop_name: form.shop_name.trim() || null,
      notes: form.notes.trim() || null,
      erp_customer_code: form.erp_customer_code.trim(),
      client_type: form.client_type,
    };

    if (editingId) {
      const { error } = await supabase
        .from("leads")
        .update(payload)
        .eq("id", editingId);

      if (error) {
        toast({ title: "خطأ", description: "فشل تحديث البيانات", variant: "destructive" });
      } else {
        toast({ title: "تم التحديث", description: "تم تحديث بيانات العميل بنجاح" });
        resetForm();
        fetchLeads();
      }
    } else {
      const { error } = await supabase
        .from("leads")
        .insert({ ...payload, created_by: user!.id });

      if (error) {
        toast({ title: "خطأ", description: "فشل حفظ البيانات", variant: "destructive" });
      } else {
        toast({ title: "تم الحفظ", description: "تم إضافة العميل بنجاح" });
        resetForm();
        fetchLeads();
      }
    }
    setSaving(false);
  };

  const resetForm = () => {
    setForm({ name: "", phone: "", shop_name: "", notes: "", erp_customer_code: "", client_type: "retail" });
    setShowForm(false);
    setEditingId(null);
    setErpSearch("");
    setShowErpDropdown(false);
    setErpVerified(false);
  };

  const startEdit = (lead: Lead) => {
    setForm({
      name: lead.name,
      phone: lead.phone,
      shop_name: lead.shop_name || "",
      notes: lead.notes || "",
      erp_customer_code: lead.erp_customer_code || "",
      client_type: lead.client_type || "retail",
    });
    setErpVerified(!!lead.erp_customer_code);
    setErpSearch(lead.erp_customer_code || "");
    setEditingId(lead.id);
    setShowForm(true);
  };

  const updateStatus = async (id: string, status: string) => {
    const { error } = await supabase.from("leads").update({ status }).eq("id", id);
    if (!error) {
      toast({ title: "تم التحديث" });
      fetchLeads();
    }
  };

  const deleteLead = async (id: string) => {
    const { error } = await supabase.from("leads").delete().eq("id", id);
    if (!error) {
      toast({ title: "تم الحذف" });
      fetchLeads();
    }
  };

  const selectErpCustomer = (customer: ERPCustomer) => {
    setForm(f => ({ ...f, erp_customer_code: customer.code }));
    setErpSearch(customer.code + " — " + customer.name);
    setShowErpDropdown(false);
    setErpVerified(true);
  };

  const getErpName = (code: string | null) => {
    if (!code) return null;
    const found = erpCustomers.find(c => c.code === code);
    return found?.name || null;
  };

  const extractFunctionErrorMessage = async (error: EdgeFunctionErrorLike | null, data?: any) => {
    if (typeof data?.error === "string" && data.error.trim()) return data.error;

    const response = error?.context;
    if (response?.json) {
      try {
        const payload = await response.json();
        if (typeof payload?.error === "string" && payload.error.trim()) return payload.error;
      } catch {
        // ignore invalid json body
      }
    }

    if (response?.text) {
      try {
        const raw = await response.text();
        if (raw) {
          try {
            const parsed = JSON.parse(raw);
            if (typeof parsed?.error === "string" && parsed.error.trim()) return parsed.error;
          } catch {
            return raw;
          }
        }
      } catch {
        // ignore unreadable body
      }
    }

    return error?.message || null;
  };

  const getLeadDealerAccount = async (erpCustomerCode: string | null) => {
    if (!erpCustomerCode) return null;

    const { data } = await supabase
      .from("dealer_accounts")
      .select("id, user_id")
      .eq("erp_customer_code", erpCustomerCode)
      .maybeSingle();

    return data;
  };

  // Log every create/reset attempt for audit trail
  const logAttempt = async (params: {
    type: "create" | "reset_password";
    status: "success" | "failure";
    lead: Lead;
    errorMessage?: string | null;
    details?: Record<string, unknown>;
  }) => {
    try {
      await supabase.from("client_account_attempts" as any).insert({
        attempted_by: user?.id,
        attempt_type: params.type,
        status: params.status,
        lead_id: params.lead.id,
        phone: params.lead.phone,
        erp_customer_code: params.lead.erp_customer_code,
        client_name: params.lead.name,
        error_message: params.errorMessage || null,
        details: params.details || {},
      });
    } catch (e) {
      console.error("Failed to log attempt:", e);
    }
  };

  // Register client as a user account
  const registerClient = async (lead: Lead) => {
    if (!lead.erp_customer_code) {
      toast({ title: "خطأ", description: "يجب ربط العميل بكود الفيصل أولاً", variant: "destructive" });
      return;
    }
    setRegistering(lead.id);
    try {
      const { data, error } = await supabase.functions.invoke("create-client-account", {
        body: {
          name: lead.name,
          phone: lead.phone,
          shop_name: lead.shop_name,
          erp_customer_code: lead.erp_customer_code,
          client_type: lead.client_type || "retail",
          lead_id: lead.id,
        },
      });

      const serverMsg = await extractFunctionErrorMessage(error as EdgeFunctionErrorLike | null, data);

      if (error || data?.error) {
        toast({
          title: "خطأ",
          description: serverMsg || "فشل إنشاء الحساب",
          variant: "destructive",
        });
        await logAttempt({ type: "create", status: "failure", lead, errorMessage: serverMsg || "فشل إنشاء الحساب" });
      } else if (data?.success) {
        setCredentials({ username: data.username, password: data.password, phone: lead.phone });
        setLeadCredentials(prev => ({ ...prev, [lead.id]: { username: lead.phone.replace(/\D/g, ""), password: data.password } }));
        toast({ title: "تم التسجيل", description: "تم إنشاء حساب العميل بنجاح" });
        await logAttempt({ type: "create", status: "success", lead, details: { user_id: data.user_id, tier: data.tier } });
        fetchLeads();
      }
    } catch (err: any) {
      toast({ title: "خطأ", description: "حدث خطأ غير متوقع", variant: "destructive" });
      await logAttempt({ type: "create", status: "failure", lead, errorMessage: err?.message || "Unexpected error" });
    }
    setRegistering(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "✅ تم النسخ بنجاح",
      description: "البيانات محفوظة دائماً ويمكنك استرجاعها في أي وقت من نفس الصفحة.",
    });
  };

  // View stored credentials for a converted lead
  const viewCredentials = async (lead: Lead) => {
    const { data: account } = await supabase
      .from("dealer_accounts")
      .select("id")
      .eq("erp_customer_code", lead.erp_customer_code)
      .maybeSingle();
    
    if (account) {
      const { data: pw } = await supabase
        .from("dealer_passwords" as any)
        .select("initial_password")
        .eq("dealer_account_id", account.id)
        .maybeSingle();
      
      if ((pw as any)?.initial_password) {
        setCredentials({ username: lead.phone, password: (pw as any).initial_password, phone: lead.phone });
      } else {
        toast({ title: "تنبيه", description: "كلمة المرور غير محفوظة. استخدم إعادة التعيين.", variant: "destructive" });
      }
    } else {
      toast({ title: "تنبيه", description: "حساب التاجر غير موجود", variant: "destructive" });
    }
  };

  // Reset password for a converted lead
  const resetPassword = async (lead: Lead) => {
    setRegistering(lead.id);
    try {
      const dealerAccount = await getLeadDealerAccount(lead.erp_customer_code);
      if (!dealerAccount) {
        setRegistering(null);
        const ok = await requestAutoCreateConfirmation(lead, "no_dealer_account");
        if (!ok) return;
        await registerClient(lead);
        return;
      }

      const cleanPhone = lead.phone.replace(/\D/g, "");
      const email = `${cleanPhone}@phone.almasria.local`;
      const newPassword = Array.from(crypto.getRandomValues(new Uint8Array(6)))
        .map(b => b.toString(36).padStart(2, "0"))
        .join("")
        .slice(0, 8);

      const { data, error } = await supabase.functions.invoke("create-client-account", {
        body: { action: "reset_password", email, new_password: newPassword, erp_customer_code: lead.erp_customer_code },
      });

      // Edge function returned non-2xx — try to extract server-side message
      if (error || (data && (data as any).error)) {
        const serverMsg = await extractFunctionErrorMessage(error as EdgeFunctionErrorLike | null, data);
        // If user truly doesn't exist → confirm before creating
        if (typeof serverMsg === "string" && serverMsg.includes("غير موجود")) {
          setRegistering(null);
          const ok = await requestAutoCreateConfirmation(lead, "user_not_found");
          if (!ok) return;
          // Re-trigger the full registration flow which creates user + dealer account + sends WhatsApp
          await registerClient(lead);
          return;
        }
        toast({
          title: "خطأ",
          description: serverMsg || "فشل إعادة تعيين كلمة المرور",
          variant: "destructive",
        });
        await logAttempt({ type: "reset_password", status: "failure", lead, errorMessage: serverMsg || "فشل إعادة تعيين كلمة المرور" });
      } else {
        setCredentials({ username: lead.phone, password: newPassword, phone: lead.phone });
        setLeadCredentials(prev => ({ ...prev, [lead.id]: { username: cleanPhone, password: newPassword } }));
        toast({ title: "تم", description: "تم إعادة تعيين كلمة المرور بنجاح وحفظها بشكل دائم" });
        await logAttempt({ type: "reset_password", status: "success", lead });
      }
    } catch (e: any) {
      console.error("resetPassword error:", e);
      toast({ title: "خطأ", description: e?.message || "حدث خطأ غير متوقع", variant: "destructive" });
      await logAttempt({ type: "reset_password", status: "failure", lead, errorMessage: e?.message || "Unexpected error" });
    }
    setRegistering(null);
  };

  const filtered = leads.filter(l => {
    const q = filters.search.trim().toLowerCase();
    if (q) {
      const haystack = [
        l.name,
        l.phone,
        l.shop_name || "",
        l.erp_customer_code || "",
      ].join(" ").toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    if (filters.status !== "all" && l.status !== filters.status) return false;
    if (filters.clientType !== "all" && (l.client_type || "retail") !== filters.clientType) return false;
    if (filters.erp === "linked" && !l.erp_customer_code) return false;
    if (filters.erp === "unlinked" && l.erp_customer_code) return false;
    if (filters.account !== "all") {
      const hasAccount = !!leadCredentials[l.id];
      if (filters.account === "with_account" && !hasAccount) return false;
      if (filters.account === "without_account" && hasAccount) return false;
    }

    // Latest attempt status filter
    const lastAttempt = leadAttempts[l.id];
    if (filters.attemptStatus !== "all") {
      if (filters.attemptStatus === "none" && lastAttempt) return false;
      if (filters.attemptStatus === "success" && lastAttempt?.status !== "success") return false;
      if (filters.attemptStatus === "failed" && lastAttempt?.status !== "failure") return false;
    }

    // Last error message free-text search
    const eq = filters.errorSearch.trim().toLowerCase();
    if (eq) {
      const err = (lastAttempt?.error_message || "").toLowerCase();
      if (!err.includes(eq)) return false;
    }

    return true;
  });

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">إدخال بيانات العملاء</h2>
          <p className="text-sm text-muted-foreground">إدارة العملاء المحتملين وربطهم بنظام الفيصل وتسجيلهم</p>
        </div>
        <Button onClick={() => { resetForm(); setShowForm(!showForm); }} size="sm" className="gap-1.5">
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          {showForm ? "إلغاء" : "إضافة عميل"}
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{editingId ? "تعديل بيانات العميل" : "إضافة عميل جديد"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium">الاسم *</label>
                <div className="relative">
                  <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={form.name}
                    onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                    placeholder="اسم العميل"
                    className="pr-9"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">رقم الهاتف *</label>
                <div className="relative">
                  <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={form.phone}
                    onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                    placeholder="01xxxxxxxxx"
                    className="pr-9"
                    dir="ltr"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-medium">اسم المحل</label>
                <div className="relative">
                  <Store className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={form.shop_name}
                    onChange={e => setForm(f => ({ ...f, shop_name: e.target.value }))}
                    placeholder="اسم المحل أو الورشة"
                    className="pr-9"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Client Type */}
              <div className="space-y-1.5">
                <label className="text-sm font-medium">نوع العميل *</label>
                <Select value={form.client_type} onValueChange={v => setForm(f => ({ ...f, client_type: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="retail">قطاعي</SelectItem>
                    <SelectItem value="corporate">شركات وهيئات</SelectItem>
                    <SelectItem value="wholesale">جملة</SelectItem>
                    <SelectItem value="workshop">مركز صيانة / ورشة</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  💰 التسعير: <span className="font-semibold">{clientTypeTier[form.client_type] === "wholesale_tier1" ? "جملة" : "قطاعي"}</span>
                </p>
              </div>

              {/* ERP Customer Code - MANDATORY */}
              <div className="space-y-1.5 relative">
                <label className="text-sm font-medium">
                  كود الفيصل (ERP) *
                  {erpVerified && <Check className="inline w-4 h-4 text-emerald-600 mr-1" />}
                </label>
                <div className="relative">
                  <Link2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    value={erpSearch || form.erp_customer_code}
                    onChange={e => {
                      setErpSearch(e.target.value);
                      setForm(f => ({ ...f, erp_customer_code: "" }));
                      setErpVerified(false);
                      if (!showErpDropdown) {
                        setShowErpDropdown(true);
                        fetchErpCustomers();
                      }
                    }}
                    onFocus={() => {
                      setShowErpDropdown(true);
                      fetchErpCustomers();
                    }}
                    placeholder="ابحث بالكود أو الاسم..."
                    className={`pr-9 ${erpVerified ? "border-emerald-500 ring-1 ring-emerald-500/20" : ""}`}
                    dir="ltr"
                  />
                  {form.erp_customer_code && (
                    <button
                      type="button"
                      className="absolute left-2 top-1/2 -translate-y-1/2"
                      onClick={() => {
                        setForm(f => ({ ...f, erp_customer_code: "" }));
                        setErpSearch("");
                        setErpVerified(false);
                      }}
                    >
                      <X className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                    </button>
                  )}
                </div>
                {!erpVerified && form.erp_customer_code === "" && (
                  <p className="text-[11px] text-amber-600">يجب اختيار كود العميل من القائمة للتحقق</p>
                )}
                {showErpDropdown && (
                  <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {loadingErp ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="w-4 h-4 animate-spin text-primary" />
                        <span className="mr-2 text-sm text-muted-foreground">جاري تحميل عملاء الفيصل...</span>
                      </div>
                    ) : filteredErpCustomers.length === 0 ? (
                      <div className="px-3 py-2 text-sm text-muted-foreground">
                        {erpSearch ? "لا توجد نتائج — تأكد من الكود" : "اكتب للبحث..."}
                      </div>
                    ) : (
                      filteredErpCustomers.map(c => (
                        <button
                          key={c.code}
                          type="button"
                          className="w-full text-right px-3 py-2 hover:bg-accent/50 transition-colors text-sm flex justify-between items-center gap-2"
                          onClick={() => selectErpCustomer(c)}
                        >
                          <span className="truncate">{c.name}</span>
                          <span className="font-mono text-xs text-muted-foreground shrink-0" dir="ltr">{c.code}</span>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium">ملاحظات</label>
              <Textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                placeholder="أي ملاحظات عن العميل..."
                rows={2}
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" size="sm" onClick={resetForm}>إلغاء</Button>
              <Button size="sm" onClick={handleSubmit} disabled={saving || !erpVerified} className="gap-1.5">
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                {editingId ? "تحديث" : "حفظ"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search & Filters */}
      <Card>
        <CardContent className="p-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
            <div className="relative lg:col-span-2">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={filters.search}
                onChange={e => updateFilter("search", e.target.value)}
                placeholder="بحث بالاسم أو الهاتف أو كود الفيصل أو المحل..."
                className="pr-9 h-9"
              />
              {filters.search && (
                <button
                  type="button"
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-destructive"
                  onClick={() => updateFilter("search", "")}
                  title="مسح البحث"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <Select value={filters.status} onValueChange={v => updateFilter("status", v)}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="الحالة" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحالات</SelectItem>
                {Object.entries(statusLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.clientType} onValueChange={v => updateFilter("clientType", v)}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="النوع" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأنواع</SelectItem>
                {Object.entries(clientTypeLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filters.erp} onValueChange={v => updateFilter("erp", v as LeadsFilters["erp"])}>
              <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="كود الفيصل" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل (الفيصل)</SelectItem>
                <SelectItem value="linked">مربوط بالفيصل</SelectItem>
                <SelectItem value="unlinked">غير مربوط</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Select value={filters.account} onValueChange={v => updateFilter("account", v as LeadsFilters["account"])}>
              <SelectTrigger className="h-9 text-xs w-[180px]"><SelectValue placeholder="حالة الحساب" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الحسابات</SelectItem>
                <SelectItem value="with_account">له حساب مفعل</SelectItem>
                <SelectItem value="without_account">بدون حساب بعد</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filters.attemptStatus}
              onValueChange={v => updateFilter("attemptStatus", v as LeadsFilters["attemptStatus"])}
            >
              <SelectTrigger className="h-9 text-xs w-[200px]">
                <SelectValue placeholder="حالة آخر محاولة" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل المحاولات</SelectItem>
                <SelectItem value="success">آخر محاولة: نجاح ✅</SelectItem>
                <SelectItem value="failed">آخر محاولة: فشل ❌</SelectItem>
                <SelectItem value="none">لا توجد محاولات</SelectItem>
              </SelectContent>
            </Select>
            <div className="relative w-[260px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
              <Input
                value={filters.errorSearch}
                onChange={e => updateFilter("errorSearch", e.target.value)}
                placeholder="بحث في رسالة آخر خطأ..."
                className="pr-8 h-9 text-xs"
              />
              {filters.errorSearch && (
                <button
                  type="button"
                  onClick={() => updateFilter("errorSearch", "")}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="مسح بحث الخطأ"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              عرض <span className="font-semibold text-foreground">{filtered.length}</span> من {leads.length}
            </span>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="h-8 gap-1 text-xs ml-auto">
                <X className="w-3.5 h-3.5" />
                مسح الفلاتر
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {hasActiveFilters ? "لا توجد نتائج تطابق الفلاتر الحالية" : "لا يوجد عملاء حتى الآن — ابدأ بإضافة أول عميل"}
        </div>
      ) : (
        <div className="rounded-xl border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground text-right">
                  <th className="px-4 py-3 font-medium">الاسم</th>
                  <th className="px-4 py-3 font-medium">الهاتف</th>
                  <th className="px-4 py-3 font-medium">المحل</th>
                  <th className="px-4 py-3 font-medium">النوع</th>
                  <th className="px-4 py-3 font-medium">كود الفيصل</th>
                  <th className="px-4 py-3 font-medium">اسم المستخدم</th>
                  <th className="px-4 py-3 font-medium">كلمة المرور</th>
                  <th className="px-4 py-3 font-medium">الحالة</th>
                  <th className="px-4 py-3 font-medium">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(lead => (
                  <tr key={lead.id} className="border-t hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{lead.name}</td>
                    <td className="px-4 py-3 font-mono text-xs" dir="ltr">{lead.phone}</td>
                    <td className="px-4 py-3">{lead.shop_name || "—"}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px]">
                        {clientTypeLabels[lead.client_type] || lead.client_type}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      {lead.erp_customer_code ? (
                        <div>
                          <span className="font-mono text-xs" dir="ltr">{lead.erp_customer_code}</span>
                          {getErpName(lead.erp_customer_code) && (
                            <div className="text-[10px] text-muted-foreground">{getErpName(lead.erp_customer_code)}</div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">غير مربوط</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {lead.status === "converted" && lead.erp_customer_code ? (
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs" dir="ltr">{lead.phone.replace(/\D/g, "")}</span>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(lead.phone.replace(/\D/g, ""))}>
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {leadCredentials[lead.id] ? (
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs" dir="ltr">
                            {showTablePasswords[lead.id] ? leadCredentials[lead.id].password : "••••••"}
                          </span>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setShowTablePasswords(p => ({ ...p, [lead.id]: !p[lead.id] }))}>
                            {showTablePasswords[lead.id] ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(leadCredentials[lead.id].password)}>
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : lead.status === "converted" && lead.erp_customer_code ? (
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-7 text-[11px] gap-1 px-2"
                          onClick={() => runPreflight(lead)}
                          disabled={preflightChecking === lead.id || registering === lead.id}
                          title="فحص الحساب وكلمة المرور قبل أي إجراء"
                        >
                          {preflightChecking === lead.id || registering === lead.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <KeyRound className="w-3 h-3" />
                          )}
                          عرض/إنشاء
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Select value={lead.status} onValueChange={v => updateStatus(lead.id, v)}>
                        <SelectTrigger className="h-7 text-xs w-[130px]">
                          <Badge className={`${statusColors[lead.status]} text-[10px] border-0`}>
                            {statusLabels[lead.status] || lead.status}
                          </Badge>
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusLabels).map(([k, v]) => (
                            <SelectItem key={k} value={k}>{v}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {/* Register button - only for non-converted leads with ERP code */}
                        {lead.status !== "converted" && lead.erp_customer_code && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-emerald-600 hover:text-emerald-700"
                            onClick={() => registerClient(lead)}
                            disabled={registering === lead.id}
                            title="تسجيل كتاجر"
                          >
                            {registering === lead.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <UserPlus className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        )}
                        {/* View credentials & reset password - for converted leads */}
                        {lead.status === "converted" && lead.erp_customer_code && (
                          <>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-blue-600 hover:text-blue-700"
                              onClick={() => viewCredentials(lead)}
                              title="عرض بيانات الدخول"
                            >
                              <KeyRound className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-amber-600 hover:text-amber-700"
                              onClick={() => resetPassword(lead)}
                              disabled={registering === lead.id}
                              title="إعادة تعيين كلمة المرور"
                            >
                              {registering === lead.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <RotateCcw className="w-3.5 h-3.5" />
                              )}
                            </Button>
                          </>
                        )}
                        {lead.phone && (
                          <WhatsAppQuickChat
                            phone={lead.phone}
                            customerName={lead.name}
                            context={lead.shop_name ? `بخصوص محل "${lead.shop_name}"` : undefined}
                          />
                        )}
                        {leadAttempts[lead.id] && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className={`h-7 w-7 ${leadAttempts[lead.id].status === "failure" ? "text-destructive hover:text-destructive" : "text-emerald-600 hover:text-emerald-700"}`}
                            onClick={() => setAttemptDetail({ ...leadAttempts[lead.id], lead })}
                            title="تفاصيل آخر محاولة"
                          >
                            <History className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(lead)}>
                          <Edit2 className="w-3.5 h-3.5" />
                        </Button>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive">
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>حذف العميل</AlertDialogTitle>
                              <AlertDialogDescription>هل أنت متأكد من حذف "{lead.name}"؟</AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>إلغاء</AlertDialogCancel>
                              <AlertDialogAction onClick={() => deleteLead(lead.id)}>حذف</AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pre-flight Check Dialog — shown BEFORE calling any Edge Function */}
      <Dialog open={!!preflight} onOpenChange={(o) => { if (!o) setPreflight(null); }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-4 h-4 text-primary" />
              فحص حساب العميل
            </DialogTitle>
          </DialogHeader>
          {preflight && (
            <div className="space-y-3 text-sm">
              <div className="rounded-md border bg-muted/30 p-3 space-y-1">
                <div><span className="text-muted-foreground">الاسم:</span> <span className="font-semibold">{preflight.lead.name}</span></div>
                <div><span className="text-muted-foreground">الهاتف:</span> <span className="font-mono" dir="ltr">{preflight.lead.phone}</span></div>
                <div><span className="text-muted-foreground">كود الفيصل:</span> <span className="font-mono" dir="ltr">{preflight.lead.erp_customer_code || "—"}</span></div>
              </div>

              {preflight.kind === "no_erp" && (
                <>
                  <div className="rounded-md border border-destructive/30 bg-destructive/10 p-3 text-destructive text-xs">
                    ⚠️ لا يوجد كود فيصل مرتبط بهذا العميل. يجب ربط الكود أولاً قبل إنشاء حساب.
                  </div>
                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => setPreflight(null)}>إغلاق</Button>
                  </div>
                </>
              )}

              {preflight.kind === "no_account" && (
                <>
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
                    ⚠️ لا يوجد <strong>حساب تاجر</strong> مرتبط بهذا الكود في النظام.
                    <br />سيتم إنشاء الحساب الكامل (مستخدم + dealer_account + كلمة مرور + إرسال واتساب).
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPreflight(null)}>إلغاء</Button>
                    <Button
                      size="sm"
                      onClick={async () => { const l = preflight.lead; setPreflight(null); await registerClient(l); }}
                      disabled={registering === preflight.lead.id}
                    >
                      <UserPlus className="w-3.5 h-3.5 ml-1" />
                      إنشاء الحساب الآن
                    </Button>
                  </div>
                </>
              )}

              {preflight.kind === "has_password" && (
                <>
                  <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs">
                    ✅ الحساب موجود وكلمة المرور محفوظة. يمكنك عرضها أو نسخها مباشرة.
                  </div>
                  <div className="rounded-md border bg-background p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">كلمة المرور:</span>
                      <span className="font-mono text-sm" dir="ltr">{preflight.password}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => copyToClipboard(preflight.password)}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPreflight(null)}>إغلاق</Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={async () => { const l = preflight.lead; setPreflight(null); await resetPassword(l); }}
                      disabled={registering === preflight.lead.id}
                    >
                      <RotateCcw className="w-3.5 h-3.5 ml-1" />
                      إعادة تعيين كلمة مرور جديدة
                    </Button>
                  </div>
                </>
              )}

              {preflight.kind === "no_password" && (
                <>
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
                    ⚠️ الحساب موجود لكن لا توجد كلمة مرور محفوظة. سيتم توليد كلمة مرور جديدة وحفظها بشكل دائم.
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" size="sm" onClick={() => setPreflight(null)}>إلغاء</Button>
                    <Button
                      size="sm"
                      onClick={async () => { const l = preflight.lead; setPreflight(null); await resetPassword(l); }}
                      disabled={registering === preflight.lead.id}
                    >
                      <KeyRound className="w-3.5 h-3.5 ml-1" />
                      توليد كلمة مرور وحفظها
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Auto-Create Confirmation Dialog — تأكيد قبل الإنشاء التلقائي للعملاء المحوّلين غير المكتملين */}
      <AlertDialog open={!!autoCreateConfirm} onOpenChange={(o) => { if (!o) resolveAutoCreateConfirm(false); }}>
        <AlertDialogContent dir="rtl" className="max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary" />
              تأكيد إنشاء حساب تلقائي
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              {autoCreateConfirm?.reason === "no_dealer_account"
                ? "هذا العميل محوّل لكن لا يوجد له حساب تاجر مكتمل بعد. سيتم إنشاء الحساب الآن وإرسال بيانات الدخول له."
                : "لا يوجد مستخدم بهذا البريد في النظام. سيتم إنشاء حساب جديد كامل (مستخدم + حساب تاجر) وإرسال بيانات الدخول."}
            </AlertDialogDescription>
          </AlertDialogHeader>

          {autoCreateConfirm && (
            <div className="rounded-lg border bg-muted/30 p-3 space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">الاسم:</span>
                <span className="font-semibold">{autoCreateConfirm.lead.name}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">رقم الهاتف:</span>
                <span className="font-mono" dir="ltr">{autoCreateConfirm.lead.phone}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">البريد المتوقع:</span>
                <span className="font-mono text-xs break-all" dir="ltr">
                  {autoCreateConfirm.lead.phone.replace(/\D/g, "")}@phone.almasria.local
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">كود الفيصل:</span>
                <span className="font-mono" dir="ltr">{autoCreateConfirm.lead.erp_customer_code || "—"}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-muted-foreground">نوع العميل:</span>
                <span>{clientTypeLabels[autoCreateConfirm.lead.client_type] || autoCreateConfirm.lead.client_type}</span>
              </div>
              {autoCreateConfirm.lead.shop_name && (
                <div className="flex justify-between gap-3">
                  <span className="text-muted-foreground">اسم المحل:</span>
                  <span>{autoCreateConfirm.lead.shop_name}</span>
                </div>
              )}
            </div>
          )}

          <div className="rounded-md border border-amber-500/30 bg-amber-500/10 p-2.5 text-[11px] text-amber-800 dark:text-amber-300">
            ⚠️ تأكد من صحة رقم الهاتف وكود الفيصل قبل المتابعة — لا يمكن التراجع بعد إرسال بيانات الدخول.
          </div>

          <AlertDialogFooter className="flex-row-reverse gap-2">
            <AlertDialogAction
              onClick={() => resolveAutoCreateConfirm(true)}
              className="gap-1.5"
            >
              <UserPlus className="w-4 h-4" />
              نعم، أنشئ الحساب
            </AlertDialogAction>
            <AlertDialogCancel onClick={() => resolveAutoCreateConfirm(false)}>
              إلغاء
            </AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Credentials Dialog */}
      <Dialog open={!!credentials} onOpenChange={() => { setCredentials(null); setShowPassword(false); }}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-center">✅ تم إنشاء الحساب بنجاح</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground text-center">
              تم تسجيل العميل وربطه بنظام الفيصل. أرسل هذه البيانات للعميل:
            </p>
            <div className="space-y-3 bg-muted/50 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">اسم المستخدم:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-sm" dir="ltr">{credentials?.username}</span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(credentials?.username || "")}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">كلمة المرور:</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-sm" dir="ltr">
                    {showPassword ? credentials?.password : "••••••••"}
                  </span>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setShowPassword(!showPassword)}>
                    {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copyToClipboard(credentials?.password || "")}>
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            </div>
            <Button
              className="w-full gap-2"
              onClick={() => {
                const text = `اسم المستخدم: ${credentials?.username}\nكلمة المرور: ${credentials?.password}`;
                copyToClipboard(text);
              }}
            >
              <Copy className="w-4 h-4" />
              نسخ البيانات كاملة
            </Button>
            <Button
              className="w-full gap-2 bg-green-600 hover:bg-green-700 text-white"
              onClick={() => {
                const phone = credentials?.phone?.replace(/^0/, '2') || '';
                const msg = encodeURIComponent(
                  `مرحباً، تم تسجيل حسابك على المصرية لقطع غيار تويوتا 🎉\n\nاسم المستخدم: ${credentials?.username}\nكلمة المرور: ${credentials?.password}\n\nرابط الدخول: https://almasria-autoparts-hub.lovable.app/dealer-login`
                );
                window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
              }}
            >
              <MessageCircle className="w-4 h-4" />
              إرسال عبر واتساب
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Last attempt details dialog */}
      <Dialog open={!!attemptDetail} onOpenChange={(o) => { if (!o) setAttemptDetail(null); }}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <History className="w-4 h-4 text-primary" />
              تفاصيل آخر محاولة
            </DialogTitle>
          </DialogHeader>
          {attemptDetail && (
            <div className="space-y-3 text-sm">
              <div className="rounded-md border bg-muted/30 p-3 space-y-1">
                <div><span className="text-muted-foreground">العميل:</span> <span className="font-semibold">{attemptDetail.lead.name}</span></div>
                <div><span className="text-muted-foreground">الهاتف:</span> <span className="font-mono" dir="ltr">{attemptDetail.lead.phone}</span></div>
                {attemptDetail.lead.erp_customer_code && (
                  <div><span className="text-muted-foreground">كود الفيصل:</span> <span className="font-mono" dir="ltr">{attemptDetail.lead.erp_customer_code}</span></div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-md border p-3">
                  <div className="text-[11px] text-muted-foreground mb-1">النوع</div>
                  <Badge variant="outline" className="gap-1 text-[11px]">
                    {attemptDetail.attempt_type === "create" ? <UserPlus className="w-3 h-3" /> : <KeyRound className="w-3 h-3" />}
                    {attemptDetail.attempt_type === "create" ? "إنشاء حساب" : "إعادة تعيين"}
                  </Badge>
                </div>
                <div className="rounded-md border p-3">
                  <div className="text-[11px] text-muted-foreground mb-1">الحالة</div>
                  {attemptDetail.status === "success" ? (
                    <Badge className="gap-1 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 border-emerald-500/30">
                      <CheckCircle2 className="w-3 h-3" /> نجاح
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="gap-1">
                      <XCircle className="w-3 h-3" /> فشل
                    </Badge>
                  )}
                </div>
              </div>

              <div className="rounded-md border p-3">
                <div className="text-[11px] text-muted-foreground mb-1">الوقت</div>
                <div className="font-mono text-xs" dir="ltr">
                  {new Date(attemptDetail.created_at).toLocaleString("ar-EG", {
                    year: "numeric", month: "2-digit", day: "2-digit",
                    hour: "2-digit", minute: "2-digit", second: "2-digit",
                  })}
                </div>
              </div>

              {attemptDetail.error_message && (
                <div className="rounded-md border border-destructive/30 bg-destructive/5 p-3">
                  <div className="text-[11px] text-destructive font-semibold mb-1">رسالة الخطأ</div>
                  <div className="text-xs text-destructive break-words">{attemptDetail.error_message}</div>
                </div>
              )}

              <div className="flex justify-between gap-2 pt-2">
                <Button variant="outline" size="sm" onClick={() => setAttemptDetail(null)}>إغلاق</Button>
                <Button
                  variant="default"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    setAttemptDetail(null);
                    const url = new URL(window.location.href);
                    url.searchParams.set("section", "client-attempts");
                    window.history.pushState({}, "", url.toString());
                    window.dispatchEvent(new PopStateEvent("popstate"));
                  }}
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  فتح السجل الكامل
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Click outside handler for ERP dropdown */}
      {showErpDropdown && (
        <div className="fixed inset-0 z-40" onClick={() => setShowErpDropdown(false)} />
      )}
    </div>
  );
};

export default AdminLeads;
