import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Plus, Search, RefreshCw, Package, CheckCircle2, EyeOff, Eye, Zap } from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type CacheRow = {
  erp_id: string;
  name: string;
  part_number: string | null;
  qty: number | null;
  retail_price: number | null;
  wholesale_price: number | null;
};

type OnsiteRow = {
  id: string;
  sku: string | null;
  erp_item_code: string | null;
  part_number: string | null;
  name_ar: string | null;
  stock_quantity: number | null;
  base_price: number | null;
  is_active: boolean;
  brand: string | null;
};

type ViewMode = "missing" | "onsite" | "visitor";
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
  const [partNumberFilter, setPartNumberFilter] = useState("");
  const [page, setPage] = useState(0);
  const [adding, setAdding] = useState<Record<string, boolean>>({});
  const [added, setAdded] = useState<Set<string>>(new Set());
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [minQty, setMinQty] = useState(1);
  const [refreshing, setRefreshing] = useState(false);
  const [showInactive, setShowInactive] = useState(true);
  const [sortMode, setSortMode] = useState<SortMode>("qty_desc");
  const [brandFilter, setBrandFilter] = useState<string>("all");
  const [bulkRunning, setBulkRunning] = useState(false);
  const [bulkConfirm, setBulkConfirm] = useState<null | { action: "activate" | "hide"; count: number }>(null);
  const [exactCounts, setExactCounts] = useState<{ total: number; active: number; inactive: number; cache: number } | null>(null);

  const loadExactCounts = async () => {
    try {
      const [totalRes, activeRes, inactiveRes, cacheRes] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", true),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("is_active", false),
        supabase.from("erp_full_catalog_cache").select("*", { count: "exact", head: true }),
      ]);
      setExactCounts({
        total: totalRes.count ?? 0,
        active: activeRes.count ?? 0,
        inactive: inactiveRes.count ?? 0,
        cache: cacheRes.count ?? 0,
      });
    } catch (err: any) {
      console.error("Failed to load exact counts:", err);
    }
  };

  const fetchAllPaginated = async <T,>(
    table: "erp_full_catalog_cache" | "products",
    columns: string,
    pageSize = 1000
  ): Promise<T[]> => {
    const all: T[] = [];
    let from = 0;
    while (true) {
      const { data, error } = await supabase
        .from(table)
        .select(columns)
        .range(from, from + pageSize - 1);
      if (error) throw error;
      const chunk = (data ?? []) as T[];
      all.push(...chunk);
      if (chunk.length < pageSize) break;
      from += pageSize;
      if (from > 50000) break; // safety guard
    }
    return all;
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [cacheData, prodData] = await Promise.all([
        fetchAllPaginated<CacheRow>("erp_full_catalog_cache", "erp_id, name, part_number, qty, retail_price, wholesale_price"),
        fetchAllPaginated<OnsiteRow>("products", "id, sku, erp_item_code, part_number, name_ar, stock_quantity, base_price, is_active, brand"),
      ]);

      const skuSet = new Set<string>();
      prodData.forEach((p: any) => {
        if (p.is_active) {
          if (p.sku) skuSet.add(String(p.sku));
          if (p.erp_item_code) skuSet.add(String(p.erp_item_code));
        }
      });

      setExistingSkus(skuSet);
      setRows(cacheData);
      setOnsiteRows(prodData);
    } catch (err: any) {
      toast({ title: "خطأ في التحميل", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    loadExactCounts();
  }, []);

  const sortMissing = (arr: CacheRow[]) => {
    const copy = [...arr];
    switch (sortMode) {
      case "qty_desc": copy.sort((a, b) => (b.qty ?? 0) - (a.qty ?? 0)); break;
      case "qty_asc": copy.sort((a, b) => (a.qty ?? 0) - (b.qty ?? 0)); break;
      case "name_asc": copy.sort((a, b) => arabicCollator.compare(a.name ?? "", b.name ?? "")); break;
      case "name_desc": copy.sort((a, b) => arabicCollator.compare(b.name ?? "", a.name ?? "")); break;
    }
    return copy;
  };

  const sortOnsite = (arr: OnsiteRow[]) => {
    const copy = [...arr];
    switch (sortMode) {
      case "qty_desc": copy.sort((a, b) => (b.stock_quantity ?? 0) - (a.stock_quantity ?? 0)); break;
      case "qty_asc": copy.sort((a, b) => (a.stock_quantity ?? 0) - (b.stock_quantity ?? 0)); break;
      case "name_asc": copy.sort((a, b) => arabicCollator.compare(a.name_ar ?? "", b.name_ar ?? "")); break;
      case "name_desc": copy.sort((a, b) => arabicCollator.compare(b.name_ar ?? "", a.name_ar ?? "")); break;
    }
    return copy;
  };

  // Missing items (not on site, filtered by min qty + search + part number)
  const filteredMissing = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pn = partNumberFilter.trim().toLowerCase();
    const filtered = rows.filter((r) => {
      if (existingSkus.has(r.erp_id)) return false;
      if ((r.qty ?? 0) < minQty) return false;
      if (pn && !(r.part_number ?? "").toLowerCase().includes(pn)) return false;
      if (!q) return true;
      return (
        r.erp_id.toLowerCase().includes(q) ||
        (r.name ?? "").toLowerCase().includes(q)
      );
    });
    return sortMissing(filtered);
  }, [rows, existingSkus, search, partNumberFilter, minQty, sortMode]);

  // Onsite items (with optional inactive + search + brand filter + part number)
  const filteredOnsite = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pn = partNumberFilter.trim().toLowerCase();
    const filtered = onsiteRows.filter((r) => {
      if (!showInactive && !r.is_active) return false;
      if (brandFilter !== "all" && (r.brand ?? "other") !== brandFilter) return false;
      if (pn && !(r.part_number ?? "").toLowerCase().includes(pn)) return false;
      if (!q) return true;
      return (
        (r.sku ?? "").toLowerCase().includes(q) ||
        (r.erp_item_code ?? "").toLowerCase().includes(q) ||
        (r.name_ar ?? "").toLowerCase().includes(q)
      );
    });
    return sortOnsite(filtered);
  }, [onsiteRows, search, partNumberFilter, showInactive, sortMode, brandFilter]);

  const availableBrands = useMemo(() => {
    const set = new Set<string>();
    onsiteRows.forEach((p) => set.add(p.brand ?? "other"));
    return Array.from(set).sort();
  }, [onsiteRows]);

  // ✨ ما يراه الزائر فعلياً = is_active = true (نفس فلتر useProductListing)
  const filteredVisitor = useMemo(() => {
    const q = search.trim().toLowerCase();
    const pn = partNumberFilter.trim().toLowerCase();
    const filtered = onsiteRows.filter((r) => {
      if (!r.is_active) return false;
      if (brandFilter !== "all" && (r.brand ?? "other") !== brandFilter) return false;
      if (pn && !(r.part_number ?? "").toLowerCase().includes(pn)) return false;
      if (!q) return true;
      return (
        (r.sku ?? "").toLowerCase().includes(q) ||
        (r.erp_item_code ?? "").toLowerCase().includes(q) ||
        (r.name_ar ?? "").toLowerCase().includes(q)
      );
    });
    return sortOnsite(filtered);
  }, [onsiteRows, search, partNumberFilter, sortMode, brandFilter]);

  const activeList: CacheRow[] | OnsiteRow[] =
    viewMode === "missing" ? filteredMissing : viewMode === "visitor" ? filteredVisitor : filteredOnsite;
  const totalPages = Math.max(1, Math.ceil(activeList.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages - 1);
  const pageMissing = filteredMissing.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);
  const pageOnsite = (viewMode === "visitor" ? filteredVisitor : filteredOnsite).slice(
    safePage * PAGE_SIZE,
    safePage * PAGE_SIZE + PAGE_SIZE
  );

  useEffect(() => { setPage(0); }, [search, partNumberFilter, minQty, viewMode, showInactive, sortMode, brandFilter]);

  const handleBulkToggle = async (action: "activate" | "hide") => {
    const targets = filteredOnsite.filter((p) => (action === "activate" ? !p.is_active : p.is_active));
    if (targets.length === 0) {
      toast({ title: "لا يوجد أصناف للتطبيق", description: "كل الأصناف المعروضة في الحالة المطلوبة بالفعل." });
      return;
    }
    setBulkRunning(true);
    try {
      const next = action === "activate";
      const ids = targets.map((p) => p.id);
      // Update in chunks to avoid URL length limits
      const chunkSize = 200;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const slice = ids.slice(i, i + chunkSize);
        const { error } = await supabase
          .from("products")
          .update({ is_active: next } as any)
          .in("id", slice);
        if (error) throw error;
      }

      // Update local state
      const idSet = new Set(ids);
      setOnsiteRows((list) => list.map((p) => (idSet.has(p.id) ? { ...p, is_active: next } : p)));
      setExistingSkus((s) => {
        const n = new Set(s);
        targets.forEach((p) => {
          const code = p.sku || p.erp_item_code;
          if (!code) return;
          if (next) n.add(code);
          else n.delete(code);
        });
        return n;
      });

      toast({
        title: next ? `✅ تم تفعيل ${targets.length} صنف` : `🚫 تم إخفاء ${targets.length} صنف`,
        description: brandFilter !== "all" ? `العلامة: ${brandFilter}` : "كل الأصناف المُفلترة",
      });
      loadExactCounts();
    } catch (err: any) {
      toast({ title: "فشل التحديث الجماعي", description: err.message, variant: "destructive" });
    } finally {
      setBulkRunning(false);
      setBulkConfirm(null);
    }
  };

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
      loadExactCounts();
    } catch (err: any) {
      toast({ title: "فشل التحديث", description: err.message, variant: "destructive" });
    } finally {
      setTogglingId(null);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadData(), loadExactCounts()]);
    setRefreshing(false);
  };

  // Use exact counts from DB when available, fallback to local list (which is paginated client-side anyway)
  const totalProducts = exactCounts?.total ?? onsiteRows.length;
  const totalActive = exactCounts?.active ?? onsiteRows.filter((p) => p.is_active).length;
  const totalInactive = exactCounts?.inactive ?? (onsiteRows.length - onsiteRows.filter((p) => p.is_active).length);
  const totalCache = exactCounts?.cache ?? rows.length;

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
          variant={viewMode === "visitor" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("visitor")}
          className="gap-1 border-green-500/50"
        >
          <Eye className="w-4 h-4 text-green-600" />
          🌐 يراها الزائر ({totalActive.toLocaleString("ar-EG")})
        </Button>
        <Button
          variant={viewMode === "onsite" ? "default" : "outline"}
          size="sm"
          onClick={() => setViewMode("onsite")}
          className="gap-1"
        >
          <Package className="w-4 h-4" />
          إجمالي الجدول ({totalProducts.toLocaleString("ar-EG")})
        </Button>
        <Badge variant="outline" className="gap-1 border-green-500/40 bg-green-50 dark:bg-green-950/30">
          <span className="text-green-600">●</span>
          <span className="font-semibold">{totalActive.toLocaleString("ar-EG")}</span>
          <span className="text-xs text-muted-foreground">مفعّل للعملاء</span>
        </Badge>
        <Badge variant="outline" className="gap-1 border-muted">
          <span className="text-muted-foreground">●</span>
          <span className="font-semibold">{totalInactive.toLocaleString("ar-EG")}</span>
          <span className="text-xs text-muted-foreground">مخفي</span>
        </Badge>
        <Badge variant="outline" className="gap-1 border-blue-500/40 bg-blue-50 dark:bg-blue-950/30">
          <Package className="w-3 h-3 text-blue-600" />
          <span className="font-semibold">{totalCache.toLocaleString("ar-EG")}</span>
          <span className="text-xs text-muted-foreground">في كاش الفيصل</span>
        </Badge>
      </div>

      <Card className="border-2 border-primary/30 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2 flex-wrap">
            <Package className="w-5 h-5 text-primary" />
            <span>
              {viewMode === "missing"
                ? "أصناف الفيصل غير الموجودة على الموقع"
                : viewMode === "visitor"
                ? `🌐 الأصناف الظاهرة فعلياً للزائر (${filteredVisitor.length.toLocaleString("ar-EG")})`
                : "أصناف الموقع — تحكم في الإظهار/الإخفاء"}
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap gap-2 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ابحث بالكود أو البارت نمبر أو الاسم..."
                className="pr-10"
              />
            </div>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
              title="ترتيب"
            >
              <option value="qty_desc">الأعلى رصيداً</option>
              <option value="qty_asc">الأقل رصيداً</option>
              <option value="name_asc">أبجدي (أ → ي)</option>
              <option value="name_desc">أبجدي (ي → أ)</option>
            </select>
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
              <>
                <select
                  value={brandFilter}
                  onChange={(e) => setBrandFilter(e.target.value)}
                  className="h-9 rounded-md border border-input bg-background px-2 text-sm"
                  title="فلترة العلامة"
                >
                  <option value="all">كل العلامات</option>
                  {availableBrands.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
                {viewMode === "onsite" && (
                  <Button
                    variant={showInactive ? "default" : "outline"}
                    size="sm"
                    onClick={() => setShowInactive((v) => !v)}
                  >
                    {showInactive ? "إخفاء المخفية" : "إظهار المخفية"}
                  </Button>
                )}
                {viewMode === "visitor" && (
                  <Badge variant="outline" className="border-green-500/40 bg-green-50 dark:bg-green-950/30 gap-1">
                    <Eye className="w-3 h-3 text-green-600" />
                    is_active = true فقط
                  </Badge>
                )}
              </>
            )}
            <Button variant="outline" size="sm" onClick={handleRefresh} disabled={refreshing}>
              {refreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              تحديث
            </Button>
          </div>

          {viewMode === "onsite" && filteredOnsite.length > 0 && (
            <div className="flex flex-wrap gap-2 items-center p-3 rounded-lg border bg-muted/30">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">إجراء جماعي على {filteredOnsite.length} صنف مُفلتر:</span>
              <Button
                size="sm"
                variant="default"
                disabled={bulkRunning}
                onClick={() => setBulkConfirm({ action: "activate", count: filteredOnsite.filter((p) => !p.is_active).length })}
                className="gap-1 bg-green-600 hover:bg-green-700"
              >
                <Eye className="w-3 h-3" />
                تفعيل الكل
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={bulkRunning}
                onClick={() => setBulkConfirm({ action: "hide", count: filteredOnsite.filter((p) => p.is_active).length })}
                className="gap-1"
              >
                <EyeOff className="w-3 h-3" />
                إخفاء الكل
              </Button>
              {bulkRunning && <Loader2 className="w-4 h-4 animate-spin text-primary" />}
            </div>
          )}

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
                      <th className="p-2 text-right">بارت نمبر</th>
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
                          <td className="p-2 font-mono text-xs font-bold">{r.erp_id}</td>
                          <td className="p-2 font-mono text-[11px] text-muted-foreground">{r.part_number || "—"}</td>
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
                    <th className="p-2 text-right">كود الصنف</th>
                    <th className="p-2 text-right">بارت نمبر</th>
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
                        <td className="p-2 font-mono text-xs font-bold">{p.erp_item_code || p.sku || "—"}</td>
                        <td className="p-2 font-mono text-[11px] text-muted-foreground">{p.part_number || "—"}</td>
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

      <AlertDialog open={!!bulkConfirm} onOpenChange={(o) => !o && setBulkConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkConfirm?.action === "activate" ? "تفعيل جماعي" : "إخفاء جماعي"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              سيتم {bulkConfirm?.action === "activate" ? "تفعيل" : "إخفاء"} <strong>{bulkConfirm?.count}</strong> صنف
              {brandFilter !== "all" && <> من العلامة <strong>{brandFilter}</strong></>}
              {search && <> مطابقين للبحث "<strong>{search}</strong>"</>}.
              <br />
              هل أنت متأكد؟
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => bulkConfirm && handleBulkToggle(bulkConfirm.action)}
              className={bulkConfirm?.action === "hide" ? "bg-destructive hover:bg-destructive/90" : ""}
            >
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
