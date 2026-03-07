import { motion } from "framer-motion";
import { Phone } from "lucide-react";
import logo from "@/assets/logo.png";

const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 25 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

const Footer = () => {
  return (
    <footer className="bg-secondary text-secondary-foreground py-12 pb-24 md:pb-12 border-t border-primary/20 overflow-hidden">
      <div className="container mx-auto px-4">
        <motion.div
          className="grid md:grid-cols-4 gap-8 mb-8"
          variants={staggerContainer}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
        >
          <motion.div variants={fadeUp}>
            <motion.img
              src={logo}
              alt="المصرية جروب"
              className="h-16 mb-3"
              whileHover={{ scale: 1.05 }}
              transition={{ type: "spring", stiffness: 200 }}
            />
            <p className="text-secondary-foreground/60 text-sm leading-relaxed">
              موزع معتمد رسمي لقطع غيار وزيوت تويوتا الأصلية في مصر. خبرة أكثر من 25 عامًا في سوق قطع غيار السيارات.
            </p>
          </motion.div>

          <motion.div variants={fadeUp}>
            <h4 className="font-bold mb-3">روابط سريعة</h4>
            <ul className="space-y-2 text-sm text-secondary-foreground/60">
              {[
                { label: "الرئيسية", href: "#hero" },
                { label: "من نحن", href: "#about" },
                { label: "المنتجات", href: "#products" },
                { label: "تواصل معنا", href: "#contact" },
              ].map((l, i) => (
                <motion.li
                  key={l.href}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  <a href={l.href} className="hover:text-primary transition-colors relative group inline-block">
                    {l.label}
                    <span className="absolute bottom-0 right-0 w-0 h-[1px] bg-primary transition-all duration-300 group-hover:w-full" />
                  </a>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          <motion.div variants={fadeUp}>
            <h4 className="font-bold mb-3">فروعنا – مصر 🇪🇬</h4>
            <ul className="space-y-2 text-sm text-secondary-foreground/60">
              {["القاهرة – التوفيقية", "الجيزة – أوسيم", "الأقصر – صعيد مصر", "المكتب الإداري – اللبيني، الهرم"].map((branch, i) => (
                <motion.li
                  key={branch}
                  className="flex items-center gap-2"
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.05 }}
                >
                  {branch}
                </motion.li>
              ))}
            </ul>
            <div className="mt-2 text-sm text-secondary-foreground/60">
              <div className="flex items-center gap-1">
                <Phone className="w-3 h-3 text-primary" />
                <a href="tel:01032104861" className="hover:text-primary transition-colors">01032104861</a>
              </div>
            </div>
          </motion.div>

          <motion.div variants={fadeUp}>
            <h4 className="font-bold mb-3">فرعنا – دبي 🇦🇪</h4>
            <motion.div
              className="bg-secondary-foreground/10 rounded-lg p-4 border border-primary/20"
              whileHover={{ borderColor: "hsl(355 90% 48% / 0.5)", scale: 1.02 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-sm text-secondary-foreground/80 font-semibold mb-1">المصرية جروب – الإمارات</div>
              <p className="text-xs text-secondary-foreground/60 leading-relaxed">
                مركز إقليمي لدعم التوسع في أسواق الخليج العربي. نوفر خدمات التوزيع والتوريد لعملائنا في المنطقة.
              </p>
            </motion.div>
            <div className="mt-4">
              <h4 className="font-bold mb-2 text-sm">تواصل معنا</h4>
              <ul className="space-y-1 text-sm text-secondary-foreground/60">
                <li>info@almasriaautoparts.com</li>
                <li>مواعيد العمل: 9 ص – 7 م</li>
              </ul>
            </div>
          </motion.div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scaleX: 0 }}
          whileInView={{ opacity: 1, scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
          className="border-t border-secondary-foreground/10 pt-6 text-center text-sm text-secondary-foreground/40"
        >
          © {new Date().getFullYear()} المصرية جروب – Al Masria Group. جميع الحقوق محفوظة.
        </motion.div>
      </div>
    </footer>
  );
};

export default Footer;
