import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { LazyImage } from "@/components/ui/lazy-image";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useDealerCart } from "@/hooks/useDealerCart";
import { generateOrderNumber } from "@/lib/orderNumber";
import { pushOrderToERP } from "@/lib/erpSync";
import { notifyNewOrderWhatsApp } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import {
  ShoppingCart, Trash2, Minus, Plus, Package, Loader2,
  ArrowRight, CreditCard, Shield, Copy, Check,
  Search, X, CheckCircle2, Save, Send, PlusCircle, AlertTriangle, MapPin
} from "lucide-react";

const PICKUP_BRANCHES = [
  { value: "ossim", label: "أوسيم" },
  { value: "luxor", label: "الأقصر" },
  { value: "tawfiqia", label: "التوفيقية" },
] as const;
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import ProductDetailDialog from "@/components/ProductDetailDialog";

interface DealerCartProps {
  onNavigateToOrders: () => void;
  onNavigateToPayment: (orderInfo?: { id: string; orderNumber: string; amount: number }) => void;
  sharedCart?: ReturnType<typeof useDealerCart>;
}

const DealerCart = ({ onNavigateToOrders, onNavigateToPayment, sharedCart }: DealerCartProps) => {
  const { user, dealerAccount } = useAuth();
  const fallbackCart = useDealerCart();
  const cart = sharedCart || fallbackCart;
  const { items, loading, updateQuantity, removeItem, clearCart, addItem } = cart;

  const [tierPrices, setTierPrices] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  // ERP dialog
  const [erpDialog, setErpDialog] = useState<{ open: boolean; erpCode: string; orderNumber: string }>({ open: false, erpCode: "", orderNumber: "" });
  const [copied, setCopied] = useState(false);
  const [pickupBranch, setPickupBranch] = useState<string>(() => localStorage.getItem("dealer_pickup_branch") || "");

  // Search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [detailProduct, setDetailProduct] = useState<any>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout>();

  // Fetch max order percentage setting
  const { data: maxOrderPct } = useQuery({
    queryKey: ["site_settings", "max_order_percentage"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "max_order_percentage")
        .maybeSingle();
      return parseInt(data?.value || "25") || 25;
    },
    staleTime: 10 * 60 * 1000,
  });

  // Fetch product order locks (products the dealer already ordered at current stock level)
  const { data: productLocks, refetch: refetchLocks } = useQuery({
    queryKey: ["dealer_product_order_locks", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase
        .from("dealer_product_order_locks" as any)
        .select("product_id, stock_at_order, quantity_ordered")
        .eq("user_id", user.id);
      return (data as unknown as { product_id: string; stock_at_order: number; quantity_ordered: number }[]) || [];
    },
    enabled: !!user,
    staleTime: 30 * 1000,
  });

  // Check if a product is locked (ordered before and stock hasn't increased)
  const isProductLocked = useCallback((productId: string, currentStock: number) => {
    if (!productLocks) return false;
    return productLocks.some(
      lock => lock.product_id === productId && currentStock <= lock.stock_at_order
    );
  }, [productLocks]);

  // Fetch tier prices
  useEffect(() => {
    const fetchTierPrices = async () => {
      if (!dealerAccount?.tier || items.length === 0) return;
      const productIds = items.map(i => i.product_id);
      const { data } = await supabase
        .from("product_tier_prices")
        .select("product_id, price")
        .eq("tier", dealerAccount.tier as any)
        .in("product_id", productIds);
      if (data) {
        const map: Record<string, number> = {};
        data.forEach(tp => { map[tp.product_id] = tp.price; });
        setTierPrices(map);
      }
    };
    fetchTierPrices();
  }, [items.length, dealerAccount?.tier]);

  // Auto-clear cart on paid order
  useEffect(() => {
    const checkPendingPayment = async () => {
      const pendingOrderId = localStorage.getItem("dealer_pending_payment_order");
      if (!pendingOrderId || !user) return;
      const { data } = await supabase
        .from("orders")
        .select("status")
        .eq("id", pendingOrderId)
        .eq("user_id", user.id)
        .single();
      if (data && !["pending", "awaiting_payment"].includes(data.status)) {
        await clearCart();
        localStorage.removeItem("dealer_pending_payment_order");
        toast({ title: "✅ تم الدفع بنجاح", description: "تم تفريغ السلة تلقائياً" });
      }
    };
    checkPendingPayment();
  }, [user]);

  const getPrice = (item: typeof items[0]) => {
    if (tierPrices[item.product_id]) return tierPrices[item.product_id];
    return item.product.base_price;
  };

  const subtotal = items.reduce((sum, item) => sum + getPrice(item) * item.quantity, 0);
  const vat = 0;
  const total = subtotal;

  // Compute max allowed per item
  const maxAllowedMap = useMemo(() => {
    const pct = maxOrderPct || 25;
    const map: Record<string, number> = {};
    for (const item of items) {
      const available = Math.max(0, (item.product.stock_quantity || 0) - (item.product.safety_stock || 0));
      const pctCap = Math.max(1, Math.floor(available * pct / 100));
      const maxAllowed = item.product.max_order_cap ? Math.min(pctCap, item.product.max_order_cap) : pctCap;
      map[item.product_id] = maxAllowed;
    }
    return map;
  }, [items, maxOrderPct]);

  // Track quantity direction for animation
  const [qtyDirection, setQtyDirection] = useState<Record<string, 'up' | 'down'>>({});

  // Smart quantity update with auto-correction
  const handleQtyChange = useCallback((productId: string, newQty: number) => {
    const currentItem = items.find(i => i.product_id === productId);
    if (!currentItem) return;
    const max = maxAllowedMap[productId] || 999;
    
    setQtyDirection(prev => ({
      ...prev,
      [productId]: newQty > (currentItem.quantity) ? 'up' : 'down'
    }));

    if (newQty > max) {
      updateQuantity(productId, max);
      toast({ title: `الحد الأقصى ${max} قطعة`, description: currentItem.product.name_ar });
      return;
    }
    updateQuantity(productId, newQty);
  }, [items, maxAllowedMap, updateQuantity]);

  // Auto-correct items that exceed max allowed (e.g. added from priced-today with higher qty)
  useEffect(() => {
    if (!items.length || !maxOrderPct) return;
    let corrected = false;
    for (const item of items) {
      const max = maxAllowedMap[item.product_id];
      if (max && item.quantity > max) {
        updateQuantity(item.product_id, max);
        corrected = true;
      }
    }
    if (corrected) {
      toast({ title: "تم تعديل بعض الكميات تلقائياً", description: "حسب سياسة الطلبيات المتفق عليها" });
    }
  }, [items.length, maxOrderPct]); // only on load/items count change

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }
    searchTimeout.current = setTimeout(async () => {
      setSearching(true);
      const { data } = await supabase
        .from("products")
        .select("id, name_ar, sku, base_price, image_url, stock_quantity, safety_stock, max_order_cap, brand")
        .eq("is_active", true)
        .or(`name_ar.ilike.%${query}%,sku.ilike.%${query}%`)
        .limit(10);
      // Compute available and max allowed per item
      const pct = maxOrderPct || 25;
      const enriched = (data || [])
        .map((p: any) => {
          const available = Math.max(0, (p.stock_quantity || 0) - (p.safety_stock || 0));
          const pctCap = Math.max(1, Math.floor(available * pct / 100));
          const maxAllowed = p.max_order_cap ? Math.min(pctCap, p.max_order_cap) : pctCap;
          const locked = isProductLocked(p.id, p.stock_quantity || 0);
          return { ...p, available_quantity: available, max_allowed: maxAllowed, locked };
        })
        .filter((p: any) => p.available_quantity > 0 && !p.locked); // Hide out-of-stock and locked
      setSearchResults(enriched);
      setSearching(false);
    }, 300);
  }, [maxOrderPct, isProductLocked]);

  const handleAddFromSearch = async (product: any) => {
    if (product.locked) {
      toast({ title: "⚠️ هذا الصنف مقفل", description: "لقد طلبت هذا الصنف من قبل. سيتاح مجدداً عند تجديد المخزون.", variant: "destructive" });
      return;
    }
    const existing = items.find(i => i.product_id === product.id);
    const maxAllowed = product.max_allowed || 1;
    if (existing) {
      if (existing.quantity >= maxAllowed) {
        toast({ title: "⚠️ وصلت للحد الأقصى", description: `الحد الأقصى لهذا الصنف: ${maxAllowed} قطعة (${maxOrderPct || 25}% من المتاح)`, variant: "destructive" });
        return;
      }
      await updateQuantity(product.id, existing.quantity + 1);
      toast({ title: "✅ تم زيادة الكمية", description: product.name_ar });
    } else {
      await addItem(product.id, 1);
      toast({ title: "✅ تمت الإضافة", description: `${product.name_ar} — الحد الأقصى: ${maxAllowed} قطعة` });
    }
    setSearchQuery("");
    setSearchResults([]);
  };

  const createOrder = async (): Promise<{ id: string; order_number: string; erpCodePromise: Promise<string | null> } | null> => {
    if (!user || items.length === 0) return null;
    const orderNumber = await generateOrderNumber();
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        order_number: orderNumber,
        total_amount: total,
        notes: notes || null,
        status: "pending",
        pickup_branch: pickupBranch || null,
      } as any)
      .select()
      .single();
    if (error || !order) return null;

    await supabase.from("order_items").insert(
      items.map(item => ({
        order_id: (order as any).id,
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: getPrice(item),
        total_price: getPrice(item) * item.quantity,
      }))
    );

    const erpCodePromise = pushOrderToERP((order as any).id);
    notifyNewOrderWhatsApp(orderNumber, total, undefined, undefined, undefined, pickupBranch || undefined);
    return { id: (order as any).id, order_number: orderNumber, erpCodePromise };
  };

  // Save draft (keep in cart, no order)
  const handleSaveDraft = async () => {
    setSavingDraft(true);
    // Cart is already persisted in DB, just confirm
    await new Promise(r => setTimeout(r, 500));
    toast({ title: "✅ تم الحفظ", description: `${items.length} صنف محفوظ في السلة` });
    setSavingDraft(false);
  };

  // Submit order (pay later)
  const handleSubmitOrder = async () => {
    if (!user || items.length === 0) return;
    if (!pickupBranch) {
      toast({ title: "اختر فرع الاستلام أولاً", description: "حدد الفرع الذي ستستلم منه الطلبية", variant: "destructive" });
      return;
    }
    localStorage.setItem("dealer_pickup_branch", pickupBranch);
    setSubmitting(true);
    try {
      const order = await createOrder();
      if (!order) {
        toast({ title: "خطأ في إنشاء الطلب", variant: "destructive" });
        return;
      }
      await clearCart();
      refetchLocks();
      setNotes("");
      let erpCode = await order.erpCodePromise;
      // If ERP didn't return code immediately, poll DB up to 6s (webhook may set it later)
      if (!erpCode) {
        for (let i = 0; i < 6; i++) {
          await new Promise(r => setTimeout(r, 1000));
          const { data: o } = await supabase.from("orders").select("erp_order_code").eq("id", order.id).maybeSingle();
          if ((o as any)?.erp_order_code) { erpCode = (o as any).erp_order_code; break; }
        }
      }
      const displayCode = erpCode || order.order_number;
      setErpDialog({ open: true, erpCode: displayCode, orderNumber: order.order_number });
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  // Pay now
  const handlePayNow = async () => {
    if (!user || items.length === 0) return;
    if (!pickupBranch) {
      toast({ title: "اختر فرع الاستلام أولاً", description: "حدد الفرع الذي ستستلم منه الطلبية", variant: "destructive" });
      return;
    }
    localStorage.setItem("dealer_pickup_branch", pickupBranch);
    setSubmittingPayment(true);
    try {
      const order = await createOrder();
      if (!order) {
        toast({ title: "خطأ في إنشاء الطلب", variant: "destructive" });
        return;
      }
      localStorage.setItem("dealer_pending_payment_order", order.id);
      toast({ title: "✅ تم إنشاء الطلب", description: `رقم الطلب: ${order.order_number}` });
      setNotes("");
      onNavigateToPayment({ id: order.id, orderNumber: order.order_number, amount: total });
    } catch {
      toast({ title: "حدث خطأ", variant: "destructive" });
    } finally {
      setSubmittingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-sm text-muted-foreground me-2">جاري التحميل...</span>
      </div>
    );
  }

  const isProcessing = submitting || submittingPayment || savingDraft;

  return (
    <div className="space-y-4 max-w-3xl mx-auto">
      {/* Header + Search */}
      <div className="rounded-2xl border border-border/50 bg-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-black text-foreground flex items-center gap-2">
            <ShoppingCart className="w-5 h-5 text-primary" />
            طلبية جديدة
          </h2>
          {items.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-destructive hover:underline flex items-center gap-1"
            >
              <Trash2 className="w-3 h-3" />
              تفريغ الكل
            </button>
          )}
        </div>

        {/* Inline Search */}
        <div className="relative">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => setShowSearch(true)}
              placeholder="ابحث عن صنف بالاسم أو رقم القطعة لإضافته..."
              className="pe-10 ps-10 h-11 text-sm bg-muted/30 border-border/50 rounded-xl"
            />
            {searchQuery && (
              <button
                onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                className="absolute left-3 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Search Results Dropdown */}
          {showSearch && searchQuery.length >= 2 && (
            <div className="absolute z-50 top-full mt-1 w-full bg-card border border-border rounded-xl shadow-xl max-h-72 overflow-y-auto">
              {searching ? (
                <div className="flex items-center justify-center py-6 gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span className="text-xs text-muted-foreground">جاري البحث...</span>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-6 gap-1">
                  <Search className="w-5 h-5 text-muted-foreground/40" />
                  <span className="text-xs text-muted-foreground">لا توجد نتائج لـ "{searchQuery}"</span>
                </div>
              ) : (
                <>
                  <div className="px-3 py-1.5 border-b border-border/30">
                    <span className="text-[10px] font-bold text-muted-foreground">{searchResults.length} نتيجة</span>
                  </div>
                  {searchResults.map((product) => {
                    const alreadyInCart = items.some(i => i.product_id === product.id);
                    return (
                      <div
                        key={product.id}
                        className="flex items-center gap-2 px-3 py-2.5 border-b border-border/20 last:border-0 transition-colors hover:bg-muted/40"
                      >
                        {/* Product info - clickable for details */}
                        <button
                          onClick={() => setDetailProduct(product)}
                          className="flex-1 min-w-0 text-end"
                        >
                          <p className="text-sm font-bold text-foreground truncate leading-tight">{product.name_ar}</p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            <span className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-1 py-0.5 rounded" dir="ltr">#{product.sku}</span>
                            <span className="text-[10px] text-emerald-600">أقصى {product.max_allowed} قطعة</span>
                          </div>
                        </button>
                        {/* Add button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); handleAddFromSearch(product); }}
                          className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all ${
                            alreadyInCart
                              ? 'bg-primary/10 text-primary'
                              : 'bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground'
                          }`}
                        >
                          {alreadyInCart ? <Check className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                        </button>
                      </div>
                    );
                  })}
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Product Detail Dialog */}
      {detailProduct && (
        <ProductDetailDialog
          product={detailProduct}
          open={!!detailProduct}
          onOpenChange={(open) => { if (!open) setDetailProduct(null); }}
          price={detailProduct?.base_price || 0}
        />
      )}

      {/* Cart Items */}
      {items.length === 0 ? (
        <div className="text-center py-12 space-y-3 rounded-2xl border border-dashed border-border/50 bg-muted/20">
          <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
            <ShoppingCart className="w-7 h-7 text-muted-foreground/30" />
          </div>
          <p className="text-sm font-bold text-muted-foreground">ابدأ بالبحث عن أصناف وأضفها لطلبيتك</p>
          <Button variant="outline" size="sm" onClick={() => searchRef.current?.focus()} className="gap-1.5">
            <Search className="w-3.5 h-3.5" />
            ابحث عن صنف
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Items count header */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-muted-foreground">{items.length} صنف</span>
            <span className="text-xs font-bold text-primary">
              الإجمالي: {subtotal.toLocaleString("ar-EG")} ج.م
            </span>
          </div>

          <AnimatePresence>
            {items.map((item, idx) => {
              const price = getPrice(item);
              const direction = qtyDirection[item.product_id] || 'up';
              return (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -80, height: 0, marginBottom: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="rounded-xl border border-border/50 bg-card"
                >
                  <div className="flex items-center gap-3 p-3">
                    {/* Image */}
                    <LazyImage
                      src={item.product.image_url}
                      alt={item.product.name_ar}
                      wrapperClassName="w-12 h-12 rounded-lg bg-muted/50 shrink-0"
                      className="w-full h-full object-cover"
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-foreground truncate">{item.product.name_ar}</p>
                      <span className="text-[10px] font-mono text-muted-foreground">{item.product.sku}</span>
                      <p className="text-[10px] text-muted-foreground">
                        {price.toLocaleString("ar-EG")} ج.م × {item.quantity}
                      </p>
                    </div>

                    {/* Quantity - pill with animated number */}
                    <div className="flex items-center shrink-0 rounded-full border border-border bg-muted/30 overflow-hidden">
                      <button
                        onClick={() => handleQtyChange(item.product_id, item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all active:scale-90"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <div className="w-9 h-8 border-x border-border/50 overflow-hidden relative">
                        <AnimatePresence mode="popLayout" initial={false}>
                          <motion.span
                            key={item.quantity}
                            initial={{ y: direction === 'up' ? 12 : -12, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: direction === 'up' ? -12 : 12, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 500, damping: 30, mass: 0.5 }}
                            className="absolute inset-0 flex items-center justify-center text-sm font-black text-foreground"
                          >
                            {item.quantity}
                          </motion.span>
                        </AnimatePresence>
                      </div>
                      <button
                        onClick={() => handleQtyChange(item.product_id, item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all active:scale-90"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Total + Remove */}
                    <div className="text-start shrink-0 flex items-center gap-2">
                      <motion.p
                        key={price * item.quantity}
                        initial={{ scale: 1.15 }}
                        animate={{ scale: 1 }}
                        className="text-sm font-black text-primary whitespace-nowrap"
                      >
                        {(price * item.quantity).toLocaleString("ar-EG")}
                      </motion.p>
                      <button
                        onClick={() => removeItem(item.product_id)}
                        className="w-7 h-7 rounded-full flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Summary + Notes + Actions (only show when cart has items) */}
      {items.length > 0 && (
        <>
          {/* Pickup Branch Selection */}
          <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-black text-foreground">فرع الاستلام</h3>
              <span className="text-[10px] text-destructive font-bold">*مطلوب</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {PICKUP_BRANCHES.map((branch) => {
                const selected = pickupBranch === branch.value;
                return (
                  <button
                    key={branch.value}
                    type="button"
                    onClick={() => {
                      setPickupBranch(branch.value);
                      localStorage.setItem("dealer_pickup_branch", branch.value);
                    }}
                    className={`relative h-12 rounded-xl border-2 text-sm font-bold transition-all flex items-center justify-center gap-1.5 ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground shadow-md scale-[1.02]"
                        : "border-border bg-card text-foreground hover:border-primary/50 hover:bg-primary/5"
                    }`}
                  >
                    {selected && <Check className="w-3.5 h-3.5" />}
                    {branch.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="rounded-xl border border-border/50 bg-card p-3">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات على الطلب (اختياري)..."
              rows={2}
              className="text-sm resize-none border-0 bg-transparent p-0 focus-visible:ring-0 shadow-none"
            />
          </div>

          {/* Summary */}
          <div className="rounded-xl bg-muted/30 border border-border/50 p-4 space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">المجموع الفرعي ({items.length} صنف)</span>
              <span className="font-bold">{subtotal.toLocaleString("ar-EG")} ج.م</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">ضريبة القيمة المضافة 14%</span>
              <span className="font-bold">{vat.toLocaleString("ar-EG")} ج.م</span>
            </div>
            <div className="border-t border-border/50 pt-2 flex items-center justify-between">
              <span className="font-black text-foreground">الإجمالي</span>
              <span className="text-xl font-black text-primary">{total.toLocaleString("ar-EG")} ج.م</span>
            </div>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            {/* Primary actions */}
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleSubmitOrder}
                disabled={isProcessing}
                className="h-12 gap-2 font-bold rounded-xl bg-primary hover:bg-primary/90"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                أرسل للشركة
              </Button>
              <Button
                onClick={handlePayNow}
                disabled={isProcessing}
                variant="outline"
                className="h-12 gap-2 font-bold rounded-xl border-2 border-emerald-500 text-emerald-700 hover:bg-emerald-50"
              >
                {submittingPayment ? <Loader2 className="w-4 h-4 animate-spin" /> : <CreditCard className="w-4 h-4" />}
                ادفع إلكترونياً
              </Button>
            </div>

            {/* Save draft */}
            <Button
              onClick={handleSaveDraft}
              disabled={isProcessing}
              variant="ghost"
              className="w-full h-10 gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              {savingDraft ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              حفظ كمسودة
            </Button>
          </div>

          {/* Trust badges */}
          <div className="flex items-center justify-center gap-4 py-1">
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Shield className="w-3 h-3 text-emerald-500" />
              <span>دفع آمن</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <Package className="w-3 h-3 text-primary" />
              <span>شحن سريع</span>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
              <span>قطع أصلية 100%</span>
            </div>
          </div>
        </>
      )}

      {/* ERP Order Code Dialog */}
      <Dialog open={erpDialog.open} onOpenChange={(open) => {
        if (!open) {
          setErpDialog({ open: false, erpCode: "", orderNumber: "" });
          setCopied(false);
          onNavigateToOrders();
        }
      }}>
        <DialogContent className="sm:max-w-md text-center" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-center flex items-center justify-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              تم إرسال الطلب بنجاح
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">
              كود الطلبية — احتفظ به عند السؤال عن طلبيتك
            </p>
            <div className="text-4xl font-black tracking-widest text-primary bg-primary/5 border-2 border-primary/20 rounded-2xl px-8 py-4 mx-auto w-fit">
              {erpDialog.erpCode}
            </div>
            <Button
              variant="outline"
              className="gap-2 mx-auto"
              onClick={() => {
                navigator.clipboard.writeText(erpDialog.erpCode);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}
            >
              {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
              {copied ? "تم النسخ!" : "نسخ الكود"}
            </Button>
            <p className="text-xs text-muted-foreground">
              رقم الطلب الداخلي: {erpDialog.orderNumber}
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default DealerCart;
