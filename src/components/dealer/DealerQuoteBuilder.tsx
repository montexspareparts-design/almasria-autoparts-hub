import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { generateQuotePdf } from "@/lib/generateQuotePdf";
import { shareQuoteWhatsApp, shareQuoteEmail } from "@/lib/shareQuote";
import {
  Search, Plus, Minus, Trash2, FileText, Save, ShoppingCart,
  Eye, Loader2, Download, X, ArrowRight, Edit3, ChevronLeft,
  MessageCircle, Mail
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

interface SavedQuoteItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

const DAILY_LIMIT = 20;

interface DealerQuoteBuilderProps {
  onNavigateToPriceLists?: () => void;
}

const DealerQuoteBuilder = ({ onNavigateToPriceLists }: DealerQuoteBuilderProps) => {
  const { user, dealerAccount } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [quoteItems, setQuoteItems] = useState<QuoteItem[]>([]);
  const [notes, setNotes] = useState("");
  const [dailyViews, setDailyViews] = useState(0);
  const [savedQuotes, setSavedQuotes] = useState<SavedQuote[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeView, setActiveView] = useState<"builder" | "saved" | "edit">("builder");
  const [tierPrices, setTierPrices] = useState<Record<string, number>>({});
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [editingQuoteNumber, setEditingQuoteNumber] = useState("");
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [isFromPriceList, setIsFromPriceList] = useState(false);
  const [dealerInfo, setDealerInfo] = useState<{ name: string; phone: string } | null>(null);

  useEffect(() => {
    if (user) {
      fetchDailyViews();
      fetchSavedQuotes();
      fetchDealerInfo();
    }
  }, [user]);

  const fetchDealerInfo = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("dealer_applications")
      .select("business_name, phone")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) setDealerInfo({ name: data.business_name, phone: data.phone });
  };

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
      .limit(50);
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
        .eq("tier", dealerAccount.tier as any)
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
      toast({ title: "تم استنفاذ الحد اليومي", description: `لقد استنفذت الحد اليومي (${DAILY_LIMIT} صنف)`, variant: "destructive" });
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
      return { ...i, quantity: Math.max(1, i.quantity + delta) };
    }));
  };

  const removeItem = (productId: string) => {
    setQuoteItems(prev => prev.filter(i => i.product.id !== productId));
  };

  const totalAmount = quoteItems.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);

  const saveQuote = async () => {
    if (quoteItems.length === 0) return;
    setSaving(true);

    if (editingQuoteId) {
      // Update existing quote
      await supabase.from("dealer_quotes").update({ total_amount: totalAmount, notes: notes || null }).eq("id", editingQuoteId);
      await supabase.from("dealer_quote_items").delete().eq("quote_id", editingQuoteId);
      await supabase.from("dealer_quote_items").insert(
        quoteItems.map(i => ({
          quote_id: editingQuoteId,
          product_id: i.product.id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          total_price: i.unit_price * i.quantity,
        }))
      );
      toast({ title: "تم تحديث العرض ✓", description: editingQuoteNumber });
    } else {
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
    }

    setQuoteItems([]);
    setNotes("");
    setEditingQuoteId(null);
    setEditingQuoteNumber("");
    setActiveView("builder");
    fetchSavedQuotes();
    setSaving(false);
  };

  const convertToOrder = async () => {
    if (quoteItems.length === 0) return;
    setSaving(true);
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

    const { data: order, error } = await supabase
      .from("orders")
      .insert({ user_id: user!.id, order_number: orderNumber, total_amount: totalAmount, notes: notes || null, status: "pending" })
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

    // Mark quote as converted if editing
    if (editingQuoteId) {
      await supabase.from("dealer_quotes").update({ status: "converted" }).eq("id", editingQuoteId);
    }

    toast({ title: "تم إرسال الطلب ✓", description: `رقم الطلب: ${orderNumber}` });
    setQuoteItems([]);
    setNotes("");
    setEditingQuoteId(null);
    setEditingQuoteNumber("");
    setActiveView("builder");
    fetchSavedQuotes();
    setSaving(false);
  };

  const buildQuoteData = () => ({
    quoteNumber: editingQuoteNumber || `Q-${Date.now().toString(36).toUpperCase()}`,
    date: new Date().toLocaleDateString("ar-EG"),
    notes: notes || undefined,
    dealerName: dealerInfo?.name,
    dealerPhone: dealerInfo?.phone,
    items: quoteItems.map(i => ({
      name: i.product.name_ar,
      sku: i.product.sku,
      quantity: i.quantity,
      unitPrice: i.unit_price,
      totalPrice: i.unit_price * i.quantity,
    })),
    totalAmount,
  });

  const downloadPDF = () => {
    generateQuotePdf(buildQuoteData());
  };

  const openSavedQuote = async (quote: SavedQuote) => {
    setLoadingQuote(true);
    // Fetch quote items with product data
    const { data: items } = await supabase
      .from("dealer_quote_items")
      .select("id, product_id, quantity, unit_price, total_price")
      .eq("quote_id", quote.id);

    if (!items || items.length === 0) {
      toast({ title: "العرض فارغ", variant: "destructive" });
      setLoadingQuote(false);
      return;
    }

    // Fetch product details for each item
    const productIds = items.map(i => i.product_id);
    const { data: products } = await supabase
      .from("products")
      .select("id, name_ar, sku, base_price, sale_price, is_on_sale, image_url, stock_quantity")
      .in("id", productIds);

    if (!products) {
      setLoadingQuote(false);
      return;
    }

    const productMap = new Map(products.map(p => [p.id, p]));
    const loadedItems: QuoteItem[] = [];
    for (const item of items) {
      const product = productMap.get(item.product_id);
      if (product) {
        loadedItems.push({
          product: product as Product,
          quantity: item.quantity,
          unit_price: item.unit_price,
        });
      }
    }

    setQuoteItems(loadedItems);
    setNotes(quote.notes || "");
    setEditingQuoteId(quote.id);
    setEditingQuoteNumber(quote.quote_number);
    const fromPriceList = !!quote.notes?.startsWith("من كشف الأسعار");
    setIsFromPriceList(fromPriceList);

    if (fromPriceList && onNavigateToPriceLists) {
      // Redirect to price lists tab for editing price-list quotes
      setLoadingQuote(false);
      onNavigateToPriceLists();
      return;
    }

    setQuoteItems(loadedItems);
    setNotes(quote.notes || "");
    setEditingQuoteId(quote.id);
    setEditingQuoteNumber(quote.quote_number);
    setActiveView("edit");
    setLoadingQuote(false);
  };

  const deleteQuote = async (quoteId: string) => {
    await supabase.from("dealer_quote_items").delete().eq("quote_id", quoteId);
    await supabase.from("dealer_quotes").delete().eq("id", quoteId);
    toast({ title: "تم حذف العرض" });
    fetchSavedQuotes();
  };

  const remainingViews = Math.max(0, DAILY_LIMIT - dailyViews);

  // Shared builder UI for both "builder" and "edit" views
  const renderBuilder = () => (
    <div className="space-y-4">
      {/* Editing banner */}
      {editingQuoteId && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20">
          <Edit3 className="w-4 h-4 text-primary shrink-0" />
          <p className="text-sm font-medium text-foreground flex-1">
            تعديل العرض: <span className="font-bold">{editingQuoteNumber}</span>
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="text-xs h-7"
            onClick={() => {
              setEditingQuoteId(null);
              setEditingQuoteNumber("");
              setQuoteItems([]);
              setNotes("");
              setIsFromPriceList(false);
              setActiveView("builder");
            }}
          >
            إلغاء التعديل
          </Button>
        </div>
      )}

      {/* Daily Limit */}
      <div className={`rounded-lg border p-3 flex items-center gap-3 ${remainingViews <= 5 ? "border-destructive/30 bg-destructive/5" : "border-primary/20 bg-primary/5"}`}>
        <Eye className={`w-4 h-4 shrink-0 ${remainingViews <= 5 ? "text-destructive" : "text-primary"}`} />
        <p className="text-sm text-foreground">
          المتبقي: <span className="font-bold">{remainingViews}</span> من {DAILY_LIMIT} صنف يومياً
        </p>
      </div>

      {/* Search - hidden for price list quotes */}
      {!isFromPriceList && (
        <>
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ابحث بالاسم أو رقم القطعة لإضافة صنف..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 h-11 text-sm bg-card"
              disabled={remainingViews === 0}
            />
            {searchQuery && (
              <button onClick={() => { setSearchQuery(""); setSearchResults([]); }} className="absolute left-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>
        </>
      )}

      {isFromPriceList && editingQuoteId && (
        <div className="rounded-lg border border-amber-300/30 bg-amber-50 dark:bg-amber-950/20 p-3 flex items-center gap-2 text-sm text-amber-700 dark:text-amber-400">
          <FileText className="w-4 h-4 shrink-0" />
          <span>هذا العرض تم إنشاؤه من كشف أسعار. لإضافة أصناف جديدة، ارجع إلى <strong>كشوفات الأسعار</strong>.</span>
        </div>
      )}

      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="bg-card border border-border rounded-lg p-1.5 space-y-0.5 max-h-60 overflow-y-auto">
          {searchResults.map(product => (
            <button
              key={product.id}
              onClick={() => addToQuote(product)}
              className="w-full flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted transition-colors text-right"
            >
              {product.image_url ? (
                <img src={product.image_url} alt="" className="w-10 h-10 rounded bg-white object-contain p-0.5 shrink-0 border border-border" />
              ) : (
                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4 text-muted-foreground/40" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{product.name_ar}</p>
                <p className="text-[11px] text-muted-foreground font-mono">{product.sku}</p>
              </div>
              <div className="shrink-0">
                <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
                  <Plus className="w-3.5 h-3.5 text-primary" />
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {searching && (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-primary" />
        </div>
      )}

      {/* Quote Items */}
      {quoteItems.length > 0 && (
        <div className="bg-card border border-border rounded-lg">
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-border">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-foreground" />
              <span className="text-sm font-bold text-foreground">أصناف العرض ({quoteItems.length})</span>
            </div>
            <span className="text-xs text-muted-foreground">
              إجمالي: <span className="font-bold text-foreground">{totalAmount.toLocaleString("ar-EG")} ج.م</span>
            </span>
          </div>

          {/* Items */}
          <div className="divide-y divide-border">
            {quoteItems.map(item => (
              <div key={item.product.id} className="flex items-center gap-3 p-3">
                {/* Product Info */}
                <div className="flex items-center gap-2.5 flex-1 min-w-0">
                  {item.product.image_url ? (
                    <img src={item.product.image_url} alt="" className="w-11 h-11 rounded bg-white object-contain p-0.5 shrink-0 border border-border" />
                  ) : (
                    <div className="w-11 h-11 rounded bg-muted flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-muted-foreground/30" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-foreground truncate">{item.product.name_ar}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{item.product.sku}</p>
                    <p className="text-xs font-bold text-primary mt-0.5">{item.unit_price.toLocaleString("ar-EG")} ج.م</p>
                  </div>
                </div>

                {/* Quantity Controls */}
                <div className="flex items-center gap-1 shrink-0">
                  <Button variant="outline" size="icon" className="w-7 h-7" onClick={() => updateQuantity(item.product.id, -1)}>
                    <Minus className="w-3 h-3" />
                  </Button>
                  <span className="w-8 text-center text-sm font-bold text-foreground">{item.quantity}</span>
                  <Button variant="outline" size="icon" className="w-7 h-7" onClick={() => updateQuantity(item.product.id, 1)}>
                    <Plus className="w-3 h-3" />
                  </Button>
                  <Button variant="ghost" size="icon" className="w-7 h-7 text-destructive hover:bg-destructive/10" onClick={() => removeItem(item.product.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                {/* Line Total */}
                <p className="text-sm font-bold text-foreground shrink-0 w-20 sm:w-24 text-left">
                  {(item.unit_price * item.quantity).toLocaleString("ar-EG")} ج.م
                </p>
              </div>
            ))}
          </div>

          {/* Notes */}
          <div className="p-3 border-t border-border">
            <Textarea
              placeholder="ملاحظات على العرض (اختياري)..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="text-sm min-h-[60px] bg-background"
            />
          </div>

          {/* Total & Actions */}
          <div className="p-3 border-t border-border bg-muted/30">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm font-medium text-muted-foreground">الإجمالي</span>
              <span className="text-lg font-bold text-foreground">{totalAmount.toLocaleString("ar-EG")} ج.م</span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              <Button variant="outline" onClick={downloadPDF} disabled={saving} className="h-10">
                <Download className="w-4 h-4 ml-1.5" />
                تحميل PDF
              </Button>
              <Button
                variant="outline"
                className="h-10 border-[#25D366]/30 text-[#25D366] hover:bg-[#25D366]/10"
                onClick={() => shareQuoteWhatsApp(buildQuoteData())}
              >
                <MessageCircle className="w-4 h-4 ml-1.5" />
                واتساب
              </Button>
              <Button
                variant="outline"
                className="h-10 border-blue-400/30 text-blue-600 hover:bg-blue-500/10"
                onClick={() => shareQuoteEmail(buildQuoteData())}
              >
                <Mail className="w-4 h-4 ml-1.5" />
                إيميل
              </Button>
              <Button variant="secondary" onClick={saveQuote} disabled={saving} className="h-10">
                {saving ? <Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> : <Save className="w-4 h-4 ml-1.5" />}
                {editingQuoteId ? "تحديث" : "حفظ"}
              </Button>
              <Button onClick={convertToOrder} disabled={saving} className="h-10 bg-primary hover:bg-primary/90">
                {saving ? <Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> : <ShoppingCart className="w-4 h-4 ml-1.5" />}
                تحويل لطلب
              </Button>
            </div>
          </div>
        </div>
      )}

      {quoteItems.length === 0 && searchResults.length === 0 && !searching && !editingQuoteId && (
        <div className="bg-card border border-dashed border-border rounded-lg p-10 text-center">
          <Search className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
          <p className="text-sm text-muted-foreground font-medium">ابحث عن الأصناف لإنشاء عرض سعر</p>
          <p className="text-xs text-muted-foreground/60 mt-1">يمكنك البحث بالاسم أو رقم القطعة</p>
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-4">
      {/* View Toggle */}
      <div className="flex gap-2">
        <Button
          variant={activeView === "builder" || activeView === "edit" ? "default" : "outline"}
          size="sm"
          className="h-9"
          onClick={() => {
            if (activeView === "edit") return; // Stay in edit
            setActiveView("builder");
            setEditingQuoteId(null);
            setEditingQuoteNumber("");
            setQuoteItems([]);
            setNotes("");
          }}
        >
          <FileText className="w-4 h-4 ml-1.5" />
          {editingQuoteId ? `تعديل عرض` : "إنشاء عرض سعر"}
        </Button>
        <Button
          variant={activeView === "saved" ? "default" : "outline"}
          size="sm"
          className="h-9"
          onClick={() => setActiveView("saved")}
        >
          <Save className="w-4 h-4 ml-1.5" />
          العروض المحفوظة ({savedQuotes.length})
        </Button>
      </div>

      {activeView === "saved" ? (
        <div className="space-y-2">
          {savedQuotes.length === 0 ? (
            <div className="bg-card border border-dashed border-border rounded-lg p-10 text-center">
              <FileText className="w-10 h-10 mx-auto text-muted-foreground/30 mb-3" />
              <p className="text-sm text-muted-foreground font-medium">لا توجد عروض محفوظة</p>
            </div>
          ) : (
            savedQuotes.map(q => (
              <div
                key={q.id}
                className="bg-card border border-border rounded-lg p-3.5 flex items-center gap-3 cursor-pointer hover:border-primary/30 hover:shadow-md transition-all group"
                onClick={() => openSavedQuote(q)}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="font-bold text-foreground text-sm">{q.quote_number}</p>
                    <Badge
                      variant={q.status === "converted" ? "default" : "secondary"}
                      className="text-[10px] h-5"
                    >
                      {q.status === "draft" ? "مسودة" : q.status === "converted" ? "تم التحويل لطلب" : q.status}
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    {new Date(q.created_at).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </p>
                  {q.notes && <p className="text-[11px] text-muted-foreground/70 mt-0.5 truncate">{q.notes}</p>}
                  <p className="text-[10px] text-primary/60 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">اضغط لفتح العرض والتعديل ←</p>
                </div>
                <p className="font-bold text-foreground text-sm shrink-0">{Number(q.total_amount).toLocaleString("ar-EG")} ج.م</p>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 text-[#25D366] hover:bg-[#25D366]/10"
                    title="مشاركة عبر واتساب"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Quick share with basic info
                      shareQuoteWhatsApp({
                        quoteNumber: q.quote_number,
                        date: new Date(q.created_at).toLocaleDateString("ar-EG"),
                        items: [],
                        totalAmount: Number(q.total_amount),
                        notes: q.notes || undefined,
                      });
                    }}
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-8 h-8 text-destructive hover:bg-destructive/10"
                    onClick={(e) => { e.stopPropagation(); deleteQuote(q.id); }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        renderBuilder()
      )}
    </div>
  );
};

export default DealerQuoteBuilder;
