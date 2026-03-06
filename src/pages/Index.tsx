import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import AboutSection from "@/components/AboutSection";
import ProductsSection from "@/components/ProductsSection";
import WhyUsSection from "@/components/WhyUsSection";
import PartnershipsSection from "@/components/PartnershipsSection";
import ContactSection from "@/components/ContactSection";
import Footer from "@/components/Footer";
import WhatsAppFloat from "@/components/WhatsAppFloat";
import AIChatBot from "@/components/AIChatBot";

const Index = () => {
  return (
    <div className="min-h-screen">
      <Navbar />
      <HeroSection />
      <AboutSection />
      <ProductsSection />
      <WhyUsSection />
      <PartnershipsSection />
      <ContactSection />
      <Footer />
      <WhatsAppFloat />
      <AIChatBot />
    </div>
  );
};

export default Index;
