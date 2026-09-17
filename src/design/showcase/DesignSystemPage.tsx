import { useState } from "react";
import { Home, Search, ShoppingCart, ClipboardList, User, SlidersHorizontal, PackageSearch, Bell } from "lucide-react";
import "../tokens.css";
import {
  AppHeader,
  Badge,
  BottomTabBar,
  Button,
  Card,
  EmptyState,
  IconButton,
  Input,
  PriceBlock,
  ProductCard,
  QtyStepper,
  SearchField,
  Segmented,
  Sheet,
  Skeleton,
  SkeletonText,
  StickyTotalBar,
  StockBadge,
  Toast,
  useToast,
} from "../ui";
import { formatNumber } from "../format";
import { success } from "../haptics";

const SwatchRow = ({ name, token }: { name: string; token: string }) => (
  <div className="flex items-center gap-3">
    <span
      className="w-9 h-9 shrink-0"
      style={{ background: `var(${token})`, borderRadius: "var(--r-sm)", border: "1px solid var(--line-200)" }}
    />
    <div className="flex flex-col">
      <span className="ds-caption">{name}</span>
      <span className="ds-mono ds-micro" dir="ltr" style={{ color: "var(--ink-500)" }}>
        {token}
      </span>
    </div>
  </div>
);

const Section = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <section className="flex flex-col gap-3">
    <h2 className="ds-caption" style={{ color: "var(--ink-500)" }}>
      {label}
    </h2>
    {children}
  </section>
);

