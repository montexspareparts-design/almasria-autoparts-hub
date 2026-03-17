import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Receipt, Calendar, Tag, Package } from "lucide-react";

interface Invoice {
  id: string;
  order_number: string;
  total_amount: number;
  invoice_url: string | null;
  status: string;
  created_at: string;
}

const DealerInvoices = ({ userId }: { userId: string }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchInvoices();
  }, [userId]);

  const fetchInvoices = async () => {
    const { data } = await supabase
      .from("orders")
      .select("id, order_number, total_amount, invoice_url, status, created_at")
      .eq("user_id", userId)
      .eq("status", "delivered")
      .order("created_at", { ascending: false });
    setInvoices((data as Invoice[]) || []);
    setLoading(false);
  };

  const totalPaid = invoices.reduce((sum, i) => sum + Number(i.total_amount), 0);

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-16 rounded-lg bg-muted/50 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <h2 className="text-lg font-bold text-foreground">الفواتير</h2>

      {invoices.length === 0 ? (
        <Card className="border-dashed border-border/60">
          <CardContent className="p-10 text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
              <Receipt className="w-8 h-8 text-muted-foreground/40" />
            </div>
            <div>
              <p className="text-foreground font-bold text-base">لا توجد فواتير حتى الآن</p>
              <p className="text-sm text-muted-foreground mt-1">
                عند اكتمال طلباتك وتسليمها ستظهر فواتيرك هنا
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 justify-center pt-2">
              <Link to="/dealer?tab=quotes">
                <Button className="gap-2 rounded-xl">
                  <Tag className="w-4 h-4" />
                  ابدأ بتسعير منتجاتك
                </Button>
              </Link>
              <Link to="/dealer?tab=orders">
                <Button variant="outline" className="gap-2 rounded-xl">
                  <Package className="w-4 h-4" />
                  عرض الطلبات
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Card className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <Receipt className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">إجمالي الفواتير</p>
                  <p className="text-lg font-bold text-foreground">{invoices.length}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-emerald-500" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">إجمالي المبالغ</p>
                  <p className="text-lg font-bold text-foreground">{totalPaid.toLocaleString("ar-EG")} ج.م</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invoices List */}
          <div className="space-y-2">
            {invoices.map(inv => (
              <Card key={inv.id} className="border-border/50">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-lg bg-muted flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground text-sm">{inv.order_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(inv.created_at).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" })}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-left">
                      <p className="font-bold text-foreground text-sm">{Number(inv.total_amount).toLocaleString("ar-EG")} ج.م</p>
                      <Badge variant="default" className="text-[10px] h-5 bg-emerald-500/10 text-emerald-700 border-0">
                        تم التسليم
                      </Badge>
                    </div>
                    {inv.invoice_url && (
                      <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => window.open(inv.invoice_url!, "_blank")}>
                        <Download className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default DealerInvoices;
