import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Search, RefreshCw, Package, CheckCircle2, EyeOff, Eye } from "lucide-react";

type CacheRow = {
  erp_id: string;
  name: string;
  qty: number | null;
  retail_price: number | null;
  wholesale_price: number | null;
};

type OnsiteRow = {
  id: string;
  sku: string | null;
  erp_item_code: string | null;
  name_ar: string | null;
  stock_quantity: number | null;
  base_price: number | null;
  is_active: boolean;
  brand: string | null;
};

type ViewMode = "missing" | "onsite";
type SortMode = "qty_desc" | "qty_asc" | "name_asc" | "name_desc";

const PAGE_SIZE = 50;

const arabicCollator = new Intl.Collator("ar-EG", { sensitivity: "base", numeric: true });

export function AdminERPCatalogBrowser() {
  const { toast } = useToast();
  const [viewMode, setViewMode] = useState<ViewMode>("missing");
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<CacheRow[]>([]);
  const [onsiteRows, setOnsiteRows] = useState<OnsiteRow[]>([]);
  const [existingSkus, setExistingSkus] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [adding, setAdding] = useState<Record<string, boolean>>({});
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [minQty, setMinQty] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [showInactive, setShowInactive] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [{ data: cacheData, error: cacheErr }, { data: prodData, error: prodErr }] = await Promise.all([
        supabase.from("erp_full_catalog_cache").select("erp_id, name, qty, retail_price, wholesale_price").limit(20000),
        supabase.from("products").select("id, sku, erp_item_code, name_ar, stock_quantity, base_price, is_active, brand"),
      ]);

      if (cacheErr) throw cacheErr;
      if (prodErr) throw prodErr;

      const skuSet = new Set<string>();
      (prodData ?? []).forEach((p: any) => {
        if (p.is_active) {
          if (p.sku) skuSet.add(String(p.sku));
          if (p.erp_item_code) skuSet.add(String(p.erp_item_code));
        }
      });

      setExistingSkus(skuSet);
      setRows((cacheData ?? []) as CacheRow[]);
      setOnsiteRows((prodData ?? []) as OnsiteRow[]);
    } catch (err: any) {
      toast({ title: "خطأ في التحميل", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Missing items (not on site, filtered by min qty + search)
  const filteredMissing = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (existingSkus.has(r.erp_id)) return false;
      if ((r.qty ?? 0) < minQty) return false;
      if (!q) return true;
      return r.erp_id.toLowerCase().includes(q) || (r.name ?? "").toLowerCase().includes(q);
    });
  }, [rows, existingSkus, search, minQty]);

  // Onsite items (with optional inactive + search filter)
  const filteredOnsite = useMemo(() => {
    const q = search.trim().toLowerCase();
    return onsiteRows.filter((r) => {
      if (!showInactive && !r.is_active) return false;
      if (!q) return true;
      return (
        (r.sku ?? "").toLowerCase().includes(q) ||
        (r.erp_item_code ?? "").toLowerCase().includes(q) ||
        (r.name_ar ?? "").toLowerCase().includes(q)
      );
    });
  }, [onsiteRows, search, showInactive]);

  const activeList: CacheRow[] | OnsiteRow[] = viewMode === "missing" ? filteredMissing : filteredOnsite;
  const totalPages = Math.max(1, Math.ceil(activeList.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageMissing = filteredMissing.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const pageOnsite = filteredOnsite.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  useEffect(() => { setPage(0); }, [search, minQty, viewMode, showInactive]);

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

  const handleToggleActive = async (row: OnsiteRow) => {
    setTogglingId(row.id);
    const next = !row.is_active;
    try {
      const { error } = await supabase
        .from("products")
        .update({ is_active: next } as any)
        .eq("id", row.id);
      if (error) throw error;

      setOnsiteRows((list) => list.map((p) => (p.id === row.id ? { ...p, is_active: next } : p)));

      // keep existingSkus in sync (so the missing list updates correctly)
      const code = row.sku || row.erp_item_code;
      if (code) {
        setExistingSkus((s) => {
          const n = new Set(s);
          if (next) n.add(code);
          else n.delete(code);
          return n;
        });
      }

      toast({
        title: next ? "✅ تم إظهار الصنف" : "🚫 تم إخفاء الصنف",
        description: row.name_ar || row.sku || "",
      });
    } catch (err: any) {
      toast({ title: "فشل التحديث", description: err.message, variant: "destructive" });
    } finally {
      setTogglingId(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const totalActive = onsiteRows.filter((p) => p.is_active).length;
  const totalInactive = onsiteRows.length - totalActive;

  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant={viewMode === "missing" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("missing")}
          className="gap-1"
        >
          <Plus className="w-4 h-4" />
          غير موجودة على الموقع ({filteredMissing.length})
        </Button>
        <Button
          variant={viewMode === "onsite" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("onsite")}
          className="gap-1"
        >
          <Eye className="w-4 h-4" />
          الموجودة على الموقع ({onsiteRows.length})
        </Button>
        {viewMode === "onsite" && (
          <Badge variant="outline" className="gap-1">
            <span className="text-green-600">●</span> {totalActive} ظاهر
            <span className="mx-1">·</span>
            <span className="text-muted-foreground">●</span> {totalInactive} مخفي
          </Badge>
        )}
      </div>

      <Card className="border-2 border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 flex-wrap">
            <Package className="w-5 h-5 text-primary" />
            <span>
              {viewMode === "missing"
                ? "أصناف الفيصل غير الموجودة على الموقع"
                : "أصناف الموقع — تحكم في الإظهار/الإخفاء"}
            </span>
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
            {viewMode === "missing" ? (
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
            ) : (
              <Button
                variant={showInactive ? "default" : "outline"}
                size="sm"
                onClick={() => setShowInactive((v) => !v)}
              >
                {showInactive ? "إخفاء المخفية" : "إظهار المخفية"}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              تحديث
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="mr-2 text-sm text-muted-foreground">جاري التحميل...</span>
            </div>
          ) : viewMode === "missing" ? (
            pageMissing.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                لا توجد أصناف مطابقة. جرب تغيير البحث أو الحد الأدنى للرصيد.
              </div>
            ) : (
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
                    {pageMissing.map((r) => {
                      const isAdding = !!adding[r.erp_id];
                      const isAdded = added.has(r.erp_id);
                      return (
                        <tr key={r.erp_id} className="border-t hover:bg-muted/30">
                          <td className="p-2 font-mono text-xs">{r.erp_id}</td>
                          <td className="p-2">{r.name}</td>
                          <td className="p-2 text-center">
                            <Badge variant={(r.qty ?? 0) > 10 ? "default" : "secondary"}>{r.qty ?? 0}</Badge>
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
                              <Button size="sm" onClick={() => handleAdd(r)} disabled={isAdding} className="gap-1">
                                {isAdding ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
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
            )
          ) : pageOnsite.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">لا توجد أصناف مطابقة.</div>
          ) : (
            <div className="border rounded-lg overflow-hidden bg-background">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs">
                  <tr>
                    <th className="p-2 text-right">الكود</th>
                    <th className="p-2 text-right">الاسم</th>
                    <th className="p-2 text-center">العلامة</th>
                    <th className="p-2 text-center">الرصيد</th>
                    <th className="p-2 text-center">سعر القطاعي</th>
                    <th className="p-2 text-center">الحالة</th>
                    <th className="p-2 text-center">إجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {pageOnsite.map((p) => {
                    const isToggling = togglingId === p.id;
                    return (
                      <tr key={p.id} className={`border-t hover:bg-muted/30 ${!p.is_active ? "opacity-60" : ""}`}>
                        <td className="p-2 font-mono text-xs">{p.sku || p.erp_item_code || "—"}</td>
                        <td className="p-2">{p.name_ar || "—"}</td>
                        <td className="p-2 text-center text-xs text-muted-foreground">{p.brand || "—"}</td>
                        <td className="p-2 text-center">
                          <Badge variant={(p.stock_quantity ?? 0) > 0 ? "default" : "secondary"}>
                            {p.stock_quantity ?? 0}
                          </Badge>
                        </td>
                        <td className="p-2 text-center text-xs">
                          {p.base_price ? `${Number(p.base_price).toLocaleString("ar-EG")} ج.م` : "—"}
                        </td>
                        <td className="p-2 text-center">
                          {p.is_active ? (
                            <Badge className="bg-green-600 hover:bg-green-700 gap-1">
                              <Eye className="w-3 h-3" />
                              ظاهر
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="gap-1">
                              <EyeOff className="w-3 h-3" />
                              مخفي
                            </Badge>
                          )}
                        </td>
                        <td className="p-2 text-center">
                          <Button
                            size="sm"
                            variant={p.is_active ? "outline" : "default"}
                            onClick={() => handleToggleActive(p)}
                            disabled={isToggling}
                            className="gap-1"
                          >
                            {isToggling ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : p.is_active ? (
                              <EyeOff className="w-3 h-3" />
                            ) : (
                              <Eye className="w-3 h-3" />
                            )}
                            {p.is_active ? "إخفاء" : "إظهار"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

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
                صفحة {safePage + 1} من {totalPages} • {activeList.length} صنف
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
        </CardContent>
      </Card>
    </div>
  );
}
