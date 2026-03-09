import { createContext, useContext, useState, useEffect, ReactNode } from "react";

type Lang = "ar" | "en";

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: string) => string;
  dir: "rtl" | "ltr";
  isAr: boolean;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export const useLanguage = () => {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
};

/* ── Translations ── */
const translations: Record<Lang, Record<string, string>> = {
  ar: {
    // Navbar
    "nav.home": "الرئيسية",
    "nav.about": "من نحن",
    "nav.genuine_parts": "قطع غيار أصلية",
    "nav.toyota_oils": "زيوت تويوتا أصلية",
    "nav.mtx": "قطع غيار MTX",
    "nav.contact": "اتصل بنا",
    "nav.catalogs": "كشوفات المصرية",
    "nav.login": "تسجيل الدخول",
    "nav.register_dealer": "التسجيل كـ تاجر",
    "nav.dealer_account": "حساب التاجر",
    "nav.admin": "الإدارة",
    "nav.logout": "تسجيل الخروج",
    "nav.install_app": "حمّل التطبيق",

    // Hero
    "hero.badge": "موزّع معتمد — تويوتا",
    "hero.title1": "المصرية جروب",
    "hero.title2": "موزع معتمد لقطع\u00A0غيار",
    "hero.title3": "تويوتا\u00A0الأصلية",
    "hero.title4": "في\u00A0مصر",
    "hero.desc": "خبرة تتجاوز <strong>25 عامًا</strong> في التوزيع المؤسسي، شبكة تغطي جميع المحافظات مع تسليم خلال <strong>48\u00A0ساعة</strong>، وعلامتنا <strong>MTX</strong> بجودة تضاهي المواصفات\u00A0الأصلية.",
    "hero.browse_products": "تصفّح المنتجات",
    "hero.our_branches": "فروعنا وانتشارنا",
    "hero.stat_years": "سنة خبرة",
    "hero.stat_delivery": "تسليم سريع",
    "hero.stat_parts": "قطعة متوفرة",

    // About Brief
    "about.header": "المصرية — أكثر من 25 عامًا في خدمة عملاء",
    "about.header_highlight": "تويوتا",
    "about.sub": "موزع معتمد رسمي لقطع الغيار والزيوت الأصلية منذ 1999",
    "about.highlight1": "موزع معتمد رسمي",
    "about.highlight1_desc": "قنوات توريد مباشرة من تويوتا",
    "about.highlight2": "تسليم 48 ساعة",
    "about.highlight2_desc": "شحن سريع لجميع المحافظات",
    "about.highlight3": "+2,000 عميل",
    "about.highlight3_desc": "تجار وشركات وأساطيل",
    "about.highlight4": "وجود إقليمي",
    "about.highlight4_desc": "مكتب دبي لدعم التوريد",
    "about.discover": "اكتشف قصتنا",
    "about.what_sets_us_apart": "ما يميزنا",
    "about.metric_years": "سنة خبرة",
    "about.metric_years_desc": "منذ 1999",
    "about.metric_clients": "عميل نشط",
    "about.metric_clients_desc": "في كل المحافظات",
    "about.metric_parts": "قطعة متوفرة",
    "about.metric_parts_desc": "بالمخازن",
    "about.metric_branches": "فروع رئيسية",
    "about.metric_branches_desc": "مصر + دبي",

    // Footer
    "footer.desc": "موزع معتمد رسمي لقطع غيار وزيوت تويوتا الأصلية في مصر منذ أكثر من 25 عامًا.",
    "footer.quick_links": "روابط سريعة",
    "footer.home": "الرئيسية",
    "footer.about": "من نحن",
    "footer.products": "المتجر",
    "footer.what_sets_us_apart": "ما يميزنا",
    "footer.contact": "اتصل بنا",
    "footer.install_app": "حمّل التطبيق",
    "footer.contact_us": "تواصل معنا",
    "footer.whatsapp": "واتساب",
    "footer.address": "التوفيقية — القاهرة، مصر",
    "footer.copyright": "المصرية جروب — جميع الحقوق محفوظة",

    // Contact Page
    "contact.title": "تواصل",
    "contact.title_highlight": "معنا",
    "contact.subtitle": "فريقنا جاهز لخدمتك والرد على جميع استفساراتك حول قطع غيار تويوتا الأصلية والزيوت",
    "contact.info_title": "معلومات التواصل",
    "contact.phone": "الهاتف",
    "contact.email": "البريد الإلكتروني",
    "contact.whatsapp": "واتساب",
    "contact.whatsapp_desc": "تواصل فوري على مدار الساعة",
    "contact.hours": "ساعات العمل",
    "contact.hours_desc": "السبت – الخميس: 9 صباحًا – 6 مساءً",
    "contact.form_title": "أرسل لنا رسالة",
    "contact.name": "الاسم *",
    "contact.name_placeholder": "الاسم بالكامل",
    "contact.phone_label": "رقم الهاتف *",
    "contact.email_label": "البريد الإلكتروني",
    "contact.message": "الرسالة *",
    "contact.message_placeholder": "اكتب رسالتك هنا...",
    "contact.send": "إرسال الرسالة",
    "contact.sending": "جارِ الإرسال...",
    "contact.success": "تم إرسال رسالتك بنجاح! سنتواصل معك قريبًا.",
    "contact.error": "يرجى ملء الحقول المطلوبة",
    "contact.locations": "مواقعنا",
    "contact.visit_branch": "زُر أقرب",
    "contact.visit_branch_highlight": "فرع",
    "contact.map_hint": "اضغط على الفرع لفتح الموقع مباشرة على خرائط جوجل",
    "contact.open_maps": "افتح على خرائط جوجل",

    // About Page
    "aboutpage.hero_title": "من نحن — منصة توزيع مؤسسية مُعتمدة",
    "aboutpage.hero_desc": "منذ 1999، نعمل كموزع معتمد لقطع غيار وزيوت تويوتا الأصلية عبر شبكة توزيع منظمة تغطي مصر، مع وجود إقليمي في دبي، وتشغيل مدعوم بأنظمة إدارة رقمية لضمان الجودة والشفافية.",
    "aboutpage.contact_sales": "تواصل مع فريق المبيعات",
    "aboutpage.who_we_are": "من نحن",
    "aboutpage.mission": "رسالتنا",
    "aboutpage.vision": "رؤيتنا",
    "aboutpage.values": "قيمنا",
    "aboutpage.why_us": "لماذا المصرية جروب؟",
    "aboutpage.read_more": "اقرأ التفاصيل",
    "aboutpage.coverage": "انتشارنا وفروعنا",
    "aboutpage.who_we_serve": "من نخدم؟",
    "aboutpage.distribution_sectors": "قطاعات التوزيع",
    "aboutpage.partners": "شركاؤنا واعترافاتنا",
    "aboutpage.start_partnership": "ابدأ شراكتك مع",
    "aboutpage.request_quote": "اطلب عرض سعر",

    // Brands
    "brands.badge": "علاماتنا التجارية",
    "brands.title": "العلامات التي",
    "brands.title_highlight": "نوزعها",
  },
  en: {
    // Navbar
    "nav.home": "Home",
    "nav.about": "About Us",
    "nav.genuine_parts": "Genuine Parts",
    "nav.toyota_oils": "Toyota Oils",
    "nav.mtx": "MTX Parts",
    "nav.contact": "Contact Us",
    "nav.catalogs": "Al Masria Catalogs",
    "nav.login": "Sign In",
    "nav.register_dealer": "Register as Dealer",
    "nav.dealer_account": "Dealer Account",
    "nav.admin": "Admin",
    "nav.logout": "Sign Out",
    "nav.install_app": "Install App",

    // Hero
    "hero.badge": "Authorized Distributor — Toyota",
    "hero.title1": "Al Masria Group",
    "hero.title2": "Authorized Distributor of",
    "hero.title3": "Genuine Toyota\u00A0Parts",
    "hero.title4": "in\u00A0Egypt",
    "hero.desc": "Over <strong>25 years</strong> of institutional distribution, a network covering all governorates with delivery within <strong>48\u00A0hours</strong>, and our <strong>MTX</strong> brand with OEM-matching quality.",
    "hero.browse_products": "Browse Products",
    "hero.our_branches": "Our Branches",
    "hero.stat_years": "Years Experience",
    "hero.stat_delivery": "Fast Delivery",
    "hero.stat_parts": "Parts Available",

    // About Brief
    "about.header": "Al Masria — Over 25 Years Serving",
    "about.header_highlight": "Toyota",
    "about.sub": "Official authorized distributor of genuine parts & oils since 1999",
    "about.highlight1": "Official Distributor",
    "about.highlight1_desc": "Direct supply channels from Toyota",
    "about.highlight2": "48h Delivery",
    "about.highlight2_desc": "Fast shipping to all governorates",
    "about.highlight3": "2,000+ Clients",
    "about.highlight3_desc": "Dealers, companies & fleets",
    "about.highlight4": "Regional Presence",
    "about.highlight4_desc": "Dubai office for supply support",
    "about.discover": "Discover Our Story",
    "about.what_sets_us_apart": "What Sets Us Apart",
    "about.metric_years": "Years Experience",
    "about.metric_years_desc": "Since 1999",
    "about.metric_clients": "Active Clients",
    "about.metric_clients_desc": "All governorates",
    "about.metric_parts": "Parts Available",
    "about.metric_parts_desc": "In stock",
    "about.metric_branches": "Main Branches",
    "about.metric_branches_desc": "Egypt + Dubai",

    // Footer
    "footer.desc": "Official authorized distributor of Toyota genuine parts & oils in Egypt for over 25 years.",
    "footer.quick_links": "Quick Links",
    "footer.home": "Home",
    "footer.about": "About Us",
    "footer.products": "Products",
    "footer.what_sets_us_apart": "What Sets Us Apart",
    "footer.contact": "Contact Us",
    "footer.install_app": "Install App",
    "footer.contact_us": "Contact Us",
    "footer.whatsapp": "WhatsApp",
    "footer.address": "Tawfikiya — Cairo, Egypt",
    "footer.copyright": "Al Masria Group — All Rights Reserved",

    // Contact Page
    "contact.title": "Contact",
    "contact.title_highlight": "Us",
    "contact.subtitle": "Our team is ready to answer all your inquiries about Toyota genuine parts and oils",
    "contact.info_title": "Contact Information",
    "contact.phone": "Phone",
    "contact.email": "Email",
    "contact.whatsapp": "WhatsApp",
    "contact.whatsapp_desc": "Instant communication 24/7",
    "contact.hours": "Working Hours",
    "contact.hours_desc": "Saturday – Thursday: 9 AM – 6 PM",
    "contact.form_title": "Send Us a Message",
    "contact.name": "Name *",
    "contact.name_placeholder": "Full name",
    "contact.phone_label": "Phone Number *",
    "contact.email_label": "Email",
    "contact.message": "Message *",
    "contact.message_placeholder": "Write your message here...",
    "contact.send": "Send Message",
    "contact.sending": "Sending...",
    "contact.success": "Your message was sent successfully! We'll get back to you soon.",
    "contact.error": "Please fill in the required fields",
    "contact.locations": "Our Locations",
    "contact.visit_branch": "Visit Nearest",
    "contact.visit_branch_highlight": "Branch",
    "contact.map_hint": "Click on a branch to open it on Google Maps",
    "contact.open_maps": "Open on Google Maps",

    // About Page
    "aboutpage.hero_title": "About Us — Authorized Institutional Distribution",
    "aboutpage.hero_desc": "Since 1999, we've been an authorized distributor of Toyota genuine parts and oils through an organized distribution network covering Egypt, with a regional presence in Dubai and digitally-powered operations.",
    "aboutpage.contact_sales": "Contact Sales Team",
    "aboutpage.who_we_are": "Who We Are",
    "aboutpage.mission": "Our Mission",
    "aboutpage.vision": "Our Vision",
    "aboutpage.values": "Our Values",
    "aboutpage.why_us": "Why Al Masria Group?",
    "aboutpage.read_more": "Read More",
    "aboutpage.coverage": "Our Coverage & Branches",
    "aboutpage.who_we_serve": "Who We Serve?",
    "aboutpage.distribution_sectors": "Distribution Sectors",
    "aboutpage.partners": "Partners & Recognition",
    "aboutpage.start_partnership": "Start Your Partnership with",
    "aboutpage.request_quote": "Request a Quote",

    // Brands
    "brands.badge": "Our Brands",
    "brands.title": "Brands We",
    "brands.title_highlight": "Distribute",
  },
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem("app-lang");
    return (saved === "en" ? "en" : "ar") as Lang;
  });

  const setLang = (newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem("app-lang", newLang);
  };

  useEffect(() => {
    document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
    document.documentElement.lang = lang;
  }, [lang]);

  const t = (key: string): string => {
    return translations[lang][key] || translations["ar"][key] || key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, dir: lang === "ar" ? "rtl" : "ltr", isAr: lang === "ar" }}>
      {children}
    </LanguageContext.Provider>
  );
};
