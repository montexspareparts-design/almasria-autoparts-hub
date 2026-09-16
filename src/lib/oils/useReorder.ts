import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDealerCart } from "@/hooks/useDealerCart";
import { toast } from "sonner";

/**
 * إعادة الطلب — يجيب آخر طلب للتاجر ويعيد تعبئة السلة منه بضغطة واحدة.
 */
export const useReorder = () => {
  const { user } = useAuth();
  const { addItem, fetchCart } = useDealerCart();

  const lastOrderQuery = useQuery({
    queryKey: ["oils-last-order", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data: order } = await supabase
        .from("orders")
        .select("id, order_number, created_at, total_amount")
        .eq("user_id", user!.id)
        .not("status", "in", '("cancelled")')
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!order) return null;

      const { data: items } = await supabase
        .from("order_items")
        .select("product_id, quantity, unit_price")
        .eq("order_id", order.id);

      return { order, items: items || [] };
    },
    staleTime: 60_000,
  });

  const reorder = useCallback(async () => {
    const data = lastOrderQuery.data;
    if (!data || data.items.length === 0) return;
    for (const item of data.items) {
      await addItem(item.product_id, item.quantity);
    }
    await fetchCart();
    toast.success("اتضافت أصناف آخر طلب للسلة ✅", {
      description: `طلب ${data.order.order_number} — ${data.items.length} صنف`,
    });
  }, [lastOrderQuery.data, addItem, fetchCart]);

  return {
    lastOrder: lastOrderQuery.data?.order ?? null,
    lastOrderItems: lastOrderQuery.data?.items ?? [],
    loading: lastOrderQuery.isLoading,
    reorder,
  };
};
