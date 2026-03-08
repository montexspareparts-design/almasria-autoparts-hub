import { motion, useScroll, useTransform } from "framer-motion";
import { ShieldCheck, ArrowLeft, Phone, MapPin, Calendar, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useRef } from "react";
import { Link } from "react-router-dom";
import heroBg from "@/assets/hero-corporate.jpg";

const stats = [
  { icon: Calendar, value: "25+", label: "عام خبرة" },
  { icon: Users, value: "1,000+", label: "عميل نشط" },
  { icon: MapPin, value: "4", label: "فروع رئيسية" },
  { icon: ShieldCheck, value: "100%", label: "منتجات أصلية" },
];

const HeroSection = () => {
  const sectionRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: sectionRef, offset: ["start start", "end start"] });
  const bgY = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <section ref={sectionRef} id="hero" className="relative min-h-[100svh] flex flex-col justify-center overflow-hidden">
      {/* Background */}
      <motion.div className="absolute inset-0" style={{ y: bgY }}>
        <img
          src={heroBg}
          alt="مستودع توزيع قطع غيار تويوتا — المصرية جروب"
          className="w-full h-full object-cover scale-105"
          loading="eager"
          decoding="async"
          fetchPriority="high"
        />
        <div className="absolute inset-0 bg-gradient-to-l from-secondary/98 via-secondary/85 to-secondary/50" />
        <div className="absolute bottom-0 inset-x-0 h-40 bg-gradient-to-t from-secondary to-transparent" />
      </motion.div>

      {/* Content */}
      <motion.div className="container mx-auto px-4 relative z-10 pt-28 md:pt-36 pb-20" style={{ opacity: contentOpacity }}>
        <div className="max-w-3xl">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="inline-flex items-center gap-2 bg-primary/12 border border-primary/20 rounded-full px-4 py-2 mb-8"
          >
            <ShieldCheck className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold text-primary">موزع معتمد رسمي — تويوتا مصر</span>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.35 }}
            className="text-3xl sm:text-4xl md:text-5xl lg:text-[3.5rem] font-black text-secondary-foreground leading-[1.15] tracking-tight mb-6"
          >
            المصرية جروب
            <span className="block text-primary mt-2 text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem]">
              منصة توزيع قطع غيار تويوتا الأصلية
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5 }}
            className="text-secondary-foreground/55 text-base md:text-lg leading-[1.9] max-w-xl mb-10"
          >
            مؤسسة مصرية متخصصة في توزيع قطع الغيار والزيوت الأصلية ومنتجات السوق الياباني، بشبكة لوجستية تغطي جميع محافظات مصر منذ أكثر من ربع قرن.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.65 }}
            className="flex flex-col sm:flex-row gap-3 mb-14"
          >
            <Button
              size="lg"
              className="text-base px-8 py-6 gap-2.5 font-bold bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 group"
              asChild
            >
              <Link to="/what-sets-us-apart">
                تعرف على المجموعة
                <ArrowLeft className="w-5 h-5 transition-transform group-hover:-translate-x-1" />
              </Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="text-base px-8 py-6 gap-2.5 font-bold border border-secondary-foreground/15 text-secondary-foreground bg-secondary-foreground/[0.04] backdrop-blur-sm hover:bg-secondary-foreground/10 transition-all duration-300"
              asChild
            >
              <Link to="/contact">
                <Phone className="w-4 h-4" />
                تواصل معنا
              </Link>
            </Button>
          </motion.div>

          {/* Stats Strip */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
            className="grid grid-cols-2 sm:grid-cols-4 gap-4 md:gap-6"
          >
            {stats.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.9 + i * 0.08, duration: 0.4 }}
                className="flex items-center gap-3 bg-secondary-foreground/[0.04] border border-secondary-foreground/[0.08] rounded-xl px-4 py-3 backdrop-blur-sm"
              >
                <s.icon className="w-5 h-5 text-primary flex-shrink-0" strokeWidth={1.8} />
                <div>
                  <div className="text-lg font-black text-secondary-foreground leading-none">{s.value}</div>
                  <div className="text-xs text-secondary-foreground/45 mt-0.5">{s.label}</div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </motion.div>
    </section>
  );
};

export default HeroSection;
