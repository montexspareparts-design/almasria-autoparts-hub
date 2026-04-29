import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, UserPlus, Trash2, Shield, Search, Users, Activity, ShoppingBag, UserCheck, FileText, Package, Clock, KeyRound, UserX, Crown, Eye, EyeOff, Copy } from "lucide-react";

const PROTECTED_ADMIN_EMAIL = "monmohanad9@gmail.com";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface StaffMember {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  email?: string;
  full_name?: string;
}

interface AuditEntry {
  id: string;
  performed_by: string;
  action: string;
  table_name: string;
  record_id: string | null;
  created_at: string;
  old_data: any;
  new_data: any;
}

interface StaffStats {
  user_id: string;
  name: string;
  email: string;
  totalActions: number;
  orderActions: number;
  leadActions: number;
  productActions: number;
  otherActions: number;
}

const actionLabels: Record<string, string> = {
  create: "إنشاء",
  update: "تعديل",
  delete: "حذف",
};

const tableLabels: Record<string, string> = {
  orders: "الطلبات",
  order_items: "عناصر الطلبات",
  products: "المنتجات",
  leads: "العملاء المحتملين",
  dealer_accounts: "حسابات التجار",
  dealer_applications: "طلبات التجار",
  price_lists: "كشوف الأسعار",
  price_list_products: "أصناف الكشوف",
  profiles: "الملفات الشخصية",
  notifications: "الإشعارات",
};

const getActionIcon = (tableName: string) => {
  switch (tableName) {
    case "orders":
    case "order_items":
      return <ShoppingBag className="w-3.5 h-3.5" />;
    case "leads":
    case "dealer_accounts":
    case "dealer_applications":
    case "profiles":
      return <UserCheck className="w-3.5 h-3.5" />;
    case "products":
      return <Package className="w-3.5 h-3.5" />;
    case "price_lists":
    case "price_list_products":
      return <FileText className="w-3.5 h-3.5" />;
    default:
      return <Activity className="w-3.5 h-3.5" />;
  }
};

const getActionColor = (action: string) => {
  switch (action) {
    case "create": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    case "update": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
    case "delete": return "bg-destructive/10 text-destructive border-destructive/20";
    default: return "bg-muted text-muted-foreground";
  }
};

const getOrderStatusChange = (oldData: any, newData: any): string | null => {
  if (oldData?.status && newData?.status && oldData.status !== newData.status) {
    const statusLabels: Record<string, string> = {
      pending: "قيد الانتظار",
      confirmed: "تمت الموافقة",
      awaiting_payment: "بانتظار الدفع",
      processing: "جاري التجهيز",
      ready: "جاهز",
      shipped: "تم الشحن",
      delivered: "تم التسليم",
      cancelled: "ملغي",
    };
    return `${statusLabels[oldData.status] || oldData.status} ← ${statusLabels[newData.status] || newData.status}`;
  }
  return null;
};

