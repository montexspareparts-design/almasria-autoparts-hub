import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import brandGenuineParts from "@/assets/brand-genuine-parts.webp";
import brandToyotaOil from "@/assets/brand-toyota-oil.webp";
import brandMtx from "@/assets/brand-mtx.webp";
import brandDenso from "@/assets/brand-denso.webp";
import brandAisin from "@/assets/brand-aisin.webp";

const brands = [
  { label: "Toyota Genuine Parts", labelAr: "قطع غيار تويوتا", labelEn: "Toyota Genuine Parts", image: brandGenuineParts, to: "/products/toyota-genuine", scale: "scale-100" },
  { label: "Toyota Genuine Lubricants", labelAr: "زيوت تويوتا", labelEn: "Toyota Oils", image: brandToyotaOil, to: "/products/toyota-oils", scale: "scale-150" },
  { label: "MTX Aftermarket", labelAr: "MTX Aftermarket", labelEn: "MTX Aftermarket", image: brandMtx, to: "/mtx", scale: "scale-150" },
  { label: "DENSO", labelAr: "DENSO", labelEn: "DENSO", image: brandDenso, to: "/products/denso", scale: "scale-100" },
  { label: "AISIN", labelAr: "AISIN", labelEn: "AISIN", image: brandAisin, to: "/products/aisin", scale: "scale-100" },
];

const BrandsWeDistribute = () => {
  const { t, isAr } = useLanguage();
  const Arrow = isAr ? ChevronLeft : ChevronRight;

  return (
    <section id="brands" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }} className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-4">{t("brands.badge")}</span>
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
            {t("brands.title")} <span className="text-primary">{t("brands.title_highlight")}</span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 sm:gap-6 max-w-4xl mx-auto">
          {brands.map((b, i) => (
            <motion.div key={b.label} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.08, duration: 0.4 }} className="flex flex-col items-center gap-3 w-full">
              <Link to={b.to} className="bg-white rounded-xl aspect-[4/3] w-full flex items-center justify-center border border-border hover:border-primary/40 transition-all duration-300 overflow-hidden group">
                <img src={b.image} alt={b.label} loading="lazy" decoding="async" className={`w-[80%] h-[80%] object-contain ${b.scale} transition-transform duration-300 group-hover:scale-105`} />
              </Link>
              <Link to={b.to} className="inline-flex items-center gap-1 text-muted-foreground text-sm hover:text-primary transition-colors group">
                {isAr ? b.labelAr : b.labelEn}
                <Arrow className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default BrandsWeDistribute;
