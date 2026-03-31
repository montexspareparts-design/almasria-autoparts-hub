import { useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { pushOrderToERP } from "@/lib/erpSync";
import { generateOrderNumber } from "@/lib/orderNumber";
import { Loader2, Zap, Plus, Trash2, Minus, Search, CheckCircle, ShoppingCart } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface MatchedProduct {
  id: string;
  sku: string;
  name_ar: string;
  base_price: number;
  stock_quantity: number;
}

interface OrderLine {
  sku: string;
  quantity: number;
  product?: MatchedProduct;
}

const DealerQuickOrder = () => {
  const { user } = useAuth();
  const [sku, setSku] = useState("");
  const [qty, setQty] = useState(1);
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Auto-search state
  const [searching, setSearching] = useState(false);
  const [suggestions, setSuggestions] = useState<MatchedProduct[]>([]);
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  const searchProducts = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    const { data } = await supabase
      .from("products")
      .select("id, sku, name_ar, base_price, stock_quantity")
      .eq("is_active", true)
      .or(`sku.ilike.%${query}%,name_ar.ilike.%${query}%`)
      .limit(6);
    setSuggestions((data as MatchedProduct[]) || []);
    setSearching(false);
  }, []);

  const handleSkuChange = (value: string) => {
    setSku(value);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => searchProducts(value), 300);
  };

  const addFromSuggestion = (product: MatchedProduct) => {
    const exists = lines.findIndex(l => l.sku === product.sku);
    if (exists >= 0) {
      setLines(prev => prev.map((l, i) => i === exists ? { ...l, quantity: l.quantity + qty } : l));
      toast({ title: "تم زيادة الكمية", description: product.name_ar });
    } else {
      setLines(prev => [...prev, { sku: product.sku, quantity: qty, product }]);
      toast({ title: "تمت الإضافة ✓", description: product.name_ar });
    }
    setSku("");
    setQty(1);
    setSuggestions([]);
  };

  const addManualLine = () => {
    const trimmed = sku.trim();
    if (!trimmed) {
      toast({ title: "أدخل رقم القطعة", variant: "destructive" });
      return;
    }
    const exists = lines.findIndex(l => l.sku === trimmed);
    if (exists >= 0) {
      setLines(prev => prev.map((l, i) => i === exists ? { ...l, quantity: l.quantity + qty } : l));
    } else {
      setLines(prev => [...prev, { sku: trimmed, quantity: qty }]);
    }
    setSku("");
    setQty(1);
    setSuggestions([]);
  };

  const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx));

  const updateLineQty = (idx: number, delta: number) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, quantity: Math.max(1, l.quantity + delta) } : l));
  };

  const totalAmount = lines.reduce((sum, l) => {
    if (l.product) return sum + l.product.base_price * l.quantity;
    return sum;
  }, 0);

  const submitOrder = async () => {
    if (lines.length === 0) {
      toast({ title: "أضف صنف واحد على الأقل", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    // For lines without matched product, look them up
    const unmatchedSkus = lines.filter(l => !l.product).map(l => l.sku);
    let productMap = new Map<string, MatchedProduct>();

    // Add already matched products
    lines.forEach(l => { if (l.product) productMap.set(l.sku, l.product); });

    if (unmatchedSkus.length > 0) {
      const { data: products } = await supabase
        .from("products")
        .select("id, sku, name_ar, base_price, stock_quantity")
        .eq("is_active", true)
        .in("sku", unmatchedSkus);
      (products || []).forEach(p => productMap.set(p.sku, p as MatchedProduct));
    }

    const foundLines = lines.filter(l => productMap.has(l.sku));
    const notFound = lines.filter(l => !productMap.has(l.sku));

    if (notFound.length > 0) {
      toast({
        title: `${notFound.length} رقم قطعة غير موجود`,
        description: notFound.map(l => l.sku).join("، "),
        variant: "destructive",
      });
    }

    if (foundLines.length === 0) { setSubmitting(false); return; }

    const total = foundLines.reduce((sum, l) => {
      const p = productMap.get(l.sku)!;
      return sum + p.base_price * l.quantity;
    }, 0);

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

    const { data: order, error } = await supabase
      .from("orders")
      .insert({ user_id: user!.id, order_number: orderNumber, total_amount: total, status: "pending" })
      .select()
      .single();

    if (error || !order) {
      toast({ title: "خطأ في إنشاء الطلب", variant: "destructive" });
      setSubmitting(false);
      return;
    }

    await supabase.from("order_items").insert(
      foundLines.map(l => {
        const p = productMap.get(l.sku)!;
        return {
          order_id: (order as any).id,
          product_id: p.id,
          quantity: l.quantity,
          unit_price: p.base_price,
          total_price: p.base_price * l.quantity,
        };
      })
    );

    // Push to Al Faisal ERP
    pushOrderToERP((order as any).id);

    toast({ title: "تم إرسال الطلب ✓", description: `رقم الطلب: ${orderNumber}` });
    setLines([]);
    setSubmitting(false);
    setShowConfirm(false);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
        <Zap className="w-5 h-5 text-primary" />
        طلب سريع
      </h2>

      {/* Input Row */}
      <div className="flex gap-2 items-end">
        <div className="flex-1 relative">
          <label className="text-xs text-muted-foreground mb-1 block">رقم القطعة</label>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              value={sku}
              onChange={e => handleSkuChange(e.target.value)}
              placeholder="ابحث برقم القطعة أو الاسم..."
              className="h-11 text-sm pr-9"
              onKeyDown={e => e.key === "Enter" && (suggestions.length > 0 ? addFromSuggestion(suggestions[0]) : addManualLine())}
            />
            {searching && <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary animate-spin" />}
          </div>

          {/* Suggestions Dropdown */}
          {suggestions.length > 0 && (
            <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-lg shadow-lg overflow-hidden">
              {suggestions.map(product => (
                <button
                  key={product.id}
                  onClick={() => addFromSuggestion(product)}
                  className="w-full flex items-center gap-3 p-3 hover:bg-muted/70 transition-colors text-right border-b border-border/50 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-foreground truncate">{product.name_ar}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{product.sku}</p>
                  </div>
                  <div className="text-left shrink-0">
                    <p className={`text-[10px] ${product.stock_quantity > 0 ? "text-emerald-600" : "text-destructive"}`}>
                      {product.stock_quantity > 0 ? `متوفر` : "نفذ"}
                    </p>
                  </div>
                  <Plus className="w-4 h-4 text-primary shrink-0" />
                </button>
              ))}
            </div>
          )}

          {sku.length >= 2 && suggestions.length === 0 && !searching && (
            <p className="text-[10px] text-muted-foreground mt-1">لا نتائج — اضغط Enter لإضافة الرقم يدوياً</p>
          )}
        </div>
        <div className="w-16">
          <label className="text-xs text-muted-foreground mb-1 block">الكمية</label>
          <Input
            type="number"
            min={1}
            value={qty}
            onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
            className="h-11 text-sm text-center"
          />
        </div>
        <Button onClick={addManualLine} size="icon" className="h-11 w-11 shrink-0">
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {/* Lines List */}
      {lines.length > 0 && (
        <div className="space-y-2">
          {lines.map((line, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-muted/50 rounded-lg p-2.5">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {line.product && <CheckCircle className="w-3 h-3 text-emerald-500 shrink-0" />}
                  <span className="text-sm font-medium text-foreground truncate font-mono">{line.sku}</span>
                </div>
                {line.product && (
                  <p className="text-[10px] text-muted-foreground truncate">{line.product.name_ar} — {line.product.base_price.toLocaleString("ar-EG")} ج.م</p>
                )}
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <Button variant="outline" size="icon" className="w-7 h-7" onClick={() => updateLineQty(idx, -1)}>
                  <Minus className="w-3 h-3" />
                </Button>
                <span className="w-8 text-center text-sm font-bold">{line.quantity}</span>
                <Button variant="outline" size="icon" className="w-7 h-7" onClick={() => updateLineQty(idx, 1)}>
                  <Plus className="w-3 h-3" />
                </Button>
                <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => removeLine(idx)}>
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}

          {totalAmount > 0 && (
            <div className="flex items-center justify-between px-1 pt-1">
              <span className="text-xs text-muted-foreground">الإجمالي التقديري</span>
              <span className="text-sm font-bold text-foreground">{totalAmount.toLocaleString("ar-EG")} ج.م</span>
            </div>
          )}

          <Button className="w-full h-12 text-base mt-2" onClick={() => setShowConfirm(true)} disabled={submitting}>
            <ShoppingCart className="w-5 h-5 ml-2" />
            اطلب الآن ({lines.length} صنف)
          </Button>
        </div>
      )}

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="max-w-sm" dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2 text-base">
              <ShoppingCart className="w-5 h-5 text-primary" />
              تأكيد الطلب
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-3 pt-2">
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {lines.map((line, idx) => (
                    <div key={idx} className="flex items-center justify-between text-sm">
                      <div className="flex-1 min-w-0">
                        <span className="font-mono text-foreground">{line.sku}</span>
                        {line.product && (
                          <p className="text-[10px] text-muted-foreground truncate">{line.product.name_ar}</p>
                        )}
                      </div>
                      <span className="text-muted-foreground shrink-0 mx-2">×{line.quantity}</span>
                      {line.product && (
                        <span className="font-bold text-foreground shrink-0">
                          {(line.product.base_price * line.quantity).toLocaleString("ar-EG")} ج.م
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="border-t border-border pt-2 flex items-center justify-between">
                  <span className="font-medium text-foreground">الإجمالي</span>
                  <span className="text-lg font-bold text-primary">{totalAmount.toLocaleString("ar-EG")} ج.م</span>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2 mt-2">
            <AlertDialogCancel className="flex-1">تراجع</AlertDialogCancel>
            <AlertDialogAction className="flex-1" onClick={submitOrder} disabled={submitting}>
              {submitting ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Zap className="w-4 h-4 ml-1" />}
              تأكيد وإرسال
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DealerQuickOrder;
