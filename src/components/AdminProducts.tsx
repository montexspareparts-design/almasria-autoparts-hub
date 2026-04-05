import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Search, Pencil, Trash2, Package, ChevronRight, ChevronLeft, Copy, Check, RefreshCw } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import AdminProductForm from "@/components/admin/AdminProductForm";
import type { Database } from "@/integrations/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];
type ProductBrand = Database["public"]["Enums"]["product_brand"];

const brandLabels: Record<ProductBrand, string> = {
  toyota_genuine: "تويوتا أصلي",
  toyota_oils: "زيوت تويوتا",
  mtx_aftermarket: "MTX",
  denso: "DENSO",
  aisin: "AISIN",
  fbk: "FBK Brake Pads",
};

const PAGE_SIZE = 20;

const AdminProducts = () => {
  const { toast } = useToast();
  const [products, setProducts] = useState<Product[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [search, setSearch] = useState("");
  const [brandFilter, setBrandFilter] = useState("all");
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [copiedSku, setCopiedSku] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);

  const handleErpSync = async () => {
    setSyncing(true);
    try {
      const [stockRes, priceRes] = await Promise.all([
        supabase.functions.invoke("erp-sync-outbound", { body: { action: "sync_stock" } }),
        supabase.functions.invoke("erp-sync-outbound", { body: { action: "sync_prices" } }),
      ]);

      const stockData = stockRes.data;
      const priceData = priceRes.data;

      const stockUpdated = stockData?.updated ?? stockData?.result?.updated ?? 0;
      const priceUpdated = priceData?.updated ?? priceData?.result?.updated ?? 0;

      toast({
        title: "✅ تمت المزامنة بنجاح",
        description: `أرصدة: ${stockUpdated} صنف | أسعار: ${priceUpdated} صنف`,
      });
      fetchProducts();
    } catch (err: any) {
      toast({ title: "خطأ في المزامنة", description: err.message, variant: "destructive" });
    }
    setSyncing(false);
  };

  const handleCopySku = (sku: string) => {
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    toast({ title: `تم نسخ رقم القطعة: ${sku}` });
    setTimeout(() => setCopiedSku(null), 2000);
  };

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    let query = supabase.from("products").select("*", { count: "exact" });

    if (search.trim()) {
      query = query.or(`sku.ilike.%${search.trim()}%,name_ar.ilike.%${search.trim()}%,name_en.ilike.%${search.trim()}%`);
    }
    if (brandFilter !== "all") {
      query = query.eq("brand", brandFilter as ProductBrand);
    }

    const { data, count } = await query
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

    setProducts(data || []);
    setTotalCount(count || 0);
    setLoading(false);
  }, [page, search, brandFilter]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  // Reset page on filter change
  useEffect(() => { setPage(0); }, [search, brandFilter]);

  const handleDelete = async (product: Product) => {
    const { error } = await supabase.from("products").delete().eq("id", product.id);
    if (error) {
      toast({ title: "خطأ في الحذف", description: error.message, variant: "destructive" });
    } else {
      toast({ title: `تم حذف "${product.name_ar}"` });
      fetchProducts();
    }
  };

  const handleFormSaved = () => {
    setShowForm(false);
    setEditProduct(null);
    fetchProducts();
  };

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  return (
    <Card>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <CardTitle className="flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" />
          إدارة المنتجات
          <span className="text-sm font-normal text-muted-foreground">({totalCount} منتج)</span>
        </CardTitle>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" className="gap-2" onClick={handleErpSync} disabled={syncing}>
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            مزامنة الفيصل
          </Button>
          <Button size="sm" className="gap-2" onClick={() => { setEditProduct(null); setShowForm(true); }}>
            <Plus className="w-4 h-4" />
            إضافة منتج
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Form */}
        {showForm && (
          <AdminProductForm
            product={editProduct}
            onClose={() => { setShowForm(false); setEditProduct(null); }}
            onSaved={handleFormSaved}
          />
        )}

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="بحث بالاسم أو رقم القطعة..."
              className="pr-9"
              dir="rtl"
            />
          </div>
          <Select value={brandFilter} onValueChange={setBrandFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="كل الماركات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الماركات</SelectItem>
              {Object.entries(brandLabels).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Product List */}
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : products.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">لا توجد منتجات مطابقة</p>
        ) : (
          <div className="space-y-2">
            {products.map(product => (
              <div
                key={product.id}
                className="flex items-center justify-between border border-border rounded-lg p-3 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  {product.image_url ? (
                    <img src={product.image_url} alt="" className="w-10 h-10 rounded object-cover shrink-0 bg-muted" />
                  ) : (
                    <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-muted-foreground" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{product.name_ar}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span dir="ltr" className="font-mono">{product.sku}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleCopySku(product.sku); }}
                        className="p-0.5 rounded hover:bg-muted transition-colors"
                        title="نسخ رقم القطعة"
                      >
                        {copiedSku === product.sku ? (
                          <Check className="w-3 h-3 text-green-500" />
                        ) : (
                          <Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                        )}
                      </button>
                      <span>•</span>
                      <span className="bg-secondary text-secondary-foreground px-1.5 py-0.5 rounded text-[10px]">
                        {brandLabels[product.brand]}
                      </span>
                      <span>•</span>
                      <span>{product.base_price} ج.م</span>
                      {!product.is_active && (
                        <>
                          <span>•</span>
                          <span className="text-destructive">غير نشط</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => { setEditProduct(product); setShowForm(true); }}
                    title="تعديل"
                  >
                    <Pencil className="w-4 h-4 text-primary" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon" title="حذف">
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>تأكيد حذف المنتج</AlertDialogTitle>
                        <AlertDialogDescription>
                          هل أنت متأكد من حذف "{product.name_ar}" ({product.sku})؟
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(product)} className="bg-destructive hover:bg-destructive/90">
                          حذف
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
            <span className="text-sm text-muted-foreground">
              {page + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage(p => p + 1)}
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminProducts;
