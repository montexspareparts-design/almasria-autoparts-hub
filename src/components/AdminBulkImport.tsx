import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle, Loader2, AlertTriangle, Trash2, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import * as XLSX from "xlsx";

interface ParsedRow {
  rowNum: number;
  erp_code: string;
  sku: string;
  name: string;
  stock: number;
  price: number;
  // After matching with DB
  matched: boolean;
  productId?: string;
  oldStock?: number;
  oldPrice?: number;
  errors: string[];
  status: "valid" | "error" | "not_found";
}

const TEMPLATE_COLUMNS = [
  "كود الصنف*",
  "بارت نمبر (SKU)*",
  "اسم الصنف",
  "الرصيد*",
  "السعر*",
];

const AdminBulkImport = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResult, setImportResult] = useState<{ success: number; failed: number; notFound: number; errors: string[] } | null>(null);
  const [fileName, setFileName] = useState("");
  const [matching, setMatching] = useState(false);

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      TEMPLATE_COLUMNS,
      ["10001", "04152-YZZA1", "فلتر زيت كورولا", "50", "120"],
      ["10002", "MTX-BP-001", "تيل فرامل أمامي كامري", "30", "350"],
    ]);
    ws["!cols"] = TEMPLATE_COLUMNS.map(() => ({ wch: 22 }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "الأصناف");
    XLSX.writeFile(wb, "قالب_مزامنة_الأرصدة.xlsx");
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setImportResult(null);
    setMatching(true);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: "binary" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });

        if (jsonData.length === 0) {
          toast({ title: "الملف فارغ", variant: "destructive" });
          setMatching(false);
          return;
        }

        // Parse rows
        const rows: ParsedRow[] = jsonData.map((row: any, idx: number) => {
          const errors: string[] = [];
          const erp_code = (row["كود الصنف*"] || row["كود الصنف"] || row["erp_code"] || row["code"] || row["الكود"] || "").toString().trim();
          const sku = (row["بارت نمبر (SKU)*"] || row["بارت نمبر"] || row["SKU"] || row["sku"] || row["part_number"] || "").toString().trim();
          const name = (row["اسم الصنف"] || row["الاسم"] || row["name"] || "").toString().trim();
          const stock = parseInt(row["الرصيد*"] || row["الرصيد"] || row["stock"] || row["qty"] || "0") || 0;
          const price = parseFloat(row["السعر*"] || row["السعر"] || row["price"] || "0") || 0;

          if (!erp_code && !sku) errors.push("كود الصنف أو البارت نمبر مطلوب");
          if (price <= 0) errors.push("السعر يجب أن يكون أكبر من صفر");

          return {
            rowNum: idx + 2,
            erp_code,
            sku,
            name,
            stock,
            price,
            matched: false,
            errors,
            status: errors.length > 0 ? "error" as const : "valid" as const,
          };
        });

        // Match with DB products
        const validRows = rows.filter(r => r.status !== "error");
        if (validRows.length > 0) {
          // Fetch all products with erp_item_code or sku
          const erpCodes = validRows.map(r => r.erp_code).filter(Boolean);
          const skus = validRows.map(r => r.sku).filter(Boolean);
          
          const { data: products } = await supabase
            .from("products")
            .select("id, sku, erp_item_code, stock_quantity, base_price")
            .or(
              [
                erpCodes.length > 0 ? `erp_item_code.in.(${erpCodes.join(",")})` : null,
                skus.length > 0 ? `sku.in.(${skus.join(",")})` : null,
              ].filter(Boolean).join(",")
            );

          const erpMap = new Map<string, any>();
          const skuMap = new Map<string, any>();
          (products || []).forEach(p => {
            if (p.erp_item_code) erpMap.set(p.erp_item_code, p);
            if (p.sku) skuMap.set(p.sku, p);
          });

          rows.forEach(row => {
            if (row.status === "error") return;
            const product = (row.erp_code && erpMap.get(row.erp_code)) || (row.sku && skuMap.get(row.sku));
            if (product) {
              row.matched = true;
              row.productId = product.id;
              row.oldStock = product.stock_quantity;
              row.oldPrice = product.base_price;
            } else {
              row.status = "not_found";
              row.errors.push("صنف غير موجود في النظام");
            }
          });
        }

        setParsedRows(rows);
        const matchedCount = rows.filter(r => r.matched).length;
        const notFoundCount = rows.filter(r => r.status === "not_found").length;
        const errorCount = rows.filter(r => r.status === "error").length;
        toast({
          title: `تم قراءة ${rows.length} صنف`,
          description: `✅ ${matchedCount} مطابق | ⚠️ ${notFoundCount} غير موجود | ❌ ${errorCount} خطأ`,
        });
      } catch (err) {
        toast({ title: "خطأ في قراءة الملف", description: String(err), variant: "destructive" });
      } finally {
        setMatching(false);
      }
    };
    reader.readAsBinaryString(file);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleImport = async () => {
    const matchedRows = parsedRows.filter(r => r.matched && r.productId);
    if (matchedRows.length === 0) {
      toast({ title: "لا توجد أصناف مطابقة للتحديث", variant: "destructive" });
      return;
    }

    setImporting(true);
    setImportProgress(0);
    const errors: string[] = [];
    let success = 0;
    const BATCH_SIZE = 50;

    for (let i = 0; i < matchedRows.length; i += BATCH_SIZE) {
      const batch = matchedRows.slice(i, i + BATCH_SIZE);
      
      // Update each product
      for (const row of batch) {
        const { error } = await supabase
          .from("products")
          .update({ 
            stock_quantity: row.stock, 
            base_price: row.price,
          })
          .eq("id", row.productId!);

        if (error) {
          errors.push(`صف ${row.rowNum}: ${error.message}`);
        } else {
          success++;
        }
      }

      setImportProgress(Math.round(((i + batch.length) / matchedRows.length) * 100));
    }

    setImporting(false);
    setImportResult({ 
      success, 
      failed: matchedRows.length - success, 
      notFound: parsedRows.filter(r => r.status === "not_found").length,
      errors 
    });

    if (errors.length === 0) {
      toast({ title: `✅ تم تحديث ${success} صنف بنجاح` });
    } else {
      toast({ title: `تم تحديث ${success} صنف مع ${errors.length} خطأ`, variant: "destructive" });
    }
  };

  const matchedCount = parsedRows.filter(r => r.matched).length;
  const notFoundCount = parsedRows.filter(r => r.status === "not_found").length;
  const errorCount = parsedRows.filter(r => r.status === "error").length;
  const changedStock = parsedRows.filter(r => r.matched && r.oldStock !== r.stock).length;
  const changedPrice = parsedRows.filter(r => r.matched && r.oldPrice !== r.price).length;

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            مزامنة الأرصدة والأسعار من Excel
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            ارفع ملف Excel من نظام الفيصل يحتوي على كود الصنف والبارت نمبر والرصيد والسعر. 
            النظام سيطابق الأصناف تلقائياً ويعرض الفروقات قبل التحديث.
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
              <Button onClick={() => fileInputRef.current?.click()} className="gap-2" disabled={matching}>
                {matching ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> جاري المطابقة...</>
                ) : (
                  <><Upload className="h-4 w-4" /> رفع ملف Excel</>
                )}
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

          <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded-lg">
            <strong>الأعمدة المطلوبة:</strong> كود الصنف (ERP) | بارت نمبر (SKU) | اسم الصنف | الرصيد | السعر
            <br />
            <strong>ملاحظة:</strong> المطابقة تتم بكود الصنف أولاً، ثم بالبارت نمبر إذا لم يوجد كود
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {parsedRows.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-green-600">{matchedCount}</p>
              <p className="text-xs text-muted-foreground">صنف مطابق</p>
            </CardContent>
          </Card>
          <Card className="border-yellow-500/30 bg-yellow-500/5">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-yellow-600">{notFoundCount}</p>
              <p className="text-xs text-muted-foreground">غير موجود</p>
            </CardContent>
          </Card>
          <Card className="border-blue-500/30 bg-blue-500/5">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{changedStock}</p>
              <p className="text-xs text-muted-foreground">تغيير رصيد</p>
            </CardContent>
          </Card>
          <Card className="border-purple-500/30 bg-purple-500/5">
            <CardContent className="pt-4 pb-3 text-center">
              <p className="text-2xl font-bold text-purple-600">{changedPrice}</p>
              <p className="text-xs text-muted-foreground">تغيير سعر</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Preview Table */}
      {parsedRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                معاينة — {fileName}
              </span>
              <div className="flex gap-2">
                <Badge variant="default" className="gap-1">
                  <CheckCircle className="h-3 w-3" /> {matchedCount} مطابق
                </Badge>
                {notFoundCount > 0 && (
                  <Badge variant="secondary" className="gap-1">
                    <AlertTriangle className="h-3 w-3" /> {notFoundCount} غير موجود
                  </Badge>
                )}
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
                    <TableHead className="text-right">كود الصنف</TableHead>
                    <TableHead className="text-right">بارت نمبر</TableHead>
                    <TableHead className="text-right">الاسم</TableHead>
                    <TableHead className="text-right">الرصيد</TableHead>
                    <TableHead className="text-right">السعر</TableHead>
                    <TableHead className="text-right">ملاحظات</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedRows.map((row) => (
                    <TableRow 
                      key={row.rowNum} 
                      className={
                        row.status === "error" ? "bg-destructive/5" : 
                        row.status === "not_found" ? "bg-yellow-500/5" : ""
                      }
                    >
                      <TableCell className="font-mono text-xs">{row.rowNum}</TableCell>
                      <TableCell>
                        {row.matched ? (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        ) : row.status === "not_found" ? (
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        ) : (
                          <XCircle className="h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{row.erp_code}</TableCell>
                      <TableCell className="font-mono text-xs">{row.sku}</TableCell>
                      <TableCell className="max-w-[180px] truncate text-xs">{row.name}</TableCell>
                      <TableCell>
                        {row.matched && row.oldStock !== undefined ? (
                          <span className={`text-xs ${row.oldStock !== row.stock ? "font-bold" : ""}`}>
                            {row.oldStock !== row.stock ? (
                              <span className="flex items-center gap-1">
                                <span className="text-muted-foreground line-through">{row.oldStock}</span>
                                <ArrowRight className="h-3 w-3" />
                                <span className={row.stock > row.oldStock ? "text-green-600" : "text-destructive"}>{row.stock}</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">{row.stock} (بدون تغيير)</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-xs">{row.stock}</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.matched && row.oldPrice !== undefined ? (
                          <span className={`text-xs ${row.oldPrice !== row.price ? "font-bold" : ""}`}>
                            {row.oldPrice !== row.price ? (
                              <span className="flex items-center gap-1">
                                <span className="text-muted-foreground line-through">{row.oldPrice}</span>
                                <ArrowRight className="h-3 w-3" />
                                <span className={row.price > row.oldPrice ? "text-green-600" : "text-destructive"}>{row.price}</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">{row.price} (بدون تغيير)</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-xs">{row.price}</span>
                        )}
                      </TableCell>
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
                سيتم تحديث <strong>{matchedCount}</strong> صنف مطابق
                {notFoundCount > 0 && <span className="text-yellow-600"> (سيتم تخطي {notFoundCount} صنف غير موجود)</span>}
              </div>
              <Button
                onClick={handleImport}
                disabled={importing || matchedCount === 0}
                className="gap-2 min-w-[160px]"
              >
                {importing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> جاري التحديث...</>
                ) : (
                  <><Upload className="h-4 w-4" /> تحديث {matchedCount} صنف</>
                )}
              </Button>
            </div>

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
                  تم تحديث {importResult.success} صنف بنجاح
                  {importResult.failed > 0 && ` | فشل ${importResult.failed}`}
                  {importResult.notFound > 0 && ` | ${importResult.notFound} غير موجود`}
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
