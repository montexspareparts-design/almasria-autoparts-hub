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
    <section className="relative bg-carbon py-20 md:py-24 overflow-hidden">
      {/* Hairlines */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-toyota-red/40 to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-toyota-red/20 to-transparent" />

      {/* Ambient red glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-toyota-red/[0.05] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-toyota-red/[0.04] rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 relative">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-10"
        >
          <div className="inline-flex items-center gap-2 border border-white/10 bg-white/[0.04] rounded-full px-4 py-1.5 mb-5">
            <Sparkles className="w-3.5 h-3.5 text-toyota-red" />
            <span className="font-tajawal text-xs font-bold text-soft tracking-widest">
              وفّر أكتر مع الباقات
            </span>
          </div>
          <h2
            className="font-tajawal font-black text-white leading-tight mb-3"
            style={{ fontSize: "clamp(32px, 4.5vw, 56px)" }}
          >
            باقات الصيانة <span className="text-toyota-red">الذكية</span>
          </h2>
          <div className="flex items-center justify-center mb-4">
            <span className="h-[3px] w-20 bg-toyota-red rounded-full shadow-red-glow" />
          </div>
          <p className="font-tajawal text-soft text-base md:text-lg max-w-xl mx-auto">
            اختر موديل عربيتك والكيلومترات — واحصل على كل القطع اللي محتاجها بسعر مخفض
          </p>
        </motion.div>

        {/* Selectors */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-10 max-w-xl mx-auto"
        >
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger className="w-full sm:w-52 gap-2 h-12 bg-white/[0.04] border-white/10 text-white hover:border-toyota-red/40 hover:bg-white/[0.06] transition-all">
              <Car className="w-4 h-4 text-toyota-red shrink-0" />
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
            <SelectTrigger className="w-full sm:w-52 gap-2 h-12 bg-white/[0.04] border-white/10 text-white hover:border-toyota-red/40 hover:bg-white/[0.06] transition-all">
              <Gauge className="w-4 h-4 text-toyota-red shrink-0" />
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-6xl mx-auto">
          {bundles.map((bundle: any, i: number) => {
            const savings = bundle.original_price - bundle.bundle_price;
            const savingsPercent = Math.round((savings / bundle.original_price) * 100);
            const items = bundle.bundle_items || [];

            return (
              <motion.div
                key={bundle.id}
                initial={{ opacity: 0, y: 24, scale: 0.97 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.08, duration: 0.5, type: "spring", stiffness: 100 }}
                whileHover={{ y: -6, transition: { duration: 0.2 } }}
                className="group relative bg-white/[0.04] backdrop-blur-sm rounded-2xl overflow-hidden border border-white/10 hover:border-toyota-red/50 hover:shadow-2xl hover:shadow-toyota-red/20 transition-all duration-300 flex flex-col"
              >
                {/* Corner brackets */}
                <span className="pointer-events-none absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-toyota-red/60 rounded-tl-2xl z-10" />
                <span className="pointer-events-none absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-toyota-red/60 rounded-tr-2xl z-10" />

                {/* Savings ribbon */}
                {savingsPercent > 0 && (
                  <div className="relative bg-gradient-to-l from-toyota-red via-toyota-red to-toyota-red/85 text-white px-4 py-2.5 flex items-center justify-center gap-2 shadow-lg shadow-toyota-red/30">
                    <Percent className="w-3.5 h-3.5" />
                    <span className="font-tajawal text-sm font-black tracking-wide">
                      وفّر {savingsPercent}% — توفير {savings.toLocaleString("ar-EG")} ج.م
                    </span>
                  </div>
                )}

                <div className="p-5 flex-1 flex flex-col">
                  {/* Title row */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-tajawal text-lg font-black text-white mb-1 leading-snug">
                        {bundle.name_ar}
                      </h3>
                      {bundle.description_ar && (
                        <p className="font-tajawal text-xs text-soft leading-relaxed line-clamp-2">
                          {bundle.description_ar}
                        </p>
                      )}
                    </div>
                    <div className="w-11 h-11 rounded-xl bg-toyota-red/15 border border-toyota-red/30 flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5 text-toyota-red" />
                    </div>
                  </div>

                  {/* Items */}
                  <div className="space-y-1.5 mb-4 bg-black/30 border border-white/5 rounded-xl p-3">
                    {items.map((bi: any) => (
                      <div key={bi.id} className="flex items-center gap-2 text-xs">
                        <div className="w-1.5 h-1.5 rounded-full bg-toyota-red shrink-0 shadow-red-glow" />
                        <span className="font-tajawal text-white/85 font-medium flex-1 truncate">
                          {bi.products?.name_ar || "منتج"}
                        </span>
                        {bi.quantity > 1 && (
                          <span className="text-white/60 bg-white/10 px-1.5 py-0.5 rounded text-[10px] font-bold shrink-0">
                            ×{bi.quantity}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Pricing */}
                  <div className="flex items-end gap-3 mb-3 mt-auto">
                    <div className="font-tajawal text-toyota-red font-black text-3xl leading-none">
                      {bundle.bundle_price.toLocaleString("ar-EG")}
                      <span className="text-base text-toyota-red/80 mr-1">ج.م</span>
                    </div>
                    {savings > 0 && (
                      <div className="font-tajawal text-white/40 line-through text-sm mb-1">
                        {bundle.original_price.toLocaleString("ar-EG")} ج.م
                      </div>
                    )}
                  </div>

                  {/* Guarantee */}
                  <div className="flex items-center gap-1.5 text-[11px] text-white/55 mb-4">
                    <Shield className="w-3.5 h-3.5 text-toyota-red/80" />
                    <span className="font-tajawal">قطع غيار أصلية 100% — ضمان الجودة</span>
                  </div>

                  <Button
                    className="w-full gap-2 font-tajawal font-bold h-11 bg-toyota-red hover:bg-toyota-red/90 text-white shadow-lg shadow-toyota-red/25 hover:shadow-toyota-red/40 transition-all"
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
