import { Award, Users, Truck, MapPin } from "lucide-react";
import { Link } from "react-router-dom";

const metrics = [
  {
    icon: Award,
    value: "+25 سنة",
    title: "خبرة",
    desc: "خبرة ممتدة في توزيع قطع الغيار والزيوت منذ 1999.",
  },
  {
    icon: Users,
    value: "+2000",
    title: "عميل نشط",
    desc: "شبكة توزيع واسعة على مستوى الجمهورية.",
  },
  {
    icon: Truck,
    value: "48 ساعة",
    title: "زمن التسليم",
    desc: "توصيل سريع عبر منظومة لوجستية منظمة.",
  },
  {
    icon: MapPin,
    value: "مصر + دبي",
    title: "انتشار إقليمي",
    desc: "تواجد داخل مصر، ودعم توريد من مكتب دبي.",
  },
];

const KeyMetrics = () => {
  return (
    <section className="py-20 md:py-28 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-black text-foreground">
            أرقام تَمنح <span className="text-primary">الثقة</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 max-w-5xl mx-auto">
          {metrics.map((m) => (
            <Link
              key={m.title}
              to="/why-us"
              className="group flex flex-col items-center text-center border border-border rounded-xl px-6 py-7 bg-card hover:border-primary/30 transition-colors max-w-[260px] mx-auto w-full"
            >
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary/15 transition-colors">
                <m.icon className="w-6 h-6 text-primary" strokeWidth={1.8} />
              </div>
              <p className="text-2xl md:text-3xl font-black text-foreground leading-none mb-2">
                {m.value}
              </p>
              <p className="text-sm font-bold text-foreground mb-1">{m.title}</p>
              <p className="text-xs text-muted-foreground leading-[1.7]">{m.desc}</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

export default KeyMetrics;
