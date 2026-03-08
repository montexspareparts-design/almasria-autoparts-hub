import { motion, useScroll, useTransform } from "framer-motion";
import { ShieldCheck, ArrowLeft, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-distribution.jpg";

const HeroSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "25%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0]);

  return (
    <section ref={sectionRef} id="hero" className="relative min-h-[100svh] flex items-center overflow-hidden">
      <motion.div className="absolute inset-0" style={{ y: bgY }}>
        <img src={heroBg} alt="مستودع توزيع قطع غيار تويوتا" className="w-full h-full object-cover scale-110" loading="eager" />
        <div className="absolute inset-0 bg-gradient-to-l from-secondary/95 via-secondary/80 to-secondary/40" />
        <div className="absolute bottom-0 inset-x-0 h-32 bg-gradient-to-t from-secondary to-transparent" />
      </motion.div>

      <div className="absolute top-1/3 right-[15%] w-[500px] h-[500px] rounded-full bg-primary/8 blur-[150px] pointer-events-none" />

      <motion.div className="container mx-auto px-4 relative z-10 pt-28 md:pt-32 pb-16" style={{ opacity: contentOpacity }}>
        <div className="max-w-3xl">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="inline-flex items-center gap-2 bg-primary/15 border border-primary/25 rounded-full px-4 py-2 mb-8 backdrop-blur-sm"
          >
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">موزع معتمد رسمي لتويوتا</span>
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.35 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-black text-secondary-foreground leading-[1.2] tracking-tight mb-6"
          >
            منصة توزيع متخصصة في
            <br />
            <span className="shimmer-text">قطع غيار تويوتا الأصلية</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.55 }}
            className="text-secondary-foreground/65 text-lg md:text-xl leading-relaxed max-w-xl mb-10"
          >
            خبرة أكثر من 25 عامًا في توزيع قطع الغيار ومنتجات السوق الياباني عبر شبكة تغطي جميع محافظات مصر.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            <Button
              size="lg"
              className="text-base md:text-lg px-8 md:px-10 py-6 gap-3 font-bold bg-primary hover:bg-primary/90 text-primary-foreground shadow-xl shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 group"
              asChild
            >
              <Link to="/what-sets-us-apart">
                تعرف علينا
                <ArrowLeft className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-1" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base md:text-lg px-8 md:px-10 py-6 gap-3 font-bold border-2 border-secondary-foreground/20 text-secondary-foreground bg-transparent backdrop-blur-sm hover:bg-secondary-foreground/10 transition-all duration-300"
              asChild
            >
              <Link to="/contact">
                <MessageCircle className="w-5 h-5" />
                تواصل معنا
              </Link>
            </Button>
          </motion.div>

        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