const DesignSystemPage = () => {
  const [tab, setTab] = useState("home");
  const [seg, setSeg] = useState("all");
  const [query, setQuery] = useState("");
  const [qtyPiece, setQtyPiece] = useState(2);
  const [qtyCarton, setQtyCarton] = useState(4);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [loadingBtn, setLoadingBtn] = useState(false);
  const { toast, show } = useToast();

  return (
    <div className="ds-root min-h-[100dvh]" dir="rtl" lang="ar">
      <AppHeader
        title="نظام التصميم"
        action={
          <IconButton label="الإشعارات" onClick={() => show({ message: "لا توجد إشعارات جديدة" })}>
            <Bell className="w-[20px] h-[20px]" strokeWidth={1.5} />
          </IconButton>
        }
      />

      <main className="px-5 pb-8 flex flex-col gap-8">
        <div className="pt-2">
          <p className="ds-display">أساس بصري واحد</p>
          <p className="ds-body mt-1" style={{ color: "var(--ink-500)" }}>
            مكوّنات موحّدة لمنصة الجملة — هادئة، سريعة، والأرقام هي البطل.
          </p>
        </div>

        <Section label="الألوان">
          <Card className="grid grid-cols-2 gap-4">
            <SwatchRow name="أحمر العلامة" token="--brand-red" />
            <SwatchRow name="تمييز خفيف" token="--brand-red-soft" />
            <SwatchRow name="حبر أساسي" token="--ink-900" />
            <SwatchRow name="نص ثانوي" token="--ink-500" />
            <SwatchRow name="خلفية التطبيق" token="--surface-50" />
            <SwatchRow name="سطح البطاقة" token="--surface-0" />
            <SwatchRow name="نجاح" token="--success" />
            <SwatchRow name="تحذير" token="--warning" />
          </Card>
        </Section>

        <Section label="الخطوط">
          <Card className="flex flex-col gap-3">
            <p className="ds-display">عرض 32</p>
            <p className="ds-h1">عنوان رئيسي 24</p>
            <p className="ds-h2">عنوان فرعي 20</p>
            <p className="ds-body">نص أساسي 16 — قائمة أسعار تويوتا الأصلية.</p>
            <p className="ds-body-strong">نص بارز 16</p>
            <p className="ds-caption" style={{ color: "var(--ink-500)" }}>وصف 13</p>
            <p className="ds-micro" style={{ color: "var(--ink-500)" }}>ميكرو 11</p>
          </Card>
        </Section>

        <Section label="الأرقام والأسعار">
          <Card className="flex flex-col gap-1 items-start">
            {[1250, 18500.0, 1063000].map((n) => (
              <span key={n} className="ds-price-md ds-num" style={{ minWidth: 160, textAlign: "start" }}>
                {formatNumber(n, n % 1 === 0 && n !== 18500 ? 0 : 2)}
              </span>
            ))}
            <span className="ds-mono ds-caption mt-2" dir="ltr" style={{ color: "var(--ink-500)" }}>
              90915-YZZD2 · 08880-83265
            </span>
          </Card>
        </Section>

        <Section label="الأزرار">
          <Card className="flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              <Button variant="primary">تأكيد الطلب</Button>
              <Button variant="accent">ادفع الآن</Button>
              <Button variant="secondary">إلغاء</Button>
              <Button variant="ghost">تفاصيل</Button>
              <Button variant="destructive">حذف</Button>
            </div>
            <div className="flex flex-wrap gap-2 items-center">
              <Button variant="primary" disabled>غير متاح</Button>
              <Button
                variant="primary"
                loading={loadingBtn}
                onClick={() => {
                  setLoadingBtn(true);
                  window.setTimeout(() => setLoadingBtn(false), 1400);
                }}
              >
                جارٍ الإرسال
              </Button>
              <IconButton label="فلترة" onClick={() => setSheetOpen(true)}>
                <SlidersHorizontal className="w-[20px] h-[20px]" strokeWidth={1.5} />
              </IconButton>
            </div>
            <Button variant="primary" size="lg" block>
              زر بعرض كامل 52
            </Button>
          </Card>
        </Section>

        <Section label="الإدخال والبحث">
          <Card className="flex flex-col gap-4">
            <SearchField value={query} onChange={setQuery} onScan={() => show({ message: "المسح الضوئي قريبًا" })} />
            <Input label="كود العميل" placeholder="مثال: 12918" id="ds-demo-code" />
            <Input label="الرقم الضريبي" error="القيمة غير صحيحة" defaultValue="123" id="ds-demo-err" />
            <Segmented
              options={[
                { value: "all", label: "الكل" },
                { value: "toyota", label: "تويوتا" },
                { value: "oils", label: "زيوت" },
              ]}
              value={seg}
              onChange={setSeg}
            />
          </Card>
        </Section>

        <Section label="الحالات والتوفر">
          <Card className="flex flex-col gap-3 items-start">
            <StockBadge state="available" updatedAgo="منذ 5 د" />
            <StockBadge state="limited" />
            <StockBadge state="out" />
            <div className="flex flex-wrap gap-2">
              <Badge>محايد</Badge>
              <Badge tone="red">سعر جملة</Badge>
              <Badge tone="success">تم التسليم</Badge>
              <Badge tone="warning">بانتظار الدفع</Badge>
              <Badge tone="info">قيد التجهيز</Badge>
            </div>
          </Card>
        </Section>

        <Section label="عرض السعر">
          <div className="grid gap-3">
            <Card><PriceBlock finalPrice={1250} size="lg" /></Card>
            <Card><PriceBlock finalPrice={1063} listPrice={1250} discountReason="سعر جملة" /></Card>
            <Card><PriceBlock finalPrice={980} listPrice={1250} discountReason="خصم كمية 12+" emphasized /></Card>
            <Card><PriceBlock finalPrice={1250} discountReason="بونص 1 مجاني لكل 10" unitLabel="للجركن" /></Card>
          </div>
        </Section>

        <Section label="عدّاد الكمية">
          <Card className="flex items-center gap-8">
            <QtyStepper value={qtyPiece} onChange={setQtyPiece} unitLabel="جركن" min={0} />
            <QtyStepper value={qtyCarton} onChange={setQtyCarton} step={4} unitLabel="كرتونة (4)" min={0} />
          </Card>
        </Section>

        <Section label="بطاقات الأصناف">
          <div className="grid gap-3">
            <ProductCard
              brand="TOYOTA GENUINE"
              title="زيت موتور تويوتا أصلي 5W-30 — جركن 6 لتر"
              partNumber="08880-83265"
              stock="available"
              updatedAgo="منذ 5 د"
              finalPrice={2180}
              listPrice={2450}
              discountReason="سعر جملة"
              unitLabel="للجركن"
              qty={qtyPiece}
              onQtyChange={setQtyPiece}
            />
            <ProductCard
              brand="DENSO"
              title="بوجيه إيريديوم دنسو — كورولا 2015-2022"
              partNumber="SC20HR11"
              stock="limited"
              finalPrice={310}
              listPrice={365}
              discountReason="خصم كمية 12+"
              onAdd={() => {
                success();
                show({ message: "تمت الإضافة إلى السلة", actionLabel: "عرض السلة" });
              }}
            />
            <ProductCard
              brand="MTX"
              title="تيل فرامل أمامي MTX — هايلكس 2016+"
              partNumber="MTX-04465-0K340"
              stock="out"
              finalPrice={840}
            />
          </div>
        </Section>

        <Section label="الأوراق السفلية والتنبيهات">
          <Card className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={() => setSheetOpen(true)}>افتح ورقة الفلاتر</Button>
            <Button variant="secondary" onClick={() => show({ message: "تم حفظ التغييرات", actionLabel: "تراجع" })}>
              أظهر تنبيهًا
            </Button>
          </Card>
        </Section>

        <Section label="التحميل مقابل المحتوى">
          <div className="grid gap-3">
            <Card className="flex gap-4">
              <Skeleton width={72} height={72} radius="var(--r-md)" />
              <div className="flex-1 flex flex-col gap-3 justify-center">
                <SkeletonText lines={2} />
                <Skeleton width={96} height={20} />
              </div>
            </Card>
            <ProductCard
              brand="TOYOTA GENUINE"
              title="فلتر زيت تويوتا أصلي — كورولا"
              partNumber="04152-YZZA1"
              stock="available"
              finalPrice={215}
              listPrice={250}
              discountReason="سعر جملة"
            />
          </div>
        </Section>

        <Section label="الحالة الفارغة">
          <Card>
            <EmptyState
              icon={PackageSearch}
              title="لا توجد نتائج مطابقة"
              hint="جرّب البحث برقم القطعة كاملًا"
              actionLabel="مسح البحث"
              onAction={() => setQuery("")}
            />
          </Card>
        </Section>

        <Section label="شريط الإجمالي">
          <div className="overflow-hidden" style={{ borderRadius: "var(--r-xl)", boxShadow: "var(--shadow-1)" }}>
            <StickyTotalBar
              total={18500}
              hint="شامل الشحن"
              actionLabel="إتمام الطلب"
              onAction={() => show({ message: "انتقال إلى الدفع" })}
            />
          </div>
        </Section>

        <Section label="شريط التبويبات">
          <div className="overflow-hidden" style={{ borderRadius: "var(--r-xl)" }}>
            <BottomTabBar
              value={tab}
              onChange={setTab}
              items={[
                { key: "home", label: "الرئيسية", icon: Home },
                { key: "search", label: "البحث", icon: Search },
                { key: "cart", label: "السلة", icon: ShoppingCart },
                { key: "orders", label: "الطلبات", icon: ClipboardList },
                { key: "account", label: "حسابي", icon: User },
              ]}
            />
          </div>
        </Section>
      </main>

      <Sheet open={sheetOpen} onClose={() => setSheetOpen(false)} title="تصفية النتائج" snap="half">
        <div className="flex flex-col gap-4">
          <Segmented
            name="ds-sheet-seg"
            options={[
              { value: "all", label: "الكل" },
              { value: "available", label: "المتاح" },
              { value: "offers", label: "العروض" },
            ]}
            value={seg}
            onChange={setSeg}
          />
          <Input label="الحد الأقصى للسعر" placeholder="5,000" id="ds-demo-max" inputMode="numeric" />
          <Button variant="accent" size="lg" block onClick={() => setSheetOpen(false)}>
            عرض النتائج
          </Button>
        </div>
      </Sheet>

      <Toast toast={toast} offsetBottom={24} />
    </div>
  );
};

export default DesignSystemPage;
