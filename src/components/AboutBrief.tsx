import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const AboutBrief = () => {
  return (
    <section id="about" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-4">
            تعرّف علينا
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
            من <span className="text-primary">نحن</span>
          </h2>
          <motion.div
            initial={{ width: 0 }}
            whileInView={{ width: "4rem" }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="h-0.5 bg-primary mx-auto rounded-full"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="max-w-3xl mx-auto text-center"
        >
          <p className="text-muted-foreground text-base md:text-lg leading-[2] mb-4">
            المصرية جروب هي كيان متخصص في قطع غيار تويوتا الأصلية وزيوت تويوتا الأصلية، بالإضافة إلى MTX متخصصة في استيراد الماركات اليابانية مختارة تضاهي جودة المنتج الأصلي.
          </p>
          <p className="text-muted-foreground text-base md:text-lg leading-[2] mb-8">
            تعمل المجموعة وفق منظومة تشغيلية منظمة تخدم تجار الجملة، الشركات والهيئات، ومراكز الصيانة، من خلال شبكة توزيع تغطي جميع محافظات الجمهورية مع التزام كامل بمعايير الجودة والانضباط السوقي.
          </p>
          <Button variant="outline" size="lg" className="gap-2 font-bold" asChild>
            <Link to="/what-sets-us-apart">
              اعرف أكثر
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default AboutBrief;
