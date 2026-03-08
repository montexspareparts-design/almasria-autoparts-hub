import { Building2, Truck, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const segments = [
  {
    icon: Truck,
    title: "تجار الجملة",
    desc: "إمداد مستمر بالكميات المطلوبة وأسعار تنافسية لتجار الجملة في جميع المحافظات.",
  },
  {
    icon: Building2,
    title: "الشركات والهيئات",
    desc: "عقود توريد مؤسسية مع التزام بالمواعيد واستقرار الإمداد لأساطيل الشركات والهيئات الحكومية.",
  },
  {
    icon: Wrench,
    title: "القطاعي ومراكز الخدمة",
    desc: "توفير قطع غيار تويوتا الأصلية وبدائل MTX عالية الجودة لمراكز الصيانة والعملاء الأفراد.",
  },
];

const WhoWeServe = () => {
  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-14">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-4">
            شرائح العملاء
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
            من <span className="text-primary">نخدم؟</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto mb-10">
          {segments.map((s) => (
            <div
              key={s.title}
              className="bg-card border border-border rounded-xl p-8 text-center"
            >
              <div className="w-14 h-14 bg-primary/10 rounded-xl flex items-center justify-center mx-auto mb-5">
                <s.icon className="w-7 h-7 text-primary" strokeWidth={1.8} />
              </div>
              <h3 className="text-lg font-bold text-foreground mb-2">{s.title}</h3>
              <p className="text-muted-foreground text-sm leading-[1.8]">{s.desc}</p>
            </div>
          ))}
        </div>

        <div className="text-center">
          <Button size="lg" className="gap-2 font-bold" asChild>
            <Link to="/contact#quote">
              اطلب عرض توريد
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default WhoWeServe;
