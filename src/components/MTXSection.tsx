import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const MTXSection = () => {
  return (
    <section id="mtx" className="py-20 md:py-28 bg-background">
      <div className="container mx-auto px-4 max-w-3xl text-center">
        <span className="inline-block px-4 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-bold mb-4">
          علامتنا الخاصة
        </span>
        <h2 className="text-3xl md:text-4xl font-black text-foreground mb-4">
          MTX — علامتنا بجودة تضاهي المواصفات الأصلية
        </h2>
        <p className="text-muted-foreground text-base md:text-lg leading-[2] mb-8 max-w-2xl mx-auto">
          من خلال علامة MTX، نوفر ماركات يابانية مختارة بعناية تضاهي جودة المنتج الأصلي بأسعار تنافسية، لتلبية احتياجات قطاع ما بعد البيع في مصر والمنطقة.
        </p>
        <Button size="lg" className="gap-2 font-bold" asChild>
          <Link to="/mtx">
            اكتشف MTX
            <ArrowLeft className="w-4 h-4" />
          </Link>
        </Button>
      </div>
    </section>
  );
};

export default MTXSection;
