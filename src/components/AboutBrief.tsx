import { motion } from "framer-motion";
import { ArrowLeft, Calendar, Users, Truck, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const metrics = [
  { icon: Calendar, value: "+25", label: "سنة خبرة في سوق قطع غيار تويوتا" },
  { icon: Users, value: "+2000", label: "عميل نشط" },
  { icon: Truck, value: "27", label: "شحن لجميع محافظات مصر" },
  { icon: Globe, value: "مصر ودبي", label: "تواجد داخل وخارج مصر" },
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
            من نحن – المصرية جروب لتوزيع قطع غيار تويوتا الأصلية في مصر
          </h2>
          <div className="h-0.5 w-16 bg-primary mx-auto rounded-full" />
        </div>

        <div className="max-w-3xl mx-auto text-center mb-14">
          <p className="text-muted-foreground text-base md:text-lg leading-[2] mb-4">
            المصرية جروب هي موزع معتمد لقطع غيار تويوتا الأصلية وزيوت تويوتا الأصلية في مصر، وتعمل منذ عام 1999 في مجال توزيع قطع غيار تويوتا وخدمة تجار الجملة والشركات ومراكز الصيانة في مختلف المحافظات.
          </p>
          <p className="text-muted-foreground text-base md:text-lg leading-[2] mb-4">
            تتخصص المجموعة في توفير قطع غيار تويوتا الأصلية بالإضافة إلى استيراد ماركات يابانية عالية الجودة تضاهي المواصفات الأصلية، من خلال منظومة توزيع منظمة تضمن استقرار الإمداد وسرعة الشحن لجميع المحافظات.
          </p>
          <p className="text-muted-foreground text-base md:text-lg leading-[2] mb-8">
            تعتمد المصرية جروب على شبكة فروع وانتشار جغرافي فعّال داخل مصر، مع قدرة تشغيلية تدعم تلبية احتياجات السوق باحترافية وانضباط.
          </p>
          <Button variant="outline" size="lg" className="gap-2 font-bold" asChild>
            <Link to="/what-sets-us-apart">
              المزيد عن المجموعة
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
        </div>

        {/* Metrics Grid */}
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
