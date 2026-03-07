import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";

interface BrandHeroBannerProps {
  logo: string;
  title: string;
  subtitle: string;
  description: string;
  badge: string;
}

const StarField = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * 2;
      canvas.height = canvas.offsetHeight * 2;
      ctx.scale(2, 2);
    };
    resize();
    window.addEventListener("resize", resize);

    interface Star {
      x: number; y: number; r: number;
      dx: number; dy: number;
      opacity: number; pulse: number; speed: number;
      hue: number;
    }

    const w = () => canvas.offsetWidth;
    const h = () => canvas.offsetHeight;

    const stars: Star[] = [];
    for (let i = 0; i < 90; i++) {
      stars.push({
        x: Math.random() * w(),
        y: Math.random() * h(),
        r: Math.random() * 1.8 + 0.3,
        dx: (Math.random() - 0.5) * 0.4,
        dy: (Math.random() - 0.5) * 0.4,
        opacity: Math.random() * 0.7 + 0.3,
        pulse: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.03 + 0.01,
        hue: Math.random() > 0.7 ? 355 : Math.random() > 0.5 ? 210 : 40,
      });
    }

    let animId: number;
    const animate = () => {
      ctx.clearRect(0, 0, w(), h());

      // Draw connection lines between nearby stars
      for (let i = 0; i < stars.length; i++) {
        for (let j = i + 1; j < stars.length; j++) {
          const dist = Math.hypot(stars[i].x - stars[j].x, stars[i].y - stars[j].y);
          if (dist < 120) {
            const alpha = (1 - dist / 120) * 0.08;
            ctx.beginPath();
            ctx.moveTo(stars[i].x, stars[i].y);
            ctx.lineTo(stars[j].x, stars[j].y);
            ctx.strokeStyle = `rgba(235, 50, 70, ${alpha})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }

      stars.forEach((s) => {
        s.x += s.dx;
        s.y += s.dy;
        s.pulse += s.speed;
        const glow = Math.sin(s.pulse) * 0.4 + 0.6;

        if (s.x < -10) s.x = w() + 10;
        if (s.x > w() + 10) s.x = -10;
        if (s.y < -10) s.y = h() + 10;
        if (s.y > h() + 10) s.y = -10;

        const colors: Record<number, string> = {
          355: "235, 30, 50",
          210: "100, 160, 230",
          40: "230, 190, 80",
        };
        const rgb = colors[s.hue] || "235, 30, 50";

        // Outer glow
        const grad = ctx.createRadialGradient(s.x, s.y, 0, s.x, s.y, s.r * 10);
        grad.addColorStop(0, `rgba(${rgb}, ${s.opacity * glow * 0.5})`);
        grad.addColorStop(0.4, `rgba(${rgb}, ${s.opacity * glow * 0.15})`);
        grad.addColorStop(1, `rgba(${rgb}, 0)`);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r * 10, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();

        // Core star
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${s.opacity * glow})`;
        ctx.fill();

        // Cross flare for bigger stars
        if (s.r > 1.2) {
          const len = s.r * 5 * glow;
          ctx.strokeStyle = `rgba(255, 255, 255, ${s.opacity * glow * 0.3})`;
          ctx.lineWidth = 0.5;
          ctx.beginPath();
          ctx.moveTo(s.x - len, s.y);
          ctx.lineTo(s.x + len, s.y);
          ctx.stroke();
          ctx.beginPath();
          ctx.moveTo(s.x, s.y - len);
          ctx.lineTo(s.x, s.y + len);
          ctx.stroke();
        }
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

const BrandHeroBanner = ({ logo, title, subtitle, description, badge }: BrandHeroBannerProps) => {
  return (
    <section className="pt-24 pb-14 bg-dark-section relative overflow-hidden">
      {/* Animated star field */}
      <StarField />

      {/* Gradient overlays */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[hsl(var(--section-dark))] pointer-events-none" />
      <div className="absolute top-0 left-0 w-1/2 h-full bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10">
        <Link to="/#products" className="inline-flex items-center gap-2 text-sm text-primary hover:underline mb-8 group">
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
          العودة للمنتجات
        </Link>

        <div className="flex flex-col md:flex-row items-start gap-10">
          {/* Logo Box */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8, rotateY: -20 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            transition={{ duration: 0.8, type: "spring", stiffness: 80, damping: 14 }}
            className="relative shrink-0"
          >
            <div className="relative w-44 h-44 md:w-56 md:h-56 rounded-2xl bg-white/95 backdrop-blur-xl border-2 border-white/40 flex items-center justify-center overflow-hidden group">
              {/* Shimmer effect */}
              <motion.div
                className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -skew-x-12"
                animate={{ x: ["-200%", "200%"] }}
                transition={{ duration: 3, repeat: Infinity, repeatDelay: 4, ease: "easeInOut" }}
              />
              {/* Subtle inner glow */}
              <div className="absolute inset-0 shadow-[inset_0_0_40px_rgba(235,30,50,0.08)] rounded-2xl" />
              {/* Logo */}
              <motion.img
                src={logo}
                alt={title}
                className="relative z-10 w-[80%] h-[80%] object-contain"
                animate={{ scale: [1, 1.03, 1] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              />
            </div>

            {/* Glow ring behind box */}
            <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-primary/20 via-transparent to-primary/10 blur-xl -z-10" />
            <motion.div
              className="absolute -inset-1 rounded-2xl border border-primary/20 -z-10"
              animate={{ opacity: [0.3, 0.7, 0.3] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
          </motion.div>

          {/* Text Content */}
          <div className="flex-1 pt-2">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="inline-flex items-center gap-2 bg-primary/15 border border-primary/30 rounded-full px-5 py-2 mb-5"
            >
              <ShieldCheck className="w-4 h-4 text-primary" />
              <span className="text-sm font-bold text-primary">{badge}</span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-3xl md:text-5xl lg:text-6xl font-black text-dark-section-foreground mb-3"
            >
              {title}
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.55, duration: 0.5 }}
              className="text-lg md:text-xl text-primary/80 font-semibold mb-4"
            >
              {subtitle}
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65, duration: 0.5 }}
              className="text-dark-section-foreground/60 max-w-2xl leading-relaxed text-base"
            >
              {description}
            </motion.p>

            {/* Decorative line */}
            <motion.div
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.8, duration: 0.6 }}
              className="h-1 w-24 bg-gradient-to-l from-primary to-primary/30 rounded-full mt-6 origin-right"
            />
          </div>
        </div>
      </div>
    </section>
  );
};

export default BrandHeroBanner;
