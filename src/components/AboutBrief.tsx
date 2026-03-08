import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

const AboutBrief = () => {
  return (
    <section id="about" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-10"
        >
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-4"
          >
            تعرّف علينا
          </motion.span>
          <h2 className="text-3xl md:text-5xl font-black text-foreground mb-4">
            من <span className="text-gradient-red">نحن</span>
          </h2>
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: "5rem" }}
            viewport={{ once: true }}
            transition={{ duration: 0.8, delay: 0.3 }}
            className="h-1 bg-primary mx-auto rounded-full"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
          className="max-w-3xl mx-auto text-center"
        >
          <p className="text-muted-foreground text-base md:text-lg leading-[2] mb-8">
            المصرية جروب هي مجموعة توزيع سيارات رائدة تعمل منذ أكثر من 25 عامًا، وتقدم قطع غيار تويوتا الأصلية والزيوت المعتمدة ومنتجات MTX الأفترماركت بجودة موثوقة.
          </p>
          <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}>
            <Button variant="outline" size="lg" className="gap-2 font-bold" asChild>
              <a href="#why-us">
                اعرف أكثر
                <ArrowLeft className="w-4 h-4" />
              </a>
            </Button>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutBrief;
