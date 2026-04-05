import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle, Loader2, AlertTriangle, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as XLSX from "xlsx";
import type { Database } from "@/integrations/supabase/types";

type ProductBrand = Database["public"]["Enums"]["product_brand"];

const VALID_BRANDS: ProductBrand[] = ["toyota_genuine", "toyota_oils", "mtx_aftermarket", "denso", "aisin", "fbk"];

const brandLabels: Record<string, ProductBrand> = {
  "toyota_genuine": "toyota_genuine",
  "toyota_oils": "toyota_oils",
  "mtx_aftermarket": "mtx_aftermarket",
  "denso": "denso",
  "aisin": "aisin",
  "fbk": "fbk",
  "تويوتا أصلي": "toyota_genuine",
  "زيوت تويوتا": "toyota_oils",
  "mtx": "mtx_aftermarket",
  "ام تي اكس": "mtx_aftermarket",
  "دينسو": "denso",
  "ايسن": "aisin",
  "فرامل": "fbk",
};

interface ParsedRow {
  rowNum: number;
  sku: string;
  name_ar: string;
  name_en: string;
  brand: ProductBrand | null;
  brandRaw: string;
  category_slug: string;
  base_price: number;
  sale_price: number | null;
  stock_quantity: number;
  min_order_qty: number;
  description_ar: string;
  image_url: string;
  erp_item_code: string;
  compatible_models: string[];
  year_from: number | null;
  year_to: number | null;
  errors: string[];
  status: "valid" | "warning" | "error";
}

interface CategoryMap {
  [slug: string]: string; // slug -> id
}

const TEMPLATE_COLUMNS = [
  "رقم القطعة (SKU)*",
  "الاسم بالعربي*",
  "الاسم بالإنجليزي",
  "الماركة*",
  "التصنيف (slug)",
  "السعر الأساسي*",
  "سعر العرض",
  "الكمية في المخزون",
  "أقل كمية للطلب",
  "الوصف بالعربي",
  "رابط الصورة",
  "كود الفيصل (ERP)",
  "الموديلات المتوافقة",
  "سنة من",
  "سنة إلى",
];

