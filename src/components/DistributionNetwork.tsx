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
    <section id="coverage" className="relative bg-carbon py-20 md:py-28 overflow-hidden">
      {/* Hairlines */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-toyota-red/40 to-transparent" />
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-toyota-red/20 to-transparent" />

      {/* Ambient red glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-toyota-red/[0.05] rounded-full blur-[150px]" />
        <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-toyota-red/[0.04] rounded-full blur-[120px]" />
      </div>

      <div className="container mx-auto px-4 relative">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-14"
        >
          <div className="inline-flex items-center gap-2 border border-white/10 bg-white/[0.04] rounded-full px-4 py-1.5 mb-5">
            <MapPin className="w-3.5 h-3.5 text-toyota-red" />
            <span className="font-tajawal text-xs font-bold text-soft tracking-widest">
              تغطية وطنية
            </span>
          </div>
          <h2
            className="font-tajawal font-black text-white leading-tight mb-3"
            style={{ fontSize: "clamp(32px, 4.5vw, 56px)" }}
          >
            شبكة <span className="text-toyota-red">التوزيع</span>
          </h2>
          <div className="flex items-center justify-center mb-4">
            <span className="h-[3px] w-20 bg-toyota-red rounded-full shadow-red-glow" />
          </div>
          <p className="font-tajawal text-soft text-base md:text-lg max-w-xl mx-auto">
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
              transition={{ delay: 0.1 + i * 0.1, duration: 0.5, type: "spring", stiffness: 100 }}
              whileHover={{ y: -4, transition: { duration: 0.2 } }}
              className="group relative bg-white/[0.04] backdrop-blur-sm border border-white/10 rounded-2xl p-6 transition-all duration-300 overflow-hidden hover:border-toyota-red/50 hover:bg-white/[0.06] hover:shadow-xl hover:shadow-toyota-red/15"
            >
              {/* Corner brackets */}
              <span className="pointer-events-none absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 border-toyota-red/50 rounded-tl-2xl" />
              <span className="pointer-events-none absolute top-0 right-0 w-5 h-5 border-t-2 border-r-2 border-toyota-red/50 rounded-tr-2xl" />

              <div className="relative z-10 flex items-start gap-4">
                <motion.div
                  className="w-12 h-12 bg-toyota-red/15 border border-toyota-red/30 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:bg-toyota-red/25 transition-colors"
                  whileHover={{ rotate: [0, -10, 10, 0], scale: 1.1 }}
                  transition={{ duration: 0.5 }}
                >
                  <b.icon className="w-6 h-6 text-toyota-red" strokeWidth={2} />
                </motion.div>
                <div>
                  <h3 className="font-tajawal font-black text-white text-base mb-1">{b.name}</h3>
                  <p className="font-tajawal text-sm text-soft mt-1.5 font-medium">{b.detail}</p>
                  <motion.a
                    href={b.mapUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 font-tajawal text-sm font-black text-toyota-red hover:text-toyota-red/80 transition-colors"
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
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="relative bg-gradient-to-br from-toyota-red/25 to-toyota-red/10 border border-toyota-red/40 rounded-2xl p-6 flex items-center gap-4 overflow-hidden group shadow-lg shadow-toyota-red/20"
          >
            <motion.div
              className="absolute inset-0 bg-toyota-red/10 rounded-2xl"
              animate={{ opacity: [0, 0.5, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
            />
            <div className="relative z-10 flex items-center gap-4">
              <motion.div
                className="w-12 h-12 bg-toyota-red/40 border border-toyota-red/60 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-toyota-red/30"
                animate={{ y: [0, -3, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Truck className="w-6 h-6 text-white" strokeWidth={2.5} />
              </motion.div>
              <div>
                <h3 className="font-tajawal font-black text-white text-base mb-1">توصيل سريع لجميع المحافظات</h3>
                <p className="font-tajawal text-sm text-white/75 font-medium">تسليم خلال 48 ساعة داخل مصر</p>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default DistributionNetwork;
