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
      <div className="oils-card p-4 flex items-center gap-3" dir="rtl">
        <Gauge className="w-5 h-5" style={{ color: "hsl(var(--oils-muted))" }} />
        <p className="text-[12px]" style={{ color: "hsl(var(--oils-muted))" }}>
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
    <div className="oils-card-hi p-4 flex items-center gap-4" dir="rtl">
      <div className="relative w-[76px] h-[76px] shrink-0">
        <svg viewBox="0 0 76 76" className="w-full h-full -rotate-90">
          <circle cx="38" cy="38" r={R} fill="none" stroke="hsl(var(--oils-line))" strokeWidth="7" />
          <circle
            cx="38" cy="38" r={R} fill="none"
            stroke="hsl(var(--oils-accent))"
            strokeWidth="7" strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={C - (C * pct) / 100}
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <span className="absolute inset-0 grid place-items-center oils-num text-[15px] font-extrabold">{pct}%</span>
      </div>
      <div className="flex-1">
        <p className="text-[11px] font-bold" style={{ color: "hsl(var(--oils-muted))" }}>الائتمان المتاح</p>
        <p className="oils-num text-[20px] font-extrabold mt-0.5" style={{ color: "hsl(var(--oils-accent))" }}>
          {fmt(available)} <span className="text-[11px]">ج.م</span>
        </p>
        <p className="oils-num text-[10.5px] mt-1" style={{ color: "hsl(var(--oils-muted))" }}>
          الحد: {fmt(creditLimit)} · المستخدم: {fmt(used)}
        </p>
      </div>
    </div>
  );
};

export default CreditMeter;
