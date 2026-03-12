import { useState } from "react";
import { Smartphone, Copy, CheckCircle2, ExternalLink, CreditCard, Banknote, Building2, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";

const WHATSAPP_NUMBER = "201153961008";

const paymentMethods = [
  {
    id: "instapay",
    label: "InstaPay",
    icon: Smartphone,
    accountName: "Ahmed Kamal Abdalaziz",
    accountNumber: "01020412358",
    payLink: "https://ipn.eg/S/drmado/instapay/08n56S",
    instructions: "اضغط على الزر لفتح InstaPay مباشرة وادفع المبلغ المطلوب، ثم أرسل إيصال التحويل عبر واتساب",
    color: "bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800",
    iconColor: "text-purple-600",
    iconBg: "bg-purple-100 dark:bg-purple-900/50",
  },
  {
    id: "vodafone_cash",
    label: "فودافون كاش",
    icon: Wallet,
    accountName: "Ahmed Kamal Abdalaziz",
    accountNumber: "01153961008",
    instructions: "حوّل المبلغ المطلوب على رقم المحفظة التالي ثم أرسل إيصال التحويل عبر واتساب",
    color: "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800",
    iconColor: "text-red-600",
    iconBg: "bg-red-100 dark:bg-red-900/50",
  },
];

const DealerPayment = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-black text-foreground">طرق الدفع المتاحة</h2>
        <p className="text-sm text-muted-foreground mt-1">
          اختر وسيلة الدفع المناسبة وحوّل المبلغ، ثم أرسل إيصال التحويل عبر واتساب لاستكمال الإجراءات
        </p>
      </div>

      {/* Important Note */}
      <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-xl p-4 flex items-start gap-3">
        <span className="text-2xl shrink-0">⚠️</span>
        <div>
          <p className="text-sm font-bold text-amber-800 dark:text-amber-300">ملاحظة مهمة</p>
          <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 leading-relaxed">
            بعد تحويل المبلغ، يجب إرسال إيصال التحويل عبر واتساب مع ذكر رقم الطلب حتى يتم تأكيد الدفع وبدء تجهيز الطلب.
          </p>
        </div>
      </div>

      {/* Payment Methods */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {paymentMethods.map((method) => (
          <div
            key={method.id}
            className={`rounded-xl border-2 p-5 space-y-4 ${method.color}`}
          >
            {/* Method Header */}
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl ${method.iconBg} flex items-center justify-center`}>
                <method.icon className={`w-6 h-6 ${method.iconColor}`} />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">{method.label}</h3>
                <p className="text-[11px] text-muted-foreground">{method.instructions}</p>
              </div>
            </div>

            {/* Account Details */}
            <div className="bg-white dark:bg-background/60 rounded-lg p-3.5 space-y-2.5 border border-border/50">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">اسم الحساب</span>
                <span className="text-sm font-bold text-foreground">{method.accountName}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground font-medium">الرقم</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-primary font-mono tracking-wider" dir="ltr">
                    {method.accountNumber}
                  </span>
                  <button
                    onClick={() => handleCopy(method.id, method.accountNumber)}
                    className="text-primary hover:text-primary/70 transition-colors p-1"
                    title="نسخ الرقم"
                  >
                    {copiedId === method.id ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <Copy className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              {"payLink" in method && method.payLink && (
                <Button asChild size="sm" className="w-full gap-2">
                  <a href={method.payLink} target="_blank" rel="noopener noreferrer">
                    <Smartphone className="w-4 h-4" />
                    ادفع الآن مباشرة
                  </a>
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* WhatsApp CTA */}
      <div className="bg-green-50 dark:bg-green-950/30 border border-green-300 dark:border-green-700 rounded-xl p-5 text-center space-y-3">
        <span className="text-3xl">📎</span>
        <h3 className="text-base font-bold text-green-800 dark:text-green-300">بعد التحويل — أرسل الإيصال</h3>
        <p className="text-xs text-green-700 dark:text-green-400">
          أرسل صورة إيصال التحويل مع رقم الطلب عبر واتساب لتأكيد الدفع
        </p>
        <Button asChild variant="default" className="gap-2 bg-green-600 hover:bg-green-700 text-white">
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("مرحباً، تم تحويل مبلغ الطلب. مرفق إيصال التحويل 📎")}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="w-4 h-4" />
            أرسل الإيصال عبر واتساب
          </a>
        </Button>
      </div>
    </div>
  );
};

export default DealerPayment;
