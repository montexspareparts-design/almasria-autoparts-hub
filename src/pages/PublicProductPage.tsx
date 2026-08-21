import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { ChevronLeft, PackageCheck, PackageX, ShieldCheck, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { supabase } from "@/integrations/supabase/client";

const SITE = "https://www.almasriaautoparts.com";

const BRAND_LABEL: Record<string, string> = {
  toyota_genuine: "تويوتا أصلي",
  denso: "DENSO",
  aisin: "AISIN",
  mtx_aftermarket: "MTX",
  fbk: "FBK",
  kyb: "KYB",
  tp: "TP",
};

interface PublicProduct {
  id: string;
  sku: string;
  part_number: string | null;
  erp_item_code: string | null;
  name_ar: string;
  description_ar: string | null;
  brand: string | null;
  image_url: string | null;
  stock_quantity: number | null;
}

const PublicProductPage = () => {
  const { sku } = useParams();
  const [product, setProduct] = useState<PublicProduct | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("products")
        .select("id, sku, part_number, erp_item_code, name_ar, description_ar, brand, image_url, stock_quantity")
        .eq("sku", sku ?? "")
        .eq("is_active", true)
        .maybeSingle();
      if (!active) return;
      setProduct((data as PublicProduct) ?? null);
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [sku]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-20 text-center text-muted-foreground">جارٍ التحميل…</main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <SEOHead titleAr="الصنف غير موجود" titleEn="Product not found" noindex />
        <Navbar />
        <main className="container mx-auto px-4 py-20 text-center">
          <h1 className="text-2xl font-bold text-foreground">الصنف غير موجود</h1>
          <Button asChild className="mt-6"><Link to="/products">تصفح الكتالوج</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  const brand = BRAND_LABEL[product.brand ?? ""] ?? "تويوتا";
  const inStock = Number(product.stock_quantity ?? 0) > 0;
  const canonical = `${SITE}/product/${product.sku}`;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        titleAr={`${product.name_ar}${product.part_number ? ` — ${product.part_number}` : ""}`}
        titleEn={`${product.name_ar} — Al Masria Group`}
        descriptionAr={`${product.name_ar} — ${brand}. كود الصنف ${product.erp_item_code || product.sku}${product.part_number ? ` وبارت نمبر ${product.part_number}` : ""}. متوفر لدى المصرية جروب مع توصيل لكل محافظات مصر.`}
        descriptionEn={`${product.name_ar} (${brand}) — part ${product.part_number || product.sku} available at Al Masria Group, Egypt.`}
        canonical={canonical}
        ogType="product"
        image={product.image_url || undefined}
        breadcrumbs={[
          { ar: "الرئيسية", en: "Home", url: `${SITE}/` },
          { ar: "الكتالوج", en: "Catalog", url: `${SITE}/products` },
          { ar: product.name_ar, en: product.name_ar, url: canonical },
        ]}
      />
      <Helmet>
        <script type="application/ld+json">{JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Product",
          name: product.name_ar,
          sku: String(product.erp_item_code || product.sku),
          ...(product.part_number ? { mpn: product.part_number } : {}),
          brand: { "@type": "Brand", name: brand },
          ...(product.image_url ? { image: product.image_url } : {}),
          description: product.description_ar || product.name_ar,
          url: canonical,
          offers: {
            "@type": "Offer",
            priceCurrency: "EGP",
            availability: inStock ? "https://schema.org/InStock" : "https://schema.org/PreOrder",
            url: canonical,
            seller: { "@type": "Organization", name: "المصرية جروب" },
          },
        })}</script>
      </Helmet>
      <Navbar />

      <main className="container mx-auto px-4 py-10">
        <nav className="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary">الرئيسية</Link>
          <ChevronLeft className="h-4 w-4" />
          <Link to="/products" className="hover:text-primary">الكتالوج</Link>
          <ChevronLeft className="h-4 w-4" />
          <span className="line-clamp-1 text-foreground">{product.name_ar}</span>
        </nav>

        <div className="grid gap-8 md:grid-cols-2">
          <div className="flex items-center justify-center rounded-2xl border border-border bg-white p-6">
            <img
              src={product.image_url || "/placeholder.svg"}
              alt={product.name_ar}
              loading="lazy"
              className="max-h-80 w-auto object-contain"
            />
          </div>

          <div className="rounded-2xl border border-border bg-card p-6">
            <h1 className="text-2xl font-bold leading-relaxed text-foreground">{product.name_ar}</h1>

            <dl className="mt-6 space-y-3 text-sm">
              <div className="flex justify-between gap-4 border-b border-border pb-2">
                <dt className="text-muted-foreground">كود الصنف</dt>
                <dd className="font-semibold text-foreground">{product.erp_item_code || product.sku}</dd>
              </div>
              {product.part_number && (
                <div className="flex justify-between gap-4 border-b border-border pb-2">
                  <dt className="text-muted-foreground">بارت نمبر</dt>
                  <dd className="font-semibold text-foreground" dir="ltr">{product.part_number}</dd>
                </div>
              )}
              <div className="flex justify-between gap-4 border-b border-border pb-2">
                <dt className="text-muted-foreground">العلامة</dt>
                <dd className="font-semibold text-foreground">{brand}</dd>
              </div>
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">الحالة</dt>
                <dd className={`flex items-center gap-2 font-semibold ${inStock ? "text-primary" : "text-muted-foreground"}`}>
                  {inStock ? <PackageCheck className="h-4 w-4" /> : <PackageX className="h-4 w-4" />}
                  {inStock ? "متوفر" : "اطلب توفيره"}
                </dd>
              </div>
            </dl>

            {product.description_ar && (
              <p className="mt-6 leading-8 text-muted-foreground">{product.description_ar}</p>
            )}

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild><Link to="/auth">سجّل لعرض السعر</Link></Button>
              <Button asChild variant="outline"><Link to="/contact">اطلب عرض سعر</Link></Button>
            </div>

            <ul className="mt-6 space-y-2 text-sm text-muted-foreground">
              <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> موزع معتمد — قطع أصلية بضمان الأصالة</li>
              <li className="flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /> توصيل لكل محافظات مصر خلال 48 ساعة</li>
            </ul>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PublicProductPage;