const AdminStaffRoles = () => {
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCustomPassword, setNewCustomPassword] = useState("");
  const [newRole, setNewRole] = useState<"moderator" | "reporter">("moderator");
  const [adding, setAdding] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string; whatsappSent: boolean; emailSent: boolean; role: string } | null>(null);
  const [resetTarget, setResetTarget] = useState<StaffMember | null>(null);
  const [resetPassword, setResetPassword] = useState("");
  const [resetting, setResetting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deletingFully, setDeletingFully] = useState(false);
  const [viewPasswordTarget, setViewPasswordTarget] = useState<StaffMember | null>(null);
  const [viewedPassword, setViewedPassword] = useState<{ password: string; created_at: string } | null>(null);
  const [loadingPassword, setLoadingPassword] = useState(false);

  // Activity state
  const [activityLoading, setActivityLoading] = useState(false);
  const [activities, setActivities] = useState<AuditEntry[]>([]);
  const [staffStats, setStaffStats] = useState<StaffStats[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>("all");
  const [selectedTable, setSelectedTable] = useState<string>("all");
  const [profileMap, setProfileMap] = useState<Record<string, { name: string; email: string }>>({});

  const fetchStaff = async () => {
    setLoading(true);
    const { data: roles, error } = await supabase
      .from("user_roles")
      .select("*")
      .in("role", ["moderator", "reporter"] as any);

    if (error) {
      toast({ title: "خطأ في تحميل الموظفين", variant: "destructive" });
      setLoading(false);
      return;
    }

    const enriched: StaffMember[] = [];
    const pMap: Record<string, { name: string; email: string }> = {};
    for (const role of roles || []) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("user_id", role.user_id)
        .maybeSingle();

      const name = profile?.full_name || "";
      const email = profile?.email || "";
      enriched.push({ ...role, email, full_name: name });
      pMap[role.user_id] = { name, email };
    }

    setStaff(enriched);
    setProfileMap(pMap);
    setLoading(false);
  };

  const fetchActivity = useCallback(async () => {
    if (staff.length === 0) return;
    setActivityLoading(true);

    const modUserIds = staff.map(s => s.user_id);

    let query = supabase
      .from("audit_logs")
      .select("*")
      .in("performed_by", modUserIds)
      .order("created_at", { ascending: false })
      .limit(200);

    if (selectedStaff !== "all") {
      query = query.eq("performed_by", selectedStaff);
    }
    if (selectedTable !== "all") {
      query = query.eq("table_name", selectedTable);
    }

    const { data, error } = await query;

    if (error) {
      toast({ title: "خطأ في تحميل سجل النشاط", variant: "destructive" });
      setActivityLoading(false);
      return;
    }

    setActivities(data || []);

    // Calculate stats per staff member
    const allLogs = data || [];
    const stats: StaffStats[] = modUserIds.map(uid => {
      const userLogs = allLogs.filter(l => l.performed_by === uid);
      const p = profileMap[uid] || { name: "—", email: "—" };
      return {
        user_id: uid,
        name: p.name || p.email,
        email: p.email,
        totalActions: userLogs.length,
        orderActions: userLogs.filter(l => l.table_name === "orders" || l.table_name === "order_items").length,
        leadActions: userLogs.filter(l => l.table_name === "leads" || l.table_name === "dealer_accounts" || l.table_name === "dealer_applications").length,
        productActions: userLogs.filter(l => l.table_name === "products").length,
        otherActions: userLogs.filter(l => !["orders", "order_items", "leads", "dealer_accounts", "dealer_applications", "products"].includes(l.table_name)).length,
      };
    });

    setStaffStats(stats.sort((a, b) => b.totalActions - a.totalActions));
    setActivityLoading(false);
  }, [staff, selectedStaff, selectedTable, profileMap]);

  useEffect(() => { fetchStaff(); }, []);
  useEffect(() => { fetchActivity(); }, [fetchActivity]);

  const handleAddModerator = async () => {
    if (!newEmail.trim() || !newName.trim()) {
      toast({ title: "الاسم والبريد الإلكتروني مطلوبان", variant: "destructive" });
      return;
    }
    setAdding(true);
    setCreatedCredentials(null);

    try {
      const { data, error } = await supabase.functions.invoke("create-staff-account", {
        body: {
          fullName: newName.trim(),
          email: newEmail.trim().toLowerCase(),
          phone: newPhone.trim() || null,
          password: newCustomPassword.trim() || undefined,
          role: newRole,
        },
      });

      if (error || data?.error) {
        toast({
          title: "فشل إضافة الموظف",
          description: data?.error || error?.message || "حدث خطأ غير متوقع",
          variant: "destructive",
        });
      } else {
        const roleLabel = data.role === "reporter" ? "موظف فيصل (تقرير فقط)" : "موظف";
        if (data.isNewUser && data.tempPassword) {
          setCreatedCredentials({
            email: data.email,
            password: data.tempPassword,
            whatsappSent: data.whatsappSent,
            emailSent: data.emailSent,
            role: data.role,
          });
          toast({
            title: `✅ تم إنشاء حساب ${roleLabel}`,
            description: `${data.whatsappSent ? "📱 تم إرسال البيانات على واتساب. " : ""}${data.emailSent ? "📧 تم إرسال البيانات على الإيميل." : ""}`,
          });
        } else {
          toast({
            title: `✅ تم منح صلاحية ${roleLabel}`,
            description: "تم تحويل المستخدم القائم",
          });
        }
        setNewEmail("");
        setNewName("");
        setNewPhone("");
        setNewCustomPassword("");
        setNewRole("moderator");
        fetchStaff();
      }
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
    setAdding(false);
  };

  const handleRemoveModerator = async (member: StaffMember) => {
    const { error } = await supabase
      .from("user_roles")
      .delete()
      .eq("id", member.id);

    if (error) {
      toast({ title: "خطأ في حذف الصلاحية", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم حذف صلاحية الموظف", description: `تم إزالة ${member.full_name || member.email} من الموظفين` });
      fetchStaff();
    }
  };

  const handleResetPassword = async () => {
    if (!resetTarget?.email || resetPassword.trim().length < 6) {
      toast({ title: "كلمة المرور لازم تكون 6 حروف على الأقل", variant: "destructive" });
      return;
    }
    setResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-reset-staff-password", {
        body: { email: resetTarget.email, newPassword: resetPassword.trim() },
      });
      if (error || data?.error) {
        toast({ title: "فشل إعادة التعيين", description: data?.error || error?.message, variant: "destructive" });
      } else {
        toast({ title: "✅ تم تغيير كلمة المرور", description: `الكلمة الجديدة: ${resetPassword.trim()}` });
        setResetTarget(null);
        setResetPassword("");
      }
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
    setResetting(false);
  };

  const handleViewPassword = async (member: StaffMember) => {
    setViewPasswordTarget(member);
    setViewedPassword(null);
    setLoadingPassword(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Get the latest stored password for this staff member
      const { data, error } = await supabase
        .from("staff_passwords")
        .select("id, initial_password, created_at")
        .eq("staff_user_id", member.user_id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error) throw error;
      if (!data) {
        setViewedPassword(null);
      } else {
        setViewedPassword({ password: data.initial_password, created_at: data.created_at });
        // Audit: mark as viewed
        if (user) {
          await supabase.from("staff_passwords").update({
            viewed_by: user.id,
            viewed_at: new Date().toISOString(),
          }).eq("id", data.id);
        }
      }
    } catch (err: any) {
      toast({ title: "خطأ في جلب كلمة المرور", description: err.message, variant: "destructive" });
    }
    setLoadingPassword(false);
  };

  const handleFullDelete = async () => {
    if (!deleteTarget) return;
    if ((deleteTarget.email || "").toLowerCase() === PROTECTED_ADMIN_EMAIL) {
      toast({ title: "❌ لا يمكن حذف الأدمن الرئيسي", variant: "destructive" });
      return;
    }
    if (deleteConfirmText.trim() !== "حذف نهائي") {
      toast({ title: "اكتب 'حذف نهائي' للتأكيد", variant: "destructive" });
      return;
    }
    setDeletingFully(true);
    try {
      const { data, error } = await supabase.functions.invoke("admin-delete-user", {
        body: { user_ids: [deleteTarget.user_id] },
      });
      if (error || data?.error) {
        toast({ title: "فشل الحذف النهائي", description: data?.error || error?.message, variant: "destructive" });
      } else {
        const result = data?.results?.[0];
        if (result?.success) {
          toast({ title: "✅ تم حذف الموظف نهائياً", description: `تم حذف ${deleteTarget.full_name || deleteTarget.email} من النظام بالكامل` });
          setDeleteTarget(null);
          setDeleteConfirmText("");
          fetchStaff();
        } else {
          toast({ title: "فشل الحذف", description: result?.error || "خطأ غير معروف", variant: "destructive" });
        }
      }
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }
    setDeletingFully(false);
  };

  const filtered = staff.filter(s =>
    (s.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Tabs defaultValue="manage" className="space-y-4">
      <TabsList className="grid w-full max-w-md grid-cols-2">
        <TabsTrigger value="manage" className="gap-2">
          <Users className="w-4 h-4" />
          إدارة الموظفين
        </TabsTrigger>
        <TabsTrigger value="activity" className="gap-2">
          <Activity className="w-4 h-4" />
          سجل النشاط
        </TabsTrigger>
      </TabsList>

      {/* Tab 1: Manage Staff */}
      <TabsContent value="manage" className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="w-5 h-5 text-primary" />
              إضافة موظف جديد
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">الاسم الكامل *</label>
                <Input
                  placeholder="محمد أحمد"
                  value={newName}
                  onChange={e => setNewName(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">البريد الإلكتروني *</label>
                <Input
                  placeholder="staff@email.com"
                  value={newEmail}
                  onChange={e => setNewEmail(e.target.value)}
                  dir="ltr"
                  className="text-left"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">رقم الواتساب (اختياري)</label>
                <Input
                  placeholder="01xxxxxxxxx"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  dir="ltr"
                  className="text-left"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">كلمة المرور (اختياري — هتتولّد عشوائياً لو فاضية)</label>
                <Input
                  placeholder="مثال: Karam@2050"
                  value={newCustomPassword}
                  onChange={e => setNewCustomPassword(e.target.value)}
                  dir="ltr"
                  className="text-left"
                  type="text"
                />
              </div>
            </div>
            <Button onClick={handleAddModerator} disabled={adding || !newEmail.trim() || !newName.trim()} className="gap-2 w-full sm:w-auto">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              إنشاء حساب وإرسال البيانات
            </Button>
            <p className="text-xs text-muted-foreground">
              سيتم إنشاء حساب جديد بكلمة مرور مؤقتة وإرسال بيانات الدخول على واتساب والإيميل تلقائياً. لو المستخدم مسجل بالفعل، سيتم منحه صلاحية موظف فقط.
            </p>

            {createdCredentials && (
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-4 space-y-2">
                <p className="font-bold text-emerald-700 dark:text-emerald-400">✅ تم إنشاء الحساب بنجاح</p>
                <div className="text-sm space-y-1 font-mono bg-background/50 p-3 rounded">
                  <p><span className="text-muted-foreground">البريد: </span><span dir="ltr">{createdCredentials.email}</span></p>
                  <p><span className="text-muted-foreground">كلمة السر المؤقتة: </span><code className="bg-muted px-2 py-0.5 rounded">{createdCredentials.password}</code></p>
                  <p className="text-xs text-muted-foreground pt-2">
                    رابط الدخول: <span dir="ltr">{window.location.origin}/dealer-login</span>
                  </p>
                </div>
                <div className="flex gap-2 text-xs">
                  <Badge variant={createdCredentials.whatsappSent ? "default" : "secondary"}>
                    {createdCredentials.whatsappSent ? "📱 تم إرسال واتساب" : "⚠️ لم يتم إرسال واتساب"}
                  </Badge>
                  <Badge variant={createdCredentials.emailSent ? "default" : "secondary"}>
                    {createdCredentials.emailSent ? "📧 تم إرسال إيميل" : "⚠️ لم يتم إرسال إيميل"}
                  </Badge>
                </div>
                <Button size="sm" variant="ghost" onClick={() => setCreatedCredentials(null)} className="text-xs">إخفاء</Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <Users className="w-5 h-5 text-primary" />
                الموظفون الحاليون
                <Badge variant="secondary" className="text-xs">{staff.length}</Badge>
              </CardTitle>
              <div className="relative w-64">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input placeholder="بحث..." value={search} onChange={e => setSearch(e.target.value)} className="pr-9 text-sm" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">{staff.length === 0 ? "لا يوجد موظفون بعد" : "لا توجد نتائج"}</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">البريد الإلكتروني</TableHead>
                    <TableHead className="text-right">تاريخ الإضافة</TableHead>
                    <TableHead className="text-right w-32">إجراءات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map(member => {
                    const isProtected = (member.email || "").toLowerCase() === PROTECTED_ADMIN_EMAIL;
                    return (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {member.full_name || "—"}
                          {isProtected && (
                            <Badge variant="outline" className="gap-1 text-[10px] border-amber-500/40 text-amber-600">
                              <Crown className="w-3 h-3" />
                              أدمن رئيسي
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell dir="ltr" className="text-left text-muted-foreground">{member.email || "—"}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{new Date(member.created_at).toLocaleDateString("ar-EG")}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-blue-600 hover:bg-blue-500/10 h-8 w-8"
                            onClick={() => handleViewPassword(member)}
                            title="عرض اسم المستخدم وكلمة المرور"
                            disabled={isProtected}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-amber-600 hover:bg-amber-500/10 h-8 w-8"
                            onClick={() => { setResetTarget(member); setResetPassword(""); }}
                            title="إعادة تعيين كلمة المرور"
                            disabled={isProtected}
                          >
                            <KeyRound className="w-4 h-4" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:bg-destructive/10 h-8 w-8"
                                title="حذف الصلاحية فقط"
                                disabled={isProtected}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>حذف صلاحية الموظف؟</AlertDialogTitle>
                                <AlertDialogDescription>
                                  سيتم إزالة صلاحيات الموظف من {member.full_name || member.email} (الحساب يبقى موجوداً).
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>إلغاء</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRemoveModerator(member)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  حذف الصلاحية
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:bg-destructive/20 h-8 w-8 border border-destructive/30"
                            title="حذف نهائي من النظام"
                            disabled={isProtected}
                            onClick={() => { setDeleteTarget(member); setDeleteConfirmText(""); }}
                          >
                            <UserX className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Tab 2: Activity Log */}
      <TabsContent value="activity" className="space-y-6">
        {/* Stats cards */}
        {staffStats.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {staffStats.map(stat => (
              <Card key={stat.user_id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedStaff(selectedStaff === stat.user_id ? "all" : stat.user_id)}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <p className="font-bold text-sm truncate">{stat.name}</p>
                      <p className="text-xs text-muted-foreground" dir="ltr">{stat.email}</p>
                    </div>
                    {selectedStaff === stat.user_id && (
                      <Badge variant="default" className="text-[10px]">مُحدد</Badge>
                    )}
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div>
                      <p className="text-lg font-black text-foreground">{stat.totalActions}</p>
                      <p className="text-[10px] text-muted-foreground">إجمالي</p>
                    </div>
                    <div>
                      <p className="text-lg font-black text-blue-600">{stat.orderActions}</p>
                      <p className="text-[10px] text-muted-foreground">طلبات</p>
                    </div>
                    <div>
                      <p className="text-lg font-black text-emerald-600">{stat.leadActions}</p>
                      <p className="text-[10px] text-muted-foreground">عملاء</p>
                    </div>
                    <div>
                      <p className="text-lg font-black text-amber-600">{stat.productActions}</p>
                      <p className="text-[10px] text-muted-foreground">منتجات</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Filters */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="w-5 h-5 text-primary" />
                سجل نشاط الموظفين
                <Badge variant="secondary" className="text-xs">{activities.length}</Badge>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                  <SelectTrigger className="w-44 text-sm h-9">
                    <SelectValue placeholder="كل الموظفين" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الموظفين</SelectItem>
                    {staff.map(s => (
                      <SelectItem key={s.user_id} value={s.user_id}>{s.full_name || s.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={selectedTable} onValueChange={setSelectedTable}>
                  <SelectTrigger className="w-40 text-sm h-9">
                    <SelectValue placeholder="كل الأقسام" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">كل الأقسام</SelectItem>
                    {Object.entries(tableLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {activityLoading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            ) : activities.length === 0 ? (
              <div className="text-center py-10 text-muted-foreground">
                <Activity className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">لا يوجد نشاط مسجل بعد</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {activities.map(entry => {
                  const performer = profileMap[entry.performed_by];
                  const statusChange = entry.table_name === "orders" && entry.action === "update"
                    ? getOrderStatusChange(entry.old_data, entry.new_data)
                    : null;

                  return (
                    <div key={entry.id} className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/30 transition-colors">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${getActionColor(entry.action)}`}>
                        {getActionIcon(entry.table_name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-bold text-sm">{performer?.name || performer?.email || "موظف"}</span>
                          <Badge variant="outline" className={`text-[10px] ${getActionColor(entry.action)}`}>
                            {actionLabels[entry.action] || entry.action}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {tableLabels[entry.table_name] || entry.table_name}
                          </span>
                        </div>
                        {statusChange && (
                          <p className="text-xs text-blue-600 mt-1 font-medium">
                            📋 تغيير حالة الطلب: {statusChange}
                          </p>
                        )}
                        {entry.table_name === "leads" && entry.action === "create" && entry.new_data?.name && (
                          <p className="text-xs text-emerald-600 mt-1 font-medium">
                            👤 عميل جديد: {entry.new_data.name} — {entry.new_data.phone}
                          </p>
                        )}
                        {entry.table_name === "orders" && entry.new_data?.order_number && (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            رقم الطلب: {entry.new_data.order_number}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-muted-foreground shrink-0">
                        <Clock className="w-3 h-3" />
                        {new Date(entry.created_at).toLocaleDateString("ar-EG")} — {new Date(entry.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetTarget} onOpenChange={(o) => { if (!o) { setResetTarget(null); setResetPassword(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-600" />
              إعادة تعيين كلمة المرور
            </DialogTitle>
            <DialogDescription>
              تعيين كلمة مرور جديدة لـ <strong>{resetTarget?.full_name || resetTarget?.email}</strong>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">كلمة المرور الجديدة (6 حروف على الأقل)</label>
              <Input
                placeholder="مثال: Karam@2050"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                dir="ltr"
                className="text-left"
                type="text"
                autoFocus
              />
            </div>
            <p className="text-xs text-muted-foreground">⚠️ بعد التعيين، شارك كلمة المرور الجديدة مع الموظف يدوياً.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetTarget(null)} disabled={resetting}>إلغاء</Button>
            <Button onClick={handleResetPassword} disabled={resetting || resetPassword.trim().length < 6} className="gap-2">
              {resetting ? <Loader2 className="w-4 h-4 animate-spin" /> : <KeyRound className="w-4 h-4" />}
              تعيين كلمة المرور
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full Delete Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) { setDeleteTarget(null); setDeleteConfirmText(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <UserX className="w-5 h-5" />
              حذف نهائي للموظف
            </DialogTitle>
            <DialogDescription>
              سيتم حذف <strong>{deleteTarget?.full_name || deleteTarget?.email}</strong> نهائياً من نظام المصادقة، الصلاحيات، والملف الشخصي. <span className="text-destructive font-bold">لا يمكن التراجع.</span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-3 text-sm space-y-1">
              <p className="font-bold text-destructive">⚠️ سيتم حذف:</p>
              <ul className="list-disc list-inside text-xs text-muted-foreground space-y-0.5">
                <li>حساب المصادقة (auth.users)</li>
                <li>الصلاحيات (user_roles)</li>
                <li>الملف الشخصي (profiles)</li>
                <li>حساب التاجر إن وجد + الإشعارات</li>
              </ul>
            </div>
            <div>
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">
                للتأكيد، اكتب: <code className="bg-muted px-1.5 py-0.5 rounded text-foreground">حذف نهائي</code>
              </label>
              <Input
                placeholder="حذف نهائي"
                value={deleteConfirmText}
                onChange={(e) => setDeleteConfirmText(e.target.value)}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deletingFully}>إلغاء</Button>
            <Button
              variant="destructive"
              onClick={handleFullDelete}
              disabled={deletingFully || deleteConfirmText.trim() !== "حذف نهائي"}
              className="gap-2"
            >
              {deletingFully ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserX className="w-4 h-4" />}
              حذف نهائي
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Password Dialog — Admin only */}
      <Dialog open={!!viewPasswordTarget} onOpenChange={(o) => { if (!o) { setViewPasswordTarget(null); setViewedPassword(null); } }}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              بيانات دخول الموظف
            </DialogTitle>
            <DialogDescription>
              عرض اسم المستخدم وكلمة المرور لـ <strong>{viewPasswordTarget?.full_name || viewPasswordTarget?.email}</strong>
            </DialogDescription>
          </DialogHeader>

          {loadingPassword ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : !viewedPassword ? (
            <div className="bg-amber-50 border border-amber-300 rounded-lg p-4 text-sm text-amber-800">
              <p className="font-bold mb-1">⚠️ مفيش كلمة مرور محفوظة</p>
              <p className="text-xs">الموظف ده اتعمل قبل تفعيل ميزة حفظ كلمات المرور، أو غيّر كلمة سره بنفسه. اضغط على 🔑 "إعادة تعيين كلمة المرور" لإنشاء كلمة جديدة وحفظها.</p>
            </div>
          ) : (
            <div className="space-y-3 py-2">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">📧 اسم المستخدم (البريد الإلكتروني)</label>
                <div className="flex items-center gap-2 bg-muted/50 border rounded-lg p-3">
                  <code dir="ltr" className="flex-1 text-sm font-mono text-foreground select-all">{viewPasswordTarget?.email}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => {
                      navigator.clipboard.writeText(viewPasswordTarget?.email || "");
                      toast({ title: "تم نسخ البريد" });
                    }}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">🔐 كلمة المرور</label>
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-300 rounded-lg p-3">
                  <code dir="ltr" className="flex-1 text-sm font-mono font-bold text-foreground select-all">{viewedPassword.password}</code>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2"
                    onClick={() => {
                      navigator.clipboard.writeText(viewedPassword.password);
                      toast({ title: "تم نسخ كلمة المرور" });
                    }}
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-900 space-y-1">
                <p>📅 آخر كلمة مرور حُفظت في: <strong>{new Date(viewedPassword.created_at).toLocaleString("ar-EG")}</strong></p>
                <p>⚠️ ملاحظة: لو الموظف غيّر كلمة سره بنفسه بعد التاريخ ده، الكلمة الظاهرة هنا مش هتكون صحيحة. استخدم زر "إعادة تعيين" لإنشاء كلمة جديدة.</p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setViewPasswordTarget(null)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Tabs>
  );
};

export default AdminStaffRoles;
