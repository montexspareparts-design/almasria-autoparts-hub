import { motion } from "framer-motion";
import { ArrowLeft, Sparkles, ChevronLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useEffect, useRef } from "react";

import catEngine from "@/assets/cat-engine.jpg";
import catSuspension from "@/assets/cat-suspension.jpg";
import catFilters from "@/assets/cat-filters.jpg";
import catOils from "@/assets/cat-oils.jpg";
import catElectrical from "@/assets/cat-electrical.jpg";
import catCooling from "@/assets/cat-cooling.jpg";
import brandGenuineParts from "@/assets/brand-genuine-parts.png";
import brandToyotaOil from "@/assets/brand-toyota-oil.png";
import brandMtx from "@/assets/brand-mtx.jpg";

const categories = [
  { name: "أجزاء المحرك", image: catEngine, count: "+800 صنف", slug: "engine" },
  { name: "أجزاء العفشة", image: catSuspension, count: "+600 صنف", slug: "suspension" },
  { name: "الفلاتر", image: catFilters, count: "+400 صنف", slug: "filters" },
  { name: "زيوت تويوتا الأصلية", image: catOils, count: "+50 صنف", slug: "oils-gasoline", brand: "toyota-oils" },
  { name: "الكهرباء", image: catElectrical, count: "+500 صنف", slug: "electrical" },
  { name: "التبريد", image: catCooling, count: "+300 صنف", slug: "cooling" },
];

const brands = [
  { label: "قطع غيار تويوتا الأصلية", image: brandGenuineParts, to: "/products/toyota-genuine", imgScale: "scale-100" },
  { label: "زيوت تويوتا الأصلية", image: brandToyotaOil, to: "/products/toyota-oils", imgScale: "scale-150" },
  { label: "MTX Aftermarket", image: brandMtx, to: "/products/mtx-aftermarket", imgScale: "scale-150" },
];

