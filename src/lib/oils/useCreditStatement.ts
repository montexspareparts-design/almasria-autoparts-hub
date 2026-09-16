import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface StatementInvoice {
  id: string;
  invoice_number: string;
  invoice_date: string;
  net_amount: number;
  total_amount: number;
  payment_method: string | null;
}

/**
 * كشف حساب التاجر — حد الائتمان + فواتير الفيصل المرتبطة بكود العميل.
 */
export const useCreditStatement = () => {
  const { user, dealerAccount } = useAuth();
  const erpCode = (dealerAccount as any)?.erp_customer_code ?? null;

  const invoicesQuery = useQuery({
    queryKey: ["oils-statement", erpCode],
    enabled: !!user && !!erpCode,
    queryFn: async () => {
      const { data } = await supabase
        .from("erp_sales_invoices")
        .select("id, invoice_number, invoice_date, net_amount, total_amount, payment_method")
        .eq("customer_code", erpCode)
        .order("invoice_date", { ascending: false })
        .limit(20);
      return (data || []) as StatementInvoice[];
    },
    staleTime: 5 * 60_000,
  });

  const loyaltyQuery = useQuery({
    queryKey: ["oils-loyalty", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("loyalty_points")
        .select("balance, lifetime_earned, tier")
        .eq("user_id", user!.id)
        .maybeSingle();
      return data;
    },
    staleTime: 5 * 60_000,
  });

  const creditLimit = Number((dealerAccount as any)?.credit_limit ?? 0);
  const invoicedTotal = (invoicesQuery.data || []).reduce((s, i) => s + Number(i.total_amount || 0), 0);

  return {
    invoices: invoicesQuery.data || [],
    loyalty: loyaltyQuery.data ?? null,
    creditLimit,
    invoicedTotal,
    loading: invoicesQuery.isLoading || loyaltyQuery.isLoading,
    hasErpLink: !!erpCode,
  };
};
