import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Package, ShoppingCart, Tag, Percent, Car, Gauge, Sparkles, ChevronDown, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCart, CartItem } from "@/contexts/CartContext";
import { toast } from "@/hooks/use-toast";

const toyotaModels = [
  "كورولا", "كامري", "ياريس", "هايلكس", "لاندكروزر", "برادو",
  "فورتشنر", "راف فور", "افالون", "راش", "هاي اس", "كوستر",
];

const kmIntervals = [
  { label: "5,000 كم", value: "5000" },
  { label: "10,000 كم", value: "10000" },
  { label: "20,000 كم", value: "20000" },
  { label: "40,000 كم", value: "40000" },
  { label: "60,000 كم", value: "60000" },
  { label: "100,000 كم", value: "100000" },
];

const MaintenanceBundles = () => {
  const { addItem } = useCart();
  const [selectedModel, setSelectedModel] = useState<string>("");
  const [selectedKm, setSelectedKm] = useState<string>("");

  const { data: bundles, isLoading } = useQuery({
    queryKey: ["maintenance_bundles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("maintenance_bundles")
        .select("*, bundle_items(*, products(*))")
        .eq("is_active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  if (isLoading || !bundles || bundles.length === 0) return null;

  const handleAddBundle = (bundle: any) => {
    const items = bundle.bundle_items || [];
    items.forEach((bi: any) => {
      if (bi.products) {
        const product = bi.products;
        const cartItem: CartItem = {
          id: product.id,
          name_ar: product.name_ar,
          sku: product.sku,
          image_url: product.image_url,
          unit_price: product.base_price,
          quantity: bi.quantity || 1,
          stock_quantity: product.stock_quantity,
          min_order_qty: product.min_order_qty,
          brand: product.brand,
        };
        addItem(cartItem);
      }
    });
    toast({ title: "تمت إضافة الباقة للسلة ✅", description: bundle.name_ar });
  };

  return (
    <section className="py-12 bg-gradient-to-b from-background via-muted/20 to-background relative overflow-hidden">
      {/* Subtle background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/3 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 border border-primary/20 rounded-full px-4 py-1.5 mb-4 bg-primary/5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs font-bold text-primary">وفّر أكتر مع الباقات</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-black text-foreground mb-2">
            باقات الصيانة الذكية
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto">
            اختر موديل عربيتك والكيلومترات — واحصل على كل القطع اللي محتاجها بسعر مخفض
          </p>
        </motion.div>

        {/* Model & KM Selector */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.1 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-8 max-w-xl mx-auto"
        >
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-full sm:w-48 gap-2">
              <Car className="w-4 h-4 text-primary shrink-0" />
              <SelectValue placeholder="اختر الموديل" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الموديلات</SelectItem>
              {toyotaModels.map((m) => (
                <SelectItem key={m} value={m}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedKm} onValueChange={setSelectedKm}>
            <SelectTrigger className="w-full sm:w-48 gap-2">
              <Gauge className="w-4 h-4 text-primary shrink-0" />
              <SelectValue placeholder="الكيلومترات" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الفترات</SelectItem>
              {kmIntervals.map((k) => (
                <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </motion.div>

        {/* Bundle cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {bundles.map((bundle: any, i: number) => {
            const savings = bundle.original_price - bundle.bundle_price;
            const savingsPercent = Math.round((savings / bundle.original_price) * 100);
            const items = bundle.bundle_items || [];

            return (
              <motion.div
                key={bundle.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="group relative bg-card rounded-2xl overflow-hidden border border-border/60 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300"
              >
                {/* Savings banner */}
                {savingsPercent > 0 && (
                  <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground px-4 py-2 flex items-center justify-center gap-2">
                    <Percent className="w-3.5 h-3.5" />
                    <span className="text-sm font-black">وفّر {savingsPercent}% — توفير {savings.toLocaleString("ar-EG")} ج.م</span>
                  </div>
                )}

                <div className="p-5">
                  {/* Bundle image or icon */}
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h3 className="text-lg font-black text-card-foreground mb-1">{bundle.name_ar}</h3>
                      {bundle.description_ar && (
                        <p className="text-xs text-muted-foreground leading-relaxed">{bundle.description_ar}</p>
                      )}
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-primary" />
                    </div>
                  </div>

                  {/* Bundle items list */}
                  <div className="space-y-1.5 mb-4 bg-muted/30 rounded-xl p-3">
                    {items.map((bi: any) => (
                      <div key={bi.id} className="flex items-center gap-2 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                        <span className="text-card-foreground font-medium flex-1">{bi.products?.name_ar || "منتج"}</span>
                        {bi.quantity > 1 && (
                          <span className="text-muted-foreground bg-muted px-1.5 py-0.5 rounded text-[10px] font-bold">×{bi.quantity}</span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Pricing */}
                  <div className="flex items-end gap-3 mb-4">
                    <div className="text-primary font-black text-2xl">
                      {bundle.bundle_price.toLocaleString("ar-EG")} <span className="text-sm">ج.م</span>
                    </div>
                    {savings > 0 && (
                      <div className="text-muted-foreground line-through text-sm mb-0.5">
                        {bundle.original_price.toLocaleString("ar-EG")} ج.م
                      </div>
                    )}
                  </div>

                  {/* Guarantee badge */}
                  <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground mb-3">
                    <Shield className="w-3 h-3" />
                    <span>قطع غيار أصلية 100% — ضمان الجودة</span>
                  </div>

                  <Button
                    className="w-full gap-2 font-bold group-hover:shadow-lg transition-shadow"
                    onClick={() => handleAddBundle(bundle)}
                  >
                    <ShoppingCart className="w-4 h-4" />
                    أضف الباقة كاملة للسلة
                  </Button>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

export default MaintenanceBundles;
