import { Smartphone, Copy, CheckCircle2, ExternalLink } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

const PAYMENT_ACCOUNTS = [
  {
    method: "instapay",
    label: "InstaPay",
    accountName: "Ahmed Kamal Abdalaziz",
    accountNumber: "01020412358",
    payLink: "https://ipn.eg/S/drmado/instapay/08n56S",
    instructions: "ادفع مباشرة عبر رابط InstaPay أو حوّل على الرقم التالي ثم أرسل إيصال التحويل عبر واتساب",
  },
  {
    method: "wallet",
    label: "فودافون كاش / محفظة إلكترونية",
    accountName: "Ahmed Kamal Abdalaziz",
    accountNumber: "01153961008",
    instructions: "حوّل المبلغ المطلوب على رقم المحفظة التالي ثم أرسل إيصال التحويل عبر واتساب",
  },
  {
    method: "bank_transfer",
    label: "تحويل بنكي",
    accountName: "Ahmed Kamal Abdalaziz",
    accountNumber: "XXXX-XXXX-XXXX-XXXX",
    instructions: "حوّل المبلغ على الحساب البنكي التالي ثم أرسل إيصال التحويل عبر واتساب",
  },
];

const WHATSAPP_NUMBER = "201153961008";

interface Props {
  paymentMethod: string;
  orderNumber: string;
  totalAmount: number;
  compact?: boolean;
}

const PaymentInstructionsBanner = ({ paymentMethod, orderNumber, totalAmount, compact }: Props) => {
  const [copied, setCopied] = useState(false);
  const account = PAYMENT_ACCOUNTS.find((a) => a.method === paymentMethod);

  if (!account) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(account.accountNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const receiptMsg = encodeURIComponent(
    `مرحباً، تم تحويل مبلغ ${totalAmount.toLocaleString("ar-EG")} ج.م\nللطلب رقم: ${orderNumber}\nعبر ${account.label}\nمرفق إيصال التحويل 📎`
  );

  return (
    <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-300 dark:border-amber-700 rounded-xl p-4 space-y-3">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/50 flex items-center justify-center shrink-0">
          <Smartphone className="w-5 h-5 text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300 mb-1">
            ⚡ {compact ? "ادفع لاستكمال الطلب" : "خطوة مهمة — ادفع لاستكمال إجراءات الطلب"}
          </h4>
          <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
            {account.instructions}
          </p>
        </div>
      </div>

      {/* Account Details */}
      <div className="bg-white dark:bg-background/50 rounded-lg p-3 border border-amber-200 dark:border-amber-800 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground font-semibold">طريقة الدفع</span>
          <span className="text-xs font-bold text-foreground">{account.label}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground font-semibold">اسم الحساب</span>
          <span className="text-xs font-bold text-foreground">{account.accountName}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-muted-foreground font-semibold">الرقم / الحساب</span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-primary font-mono tracking-wide" dir="ltr">
              {account.accountNumber}
            </span>
            <button
              onClick={handleCopy}
              className="text-primary hover:text-primary/70 transition-colors"
              title="نسخ الرقم"
            >
              {copied ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between border-t border-amber-200 dark:border-amber-800 pt-2">
          <span className="text-[11px] text-muted-foreground font-semibold">المبلغ المطلوب</span>
          <span className="text-sm font-black text-primary">
            {totalAmount.toLocaleString("ar-EG")} ج.م
          </span>
        </div>
      </div>

      {/* InstaPay Direct Pay Link */}
      {"payLink" in account && account.payLink && (
        <Button asChild size="sm" className="w-full gap-2">
          <a href={account.payLink} target="_blank" rel="noopener noreferrer">
            <Smartphone className="w-4 h-4" />
            ادفع الآن عبر InstaPay مباشرة
          </a>
        </Button>
      )}

      {/* WhatsApp Receipt Button */}
      <Button asChild variant="outline" size="sm" className="w-full gap-2 border-green-600 text-green-700 hover:bg-green-50 dark:hover:bg-green-950/30">
        <a
          href={`https://wa.me/${WHATSAPP_NUMBER}?text=${receiptMsg}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink className="w-4 h-4" />
          أرسل إيصال التحويل عبر واتساب
        </a>
      </Button>

      <p className="text-[10px] text-amber-600 dark:text-amber-500 text-center leading-relaxed">
        ⏳ لن يتم تجهيز الطلب إلا بعد تأكيد استلام المبلغ
      </p>
    </div>
  );
};

export default PaymentInstructionsBanner;
