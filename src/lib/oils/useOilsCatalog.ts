import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/**
 * كتالوج الزيوت — أصناف الزيوت وفلاتر الزيت فقط، مدموجة مع:
 *  - سعر شريحة التاجر من product_tier_prices
 *  - خصومات الكمية النشطة من quantity_discounts
 */

/**
 * الزيوت السائلة فقط (محرك/فتيس/كرونة/باكم/باور/كلاتش مروحة).
 * تُستبعد قطع الغيار المرتبطة بالزيت: الفلاتر، الحشوات، الأويل سيل، الطبات، الساعات، الجوانات، الطلمبات.
 */
const OIL_LUBRICANT_REGEX = /^\s*زيت\s/;
const NON_LUBRICANT_REGEX = /فلتر|حشوة|سيل|طبة|ساعة|جوان|طلمبة|غطاء|خرطوم|مبين/;

/** أصناف تُعرض دائمًا في تطبيق الزيوت (بارت نمبر من الفيصل) */
export const PINNED_OIL_PART_NUMBERS = ["08880-84132"];

const isOilProduct = (name_ar?: string | null, name_en?: string | null, part_number?: string | null) => {
  if (part_number && PINNED_OIL_PART_NUMBERS.includes(part_number.trim())) return true;
  const ar = name_ar || "";
  if (NON_LUBRICANT_REGEX.test(ar)) return false;
  if (OIL_LUBRICANT_REGEX.test(ar)) return true;
  return /\boil\b/i.test(name_en || "") && !/filter|seal|pump|gasket/i.test(name_en || "");
};

export interface OilProduct {
  id: string;
  name_ar: string;
  name_en: string | null;
  sku: string;
  erp_item_code: string | null;
  part_number: string | null;
  image_url: string | null;
  base_price: number;
  sale_price: number | null;
  stock_quantity: number;
  brand: string;
  min_order_qty: number;
  is_on_sale: boolean;
  /** سعر شريحة التاجر (إن وجد) */
  tierPrice: number | null;
  /** السعر النهائي المعروض للتاجر */
  price: number;
}

export interface QuantityDiscount {
  product_id: string | null;
  brand: string | null;
  min_quantity: number;
  discount_type: string;
  discount_value: number;
}

const fetchOilProducts = async (): Promise<Omit<OilProduct, "tierPrice" | "price">[]> => {
  const { data, error } = await supabase
    .from("products")
    .select("id, name_ar, name_en, sku, erp_item_code, part_number, image_url, base_price, sale_price, stock_quantity, brand, min_order_qty, is_on_sale")
    .eq("is_active", true)
    .order("name_ar");
  if (error) throw error;
  return (data || []).filter((p) => isOilProduct(p.name_ar, p.name_en, p.part_number));
};

export const useOilsCatalog = () => {
  const { user, dealerAccount } = useAuth();
  const tier = dealerAccount?.tier ?? null;

  const productsQuery = useQuery({
    queryKey: ["oils-catalog"],
    queryFn: fetchOilProducts,
    staleTime: 60_000,
  });

  const tierPricesQuery = useQuery({
    queryKey: ["oils-tier-prices", tier],
    enabled: !!user && !!tier,
    queryFn: async () => {
      const { data } = await supabase
        .from("product_tier_prices")
        .select("product_id, price, discount_price, min_qty_for_discount")
        .eq("tier", tier as any);
      return data || [];
    },
    staleTime: 60_000,
  });

  const discountsQuery = useQuery({
    queryKey: ["oils-quantity-discounts"],
    queryFn: async () => {
      const { data } = await supabase
        .from("quantity_discounts")
        .select("product_id, brand, min_quantity, discount_type, discount_value")
        .eq("is_active", true)
        .order("min_quantity", { ascending: true });
      return (data || []) as QuantityDiscount[];
    },
    staleTime: 5 * 60_000,
  });

  const products = useMemo<OilProduct[]>(() => {
    const base = productsQuery.data || [];
    const tierMap = new Map<string, number>();
    (tierPricesQuery.data || []).forEach((tp) => tierMap.set(tp.product_id, tp.price));

    return base.map((p) => {
      const tierPrice = tierMap.get(p.id) ?? null;
      return {
        ...p,
        tierPrice,
        price: tierPrice ?? Number(p.sale_price && p.is_on_sale ? p.sale_price : p.base_price),
      };
    });
  }, [productsQuery.data, tierPricesQuery.data]);

  /** خصومات الكمية المطبقة على منتج معين (خاصة بالصنف أو بالماركة) */
  const discountsFor = useMemo(() => {
    const all = discountsQuery.data || [];
    return (product: OilProduct): QuantityDiscount[] =>
      all.filter((d) => d.product_id === product.id || (!d.product_id && d.brand === product.brand));
  }, [discountsQuery.data]);

  /** سعر الوحدة عند كمية معيّنة بعد خصم الكمية */
  const priceAtQty = (product: OilProduct, qty: number): number => {
    let price = product.price;
    const applicable = discountsFor(product).filter((d) => qty >= d.min_quantity);
    if (applicable.length === 0) return price;
    const best = applicable[applicable.length - 1];
    return best.discount_type === "percent"
      ? Math.max(0, price * (1 - best.discount_value / 100))
      : Math.max(0, price - best.discount_value);
  };

  return {
    products,
    loading: productsQuery.isLoading || (tierPricesQuery.isFetching && !!tier),
    error: productsQuery.error,
    discountsFor,
    priceAtQty,
    isDealer: !!dealerAccount?.is_active,
  };
};
