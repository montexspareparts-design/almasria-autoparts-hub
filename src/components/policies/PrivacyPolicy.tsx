const PrivacyPolicy = () => (
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
      <h3 className="text-lg font-bold">٥. ملفات تعريف الارتباط (Cookies)</h3>
      <p className="text-muted-foreground">نستخدم ملفات تعريف الارتباط لتحسين تجربة التصفح وتذكر تفضيلاتك. يمكنك التحكم في إعدادات الكوكيز من خلال متصفحك.</p>
    </section>

    <section className="space-y-3">
      <h3 className="text-lg font-bold">٦. حقوقك</h3>
      <p className="text-muted-foreground">يحق لك طلب الوصول إلى بياناتك الشخصية أو تعديلها أو حذفها. يمكنك التواصل معنا عبر البريد الإلكتروني info@almasriaautoparts.com أو الهاتف 01153961008.</p>
    </section>

    <section className="space-y-3">
      <h3 className="text-lg font-bold">٧. حذف الحساب</h3>
      <p className="text-muted-foreground">
        يمكنك حذف حسابك نهائيًا من داخل التطبيق مباشرة من: <strong>حسابي ← الخصوصية وحذف الحساب ← حذف الحساب نهائيًا</strong>.
        عند تأكيد الحذف يتم إزالة بياناتك الشخصية (الاسم، الهاتف، البريد، العنوان، المفضلة، السلة، الإشعارات،
        اشتراكات التنبيهات، والمستندات الشخصية). قد يتم الاحتفاظ بسجلات الطلبات والفواتير السابقة بشكل مجهول
        الهوية فقط عندما يكون ذلك مطلوبًا لأغراض محاسبية أو قانونية. الإجراء نهائي ولا يمكن التراجع عنه.
      </p>
    </section>
  </div>
);

export default PrivacyPolicy;
