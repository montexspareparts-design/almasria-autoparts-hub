import { useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Upload, FileSpreadsheet, Plus, X, Loader2 } from "lucide-react";

type Row = { sku: string; quantity: number; unit_cost: number };

export default function PurchaseInvoiceUploader({ onDone }: { onDone?: () => void }) {
  const { toast } = useToast();
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [supplier, setSupplier] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [rows, setRows] = useState<Row[]>([{ sku: "", quantity: 0, unit_cost: 0 }]);
  const [saving, setSaving] = useState(false);

  const handleExcel = async (file: File) => {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const json = XLSX.utils.sheet_to_json<any>(ws, { defval: "" });
    const parsed: Row[] = json.map((r) => ({
      sku: String(r.sku ?? r.SKU ?? r["كود الصنف"] ?? r["كود"] ?? "").trim(),
      quantity: Number(r.quantity ?? r.qty ?? r["الكمية"] ?? 0),
      unit_cost: Number(r.unit_cost ?? r.cost ?? r["التكلفة"] ?? r["سعر الشراء"] ?? 0),
    })).filter(r => r.sku && r.quantity > 0 && r.unit_cost > 0);
    if (!parsed.length) {
      toast({ title: "ملف فاضي", description: "تأكد من الأعمدة: sku, quantity, unit_cost", variant: "destructive" });
      return;
    }
    setRows(parsed);
    toast({ title: `تم تحميل ${parsed.length} صنف من Excel` });
  };

  const save = async () => {
    const valid = rows.filter(r => r.sku && r.quantity > 0 && r.unit_cost > 0);
    if (!invoiceNumber || !valid.length) {
      toast({ title: "بيانات ناقصة", description: "رقم فاتورة + سطر واحد على الأقل", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const total = valid.reduce((s, r) => s + r.quantity * r.unit_cost, 0);
      const { data: inv, error: e1 } = await supabase
        .from("purchase_invoices")
        .insert({ invoice_number: invoiceNumber, supplier_name: supplier || null, invoice_date: date, total_amount: total } as any)
        .select("id").single();
      if (e1) throw e1;

      // Lookup product_ids by sku
      const skus = valid.map(r => r.sku);
      const { data: products } = await supabase.from("products").select("id, sku").in("sku", skus);
      const skuMap = new Map((products || []).map((p: any) => [p.sku, p.id]));

      const items = valid.map(r => ({
        invoice_id: inv.id,
        product_id: skuMap.get(r.sku) ?? null,
        sku: r.sku,
        quantity: r.quantity,
        unit_cost: r.unit_cost,
      }));
      const { error: e2 } = await supabase.from("purchase_invoice_items").insert(items as any);
      if (e2) throw e2;

      toast({ title: "تم الحفظ", description: `${valid.length} صنف — متوسط التكلفة هيتحدّث تلقائياً` });
      setInvoiceNumber(""); setSupplier(""); setRows([{ sku: "", quantity: 0, unit_cost: 0 }]);
      onDone?.();
    } catch (e: any) {
      toast({ title: "فشل الحفظ", description: e.message, variant: "destructive" });
    } finally { setSaving(false); }
  };

  return (
    <Card className="border-2 border-blue-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <FileSpreadsheet className="h-4 w-4 text-blue-500" /> رفع فاتورة شراء
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div><Label>رقم الفاتورة *</Label><Input value={invoiceNumber} onChange={e => setInvoiceNumber(e.target.value)} /></div>
          <div><Label>المورّد</Label><Input value={supplier} onChange={e => setSupplier(e.target.value)} /></div>
          <div><Label>التاريخ</Label><Input type="date" value={date} onChange={e => setDate(e.target.value)} /></div>
        </div>

        <div className="flex items-center gap-2">
          <Label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 border rounded-md hover:bg-muted text-sm">
            <Upload className="h-3 w-3" /> استيراد Excel
            <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={e => e.target.files?.[0] && handleExcel(e.target.files[0])} />
          </Label>
          <span className="text-xs text-muted-foreground">الأعمدة: sku, quantity, unit_cost</span>
        </div>

        <div className="space-y-1 max-h-60 overflow-y-auto">
          <div className="grid grid-cols-12 gap-2 text-xs font-medium text-muted-foreground px-2">
            <div className="col-span-5">كود الصنف (SKU)</div>
            <div className="col-span-3">الكمية</div>
            <div className="col-span-3">سعر الوحدة</div>
            <div className="col-span-1"></div>
          </div>
          {rows.map((r, i) => (
            <div key={i} className="grid grid-cols-12 gap-2">
              <Input className="col-span-5" value={r.sku} onChange={e => setRows(p => p.map((x, j) => j === i ? { ...x, sku: e.target.value } : x))} />
              <Input className="col-span-3" type="number" value={r.quantity || ""} onChange={e => setRows(p => p.map((x, j) => j === i ? { ...x, quantity: Number(e.target.value) } : x))} />
              <Input className="col-span-3" type="number" step="0.01" value={r.unit_cost || ""} onChange={e => setRows(p => p.map((x, j) => j === i ? { ...x, unit_cost: Number(e.target.value) } : x))} />
              <Button variant="ghost" size="icon" className="col-span-1" onClick={() => setRows(p => p.filter((_, j) => j !== i))}><X className="h-3 w-3" /></Button>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={() => setRows(p => [...p, { sku: "", quantity: 0, unit_cost: 0 }])}>
            <Plus className="h-3 w-3 ml-1" /> إضافة سطر
          </Button>
        </div>

        <Button onClick={save} disabled={saving} className="w-full">
          {saving ? <><Loader2 className="h-3 w-3 ml-1 animate-spin" /> جاري الحفظ...</> : "حفظ الفاتورة"}
        </Button>
      </CardContent>
    </Card>
  );
}
