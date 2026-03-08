import { motion, useScroll, useTransform } from "framer-motion";
import { ShieldCheck, Package, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-corporate.webp";

const HeroSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section
      ref={sectionRef}
      id="hero"
      className="relative min-h-[72vh] md:min-h-[72vh] flex flex-col justify-center overflow-hidden"
      style={{ minHeight: "clamp(60vh, 72vh, 72vh)" }}
    >
      {/* Background — decorative CSS bg */}
      <motion.div
        className="absolute inset-0"
        style={{ y: bgY }}
        aria-hidden="true"
      >
        <img
          src={heroBg}
          alt=""
          width={1920}
          height={1080}
          className="w-full h-full object-cover scale-105"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        {/* Overlay 40% (within 35–45% range) */}
        <div className="absolute inset-0 bg-black/40" />
        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-black/30 to-transparent" />
      </motion.div>

      {/* Content */}
      <motion.div
        className="container mx-auto px-4 relative z-10 pt-28 md:pt-36 pb-20"
        style={{ opacity: contentOpacity }}
      >
        <div className="max-w-[760px]">
          {/* Badge — موزّع معتمد */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center gap-2 border border-white/20 rounded-full px-4 py-2 mb-8 bg-white/5 backdrop-blur-sm"
          >
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-white">موزّع معتمد — تويوتا</span>
          </motion.div>

          {/* H1 — single on page */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="text-[1.65rem] sm:text-3xl md:text-4xl lg:text-[2.75rem] font-bold text-white leading-[1.6] md:leading-[1.65] tracking-tight mb-6"
          >
            المصرية جروب — موزع معتمد لقطع&nbsp;غيار وزيوت&nbsp;تويوتا&nbsp;الأصلية في&nbsp;مصر
          </motion.h1>

          {/* Description */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="text-white/80 text-base md:text-lg leading-[1.75] max-w-[660px] mb-10"
          >
            خبرة تتجاوز 25 عامًا في التوزيع المؤسسي، شبكة تغطي جميع المحافظات مع تسليم خلال 48&nbsp;ساعة، وعلامتنا MTX بجودة تضاهي المواصفات&nbsp;الأصلية.
          </motion.p>

          {/* CTAs — Primary first (left in RTL) */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.65 }}
            className="flex flex-col sm:flex-row gap-3 mb-5"
          >
            <Button
              size="lg"
              className="text-base px-8 py-6 gap-2.5 font-bold bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 w-full sm:w-auto"
              asChild
            >
              <Link to="/products" aria-label="تصفح منتجات المصرية جروب">
                <Package className="w-5 h-5" />
                تصفّح المنتجات
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base px-8 py-6 gap-2.5 font-bold border border-white/20 text-white bg-white/5 backdrop-blur-sm hover:bg-white/10 transition-all duration-300 w-full sm:w-auto"
              asChild
            >
              <Link to="/#coverage" aria-label="عرض فروع وانتشار المصرية جروب">
                <MapPin className="w-5 h-5" />
                فروعنا وانتشارنا
              </Link>
            </Button>
          </motion.div>

          {/* Trust line */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <p className="text-white/50 text-sm leading-[1.7]">
              تغطية وطنية وشحن لجميع المحافظات — تسليم خلال 48&nbsp;ساعة عبر شبكة توزيع منظمة.
            </p>
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