const AdminBulkImport = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [categoryMap, setCategoryMap] = useState<CategoryMap>({});
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; errors: string[] } | null>(null);
  const [fileName, setFileName] = useState("");

  useEffect(() => {
    supabase.from("product_categories").select("id, slug").then(({ data }) => {
      const map: CategoryMap = {};
      (data || []).forEach(c => { map[c.slug] = c.id; });
      setCategoryMap(map);
    });
  }, []);

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      TEMPLATE_COLUMNS,
      ["04152-YZZA1", "فلتر زيت كورولا", "Oil Filter Corolla", "toyota_genuine", "filters", "120", "", "50", "1", "فلتر زيت أصلي تويوتا", "", "10001", "كورولا,يارس", "2015", "2024"],
      ["MTX-BP-001", "تيل فرامل أمامي كامري", "Front Brake Pad Camry", "fbk", "brakes", "350", "299", "30", "2", "", "", "", "كامري", "2018", "2023"],
    ]);

    // Set column widths
    ws["!cols"] = TEMPLATE_COLUMNS.map(() => ({ wch: 20 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المنتجات");
    XLSX.writeFile(wb, "قالب_استيراد_المنتجات.xlsx");
  };

  const resolveBrand = (raw: string): ProductBrand | null => {
    if (!raw) return null;
    const trimmed = raw.trim().toLowerCase();
    // Direct match
    if (VALID_BRANDS.includes(trimmed as ProductBrand)) return trimmed as ProductBrand;
    // Label match
    for (const [label, brand] of Object.entries(brandLabels)) {
      if (label.toLowerCase() === trimmed) return brand;
    }
    return null;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportResult(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });

        if (jsonData.length === 0) {
          toast({ title: "الملف فارغ", variant: "destructive" });
          return;
        }

        const rows: ParsedRow[] = jsonData.map((row: any, idx: number) => {
          const errors: string[] = [];

          // Map columns flexibly
          const sku = (row["رقم القطعة (SKU)*"] || row["SKU"] || row["sku"] || row["رقم القطعة"] || "").toString().trim();
          const name_ar = (row["الاسم بالعربي*"] || row["الاسم بالعربي"] || row["name_ar"] || row["الاسم"] || "").toString().trim();
          const name_en = (row["الاسم بالإنجليزي"] || row["name_en"] || "").toString().trim();
          const brandRaw = (row["الماركة*"] || row["الماركة"] || row["brand"] || "").toString().trim();
          const category_slug = (row["التصنيف (slug)"] || row["التصنيف"] || row["category"] || "").toString().trim();
          const base_price = parseFloat(row["السعر الأساسي*"] || row["السعر الأساسي"] || row["السعر"] || row["base_price"] || "0") || 0;
          const sale_price_raw = row["سعر العرض"] || row["sale_price"] || "";
          const sale_price = sale_price_raw ? parseFloat(sale_price_raw) || null : null;
          const stock_quantity = parseInt(row["الكمية في المخزون"] || row["stock_quantity"] || row["الكمية"] || "0") || 0;
          const min_order_qty = parseInt(row["أقل كمية للطلب"] || row["min_order_qty"] || "1") || 1;
          const description_ar = (row["الوصف بالعربي"] || row["description_ar"] || "").toString().trim();
          const image_url = (row["رابط الصورة"] || row["image_url"] || "").toString().trim();
          const erp_item_code = (row["كود الفيصل (ERP)"] || row["erp_item_code"] || row["كود الفيصل"] || "").toString().trim();
          const modelsRaw = (row["الموديلات المتوافقة"] || row["compatible_models"] || "").toString().trim();
          const compatible_models = modelsRaw ? modelsRaw.split(/[,،]/).map((m: string) => m.trim()).filter(Boolean) : [];
          const year_from_raw = row["سنة من"] || row["year_from"] || "";
          const year_to_raw = row["سنة إلى"] || row["year_to"] || "";
          const year_from = year_from_raw ? parseInt(year_from_raw) || null : null;
          const year_to = year_to_raw ? parseInt(year_to_raw) || null : null;

          // Validation
          if (!sku) errors.push("SKU مطلوب");
          if (!name_ar) errors.push("الاسم العربي مطلوب");
          if (!brandRaw) errors.push("الماركة مطلوبة");
          
          const brand = resolveBrand(brandRaw);
          if (brandRaw && !brand) errors.push(`ماركة غير معروفة: ${brandRaw}`);
          if (base_price <= 0) errors.push("السعر يجب أن يكون أكبر من صفر");
          if (category_slug && !categoryMap[category_slug]) errors.push(`تصنيف غير موجود: ${category_slug}`);

          return {
            rowNum: idx + 2,
            sku,
            name_ar,
            name_en,
            brand,
            brandRaw,
            category_slug,
            base_price,
            sale_price,
            stock_quantity,
            min_order_qty,
            description_ar,
            image_url,
            erp_item_code,
            compatible_models,
            year_from,
            year_to,
            errors,
            status: errors.length > 0 ? "error" : "valid",
          };
        });

        setParsedRows(rows);
        const validCount = rows.filter(r => r.status === "valid").length;
        const errorCount = rows.filter(r => r.status === "error").length;
        toast({
          title: `تم قراءة ${rows.length} صنف`,
          description: `✅ ${validCount} صالح | ❌ ${errorCount} يحتاج تصحيح`,
        });
      } catch (err) {
        toast({ title: "خطأ في قراءة الملف", description: String(err), variant: "destructive" });
      }
    };
    reader.readAsBinaryString(file);
    // Reset input so same file can be re-uploaded
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImport = async () => {
    const validRows = parsedRows.filter(r => r.status === "valid");
    if (validRows.length === 0) {
      toast({ title: "لا توجد أصناف صالحة للاستيراد", variant: "destructive" });
      return;
    }

    setImporting(true);
    setImportProgress(0);
    const errors: string[] = [];
    let success = 0;
    const BATCH_SIZE = 50;

    for (let i = 0; i < validRows.length; i += BATCH_SIZE) {
      const batch = validRows.slice(i, i + BATCH_SIZE);
      const records = batch.map(r => ({
        sku: r.sku,
        name_ar: r.name_ar,
        name_en: r.name_en || null,
        brand: r.brand!,
        category_id: r.category_slug ? categoryMap[r.category_slug] || null : null,
        base_price: r.base_price,
        sale_price: r.sale_price,
        is_on_sale: r.sale_price !== null && r.sale_price > 0,
        stock_quantity: r.stock_quantity,
        min_order_qty: r.min_order_qty,
        description_ar: r.description_ar || null,
        image_url: r.image_url || null,
        erp_item_code: r.erp_item_code || null,
        compatible_models: r.compatible_models.length > 0 ? r.compatible_models : [],
        year_from: r.year_from,
        year_to: r.year_to,
        is_active: true,
        is_featured: false,
      }));

      const { error, data } = await supabase.from("products").upsert(records, { onConflict: "sku" }).select("id");

      if (error) {
        errors.push(`خطأ في الدفعة ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`);
      } else {
        success += data?.length || batch.length;
      }

      setImportProgress(Math.round(((i + batch.length) / validRows.length) * 100));
    }

    setImporting(false);
    setImportResult({ success, failed: validRows.length - success, errors });

    if (errors.length === 0) {
      toast({ title: `✅ تم استيراد ${success} صنف بنجاح` });
    } else {
      toast({ title: `تم استيراد ${success} صنف مع ${errors.length} خطأ`, variant: "destructive" });
    }
  };

  const validCount = parsedRows.filter(r => r.status === "valid").length;
  const errorCount = parsedRows.filter(r => r.status === "error").length;

  return (
    <div className="space-y-6" dir="rtl">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            استيراد جماعي للمنتجات من Excel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            قم بتحميل القالب وملئه بالبيانات ثم رفعه. الأصناف التي لها نفس رقم القطعة (SKU) سيتم تحديثها تلقائياً.
          </p>
          
          <div className="flex flex-wrap gap-3">
            <Button onClick={downloadTemplate} variant="outline" className="gap-2">
              <Download className="h-4 w-4" />
              تحميل القالب
            </Button>

            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleFileUpload}
              />
              <Button onClick={() => fileInputRef.current?.click()} className="gap-2">
                <Upload className="h-4 w-4" />
                رفع ملف Excel
              </Button>
            </div>

            {parsedRows.length > 0 && (
              <Button
                variant="ghost"
                onClick={() => { setParsedRows([]); setFileName(""); setImportResult(null); }}
                className="gap-2 text-destructive"
              >
                <Trash2 className="h-4 w-4" />
                مسح
              </Button>
            )}
          </div>

          {/* Brand reference */}
          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <strong>الماركات المتاحة:</strong> toyota_genuine | toyota_oils | mtx_aftermarket | denso | aisin | fbk
            <br />
            <strong>يمكن أيضاً كتابتها بالعربي:</strong> تويوتا أصلي | زيوت تويوتا | MTX | دينسو | ايسن | فرامل
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      {parsedRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                معاينة — {fileName}
              </span>
              <div className="flex gap-2">
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" /> {validCount} صالح
                </Badge>
                {errorCount > 0 && (
                  <Badge variant="destructive" className="gap-1">
                    <XCircle className="h-3 w-3" /> {errorCount} خطأ
                  </Badge>
                )}
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[400px] w-full">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right w-12">#</TableHead>
                    <TableHead className="text-right">الحالة</TableHead>
                    <TableHead className="text-right">SKU</TableHead>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">الماركة</TableHead>
                    <TableHead className="text-right">السعر</TableHead>
                    <TableHead className="text-right">المخزون</TableHead>
                    <TableHead className="text-right">كود ERP</TableHead>
                    <TableHead className="text-right">ملاحظات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row) => (
                    <TableRow key={row.rowNum} className={row.status === "error" ? "bg-destructive/5" : ""}>
                      <TableCell className="font-mono text-xs">{row.rowNum}</TableCell>
                      <TableCell>
                        {row.status === "valid" ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{row.name_ar}</TableCell>
                      <TableCell className="text-xs">{row.brandRaw}</TableCell>
                      <TableCell>{row.base_price}</TableCell>
                      <TableCell>{row.stock_quantity}</TableCell>
                      <TableCell className="font-mono text-xs">{row.erp_item_code}</TableCell>
                      <TableCell>
                        {row.errors.length > 0 && (
                          <span className="text-xs text-destructive">{row.errors.join(" | ")}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ScrollArea>

            {/* Import actions */}
            <div className="mt-4 flex items-center justify-between border-t pt-4">
              <div className="text-sm text-muted-foreground">
                سيتم استيراد <strong>{validCount}</strong> صنف صالح
                {errorCount > 0 && <span className="text-destructive"> (سيتم تخطي {errorCount} صنف به أخطاء)</span>}
              </div>
              <Button
                onClick={handleImport}
                disabled={importing || validCount === 0}
                className="gap-2 min-w-[160px]"
              >
                {importing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> جاري الاستيراد...</>
                ) : (
                  <><Upload className="h-4 w-4" /> استيراد {validCount} صنف</>
                )}
              </Button>
            </div>

            {/* Progress */}
            {importing && (
              <div className="mt-3">
                <Progress value={importProgress} className="h-2" />
                <p className="text-xs text-center mt-1 text-muted-foreground">{importProgress}%</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Result */}
      {importResult && (
        <Card className={importResult.failed > 0 ? "border-destructive/50" : "border-green-500/50"}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              {importResult.failed === 0 ? (
                <CheckCircle className="h-8 w-8 text-green-600" />
              ) : (
                <AlertTriangle className="h-8 w-8 text-yellow-600" />
              )}
              <div>
                <p className="font-semibold">
                  تم استيراد {importResult.success} صنف بنجاح
                  {importResult.failed > 0 && ` | فشل ${importResult.failed} صنف`}
                </p>
                {importResult.errors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {importResult.errors.map((err, i) => (
                      <p key={i} className="text-xs text-destructive">{err}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminBulkImport;
