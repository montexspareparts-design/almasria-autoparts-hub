import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { Loader2, Zap, Plus, Trash2, Minus } from "lucide-react";

interface OrderLine {
  sku: string;
  quantity: number;
}

const DealerQuickOrder = () => {
  const { user } = useAuth();
  const [sku, setSku] = useState("");
  const [qty, setQty] = useState(1);
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const addLine = () => {
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
  };

  const removeLine = (idx: number) => setLines(prev => prev.filter((_, i) => i !== idx));

  const updateLineQty = (idx: number, delta: number) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, quantity: Math.max(1, l.quantity + delta) } : l));
  };

  const submitOrder = async () => {
    if (lines.length === 0) {
      toast({ title: "أضف صنف واحد على الأقل", variant: "destructive" });
      return;
    }
    setSubmitting(true);

    const { data: products } = await supabase
      .from("products")
      .select("id, sku, name_ar, base_price")
      .eq("is_active", true)
      .in("sku", lines.map(l => l.sku));

    const productMap = new Map((products || []).map(p => [p.sku, p]));
    const foundLines = lines.filter(l => productMap.has(l.sku));
    const notFound = lines.filter(l => !productMap.has(l.sku));

    if (notFound.length > 0) {
      toast({
        title: `${notFound.length} رقم قطعة غير موجود`,
        description: notFound.map(l => l.sku).join("، "),
        variant: "destructive",
      });
    }

    if (foundLines.length === 0) {
      setSubmitting(false);
      return;
    }

    const totalAmount = foundLines.reduce((sum, l) => {
      const p = productMap.get(l.sku)!;
      return sum + p.base_price * l.quantity;
    }, 0);

    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: user!.id,
        order_number: orderNumber,
        total_amount: totalAmount,
        status: "pending",
      })
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

    toast({ title: "تم إرسال الطلب ✓", description: `رقم الطلب: ${orderNumber}` });
    setLines([]);
    setSubmitting(false);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
        <Zap className="w-5 h-5 text-primary" />
        طلب سريع
      </h2>

      {/* Input Row */}
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <label className="text-xs text-muted-foreground mb-1 block">رقم القطعة</label>
          <Input
            value={sku}
            onChange={e => setSku(e.target.value)}
            placeholder="مثال: 04152-YZZA1"
            className="h-11 text-sm"
            onKeyDown={e => e.key === "Enter" && addLine()}
          />
        </div>
        <div className="w-20">
          <label className="text-xs text-muted-foreground mb-1 block">الكمية</label>
          <Input
            type="number"
            min={1}
            value={qty}
            onChange={e => setQty(Math.max(1, parseInt(e.target.value) || 1))}
            className="h-11 text-sm text-center"
          />
        </div>
        <Button onClick={addLine} size="icon" className="h-11 w-11 shrink-0">
          <Plus className="w-5 h-5" />
        </Button>
      </div>

      {/* Lines List */}
      {lines.length > 0 && (
        <div className="space-y-2">
          {lines.map((line, idx) => (
            <div key={idx} className="flex items-center gap-2 bg-muted/50 rounded-lg p-2.5">
              <span className="flex-1 text-sm font-medium text-foreground truncate">{line.sku}</span>
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

          <Button className="w-full h-12 text-base mt-3" onClick={submitOrder} disabled={submitting}>
            {submitting ? <Loader2 className="w-5 h-5 ml-2 animate-spin" /> : <Zap className="w-5 h-5 ml-2" />}
            اطلب الآن ({lines.length} صنف)
          </Button>
        </div>
      )}
    </div>
  );
};

export default DealerQuickOrder;
