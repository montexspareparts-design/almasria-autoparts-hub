import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ChevronLeft, Search, ShieldCheck, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import { ItemListSchema } from "@/components/SEOSchemaMarkup";
import { SEO_MODELS, SEO_TYPES } from "@/data/seoTaxonomy";
import { productFits } from "@/data/seoShared.js";
import { supabase } from "@/integrations/supabase/client";

const SITE = "https://www.almasriaautoparts.com";

interface CrossProduct {
  sku: string;
  name_ar: string;
  part_number: string | null;
  erp_item_code: string | null;
  base_price: number | null;
  stock_quantity: number | null;
  image_url: string | null;
}

const ModelPartTypePage = () => {
  const { model: modelSlug, type: typeSlug } = useParams();
  const model = SEO_MODELS.find((m) => m.slug === modelSlug);
  const type = SEO_TYPES.find((t) => t.slug === typeSlug);
  const [products, setProducts] = useState<CrossProduct[] | null>(null);

  useEffect(() => {
    if (!model || !type) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("sku, name_ar, part_number, erp_item_code, base_price, stock_quantity, image_url")
        .eq("is_active", true)
        .limit(2000);
      if (!active) return;
      const list = ((data as CrossProduct[]) ?? [])
        .filter((p) => productFits(p.name_ar, model.slug, type.slug))
        .sort((a, b) => Number(Number(b.stock_quantity) > 0) - Number(Number(a.stock_quantity) > 0));
      setProducts(list);
    })();
    return () => {
      active = false;
    };
  }, [model, type]);

  if (!model || !type) return <Navigate to="/parts-by-model" replace />;

  const title = `${type.ar} تويوتا ${model.ar} الأصلية — أسعار وتوفر`;
  const canonical = `${SITE}/parts-by-model/${model.slug}/${type.slug}`;
  const isEmpty = products !== null && products.length === 0;

  return (
    <div className="min-h-screen bg-background">
      <SEOHead
        titleAr={title}
        titleEn={`Toyota ${model.en} ${type.en} — Genuine Parts in Egypt`}
        descriptionAr={`${type.ar} تويوتا ${model.ar} (${model.en}) الأصلية في مصر من موزع معتمد: توفر فوري، أسعار محدثة يوميًا، وتوصيل لكل المحافظات خلال 48 ساعة.`}
        descriptionEn={`Genuine Toyota ${model.en} ${type.en} in Egypt from an authorized distributor — daily updated pricing and 48h nationwide delivery.`}
        canonical={canonical}
        noindex={isEmpty}
        breadcrumbs={[
          { ar: "الرئيسية", en: "Home", url: `${SITE}/` },
          { ar: "حسب الموديل", en: "By Model", url: `${SITE}/parts-by-model` },
          { ar: `تويوتا ${model.ar}`, en: `Toyota ${model.en}`, url: `${SITE}/parts-by-model/${model.slug}` },
          { ar: type.ar, en: type.en, url: canonical },
        ]}
      />
      <ItemListSchema
        name={title}
        items={SEO_TYPES.map((t) => ({
          name: `${t.ar} تويوتا ${model.ar}`,
          url: `${SITE}/parts-by-model/${model.slug}/${t.slug}`,
        }))}
      />
      <Navbar />

      <main className="container mx-auto px-4 py-10">
        <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary">الرئيسية</Link>
          <ChevronLeft className="h-4 w-4" />
          <Link to="/parts-by-model" className="hover:text-primary">حسب الموديل</Link>
          <ChevronLeft className="h-4 w-4" />
          <Link to={`/parts-by-model/${model.slug}`} className="hover:text-primary">تويوتا {model.ar}</Link>
          <ChevronLeft className="h-4 w-4" />
          <span className="text-foreground">{type.ar}</span>
        </nav>

        <header className="rounded-2xl border border-border bg-card p-6 md:p-10">
          <h1 className="text-2xl font-bold text-foreground md:text-4xl">
            {type.ar} تويوتا {model.ar} ({model.en}) الأصلية
          </h1>
          <p className="mt-4 max-w-3xl leading-8 text-muted-foreground">
            المصرية جروب توفر {type.ar} تويوتا {model.ar} الأصلية بضمان الأصالة، مع أسعار محدثة يوميًا من نظام المخازن
            وتوصيل لكل محافظات مصر خلال 48 ساعة.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button asChild>
              <Link to={`/products?search=${encodeURIComponent(`${type.ar} ${model.ar}`)}`}>
                <Search className="ml-2 h-4 w-4" />
                ابحث في الكتالوج
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link to="/contact">اطلب عرض سعر</Link>
            </Button>
          </div>
          <ul className="mt-6 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            <li className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /> قطع أصلية 100% من موزع معتمد</li>
            <li className="flex items-center gap-2"><Truck className="h-4 w-4 text-primary" /> توصيل لكل المحافظات خلال 48 ساعة</li>
          </ul>
        </header>

        <section className="mt-10">
          <h2 className="mb-4 text-xl font-semibold text-foreground">
            {products === null ? "جارٍ تحميل المنتجات…" : `منتجات متاحة (${products.length} صنف)`}
          </h2>
          {isEmpty && (
            <p className="text-muted-foreground">
              مفيش أصناف معروضة حاليًا لـ{type.ar} {model.ar}. ابعتلنا بارت نمبر القطعة أو رقم الشاسيه ونوفرهالك.
            </p>
          )}
          {products && products.length > 0 && (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p) => {
                const price = Number(p.base_price ?? 0);
                const inStock = Number(p.stock_quantity ?? 0) > 0;
                return (
                  <Link
                    key={p.sku}
                    to={`/product/${p.sku}`}
                    className="flex gap-3 rounded-xl border border-border bg-card p-3 transition-colors hover:border-primary"
                  >
                    <img
                      src={p.image_url || "/placeholder.svg"}
                      alt={p.name_ar}
                      loading="lazy"
                      className="h-16 w-16 flex-shrink-0 rounded-lg bg-background object-contain"
                    />
                    <div className="min-w-0 text-sm">
                      <p className="line-clamp-2 font-semibold text-foreground">{p.name_ar}</p>
                      <p className="text-xs text-muted-foreground">
                        كود {p.erp_item_code || p.sku}
                        {p.part_number ? ` · ${p.part_number}` : ""}
                      </p>
                      <p className={`mt-1 text-xs font-semibold ${inStock ? "text-primary" : "text-muted-foreground"}`}>
                        {price > 0 ? `${price.toLocaleString("ar-EG")} جنيه · ` : ""}
                        {inStock ? "متوفر" : "غير متوفر حاليًا"}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </section>

        <section className="mt-10 rounded-2xl border border-border bg-card p-6">
          <h2 className="mb-2 text-lg font-semibold text-foreground">إزاي أتأكد إن القطعة مناسبة لعربيتي؟</h2>
          <p className="leading-8 text-muted-foreground">
            ابعت رقم الشاسيه (VIN) أو صورة رخصة العربية على واتساب، أو قارن بارت نمبر القطعة القديمة بالبارت نمبر المكتوب
            في صفحة المنتج. فريقنا بيأكد التوافق قبل الشحن.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="mb-4 text-xl font-semibold text-foreground">أنواع أخرى لتويوتا {model.ar}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SEO_TYPES.filter((t) => t.slug !== type.slug).map((t) => (
              <Link
                key={t.slug}
                to={`/parts-by-model/${model.slug}/${t.slug}`}
                className="rounded-xl border border-border bg-card p-4 text-foreground transition-colors hover:border-primary"
              >
                {t.ar} تويوتا {model.ar}
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="mb-4 text-xl font-semibold text-foreground">{type.ar} لموديلات أخرى</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {SEO_MODELS.filter((m) => m.slug !== model.slug).map((m) => (
              <Link
                key={m.slug}
                to={`/parts-by-model/${m.slug}/${type.slug}`}
                className="rounded-xl border border-border bg-card p-4 text-foreground transition-colors hover:border-primary"
              >
                {type.ar} تويوتا {m.ar}
              </Link>
            ))}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default ModelPartTypePage;
