import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export interface CartItem {
  id: string;
  name_ar: string;
  sku: string;
  image_url: string | null;
  unit_price: number;
  quantity: number;
  stock_quantity: number;
  min_order_qty: number;
  brand: string;
}

interface CartContextType {
  items: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  itemCount: number;
  subtotal: number;
  vatRate: number;
  vat: number;
  shippingCost: number;
  setShippingCost: (cost: number) => void;
  discount: number;
  setDiscount: (d: number) => void;
  couponCode: string | null;
  setCouponCode: (code: string | null) => void;
  couponDiscount: number;
  setCouponDiscount: (d: number) => void;
  total: number;
}

const CartContext = createContext<CartContextType>({
  items: [],
  addItem: () => {},
  removeItem: () => {},
  updateQuantity: () => {},
  clearCart: () => {},
  itemCount: 0,
  subtotal: 0,
  vatRate: 0.14,
  vat: 0,
  shippingCost: 0,
  setShippingCost: () => {},
  discount: 0,
  setDiscount: () => {},
  couponCode: null,
  setCouponCode: () => {},
  couponDiscount: 0,
  setCouponDiscount: () => {},
  total: 0,
});

export const useCart = () => useContext(CartContext);

const CART_KEY = "masria_cart";

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();

  const [items, setItems] = useState<CartItem[]>(() => {
    try {
      const stored = localStorage.getItem(CART_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [shippingCost, setShippingCost] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [couponCode, setCouponCode] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);

  useEffect(() => {
    localStorage.setItem(CART_KEY, JSON.stringify(items));
  }, [items]);

  const addItem = useCallback((item: CartItem) => {
    if (!user) {
      toast.error("يجب تسجيل الدخول أولاً لإضافة منتجات للسلة", {
        action: {
          label: "تسجيل الدخول",
          onClick: () => window.location.href = "/auth",
        },
      });
      return;
    }
    setItems((prev) => {
      const existing = prev.find((i) => i.id === item.id);
      if (existing) {
        return prev.map((i) =>
          i.id === item.id
            ? { ...i, quantity: Math.min(i.quantity + item.quantity, i.stock_quantity) }
            : i
        );
      }
      return [...prev, item];
    });

    // Show suggestion if quantity was capped
    if (item.quantity < (item.min_order_qty || 1)) {
      toast.info(`الحد الأقصى المسموح لـ "${item.name_ar}" هو ${item.stock_quantity} قطعة`);
    }
  }, [user]);

  const removeItem = useCallback((id: string) => {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }, []);

  const updateQuantity = useCallback((id: string, quantity: number) => {
    if (quantity <= 0) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      return;
    }
    setItems((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;
        const cappedQty = Math.min(quantity, i.stock_quantity);
        if (quantity > i.stock_quantity) {
          toast.info(`الحد الأقصى المسموح لـ "${i.name_ar}" هو ${i.stock_quantity} قطعة (50% من المتاح)`);
        }
        return { ...i, quantity: cappedQty };
      })
    );
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setDiscount(0);
    setShippingCost(0);
    setCouponCode(null);
    setCouponDiscount(0);
  }, []);

  const itemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const subtotal = items.reduce((sum, i) => sum + i.unit_price * i.quantity, 0);
  const vatRate = 0;
  const totalDiscount = discount + couponDiscount;
  const vat = 0;
  const total = subtotal - totalDiscount + shippingCost;

  return (
    <CartContext.Provider
      value={{
        items,
        addItem,
        removeItem,
        updateQuantity,
        clearCart,
        itemCount,
        subtotal,
        vatRate,
        vat,
        shippingCost,
        setShippingCost,
        discount,
        setDiscount,
        couponCode,
        setCouponCode,
        couponDiscount,
        setCouponDiscount,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};
