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
    <main className="oils-screen oils-account" dir="rtl">
      <header className="oils-page-header"><div><span className="oils-eyebrow">حساب موثوق وواضح</span><h1>حسابي</h1></div></header>
      {/* الهوية */}
      <div className="oils-profile-card">
        <div className="oils-profile-icon"><UserCircle2 /></div>
        <div>
          <h2>{profile?.full_name || "شريكنا"}</h2>
          <p>
            {dealer?.erp_customer_name || profile?.email || ""}
          </p>
          {dealer?.erp_customer_code && (
            <span className="oils-account-code oils-num">كود العميل: {dealer.erp_customer_code}</span>
          )}
        </div>
      </div>

      {/* الائتمان */}
      <CreditMeter creditLimit={creditLimit} used={invoicedTotal} />

      {/* الولاء */}
      <div className="oils-loyalty-card">
        <Award />
        <div>
          <p>نقاط الولاء</p>
          <strong className="oils-num">
            رصيدك: {fmt(Number(loyalty?.balance ?? 0))} نقطة · الإجمالي: {fmt(Number(loyalty?.lifetime_earned ?? 0))}
          </strong>
        </div>
      </div>

      {/* الفواتير */}
      <section>
        <div className="oils-section-title">
          <span>
            <FileText />
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
              <div key={inv.id} className="oils-invoice-row">
                <div className="oils-invoice-icon"><Wallet /></div>
                <div>
                  <p className="oils-num" dir="ltr">{inv.invoice_number}</p>
                  <span className="oils-num" dir="ltr">
                    {inv.invoice_date} {inv.payment_method ? `· ${inv.payment_method}` : ""}
                  </span>
                </div>
                <strong className="oils-num" dir="ltr">
                  {fmt(Number(inv.total_amount))} ج
                </strong>
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
    </main>
  );
};

export default OilsAccount;
