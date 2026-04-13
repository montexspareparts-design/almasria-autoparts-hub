const RefundPolicy = () => (
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
);

export default RefundPolicy;
