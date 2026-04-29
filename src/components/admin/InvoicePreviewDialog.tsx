import { useRef, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Download, Image as ImageIcon, MessageCircle, Loader2, Printer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface InvoiceItem {
  name_ar?: string;
  sku?: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface InvoicePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  order: {
    order_number: string;
    created_at: string;
    total_amount: number;
    coupon_discount?: number | null;
    shipping_address?: string | null;
    shipping_governorate?: string | null;
    pickup_branch?: string | null;
    payment_method?: string | null;
    items: InvoiceItem[];
    customer_name?: string;
    customer_phone?: string;
  };
}

export default function InvoicePreviewDialog({ open, onOpenChange, order }: InvoicePreviewDialogProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const { toast } = useToast();

  const itemsTotal = order.items.reduce((s, it) => s + Number(it.total_price || 0), 0);
  const discount = Number(order.coupon_discount || 0);
  const shipping = Math.max(0, Number(order.total_amount) - itemsTotal + discount);
  const fmt = (n: number) => Number(n).toLocaleString("ar-EG");
  const dateStr = new Date(order.created_at).toLocaleDateString("ar-EG", {
    year: "numeric", month: "long", day: "numeric"
  });

  const renderCanvas = async () => {
    if (!invoiceRef.current) return null;
    return await html2canvas(invoiceRef.current, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
      logging: false,
    });
  };

  const handleDownloadPDF = async () => {
    setBusy("pdf");
    try {
      const canvas = await renderCanvas();
      if (!canvas) return;
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * pageWidth) / canvas.width;
      pdf.addImage(imgData, "PNG", 0, 0, pageWidth, imgHeight);
      pdf.save(`فاتورة-${order.order_number}.pdf`);
      toast({ title: "تم تحميل الـ PDF ✓" });
    } catch (e) {
      toast({ title: "فشل التحميل", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const handleDownloadImage = async () => {
    setBusy("img");
    try {
      const canvas = await renderCanvas();
      if (!canvas) return;
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `فاتورة-${order.order_number}.png`;
        a.click();
        URL.revokeObjectURL(url);
      }, "image/png");
      toast({ title: "تم حفظ الصورة ✓ — ارفعها على الواتساب" });
    } catch (e) {
      toast({ title: "فشل الحفظ", variant: "destructive" });
    } finally {
      setBusy(null);
    }
  };

  const handleWhatsApp = () => {
    const lines = [
      `🧾 *فاتورة طلبك من المصرية لقطع غيار السيارات*`,
      `رقم الطلب: *${order.order_number}*`,
      `التاريخ: ${dateStr}`,
      ``,
      `*المنتجات:*`,
      ...order.items.map(it => `• ${it.name_ar || "منتج"}\n   ${it.quantity} × ${fmt(it.unit_price)} = ${fmt(it.total_price)} ج.م`),
      ``,
      `المنتجات: ${fmt(itemsTotal)} ج.م`,
      shipping > 0 ? `الشحن: ${fmt(shipping)} ج.م` : `الاستلام: من الفرع`,
      discount > 0 ? `الخصم: -${fmt(discount)} ج.م` : "",
      `━━━━━━━━━━━━`,
      `💰 *الإجمالي: ${fmt(order.total_amount)} ج.م*`,
      ``,
      order.shipping_address ? `📍 العنوان: ${order.shipping_address}` : "",
      `شكراً لتعاملك معنا 🌹`,
    ].filter(Boolean).join("\n");
    const phoneRaw = (order.customer_phone || "").replace(/\D/g, "");
    const waPhone = phoneRaw.startsWith("0") ? "20" + phoneRaw.slice(1) : phoneRaw.startsWith("20") ? phoneRaw : phoneRaw;
    const url = waPhone ? `https://wa.me/${waPhone}?text=${encodeURIComponent(lines)}` : `https://wa.me/?text=${encodeURIComponent(lines)}`;
    window.open(url, "_blank");
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto p-0">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle>معاينة الفاتورة — {order.order_number}</DialogTitle>
        </DialogHeader>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2 px-6 pb-3 border-b border-border">
          <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700 text-white" onClick={handleWhatsApp}>
            <MessageCircle className="w-4 h-4" />
            إرسال على واتساب
          </Button>
          <Button size="sm" variant="outline" className="gap-2" disabled={busy === "pdf"} onClick={handleDownloadPDF}>
            {busy === "pdf" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            تحميل PDF
          </Button>
          <Button size="sm" variant="outline" className="gap-2" disabled={busy === "img"} onClick={handleDownloadImage}>
            {busy === "img" ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImageIcon className="w-4 h-4" />}
            حفظ صورة (للواتساب)
          </Button>
          <Button size="sm" variant="outline" className="gap-2" onClick={handlePrint}>
            <Printer className="w-4 h-4" />
            طباعة
          </Button>
        </div>

        {/* Invoice content (rendered to canvas) */}
        <div className="p-6 bg-muted/30">
          <div
            ref={invoiceRef}
            dir="rtl"
            className="bg-white text-gray-900 p-8 rounded-lg shadow-sm mx-auto"
            style={{ width: "100%", maxWidth: "720px", fontFamily: "Cairo, system-ui, sans-serif" }}
          >
            {/* Header */}
            <div className="flex items-start justify-between border-b-2 border-gray-900 pb-4 mb-5">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-1">المصرية لقطع غيار السيارات</h1>
                <p className="text-sm text-gray-600">Al Masria Auto Parts</p>
                <p className="text-xs text-gray-500 mt-1">almasriaautoparts.com</p>
              </div>
              <div className="text-left">
                <div className="inline-block bg-gray-900 text-white px-4 py-2 rounded">
                  <p className="text-xs opacity-80">فاتورة</p>
                  <p className="text-base font-bold">{order.order_number}</p>
                </div>
                <p className="text-xs text-gray-600 mt-2">{dateStr}</p>
              </div>
            </div>

            {/* Customer */}
            {(order.customer_name || order.customer_phone || order.shipping_address) && (
              <div className="bg-gray-50 border border-gray-200 rounded p-3 mb-5 text-sm">
                <p className="font-semibold text-gray-700 mb-1">بيانات العميل:</p>
                {order.customer_name && <p>الاسم: {order.customer_name}</p>}
                {order.customer_phone && <p>الموبايل: <span dir="ltr">{order.customer_phone}</span></p>}
                {order.shipping_address && <p className="text-xs text-gray-600 mt-1">العنوان: {order.shipping_address}</p>}
                {order.pickup_branch && <p className="text-xs text-gray-600">الاستلام من: {order.pickup_branch}</p>}
              </div>
            )}

            {/* Items table */}
            <table className="w-full text-sm border-collapse mb-5">
              <thead>
                <tr className="bg-gray-900 text-white">
                  <th className="text-right p-2 font-semibold">الصنف</th>
                  <th className="text-center p-2 font-semibold w-20">الكود</th>
                  <th className="text-center p-2 font-semibold w-16">الكمية</th>
                  <th className="text-center p-2 font-semibold w-24">السعر</th>
                  <th className="text-center p-2 font-semibold w-24">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((it, i) => (
                  <tr key={i} className="border-b border-gray-200">
                    <td className="p-2">{it.name_ar || "منتج"}</td>
                    <td className="text-center p-2 text-xs text-gray-600 font-mono">{it.sku || "—"}</td>
                    <td className="text-center p-2">{fmt(it.quantity)}</td>
                    <td className="text-center p-2">{fmt(it.unit_price)}</td>
                    <td className="text-center p-2 font-semibold">{fmt(it.total_price)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totals */}
            <div className="flex justify-end">
              <div className="w-72 text-sm space-y-1.5">
                <div className="flex justify-between text-gray-700">
                  <span>إجمالي المنتجات:</span>
                  <span>{fmt(itemsTotal)} ج.م</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-700">
                    <span>الخصم{order["coupon_code" as keyof typeof order] ? ` (${(order as any).coupon_code})` : ""}:</span>
                    <span>- {fmt(discount)} ج.م</span>
                  </div>
                )}
                {shipping > 0 ? (
                  <div className="flex justify-between text-gray-700">
                    <span>الشحن{order.shipping_governorate ? ` (${order.shipping_governorate})` : ""}:</span>
                    <span>{fmt(shipping)} ج.م</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-gray-700">
                    <span>الاستلام:</span>
                    <span>من الفرع</span>
                  </div>
                )}
                <div className="border-t-2 border-gray-900 pt-2 mt-2 flex justify-between text-lg font-bold text-gray-900">
                  <span>الإجمالي النهائي:</span>
                  <span>{fmt(order.total_amount)} ج.م</span>
                </div>
                {order.payment_method && (
                  <p className="text-xs text-gray-500 text-left mt-1">طريقة الدفع: {order.payment_method}</p>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 mt-6 pt-4 text-center text-xs text-gray-500">
              <p>شكراً لتعاملكم معنا — ضمان أصلي على جميع المنتجات</p>
              <p className="mt-1">للاستفسار: 01017354551 — almasriaautoparts.com</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
