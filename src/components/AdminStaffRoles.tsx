import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Loader2, UserPlus, Trash2, Shield, Search, Users } from "lucide-react";

interface StaffMember {
  id: string;
  user_id: string;
  role: string;
  created_at: string;
  email?: string;
  full_name?: string;
}

const AdminStaffRoles = () => {
  const { toast } = useToast();
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);

  const fetchStaff = async () => {
    setLoading(true);
    // Get all moderator roles
    const { data: roles, error } = await supabase
      .from("user_roles")
      .select("*")
      .eq("role", "moderator");

    if (error) {
      toast({ title: "خطأ في تحميل الموظفين", variant: "destructive" });
      setLoading(false);
      return;
    }

    // Enrich with profile data
    const enriched: StaffMember[] = [];
    for (const role of roles || []) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("email, full_name")
        .eq("user_id", role.user_id)
        .maybeSingle();

      enriched.push({
        ...role,
        email: profile?.email || "",
        full_name: profile?.full_name || "",
      });
    }

    setStaff(enriched);
    setLoading(false);
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleAddModerator = async () => {
    if (!newEmail.trim()) return;
    setAdding(true);

    // Find user by email in profiles
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id, full_name, email")
      .eq("email", newEmail.trim().toLowerCase())
      .maybeSingle();

    if (profileError || !profile) {
      toast({ title: "لم يتم العثور على مستخدم بهذا البريد", description: "تأكد من أن المستخدم مسجل في النظام", variant: "destructive" });
      setAdding(false);
      return;
    }

    // Check if already moderator
    const existing = staff.find(s => s.user_id === profile.user_id);
    if (existing) {
      toast({ title: "هذا المستخدم موظف بالفعل", variant: "destructive" });
      setAdding(false);
      return;
    }

    // Check if admin (don't add moderator to admin)
    const { data: adminCheck } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", profile.user_id)
      .eq("role", "admin")
      .maybeSingle();

    if (adminCheck) {
      toast({ title: "هذا المستخدم أدمن بالفعل — لا يحتاج صلاحية موظف", variant: "destructive" });
      setAdding(false);
      return;
    }

    const { error } = await supabase
      .from("user_roles")
      .insert({ user_id: profile.user_id, role: "moderator" });

    if (error) {
      toast({ title: "خطأ في إضافة الصلاحية", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ تم إضافة الموظف بنجاح", description: `تم منح صلاحية موظف لـ ${profile.full_name || profile.email}` });
      setNewEmail("");
      fetchStaff();
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

  const filtered = staff.filter(s =>
    (s.email || "").toLowerCase().includes(search.toLowerCase()) ||
    (s.full_name || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Add new staff */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="w-5 h-5 text-primary" />
            إضافة موظف جديد
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="text-sm font-medium text-muted-foreground mb-1.5 block">البريد الإلكتروني للمستخدم</label>
              <Input
                placeholder="example@email.com"
                value={newEmail}
                onChange={e => setNewEmail(e.target.value)}
                dir="ltr"
                className="text-left"
                onKeyDown={e => e.key === "Enter" && handleAddModerator()}
              />
            </div>
            <Button onClick={handleAddModerator} disabled={adding || !newEmail.trim()} className="gap-2">
              {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
              إضافة
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            يجب أن يكون المستخدم مسجلاً في النظام أولاً. سيحصل على صلاحيات الموظف (متابعة الطلبات، إدارة العملاء، كشوف الأسعار...).
          </p>
        </CardContent>
      </Card>

      {/* Staff list */}
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
              <Input
                placeholder="بحث بالاسم أو البريد..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pr-9 text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
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
                  <TableHead className="text-right w-24">إجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(member => (
                  <TableRow key={member.id}>
                    <TableCell className="font-medium">{member.full_name || "—"}</TableCell>
                    <TableCell dir="ltr" className="text-left text-muted-foreground">{member.email || "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(member.created_at).toLocaleDateString("ar-EG")}
                    </TableCell>
                    <TableCell>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10 h-8 w-8">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>حذف صلاحية الموظف؟</AlertDialogTitle>
                            <AlertDialogDescription>
                              سيتم إزالة صلاحيات الموظف من {member.full_name || member.email}. لن يتمكن من الوصول للوحة الإدارة.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>إلغاء</AlertDialogCancel>
                            <AlertDialogAction onClick={() => handleRemoveModerator(member)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                              حذف
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminStaffRoles;
