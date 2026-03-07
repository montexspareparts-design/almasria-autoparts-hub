import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
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
import brandDenso from "@/assets/brand-denso.png";
import brandAisin from "@/assets/brand-aisin.png";

const categories = [
  { name: "أجزاء المحرك", image: catEngine, count: "+800 صنف" },
  { name: "أجزاء العفشة", image: catSuspension, count: "+600 صنف" },
  { name: "الفلاتر", image: catFilters, count: "+400 صنف" },
  { name: "زيوت تويوتا الأصلية", image: catOils, count: "+50 صنف" },
  { name: "الكهرباء", image: catElectrical, count: "+500 صنف" },
  { name: "التبريد", image: catCooling, count: "+300 صنف" },
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

    const particles: { x: number; y: number; r: number; dx: number; dy: number; opacity: number; pulse: number }[] = [];
    for (let i = 0; i < 60; i++) {
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

        // Outer glow
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 6);
        gradient.addColorStop(0, `rgba(235, 10, 30, ${p.opacity * glow * 0.4})`);
        gradient.addColorStop(0.5, `rgba(235, 10, 30, ${p.opacity * glow * 0.1})`);
        gradient.addColorStop(1, "rgba(235, 10, 30, 0)");
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 6, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Core
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
  const { isDealer, user } = useAuth();
  const navigate = useNavigate();

  return (
    <section id="products" className="py-20 md:py-28 bg-dark-section relative overflow-hidden">
      {/* Glowing particles background */}
      <GlowingParticles />

      <div className="container mx-auto px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl md:text-5xl font-black text-dark-section-foreground mb-4">
            <span className="text-gradient-red">منتجاتنا</span>
          </h2>
          <div className="w-20 h-1 bg-primary mx-auto mt-4" />
        </motion.div>

        {/* Brand Labels */}
        <div className="grid grid-cols-3 md:grid-cols-5 gap-4 md:gap-6 mb-12 max-w-5xl mx-auto">
          {[
            { label: "قطع غيار تويوتا الأصلية", image: brandGenuineParts, to: "/products/toyota-genuine", imgScale: "scale-100" },
            { label: "زيوت تويوتا الأصلية", image: brandToyotaOil, to: "/products/toyota-oils", imgScale: "scale-150" },
            { label: "MTX Aftermarket", image: brandMtx, to: "/products/mtx-aftermarket", imgScale: "scale-150" },
            { label: "DENSO", image: brandDenso, to: "/products/denso", imgScale: "scale-100" },
            { label: "AISIN", image: brandAisin, to: "/products/aisin", imgScale: "scale-100" },
          ].map((b, i) => (
            <motion.div
              key={b.to}
              initial={{ opacity: 0, y: 40, rotateY: -15 }}
              whileInView={{ opacity: 1, y: 0, rotateY: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.2, duration: 0.6, type: "spring", stiffness: 100, damping: 12 }}
              whileHover={{ scale: 1.07, y: -10 }}
              whileTap={{ scale: 0.95 }}
              className="flex flex-col items-center gap-3"
            >
              <Link
                to={b.to}
                className="relative bg-white rounded-2xl aspect-[4/3] w-full flex items-center justify-center group border-2 border-primary/20 hover:border-primary/60 transition-all duration-500 overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.15)]"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="absolute inset-0 shadow-[inset_0_0_30px_rgba(235,10,30,0.05)] group-hover:shadow-[inset_0_0_40px_rgba(235,10,30,0.12)] transition-shadow duration-500 rounded-2xl" />
                <img
                  src={b.image}
                  alt={b.label}
                  className={`relative z-10 w-[95%] h-[95%] object-contain transition-transform duration-500 group-hover:scale-105 ${b.imgScale}`}
                />
              </Link>
              {/* Badge under logo */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.2 + 0.4, type: "spring", stiffness: 150 }}
              >
                <Link
                  to={b.to}
                  className="inline-block bg-secondary/80 backdrop-blur-sm border border-white/20 text-secondary-foreground/90 text-xs md:text-sm px-4 py-1.5 rounded-full hover:bg-primary hover:text-primary-foreground transition-all duration-300 hover:shadow-[0_0_20px_rgba(235,10,30,0.4)]"
                >
                  {b.label}
                </Link>
              </motion.div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {categories.map((cat, i) => (
            <motion.div
              key={cat.name}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
            >
              <Link
                to="/products/toyota-genuine"
                className="group relative rounded-lg overflow-hidden card-hover cursor-pointer block"
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
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mt-12"
        >
          <Button size="lg" className="gap-2 red-glow text-lg px-8" asChild>
            <Link to="/products/toyota-genuine">
              استعراض المنتجات
              <ArrowLeft className="w-5 h-5" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default ProductsSection;
