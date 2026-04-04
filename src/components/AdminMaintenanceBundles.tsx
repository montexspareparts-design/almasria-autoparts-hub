import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { Plus, Pencil, Trash2, Package, Loader2, GripVertical } from "lucide-react";

interface BundleForm {
  id?: string;
  name_ar: string;
  name_en: string;
  description_ar: string;
  bundle_price: number;
  original_price: number;
  is_active: boolean;
  sort_order: number;
  image_url: string;
}

const emptyForm: BundleForm = {
  name_ar: "", name_en: "", description_ar: "", bundle_price: 0,
  original_price: 0, is_active: true, sort_order: 0, image_url: "",
};

const AdminMaintenanceBundles = () => {
  const qc = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [itemsDialogOpen, setItemsDialogOpen] = useState(false);
  const [form, setForm] = useState<BundleForm>(emptyForm);
  const [editingBundleId, setEditingBundleId] = useState<string | null>(null);

  const { data: bundles, isLoading } = useQuery({
    queryKey: ["admin_bundles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_bundles")
        .select("*, bundle_items(*, products(id, name_ar, sku))")
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["admin_products_for_bundles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name_ar, sku, base_price")
        .eq("is_active", true)
        .order("name_ar");
      if (error) throw error;
      return data;
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (f: BundleForm) => {
      const payload = {
        name_ar: f.name_ar,
        name_en: f.name_en || null,
        description_ar: f.description_ar || null,
        bundle_price: f.bundle_price,
        original_price: f.original_price,
        is_active: f.is_active,
        sort_order: f.sort_order,
        image_url: f.image_url || null,
      };
      if (f.id) {
        const { error } = await supabase.from("maintenance_bundles").update(payload).eq("id", f.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("maintenance_bundles").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_bundles"] });
      qc.invalidateQueries({ queryKey: ["maintenance_bundles"] });
      setDialogOpen(false);
      toast({ title: form.id ? "تم تحديث الباقة ✅" : "تمت إضافة الباقة ✅" });
    },
    onError: () => toast({ title: "حدث خطأ", variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("bundle_items").delete().eq("bundle_id", id);
      const { error } = await supabase.from("maintenance_bundles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_bundles"] });
      qc.invalidateQueries({ queryKey: ["maintenance_bundles"] });
      toast({ title: "تم حذف الباقة 🗑️" });
    },
  });

  const [selectedBundleForItems, setSelectedBundleForItems] = useState<any>(null);
  const [newItemProductId, setNewItemProductId] = useState("");
  const [newItemQty, setNewItemQty] = useState(1);

  const addItemMutation = useMutation({
    mutationFn: async ({ bundleId, productId, qty }: { bundleId: string; productId: string; qty: number }) => {
      const { error } = await supabase.from("bundle_items").insert({
        bundle_id: bundleId,
        product_id: productId,
        quantity: qty,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_bundles"] });
      qc.invalidateQueries({ queryKey: ["maintenance_bundles"] });
      setNewItemProductId("");
      setNewItemQty(1);
      toast({ title: "تمت إضافة المنتج للباقة ✅" });
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await supabase.from("bundle_items").delete().eq("id", itemId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_bundles"] });
      qc.invalidateQueries({ queryKey: ["maintenance_bundles"] });
      toast({ title: "تم حذف المنتج من الباقة" });
    },
  });

  const openEdit = (bundle: any) => {
    setForm({
      id: bundle.id,
      name_ar: bundle.name_ar,
      name_en: bundle.name_en || "",
      description_ar: bundle.description_ar || "",
      bundle_price: bundle.bundle_price,
      original_price: bundle.original_price,
      is_active: bundle.is_active,
      sort_order: bundle.sort_order || 0,
      image_url: bundle.image_url || "",
    });
    setDialogOpen(true);
  };

  const openItems = (bundle: any) => {
    setSelectedBundleForItems(bundle);
    setItemsDialogOpen(true);
  };

  const currentBundleItems = bundles?.find((b: any) => b.id === selectedBundleForItems?.id)?.bundle_items || [];

  if (isLoading) return <div className="flex justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">باقات الصيانة الذكية</h2>
        <Button onClick={() => { setForm(emptyForm); setDialogOpen(true); }} className="gap-2">
          <Plus className="w-4 h-4" /> إضافة باقة
        </Button>
      </div>

      <div className="space-y-3">
        {bundles?.map((bundle: any) => {
          const savings = bundle.original_price - bundle.bundle_price;
          const savingsPercent = bundle.original_price > 0 ? Math.round((savings / bundle.original_price) * 100) : 0;
          const itemCount = bundle.bundle_items?.length || 0;

          return (
            <Card key={bundle.id} className={`border ${bundle.is_active ? "border-border" : "border-destructive/30 opacity-60"}`}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Package className="w-4 h-4 text-primary shrink-0" />
                      <h3 className="font-bold text-foreground truncate">{bundle.name_ar}</h3>
                      {!bundle.is_active && (
                        <span className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-bold">معطلة</span>
                      )}
                    </div>
                    {bundle.description_ar && (
                      <p className="text-xs text-muted-foreground mb-2 line-clamp-1">{bundle.description_ar}</p>
                    )}
                    <div className="flex items-center gap-4 text-xs">
                      <span className="text-primary font-bold">{bundle.bundle_price.toLocaleString("ar-EG")} ج.م</span>
                      {savings > 0 && (
                        <span className="text-muted-foreground line-through">{bundle.original_price.toLocaleString("ar-EG")} ج.م</span>
                      )}
                      {savingsPercent > 0 && (
                        <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">توفير {savingsPercent}%</span>
                      )}
                      <span className="text-muted-foreground">{itemCount} منتج</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openItems(bundle)} title="إدارة المنتجات">
                      <GripVertical className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(bundle)}>
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:bg-destructive/10"
                      onClick={() => deleteMutation.mutate(bundle.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {bundles?.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">لا توجد باقات بعد</p>
          </div>
        )}
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>{form.id ? "تعديل الباقة" : "إضافة باقة جديدة"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-foreground">الاسم بالعربي *</label>
              <Input value={form.name_ar} onChange={e => setForm(f => ({ ...f, name_ar: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">الاسم بالإنجليزي</label>
              <Input value={form.name_en} onChange={e => setForm(f => ({ ...f, name_en: e.target.value }))} dir="ltr" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">الوصف</label>
              <Textarea value={form.description_ar} onChange={e => setForm(f => ({ ...f, description_ar: e.target.value }))} rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground">السعر الأصلي</label>
                <Input type="number" value={form.original_price} onChange={e => setForm(f => ({ ...f, original_price: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="text-sm font-medium text-foreground">سعر الباقة</label>
                <Input type="number" value={form.bundle_price} onChange={e => setForm(f => ({ ...f, bundle_price: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-foreground">ترتيب العرض</label>
                <Input type="number" value={form.sort_order} onChange={e => setForm(f => ({ ...f, sort_order: Number(e.target.value) }))} />
              </div>
              <div className="flex items-center gap-3 pt-5">
                <Switch checked={form.is_active} onCheckedChange={v => setForm(f => ({ ...f, is_active: v }))} />
                <label className="text-sm font-medium text-foreground">مفعّلة</label>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-foreground">رابط الصورة</label>
              <Input value={form.image_url} onChange={e => setForm(f => ({ ...f, image_url: e.target.value }))} dir="ltr" placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>إلغاء</Button>
            <Button onClick={() => saveMutation.mutate(form)} disabled={!form.name_ar || saveMutation.isPending} className="gap-2">
              {saveMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {form.id ? "حفظ التعديلات" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={itemsDialogOpen} onOpenChange={setItemsDialogOpen}>
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle>منتجات الباقة: {selectedBundleForItems?.name_ar}</DialogTitle>
          </DialogHeader>

          <div className="space-y-2 max-h-60 overflow-y-auto">
            {currentBundleItems.map((item: any) => (
              <div key={item.id} className="flex items-center justify-between bg-muted/50 rounded-lg px-3 py-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.products?.name_ar || "—"}</p>
                  <p className="text-[10px] text-muted-foreground" dir="ltr">{item.products?.sku}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded font-bold">×{item.quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive hover:bg-destructive/10"
                    onClick={() => removeItemMutation.mutate(item.id)}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
            {currentBundleItems.length === 0 && (
              <p className="text-center text-xs text-muted-foreground py-4">لا توجد منتجات في هذه الباقة</p>
            )}
          </div>

          <div className="border-t border-border pt-4">
            <p className="text-sm font-medium text-foreground mb-2">إضافة منتج</p>
            <div className="flex gap-2">
              <Select value={newItemProductId} onValueChange={setNewItemProductId}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="اختر المنتج" />
                </SelectTrigger>
                <SelectContent>
                  {products?.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name_ar} ({p.sku})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={1}
                value={newItemQty}
                onChange={e => setNewItemQty(Number(e.target.value))}
                className="w-20"
                placeholder="الكمية"
              />
              <Button
                size="sm"
                disabled={!newItemProductId || !selectedBundleForItems || addItemMutation.isPending}
                onClick={() => addItemMutation.mutate({
                  bundleId: selectedBundleForItems.id,
                  productId: newItemProductId,
                  qty: newItemQty,
                })}
              >
                {addItemMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminMaintenanceBundles;
