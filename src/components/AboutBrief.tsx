import { ArrowLeft, Calendar, Users, Truck, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const metrics = [
  { icon: Calendar, value: "+25", label: "سنة خبرة" },
  { icon: Users, value: "+2000", label: "عميل نشط" },
  { icon: Truck, value: "48 ساعة", label: "تسليم سريع" },
  { icon: Globe, value: "مصر والإمارات", label: "تواجد إقليمي" },
];

const AboutBrief = () => {
  return (
    <section id="about" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-4">
            تعرّف علينا
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
            من نحن — منصة توزيع مؤسسية مُعتمدة
          </h2>
          <div className="h-0.5 w-16 bg-primary mx-auto rounded-full" />
        </div>

        <div className="max-w-3xl mx-auto text-center mb-14">
          <p className="text-muted-foreground text-base md:text-lg leading-[2] mb-8">
            المصرية جروب مجموعة توزيع رائدة تعمل منذ عام 1999 في سوق قطع الغيار والزيوت، كموزع معتمد لقطع غيار تويوتا الأصلية والزيوت. ننتهج نموذج تشغيل مُنضبط قائم على أنظمة ERP، وشبكة توزيع واسعة تخدم أكثر من 2000 عميل على مستوى الجمهورية، مع قدرة تسليم خلال 48 ساعة ووجود إقليمي عبر مكتب دبي.
          </p>
          <Button variant="outline" size="lg" className="gap-2 font-bold" asChild>
            <Link to="/what-sets-us-apart">
              قراءة المزيد
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
          {metrics.map((m) => (
            <div
              key={m.label}
              className="flex flex-col items-center text-center gap-3 border border-border rounded-xl px-4 py-6 bg-card"
            >
              <m.icon className="w-6 h-6 text-primary" strokeWidth={1.8} />
              <div className="text-2xl md:text-3xl font-black text-foreground leading-none">{m.value}</div>
              <div className="text-sm text-muted-foreground">{m.label}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AboutBrief;
