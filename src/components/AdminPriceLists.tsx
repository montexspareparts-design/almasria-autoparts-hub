import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, Trash2, Eye, EyeOff, Plus, Search, X, Package } from "lucide-react";

interface PriceListRow {
  id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  version: string | null;
  is_active: boolean;
  created_at: string;
}

interface Product {
  id: string;
  name_ar: string;
  sku: string;
}

const AdminPriceLists = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lists, setLists] = useState<PriceListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", version: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsingPdf, setParsingPdf] = useState(false);

  // Product association
  const [managingList, setManagingList] = useState<PriceListRow | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [linkedProducts, setLinkedProducts] = useState<Product[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [loadingLinked, setLoadingLinked] = useState(false);

  useEffect(() => { fetchLists(); }, []);

  const fetchLists = async () => {
    const { data } = await supabase
      .from("price_lists")
      .select("*")
      .order("created_at", { ascending: false });
    setLists((data as PriceListRow[]) || []);
    setLoading(false);
  };

  const notifyDealers = async (title: string) => {
    const { data: dealers } = await supabase
      .from("dealer_accounts")
      .select("user_id")
      .eq("is_active", true);

    if (!dealers?.length) return;

    const notifications = dealers.map((d) => ({
      user_id: d.user_id,
      title: "📋 كشف أسعار جديد",
      message: `تم رفع كشف أسعار جديد: ${title}. يمكنك الاطلاع عليه وإضافة الأصناف لعرض السعر.`,
      type: "price_list",
    }));

    await supabase.from("notifications").insert(notifications);
  };

  const handleUpload = async () => {
    if (!form.title.trim()) {
      toast({ title: "يرجى إدخال عنوان الكشف", variant: "destructive" });
      return;
    }
    setUploading(true);

    let fileUrl: string | null = null;

    if (selectedFile) {
      const ext = selectedFile.name.split(".").pop();
      const path = `${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("price-lists")
        .upload(path, selectedFile, { contentType: selectedFile.type });

      if (uploadError) {
        toast({ title: "خطأ في رفع الملف", description: uploadError.message, variant: "destructive" });
        setUploading(false);
        return;
      }

      fileUrl = path;
    }

    const { data: newList, error } = await supabase.from("price_lists").insert({
      title: form.title,
      description: form.description || null,
      version: form.version || null,
      file_url: fileUrl,
    }).select().single();

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم رفع الكشف ✓" });
      await notifyDealers(form.title);
      // Open product management for the new list
      if (newList) {
        setManagingList(newList as PriceListRow);
        fetchLinkedProducts((newList as any).id);
      }
    }

    setForm({ title: "", description: "", version: "" });
    setSelectedFile(null);
    setShowForm(false);
    fetchLists();
    setUploading(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("price_lists").update({ is_active: !current }).eq("id", id);
    fetchLists();
  };

  const deleteList = async (id: string) => {
    await supabase.from("price_lists").delete().eq("id", id);
    toast({ title: "تم الحذف" });
    fetchLists();
  };

  // Product association functions
  const fetchLinkedProducts = async (listId: string) => {
    setLoadingLinked(true);
    const { data } = await supabase
      .from("price_list_products")
      .select("product_id, products:product_id(id, name_ar, sku)")
      .eq("price_list_id", listId) as any;

    const products = (data || []).map((d: any) => d.products).filter(Boolean);
    setLinkedProducts(products);
    setLoadingLinked(false);
  };

  const searchProductsForLink = useCallback(async (query: string) => {
    if (query.length < 2) { setProductResults([]); return; }
    setSearchingProducts(true);
    const { data } = await supabase
      .from("products")
      .select("id, name_ar, sku")
      .eq("is_active", true)
      .or(`name_ar.ilike.%${query}%,sku.ilike.%${query}%`)
      .limit(15);
    setProductResults(data || []);
    setSearchingProducts(false);
  }, []);

  useEffect(() => {
    if (!managingList) return;
    const timeout = setTimeout(() => searchProductsForLink(productSearch), 300);
    return () => clearTimeout(timeout);
  }, [productSearch, searchProductsForLink, managingList]);

  const linkProduct = async (productId: string) => {
    if (!managingList) return;
    const { error } = await supabase.from("price_list_products").insert({
      price_list_id: managingList.id,
      product_id: productId,
    } as any);
    if (!error) {
      fetchLinkedProducts(managingList.id);
      setProductSearch("");
      setProductResults([]);
    }
  };

  const unlinkProduct = async (productId: string) => {
    if (!managingList) return;
    await supabase
      .from("price_list_products")
      .delete()
      .eq("price_list_id", managingList.id)
      .eq("product_id", productId);
    fetchLinkedProducts(managingList.id);
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  // Managing products for a specific list
  if (managingList) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            أصناف كشف: {managingList.title}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => { setManagingList(null); setProductSearch(""); setProductResults([]); }}>
            ✕ إغلاق
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search to add */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ابحث عن صنف لإضافته (رقم القطعة أو الاسم)..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="pr-10"
            />
            {productSearch && (
              <button onClick={() => { setProductSearch(""); setProductResults([]); }} className="absolute left-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Search results */}
          {productResults.length > 0 && (
            <div className="border border-border rounded-lg max-h-48 overflow-y-auto">
              {productResults.map(p => {
                const alreadyLinked = linkedProducts.some(lp => lp.id === p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => !alreadyLinked && linkProduct(p.id)}
                    disabled={alreadyLinked}
                    className={`w-full flex items-center gap-2 p-2.5 text-right border-b border-border last:border-0 ${alreadyLinked ? "opacity-50 cursor-not-allowed bg-muted/30" : "hover:bg-muted transition-colors"}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{p.name_ar}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{p.sku}</p>
                    </div>
                    {alreadyLinked ? (
                      <Badge variant="secondary" className="text-[9px]">مضاف</Badge>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Plus className="w-3 h-3 text-primary" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {searchingProducts && <div className="flex justify-center py-2"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>}

          {/* Linked products */}
          <div className="border border-border rounded-lg">
            <div className="p-3 border-b border-border bg-muted/30">
              <p className="text-sm font-bold text-foreground">الأصناف المرتبطة ({linkedProducts.length})</p>
            </div>
            {loadingLinked ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : linkedProducts.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-6">لا توجد أصناف مرتبطة. ابحث وأضف أصناف أعلاه.</p>
            ) : (
              <div className="divide-y divide-border max-h-80 overflow-y-auto">
                {linkedProducts.map(p => (
                  <div key={p.id} className="flex items-center gap-2 p-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{p.name_ar}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{p.sku}</p>
                    </div>
                    <button onClick={() => unlinkProduct(p.id)} className="p-1 hover:bg-destructive/10 rounded">
                      <X className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">إدارة كشوفات الأسعار</CardTitle>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 ml-1" />
          رفع كشف جديد
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/30">
            <Input
              placeholder="عنوان الكشف *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <div className="flex gap-2">
              <Input
                placeholder="رقم الإصدار (اختياري)"
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
                className="w-1/3"
              />
              <Textarea
                placeholder="وصف مختصر (اختياري)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="flex-1"
                rows={2}
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 ml-1" />
                {selectedFile ? selectedFile.name : "اختر ملف PDF"}
              </Button>
              <Button size="sm" onClick={handleUpload} disabled={uploading}>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "رفع وإرسال إشعار"}
              </Button>
            </div>
          </div>
        )}

        {lists.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">لا توجد كشوفات</p>
        ) : (
          <div className="space-y-2">
            {lists.map((list) => (
              <div key={list.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                <FileText className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{list.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {list.version && `${list.version} • `}
                    {new Date(list.created_at).toLocaleDateString("ar-EG")}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => { setManagingList(list); fetchLinkedProducts(list.id); }}>
                  <Package className="w-3.5 h-3.5" />
                  الأصناف
                </Button>
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => toggleActive(list.id, list.is_active)}>
                  {list.is_active ? <Eye className="w-4 h-4 text-emerald-500" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                </Button>
                <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive" onClick={() => deleteList(list.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminPriceLists;
