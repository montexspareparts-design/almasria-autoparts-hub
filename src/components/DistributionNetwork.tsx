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
    <section id="distribution" className="py-20 md:py-28 bg-secondary">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/15 text-primary text-sm font-bold mb-4">
            شبكة التوزيع
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-secondary-foreground mb-3">
            تغطية <span className="text-primary">شاملة</span>
          </h2>
          <p className="text-secondary-foreground/50 text-base max-w-xl mx-auto">
            نغطي مصر بالكامل عبر مخازن مركزية وتسليم خلال 48 ساعة
          </p>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {branches.map((b, i) => (
            <motion.div
              key={b.name}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08, duration: 0.4 }}
              className="bg-secondary-foreground/[0.04] border border-secondary-foreground/10 rounded-xl p-5"
            >
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-primary/15 rounded-lg flex items-center justify-center flex-shrink-0">
                  <b.icon className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <h3 className="font-bold text-secondary-foreground text-sm">{b.name}</h3>
                  <p className="text-xs text-secondary-foreground/50 mt-1">{b.detail}</p>
                  <a
                    href={b.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-2 text-xs font-semibold text-primary hover:text-primary/80 transition-colors"
                  >
                    <Navigation className="w-3 h-3" />
                    خرائط جوجل
                  </a>
                </div>
              </div>
            </motion.div>
          ))}

          {/* Delivery card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.5, duration: 0.4 }}
            className="bg-primary/10 border border-primary/25 rounded-xl p-5 flex items-center gap-3"
          >
            <div className="w-9 h-9 bg-primary/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <Truck className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h3 className="font-bold text-secondary-foreground text-sm">تسليم سريع</h3>
              <p className="text-xs text-secondary-foreground/50 mt-1">48 ساعة داخل مصر</p>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default DistributionNetwork;
