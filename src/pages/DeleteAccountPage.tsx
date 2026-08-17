import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, MessageCircle, Trash2 } from "lucide-react";
import SEOHead from "@/components/SEOHead";

const SUPPORT_EMAIL = "info@almasriaautoparts.com";
const SUPPORT_WHATSAPP = "201034806288";

export default function DeleteAccountPage() {
  const waLink = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(
    "أرغب في حذف حسابي وبياناتي من تطبيق ALMASRIA GROUP"
  )}`;

  return (
    <>
      <SEOHead
        titleAr="حذف الحساب والبيانات | ALMASRIA GROUP"
        titleEn="Delete Account & Data | ALMASRIA GROUP"
        descriptionAr="اطلب حذف حسابك وبياناتك في تطبيق وموقع المصرية جروب لقطع غيار تويوتا."
        descriptionEn="Request deletion of your ALMASRIA GROUP account and associated data."
      />
      <main className="container mx-auto max-w-3xl px-4 py-12" dir="rtl">
        <h1 className="mb-6 flex items-center gap-3 text-3xl font-bold">
          <Trash2 className="h-7 w-7 text-destructive" />
          حذف الحساب والبيانات
        </h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>التطبيق / الشركة</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-muted-foreground">
            <p>اسم التطبيق: ALMASRIA GROUP (المصرية جروب لقطع غيار تويوتا)</p>
            <p>المطوّر: Al Masria Group</p>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>خطوات طلب حذف الحساب</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-muted-foreground">
            <ol className="list-decimal space-y-2 pr-5">
              <li>ابعت طلب الحذف من داخل التطبيق: «حسابي» ← «حذف الحساب»، أو</li>
              <li>
                ابعت رسالة على واتساب أو بريد إلكتروني من نفس البريد المسجّل بالحساب مع كلمة
                «حذف الحساب».
              </li>
              <li>هيتم التحقق من هويتك خلال 48 ساعة عمل.</li>
              <li>يتم تنفيذ الحذف خلال مدة أقصاها 30 يوماً من تاريخ الطلب.</li>
            </ol>
            <div className="flex flex-wrap gap-3 pt-2">
              <Button asChild>
                <a href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent("طلب حذف حساب")}`}>
                  <Mail className="ml-2 h-4 w-4" />
                  {SUPPORT_EMAIL}
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href={waLink} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="ml-2 h-4 w-4" />
                  واتساب: 01034806288
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>البيانات التي يتم حذفها</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pr-5 text-muted-foreground">
              <li>بيانات الحساب: الاسم، البريد الإلكتروني، رقم الهاتف، العنوان.</li>
              <li>سيارات الجراج والتفضيلات وقوائم الشراء والسلة.</li>
              <li>سجل البحث والتصفح والإشعارات.</li>
              <li>الصور المرفوعة للبحث عن القطع.</li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>البيانات التي يتم الاحتفاظ بها</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="list-disc space-y-1 pr-5 text-muted-foreground">
              <li>
                فواتير وسجلات الطلبات والمعاملات المالية — يتم الاحتفاظ بها لمدة 5 سنوات
                للالتزام بالقوانين الضريبية والمحاسبية المصرية، ثم تُحذف نهائياً.
              </li>
              <li>سجلات مكافحة الاحتيال المطلوبة قانوناً.</li>
            </ul>
            <p className="mt-4 text-sm text-muted-foreground">
              لمزيد من التفاصيل راجع{" "}
              <a className="underline" href="/policies?tab=privacy">
                سياسة الخصوصية
              </a>
              .
            </p>
          </CardContent>
        </Card>
      </main>
    </>
  );
}
