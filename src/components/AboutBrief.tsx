import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const AboutBrief = () => {
  return (
    <section id="about" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <span
            className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-5"
            aria-label="تعرف على المصرية جروب"
          >
            تعرّف علينا
          </span>
          <h2 className="text-3xl md:text-4xl font-black text-foreground mb-3">
            من نحن — منصة توزيع مؤسسية مُعتمدة
          </h2>
          <div className="h-0.5 w-16 bg-primary mx-auto rounded-full" />
        </div>

        <div className="max-w-[760px] mx-auto text-center mb-14">
          <p className="text-muted-foreground text-base md:text-lg leading-[1.7] mb-4">
            تعمل المصرية جروب منذ <strong className="text-foreground">1999</strong> كموزّع معتمد لِـ{" "}
            <Link to="/products/toyota-genuine" className="text-primary font-bold hover:underline">قطع غيار تويوتا الأصلية</Link> و<Link to="/products/toyota-oils" className="text-primary font-bold hover:underline">زيوت تويوتا</Link>.
            نعتمد نموذج تشغيل منضبط قائم على <strong className="text-foreground">أنظمة إدارة رقمية متكاملة</strong> وشبكة توزيع تغطي الجمهورية وتخدم{" "}
            <strong className="text-foreground">أكثر من 2000 عميل</strong>. نوفر <strong className="text-foreground">توصيلًا سريعًا خلال 48&nbsp;ساعة</strong> عبر مخازن مركزية عالية الكفاءة، مع{" "}
            <strong className="text-foreground">وجود إقليمي في دبي</strong> يدعم استمرارية التوريد وجودة المنتجات.
          </p>
          <p className="text-muted-foreground text-base md:text-lg leading-[1.7] mb-8">
            كما ندير علامة <Link to="/mtx" className="text-primary font-bold hover:underline">MTX</Link> لقطع الغيار البديلة بجودة تضاهي المواصفات الأصلية.
          </p>
          <Button variant="outline" size="lg" className="gap-2 font-bold" asChild>
            <Link to="/about">
              قراءة المزيد
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </Button>
        </div>

      </div>
    </section>
  );
};

export default AboutBrief;
