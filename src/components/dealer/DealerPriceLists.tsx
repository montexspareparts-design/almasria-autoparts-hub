import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { toast } from "@/hooks/use-toast";
import { generateQuotePdf } from "@/lib/generateQuotePdf";
import { shareQuoteWhatsApp, shareQuoteEmail } from "@/lib/shareQuote";
import {
  FileText, Download, Clock, RefreshCw, Eye, Search,
  Plus, X, ShoppingCart, ArrowLeft, Loader2, AlertTriangle, ChevronRight,
  CheckCircle2, Printer, MessageCircle, Mail
} from "lucide-react";

interface PriceList {
  id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  version: string | null;
  created_at: string;
  updated_at: string;
}

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

const DAILY_LIMIT = 20;

interface PriceListQuoteData {
  priceListTitle: string;
  quoteId: string;
  quoteNumber: string;
  items: { productId: string; quantity: number; unitPrice: number }[];
  notes: string;
}

interface DealerPriceListsProps {
  onNavigateToQuotes?: () => void;
  editingQuoteData?: PriceListQuoteData | null;
  onClearEditingQuote?: () => void;
}

const DealerPriceLists = ({ onNavigateToQuotes, editingQuoteData, onClearEditingQuote }: DealerPriceListsProps) => {
  const { user, dealerAccount } = useAuth();
  const [lists, setLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);

  // PDF Viewer state
  const [viewingList, setViewingList] = useState<PriceList | null>(null);
  const [pdfSignedUrl, setPdfSignedUrl] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Product search & quote state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<{ product: Product; quantity: number }[]>([]);
  const [dailyViews, setDailyViews] = useState(0);
  const [tierPrices, setTierPrices] = useState<Record<string, number>>({});
  const [priceListPrices, setPriceListPrices] = useState<Record<string, number | null>>({});
  const [savingQuote, setSavingQuote] = useState(false);
  const [dealerInfo, setDealerInfo] = useState<{ name: string; phone: string } | null>(null);
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);
  const [editingQuoteNumber, setEditingQuoteNumber] = useState<string | null>(null);

  // Today's priced items
  const [todayPricedItems, setTodayPricedItems] = useState<Product[]>([]);
  const [loadingTodayItems, setLoadingTodayItems] = useState(false);

  // Quote summary state
  const [createdQuote, setCreatedQuote] = useState<{
    quoteNumber: string;
    items: { product: Product; quantity: number; price: number }[];
    totalAmount: number;
    priceListTitle: string;
    createdAt: Date;
  } | null>(null);

  useEffect(() => {
    fetchLists();
    if (user) {
      fetchDailyViews();
      fetchDealerInfo();
      fetchTodayPricedItems();
    }
  }, []);

  const fetchTodayPricedItems = async () => {
    if (!user) return;
    setLoadingTodayItems(true);
    const today = new Date().toISOString().split("T")[0];
    const { data: views } = await supabase
      .from("dealer_price_views")
      .select("product_id, viewed_at")
      .eq("user_id", user.id)
      .eq("view_date", today)
      .order("viewed_at", { ascending: false });

    if (views && views.length > 0) {
      const productIds = views.map(v => v.product_id);
      const { data: products } = await supabase
        .from("products")
        .select("id, name_ar, sku, base_price, sale_price, is_on_sale, image_url, stock_quantity")
        .in("id", productIds)
        .eq("is_active", true);
      
      // Maintain order from views
      const productMap = new Map((products || []).map(p => [p.id, p as Product]));
      const ordered = productIds.map(id => productMap.get(id)).filter(Boolean) as Product[];
      setTodayPricedItems(ordered);
    } else {
      setTodayPricedItems([]);
    }
    setLoadingTodayItems(false);
  };

  // Auto-open price list when editing a quote from price list
  useEffect(() => {
    if (!editingQuoteData || lists.length === 0) return;
    
    const matchingList = lists.find(l => l.title === editingQuoteData.priceListTitle);
    if (matchingList) {
      setEditingQuoteId(editingQuoteData.quoteId);
      setEditingQuoteNumber(editingQuoteData.quoteNumber);
      
      // Load the selected items
      const loadItems = async () => {
        const productIds = editingQuoteData.items.map(i => i.productId);
        const { data: products } = await supabase
          .from("products")
          .select("id, name_ar, sku, base_price, sale_price, is_on_sale, image_url, stock_quantity")
          .in("id", productIds);
        
        if (products) {
          const productMap = new Map(products.map(p => [p.id, p as Product]));
          const loaded: { product: Product; quantity: number }[] = [];
          for (const item of editingQuoteData.items) {
            const product = productMap.get(item.productId);
            if (product) {
              loaded.push({ product, quantity: item.quantity });
              setTierPrices(prev => ({ ...prev, [product.id]: item.unitPrice }));
            }
          }
          setSelectedProducts(loaded);
        }

        // Open the price list
        openPriceList(matchingList);
        onClearEditingQuote?.();
      };
      loadItems();
    }
  }, [editingQuoteData, lists]);

  const fetchDealerInfo = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("dealer_applications")
      .select("business_name, phone")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) setDealerInfo({ name: data.business_name, phone: data.phone });
  };

  const fetchLists = async () => {
    const { data } = await supabase
      .from("price_lists")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    setLists((data as PriceList[]) || []);
    setLoading(false);
  };

  const fetchDailyViews = async () => {
    const { data } = await supabase.rpc("get_daily_view_count", { _user_id: user!.id });
    setDailyViews(data || 0);
  };

  const normalizeStoragePath = (value: string) => value.replace(/^\/+/, "").trim();

  const extractStorageReference = (value: string): { bucket: string; path: string } | null => {
    if (!value) return null;
    const normalized = normalizeStoragePath(value);
    if (!normalized) return null;

    if (!normalized.startsWith("http")) {
      if (normalized.startsWith("price-lists/")) {
        return { bucket: "price-lists", path: normalized.replace(/^price-lists\//, "") };
      }
      if (normalized.startsWith("catalogs/")) {
        return { bucket: "catalogs", path: normalized.replace(/^catalogs\//, "") };
      }
      return { bucket: "price-lists", path: normalized };
    }

    try {
      const url = new URL(normalized);
      const marker = "/storage/v1/object/";
      const markerIndex = url.pathname.indexOf(marker);
      if (markerIndex === -1) return null;

      const storageParts = url.pathname
        .slice(markerIndex + marker.length)
        .split("/")
        .filter(Boolean);

      if (storageParts.length < 3) return null;

      const bucket = storageParts[1];
      const path = decodeURIComponent(storageParts.slice(2).join("/"));
      if (!bucket || !path) return null;

      return { bucket, path };
    } catch {
      return null;
    }
  };

  const buildStorageCandidates = (fileRef: string) => {
    const candidates: Array<{ bucket: string; path: string }> = [];
    const parsed = extractStorageReference(fileRef);

    if (parsed) {
      candidates.push(parsed);

      if (parsed.bucket === "price_lists") {
        candidates.push({ bucket: "price-lists", path: parsed.path });
      }

      if (parsed.bucket === "catalogs" && parsed.path.startsWith("price-lists/")) {
        candidates.push({ bucket: "price-lists", path: parsed.path.replace(/^price-lists\//, "") });
      }
    }

    const rawPath = normalizeStoragePath(fileRef)
      .replace(/^https?:\/\//, "")
      .replace(/^price-lists\//, "")
      .replace(/^catalogs\//, "");

    if (rawPath && !rawPath.includes("/storage/v1/object/")) {
      candidates.push({ bucket: "price-lists", path: rawPath });
      candidates.push({ bucket: "catalogs", path: rawPath });
    }

    return candidates.filter(
      (candidate, index, all) =>
        candidate.bucket &&
        candidate.path &&
        all.findIndex((c) => c.bucket === candidate.bucket && c.path === candidate.path) === index
    );
  };

  const searchProducts = useCallback(async (query: string) => {
    if (query.length < 2 || !viewingList) { setSearchResults([]); return; }
    setSearching(true);

    // Get product IDs and prices linked to this price list
    const { data: linked } = await supabase
      .from("price_list_products")
      .select("product_id, price")
      .eq("price_list_id", viewingList.id) as any;

    const linkedIds = (linked || []).map((l: any) => l.product_id);
    
    // Store price list prices
    const plPrices: Record<string, number | null> = {};
    for (const l of (linked || [])) {
      plPrices[l.product_id] = l.price != null ? Number(l.price) : null;
    }
    setPriceListPrices(prev => ({ ...prev, ...plPrices }));

    if (linkedIds.length === 0) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    const { data } = await supabase
      .from("products")
      .select("id, name_ar, sku, base_price, sale_price, is_on_sale, image_url, stock_quantity")
      .eq("is_active", true)
      .in("id", linkedIds)
      .or(`name_ar.ilike.%${query}%,sku.ilike.%${query}%`)
      .limit(10);
    setSearchResults(data || []);
    setSearching(false);
  }, [viewingList]);

  useEffect(() => {
    const timeout = setTimeout(() => searchProducts(searchQuery), 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, searchProducts]);

  const getProductPrice = async (product: Product): Promise<number> => {
    // Priority 1: Price from the price list (Excel upload)
    if (priceListPrices[product.id] != null && priceListPrices[product.id]! > 0) {
      return priceListPrices[product.id]!;
    }
    // Priority 2: Tier price
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
    // Priority 3: Sale/base price
    const price = product.is_on_sale && product.sale_price ? product.sale_price : product.base_price;
    setTierPrices(prev => ({ ...prev, [product.id]: price }));
    return price;
  };

  const addProduct = async (product: Product) => {
    const totalSelected = selectedProducts.reduce((sum, p) => sum + p.quantity, 0);
    if (dailyViews + totalSelected >= DAILY_LIMIT) {
      toast({ title: "تم الوصول للحد اليومي", description: `الحد الأقصى ${DAILY_LIMIT} صنف يومياً`, variant: "destructive" });
      return;
    }
    const existing = selectedProducts.find(p => p.product.id === product.id);
    if (existing) {
      setSelectedProducts(prev => prev.map(p =>
        p.product.id === product.id ? { ...p, quantity: p.quantity + 1 } : p
      ));
      return;
    }
    // Pre-fetch price
    await getProductPrice(product);
    setSelectedProducts(prev => [...prev, { product, quantity: 1 }]);
    setSearchQuery("");
    setSearchResults([]);
  };

  const removeProduct = (productId: string) => {
    setSelectedProducts(prev => prev.filter(p => p.product.id !== productId));
  };

  const convertDirectToOrder = async () => {
    if (selectedProducts.length === 0 || !user) return;
    setSavingQuote(true);

    const items = await Promise.all(
      selectedProducts.map(async (sp) => {
        const price = await getProductPrice(sp.product);
        return { product: sp.product, quantity: sp.quantity, price };
      })
    );
    const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
    const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

    const { data: order, error } = await supabase
      .from("orders")
      .insert({ user_id: user.id, order_number: orderNumber, total_amount: totalAmount, status: "pending" })
      .select()
      .single();

    if (error || !order) {
      toast({ title: "خطأ في إنشاء الطلب", variant: "destructive" });
      setSavingQuote(false);
      return;
    }

    await supabase.from("order_items").insert(
      items.map(i => ({
        order_id: (order as any).id,
        product_id: i.product.id,
        quantity: i.quantity,
        unit_price: i.price,
        total_price: i.price * i.quantity,
      }))
    );

    // Record price views
    const today = new Date().toISOString().split("T")[0];
    for (const sp of selectedProducts) {
      await supabase.from("dealer_price_views").upsert(
        { user_id: user.id, product_id: sp.product.id, view_date: today },
        { onConflict: "user_id,product_id,view_date" }
      );
    }

    toast({ title: "تم إرسال الطلبية ✓", description: `رقم الطلب: ${orderNumber}` });
    setSelectedProducts([]);
    setSavingQuote(false);
    fetchDailyViews();
  };

  const sendToQuote = async () => {
    if (selectedProducts.length === 0 || !user) return;
    setSavingQuote(true);

    const quoteNumber = editingQuoteNumber || `Q-${Date.now().toString(36).toUpperCase()}`;
    const items = await Promise.all(
      selectedProducts.map(async (sp) => {
        const price = await getProductPrice(sp.product);
        return { product: sp.product, quantity: sp.quantity, price };
      })
    );

    const totalAmount = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

    let quoteId = editingQuoteId;

    if (editingQuoteId) {
      // Update existing quote
      await supabase.from("dealer_quotes").update({
        total_amount: totalAmount,
        notes: viewingList ? `من كشف الأسعار: ${viewingList.title}` : null,
      }).eq("id", editingQuoteId);
      
      await supabase.from("dealer_quote_items").delete().eq("quote_id", editingQuoteId);
      
      await supabase.from("dealer_quote_items").insert(
        items.map(i => ({
          quote_id: editingQuoteId!,
          product_id: i.product.id,
          quantity: i.quantity,
          unit_price: i.price,
          total_price: i.price * i.quantity,
        }))
      );
      
      toast({ title: "تم تحديث العرض ✓", description: `رقم العرض: ${quoteNumber}` });
    } else {
      // Create new quote
      const { data: quote, error } = await supabase
        .from("dealer_quotes")
        .insert({
          user_id: user.id,
          quote_number: quoteNumber,
          total_amount: totalAmount,
          notes: viewingList ? `من كشف الأسعار: ${viewingList.title}` : null,
        })
        .select()
        .single();

      if (error || !quote) {
        toast({ title: "خطأ في حفظ العرض", variant: "destructive" });
        setSavingQuote(false);
        return;
      }

      quoteId = (quote as any).id;

      await supabase.from("dealer_quote_items").insert(
        items.map(i => ({
          quote_id: quoteId!,
          product_id: i.product.id,
          quantity: i.quantity,
          unit_price: i.price,
          total_price: i.price * i.quantity,
        }))
      );
    }

    // Record price views (upsert to avoid duplicate counting)
    const today = new Date().toISOString().split("T")[0];
    for (const sp of selectedProducts) {
      await supabase.from("dealer_price_views").upsert(
        { user_id: user.id, product_id: sp.product.id, view_date: today },
        { onConflict: "user_id,product_id,view_date" }
      );
    }

    // Show quote summary with action options
    setCreatedQuote({
      quoteNumber,
      items,
      totalAmount,
      priceListTitle: viewingList?.title || "",
      createdAt: new Date(),
    });

    setSelectedProducts([]);
    setEditingQuoteId(null);
    setEditingQuoteNumber(null);
    setSavingQuote(false);
  };


  const remainingToday = Math.max(0, DAILY_LIMIT - dailyViews - selectedProducts.reduce((s, p) => s + p.quantity, 0));

  // Get signed URL for PDF viewing
  const openPriceList = async (list: PriceList) => {
    setViewingList(list);
    setPdfSignedUrl(null);

    if (!list.file_url) return;

    setPdfLoading(true);

    try {
      const candidates = buildStorageCandidates(list.file_url);

      for (const candidate of candidates) {
        const { data, error } = await supabase.storage
          .from(candidate.bucket)
          .createSignedUrl(candidate.path, 3600);

        if (!error && data?.signedUrl) {
          setPdfSignedUrl(data.signedUrl);
          return;
        }
      }

      toast({
        title: "تعذر فتح الملف",
        description: "الملف غير متاح حالياً. يرجى إعادة رفع الكشف من لوحة الإدارة.",
        variant: "destructive",
      });
    } finally {
      setPdfLoading(false);
    }
  };

  // ─── QUOTE SUMMARY MODE ───
  if (createdQuote) {
    const quoteShareData = {
      quoteNumber: createdQuote.quoteNumber,
      date: createdQuote.createdAt.toLocaleDateString("ar-EG"),
      dealerName: dealerInfo?.name,
      dealerPhone: dealerInfo?.phone,
      items: createdQuote.items.map(i => ({
        name: i.product.name_ar,
        sku: i.product.sku,
        quantity: i.quantity,
        unitPrice: i.price,
        totalPrice: i.price * i.quantity,
      })),
      totalAmount: createdQuote.totalAmount,
    };

    const convertToOrder = async () => {
      if (!user) return;
      setSavingQuote(true);
      const orderNumber = `ORD-${Date.now().toString(36).toUpperCase()}`;

      const { data: order, error } = await supabase
        .from("orders")
        .insert({ user_id: user.id, order_number: orderNumber, total_amount: createdQuote.totalAmount, status: "pending" })
        .select()
        .single();

      if (error || !order) {
        toast({ title: "خطأ في إنشاء الطلب", variant: "destructive" });
        setSavingQuote(false);
        return;
      }

      await supabase.from("order_items").insert(
        createdQuote.items.map(i => ({
          order_id: (order as any).id,
          product_id: i.product.id,
          quantity: i.quantity,
          unit_price: i.price,
          total_price: i.price * i.quantity,
        }))
      );

      toast({ title: "تم إرسال الطلبية ✓", description: `رقم الطلب: ${orderNumber}` });
      setCreatedQuote(null);
      setSavingQuote(false);
    };

    return (
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => setCreatedQuote(null)}>
            <ArrowLeft className="w-4 h-4 ml-1" />
            رجوع للكشف
          </Button>
        </div>

        <div className="border border-primary/20 rounded-lg bg-primary/5 p-4 text-center">
          <CheckCircle2 className="w-10 h-10 mx-auto text-primary mb-2" />
          <h3 className="text-lg font-bold text-foreground">تم حفظ عرض السعر بنجاح</h3>
          <p className="text-sm text-muted-foreground mt-1">رقم العرض: <span className="font-bold text-foreground">{createdQuote.quoteNumber}</span></p>
        </div>

        {/* Quote Items Table */}
        <div className="border border-border rounded-lg bg-card overflow-hidden">
          <div className="p-3 border-b border-border bg-muted/30 flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">تفاصيل العرض ({createdQuote.items.length} صنف)</span>
            <span className="text-xs text-muted-foreground">{createdQuote.createdAt.toLocaleDateString("ar-EG")}</span>
          </div>
          <div className="divide-y divide-border">
            {createdQuote.items.map((item, idx) => (
              <div key={item.product.id} className="flex items-center gap-3 p-3">
                <span className="text-xs text-muted-foreground w-6 shrink-0">{idx + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{item.product.name_ar}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{item.product.sku}</p>
                </div>
                <div className="text-left shrink-0 space-y-0.5">
                  <p className="text-xs text-muted-foreground">×{item.quantity}</p>
                  <p className="text-xs font-bold text-foreground">{(item.price * item.quantity).toLocaleString("ar-EG")} ج.م</p>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4 border-t border-border bg-muted/30 flex items-center justify-between">
            <span className="text-sm font-bold text-foreground">الإجمالي</span>
            <span className="text-lg font-bold text-primary">{createdQuote.totalAmount.toLocaleString("ar-EG")} ج.م</span>
          </div>
        </div>

        {/* Action Options */}
        <div className="space-y-4">
          <h4 className="text-base font-bold text-foreground text-center">ماذا تريد أن تفعل؟</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Button 
              size="lg" 
              variant="outline"
              className="h-20 text-base gap-3 border-2 border-primary hover:bg-primary/10 flex-col"
              onClick={() => generateQuotePdf(quoteShareData)}
            >
              <Download className="w-7 h-7 text-primary" />
              <span className="font-bold">تحميل عرض السعر PDF</span>
            </Button>
            <Button 
              size="lg" 
              className="h-20 text-base gap-3 bg-destructive hover:bg-destructive/90 flex-col"
              onClick={convertToOrder} 
              disabled={savingQuote}
            >
              {savingQuote ? <Loader2 className="w-7 h-7 animate-spin" /> : <ShoppingCart className="w-7 h-7" />}
              <span className="font-bold">تحويل لطلبية</span>
            </Button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              className="gap-1"
              onClick={() => shareQuoteWhatsApp(quoteShareData)}
            >
              <MessageCircle className="w-4 h-4" />
              واتساب
            </Button>
            <Button
              variant="outline"
              className="gap-1"
              onClick={() => shareQuoteEmail(quoteShareData)}
            >
              <Mail className="w-4 h-4" />
              إيميل
            </Button>
            <Button variant="ghost" onClick={() => setCreatedQuote(null)}>
              <ArrowLeft className="w-4 h-4 ml-1" />
              عودة للكشف
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─── PDF VIEWER MODE ───
  if (viewingList) {
    const downloadPdf = () => {
      if (pdfSignedUrl) window.open(pdfSignedUrl, "_blank");
    };

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => { setViewingList(null); setSelectedProducts([]); setSearchQuery(""); setPdfSignedUrl(null); setEditingQuoteId(null); setEditingQuoteNumber(null); }}>
            <ArrowLeft className="w-4 h-4 ml-1" />
            رجوع
          </Button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-bold text-foreground truncate">{viewingList.title}</h2>
            {viewingList.version && <p className="text-[10px] text-muted-foreground">{viewingList.version}</p>}
          </div>
          {editingQuoteId && (
            <Badge variant="secondary" className="text-xs">
              تعديل العرض: {editingQuoteNumber}
            </Badge>
          )}
          {pdfSignedUrl && (
            <Button variant="outline" size="sm" onClick={downloadPdf}>
              <Download className="w-4 h-4 ml-1" />
              تحميل
            </Button>
          )}
        </div>

        <div className="flex flex-col lg:flex-row gap-4">
          {/* PDF Viewer */}
          <div className="flex-1 min-w-0">
            {pdfLoading ? (
              <div className="border border-border rounded-lg bg-muted/30 flex items-center justify-center" style={{ height: "70vh" }}>
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            ) : pdfSignedUrl ? (
              <div className="border border-border rounded-lg overflow-hidden bg-muted/30" style={{ height: "70vh" }}>
                <iframe
                  src={`https://docs.google.com/gview?embedded=true&url=${encodeURIComponent(pdfSignedUrl)}`}
                  className="w-full h-full"
                  title={viewingList.title}
                  allow="autoplay"
                />
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-16 text-center">
                  <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground">لا يوجد ملف مرفق لهذا الكشف</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Side Panel - Product Search & Selected */}
          <div className="w-full lg:w-80 xl:w-96 shrink-0 space-y-3">
            {/* Daily Limit */}
            <div className={`rounded-lg border p-2.5 flex items-center gap-2 text-xs ${remainingToday <= 5 ? "border-destructive/30 bg-destructive/5" : "border-primary/20 bg-primary/5"}`}>
              {remainingToday <= 5 ? (
                <AlertTriangle className="w-3.5 h-3.5 text-destructive shrink-0" />
              ) : (
                <Eye className="w-3.5 h-3.5 text-primary shrink-0" />
              )}
              <span className="text-foreground">
                المتبقي: <strong>{remainingToday}</strong> من {DAILY_LIMIT} صنف يومياً
              </span>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="ابحث برقم القطعة أو الاسم..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pr-10 h-10 text-sm"
                disabled={remainingToday === 0}
              />
              {searchQuery && (
                <button onClick={() => { setSearchQuery(""); setSearchResults([]); }} className="absolute left-3 top-1/2 -translate-y-1/2">
                  <X className="w-4 h-4 text-muted-foreground" />
                </button>
              )}
            </div>

            {/* Search Results */}
            {searchResults.length > 0 && (
              <div className="border border-border rounded-lg bg-card max-h-48 overflow-y-auto">
                {searchResults.map(product => (
                  <button
                    key={product.id}
                    onClick={() => addProduct(product)}
                    className="w-full flex items-center gap-2 p-2.5 hover:bg-muted transition-colors text-right border-b border-border last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{product.name_ar}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{product.sku}</p>
                    </div>
                    <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <Plus className="w-3 h-3 text-primary" />
                    </div>
                  </button>
                ))}
              </div>
            )}

            {searching && (
              <div className="flex justify-center py-3">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
              </div>
            )}

            {/* Selected Products */}
            <div className="border border-border rounded-lg bg-card">
              <div className="flex items-center gap-2 p-3 border-b border-border">
                <ShoppingCart className="w-4 h-4 text-foreground" />
                <span className="text-xs font-bold text-foreground flex-1">
                  أصناف مختارة ({selectedProducts.length})
                </span>
              </div>

              {selectedProducts.length === 0 ? (
                <div className="p-6 text-center">
                  <p className="text-xs text-muted-foreground">ابحث عن أصناف من الكشف وأضفها هنا</p>
                </div>
              ) : (
                <div className="divide-y divide-border max-h-60 overflow-y-auto">
                  {selectedProducts.map(sp => (
                    <div key={sp.product.id} className="flex items-center gap-2 p-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{sp.product.name_ar}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{sp.product.sku}</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge variant="secondary" className="text-[9px] h-5">×{sp.quantity}</Badge>
                        <button onClick={() => removeProduct(sp.product.id)} className="p-1 hover:bg-destructive/10 rounded">
                          <X className="w-3 h-3 text-destructive" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedProducts.length > 0 && (
                <div className="p-3 border-t border-border space-y-2">
                  <Button
                    size="sm"
                    className="w-full h-9 text-xs gap-1"
                    onClick={sendToQuote}
                    disabled={savingQuote}
                  >
                    {savingQuote ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ShoppingCart className="w-3.5 h-3.5" />
                    )}
                    {editingQuoteId ? `تحديث العرض (${selectedProducts.length} صنف)` : `إرسال كعرض سعر (${selectedProducts.length} صنف)`}
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    className="w-full h-9 text-xs gap-1 bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20"
                    onClick={convertDirectToOrder}
                    disabled={savingQuote}
                  >
                    {savingQuote ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <ShoppingCart className="w-3.5 h-3.5" />
                    )}
                    تحويل لطلبية مباشرة ({selectedProducts.length} صنف)
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="w-full h-7 text-[10px] text-muted-foreground"
                    onClick={() => setSelectedProducts([])}
                  >
                    مسح الكل
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── LIST MODE ───
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-lg bg-muted/50 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold text-foreground">عروض الأسعار</h2>
        <div className="flex items-center gap-2">
          {onNavigateToQuotes && (
            <Button variant="outline" size="sm" onClick={onNavigateToQuotes}>
              <ShoppingCart className="w-4 h-4 ml-1" />
              عروض الأسعار
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={fetchLists}>
            <RefreshCw className="w-4 h-4 ml-1" />
            تحديث
          </Button>
        </div>
      </div>

      {/* Today's Priced Items */}
      {loadingTodayItems ? (
        <div className="h-16 rounded-lg bg-muted/50 animate-pulse" />
      ) : todayPricedItems.length > 0 && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-bold text-foreground">أصناف تم تسعيرها اليوم ({todayPricedItems.length})</h3>
            </div>
            <div className="space-y-2">
              {todayPricedItems.map(product => (
                <div key={product.id} className="flex items-center gap-3 bg-card rounded-lg border border-border/30 p-2.5">
                  <div className="w-9 h-9 rounded-lg bg-muted/60 shrink-0 overflow-hidden flex items-center justify-center">
                    {product.image_url ? (
                      <img src={product.image_url} alt="" className="w-full h-full object-contain p-0.5" />
                    ) : (
                      <FileText className="w-4 h-4 text-muted-foreground/30" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-foreground truncate">{product.name_ar}</p>
                    <p className="text-[10px] text-muted-foreground font-mono">{product.sku}</p>
                  </div>
                  <Badge variant="secondary" className="text-[9px] shrink-0">
                    {product.stock_quantity > 0 ? "متوفر" : "غير متوفر"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {lists.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">لا توجد كشوفات أسعار متاحة حالياً</p>
            <p className="text-xs text-muted-foreground/60 mt-1">سيتم إشعارك عند رفع كشف جديد</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {lists.map(list => {
            const isRecent = Date.now() - new Date(list.created_at).getTime() < 7 * 24 * 60 * 60 * 1000;
            return (
              <Card key={list.id} className="border-border/50 hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground text-sm truncate">{list.title}</h3>
                        {isRecent && <Badge variant="default" className="text-[9px] h-4 bg-emerald-500">جديد</Badge>}
                        {list.version && <Badge variant="secondary" className="text-[9px] h-4">{list.version}</Badge>}
                      </div>
                      {list.description && (
                        <p className="text-xs text-muted-foreground mb-2">{list.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground/70">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(list.updated_at).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" })}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="default"
                        size="sm"
                        className="gap-1"
                        onClick={() => openPriceList(list)}
                      >
                        <Eye className="w-4 h-4" />
                        فتح
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DealerPriceLists;
