import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Search, Phone, Store, User, Loader2, Trash2, Edit2, Check, X } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";

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

const AdminLeads = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", phone: "", shop_name: "", notes: "" });

  const fetchLeads = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) setLeads(data as Lead[]);
    setLoading(false);
  };

  useEffect(() => { fetchLeads(); }, []);

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

    setSaving(true);

    if (editingId) {
      const { error } = await supabase
        .from("leads")
        .update({
          name: form.name.trim(),
          phone: form.phone.trim(),
          shop_name: form.shop_name.trim() || null,
          notes: form.notes.trim() || null,
        })
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
        .insert({
          name: form.name.trim(),
          phone: form.phone.trim(),
          shop_name: form.shop_name.trim() || null,
          notes: form.notes.trim() || null,
          created_by: user!.id,
        });

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
    setForm({ name: "", phone: "", shop_name: "", notes: "" });
    setShowForm(false);
    setEditingId(null);
  };

  const startEdit = (lead: Lead) => {
    setForm({
      name: lead.name,
      phone: lead.phone,
      shop_name: lead.shop_name || "",
      notes: lead.notes || "",
    });
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

  const filtered = leads.filter(l =>
    l.name.includes(searchQuery) ||
    l.phone.includes(searchQuery) ||
    (l.shop_name || "").includes(searchQuery)
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">إدخال بيانات العملاء</h2>
          <p className="text-sm text-muted-foreground">إدارة العملاء المحتملين الذين أرسلوا بياناتهم للموظفين</p>
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
              <Button size="sm" onClick={handleSubmit} disabled={saving} className="gap-1.5">
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
          placeholder="بحث بالاسم أو الهاتف أو المحل..."
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
                  <th className="px-4 py-3 font-medium">الحالة</th>
                  <th className="px-4 py-3 font-medium">التاريخ</th>
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
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(lead.created_at).toLocaleDateString("ar-EG")}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
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
    </div>
  );
};

export default AdminLeads;
