import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Plus, Trash2, Tag, Copy, Percent, DollarSign, Loader2, BarChart3, Users } from "lucide-react";

interface Coupon {
  id: string;
  code: string;
  description: string | null;
  discount_type: string;
  discount_value: number;
  min_order_amount: number | null;
  max_discount_amount: number | null;
  max_uses: number | null;
  used_count: number;
  valid_from: string | null;
  valid_to: string | null;
  is_active: boolean;
  applies_to_brands: string[];
  created_at: string;
}

const AdminCoupons = () => {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [form, setForm] = useState({
    code: "",
    description: "",
    discount_type: "percentage",
    discount_value: 0,
    min_order_amount: 0,
    max_discount_amount: 0,
    max_uses: 0,
    valid_from: "",
    valid_to: "",
    is_active: true,
  });

  const fetchCoupons = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });
    if (!error && data) setCoupons(data as any);
    setLoading(false);
  };

  useEffect(() => { fetchCoupons(); }, []);

  const resetForm = () => {
    setForm({
      code: "",
      description: "",
      discount_type: "percentage",
      discount_value: 0,
      min_order_amount: 0,
      max_discount_amount: 0,
      max_uses: 0,
      valid_from: "",
      valid_to: "",
      is_active: true,
    });
    setEditingId(null);
  };

  const generateCode = () => {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    let code = "MSR-";
    for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
    setForm({ ...form, code });
  };

  const handleSave = async () => {
    if (!form.code || form.discount_value <= 0) {
      toast.error("يرجى ملء الكود وقيمة الخصم");
      return;
    }
    setSaving(true);
    try {
      const payload: any = {
        code: form.code.toUpperCase(),
        description: form.description || null,
        discount_type: form.discount_type,
        discount_value: form.discount_value,
        min_order_amount: form.min_order_amount || null,
        max_discount_amount: form.max_discount_amount || null,
        max_uses: form.max_uses || null,
        valid_from: form.valid_from || null,
        valid_to: form.valid_to || null,
        is_active: form.is_active,
      };

      if (editingId) {
        const { error } = await supabase.from("coupons").update(payload).eq("id", editingId);
        if (error) throw error;
        toast.success("تم تحديث الكوبون");
      } else {
        const { error } = await supabase.from("coupons").insert(payload);
        if (error) throw error;
        toast.success("تم إنشاء الكوبون");
      }

      setDialogOpen(false);
      resetForm();
      fetchCoupons();
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (c: Coupon) => {
    setForm({
      code: c.code,
      description: c.description || "",
      discount_type: c.discount_type,
      discount_value: Number(c.discount_value),
      min_order_amount: Number(c.min_order_amount) || 0,
      max_discount_amount: Number(c.max_discount_amount) || 0,
      max_uses: c.max_uses || 0,
      valid_from: c.valid_from ? c.valid_from.split("T")[0] : "",
      valid_to: c.valid_to ? c.valid_to.split("T")[0] : "",
      is_active: c.is_active,
    });
    setEditingId(c.id);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("coupons").delete().eq("id", id);
    if (error) toast.error("خطأ في الحذف");
    else { toast.success("تم حذف الكوبون"); fetchCoupons(); }
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("coupons").update({ is_active: !current }).eq("id", id);
    fetchCoupons();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("تم نسخ الكود");
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">إدارة الكوبونات</h2>
        <Dialog open={dialogOpen} onOpenChange={(v) => { setDialogOpen(v); if (!v) resetForm(); }}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 ml-2" />كوبون جديد</Button>
          </DialogTrigger>
          <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? "تعديل الكوبون" : "كوبون جديد"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>كود الخصم</Label>
                <div className="flex gap-2 mt-1">
                  <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="MSR-XXXXX" dir="ltr" className="font-mono" />
                  <Button variant="outline" size="sm" onClick={generateCode} type="button">توليد</Button>
                </div>
              </div>
              <div>
                <Label>الوصف</Label>
                <Textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="خصم 10% لعملاء الجملة" className="mt-1" rows={2} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>نوع الخصم</Label>
                  <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">نسبة مئوية %</SelectItem>
                      <SelectItem value="fixed">مبلغ ثابت</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>قيمة الخصم {form.discount_type === "percentage" ? "(%)" : "(ج.م)"}</Label>
                  <Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: +e.target.value })} className="mt-1" min={0} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>الحد الأدنى للطلب (ج.م)</Label>
                  <Input type="number" value={form.min_order_amount} onChange={(e) => setForm({ ...form, min_order_amount: +e.target.value })} className="mt-1" min={0} />
                </div>
                <div>
                  <Label>أقصى خصم (ج.م)</Label>
                  <Input type="number" value={form.max_discount_amount} onChange={(e) => setForm({ ...form, max_discount_amount: +e.target.value })} className="mt-1" min={0} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>الحد الأقصى للاستخدام</Label>
                  <Input type="number" value={form.max_uses} onChange={(e) => setForm({ ...form, max_uses: +e.target.value })} className="mt-1" min={0} placeholder="0 = بلا حدود" />
                </div>
                <div className="flex items-end gap-2 pb-1">
                  <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
                  <Label>مفعّل</Label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>يبدأ من</Label>
                  <Input type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} className="mt-1" />
                </div>
                <div>
                  <Label>ينتهي في</Label>
                  <Input type="date" value={form.valid_to} onChange={(e) => setForm({ ...form, valid_to: e.target.value })} className="mt-1" />
                </div>
              </div>
              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : editingId ? "تحديث" : "إنشاء الكوبون"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {coupons.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground"><Tag className="w-10 h-10 mx-auto mb-3 opacity-20" /><p>لا توجد كوبونات بعد</p></CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {coupons.map((c) => (
            <Card key={c.id} className={!c.is_active ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      <code className="text-lg font-bold font-mono text-primary">{c.code}</code>
                      <button onClick={() => copyCode(c.code)} className="text-muted-foreground hover:text-primary"><Copy className="w-3.5 h-3.5" /></button>
                      <Badge variant={c.is_active ? "default" : "secondary"}>
                        {c.is_active ? "مفعّل" : "معطّل"}
                      </Badge>
                      <Badge variant="outline">
                        {c.discount_type === "percentage" ? <><Percent className="w-3 h-3 ml-1" />{Number(c.discount_value)}%</> : <>{Number(c.discount_value).toLocaleString("ar-EG")} ج.م</>}
                      </Badge>
                    </div>
                    {c.description && <p className="text-sm text-muted-foreground mb-2">{c.description}</p>}
                    <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />استُخدم {c.used_count}{c.max_uses ? ` / ${c.max_uses}` : ""} مرة</span>
                      {c.min_order_amount ? <span>الحد الأدنى: {Number(c.min_order_amount).toLocaleString("ar-EG")} ج.م</span> : null}
                      {c.valid_to && <span>ينتهي: {new Date(c.valid_to).toLocaleDateString("ar-EG")}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch checked={c.is_active} onCheckedChange={() => toggleActive(c.id, c.is_active)} />
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(c)}>تعديل</Button>
                    <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(c.id)}><Trash2 className="w-4 h-4" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminCoupons;
