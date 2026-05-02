import { useState, ReactNode } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileSpreadsheet, Download, Upload, Loader2, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

interface Props {
  trigger?: ReactNode;
  onSuccess?: () => void;
}

interface ParsedRow {
  sku: string;
  qty: number;
  rowIndex: number;
}

interface MatchedRow extends ParsedRow {
  status: "matched_site" | "matched_erp" | "not_found";
  product_id?: string;
  name?: string;
  erp_qty?: number;
}

/**
 * استيراد بلاغات نواقص بالجملة من ملف Excel.
 * كل صف لازم يحتوي: كود الصنف (SKU) + الكمية المطلوبة.
 * يطابق مع كتالوج الموقع أولاً، ثم مع كتالوج الفيصل، ثم يسجل البلاغات.
 */
export default function ShortageBulkImportDialog({ trigger, onSuccess }: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [matching, setMatching] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [rows, setRows] = useState<MatchedRow[]>([]);
  const [fileName, setFileName] = useState("");

  const reset = () => { setRows([]); setFileName(""); };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ["كود الصنف (SKU)", "الكمية المطلوبة"],
      ["90915-YZZD4", 5],
      ["48510-09L60", 2],
    ]);
    ws["!cols"] = [{ wch: 25 }, { wch: 18 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "نواقص");
    XLSX.writeFile(wb, "shortage_template.xlsx");
  };

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setParsing(true);
    setRows([]);

    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json<any[]>(ws, { header: 1 });

      // تخطي الهيدر إن وُجد
      const startIdx = data.length > 0 && isNaN(Number(String(data[0][1] ?? ""))) ? 1 : 0;
      const parsed: ParsedRow[] = [];
      for (let i = startIdx; i < data.length; i++) {
        const row = data[i];
        if (!row || row.length === 0) continue;
        const sku = String(row[0] ?? "").trim();
        const qty = Math.max(1, Math.floor(Number(row[1]) || 0));
        if (!sku || qty < 1) continue;
        parsed.push({ sku, qty, rowIndex: i + 1 });
      }

      if (parsed.length === 0) {
        toast({ title: "ملف فاضي", description: "لم يتم العثور على صفوف صالحة (كود + كمية)", variant: "destructive" });
        setParsing(false);
        return;
      }

      setParsing(false);
      setMatching(true);

      // 1) مطابقة مع كتالوج الموقع
      const skus = parsed.map(p => p.sku);
      const { data: siteProducts } = await supabase
        .from("products")
        .select("id, sku, name_ar")
        .in("sku", skus);

      const siteMap = new Map<string, { id: string; name: string }>();
      (siteProducts || []).forEach((p: any) => siteMap.set(p.sku, { id: p.id, name: p.name_ar }));

      // 2) لما الباقي مش موجود، طابق مع الفيصل
      const matched: MatchedRow[] = [];
      const needErp: ParsedRow[] = [];
      for (const p of parsed) {
        const site = siteMap.get(p.sku);
        if (site) {
          matched.push({ ...p, status: "matched_site", product_id: site.id, name: site.name });
        } else {
          needErp.push(p);
        }
      }

      // طابق مع الفيصل بالـ erp-search-products (سرّع البحث بالـ SKU كامل)
      for (const p of needErp) {
        try {
          const { data: erp } = await supabase.functions.invoke("erp-search-products", { body: { q: p.sku } });
          const exact = (erp?.results || []).find((r: any) =>
            String(r.erp_id).trim().toLowerCase() === p.sku.toLowerCase()
          );
          if (exact) {
            matched.push({
              ...p,
              status: "matched_erp",
              name: exact.name,
              erp_qty: exact.qty,
              product_id: exact.in_our_system ? exact.our_product_id : undefined,
            });
          } else {
            matched.push({ ...p, status: "not_found" });
          }
        } catch {
          matched.push({ ...p, status: "not_found" });
        }
      }

      matched.sort((a, b) => a.rowIndex - b.rowIndex);
      setRows(matched);
      setMatching(false);
    } catch (err: any) {
      toast({ title: "خطأ في قراءة الملف", description: err.message, variant: "destructive" });
      setParsing(false);
      setMatching(false);
    }
  };

  const handleSubmit = async () => {
    if (!user) return;
    const valid = rows.filter(r => r.status !== "not_found");
    if (valid.length === 0) {
      toast({ title: "مفيش أصناف مطابقة لإرسالها", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    const payload = valid.map(r => {
      const base: any = {
        staff_user_id: user.id,
        requested_quantity: r.qty,
      };
      if (r.product_id) {
        base.product_id = r.product_id;
      } else {
        base.manual_sku = r.sku;
        base.manual_name = r.name || r.sku;
      }
      return base;
    });

    const { error } = await supabase.from("stock_shortage_requests" as any).insert(payload);
    setSubmitting(false);
    if (error) {
      toast({ title: "فشل التسجيل", description: error.message, variant: "destructive" });
      return;
    }
    toast({
      title: `✅ تم تسجيل ${valid.length} بلاغ`,
      description: rows.length > valid.length ? `تم تجاهل ${rows.length - valid.length} صنف غير مطابق` : undefined,
    });
    reset();
    setOpen(false);
    onSuccess?.();
  };

  const stats = {
    site: rows.filter(r => r.status === "matched_site").length,
    erp: rows.filter(r => r.status === "matched_erp").length,
    notFound: rows.filter(r => r.status === "not_found").length,
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="gap-2">
            <FileSpreadsheet className="w-4 h-4" />
            استيراد إكسيل
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
            استيراد نواقص بالجملة من ملف Excel
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step 1: قالب */}
          <div className="border-2 border-dashed border-emerald-200 bg-emerald-50/40 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-600 text-white grid place-items-center font-bold text-sm shrink-0">1</div>
              <div className="flex-1">
                <p className="font-semibold text-sm mb-1">حمّل القالب الجاهز</p>
                <p className="text-xs text-muted-foreground mb-2">
                  ملف بعمودين: <strong>كود الصنف (SKU)</strong> و <strong>الكمية المطلوبة</strong>
                </p>
                <Button size="sm" variant="outline" onClick={downloadTemplate} className="gap-2">
                  <Download className="w-4 h-4" />
                  تحميل القالب
                </Button>
              </div>
            </div>
          </div>

          {/* Step 2: رفع */}
          <div className="border-2 border-dashed border-blue-200 bg-blue-50/40 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-600 text-white grid place-items-center font-bold text-sm shrink-0">2</div>
              <div className="flex-1">
                <p className="font-semibold text-sm mb-1">ارفع الملف بعد ما تملاه</p>
                <p className="text-xs text-muted-foreground mb-2">
                  هنطابق كل كود مع كتالوج الموقع والفيصل تلقائياً
                </p>
                <label className="inline-flex">
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
                  />
                  <Button size="sm" asChild className="gap-2 bg-blue-600 hover:bg-blue-700 cursor-pointer">
                    <span>
                      {parsing || matching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                      {parsing ? "جاري قراءة الملف..." : matching ? "جاري المطابقة..." : "اختر ملف Excel"}
                    </span>
                  </Button>
                </label>
                {fileName && <p className="text-[11px] text-muted-foreground mt-2 font-mono">{fileName}</p>}
              </div>
            </div>
          </div>

          {/* النتائج */}
          {rows.length > 0 && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-2">
                  <div className="text-xl font-bold text-emerald-700">{stats.site}</div>
                  <div className="text-[10px] text-emerald-600">على الموقع ✓</div>
                </div>
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-2">
                  <div className="text-xl font-bold text-blue-700">{stats.erp}</div>
                  <div className="text-[10px] text-blue-600">من الفيصل ✓</div>
                </div>
                <div className="rounded-lg bg-rose-50 border border-rose-200 p-2">
                  <div className="text-xl font-bold text-rose-700">{stats.notFound}</div>
                  <div className="text-[10px] text-rose-600">غير مطابق ✗</div>
                </div>
              </div>

              <ScrollArea className="h-64 border rounded-lg">
                <div className="p-2 space-y-1">
                  {rows.map((r, i) => (
                    <div
                      key={i}
                      className={`flex items-center gap-2 p-2 rounded text-xs ${
                        r.status === "matched_site" ? "bg-emerald-50" :
                        r.status === "matched_erp" ? "bg-blue-50" :
                        "bg-rose-50"
                      }`}
                    >
                      {r.status === "matched_site" && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                      {r.status === "matched_erp" && <AlertCircle className="w-4 h-4 text-blue-600 shrink-0" />}
                      {r.status === "not_found" && <XCircle className="w-4 h-4 text-rose-600 shrink-0" />}
                      <span dir="ltr" className="font-mono font-bold text-[11px] bg-white/70 px-1.5 py-0.5 rounded">
                        {r.sku}
                      </span>
                      <span className="flex-1 truncate text-foreground/80">
                        {r.name || <em className="text-rose-600">غير موجود في الكتالوج</em>}
                      </span>
                      <span className="font-bold tabular-nums">×{r.qty}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => { setOpen(false); reset(); }}>إلغاء</Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || rows.length === 0 || (stats.site + stats.erp) === 0}
            className="gap-2 bg-emerald-600 hover:bg-emerald-700"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            تسجيل {stats.site + stats.erp} بلاغ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
