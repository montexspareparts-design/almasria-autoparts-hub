import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  Upload, FileSpreadsheet, Loader2, ShoppingCart, Trash2,
  Plus, Minus, AlertTriangle, CheckCircle, Search, Zap, Keyboard,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ParsedItem {
  sku: string;
  quantity: number;
  product?: { id: string; name_ar: string; base_price: number; image_url: string | null } | null;
  found: boolean;
}

interface SearchResult {
  id: string;
  sku: string;
  name_ar: string;
  base_price: number;
  image_url: string | null;
  stock_quantity: number;
}

const DealerQuickOrder = () => {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<ParsedItem[]>([]);
  const [notes, setNotes] = useState("");
  const [parsing, setParsing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [mode, setMode] = useState<"manual" | "excel">("manual");

  // Manual search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const searchProducts = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const { data } = await supabase
      .from("products")
      .select("id, sku, name_ar, base_price, image_url, stock_quantity")
      .eq("is_active", true)
      .or(`name_ar.ilike.%${query}%,sku.ilike.%${query}%`)
      .limit(10);
    setSearchResults((data as SearchResult[]) || []);
    setSearching(false);
  }, []);

  const handleSearchInput = (value: string) => {
    setSearchQuery(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchProducts(value), 300);
  };

  const addManualItem = (product: SearchResult) => {
    const exists = items.find(i => i.sku === product.sku);
    if (exists) {
      setItems(prev => prev.map(i => i.sku === product.sku ? { ...i, quantity: i.quantity + 1 } : i));
      toast({ title: "تم زيادة الكمية", description: product.name_ar });
    } else {
      setItems(prev => [...prev, {
        sku: product.sku,
        quantity: 1,
        product: { id: product.id, name_ar: product.name_ar, base_price: product.base_price, image_url: product.image_url },
        found: true,
      }]);
      toast({ title: "تمت الإضافة ✓", description: product.name_ar });
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  const parseExcel = async (file: File) => {
    setParsing(true);
    try {
      const XLSX = await import("xlsx");
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: "array" });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const rows: any[] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

      const parsed: { sku: string; qty: number }[] = [];
      for (const row of rows) {
        if (!row || !row[0]) continue;
        const sku = String(row[0]).trim();
        const qty = parseInt(String(row[1] || "1"), 10);
        if (sku && !isNaN(qty) && qty > 0 && sku.length >= 2) {
          parsed.push({ sku, qty });
        }
      }

      if (parsed.length === 0) {
        toast({ title: "خطأ", description: "لم يتم العثور على بيانات صالحة في الملف", variant: "destructive" });
        setParsing(false);
        return;
      }

      const skus = parsed.map(p => p.sku);
      const { data: products } = await supabase
        .from("products")
        .select("id, sku, name_ar, base_price, image_url")
        .eq("is_active", true)
        .in("sku", skus);

      const productMap = new Map((products || []).map(p => [p.sku, p]));

      const result: ParsedItem[] = parsed.map(p => {
        const product = productMap.get(p.sku);
        return { sku: p.sku, quantity: p.qty, product: product || null, found: !!product };
      });

      setItems(result);
      const foundCount = result.filter(r => r.found).length;
      toast({
        title: `تم تحليل ${result.length} صنف`,
        description: `${foundCount} موجود في النظام، ${result.length - foundCount} غير موجود`,
      });
    } catch {
      toast({ title: "خطأ", description: "فشل قراءة الملف", variant: "destructive" });
    }
    setParsing(false);
  };

  const updateQty = (idx: number, delta: number) => {
    setItems(prev => prev.map((item, i) =>
      i === idx ? { ...item, quantity: Math.max(1, item.quantity + delta) } : item
    ));
  };

  const removeItem = (idx: number) => {
    setItems(prev => prev.filter((_, i) => i !== idx));
  };

  const foundItems = items.filter(i => i.found && i.product);
  const notFoundItems = items.filter(i => !i.found);
  const totalAmount = foundItems.reduce((sum, i) => sum + (i.product!.base_price * i.quantity), 0);

  const submitOrder = async () => {
    if (foundItems.length === 0) return;
    setSubmitting(true);
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: user!.id,
        order_number: orderNumber,
        total_amount: totalAmount,
        notes: notes || null,
        status: "pending",
      })
      .select()
      .single();

    if (error || !order) {
      toast({ title: "خطأ", description: "فشل إنشاء الطلب", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    await supabase.from("order_items").insert(
      foundItems.map(i => ({
        order_id: (order as any).id,
        product_id: i.product!.id,
        quantity: i.quantity,
        unit_price: i.product!.base_price,
        total_price: i.product!.base_price * i.quantity,
      }))
    );

    toast({ title: "تم إرسال الطلب ✓", description: `رقم الطلب: ${orderNumber} — ${foundItems.length} صنف` });
    setItems([]);
    setNotes("");
    setSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground">طلب سريع</h2>

      {/* Mode Tabs */}
      <div className="flex gap-1 bg-muted/50 rounded-xl p-1">
        <button
          onClick={() => setMode("manual")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
            mode === "manual"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <Keyboard className="w-4 h-4" />
          إدخال يدوي
        </button>
        <button
          onClick={() => setMode("excel")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all",
            mode === "excel"
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          <FileSpreadsheet className="w-4 h-4" />
          رفع Excel
        </button>
      </div>

      {/* Manual Search Mode */}
      {mode === "manual" && (
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => handleSearchInput(e.target.value)}
              placeholder="ابحث باسم القطعة أو رقمها..."
              className="pr-10 text-sm h-11"
            />
            {searching && (
              <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />
            )}
          </div>

          {/* Search Results Dropdown */}
          {searchResults.length > 0 && (
            <Card className="border-border/50 shadow-lg">
              <CardContent className="p-1.5 max-h-64 overflow-y-auto">
                {searchResults.map((product) => (
                  <button
                    key={product.id}
                    onClick={() => addManualItem(product)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/70 transition-colors text-right"
                  >
                    {product.image_url ? (
                      <img src={product.image_url} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                        <ShoppingCart className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{product.name_ar}</p>
                      <p className="text-[10px] text-muted-foreground">{product.sku}</p>
                    </div>
                    <div className="text-left shrink-0">
                      <p className="text-xs font-bold text-foreground">{product.base_price.toLocaleString("ar-EG")} ج.م</p>
                      <p className={cn("text-[10px]", product.stock_quantity > 0 ? "text-emerald-600" : "text-destructive")}>
                        {product.stock_quantity > 0 ? `متوفر (${product.stock_quantity})` : "نفذ"}
                      </p>
                    </div>
                    <Plus className="w-5 h-5 text-primary shrink-0" />
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          {searchQuery.length >= 2 && searchResults.length === 0 && !searching && (
            <p className="text-xs text-muted-foreground text-center py-3">لا توجد نتائج لـ "{searchQuery}"</p>
          )}
        </div>
      )}

      {/* Excel Upload Mode */}
      {mode === "excel" && (
        <Card
          className="border-dashed border-2 cursor-pointer hover:border-primary/50 transition-colors"
          onClick={() => fileRef.current?.click()}
        >
          <CardContent className="p-8 text-center">
            {parsing ? (
              <Loader2 className="w-10 h-10 mx-auto text-primary animate-spin mb-3" />
            ) : (
              <FileSpreadsheet className="w-10 h-10 mx-auto text-primary/60 mb-3" />
            )}
            <p className="font-medium text-foreground mb-1">
              {parsing ? "جاري تحليل الملف..." : "اضغط لرفع ملف Excel"}
            </p>
            <p className="text-xs text-muted-foreground">
              الملف يجب أن يحتوي عمودين: رقم القطعة (SKU) والكمية
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) parseExcel(file);
                e.target.value = "";
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Items List (shared between both modes) */}
      {items.length > 0 && (
        <>
          {notFoundItems.length > 0 && (
            <Card className="border-destructive/30 bg-destructive/5">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-destructive">
                      {notFoundItems.length} صنف غير موجود في النظام
                    </p>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {notFoundItems.map((item, i) => (
                        <span key={i} className="text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full">
                          {item.sku}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {foundItems.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-500" />
                  أصناف جاهزة للطلب ({foundItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {foundItems.map((item, idx) => {
                  const globalIdx = items.indexOf(item);
                  return (
                    <div key={idx} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                      {item.product?.image_url ? (
                        <img src={item.product.image_url} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                          <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{item.product?.name_ar}</p>
                        <p className="text-[10px] text-muted-foreground">{item.sku}</p>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Button variant="outline" size="icon" className="w-7 h-7" onClick={() => updateQty(globalIdx, -1)}>
                          <Minus className="w-3 h-3" />
                        </Button>
                        <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                        <Button variant="outline" size="icon" className="w-7 h-7" onClick={() => updateQty(globalIdx, 1)}>
                          <Plus className="w-3 h-3" />
                        </Button>
                        <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => removeItem(globalIdx)}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-sm font-bold text-foreground shrink-0 w-20 text-left">
                        {(item.product!.base_price * item.quantity).toLocaleString("ar-EG")} ج.م
                      </p>
                    </div>
                  );
                })}

                <Textarea
                  placeholder="ملاحظات على الطلب (اختياري)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-3 text-sm min-h-[60px]"
                />

                <div className="border-t border-border pt-3 mt-3">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">الإجمالي</span>
                    <span className="text-lg font-bold text-foreground">{totalAmount.toLocaleString("ar-EG")} ج.م</span>
                  </div>
                  <Button className="w-full" onClick={submitOrder} disabled={submitting}>
                    {submitting ? <Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> : <ShoppingCart className="w-4 h-4 ml-1.5" />}
                    إرسال الطلب ({foundItems.length} صنف)
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
};

export default DealerQuickOrder;