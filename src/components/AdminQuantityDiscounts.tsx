import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2, Loader2, Layers, Package } from "lucide-react";

interface QtyDiscount {
  id: string;
  product_id: string | null;
  category_id: string | null;
  brand: string | null;
  min_quantity: number;
  discount_type: string;
  discount_value: number;
  is_active: boolean;
  created_at: string;
}

const brandLabels: Record<string, string> = {
  toyota_genuine: "تويوتا أصلي",
  toyota_oils: "زيوت تويوتا",
  mtx_aftermarket: "MTX Aftermarket",
  denso: "DENSO",
  aisin: "AISIN",
  fbk: "FBK",
};

const AdminQuantityDiscounts = () => {
  const [discounts, setDiscounts] = useState<QtyDiscount[]>([]);
  const [categories, setCategories] = useState<{ id: string; name_ar: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    target_type: "brand" as "brand" | "category" | "product",
    brand: "",
    category_id: "",
    product_sku: "",
    min_quantity: 3,
    discount_type: "percentage",
    discount_value: 5,
    is_active: true,
  });

  const fetch = async () => {
    setLoading(true);
    const [{ data: d }, { data: cats }] = await Promise.all([
      supabase.from("quantity_discounts").select("*").order("created_at", { ascending: false }),
      supabase.from("product_categories").select("id, name_ar").order("sort_order"),
    ]);
    if (d) setDiscounts(d as any);
    if (cats) setCategories(cats);
    setLoading(false);
  };

  useEffect(() => { fetch(); }, []);

  const handleSave = async () => {
    if (form.discount_value <= 0 || form.min_quantity < 2) {
      toast.error("الحد الأدنى للكمية 2 وقيمة الخصم أكبر من 0");
      return;
    }

    setSaving(true);
    try {
      const payload: any = {
        min_quantity: form.min_quantity,
        discount_type: form.discount_type,
        discount_value: form.discount_value,
        is_active: form.is_active,
        product_id: null,
        category_id: null,
        brand: null,
      };

      if (form.target_type === "brand") {
        payload.brand = form.brand;
      } else if (form.target_type === "category") {
        payload.category_id = form.category_id;
      } else {
        // Find product by SKU
        const { data: prod } = await supabase.from("products").select("id").eq("sku", form.product_sku).single();
        if (!prod) { toast.error("رقم القطعة غير موجود"); setSaving(false); return; }
        payload.product_id = prod.id;
      }

      const { error } = await supabase.from("quantity_discounts").insert(payload);
      if (error) throw error;

      toast.success("تم إنشاء قاعدة خصم الكمية");
      setDialogOpen(false);
      fetch();
    } catch (err: any) {
      toast.error(err.message || "حدث خطأ");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from("quantity_discounts").delete().eq("id", id);
    toast.success("تم الحذف");
    fetch();
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("quantity_discounts").update({ is_active: !current }).eq("id", id);
    fetch();
  };

  const getTargetLabel = (d: QtyDiscount) => {
    if (d.brand) return brandLabels[d.brand] || d.brand;
    if (d.category_id) {
      const cat = categories.find((c) => c.id === d.category_id);
      return cat?.name_ar || "فئة محذوفة";
    }
    return "منتج محدد";
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">خصومات الكمية</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button><Plus className="w-4 h-4 ml-2" />قاعدة جديدة</Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader><DialogTitle>خصم كمية جديد</DialogTitle></DialogHeader>
            <div className="space-y-4 mt-4">
              <div>
                <Label>ينطبق على</Label>
                <Select value={form.target_type} onValueChange={(v: any) => setForm({ ...form, target_type: v })}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="brand">ماركة كاملة</SelectItem>
                    <SelectItem value="category">فئة منتجات</SelectItem>
                    <SelectItem value="product">منتج محدد (رقم القطعة)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {form.target_type === "brand" && (
                <div>
                  <Label>الماركة</Label>
                  <Select value={form.brand} onValueChange={(v) => setForm({ ...form, brand: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="اختر الماركة" /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(brandLabels).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {form.target_type === "category" && (
                <div>
                  <Label>الفئة</Label>
                  <Select value={form.category_id} onValueChange={(v) => setForm({ ...form, category_id: v })}>
                    <SelectTrigger className="mt-1"><SelectValue placeholder="اختر الفئة" /></SelectTrigger>
                    <SelectContent>
                      {categories.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {form.target_type === "product" && (
                <div>
                  <Label>رقم القطعة (SKU)</Label>
                  <Input value={form.product_sku} onChange={(e) => setForm({ ...form, product_sku: e.target.value })} placeholder="مثال: 04152-YZZA1" dir="ltr" className="mt-1 font-mono" />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>الحد الأدنى للكمية</Label>
                  <Input type="number" value={form.min_quantity} onChange={(e) => setForm({ ...form, min_quantity: +e.target.value })} className="mt-1" min={2} />
                </div>
                <div>
                  <Label>نوع الخصم</Label>
                  <Select value={form.discount_type} onValueChange={(v) => setForm({ ...form, discount_type: v })}>
                    <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">نسبة %</SelectItem>
                      <SelectItem value="fixed_per_unit">مبلغ/وحدة</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>قيمة الخصم {form.discount_type === "percentage" ? "(%)" : "(ج.م / وحدة)"}</Label>
                <Input type="number" value={form.discount_value} onChange={(e) => setForm({ ...form, discount_value: +e.target.value })} className="mt-1" min={0} />
              </div>

              <Button className="w-full" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "إنشاء"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {discounts.length === 0 ? (
        <Card><CardContent className="py-10 text-center text-muted-foreground"><Layers className="w-10 h-10 mx-auto mb-3 opacity-20" /><p>لا توجد قواعد خصم كمية بعد</p></CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {discounts.map((d) => (
            <Card key={d.id} className={!d.is_active ? "opacity-60" : ""}>
              <CardContent className="p-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                    <Package className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm">{getTargetLabel(d)}</span>
                      <Badge variant="outline">
                        {d.min_quantity}+ قطعة → {d.discount_type === "percentage" ? `${Number(d.discount_value)}%` : `${Number(d.discount_value)} ج.م/وحدة`}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Switch checked={d.is_active} onCheckedChange={() => toggleActive(d.id, d.is_active)} />
                  <Button variant="ghost" size="icon" className="text-destructive" onClick={() => handleDelete(d.id)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminQuantityDiscounts;
