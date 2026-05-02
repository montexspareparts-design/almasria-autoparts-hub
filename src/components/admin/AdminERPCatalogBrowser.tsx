import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Search, RefreshCw, Package, CheckCircle2, EyeOff, Eye } from "lucide-react";

type ViewMode = "missing" | "onsite";

type CacheRow = {
  erp_id: string;
  name: string;
  qty: number | null;
  retail_price: number | null;
  wholesale_price: number | null;
};

const PAGE_SIZE = 50;

export function AdminERPCatalogBrowser() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CacheRow[]>([]);
  const [existingSkus, setExistingSkus] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [adding, setAdding] = useState<Record<string, boolean>>({});
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [minQty, setMinQty] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch all ERP cache rows (~12k) and all active product SKUs in parallel
      const [{ data: cacheData, error: cacheErr }, { data: prodData, error: prodErr }] = await Promise.all([
        supabase.from("erp_full_catalog_cache").select("erp_id, name, qty, retail_price, wholesale_price").limit(20000),
        supabase.from("products").select("sku, erp_item_code").eq("is_active", true),
      ]);

      if (cacheErr) throw cacheErr;
      if (prodErr) throw prodErr;

      const skuSet = new Set<string>();
      (prodData ?? []).forEach((p: any) => {
        if (p.sku) skuSet.add(String(p.sku));
        if (p.erp_item_code) skuSet.add(String(p.erp_item_code));
      });

      setExistingSkus(skuSet);
      setRows((cacheData ?? []) as CacheRow[]);
    } catch (err: any) {
      toast({ title: "خطأ في التحميل", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Only items NOT on the site, filtered by search + min qty
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (existingSkus.has(r.erp_id)) return false;
      if ((r.qty ?? 0) < minQty) return false;
      if (!q) return true;
      return r.erp_id.toLowerCase().includes(q) || (r.name ?? "").toLowerCase().includes(q);
    });
  }, [rows, existingSkus, search, minQty]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageRows = filtered.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => { setPage(0); }, [search, minQty]);

  const handleAdd = async (row: CacheRow) => {
    setAdding((s) => ({ ...s, [row.erp_id]: true }));
    try {
      const { data, error } = await supabase.functions.invoke("erp-add-product-to-site", {
        body: { erp_id: row.erp_id, trigger_image_discovery: true },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);

      setAdded((s) => new Set(s).add(row.erp_id));
      setExistingSkus((s) => {
        const n = new Set(s);
        n.add(row.erp_id);
        return n;
      });
      toast({
        title: "✅ تمت الإضافة للموقع",
        description: `${row.name} — جاري اكتشاف الصور تلقائياً`,
      });
    } catch (err: any) {
      toast({ title: "فشل الإضافة", description: err.message, variant: "destructive" });
    } finally {
      setAdding((s) => ({ ...s, [row.erp_id]: false }));
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  return (
    <div className="space-y-4">
      <Card className="border-2 border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 flex-wrap">
            <Package className="w-5 h-5 text-primary" />
            <span>كل أصناف الفيصل غير الموجودة على الموقع</span>
            <Badge variant="secondary" className="mr-auto">
              {loading ? "..." : `${filtered.length} صنف متاح للإضافة`}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_auto] gap-2 items-center">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث بالكود أو الاسم..."
                className="pr-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground whitespace-nowrap">حد أدنى للرصيد:</span>
              <Input
                type="number"
                min={0}
                value={minQty}
                onChange={(e) => setMinQty(Math.max(0, Number(e.target.value) || 0))}
                className="w-20"
              />
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              تحديث
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="mr-2 text-sm text-muted-foreground">جاري تحميل أصناف الفيصل...</span>
            </div>
          ) : pageRows.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              لا توجد أصناف مطابقة. جرب تغيير البحث أو الحد الأدنى للرصيد.
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden bg-background">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 text-xs">
                    <tr>
                      <th className="p-2 text-right">كود الصنف</th>
                      <th className="p-2 text-right">اسم الصنف (الفيصل)</th>
                      <th className="p-2 text-center">الرصيد</th>
                      <th className="p-2 text-center">سعر القطاعي</th>
                      <th className="p-2 text-center">سعر الجملة</th>
                      <th className="p-2 text-center">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageRows.map((r) => {
                      const isAdding = !!adding[r.erp_id];
                      const isAdded = added.has(r.erp_id);
                      return (
                        <tr key={r.erp_id} className="border-t hover:bg-muted/30">
                          <td className="p-2 font-mono text-xs">{r.erp_id}</td>
                          <td className="p-2">{r.name}</td>
                          <td className="p-2 text-center">
                            <Badge variant={(r.qty ?? 0) > 10 ? "default" : "secondary"}>
                              {r.qty ?? 0}
                            </Badge>
                          </td>
                          <td className="p-2 text-center text-xs">
                            {r.retail_price ? `${Number(r.retail_price).toLocaleString("ar-EG")} ج.م` : "—"}
                          </td>
                          <td className="p-2 text-center text-xs text-muted-foreground">
                            {r.wholesale_price ? `${Number(r.wholesale_price).toLocaleString("ar-EG")} ج.م` : "—"}
                          </td>
                          <td className="p-2 text-center">
                            {isAdded ? (
                              <Badge className="bg-green-600 hover:bg-green-700">
                                <CheckCircle2 className="w-3 h-3 ml-1" />
                                تمت الإضافة
                              </Badge>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => handleAdd(r)}
                                disabled={isAdding}
                                className="gap-1"
                              >
                                {isAdding ? (
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                ) : (
                                  <Plus className="w-3 h-3" />
                                )}
                                {isAdding ? "جاري..." : "إضافة للموقع"}
                              </Button>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={safePage === 0}
                  >
                    السابق
                  </Button>
                  <span className="text-xs text-muted-foreground">
                    صفحة {safePage + 1} من {totalPages} • {filtered.length} صنف
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={safePage >= totalPages - 1}
                  >
                    التالي
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
