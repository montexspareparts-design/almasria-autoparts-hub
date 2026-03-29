import { Helmet } from "react-helmet-async";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, Truck, RotateCcw } from "lucide-react";
import { useSearchParams } from "react-router-dom";

const PoliciesPage = () => {
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get("tab") || "privacy";

  return (
    <>
      <Helmet>
        <title>السياسات | المصرية جروب</title>
        <meta name="description" content="سياسة الخصوصية وسياسة الشحن والتوصيل وسياسة الإرجاع والاسترداد - المصرية جروب لقطع غيار تويوتا الأصلية" />
      </Helmet>
      <Navbar />
      <main className="min-h-screen bg-background pt-24 pb-16">
        <div className="container mx-auto px-4">
          <h1 className="text-3xl md:text-4xl font-black text-foreground text-center mb-10">
            السياسات <span className="text-primary">والشروط</span>
          </h1>

          <Tabs defaultValue={defaultTab} className="max-w-4xl mx-auto" dir="rtl">
            <TabsList className="grid w-full grid-cols-3 mb-8 h-auto">
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

            {/* Privacy Policy */}
            <TabsContent value="privacy">
              <div className="bg-card border border-border rounded-2xl p-6 md:p-10 space-y-6 text-foreground leading-8">
                <h2 className="text-2xl font-bold text-primary">سياسة الخصوصية</h2>
                <p className="text-muted-foreground text-sm">آخر تحديث: مارس ٢٠٢٦</p>

                <section className="space-y-3">
                  <h3 className="text-lg font-bold">١. المعلومات التي نجمعها</h3>
                  <p className="text-muted-foreground">نقوم بجمع المعلومات التالية عند استخدامك لموقعنا أو خدماتنا:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 pr-4">
                    <li>الاسم الكامل ورقم الهاتف والبريد الإلكتروني</li>
                    <li>عنوان الشحن والمحافظة</li>
                    <li>بيانات السجل التجاري والبطاقة الضريبية (للتجار)</li>
                    <li>معلومات السيارة (الموديل وسنة الصنع)</li>
                    <li>سجل الطلبات والمشتريات</li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h3 className="text-lg font-bold">٢. كيف نستخدم معلوماتك</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 pr-4">
                    <li>معالجة وتنفيذ الطلبات والشحن</li>
                    <li>التواصل معك بخصوص طلباتك وحسابك</li>
                    <li>تحسين خدماتنا وتجربة المستخدم</li>
                    <li>إرسال العروض والتحديثات (بموافقتك)</li>
                    <li>الامتثال للمتطلبات القانونية</li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h3 className="text-lg font-bold">٣. حماية البيانات</h3>
                  <p className="text-muted-foreground">نتخذ إجراءات أمنية مناسبة لحماية معلوماتك الشخصية من الوصول غير المصرح به أو التعديل أو الإفصاح أو الإتلاف. نستخدم تشفير SSL لحماية البيانات أثناء النقل.</p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-lg font-bold">٤. مشاركة البيانات</h3>
                  <p className="text-muted-foreground">لا نبيع أو نؤجر معلوماتك الشخصية لأطراف ثالثة. قد نشارك بياناتك مع:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 pr-4">
                    <li>شركات الشحن والتوصيل لتنفيذ طلباتك</li>
                    <li>مزودي خدمات الدفع الإلكتروني</li>
                    <li>الجهات الحكومية عند الطلب القانوني</li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h3 className="text-lg font-bold">٥. حقوقك</h3>
                  <p className="text-muted-foreground">يحق لك طلب الوصول إلى بياناتك الشخصية أو تعديلها أو حذفها. يمكنك التواصل معنا عبر البريد الإلكتروني info@almasriaautoparts.com أو الهاتف 01153961008.</p>
                </section>
              </div>
            </TabsContent>

            {/* Delivery & Shipping */}
            <TabsContent value="delivery">
              <div className="bg-card border border-border rounded-2xl p-6 md:p-10 space-y-6 text-foreground leading-8">
                <h2 className="text-2xl font-bold text-primary">سياسة الشحن والتوصيل</h2>
                <p className="text-muted-foreground text-sm">آخر تحديث: مارس ٢٠٢٦</p>

                <section className="space-y-3">
                  <h3 className="text-lg font-bold">١. مناطق التغطية</h3>
                  <p className="text-muted-foreground">نوفر خدمة التوصيل لجميع محافظات جمهورية مصر العربية من خلال فروعنا المنتشرة في القاهرة والجيزة والأقصر.</p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-lg font-bold">٢. مدة التوصيل</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 pr-4">
                    <li>القاهرة والجيزة: ٢٤ - ٤٨ ساعة عمل</li>
                    <li>الدلتا والإسكندرية: ٤٨ - ٧٢ ساعة عمل</li>
                    <li>الصعيد: ٧٢ - ٩٦ ساعة عمل</li>
                    <li>المناطق النائية: ٣ - ٥ أيام عمل</li>
                  </ul>
                  <p className="text-muted-foreground text-sm">* قد تتأخر المواعيد في الأعياد والمناسبات الرسمية</p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-lg font-bold">٣. رسوم الشحن</h3>
                  <p className="text-muted-foreground">يتم احتساب رسوم الشحن بناءً على المحافظة ووزن الطلب. يتم عرض تكلفة الشحن قبل إتمام الطلب. قد يتم تطبيق شحن مجاني على الطلبات التي تتجاوز مبلغًا معينًا.</p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-lg font-bold">٤. تتبع الشحنة</h3>
                  <p className="text-muted-foreground">بمجرد شحن طلبك، سنرسل لك رقم التتبع عبر واتساب أو البريد الإلكتروني. يمكنك متابعة حالة طلبك من خلال حسابك على الموقع.</p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-lg font-bold">٥. الاستلام</h3>
                  <p className="text-muted-foreground">يرجى فحص المنتجات عند الاستلام والتأكد من سلامتها ومطابقتها للطلب. في حالة وجود أي تلف أو نقص، يرجى إبلاغنا خلال ٢٤ ساعة.</p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-lg font-bold">٦. طرق الدفع</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 pr-4">
                    <li>الدفع نقدًا عند الاستلام (COD)</li>
                    <li>التحويل البنكي</li>
                    <li>فودافون كاش</li>
                    <li>الدفع الإلكتروني عبر البطاقات البنكية</li>
                    <li>نظام الائتمان (للتجار المعتمدين فقط)</li>
                  </ul>
                </section>
              </div>
            </TabsContent>

            {/* Refund & Cancellation */}
            <TabsContent value="refund">
              <div className="bg-card border border-border rounded-2xl p-6 md:p-10 space-y-6 text-foreground leading-8">
                <h2 className="text-2xl font-bold text-primary">سياسة الإرجاع والاسترداد</h2>
                <p className="text-muted-foreground text-sm">آخر تحديث: مارس ٢٠٢٦</p>

                <section className="space-y-3">
                  <h3 className="text-lg font-bold">١. شروط الإرجاع</h3>
                  <p className="text-muted-foreground">يمكنك إرجاع المنتجات خلال ١٤ يومًا من تاريخ الاستلام بالشروط التالية:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 pr-4">
                    <li>أن يكون المنتج في حالته الأصلية ولم يتم تركيبه أو استخدامه</li>
                    <li>أن يكون في عبوته الأصلية مع جميع الملحقات</li>
                    <li>إرفاق الفاتورة الأصلية أو إثبات الشراء</li>
                    <li>عدم وجود أي خدوش أو تلف ناتج عن سوء الاستخدام</li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h3 className="text-lg font-bold">٢. المنتجات غير القابلة للإرجاع</h3>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 pr-4">
                    <li>المنتجات الكهربائية بعد تركيبها</li>
                    <li>الزيوت والسوائل بعد فتحها</li>
                    <li>القطع المطلوبة خصيصًا (Special Order)</li>
                    <li>المنتجات التي تم تعديلها أو قصها</li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h3 className="text-lg font-bold">٣. إجراءات الإرجاع</h3>
                  <ul className="list-decimal list-inside text-muted-foreground space-y-1 pr-4">
                    <li>تواصل معنا عبر الهاتف أو واتساب على 01153961008</li>
                    <li>سيتم مراجعة طلبك خلال ٤٨ ساعة عمل</li>
                    <li>بعد الموافقة، قم بإرسال المنتج لأقرب فرع أو سنرتب الاستلام</li>
                    <li>يتم فحص المنتج والتأكد من استيفاء شروط الإرجاع</li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h3 className="text-lg font-bold">٤. الاسترداد المالي</h3>
                  <p className="text-muted-foreground">بعد قبول الإرجاع، يتم الاسترداد خلال ٧ - ١٤ يوم عمل بنفس طريقة الدفع الأصلية:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1 pr-4">
                    <li>التحويل البنكي: يتم إرجاع المبلغ للحساب البنكي</li>
                    <li>الدفع عند الاستلام: تحويل بنكي أو فودافون كاش</li>
                    <li>البطاقات البنكية: يتم الاسترداد على نفس البطاقة</li>
                  </ul>
                </section>

                <section className="space-y-3">
                  <h3 className="text-lg font-bold">٥. إلغاء الطلب</h3>
                  <p className="text-muted-foreground">يمكنك إلغاء طلبك مجانًا قبل شحنه. بعد الشحن، تطبق سياسة الإرجاع العادية. للإلغاء، تواصل معنا فورًا عبر الهاتف أو واتساب.</p>
                </section>

                <section className="space-y-3">
                  <h3 className="text-lg font-bold">٦. الضمان</h3>
                  <p className="text-muted-foreground">جميع قطع غيار تويوتا الأصلية مغطاة بضمان المصنع. في حالة وجود عيب صناعي، يتم الاستبدال مجانًا مع إرفاق الفاتورة. لا يشمل الضمان الأعطال الناتجة عن سوء التركيب أو الاستخدام.</p>
                </section>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </main>
      <Footer />
    </>
  );
};

export default PoliciesPage;
