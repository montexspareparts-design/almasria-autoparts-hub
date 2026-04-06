import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Phone, Store, User, Loader2, Trash2, Edit2, Check, X, Link2, UserPlus, Copy, Eye, EyeOff, MessageCircle, KeyRound, RotateCcw } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  wholesale: "جملة",
  retail: "قطاعي",
};

const AdminLeads = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
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
    }
    setLoading(false);
  };

  // Fetch credentials for converted leads
  const fetchLeadCredentials = useCallback(async (leadsList: Lead[]) => {
    const convertedLeads = leadsList.filter(l => l.status === "converted" && l.erp_customer_code);
    if (convertedLeads.length === 0) return;
    
    const erpCodes = convertedLeads.map(l => l.erp_customer_code!);
    const { data } = await supabase
      .from("dealer_accounts")
      .select("erp_customer_code, initial_password")
      .in("erp_customer_code", erpCodes);
    
    if (data) {
      const creds: Record<string, LeadCredentials> = {};
      for (const lead of convertedLeads) {
        const account = data.find(d => d.erp_customer_code === lead.erp_customer_code);
        const cleanPhone = lead.phone.replace(/\D/g, "");
        creds[lead.id] = {
          username: cleanPhone,
          password: account?.initial_password || "غير محفوظة",
        };
      }
      setLeadCredentials(creds);
    }
  }, []);

  useEffect(() => { 
    fetchLeads().then(() => {});
  }, []);

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

      if (error) {
        toast({ title: "خطأ", description: "فشل إنشاء الحساب", variant: "destructive" });
      } else if (data?.error) {
        toast({ title: "خطأ", description: data.error, variant: "destructive" });
      } else if (data?.success) {
        setCredentials({ username: data.username, password: data.password, phone: lead.phone });
        toast({ title: "تم التسجيل", description: "تم إنشاء حساب العميل بنجاح" });
        fetchLeads();
      }
    } catch (err) {
      toast({ title: "خطأ", description: "حدث خطأ غير متوقع", variant: "destructive" });
    }
    setRegistering(null);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "تم النسخ" });
  };

  // View stored credentials for a converted lead
  const viewCredentials = async (lead: Lead) => {
    const { data } = await supabase
      .from("dealer_accounts")
      .select("initial_password, erp_customer_code")
      .eq("erp_customer_code", lead.erp_customer_code)
      .maybeSingle();
    
    if (data?.initial_password) {
      setCredentials({ username: lead.phone, password: data.initial_password, phone: lead.phone });
    } else {
      toast({ title: "تنبيه", description: "كلمة المرور غير محفوظة. استخدم إعادة التعيين.", variant: "destructive" });
    }
  };

  // Reset password for a converted lead
  const resetPassword = async (lead: Lead) => {
    setRegistering(lead.id);
    try {
      const cleanPhone = lead.phone.replace(/\D/g, "");
      const email = `${cleanPhone}@phone.almasria.local`;
      const newPassword = Array.from(crypto.getRandomValues(new Uint8Array(6)))
        .map(b => b.toString(36).padStart(2, "0"))
        .join("")
        .slice(0, 8);

      const { error } = await supabase.functions.invoke("create-client-account", {
        body: { action: "reset_password", email, new_password: newPassword, erp_customer_code: lead.erp_customer_code },
      });
      if (error) {
        toast({ title: "خطأ", description: "فشل إعادة تعيين كلمة المرور", variant: "destructive" });
      } else {
        setCredentials({ username: lead.phone, password: newPassword, phone: lead.phone });
        toast({ title: "تم", description: "تم إعادة تعيين كلمة المرور بنجاح" });
      }
    } catch {
      toast({ title: "خطأ", description: "حدث خطأ غير متوقع", variant: "destructive" });
    }
    setRegistering(null);
  };

  const filtered = leads.filter(l =>
    l.name.includes(searchQuery) ||
    l.phone.includes(searchQuery) ||
    (l.shop_name || "").includes(searchQuery) ||
    (l.erp_customer_code || "").includes(searchQuery)
  );

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
                    <SelectItem value="wholesale">جملة</SelectItem>
                    <SelectItem value="retail">قطاعي</SelectItem>
                  </SelectContent>
                </Select>
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

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
          placeholder="بحث بالاسم أو الهاتف أو كود الفيصل..."
          className="pr-9"
        />
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          {searchQuery ? "لا توجد نتائج" : "لا يوجد عملاء حتى الآن — ابدأ بإضافة أول عميل"}
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
                      {leadCredentials[lead.id] ? (
                        <div className="flex items-center gap-1">
                          <span className="font-mono text-xs" dir="ltr">{leadCredentials[lead.id].username}</span>
                          <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => copyToClipboard(leadCredentials[lead.id].username)}>
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

      {/* Click outside handler for ERP dropdown */}
      {showErpDropdown && (
        <div className="fixed inset-0 z-40" onClick={() => setShowErpDropdown(false)} />
      )}
    </div>
  );
};

export default AdminLeads;
