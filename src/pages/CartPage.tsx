import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Trash2, Plus, Minus, ShoppingCart, ArrowRight, AlertTriangle, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ProductImage from "@/components/ProductImage";

const CartPage = () => {
  const { items, removeItem, updateQuantity, subtotal, vat, shippingCost, discount, total, itemCount } = useCart();
  const { isDealer, dealerAccount } = useAuth();
  const navigate = useNavigate();

  const minOrderAmount = dealerAccount?.min_order_amount ?? 0;
  const belowMinOrder = isDealer && minOrderAmount > 0 && subtotal < minOrderAmount;

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="pt-24 pb-20">
          <div className="container mx-auto px-4 text-center py-20">
            <ShoppingCart className="w-20 h-20 text-muted-foreground/20 mx-auto mb-6" />
            <h1 className="text-2xl font-bold text-foreground mb-3">سلة المشتريات فارغة</h1>
            <p className="text-muted-foreground mb-6">لم تقم بإضافة أي منتجات بعد</p>
            <Button asChild>
              <Link to="/#products">تصفح المنتجات</Link>
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-12">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-2 mb-6">
            <Link to="/#products" className="text-sm text-primary hover:underline flex items-center gap-1">
              <ArrowRight className="w-4 h-4" />
              تصفح المنتجات
            </Link>
          </div>

          <h1 className="text-2xl md:text-3xl font-black text-foreground mb-8">
            سلة المشتريات ({itemCount} منتج)
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {items.map((item, i) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="bg-card border border-border rounded-lg p-4 flex gap-4"
                >
                  {/* Image */}
                  <div className="w-20 h-20 rounded-md overflow-hidden bg-card shrink-0">
                    {item.image_url ? (
                      <ProductImage src={item.image_url} alt={item.name_ar} className="p-1.5" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-8 h-8 text-muted-foreground/20" />
                      </div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-bold text-card-foreground text-sm truncate">{item.name_ar}</h3>
                    <p className="text-xs text-muted-foreground font-mono mt-1">{item.sku}</p>
                    <p className="text-primary font-bold mt-1">{item.unit_price.toLocaleString("ar-EG")} ج.م</p>

                    {/* Low stock warning */}
                    {item.stock_quantity <= 5 && item.stock_quantity > 0 && (
                      <div className="flex items-center gap-1 mt-1 text-[11px] text-amber-600">
                        <AlertTriangle className="w-3 h-3" />
                        <span>متبقي {item.stock_quantity} فقط</span>
                      </div>
                    )}
                  </div>

                  {/* Quantity & Actions */}
                  <div className="flex flex-col items-end justify-between">
                    <button onClick={() => removeItem(item.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-2 bg-muted rounded-md">
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity - 1)}
                        className="p-1.5 hover:bg-border rounded-r-md transition-colors"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-sm font-bold min-w-[2rem] text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, item.quantity + 1)}
                        disabled={item.quantity >= item.stock_quantity}
                        className="p-1.5 hover:bg-border rounded-l-md transition-colors disabled:opacity-30"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <p className="text-sm font-bold text-foreground">
                      {(item.unit_price * item.quantity).toLocaleString("ar-EG")} ج.م
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Order Summary */}
            <div className="lg:col-span-1">
              <div className="bg-card border border-border rounded-lg p-6 sticky top-24">
                <h2 className="text-lg font-bold text-card-foreground mb-5">ملخص الطلب</h2>

                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">إجمالي المنتجات</span>
                    <span className="font-semibold">{subtotal.toLocaleString("ar-EG")} ج.م</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>الخصم</span>
                      <span>- {discount.toLocaleString("ar-EG")} ج.م</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">ضريبة القيمة المضافة (14%)</span>
                    <span className="font-semibold">{vat.toLocaleString("ar-EG")} ج.م</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">الشحن</span>
                    <span className="font-semibold">{shippingCost > 0 ? `${shippingCost.toLocaleString("ar-EG")} ج.م` : "يحدد عند الدفع"}</span>
                  </div>

                  <div className="border-t border-border pt-3 mt-3">
                    <div className="flex justify-between text-lg font-black">
                      <span>الإجمالي</span>
                      <span className="text-primary">{total.toLocaleString("ar-EG")} ج.م</span>
                    </div>
                  </div>
                </div>

                {/* Min order warning */}
                {belowMinOrder && (
                  <div className="mt-4 bg-amber-50 border border-amber-200 rounded-md p-3 flex items-start gap-2 text-amber-800 text-xs">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>الحد الأدنى للطلب هو {minOrderAmount.toLocaleString("ar-EG")} ج.م. أضف المزيد من المنتجات.</span>
                  </div>
                )}

                <Button
                  className="w-full mt-6"
                  size="lg"
                  disabled={belowMinOrder}
                  onClick={() => navigate("/checkout")}
                >
                  إتمام الطلب
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default CartPage;
