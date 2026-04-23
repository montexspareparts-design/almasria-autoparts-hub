import { useState, useEffect } from "react";
import { LazyImage } from "@/components/ui/lazy-image";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PurchasedProduct {
  id: string;
  name_ar: string;
  sku: string;
  image_url: string | null;
  stock_quantity: number;
  safety_stock: number;
  last_ordered_at: string;
}

type StockStatus = "available" | "low" | "out";

const getStatus = (stock: number, safety: number): StockStatus => {
  const available = Math.max(0, stock - (safety || 0));
  if (available <= 0) return "out";
  if (available <= 5) return "low";
  return "available";
};

const statusConfig: Record<StockStatus, { label: string; dot: string; bg: string; text: string }> = {
  available: {
    label: "متوفر",
    dot: "bg-emerald-500",
    bg: "bg-emerald-500/10 border-emerald-500/30",
    text: "text-emerald-700 dark:text-emerald-400",
  },
  low: {
    label: "قريب النفاد",
    dot: "bg-amber-500 animate-pulse",
    bg: "bg-amber-500/10 border-amber-500/30",
    text: "text-amber-700 dark:text-amber-400",
  },
  out: {
    label: "نافذ",
    dot: "bg-rose-500",
    bg: "bg-rose-500/10 border-rose-500/30",
    text: "text-rose-700 dark:text-rose-400",
  },
};

const DealerPurchasedStockStatus = () => {
  const { user } = useAuth();
  const [products, setProducts] = useState<PurchasedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | StockStatus>("all");

  useEffect(() => {
    const fetchPurchased = async () => {
      if (!user) return;
      const { data: orders } = await supabase
        .from("orders")
        .select("id, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (!orders?.length) {
        setLoading(false);
        return;
      }

      const orderIds = orders.map((o) => o.id);
      const orderDateMap = new Map(orders.map((o) => [o.id, o.created_at]));

      const { data: items } = await supabase
        .from("order_items")
        .select("product_id, order_id, product:products(id, name_ar, sku, image_url, stock_quantity, safety_stock, is_active)")
        .in("order_id", orderIds);

      const map = new Map<string, PurchasedProduct>();
      (items || []).forEach((it: any) => {
        const p = it.product;
        if (!p || !p.is_active) return;
        const lastDate = orderDateMap.get(it.order_id) || "";
        const existing = map.get(p.id);
        if (!existing || lastDate > existing.last_ordered_at) {
          map.set(p.id, {
            id: p.id,
            name_ar: p.name_ar,
            sku: p.sku,
            image_url: p.image_url,
            stock_quantity: p.stock_quantity ?? 0,
            safety_stock: p.safety_stock ?? 0,
            last_ordered_at: lastDate,
          });
        }
      });

      setProducts(
        Array.from(map.values()).sort((a, b) =>
          b.last_ordered_at.localeCompare(a.last_ordered_at)
        )
      );
      setLoading(false);
    };

    fetchPurchased();
  }, [user]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  if (products.length === 0) return null;

  const counts = {
    all: products.length,
    available: products.filter((p) => getStatus(p.stock_quantity, p.safety_stock) === "available").length,
    low: products.filter((p) => getStatus(p.stock_quantity, p.safety_stock) === "low").length,
    out: products.filter((p) => getStatus(p.stock_quantity, p.safety_stock) === "out").length,
  };

  const filtered =
    filter === "all"
      ? products
      : products.filter((p) => getStatus(p.stock_quantity, p.safety_stock) === filter);

  const filterChips: { key: typeof filter; label: string; count: number }[] = [
    { key: "all", label: "الكل", count: counts.all },
    { key: "available", label: "متوفر", count: counts.available },
    { key: "low", label: "قريب النفاد", count: counts.low },
    { key: "out", label: "نافذ", count: counts.out },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <Package className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-black text-foreground">حالة منتجاتك السابقة</h3>
        </div>
        <span className="text-[11px] text-muted-foreground">
          آخر {products.length} منتج اشتريته
        </span>
      </div>

      <div className="flex items-center gap-1.5 flex-wrap">
        {filterChips.map((c) => (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            className={cn(
              "px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors border",
              filter === c.key
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-muted-foreground border-border hover:border-primary/40"
            )}
          >
            {c.label} ({c.count})
          </button>
        ))}
      </div>

      <div className="bg-card border border-border rounded-xl divide-y divide-border overflow-hidden">
        {filtered.map((p) => {
          const status = getStatus(p.stock_quantity, p.safety_stock);
          const cfg = statusConfig[status];
          return (
            <div key={p.id} className="flex items-center gap-3 p-3">
              <LazyImage
                src={p.image_url}
                alt={p.name_ar}
                wrapperClassName="w-10 h-10 rounded-lg bg-white border border-border shrink-0"
                className="w-full h-full object-contain p-0.5"
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{p.name_ar}</p>
                <span className="text-[11px] text-muted-foreground font-mono">{p.sku}</span>
              </div>
              <Badge
                variant="outline"
                className={cn("text-[11px] font-bold gap-1.5 border", cfg.bg, cfg.text)}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                {cfg.label}
              </Badge>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="p-6 text-center text-xs text-muted-foreground">
            لا توجد منتجات بهذه الحالة
          </div>
        )}
      </div>
    </div>
  );
};

export default DealerPurchasedStockStatus;
