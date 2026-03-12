import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import {
  Search, Plus, Minus, Trash2, FileText, Save, ShoppingCart,
  AlertTriangle, Eye, Loader2, Download, X
} from "lucide-react";

interface Product {
  id: string;
  name_ar: string;
  sku: string;
  base_price: number;
  sale_price: number | null;
  is_on_sale: boolean;
  image_url: string | null;
  stock_quantity: number;
}

interface QuoteItem {
  product: Product;
  quantity: number;
  unit_price: number;
}

interface SavedQuote {
  id: string;
  quote_number: string;
  status: string;
  total_amount: number;
  notes: string | null;
  created_at: string;
}

const DAILY_LIMIT = 20;

const DealerQuoteBuilder = () => {
  const { user, dealerAccount } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [notes, setNotes] = useState("");
  const [dailyViews, setDailyViews] = useState(0);
  const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState<"builder" | "saved">("builder");
  const [tierPrices, setTierPrices] = useState<Record<string, number>>({});

  useEffect(() => {
    if (user) {
      fetchDailyViews();
      fetchSavedQuotes();
    }
  }, [user]);

  const fetchDailyViews = async () => {
    const { data } = await supabase.rpc("get_daily_view_count", { _user_id: user!.id });
    setDailyViews(data || 0);
  };

  const fetchSavedQuotes = async () => {
    const { data } = await supabase
      .from("dealer_quotes")
      .select("*")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setSavedQuotes((data as SavedQuote[]) || []);
  };

  const searchProducts = useCallback(async (query: string) => {
    if (query.length < 2) { setSearchResults([]); return; }
    setSearching(true);
    const { data } = await supabase
      .from("products")
      .select("id, name_ar, sku, base_price, sale_price, is_on_sale, image_url, stock_quantity")
      .eq("is_active", true)
      .or(`name_ar.ilike.%${query}%,sku.ilike.%${query}%`)
      .limit(10);
    setSearchResults(data || []);
    setSearching(false);
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => searchProducts(searchQuery), 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, searchProducts]);

  const getProductPrice = async (product: Product): Promise<number> => {
    if (tierPrices[product.id]) return tierPrices[product.id];
    
    if (dealerAccount?.tier) {
      const { data } = await supabase
        .from("product_tier_prices")
        .select("price")
        .eq("product_id", product.id)
        .eq("tier", dealerAccount.tier)
        .maybeSingle();
      if (data?.price) {
        setTierPrices(prev => ({ ...prev, [product.id]: Number(data.price) }));
        return Number(data.price);
      }
    }
    const price = product.is_on_sale && product.sale_price ? product.sale_price : product.base_price;
    setTierPrices(prev => ({ ...prev, [product.id]: price }));
    return price;
  };

  const recordPriceView = async (productId: string) => {
    await supabase.from("dealer_price_views").insert({ user_id: user!.id, product_id: productId });
    setDailyViews(prev => prev + 1);
  };

  const addToQuote = async (product: Product) => {
    if (dailyViews >= DAILY_LIMIT) {
      toast({
        title: "تم استنفاذ الحد اليومي",
        description: `لقد استنفذت الحد اليومي لعروض الأسعار (${DAILY_LIMIT} صنف)`,
        variant: "destructive",
      });
      return;
    }

    const existing = quoteItems.find(i => i.product.id === product.id);
    if (existing) {
      setQuoteItems(prev => prev.map(i =>
        i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
      ));
      return;
    }

    const price = await getProductPrice(product);
    await recordPriceView(product.id);
    setQuoteItems(prev => [...prev, { product, quantity: 1, unit_price: price }]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const updateQuantity = (productId: string, delta: number) => {
    setQuoteItems(prev => prev.map(i => {
      if (i.product.id !== productId) return i;
      const newQty = Math.max(1, i.quantity + delta);
      return { ...i, quantity: newQty };
    }));
  };

  const removeItem = (productId: string) => {
    setQuoteItems(prev => prev.filter(i => i.product.id !== productId));
  };

  const totalAmount = quoteItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  const saveQuote = async () => {
    if (quoteItems.length === 0) return;
    setSaving(true);
    const quoteNumber = `Q-${Date.now().toString(36).toUpperCase()}`;

    const { data: quote, error } = await supabase
      .from("dealer_quotes")
      .insert({ user_id: user!.id, quote_number: quoteNumber, total_amount: totalAmount, notes: notes || null })
      .select()
      .single();

    if (error || !quote) {
      toast({ title: "خطأ", description: "فشل حفظ العرض", variant: "destructive" });
      setSaving(false);
      return;
    }

    await supabase.from("dealer_quote_items").insert(
      quoteItems.map(i => ({
        quote_id: (quote as any).id,
        product_id: i.product.id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.unit_price * i.quantity,
      }))
    );

    toast({ title: "تم الحفظ ✓", description: `عرض أسعار ${quoteNumber}` });
    setQuoteItems([]);
    setNotes("");
    fetchSavedQuotes();
    setSaving(false);
  };

  const convertToOrder = async () => {
    if (quoteItems.length === 0) return;
    setSaving(true);
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
      setSaving(false);
      return;
    }

    await supabase.from("order_items").insert(
      quoteItems.map(i => ({
        order_id: (order as any).id,
        product_id: i.product.id,
        quantity: i.quantity,
        unit_price: i.unit_price,
        total_price: i.unit_price * i.quantity,
      }))
    );

    toast({ title: "تم إرسال الطلب ✓", description: `رقم الطلب: ${orderNumber}` });
    setQuoteItems([]);
    setNotes("");
    setSaving(false);
  };

  const downloadPDF = () => {
    const content = quoteItems.map((i, idx) =>
      `${idx + 1}. ${i.product.name_ar} (${i.product.sku}) - الكمية: ${i.quantity} - السعر: ${i.unit_price.toLocaleString("ar-EG")} ج.م - الإجمالي: ${(i.unit_price * i.quantity).toLocaleString("ar-EG")} ج.م`
    ).join("\n");

    const text = `عرض أسعار - المصرية جروب\nالتاريخ: ${new Date().toLocaleDateString("ar-EG")}\n\n${content}\n\nالإجمالي: ${totalAmount.toLocaleString("ar-EG")} ج.م\n${notes ? `\nملاحظات: ${notes}` : ""}`;

    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quote-${Date.now()}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const remainingViews = Math.max(0, DAILY_LIMIT - dailyViews);

  return (
    <div className="space-y-4">
      {/* Tab Toggle */}
      <div className="flex gap-2">
        <Button
          variant={activeView === "builder" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveView("builder")}
        >
          <FileText className="w-4 h-4 ml-1.5" />
          إنشاء عرض سعر
        </Button>
        <Button
          variant={activeView === "saved" ? "default" : "outline"}
          size="sm"
          onClick={() => setActiveView("saved")}
        >
          <Save className="w-4 h-4 ml-1.5" />
          العروض المحفوظة ({savedQuotes.length})
        </Button>
      </div>

      {activeView === "saved" ? (
        /* Saved Quotes List */
        <div className="space-y-3">
          {savedQuotes.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="p-10 text-center">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground font-medium">لا توجد عروض محفوظة</p>
              </CardContent>
            </Card>
          ) : (
            savedQuotes.map(q => (
              <Card key={q.id} className="border-border/50">
                <CardContent className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-foreground text-sm">{q.quote_number}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(q.created_at).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" })}
                    </p>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-foreground text-sm">{Number(q.total_amount).toLocaleString("ar-EG")} ج.م</p>
                    <Badge variant={q.status === "draft" ? "secondary" : "default"} className="text-[10px]">
                      {q.status === "draft" ? "مسودة" : q.status === "converted" ? "تم التحويل" : q.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      ) : (
        /* Quote Builder */
        <div className="space-y-4">
          {/* Daily Limit Banner */}
          <div className={`rounded-lg border p-3 flex items-center gap-3 ${remainingViews <= 5 ? "border-destructive/30 bg-destructive/5" : "border-primary/20 bg-primary/5"}`}>
            <Eye className={`w-5 h-5 shrink-0 ${remainingViews <= 5 ? "text-destructive" : "text-primary"}`} />
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                المتبقي: <span className="font-bold">{remainingViews}</span> من {DAILY_LIMIT} صنف يومياً
              </p>
              {remainingViews === 0 && (
                <p className="text-xs text-destructive mt-0.5">لقد استنفذت الحد اليومي لعروض الأسعار</p>
              )}
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ابحث بالاسم أو رقم القطعة..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10"
              disabled={remainingViews === 0}
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setSearchResults([]); }} className="absolute left-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <Card className="border-border/50">
              <CardContent className="p-2 space-y-1 max-h-64 overflow-y-auto">
                {searchResults.map(product => (
                  <button
                    key={product.id}
                    onClick={() => addToQuote(product)}
                    className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors text-right"
                  >
                    {product.image_url ? (
                      <img src={product.image_url} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{product.name_ar}</p>
                      <p className="text-[11px] text-muted-foreground">{product.sku}</p>
                    </div>
                    <Plus className="w-4 h-4 text-primary shrink-0" />
                  </button>
                ))}
              </CardContent>
            </Card>
          )}

          {searching && (
            <div className="flex justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          )}

          {/* Quote Items */}
          {quoteItems.length > 0 && (
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  أصناف العرض ({quoteItems.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {quoteItems.map(item => (
                  <div key={item.product.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                    {item.product.image_url ? (
                      <img src={item.product.image_url} alt="" className="w-10 h-10 rounded object-cover shrink-0" />
                    ) : (
                      <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{item.product.name_ar}</p>
                      <p className="text-[10px] text-muted-foreground">{item.product.sku}</p>
                      <p className="text-xs font-bold text-primary mt-0.5">{item.unit_price.toLocaleString("ar-EG")} ج.م</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button variant="outline" size="icon" className="w-7 h-7" onClick={() => updateQuantity(item.product.id, -1)}>
                        <Minus className="w-3 h-3" />
                      </Button>
                      <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                      <Button variant="outline" size="icon" className="w-7 h-7" onClick={() => updateQuantity(item.product.id, 1)}>
                        <Plus className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive" onClick={() => removeItem(item.product.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                    <p className="text-sm font-bold text-foreground shrink-0 w-24 text-left">
                      {(item.unit_price * item.quantity).toLocaleString("ar-EG")} ج.م
                    </p>
                  </div>
                ))}

                {/* Notes */}
                <Textarea
                  placeholder="ملاحظات على العرض (اختياري)..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-3 text-sm min-h-[60px]"
                />

                {/* Total & Actions */}
                <div className="border-t border-border pt-3 mt-3">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">الإجمالي</span>
                    <span className="text-lg font-bold text-foreground">{totalAmount.toLocaleString("ar-EG")} ج.م</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <Button variant="outline" size="sm" onClick={downloadPDF} disabled={saving}>
                      <Download className="w-4 h-4 ml-1.5" />
                      تحميل العرض
                    </Button>
                    <Button variant="secondary" size="sm" onClick={saveQuote} disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> : <Save className="w-4 h-4 ml-1.5" />}
                      حفظ العرض
                    </Button>
                    <Button size="sm" onClick={convertToOrder} disabled={saving}>
                      {saving ? <Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> : <ShoppingCart className="w-4 h-4 ml-1.5" />}
                      تحويل لطلب
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {quoteItems.length === 0 && searchResults.length === 0 && !searching && (
            <Card className="border-dashed">
              <CardContent className="p-10 text-center">
                <Search className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-muted-foreground font-medium">ابحث عن الأصناف لإنشاء عرض سعر</p>
                <p className="text-xs text-muted-foreground/60 mt-1">يمكنك البحث بالاسم أو رقم القطعة</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};

export default DealerQuoteBuilder;
