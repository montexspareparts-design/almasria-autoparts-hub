import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, X } from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];
type ProductBrand = Database["public"]["Enums"]["product_brand"];

interface Category {
  id: string;
  name_ar: string;
  name_en: string | null;
}

const brandLabels: Record<ProductBrand, string> = {
  toyota_genuine: "تويوتا أصلي",
  toyota_oils: "زيوت تويوتا",
  mtx_aftermarket: "MTX Aftermarket",
  denso: "DENSO",
  aisin: "AISIN",
  fbk: "FBK Brake Pads",
  ibk: "IBK",
  other: "أخرى",
};

interface Props {
  product: Product | null;
  onClose: () => void;
  onSaved: () => void;
}

const AdminProductForm = ({ product, onClose, onSaved }: Props) => {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  const [form, setForm] = useState({
    sku: product?.sku || "",
    name_ar: product?.name_ar || "",
    name_en: product?.name_en || "",
    description_ar: product?.description_ar || "",
    description_en: product?.description_en || "",
    brand: (product?.brand || "toyota_genuine") as ProductBrand,
    category_id: product?.category_id || "",
    base_price: product?.base_price?.toString() || "0",
    sale_price: product?.sale_price?.toString() || "",
    stock_quantity: product?.stock_quantity?.toString() || "0",
    safety_stock: (product as any)?.safety_stock?.toString() || "0",
    max_order_cap: (product as any)?.max_order_cap?.toString() || "",
    min_order_qty: product?.min_order_qty?.toString() || "1",
    image_url: product?.image_url || "",
    is_active: product?.is_active ?? true,
    is_featured: product?.is_featured ?? false,
    is_on_sale: product?.is_on_sale ?? false,
  });

  useEffect(() => {
    supabase.from("product_categories").select("id, name_ar, name_en").order("sort_order").then(({ data }) => {
      setCategories(data || []);
    });
  }, []);

  const set = (key: string, value: string | boolean) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSave = async () => {
    if (!form.sku || !form.name_ar || !form.brand) {
      toast({ title: "يرجى ملء الحقول المطلوبة (SKU، الاسم، الماركة)", variant: "destructive" });
      return;
    }
    setSaving(true);

    const payload = {
      sku: form.sku.trim(),
      name_ar: form.name_ar.trim(),
      name_en: form.name_en.trim() || null,
      description_ar: form.description_ar.trim() || null,
      description_en: form.description_en.trim() || null,
      brand: form.brand,
      category_id: form.category_id || null,
      base_price: parseFloat(form.base_price) || 0,
      sale_price: form.sale_price ? parseFloat(form.sale_price) : null,
      stock_quantity: parseInt(form.stock_quantity) || 0,
      safety_stock: parseInt(form.safety_stock) || 0,
      max_order_cap: form.max_order_cap ? parseInt(form.max_order_cap) : null,
      min_order_qty: parseInt(form.min_order_qty) || 1,
      image_url: form.image_url.trim() || null,
      is_active: form.is_active,
      is_featured: form.is_featured,
      is_on_sale: form.is_on_sale,
    };

    let error;
    if (product) {
      ({ error } = await supabase.from("products").update(payload).eq("id", product.id));
    } else {
      ({ error } = await supabase.from("products").insert(payload));
    }

    if (error) {
      toast({ title: "خطأ في الحفظ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: product ? "تم تحديث المنتج ✅" : "تم إضافة المنتج ✅" });
      onSaved();
    }
    setSaving(false);
  };

  return (
    <div className="border border-primary/20 rounded-lg p-5 bg-primary/5 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-foreground text-lg">{product ? "تعديل المنتج" : "إضافة منتج جديد"}</h3>
        <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label>رقم القطعة (SKU) *</Label>
          <Input value={form.sku} onChange={e => set("sku", e.target.value)} placeholder="04152-YZZA1" dir="ltr" />
        </div>
        <div className="space-y-1">
          <Label>الاسم بالعربي *</Label>
          <Input value={form.name_ar} onChange={e => set("name_ar", e.target.value)} placeholder="فلتر زيت تويوتا" dir="rtl" />
        </div>
        <div className="space-y-1">
          <Label>الاسم بالإنجليزي</Label>
          <Input value={form.name_en} onChange={e => set("name_en", e.target.value)} placeholder="Toyota Oil Filter" dir="ltr" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>الماركة *</Label>
          <Select value={form.brand} onValueChange={v => set("brand", v)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(brandLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>الفئة</Label>
          <Select value={form.category_id} onValueChange={v => set("category_id", v)}>
            <SelectTrigger><SelectValue placeholder="اختر الفئة" /></SelectTrigger>
            <SelectContent>
              {categories.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.name_ar}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label>السعر الأساسي</Label>
          <Input type="number" value={form.base_price} onChange={e => set("base_price", e.target.value)} dir="ltr" />
        </div>
        <div className="space-y-1">
          <Label>سعر التخفيض</Label>
          <Input type="number" value={form.sale_price} onChange={e => set("sale_price", e.target.value)} dir="ltr" />
        </div>
        <div className="space-y-1">
          <Label>المخزون</Label>
          <Input type="number" value={form.stock_quantity} onChange={e => set("stock_quantity", e.target.value)} dir="ltr" />
        </div>
        <div className="space-y-1">
          <Label>حد الأمان (Safety Stock)</Label>
          <Input type="number" value={form.safety_stock} onChange={e => set("safety_stock", e.target.value)} dir="ltr" placeholder="0" />
          <p className="text-[10px] text-muted-foreground">الكمية المحجوزة كاحتياطي — لا تُباع</p>
        </div>
        <div className="space-y-1">
          <Label>أقصى كمية للطلب</Label>
          <Input type="number" value={form.max_order_cap} onChange={e => set("max_order_cap", e.target.value)} dir="ltr" placeholder="بدون حد" />
          <p className="text-[10px] text-muted-foreground">أقصى كمية يطلبها عميل واحد</p>
        </div>
        <div className="space-y-1">
          <Label>أقل كمية طلب</Label>
          <Input type="number" value={form.min_order_qty} onChange={e => set("min_order_qty", e.target.value)} dir="ltr" />
        </div>
      </div>

      <div className="space-y-1">
        <Label>رابط الصورة</Label>
        <Input value={form.image_url} onChange={e => set("image_url", e.target.value)} placeholder="https://..." dir="ltr" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>وصف بالعربي</Label>
          <Textarea value={form.description_ar} onChange={e => set("description_ar", e.target.value)} rows={2} dir="rtl" />
        </div>
        <div className="space-y-1">
          <Label>وصف بالإنجليزي</Label>
          <Textarea value={form.description_en} onChange={e => set("description_en", e.target.value)} rows={2} dir="ltr" />
        </div>
      </div>

      <div className="flex flex-wrap gap-6">
        <div className="flex items-center gap-2">
          <Switch checked={form.is_active} onCheckedChange={v => set("is_active", v)} />
          <Label>نشط</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={form.is_featured} onCheckedChange={v => set("is_featured", v)} />
          <Label>مميز</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch checked={form.is_on_sale} onCheckedChange={v => set("is_on_sale", v)} />
          <Label>عرض خاص</Label>
        </div>
      </div>

      <div className="flex gap-3">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {saving ? "جاري الحفظ..." : "حفظ"}
        </Button>
        <Button variant="outline" onClick={onClose}>إلغاء</Button>
      </div>
    </div>
  );
};

export default AdminProductForm;
