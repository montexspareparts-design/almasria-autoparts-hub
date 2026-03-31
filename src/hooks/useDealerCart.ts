import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { playCartAddSound } from "@/lib/pricingSound";

export interface DealerCartItem {
  id: string;
  product_id: string;
  quantity: number;
  product: {
    id: string;
    name_ar: string;
    name_en: string | null;
    sku: string;
    image_url: string | null;
    base_price: number;
    stock_quantity: number;
    brand: string;
    min_order_qty: number;
  };
}

export const useDealerCart = () => {
  const { user, dealerAccount } = useAuth();
  const [items, setItems] = useState<DealerCartItem[]>([]);
  const [loading, setLoading] = useState(true);

  const isDealer = !!dealerAccount?.is_active;

  const fetchCart = useCallback(async () => {
    if (!user || !isDealer) { setItems([]); setLoading(false); return; }
    const { data } = await supabase
      .from("dealer_cart_items")
      .select("id, product_id, quantity")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!data || data.length === 0) { setItems([]); setLoading(false); return; }

    const productIds = data.map(d => d.product_id);
    const { data: products } = await supabase
      .from("products")
      .select("id, name_ar, name_en, sku, image_url, base_price, stock_quantity, brand, min_order_qty")
      .in("id", productIds)
      .eq("is_active", true);

    if (products) {
      const prodMap = new Map(products.map(p => [p.id, p]));
      const result: DealerCartItem[] = data
        .filter(d => prodMap.has(d.product_id))
        .map(d => ({ id: d.id, product_id: d.product_id, quantity: d.quantity, product: prodMap.get(d.product_id)! }));
      setItems(result);
    }
    setLoading(false);
  }, [user, isDealer]);

  useEffect(() => { fetchCart(); }, [fetchCart]);

  const addItem = useCallback(async (productId: string, qty: number = 1) => {
    if (!user) return;
    const existing = items.find(i => i.product_id === productId);
    if (existing) {
      const newQty = existing.quantity + qty;
      await supabase.from("dealer_cart_items").update({ quantity: newQty, updated_at: new Date().toISOString() }).eq("id", existing.id);
    } else {
      await supabase.from("dealer_cart_items").insert({ user_id: user.id, product_id: productId, quantity: qty });
    }
    await fetchCart();
    playCartAddSound();
  }, [user, items, fetchCart]);

  const updateQuantity = useCallback(async (productId: string, qty: number) => {
    if (qty <= 0) {
      await supabase.from("dealer_cart_items").delete().eq("user_id", user!.id).eq("product_id", productId);
    } else {
      await supabase.from("dealer_cart_items").update({ quantity: qty, updated_at: new Date().toISOString() }).eq("user_id", user!.id).eq("product_id", productId);
    }
    await fetchCart();
  }, [user, fetchCart]);

  const removeItem = useCallback(async (productId: string) => {
    await supabase.from("dealer_cart_items").delete().eq("user_id", user!.id).eq("product_id", productId);
    await fetchCart();
  }, [user, fetchCart]);

  const clearCart = useCallback(async () => {
    await supabase.from("dealer_cart_items").delete().eq("user_id", user!.id);
    setItems([]);
  }, [user]);

  const itemCount = items.reduce((s, i) => s + i.quantity, 0);

  return { items, loading, addItem, updateQuantity, removeItem, clearCart, itemCount, fetchCart, isDealer };
};
