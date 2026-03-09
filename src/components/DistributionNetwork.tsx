import { motion } from "framer-motion";
import { MapPin, Building2, Globe, Truck, Navigation } from "lucide-react";

const branches = [
  { name: "القاهرة – التوفيقية", detail: "سوق التوفيقية لقطع غيار السيارات", icon: Building2, mapUrl: "https://maps.app.goo.gl/B3Kb6At4dnfGy28T9" },
  { name: "الجيزة – أوسيم", detail: "أوسيم – الجيزة", icon: Building2, mapUrl: "https://maps.app.goo.gl/trZ9Q4ZhnwtsFXTB8" },
  { name: "الأقصر", detail: "صعيد مصر", icon: Building2, mapUrl: "https://maps.app.goo.gl/c9B4yDBY2QHWPKcT8" },
  { name: "المكتب الإداري", detail: "اللبيني – الجيزة", icon: Building2, mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("اللبيني, الجيزة, مصر")}` },
  { name: "دبي – Spectra Cars & Parts", detail: "مركز إقليمي – الإمارات", icon: Globe, mapUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent("Spectra Cars & Parts FZC, Dubai, UAE")}` },
];

const DistributionNetwork = () => {
  return (
    <section id="coverage" className="py-20 md:py-28 bg-secondary overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-14"
        >
          <p className="text-[hsl(var(--gold-accent))] text-sm font-black tracking-[0.3em] uppercase mb-5">
            فروعنا
          </p>
          <h2 className="text-4xl md:text-5xl font-black text-secondary-foreground leading-tight mb-4">
            شبكة <span className="text-primary">التوزيع</span>
          </h2>
          <p className="text-secondary-foreground/50 text-sm leading-relaxed max-w-md mx-auto">
            تغطية وطنية شاملة وشحن لجميع المحافظات عبر مخازن مركزية
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {branches.map((b, i) => (
            <motion.div
              key={b.name}
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true, margin: "-40px" }}
              transition={{
                delay: 0.1 + i * 0.1,
                duration: 0.5,
                type: "spring",
                stiffness: 100,
              }}
              whileHover={{
                y: -4,
                scale: 1.02,
                borderColor: "hsl(var(--primary) / 0.35)",
                transition: { duration: 0.2 },
              }}
              className="group bg-secondary-foreground/[0.06] border-2 border-secondary-foreground/15 rounded-2xl p-6 transition-all duration-300 relative overflow-hidden hover:bg-secondary-foreground/[0.08] shadow-sm hover:shadow-lg"
            >
              {/* Hover shine */}
              <div className="absolute inset-0 bg-gradient-to-br from-primary/8 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              
              <div className="relative z-10 flex items-start gap-4">
                <motion.div
                  className="w-12 h-12 bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-primary/30 transition-colors shadow-md shadow-primary/10"
                  whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                >
                  <b.icon className="w-6 h-6 text-primary" strokeWidth={2} />
                </motion.div>
                <div>
                  <h3 className="font-black text-secondary-foreground text-base mb-1">{b.name}</h3>
                  <p className="text-sm text-secondary-foreground/60 mt-1.5 font-medium">{b.detail}</p>
                  <motion.a
                    href={b.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 text-sm font-black text-primary hover:text-primary/80 transition-colors"
                    whileHover={{ x: -4 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Navigation className="w-4 h-4" strokeWidth={2.5} />
                    الموقع على الخريطة
                  </motion.a>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Delivery card */}
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6, duration: 0.5, type: "spring", stiffness: 100 }}
            whileHover={{
              y: -4,
              scale: 1.02,
              transition: { duration: 0.2 },
            }}
            className="bg-primary/15 border-2 border-primary/35 rounded-2xl p-6 flex items-center gap-4 relative overflow-hidden group shadow-lg shadow-primary/20"
          >
            {/* Animated pulse bg */}
            <motion.div
              className="absolute inset-0 bg-primary/10 rounded-2xl"
              animate={{ opacity: [0, 0.6, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="relative z-10 flex items-center gap-4">
              <motion.div
                className="w-12 h-12 bg-primary/30 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20"
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Truck className="w-6 h-6 text-primary" strokeWidth={2.5} />
              </motion.div>
              <div>
                <h3 className="font-black text-secondary-foreground text-base mb-1">توصيل سريع لجميع المحافظات</h3>
                <p className="text-sm text-secondary-foreground/60 font-medium">تسليم خلال 48 ساعة داخل مصر</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default DistributionNetwork;
