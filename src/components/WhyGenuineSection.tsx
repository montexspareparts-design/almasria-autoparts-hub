import { ShieldCheck, Award, Gauge } from "lucide-react";
import { Link } from "react-router-dom";

const BENEFITS = [
  {
    icon: ShieldCheck,
    title: "أمان مطلق",
    desc: "كل قطعة مُختبَرة وفق معايير تويوتا اليابانية الصارمة لحماية محرّك سيارتك.",
  },
  {
    icon: Award,
    title: "ضمان وكالة",
    desc: "ضمان رسمي معتمد من تويوتا على كل قطعة أصلية، مع رقم مرجعي وعلامة هولوجرام.",
  },
  {
    icon: Gauge,
    title: "كفاءة قصوى",
    desc: "أداء مطابق للمصنع، استهلاك وقود أقل، وعمر افتراضي أطول للقطعة وللسيارة.",
  },
];

const WhyGenuineSection = () => {
  return (
    <section className="relative bg-carbon py-20 md:py-28 overflow-hidden">
      {/* Toyota watermark */}
      <div
        aria-hidden
        className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]"
      >
        <div
          className="font-display font-black tracking-tighter text-white"
          style={{ fontSize: "clamp(120px, 22vw, 360px)", letterSpacing: "-0.05em" }}
        >
          TOYOTA
        </div>
      </div>

      {/* Top divider */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-toyota-red/40 to-transparent" />

      <div className="relative container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* LEFT — Big statement */}
          <div className="text-center lg:text-right">
            <div className="inline-block px-3 py-1 rounded-full border border-toyota-red/30 bg-toyota-red/5 mb-6">
              <span className="text-toyota-red font-tajawal font-bold text-xs tracking-wider">
                لماذا الأصلي؟
              </span>
            </div>
            <h2
              className="font-tajawal font-black text-white leading-[1.1]"
              style={{ fontSize: "clamp(36px, 5vw, 64px)" }}
            >
              الأصلي <span className="text-toyota-red">يدوم.</span>
              <br />
              الرخيص <span className="text-gold">يكلِّف.</span>
            </h2>
            <div className="flex items-center gap-3 justify-center lg:justify-start my-6">
              <span className="h-[2px] w-16 bg-toyota-red" />
              <span className="w-2 h-2 rounded-full bg-toyota-red shadow-red-glow" />
            </div>
            <p className="font-tajawal text-soft text-lg md:text-xl leading-relaxed max-w-xl mx-auto lg:mx-0">
              قطعة غيار واحدة غير أصلية ممكن تكلّفك المحرك كله. عند المصرية جروب،
              كل قطعة بتطلبها هي قطعة تويوتا الأصلية — بضمان الوكالة وضمان راحة بالك.
            </p>
            <Link
              to="/products/genuine-toyota-parts"
              className="inline-flex items-center gap-2 mt-8 px-7 py-3.5 rounded-full bg-white text-carbon font-tajawal font-black hover:bg-toyota-red hover:text-white transition-colors"
            >
              تعرّف على ضمان الأصالة ←
            </Link>
          </div>

          {/* RIGHT — Benefits cards */}
          <div className="space-y-4">
            {BENEFITS.map((b) => {
              const Icon = b.icon;
              return (
                <div
                  key={b.title}
                  className="group relative bg-surface border border-white/10 rounded-2xl p-6 md:p-7 hover:border-toyota-red/50 transition-all duration-300 hover:-translate-y-1"
                >
                  <div className="absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ boxShadow: "0 0 60px hsl(var(--toyota-red) / 0.15) inset" }}
                  />
                  <div className="relative flex items-start gap-4 md:gap-5">
                    <div className="shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-xl bg-toyota-red/10 border border-toyota-red/30 flex items-center justify-center">
                      <Icon className="w-6 h-6 md:w-7 md:h-7 text-toyota-red" strokeWidth={2.2} />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-tajawal font-black text-white text-xl md:text-2xl mb-1.5">
                        {b.title}
                      </h3>
                      <p className="font-tajawal text-soft text-sm md:text-base leading-relaxed">
                        {b.desc}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};

export default WhyGenuineSection;
