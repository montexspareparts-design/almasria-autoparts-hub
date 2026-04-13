const DeliveryPolicy = () => (
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
);

export default DeliveryPolicy;
