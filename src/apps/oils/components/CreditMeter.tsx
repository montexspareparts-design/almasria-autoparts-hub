import { Gauge } from "lucide-react";

interface Props {
  creditLimit: number;
  used: number;
}

const fmt = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 0 });

/** عدّاد الائتمان — شريط دائري مبسّط يوضح المتاح من حد الائتمان. */
const CreditMeter = ({ creditLimit, used }: Props) => {
  if (creditLimit <= 0) {
    return (
      <div className="oils-credit-card oils-credit-card--empty" dir="rtl">
        <Gauge />
        <p>
          حسابك بدون حد ائتماني حاليًا — تواصل مع مدير حسابك لتفعيله.
        </p>
      </div>
    );
  }

  const available = Math.max(0, creditLimit - used);
  const pct = Math.min(100, Math.round((available / creditLimit) * 100));
  const R = 30;
  const C = 2 * Math.PI * R;

  return (
    <div className="oils-credit-card" dir="rtl">
      <div className="oils-credit-copy">
        <span>الائتمان المتاح</span>
        <strong className="oils-num">{fmt(available)} <small>ج.م</small></strong>
        <p className="oils-num">الحد {fmt(creditLimit)} · المستخدم {fmt(used)}</p>
      </div>
      <div className="oils-credit-ring">
        <svg viewBox="0 0 76 76">
          <circle cx="38" cy="38" r={R} fill="none" stroke="hsl(var(--oils-line))" strokeWidth="7" />
          <circle
            cx="38" cy="38" r={R} fill="none"
            stroke="hsl(var(--oils-accent))"
            strokeWidth="7" strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C - (C * pct) / 100}
            className="oils-credit-progress"
          />
        </svg>
        <span className="oils-num">{pct}%</span>
      </div>
    </div>
  );
};

export default CreditMeter;
