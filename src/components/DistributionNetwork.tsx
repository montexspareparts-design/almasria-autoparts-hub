import { motion } from "framer-motion";
import { MapPin, Building2, Globe, Truck } from "lucide-react";

const branches = [
  { name: "القاهرة – التوفيقية", detail: "سوق التوفيقية لقطع غيار السيارات", icon: Building2 },
  { name: "الجيزة – أوسيم", detail: "أوسيم – الجيزة", icon: Building2 },
  { name: "الأقصر", detail: "صعيد مصر", icon: Building2 },
  { name: "المكتب الإداري", detail: "اللبيني – الجيزة", icon: Building2 },
  { name: "دبي – Spectra Cars & Parts FZC", detail: "مركز إقليمي – الإمارات 🇦🇪", icon: Globe },
];

const DistributionNetwork = () => {
  return (
    <section id="distribution" className="py-20 md:py-28 bg-dark-section overflow-hidden relative">
      {/* Animated map dots */}
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-2 h-2 rounded-full bg-primary/20"
          style={{ left: `${20 + i * 20}%`, top: `${30 + i * 10}%` }}
          animate={{
            scale: [1, 2, 1],
            opacity: [0.2, 0.5, 0.2],
          }}
          transition={{ duration: 2 + i * 0.5, repeat: Infinity, delay: i * 0.8 }}
        />
      ))}

      <div className="container mx-auto px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 rounded-full bg-primary/15 text-primary text-sm font-bold mb-4"
          >
            <MapPin className="w-4 h-4 inline ml-1" />
            شبكة التوزيع
          </motion.span>
          <h2 className="text-3xl md:text-5xl font-black text-[hsl(var(--section-dark-foreground))] mb-4">
            تغطية <span className="shimmer-text">شاملة</span>
          </h2>
          <p className="text-[hsl(var(--section-dark-foreground))]/60 text-base max-w-xl mx-auto mt-4">
            نغطي مصر بالكامل عبر مخازن مركزية ووسائل نقل حديثة لضمان تسليم دقيق خلال 48 ساعة.
          </p>
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: "5rem" }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="h-1 bg-primary mx-auto mt-5 rounded-full"
          />
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-4xl mx-auto">
          {branches.map((b, i) => (
            <motion.div
              key={b.name}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30, y: 20 }}
              whileInView={{ opacity: 1, x: 0, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, type: "spring", stiffness: 80 }}
              whileHover={{ scale: 1.03, y: -4 }}
              className="bg-[hsl(var(--section-dark-foreground))]/5 border border-[hsl(var(--section-dark-foreground))]/10 rounded-xl p-5 hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 group relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:to-transparent transition-all duration-500" />
              <div className="flex items-start gap-3 relative z-10">
                <motion.div
                  className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center flex-shrink-0"
                  whileHover={{ rotate: 10, scale: 1.1 }}
                >
                  <b.icon className="w-5 h-5 text-primary" />
                </motion.div>
                <div>
                  <h4 className="font-bold text-[hsl(var(--section-dark-foreground))] text-sm">{b.name}</h4>
                  <p className="text-xs text-[hsl(var(--section-dark-foreground))]/60 mt-1">{b.detail}</p>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Delivery highlight */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.6, type: "spring" }}
            whileHover={{ scale: 1.03 }}
            className="bg-primary/10 border border-primary/30 rounded-xl p-5 flex items-center gap-3 relative overflow-hidden"
          >
            <motion.div
              className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent"
              animate={{ x: ["-100%", "100%"] }}
              transition={{ duration: 3, repeat: Infinity, repeatDelay: 2 }}
            />
            <motion.div
              className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0 relative z-10"
              animate={{ x: [0, 5, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Truck className="w-5 h-5 text-primary" />
            </motion.div>
            <div className="relative z-10">
              <h4 className="font-bold text-[hsl(var(--section-dark-foreground))] text-sm">تسليم سريع</h4>
              <p className="text-xs text-[hsl(var(--section-dark-foreground))]/60 mt-1">48 ساعة داخل مصر</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default DistributionNetwork;