// Glowing particles component
const GlowingParticles = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const isMobile = canvas.width < 768;
    const particleCount = isMobile ? 20 : 60;
    const particles: { x: number; y: number; r: number; dx: number; dy: number; opacity: number; pulse: number }[] = [];
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 2 + 0.5,
        dx: (Math.random() - 0.5) * 0.3,
        dy: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.6 + 0.2,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.x += p.dx;
        p.y += p.dy;
        p.pulse += 0.02;
        const glow = Math.sin(p.pulse) * 0.3 + 0.7;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
        gradient.addColorStop(0, `rgba(235, 10, 30, ${p.opacity * glow * 0.4})`);
        gradient.addColorStop(0.5, `rgba(235, 10, 30, ${p.opacity * glow * 0.1})`);
        gradient.addColorStop(1, "rgba(235, 10, 30, 0)");
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${p.opacity * glow})`;
        ctx.fill();
      });
      animId = requestAnimationFrame(animate);
    };
    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
};

const ProductsSection = () => {
  return (
    <section id="products" className="py-20 md:py-28 bg-dark-section relative overflow-hidden">
      <GlowingParticles />

      {/* Decorative gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-primary/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ type: "spring", stiffness: 200 }}
            className="inline-flex items-center gap-2 px-5 py-2 rounded-full border border-primary/30 bg-primary/10 text-primary text-sm font-bold mb-5 backdrop-blur-sm"
          >
            <Sparkles className="w-4 h-4" />
            كتالوج المنتجات
          </motion.div>
          <h2 className="text-3xl md:text-5xl font-black mb-4">
            <span className="text-[hsl(var(--section-dark-foreground))]">اكتشف </span>
            <span className="shimmer-text">منتجاتنا</span>
          </h2>
          <p className="text-[hsl(var(--section-dark-foreground))]/60 text-base md:text-lg max-w-xl mx-auto">
            أكثر من 5,000 صنف من قطع غيار تويوتا الأصلية والبديلة
          </p>
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: "6rem" }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="h-1 bg-gradient-to-l from-primary to-primary/40 mx-auto mt-5 rounded-full"
          />
        </motion.div>

        {/* Brands Row */}
        <div className="mb-16">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 md:gap-5 max-w-5xl mx-auto">
            {brands.map((b, i) => (
              <motion.div
                key={b.to}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="flex flex-col items-center gap-3"
              >
                <Link
                  to={b.to}
                  className="relative bg-white rounded-2xl aspect-[4/3] w-full flex items-center justify-center group border border-[hsl(var(--section-dark-foreground))]/10 hover:border-primary/50 transition-all duration-500 overflow-hidden shadow-lg shadow-black/20 hover:shadow-primary/20 hover:shadow-xl"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-transparent to-primary/0 group-hover:from-primary/5 group-hover:to-primary/10 transition-all duration-500" />
                  <motion.img
                    src={b.image}
                    alt={b.label}
                    loading="lazy"
                    decoding="async"
                    className={`relative z-10 w-[90%] h-[90%] object-contain ${b.imgScale}`}
                    whileHover={{ scale: 1.08 }}
                    transition={{ duration: 0.3 }}
                  />
                </Link>
                <Link
                  to={b.to}
                  className="inline-flex items-center gap-1.5 bg-[hsl(var(--section-dark))]/80 backdrop-blur-sm border border-[hsl(var(--section-dark-foreground))]/15 text-[hsl(var(--section-dark-foreground))]/80 text-xs md:text-sm px-4 py-1.5 rounded-full hover:bg-primary hover:text-primary-foreground hover:border-primary transition-all duration-300 hover:shadow-[0_0_20px_hsl(var(--red-glow)/0.4)] group"
                >
                  {b.label}
                  <ChevronLeft className="w-3.5 h-3.5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300" />
                </Link>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Categories Grid */}
        <div className="mb-5">
          <motion.h3
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="text-xl md:text-2xl font-bold text-[hsl(var(--section-dark-foreground))] mb-6 flex items-center gap-3"
          >
            <div className="w-1 h-7 bg-primary rounded-full" />
            تصفح حسب الفئة
          </motion.h3>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.5 }}
            >
              <Link
                to={`/products/${cat.brand || "toyota-genuine"}?category=${cat.slug}`}
                className="group relative rounded-2xl overflow-hidden block border border-[hsl(var(--section-dark-foreground))]/10 hover:border-primary/40 transition-all duration-500 shadow-lg shadow-black/20 hover:shadow-primary/15 hover:shadow-xl"
              >
                <div className="aspect-[4/3] relative">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    loading="lazy"
                  />
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[hsl(var(--section-dark))] via-[hsl(var(--section-dark))]/50 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500" />

                  {/* Content */}
                  <div className="absolute bottom-0 right-0 left-0 p-5 md:p-6">
                    <div className="flex items-end justify-between">
                      <div>
                        <h3 className="text-lg md:text-xl font-black text-[hsl(var(--section-dark-foreground))] mb-1 group-hover:text-primary transition-colors duration-300">
                          {cat.name}
                        </h3>
                        <span className="text-sm text-primary font-bold">{cat.count}</span>
                      </div>
                      <motion.div
                        className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center opacity-0 translate-x-3 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300"
                      >
                        <ArrowLeft className="w-5 h-5 text-primary" />
                      </motion.div>
                    </div>
                  </div>

                  {/* Top badge */}
                  <div className="absolute top-4 right-4">
                    <span className="text-[10px] font-bold bg-primary/90 text-primary-foreground px-3 py-1 rounded-full backdrop-blur-sm shadow-lg">
                      {cat.brand ? "زيوت" : "قطع غيار"}
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-14"
        >
          <motion.div whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
            <Button size="lg" className="gap-2.5 red-glow text-lg px-10 h-13 rounded-xl font-bold" asChild>
              <Link to="/products/toyota-genuine">
                استعراض جميع المنتجات
                <ArrowLeft className="w-5 h-5" />
              </Link>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default ProductsSection;
