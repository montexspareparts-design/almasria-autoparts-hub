import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Receipt, Calendar, Tag, Package, Printer, FileDown, Loader2 } from "lucide-react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import { isNativePlatform, openExternal, saveAndShareFile } from "@/lib/native";
import { toast } from "@/hooks/use-toast";

interface Invoice {
  id: string;
  order_number: string;
  total_amount: number;
  invoice_url: string | null;
  status: string;
  payment_method: string | null;
  created_at: string;
  coupon_discount: number | null;
}

const statusMap: Record<string, { label: string; color: string }> = {
  processing: { label: "جاري التجهيز", color: "bg-blue-500/10 text-blue-700" },
  ready: { label: "جاهز للاستلام", color: "bg-amber-500/10 text-amber-700" },
  shipped: { label: "تم الشحن", color: "bg-indigo-500/10 text-indigo-700" },
  delivered: { label: "تم التسليم", color: "bg-emerald-500/10 text-emerald-700" },
};

const DealerInvoices = ({ userId }: { userId: string }) => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, [userId]);

  const fetchInvoices = async () => {
    const { data } = await supabase
      .from("orders")
      .select("id, order_number, total_amount, invoice_url, status, payment_method, created_at, coupon_discount")
      .eq("user_id", userId)
      .in("status", ["processing", "ready", "shipped", "delivered"])
      .order("created_at", { ascending: false });
    setInvoices((data as Invoice[]) || []);
    setLoading(false);
  };

  const handlePrint = async (inv: Invoice) => {
    // On native iOS, `window.open("", "_blank") + window.print()` is not
    // supported inside WKWebView. Fall back to generating the PDF and
    // opening the system Share Sheet, which offers "Print" natively.
    if (isNativePlatform()) {
      await handleDownloadPDF(inv);
      return;
    }
    // Fetch order items with product details
    const { data: items } = await supabase
      .from("order_items")
      .select("quantity, unit_price, total_price, product_id, products(name_ar, sku)")
      .eq("order_id", inv.id);

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;


    const discount = Number(inv.coupon_discount || 0);
    const total = Number(inv.total_amount);
    const subtotal = (items || []).reduce((s, it) => s + Number(it.total_price), 0);

    const itemsRows = (items || []).map((item: any, idx: number) => `
      <tr>
        <td style="padding:10px 12px; border-bottom:1px solid #eee; text-align:center; color:#888; font-size:13px;">${idx + 1}</td>
        <td style="padding:10px 12px; border-bottom:1px solid #eee;">
          <div style="font-weight:700; font-size:13px;">${item.products?.name_ar || "—"}</div>
          <div style="font-size:11px; color:#888; font-family:monospace;">${item.products?.sku || ""}</div>
        </td>
        <td style="padding:10px 12px; border-bottom:1px solid #eee; text-align:center; font-weight:600;">${item.quantity}</td>
        <td style="padding:10px 12px; border-bottom:1px solid #eee; text-align:center;">${Number(item.unit_price).toLocaleString("ar-EG")} ج.م</td>
        <td style="padding:10px 12px; border-bottom:1px solid #eee; text-align:center; font-weight:700;">${Number(item.total_price).toLocaleString("ar-EG")} ج.م</td>
      </tr>
    `).join("");

    printWindow.document.write(`
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8" />
        <title>فاتورة ${inv.order_number}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Segoe UI', Tahoma, sans-serif; padding: 40px; color: #1a1a1a; }
          .header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #c41e3a; padding-bottom: 20px; margin-bottom: 30px; }
          .company { font-size: 24px; font-weight: 900; color: #c41e3a; }
          .company-sub { font-size: 12px; color: #666; margin-top: 4px; }
          .invoice-title { font-size: 28px; font-weight: 900; color: #333; }
          .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
          .info-box { background: #f8f8f8; padding: 16px; border-radius: 8px; }
          .info-label { font-size: 11px; color: #888; margin-bottom: 4px; }
          .info-value { font-size: 15px; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          thead th { background: #f8f8f8; padding: 12px; font-size: 12px; color: #666; font-weight: 700; border-bottom: 2px solid #ddd; }
          .totals { margin-top: 10px; }
          .totals-row { display: flex; justify-content: space-between; padding: 8px 16px; font-size: 14px; }
          .totals-row.main { background: #c41e3a; color: white; border-radius: 10px; margin-top: 8px; padding: 16px 20px; font-size: 20px; font-weight: 900; }
          .discount-row { background: #fef3cd; border-radius: 8px; }
          .footer { margin-top: 40px; text-align: center; font-size: 11px; color: #999; border-top: 1px solid #eee; padding-top: 16px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <div class="company">المصرية جروب</div>
            <div class="company-sub">Al Masria Group — Auto Parts</div>
          </div>
          <div class="invoice-title">فاتورة</div>
        </div>

        <div class="info-grid">
          <div class="info-box">
            <div class="info-label">رقم الطلب</div>
            <div class="info-value">${inv.order_number}</div>
          </div>
          <div class="info-box">
            <div class="info-label">تاريخ الطلب</div>
            <div class="info-value">${new Date(inv.created_at).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}</div>
          </div>
          <div class="info-box">
            <div class="info-label">طريقة الدفع</div>
            <div class="info-value">${inv.payment_method === "cash" ? "كاش" : inv.payment_method === "card" ? "بطاقة بنكية" : inv.payment_method === "bank_transfer" ? "تحويل بنكي" : inv.payment_method || "—"}</div>
          </div>
          <div class="info-box">
            <div class="info-label">الحالة</div>
            <div class="info-value" style="color: #16a34a;">✅ تم التسليم</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="text-align:center; width:50px;">#</th>
              <th style="text-align:right;">الصنف</th>
              <th style="text-align:center; width:80px;">الكمية</th>
              <th style="text-align:center; width:120px;">سعر الوحدة</th>
              <th style="text-align:center; width:120px;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <div class="totals">
          <div class="totals-row" style="font-weight:600;">
            <span>المجموع الفرعي (${(items || []).length} صنف)</span>
            <span>${subtotal.toLocaleString("ar-EG")} ج.م</span>
          </div>
          ${discount > 0 ? `<div class="totals-row discount-row"><span>خصم كوبون</span><span>- ${discount.toLocaleString("ar-EG")} ج.م</span></div>` : ""}
          <div class="totals-row main">
            <span>إجمالي الفاتورة</span>
            <span>${total.toLocaleString("ar-EG")} ج.م</span>
          </div>
        </div>

        <div class="footer">
          المصرية جروب لقطع غيار السيارات — جميع الحقوق محفوظة © ${new Date().getFullYear()}
        </div>

        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const buildInvoiceHTML = (inv: Invoice, items: any[]) => {
    const discount = Number(inv.coupon_discount || 0);
    const total = Number(inv.total_amount);
    const subtotal = items.reduce((s: number, it: any) => s + Number(it.total_price), 0);

    const itemsRows = items.map((item: any, idx: number) => `
      <tr>
        <td style="padding:8px 10px; border-bottom:1px solid #eee; text-align:center; color:#888; font-size:12px;">${idx + 1}</td>
        <td style="padding:8px 10px; border-bottom:1px solid #eee;">
          <div style="font-weight:700; font-size:12px;">${item.products?.name_ar || "—"}</div>
          <div style="font-size:10px; color:#888; font-family:monospace;">${item.products?.sku || ""}</div>
        </td>
        <td style="padding:8px 10px; border-bottom:1px solid #eee; text-align:center; font-weight:600;">${item.quantity}</td>
        <td style="padding:8px 10px; border-bottom:1px solid #eee; text-align:center;">${Number(item.unit_price).toLocaleString("ar-EG")} ج.م</td>
        <td style="padding:8px 10px; border-bottom:1px solid #eee; text-align:center; font-weight:700;">${Number(item.total_price).toLocaleString("ar-EG")} ج.م</td>
      </tr>
    `).join("");

    return `
      <div style="font-family:'Segoe UI',Tahoma,sans-serif; padding:30px; color:#1a1a1a; direction:rtl; width:700px; background:white;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #c41e3a; padding-bottom:16px; margin-bottom:24px;">
          <div>
            <div style="font-size:22px; font-weight:900; color:#c41e3a;">المصرية جروب</div>
            <div style="font-size:11px; color:#666; margin-top:3px;">Al Masria Group — Auto Parts</div>
          </div>
          <div style="font-size:24px; font-weight:900; color:#333;">فاتورة</div>
        </div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:14px; margin-bottom:24px;">
          <div style="background:#f8f8f8; padding:12px; border-radius:6px;">
            <div style="font-size:10px; color:#888; margin-bottom:3px;">رقم الطلب</div>
            <div style="font-size:14px; font-weight:700;">${inv.order_number}</div>
          </div>
          <div style="background:#f8f8f8; padding:12px; border-radius:6px;">
            <div style="font-size:10px; color:#888; margin-bottom:3px;">تاريخ الطلب</div>
            <div style="font-size:14px; font-weight:700;">${new Date(inv.created_at).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" })}</div>
          </div>
          <div style="background:#f8f8f8; padding:12px; border-radius:6px;">
            <div style="font-size:10px; color:#888; margin-bottom:3px;">طريقة الدفع</div>
            <div style="font-size:14px; font-weight:700;">${inv.payment_method === "cash" ? "كاش" : inv.payment_method === "card" ? "بطاقة بنكية" : inv.payment_method === "bank_transfer" ? "تحويل بنكي" : inv.payment_method || "—"}</div>
          </div>
          <div style="background:#f8f8f8; padding:12px; border-radius:6px;">
            <div style="font-size:10px; color:#888; margin-bottom:3px;">الحالة</div>
            <div style="font-size:14px; font-weight:700; color:#16a34a;">✅ تم التسليم</div>
          </div>
        </div>

        <table style="width:100%; border-collapse:collapse; margin-bottom:16px;">
          <thead>
            <tr>
              <th style="text-align:center; width:40px; background:#f8f8f8; padding:10px; font-size:11px; color:#666; font-weight:700; border-bottom:2px solid #ddd;">#</th>
              <th style="text-align:right; background:#f8f8f8; padding:10px; font-size:11px; color:#666; font-weight:700; border-bottom:2px solid #ddd;">الصنف</th>
              <th style="text-align:center; width:70px; background:#f8f8f8; padding:10px; font-size:11px; color:#666; font-weight:700; border-bottom:2px solid #ddd;">الكمية</th>
              <th style="text-align:center; width:100px; background:#f8f8f8; padding:10px; font-size:11px; color:#666; font-weight:700; border-bottom:2px solid #ddd;">سعر الوحدة</th>
              <th style="text-align:center; width:100px; background:#f8f8f8; padding:10px; font-size:11px; color:#666; font-weight:700; border-bottom:2px solid #ddd;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>${itemsRows}</tbody>
        </table>

        <div style="margin-top:10px;">
          <div style="display:flex; justify-content:space-between; padding:8px 14px; font-size:13px; font-weight:600;">
            <span>المجموع الفرعي (${items.length} صنف)</span>
            <span>${subtotal.toLocaleString("ar-EG")} ج.م</span>
          </div>
          ${discount > 0 ? `<div style="display:flex; justify-content:space-between; padding:8px 14px; font-size:13px; background:#fef3cd; border-radius:6px;"><span>خصم كوبون</span><span>- ${discount.toLocaleString("ar-EG")} ج.م</span></div>` : ""}
          <div style="display:flex; justify-content:space-between; padding:14px 18px; font-size:18px; font-weight:900; background:#c41e3a; color:white; border-radius:8px; margin-top:8px;">
            <span>إجمالي الفاتورة</span>
            <span>${total.toLocaleString("ar-EG")} ج.م</span>
          </div>
        </div>

        <div style="margin-top:30px; text-align:center; font-size:10px; color:#999; border-top:1px solid #eee; padding-top:14px;">
          المصرية جروب لقطع غيار السيارات — جميع الحقوق محفوظة © ${new Date().getFullYear()}
        </div>
      </div>
    `;
  };

  const handleDownloadPDF = async (inv: Invoice) => {
    setDownloadingId(inv.id);
    try {
      const { data: items } = await supabase
        .from("order_items")
        .select("quantity, unit_price, total_price, product_id, products(name_ar, sku)")
        .eq("order_id", inv.id);

      // Create a hidden container
      const container = document.createElement("div");
      container.style.position = "fixed";
      container.style.left = "-9999px";
      container.style.top = "0";
      container.innerHTML = buildInvoiceHTML(inv, items || []);
      document.body.appendChild(container);

      // Wait for render
      await new Promise(r => setTimeout(r, 200));

      const canvas = await html2canvas(container.firstElementChild as HTMLElement, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#ffffff",
      });

      document.body.removeChild(container);

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight);
      const blob = pdf.output("blob");
      await saveAndShareFile(
        { kind: "blob", blob },
        `فاتورة-${inv.order_number}.pdf`,
        { dialogTitle: `فاتورة ${inv.order_number}` }
      );
    } catch (err) {
      console.error("PDF generation error:", err);
    } finally {
      setDownloadingId(null);
    }
  };

  const totalPaid = invoices
    .filter(i => i.status === "delivered")
    .reduce((sum, i) => sum + Number(i.total_amount), 0);

  const deliveredCount = invoices.filter(i => i.status === "delivered").length;

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
                عند اكتمال طلباتك وسدادها ستظهر فواتيرك هنا
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
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  <p className="text-[11px] text-muted-foreground">تم التسليم والسداد</p>
                  <p className="text-lg font-bold text-foreground">{deliveredCount}</p>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <Calendar className="w-5 h-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">إجمالي المسدد</p>
                  <p className="text-lg font-bold text-foreground">{totalPaid.toLocaleString("ar-EG")} ج.م</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Invoices List */}
          <div className="space-y-2">
            {invoices.map(inv => {
              const isDelivered = inv.status === "delivered";
              const st = statusMap[inv.status] || { label: inv.status, color: "bg-muted text-muted-foreground" };

              return (
                <Card key={inv.id} className={`border-border/50 ${isDelivered ? "" : "opacity-90"}`}>
                  <CardContent className="p-4 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${isDelivered ? "bg-emerald-500/10" : "bg-muted"}`}>
                        <FileText className={`w-4 h-4 ${isDelivered ? "text-emerald-600" : "text-muted-foreground"}`} />
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-foreground text-sm">{inv.order_number}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(inv.created_at).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-start space-y-1">
                        <p className="font-bold text-foreground text-sm">{Number(inv.total_amount).toLocaleString("ar-EG")} ج.م</p>
                        <Badge variant="secondary" className={`text-[10px] h-5 border-0 ${st.color}`}>
                          {st.label}
                        </Badge>
                      </div>

                      {/* PDF Download - only for delivered & paid */}
                      {isDelivered && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 text-primary hover:bg-primary/10"
                          title="تحميل PDF"
                          disabled={downloadingId === inv.id}
                          onClick={() => handleDownloadPDF(inv)}
                        >
                          {downloadingId === inv.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <FileDown className="w-4 h-4" />
                          )}
                        </Button>
                      )}

                      {/* Print - only for delivered & paid */}
                      {isDelivered && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-8 h-8 text-muted-foreground hover:bg-muted"
                          title="طباعة الفاتورة"
                          onClick={() => handlePrint(inv)}
                        >
                          <Printer className="w-4 h-4" />
                        </Button>
                      )}

                      {inv.invoice_url && (
                        <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => openExternal(inv.invoice_url!)}>
                          <Download className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};

export default DealerInvoices;