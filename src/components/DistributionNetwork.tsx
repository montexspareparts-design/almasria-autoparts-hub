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
    <section id="distribution" className="py-20 md:py-28 bg-dark-section overflow-hidden">
      <div className="container mx-auto px-4">
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
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="bg-[hsl(var(--section-dark-foreground))]/5 border border-[hsl(var(--section-dark-foreground))]/10 rounded-xl p-5 hover:border-primary/40 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 group"
            >
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-primary/15 rounded-xl flex items-center justify-center flex-shrink-0 transition-transform duration-300 group-hover:scale-110">
                  <b.icon className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-bold text-[hsl(var(--section-dark-foreground))] text-sm">{b.name}</h4>
                  <p className="text-xs text-[hsl(var(--section-dark-foreground))]/60 mt-1">{b.detail}</p>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Delivery highlight */}
          <motion.div
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5 }}
            className="bg-primary/10 border border-primary/30 rounded-xl p-5 flex items-center gap-3"
          >
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center flex-shrink-0">
              <Truck className="w-5 h-5 text-primary" />
            </div>
            <div>
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
