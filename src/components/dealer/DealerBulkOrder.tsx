import { useState, useRef } from "react";
import * as XLSX from "xlsx";
import { motion } from "framer-motion";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, Download, Loader2, ShoppingCart, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDealerCart } from "@/hooks/useDealerCart";
import { toast } from "sonner";

interface ParsedRow {
  sku: string;
  qty: number;
  matched?: {
    product_id: string;
    name_ar: string;
    base_price: number;
    stock_quantity: number;
  };
  status: "matched" | "unmatched" | "out_of_stock";
}

const DealerBulkOrder = () => {
  const { user } = useAuth();
  const cart = useDealerCart();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState<string>("");
  const [processing, setProcessing] = useState(false);
  const [adding, setAdding] = useState(false);

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["كود الصنف (SKU)", "الكمية"],
      ["12918", 2],
      ["12345", 5],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Order");
    XLSX.writeFile(wb, "bulk_order_template.xlsx");
  };

  const handleFile = async (file: File) => {
    setProcessing(true);
    setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, blankrows: false });
      // skip header row if first cell is text
      const startIdx = data[0] && isNaN(Number(data[0][0])) ? 1 : 0;
      const parsed: { sku: string; qty: number }[] = [];
      for (let i = startIdx; i < data.length; i++) {
        const sku = String(data[i][0] ?? "").trim();
        const qty = parseInt(String(data[i][1] ?? "1"), 10);
        if (sku && qty > 0) parsed.push({ sku, qty });
      }
      if (parsed.length === 0) {
        toast.error("الملف فارغ أو غير صالح");
        setProcessing(false);
        return;
      }

      const skus = [...new Set(parsed.map(p => p.sku))];
      const { data: products } = await supabase
        .from("products")
        .select("id, sku, name_ar, base_price, stock_quantity")
        .in("sku", skus)
        .eq("is_active", true);

      const prodMap = new Map((products ?? []).map(p => [p.sku, p]));
      const result: ParsedRow[] = parsed.map(p => {
        const m = prodMap.get(p.sku);
        if (!m) return { ...p, status: "unmatched" };
        if ((m.stock_quantity ?? 0) <= 0) return { ...p, matched: m, status: "out_of_stock" };
        return { ...p, matched: m, status: "matched" };
      });
      setRows(result);
    } catch (e) {
      toast.error("خطأ في قراءة الملف");
    } finally {
      setProcessing(false);
    }
  };

  const addAllToCart = async () => {
    if (!user) return;
    setAdding(true);
    const ok = rows.filter(r => r.status === "matched" && r.matched);
    let added = 0;
    for (const r of ok) {
      const res = await cart.addItem(r.matched!.product_id, r.qty);
      if (res !== false) added++;
    }
    await supabase.from("dealer_bulk_uploads").insert({
      user_id: user.id,
      filename: fileName,
      total_rows: rows.length,
      matched_count: ok.length,
      added_to_cart: added,
      unmatched_skus: rows.filter(r => r.status !== "matched").map(r => r.sku),
    });
    setAdding(false);
    toast.success(`تمت إضافة ${added} منتج إلى السلة`);
    setRows([]);
    setFileName("");
  };

  const matchedCount = rows.filter(r => r.status === "matched").length;
  const unmatchedCount = rows.filter(r => r.status === "unmatched").length;
  const oosCount = rows.filter(r => r.status === "out_of_stock").length;
  const totalValue = rows
    .filter(r => r.status === "matched" && r.matched)
    .reduce((s, r) => s + (r.matched!.base_price * r.qty), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold mb-1">رفع طلب من Excel</h1>
          <p className="text-sm text-muted-foreground">ارفع ملف Excel فيه أكواد الأصناف والكميات، وهيتم إضافتهم للسلة في ثواني.</p>
        </div>
        <Button variant="outline" onClick={downloadTemplate} className="gap-2">
          <Download className="w-4 h-4" /> تنزيل نموذج Excel
        </Button>
      </div>

      {rows.length === 0 ? (
        <Card className="p-12 border-2 border-dashed">
          <div className="flex flex-col items-center text-center">
            <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
              <FileSpreadsheet className="w-10 h-10 text-primary" />
            </div>
            <h3 className="font-bold text-lg mb-2">اسحب الملف هنا أو اضغط للاختيار</h3>
            <p className="text-sm text-muted-foreground mb-4">يدعم .xlsx و .xls — العمود الأول: كود الصنف، العمود الثاني: الكمية</p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            />
            <Button onClick={() => fileInputRef.current?.click()} disabled={processing} className="gap-2">
              {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {processing ? "جاري المعالجة..." : "اختر ملف"}
            </Button>
          </div>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Card className="p-4">
              <div className="text-xs text-muted-foreground mb-1">إجمالي السطور</div>
              <div className="text-2xl font-bold">{rows.length}</div>
            </Card>
            <Card className="p-4 border-emerald-500/30 bg-emerald-500/5">
              <div className="text-xs text-emerald-700 dark:text-emerald-400 mb-1">جاهز للإضافة</div>
              <div className="text-2xl font-bold text-emerald-600">{matchedCount}</div>
            </Card>
            <Card className="p-4 border-orange-500/30 bg-orange-500/5">
              <div className="text-xs text-orange-700 dark:text-orange-400 mb-1">نافد المخزون</div>
              <div className="text-2xl font-bold text-orange-600">{oosCount}</div>
            </Card>
            <Card className="p-4 border-rose-500/30 bg-rose-500/5">
              <div className="text-xs text-rose-700 dark:text-rose-400 mb-1">غير موجود</div>
              <div className="text-2xl font-bold text-rose-600">{unmatchedCount}</div>
            </Card>
          </div>

          <Card className="overflow-hidden">
            <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
              <div className="text-sm font-semibold">{fileName}</div>
              <Button variant="ghost" size="sm" onClick={() => { setRows([]); setFileName(""); }} className="gap-1">
                <X className="w-4 h-4" /> إلغاء
              </Button>
            </div>
            <div className="max-h-[400px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/20 sticky top-0">
                  <tr>
                    <th className="text-right p-3">الكود</th>
                    <th className="text-right p-3">المنتج</th>
                    <th className="text-center p-3">الكمية</th>
                    <th className="text-center p-3">السعر</th>
                    <th className="text-center p-3">الحالة</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <motion.tr
                      key={i}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.01 }}
                      className="border-t hover:bg-muted/20"
                    >
                      <td className="p-3 font-mono">{r.sku}</td>
                      <td className="p-3 truncate max-w-[300px]">{r.matched?.name_ar ?? "—"}</td>
                      <td className="p-3 text-center font-bold">{r.qty}</td>
                      <td className="p-3 text-center">{r.matched ? `${r.matched.base_price.toFixed(2)} ج` : "—"}</td>
                      <td className="p-3 text-center">
                        {r.status === "matched" && (
                          <Badge variant="default" className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 gap-1">
                            <CheckCircle2 className="w-3 h-3" /> جاهز
                          </Badge>
                        )}
                        {r.status === "out_of_stock" && (
                          <Badge variant="default" className="bg-orange-500/15 text-orange-700 dark:text-orange-400">نافد</Badge>
                        )}
                        {r.status === "unmatched" && (
                          <Badge variant="default" className="bg-rose-500/15 text-rose-700 dark:text-rose-400 gap-1">
                            <AlertCircle className="w-3 h-3" /> غير موجود
                          </Badge>
                        )}
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t bg-muted/20 flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm">
                <span className="text-muted-foreground">إجمالي المتاح: </span>
                <span className="font-bold text-lg text-primary">{totalValue.toFixed(2)} ج</span>
              </div>
              <Button onClick={addAllToCart} disabled={adding || matchedCount === 0} size="lg" className="gap-2">
                {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShoppingCart className="w-4 h-4" />}
                إضافة {matchedCount} منتج إلى السلة
              </Button>
            </div>
          </Card>
        </>
      )}
    </div>
  );
};

export default DealerBulkOrder;
