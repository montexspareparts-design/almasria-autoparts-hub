import { motion, useInView } from "framer-motion";
import { HelpCircle } from "lucide-react";
import { useRef } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "هل جميع قطع الغيار أصلية؟",
    a: "نعم، جميع قطع الغيار التي نوفرها أصلية ١٠٠٪ من تويوتا مباشرة. نحن موزع معتمد رسمي ونوفر ضمان على جميع المنتجات.",
  },
  {
    q: "ما هي مناطق التوصيل المتاحة؟",
    a: "نوفر خدمة التوصيل لجميع محافظات مصر من خلال ٥ فروع منتشرة في أنحاء الجمهورية. التوصيل يتم خلال ٢٤-٧٢ ساعة حسب المنطقة.",
  },
  {
    q: "كيف أسجل كتاجر أو موزع؟",
    a: "يمكنك التقديم من خلال صفحة تسجيل التجار على الموقع. ستحتاج لتقديم السجل التجاري والبطاقة الضريبية. يتم مراجعة الطلب خلال ٤٨ ساعة.",
  },
  {
    q: "هل يوجد حد أدنى للطلب؟",
    a: "الحد الأدنى يختلف حسب فئة العميل. للتجار والموزعين يوجد حد أدنى يتم تحديده عند فتح الحساب. للعملاء العاديين لا يوجد حد أدنى.",
  },
  {
    q: "ما هي طرق الدفع المتاحة؟",
    a: "نقبل الدفع نقدًا عند الاستلام، التحويل البنكي، وفودافون كاش. للتجار المعتمدين نوفر نظام الائتمان بحسب الاتفاق.",
  },
  {
    q: "هل يمكن إرجاع أو استبدال المنتجات؟",
    a: "نعم، نوفر سياسة إرجاع واستبدال خلال ١٤ يوم من تاريخ الشراء بشرط أن يكون المنتج في حالته الأصلية مع الفاتورة.",
  },
];

const FAQSection = () => {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section ref={ref} className="py-20 bg-background">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
        >
          <span className="inline-flex items-center gap-2 bg-primary/10 text-primary rounded-full px-4 py-1.5 text-sm font-semibold mb-4">
            <HelpCircle className="w-4 h-4" />
            أسئلة شائعة
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
            كل ما تحتاج <span className="text-gradient-red">معرفته</span>
          </h2>
          <p className="text-muted-foreground max-w-xl mx-auto">
            إجابات على أكثر الأسئلة شيوعًا من عملائنا
          </p>
        </motion.div>

        {/* Accordion */}
        <motion.div
          className="max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="bg-card border border-border rounded-xl px-6 data-[state=open]:shadow-md data-[state=open]:border-primary/30 transition-all duration-300"
              >
                <AccordionTrigger className="text-base font-bold text-foreground hover:text-primary hover:no-underline py-5">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-5">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};

export default FAQSection;
