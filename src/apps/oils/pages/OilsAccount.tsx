import { useNavigate } from "react-router-dom";
import { Award, FileText, LogOut, UserCircle2, Wallet } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useCreditStatement } from "@/lib/oils/useCreditStatement";
import CreditMeter from "../components/CreditMeter";
import { supabase } from "@/integrations/supabase/client";

const fmt = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 0 });

/**
 * حسابي — كشف الحساب والائتمان + نقاط الولاء + آخر الفواتير.
 */
const OilsAccount = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { dealer, invoices, loyalty, creditLimit, invoicedTotal, loading, hasErpLink } = useCreditStatement();

  return (
    <div className="px-4 pt-5 space-y-5" dir="rtl">
      {/* الهوية */}
      <div className="oils-card-hi p-4 flex items-center gap-3">
        <UserCircle2 className="w-11 h-11 shrink-0" style={{ color: "hsl(var(--oils-accent))" }} />
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-extrabold truncate">{profile?.full_name || "شريكنا"}</p>
          <p className="text-[11px] truncate" style={{ color: "hsl(var(--oils-muted))" }}>
            {dealer?.erp_customer_name || profile?.email || ""}
          </p>
          {dealer?.erp_customer_code && (
            <span className="oils-chip oils-num mt-1.5">كود العميل: {dealer.erp_customer_code}</span>
          )}
        </div>
      </div>

      {/* الائتمان */}
      <CreditMeter creditLimit={creditLimit} used={invoicedTotal} />

      {/* الولاء */}
      <div className="oils-card p-4 flex items-center gap-3">
        <Award className="w-5 h-5 shrink-0" style={{ color: "hsl(var(--oils-accent))" }} />
        <div className="flex-1">
          <p className="text-[12px] font-extrabold">نقاط الولاء</p>
          <p className="oils-num text-[11px] mt-0.5" style={{ color: "hsl(var(--oils-muted))" }}>
            رصيدك: {fmt(Number(loyalty?.balance ?? 0))} نقطة · الإجمالي: {fmt(Number(loyalty?.lifetime_earned ?? 0))}
          </p>
        </div>
      </div>

      {/* الفواتير */}
      <section>
        <div className="oils-section-title mb-3">
          <span className="flex items-center gap-2">
            <FileText className="w-4 h-4" style={{ color: "hsl(var(--oils-accent))" }} />
            آخر الفواتير
          </span>
        </div>

        {loading ? (
          <div className="space-y-2.5">{[0, 1, 2].map((i) => <div key={i} className="oils-skeleton h-[58px]" />)}</div>
        ) : !hasErpLink ? (
          <p className="text-[11.5px] text-center py-6" style={{ color: "hsl(var(--oils-muted))" }}>
            حسابك لسه مش مربوط بكود عميل — كشف الحساب هيشتغل فور الربط.
          </p>
        ) : invoices.length === 0 ? (
          <p className="text-[11.5px] text-center py-6" style={{ color: "hsl(var(--oils-muted))" }}>
            لا توجد فواتير مسجلة بعد.
          </p>
        ) : (
          <div className="space-y-2.5">
            {invoices.map((inv) => (
              <div key={inv.id} className="oils-card !rounded-2xl p-3.5 flex items-center gap-3">
                <Wallet className="w-4.5 h-4.5 shrink-0 w-5 h-5" style={{ color: "hsl(var(--oils-muted))" }} />
                <div className="flex-1 min-w-0">
                  <p className="oils-num text-[12.5px] font-bold" dir="ltr">{inv.invoice_number}</p>
                  <p className="oils-num text-[10.5px] mt-0.5" style={{ color: "hsl(var(--oils-muted))" }} dir="ltr">
                    {inv.invoice_date} {inv.payment_method ? `· ${inv.payment_method}` : ""}
                  </p>
                </div>
                <span className="oils-num text-[13.5px] font-extrabold" style={{ color: "hsl(var(--oils-accent))" }} dir="ltr">
                  {fmt(Number(inv.total_amount))} ج
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* خروج */}
      <button
        type="button"
        className="oils-btn-ghost w-full"
        onClick={async () => { await supabase.auth.signOut(); navigate("/oils/login", { replace: true }); }}
      >
        <LogOut className="w-4 h-4" />
        تسجيل الخروج
      </button>
    </div>
  );
};

export default OilsAccount;
