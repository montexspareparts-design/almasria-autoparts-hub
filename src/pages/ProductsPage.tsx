import { useParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Lock, ShieldCheck, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

import catEngine from "@/assets/cat-engine.jpg";
import catSuspension from "@/assets/cat-suspension.jpg";
import catFilters from "@/assets/cat-filters.jpg";
import catOils from "@/assets/cat-oils.jpg";
import catElectrical from "@/assets/cat-electrical.jpg";
import catCooling from "@/assets/cat-cooling.jpg";

const brandConfig: Record<string, { title: string; subtitle: string; description: string; badge: string }> = {
  "toyota-genuine": {
    title: "قطع غيار تويوتا الأصلية",
    subtitle: "Toyota Genuine Parts",
    description: "قطع غيار أصلية 100% من تويوتا اليابان. نحن موزع معتمد رسمي لجميع أنواع قطع غيار تويوتا الأصلية في مصر والمنطقة.",
    badge: "موزع معتمد رسمي",
  },
  "toyota-oils": {
    title: "زيوت تويوتا الأصلية",
    subtitle: "Toyota Genuine Motor Oil",
    description: "زيوت تويوتا الأصلية بجميع درجات اللزوجة. نوفر زيوت المحرك، زيوت الفتيس، سوائل الفرامل، وجميع سوائل تويوتا الأصلية.",
    badge: "موزع معتمد رسمي",
  },
  "mtx-aftermarket": {
    title: "MTX Aftermarket",
    subtitle: "قطع غيار مستوردة بأعلى جودة",
    description: "MTX هي علامتنا التجارية المسجلة لقطع الغيار المستوردة عالية الجودة. نستورد جميع فئات قطع غيار تويوتا البديلة بأفضل الأسعار.",
    badge: "علامة تجارية مسجلة",
  },
};

const categories = [
  { name: "قطع المحرك", image: catEngine, count: "+800 صنف" },
  { name: "العفشة والتعليق", image: catSuspension, count: "+600 صنف" },
  { name: "الفلاتر", image: catFilters, count: "+400 صنف" },
  { name: "زيوت تويوتا الأصلية", image: catOils, count: "+50 صنف" },
  { name: "الكهرباء", image: catElectrical, count: "+500 صنف" },
  { name: "التبريد", image: catCooling, count: "+300 صنف" },
];

const ProductsPage = () => {
  const { brand } = useParams<{ brand: string }>();
  const { isDealer, user } = useAuth();
  const config = brand ? brandConfig[brand] : null;

  if (!config) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">صفحة غير موجودة</h1>
          <Button asChild>
            <Link to="/">العودة للرئيسية</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero Banner */}
      <section className="pt-24 pb-12 bg-dark-section">
        <div className="container mx-auto px-4">
          <Link to="/#products" className="inline-flex items-center gap-2 text-sm text-primary hover:underline mb-6">
            <ArrowRight className="w-4 h-4" />
            العودة للمنتجات
          </Link>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-3xl"
          >
            <div className="inline-flex items-center gap-2 bg-primary/15 border border-primary/30 rounded-full px-4 py-1.5 mb-4">
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold text-primary">{config.badge}</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black text-dark-section-foreground mb-2">
              {config.title}
            </h1>
            <p className="text-lg text-dark-section-foreground/50 mb-4">{config.subtitle}</p>
            <p className="text-dark-section-foreground/70 max-w-2xl leading-relaxed">
              {config.description}
            </p>
          </motion.div>
        </div>
      </section>

      {/* Price Notice */}
      <section className="py-8 bg-background">
        <div className="container mx-auto px-4">
          {!isDealer && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="bg-muted border border-primary/20 rounded-lg p-4 mb-8 flex items-center justify-between flex-wrap gap-4"
            >
              <div className="flex items-center gap-3">
                <Lock className="w-5 h-5 text-primary shrink-0" />
                <p className="text-foreground text-sm">
                  <strong>الأسعار متاحة للتجار المعتمدين فقط.</strong>{" "}
                  سجل كتاجر معتمد للاطلاع على الأسعار وطلب المنتجات.
                </p>
              </div>
              <Button size="sm" className="shrink-0" asChild>
                <Link to={user ? "/dealer" : "/dealer-apply"}>
                  {user ? "لوحة التحكم" : "طلب فتح حساب تاجر"}
                </Link>
              </Button>
            </motion.div>
          )}

          {/* Customer Segments */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
            {[
              { icon: Package, label: "عملاء الجملة", desc: "أسعار خاصة وخصومات على الكميات" },
              { icon: ShieldCheck, label: "شركات وهيئات حكومية", desc: "عقود توريد وفواتير رسمية" },
              { icon: Package, label: "عملاء قطاعي", desc: "قطع أصلية بأفضل الأسعار" },
            ].map((seg) => (
              <div key={seg.label} className="bg-card border border-border rounded-lg p-4 text-center">
                <seg.icon className="w-8 h-8 text-primary mx-auto mb-2" />
                <div className="font-bold text-card-foreground text-sm">{seg.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{seg.desc}</div>
              </div>
            ))}
          </div>

          {/* Categories Grid */}
          <h2 className="text-2xl font-bold text-foreground mb-6">تصفح الأقسام</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {categories.map((cat, i) => (
              <motion.div
                key={cat.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="group relative rounded-lg overflow-hidden card-hover cursor-pointer"
              >
                <div className="aspect-[4/3] relative">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-secondary via-secondary/40 to-transparent" />
                  <div className="absolute bottom-0 right-0 left-0 p-6">
                    <h3 className="text-xl font-bold text-secondary-foreground mb-1">{cat.name}</h3>
                    <p className="text-sm text-primary font-semibold">{cat.count}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* CTA */}
          <div className="text-center mt-12">
            <Button size="lg" className="gap-2 red-glow text-lg px-8" asChild>
              <a href="/#contact">اطلب عرض سعر</a>
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ProductsPage;
