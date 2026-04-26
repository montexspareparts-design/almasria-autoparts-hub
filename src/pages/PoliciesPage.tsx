import SEOHead from "@/components/SEOHead";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Truck, RotateCcw, FileText } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import PrivacyPolicy from "@/components/policies/PrivacyPolicy";
import DeliveryPolicy from "@/components/policies/DeliveryPolicy";
import RefundPolicy from "@/components/policies/RefundPolicy";
import TermsAndConditions from "@/components/policies/TermsAndConditions";

const PoliciesPage = () => {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "privacy";

  return (
    <>
      <SEOHead
        titleAr="السياسات والشروط — الخصوصية والشحن والاسترجاع"
        titleEn="Policies — Terms, Privacy, Shipping & Returns"
        descriptionAr="سياسة الخصوصية والشروط والأحكام وسياسة الشحن والتوصيل وسياسة الإرجاع والاسترداد — المصرية جروب لقطع غيار تويوتا الأصلية."
        descriptionEn="Privacy policy, terms & conditions, shipping & delivery policy, and refund/return policy — Al Masria Group Toyota genuine parts."
        breadcrumbs={[
          { ar: "الرئيسية", en: "Home", url: "/" },
          { ar: "السياسات", en: "Policies", url: "/policies" },
        ]}
      />
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-black text-foreground text-center mb-10">
            السياسات <span className="text-primary">والشروط</span>
          </h1>

          <Tabs defaultValue={defaultTab} className="max-w-4xl mx-auto" dir="rtl">
            <TabsList className="grid w-full grid-cols-4 mb-8 h-auto">
              <TabsTrigger value="terms" className="flex items-center gap-2 py-3 text-xs sm:text-sm">
                <FileText className="w-4 h-4" />
                <span className="hidden sm:inline">الشروط والأحكام</span>
                <span className="sm:hidden">الشروط</span>
              </TabsTrigger>
              <TabsTrigger value="privacy" className="flex items-center gap-2 py-3 text-xs sm:text-sm">
                <Shield className="w-4 h-4" />
                <span className="hidden sm:inline">سياسة الخصوصية</span>
                <span className="sm:hidden">الخصوصية</span>
              </TabsTrigger>
              <TabsTrigger value="delivery" className="flex items-center gap-2 py-3 text-xs sm:text-sm">
                <Truck className="w-4 h-4" />
                <span className="hidden sm:inline">الشحن والتوصيل</span>
                <span className="sm:hidden">الشحن</span>
              </TabsTrigger>
              <TabsTrigger value="refund" className="flex items-center gap-2 py-3 text-xs sm:text-sm">
                <RotateCcw className="w-4 h-4" />
                <span className="hidden sm:inline">الإرجاع والاسترداد</span>
                <span className="sm:hidden">الإرجاع</span>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="terms"><TermsAndConditions /></TabsContent>
            <TabsContent value="privacy"><PrivacyPolicy /></TabsContent>
            <TabsContent value="delivery"><DeliveryPolicy /></TabsContent>
            <TabsContent value="refund"><RefundPolicy /></TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default PoliciesPage;
