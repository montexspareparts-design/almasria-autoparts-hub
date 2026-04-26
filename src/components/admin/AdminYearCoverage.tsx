import { useState, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, RefreshCw, Save, AlertTriangle, CheckCircle2, Wrench } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ProductRow {
  id: string;
  sku: string;
  name_ar: string;
  year_from: number | null;
  year_to: number | null;
  compatible_models: string[] | null;
  brand: string;
}

/**
 * Admin tool to review & override year coverage ranges that were
 * auto-inferred from product names.
 */
export default function AdminYearCoverage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "missing" | "single_year" | "wide_range" | "invalid">("all");
  const [edits, setEdits] = useState<Record<string, { year_from?: number | null; year_to?: number | null }>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [running, setRunning] = useState(false);
  const [fixing, setFixing] = useState(false);

  const CURRENT_YEAR = new Date().getFullYear();
  // قيمة غير منطقية: نهاية أصغر من بداية، أو سنة بداية أكبر من المستقبل القريب، أو نهاية أبعد من سنتين قادمتين
  const isInvalidRow = (p: { year_from: number | null; year_to: number | null }) => {
    if (p.year_from == null) return false;
    if (p.year_to != null && p.year_to < p.year_from) return true;
    if (p.year_from < 1950 || p.year_from > CURRENT_YEAR + 1) return true;
    if (p.year_to != null && p.year_to > CURRENT_YEAR + 2) return true;
    return false;
  };

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin_year_coverage_products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, sku, name_ar, year_from, year_to, compatible_models, brand")
        .eq("is_active", true)
        .order("name_ar")
        .limit(1000);
      if (error) throw error;
      return data as ProductRow[];
    },
  });

  const filtered = useMemo(() => {
    if (!products) return [];
    const q = search.trim().toLowerCase();
    return products.filter((p) => {
      if (q && !`${p.name_ar} ${p.sku}`.toLowerCase().includes(q)) return false;
      if (filter === "missing") return p.year_from == null;
      if (filter === "single_year") return p.year_from != null && p.year_to === p.year_from;
      if (filter === "wide_range") return p.year_from != null && p.year_to != null && p.year_to - p.year_from >= 15;
      return true;
    });
  }, [products, search, filter]);

  const stats = useMemo(() => {
    if (!products) return { total: 0, withCoverage: 0, missing: 0, wide: 0 };
    return {
      total: products.length,
      withCoverage: products.filter((p) => p.year_from != null).length,
      missing: products.filter((p) => p.year_from == null).length,
      wide: products.filter((p) => p.year_from != null && p.year_to != null && p.year_to - p.year_from >= 15).length,
    };
  }, [products]);

  const updateEdit = (id: string, field: "year_from" | "year_to", value: string) => {
    const num = value === "" ? null : parseInt(value);
    setEdits((prev) => ({
      ...prev,
      [id]: { ...prev[id], [field]: Number.isNaN(num as number) ? null : num },
    }));
  };

  const saveRow = async (p: ProductRow) => {
    const e = edits[p.id];
    if (!e) return;
    const year_from = e.year_from !== undefined ? e.year_from : p.year_from;
    const year_to = e.year_to !== undefined ? e.year_to : p.year_to;
    if (year_from && year_to && year_to < year_from) {
      toast({ title: "خطأ", description: "سنة النهاية لا يمكن أن تكون أقل من سنة البداية", variant: "destructive" });
      return;
    }
    setSavingId(p.id);
    const { error } = await supabase
      .from("products")
      .update({ year_from, year_to })
      .eq("id", p.id);
    setSavingId(null);
    if (error) {
      toast({ title: "فشل الحفظ", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "✅ تم الحفظ" });
    setEdits((prev) => {
      const cp = { ...prev };
      delete cp[p.id];
      return cp;
    });
    queryClient.invalidateQueries({ queryKey: ["admin_year_coverage_products"] });
  };

  const reRunAutoInference = async () => {
    setRunning(true);
    const { error } = await supabase.rpc("recompute_product_year_coverage");
    setRunning(false);
    if (error) {
      toast({ title: "فشل التحديث", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "✅ تم إعادة الاستنتاج التلقائي لكل المنتجات" });
    queryClient.invalidateQueries({ queryKey: ["admin_year_coverage_products"] });
  };

  return (
    <div dir="rtl" className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="w-5 h-5 text-primary" />
            تغطية السنوات للمنتجات
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            يستنتج النظام تلقائياً نطاق السنوات اللي يغطيها كل منتج (مثلاً: فلتر زيت هاي اس 2005 يغطي من 2005 لـ 2019).
            راجع وعدّل هنا لو الاستنتاج غلط.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-muted/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold">{stats.total}</div>
              <div className="text-xs text-muted-foreground">إجمالي</div>
            </div>
            <div className="bg-emerald-50 dark:bg-emerald-950/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-300">{stats.withCoverage}</div>
              <div className="text-xs text-muted-foreground">له تغطية</div>
            </div>
            <div className="bg-red-50 dark:bg-red-950/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-red-700 dark:text-red-300">{stats.missing}</div>
              <div className="text-xs text-muted-foreground">بدون تغطية</div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-950/30 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-amber-700 dark:text-amber-300">{stats.wide}</div>
              <div className="text-xs text-muted-foreground">نطاق واسع (15+ سنة)</div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ابحث باسم المنتج أو SKU..."
                className="pr-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {[
                { v: "all", label: "الكل" },
                { v: "missing", label: "بدون تغطية" },
                { v: "single_year", label: "سنة واحدة فقط" },
                { v: "wide_range", label: "نطاق واسع" },
              ].map((opt) => (
                <Button
                  key={opt.v}
                  size="sm"
                  variant={filter === opt.v ? "default" : "outline"}
                  onClick={() => setFilter(opt.v as any)}
                >
                  {opt.label}
                </Button>
              ))}
              <Button size="sm" variant="secondary" onClick={reRunAutoInference} disabled={running}>
                {running ? <Loader2 className="w-4 h-4 animate-spin ml-1" /> : <RefreshCw className="w-4 h-4 ml-1" />}
                إعادة الاستنتاج التلقائي
              </Button>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/50 sticky top-0 z-10">
                    <tr>
                      <th className="text-right p-2 font-bold">المنتج</th>
                      <th className="text-center p-2 font-bold w-20">SKU</th>
                      <th className="text-center p-2 font-bold w-24">من سنة</th>
                      <th className="text-center p-2 font-bold w-24">إلى سنة</th>
                      <th className="text-center p-2 font-bold w-32">الموديلات</th>
                      <th className="text-center p-2 font-bold w-20">إجراء</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p) => {
                      const e = edits[p.id] || {};
                      const yf = e.year_from !== undefined ? e.year_from : p.year_from;
                      const yt = e.year_to !== undefined ? e.year_to : p.year_to;
                      const dirty = e.year_from !== undefined || e.year_to !== undefined;
                      const isMissing = p.year_from == null;
                      return (
                        <tr key={p.id} className="border-t hover:bg-muted/20">
                          <td className="p-2 text-right">
                            <div className="flex items-center gap-2">
                              {isMissing && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
                              <span className="line-clamp-2">{p.name_ar}</span>
                            </div>
                          </td>
                          <td className="p-2 text-center font-mono text-xs text-muted-foreground">{p.sku}</td>
                          <td className="p-2">
                            <Input
                              type="number"
                              min={1980}
                              max={2030}
                              value={yf ?? ""}
                              onChange={(ev) => updateEdit(p.id, "year_from", ev.target.value)}
                              className="h-8 text-center text-xs"
                            />
                          </td>
                          <td className="p-2">
                            <Input
                              type="number"
                              min={1980}
                              max={2030}
                              value={yt ?? ""}
                              onChange={(ev) => updateEdit(p.id, "year_to", ev.target.value)}
                              className="h-8 text-center text-xs"
                            />
                          </td>
                          <td className="p-2 text-center">
                            <div className="flex flex-wrap justify-center gap-1">
                              {(p.compatible_models || []).slice(0, 2).map((m, i) => (
                                <Badge key={i} variant="secondary" className="text-[9px] px-1.5 py-0">
                                  {m}
                                </Badge>
                              ))}
                              {(p.compatible_models?.length || 0) > 2 && (
                                <span className="text-[9px] text-muted-foreground">+{p.compatible_models!.length - 2}</span>
                              )}
                            </div>
                          </td>
                          <td className="p-2 text-center">
                            <Button
                              size="sm"
                              variant={dirty ? "default" : "ghost"}
                              disabled={!dirty || savingId === p.id}
                              onClick={() => saveRow(p)}
                              className="h-8 px-2"
                            >
                              {savingId === p.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : dirty ? (
                                <Save className="w-3.5 h-3.5" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                              )}
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                    {filtered.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center p-8 text-muted-foreground">
                          لا توجد نتائج
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="bg-muted/20 px-3 py-2 text-xs text-muted-foreground border-t">
                عرض {filtered.length} من أصل {products?.length || 0} منتج
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
