import { Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

const ContactSimple = () => {
  return (
    <section className="py-16 md:py-20 bg-secondary">
      <div className="container mx-auto px-4 max-w-3xl text-center">
        <h2 className="text-2xl md:text-3xl font-black text-secondary-foreground mb-4">
          ابدأ شراكتك مع المصرية جروب
        </h2>
        <p className="text-secondary-foreground/50 mb-8 leading-[1.9]">
          سواء كنت تاجر جملة أو شركة أو مركز صيانة، فريقنا جاهز لتقديم عرض توريد مخصص لاحتياجاتك.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button size="lg" className="text-base px-8 py-6 font-bold" asChild>
            <Link to="/contact#quote">
              اطلب عرض سعر
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            className="text-base px-8 py-6 gap-2.5 font-bold border-secondary-foreground/15 text-secondary-foreground hover:bg-secondary-foreground/10"
            asChild
          >
            <Link to="/contact">
              <Phone className="w-5 h-5" />
              تواصل مع فريق المبيعات
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ContactSimple;
