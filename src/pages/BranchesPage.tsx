import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ChevronLeft, Clock, Mail, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { SEO_BRANCHES, type SeoBranch } from "@/data/seoTaxonomy";

const SITE = "https://www.almasriaautoparts.com";

const localBusinessSchema = (b: SeoBranch) => ({
  "@context": "https://schema.org",
  "@type": "AutoPartsStore",
  name: `المصرية جروب — ${b.name}`,
  url: `${SITE}/branches/${b.slug}`,
  image: `${SITE}/pwa-512x512.png`,
  telephone: b.phone,
  email: "info@almasriaautoparts.com",
  priceRange: "EGP",
  address: {
    "@type": "PostalAddress",
    streetAddress: b.address,
    addressLocality: b.city,
    addressCountry: "EG",
  },
  openingHoursSpecification: {
    "@type": "OpeningHoursSpecification",
    dayOfWeek: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
    opens: "09:00",
    closes: "18:00",
  },
  parentOrganization: { "@type": "Organization", name: "المصرية جروب", url: SITE },
});

const BranchCard = ({ b }: { b: SeoBranch }) => (
  <Link
    to={`/branches/${b.slug}`}
    className="rounded-2xl border border-border bg-card p-6 transition-colors hover:border-primary"
  >
    <h2 className="text-lg font-semibold text-foreground">{b.name}</h2>
    <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
      <MapPin className="h-4 w-4 text-primary" /> {b.address}
    </p>
    <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground" dir="ltr">
      <Phone className="h-4 w-4 text-primary" /> {b.phone}
    </p>
  </Link>
);

const BranchesPage = () => {
  const { slug } = useParams();
  const branch = slug ? SEO_BRANCHES.find((b) => b.slug === slug) : undefined;

  if (slug && !branch) {
    return (
      <div className="min-h-screen bg-background">
        <SEOHead titleAr="الفرع غير موجود" titleEn="Branch not found" noindex />
        <Navbar />
        <main className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-foreground">الفرع غير موجود</h1>
          <Button asChild className="mt-6"><Link to="/branches">كل الفروع</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  if (branch) {
    const canonical = `${SITE}/branches/${branch.slug}`;
    return (
      <div className="min-h-screen bg-background">
        <SEOHead
          titleAr={`${branch.name} — قطع غيار تويوتا في ${branch.city}`}
          titleEn={`Al Masria Group ${branch.slug} branch — Toyota parts in ${branch.city}`}
          descriptionAr={`${branch.name} للمصرية جروب: ${branch.address}. قطع غيار وزيوت تويوتا الأصلية بأسعار محدثة — هاتف وواتساب ${branch.phone}.`}
          descriptionEn={`Al Masria Group ${branch.city} branch: ${branch.address}. Genuine Toyota parts and oils.`}
          canonical={canonical}
          breadcrumbs={[
            { ar: "الرئيسية", en: "Home", url: `${SITE}/` },
            { ar: "الفروع", en: "Branches", url: `${SITE}/branches` },
            { ar: branch.name, en: branch.name, url: canonical },
          ]}
        />
        <Helmet>
          <script type="application/ld+json">{JSON.stringify(localBusinessSchema(branch))}</script>
        </Helmet>
        <Navbar />
        <main className="container mx-auto px-4 py-10">
          <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
            <Link to="/" className="hover:text-primary">الرئيسية</Link>
            <ChevronLeft className="h-4 w-4" />
            <Link to="/branches" className="hover:text-primary">الفروع</Link>
            <ChevronLeft className="h-4 w-4" />
            <span className="text-foreground">{branch.name}</span>
          </nav>

          <header className="rounded-2xl border border-border bg-card p-6 md:p-10">
            <h1 className="text-2xl font-bold text-foreground md:text-4xl">
              {branch.name} — قطع غيار تويوتا الأصلية في {branch.city}
            </h1>
            <p className="mt-4 max-w-3xl leading-8 text-muted-foreground">
              {branch.name} من فروع المصرية جروب، موزع معتمد لقطع غيار وزيوت تويوتا الأصلية في مصر منذ 1999.
            </p>
            <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><MapPin className="h-4 w-4 text-primary" /> {branch.address}</li>
              <li className="flex items-center gap-2" dir="ltr">
                <Phone className="h-4 w-4 text-primary" />
                <a href={`tel:${branch.phone}`} className="hover:text-primary">{branch.phone}</a>
              </li>
              <li className="flex items-center gap-2"><Clock className="h-4 w-4 text-primary" /> {branch.hours}</li>
              <li className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-primary" />
                <a href="mailto:info@almasriaautoparts.com" className="hover:text-primary">info@almasriaautoparts.com</a>
              </li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild><a href={`tel:${branch.phone}`}>اتصل بالفرع</a></Button>
              <Button asChild variant="outline"><Link to="/products">تصفح الكتالوج</Link></Button>
            </div>
          </header>

          <section className="mt-10">
            <h2 className="mb-4 text-xl font-semibold text-foreground">فروع أخرى</h2>
            <div className="grid gap-4 md:grid-cols-2">
              {SEO_BRANCHES.filter((b) => b.slug !== branch.slug).map((b) => (
                <BranchCard key={b.slug} b={b} />
              ))}
            </div>
          </section>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        titleAr="فروع المصرية جروب — عناوين وأرقام"
        titleEn="Al Masria Group branches — addresses & phones"
        descriptionAr="عناوين وأرقام فروع المصرية جروب لقطع غيار تويوتا: أوسيم (الجيزة)، التوفيقية (القاهرة)، والأقصر. مواعيد العمل وطرق التواصل."
        descriptionEn="Al Masria Group branch network for Toyota genuine parts in Egypt: Osim, Tawfikia and Luxor."
        canonical={`${SITE}/branches`}
        breadcrumbs={[
          { ar: "الرئيسية", en: "Home", url: `${SITE}/` },
          { ar: "الفروع", en: "Branches", url: `${SITE}/branches` },
        ]}
      />
      <Navbar />
      <main className="container mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-foreground md:text-4xl">فروع المصرية جروب</h1>
        <p className="mt-3 max-w-3xl leading-8 text-muted-foreground">
          شبكة فروع المصرية جروب لقطع غيار وزيوت تويوتا الأصلية في مصر.
        </p>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {SEO_BRANCHES.map((b) => <BranchCard key={b.slug} b={b} />)}
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default BranchesPage;
