import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, Trash2, Eye, EyeOff, Plus, Search, X, Package, Table2, CheckCircle2, Users } from "lucide-react";
import * as XLSX from "xlsx";

interface PriceListRow {
  id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  version: string | null;
  is_active: boolean;
  created_at: string;
}

interface Product {
  id: string;
  name_ar: string;
  sku: string;
}

const AdminPriceLists = () => {
  const { toast } = useToast();
  const pdfInputRef = useRef<HTMLInputElement>(null);
  const excelInputRef = useRef<HTMLInputElement>(null);
  const [lists, setLists] = useState<PriceListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", version: "" });
  const [selectedPdf, setSelectedPdf] = useState<File | null>(null);
  const [selectedExcel, setSelectedExcel] = useState<File | null>(null);
  const [matchingSkus, setMatchingSkus] = useState(false);
  const [matchResult, setMatchResult] = useState<{ matched: number; toCreate: number; total: number; skus: string[] } | null>(null);

  // Product association
  const [managingList, setManagingList] = useState<PriceListRow | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [productResults, setProductResults] = useState<Product[]>([]);
  const [linkedProducts, setLinkedProducts] = useState<Product[]>([]);
  const [searchingProducts, setSearchingProducts] = useState(false);
  const [loadingLinked, setLoadingLinked] = useState(false);
  const [bulkLinking, setBulkLinking] = useState(false);

  // Views report
  const [viewingReport, setViewingReport] = useState<PriceListRow | null>(null);
  const [viewsData, setViewsData] = useState<{ user_name: string; phone: string; viewed_at: string }[]>([]);
  const [loadingViews, setLoadingViews] = useState(false);

  useEffect(() => { fetchLists(); }, []);

  const fetchLists = async () => {
    const { data } = await supabase
      .from("price_lists")
      .select("*")
      .order("created_at", { ascending: false });
    setLists((data as PriceListRow[]) || []);
    setLoading(false);
  };

  const fetchViews = async (listId: string) => {
    setLoadingViews(true);
    const { data: views } = await supabase
      .from("price_list_views")
      .select("user_id, viewed_at")
      .eq("price_list_id", listId)
      .order("viewed_at", { ascending: false });

    if (!views || views.length === 0) {
      setViewsData([]);
      setLoadingViews(false);
      return;
    }

    const userIds = [...new Set(views.map((v: any) => v.user_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name, phone")
      .in("user_id", userIds);

    const profileMap = new Map((profiles || []).map((p: any) => [p.user_id, p]));

    setViewsData(views.map((v: any) => {
      const profile = profileMap.get(v.user_id);
      return {
        user_name: profile?.full_name || "بدون اسم",
        phone: profile?.phone || "—",
        viewed_at: v.viewed_at,
      };
    }));
    setLoadingViews(false);
  };

  const notifyDealers = async (title: string) => {
    const { data: dealers } = await supabase
      .from("dealer_accounts")
      .select("user_id")
      .eq("is_active", true);

    if (!dealers?.length) return;

    const notifications = dealers.map((d) => ({
      user_id: d.user_id,
      title: "📋 كشف أسعار جديد",
      message: `تم رفع كشف أسعار جديد: ${title}. يمكنك الاطلاع عليه وإضافة الأصناف لعرض السعر.`,
      type: "price_list",
    }));

    await supabase.from("notifications").insert(notifications);
  };

  // Extract SKUs, names, and prices from Excel file
  const extractSkusFromExcel = (file: File): Promise<{ sku: string; name: string | null; price: number | null }[]> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          const rows: any[] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });

          if (rows.length === 0) {
            resolve([]);
            return;
          }

          const headerRow = rows[0] as string[];
          const skuHeaders = ["sku", "SKU", "رقم القطعة", "part number", "Part Number", "PART NUMBER", "رقم_القطعة", "part_number", "OEM", "oem", "الرقم", "رقم", "كود الصنف", "كود"];
          const priceHeaders = ["price", "Price", "PRICE", "السعر", "سعر", "الثمن", "سعر_البيع", "سعر البيع", "Unit Price", "unit_price"];
          const nameHeaders = ["name", "Name", "NAME", "اسم الصنف", "الاسم", "اسم", "name_ar", "البيان", "بيان", "Description", "description", "وصف"];

          let skuColIndex = -1;
          let priceColIndex = -1;
          let nameColIndex = -1;

          if (headerRow) {
            for (let i = 0; i < headerRow.length; i++) {
              const cell = String(headerRow[i] || "").trim();
              if (skuColIndex === -1 && skuHeaders.some(h => cell.toLowerCase() === h.toLowerCase() || cell.includes(h))) {
                skuColIndex = i;
              }
              if (priceColIndex === -1 && priceHeaders.some(h => cell.toLowerCase() === h.toLowerCase() || cell.includes(h))) {
                priceColIndex = i;
              }
              if (nameColIndex === -1 && nameHeaders.some(h => cell.toLowerCase() === h.toLowerCase() || cell.includes(h))) {
                nameColIndex = i;
              }
            }
          }

          if (skuColIndex === -1) {
            skuColIndex = 0;
          }

          const results: { sku: string; name: string | null; price: number | null }[] = [];
          const seenSkus = new Set<string>();
          for (let i = 1; i < rows.length; i++) {
            const row = rows[i] as any[];
            if (row && row[skuColIndex]) {
              const sku = String(row[skuColIndex]).trim();
              if (sku && sku.length >= 3 && !seenSkus.has(sku)) {
                seenSkus.add(sku);
                let price: number | null = null;
                if (priceColIndex !== -1 && row[priceColIndex] != null) {
                  const parsed = parseFloat(String(row[priceColIndex]).replace(/[^\d.]/g, ""));
                  if (!isNaN(parsed) && parsed > 0) {
                    price = parsed;
                  }
                }
                let name: string | null = null;
                if (nameColIndex !== -1 && row[nameColIndex] != null) {
                  const n = String(row[nameColIndex]).trim();
                  if (n) name = n;
                }
                results.push({ sku, name, price });
              }
            }
          }

          resolve(results);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // Preview Excel matching before upload
  const handleExcelSelected = async (file: File) => {
    setSelectedExcel(file);
    setMatchResult(null);
    setMatchingSkus(true);

    try {
      const excelRows = await extractSkusFromExcel(file);
      const skuStrings = excelRows.map(r => r.sku);

      if (skuStrings.length === 0) {
        toast({ title: "لم يتم العثور على أرقام قطع في الملف", variant: "destructive" });
        setMatchingSkus(false);
        return;
      }

      const hasPrices = excelRows.some(r => r.price !== null);
      const hasNames = excelRows.some(r => r.name !== null);

      // Match with database in batches (by SKU and erp_item_code)
      const batchSize = 50;
      const matchedSkus = new Set<string>();

      for (let i = 0; i < skuStrings.length; i += batchSize) {
        const batch = skuStrings.slice(i, i + batchSize);
        const { data } = await supabase
          .from("products")
          .select("sku, erp_item_code")
          .in("sku", batch);
        if (data) data.forEach((p: any) => matchedSkus.add(p.sku));

        const { data: data2 } = await supabase
          .from("products")
          .select("sku, erp_item_code")
          .in("erp_item_code", batch);
        if (data2) data2.forEach((p: any) => p.erp_item_code && matchedSkus.add(p.erp_item_code));
      }

      // Normalized matching
      const { data: allProducts } = await supabase
        .from("products")
        .select("sku, erp_item_code");

      if (allProducts) {
        const normalizedExcelMap = new Map<string, string>();
        skuStrings.forEach(s => normalizedExcelMap.set(s.replace(/[-\s]/g, "").toUpperCase(), s));
        for (const product of allProducts) {
          const candidates = [product.sku, product.erp_item_code].filter(Boolean);
          for (const c of candidates) {
            const norm = String(c).replace(/[-\s]/g, "").toUpperCase();
            const original = normalizedExcelMap.get(norm);
            if (original) matchedSkus.add(original);
          }
        }
      }

      const matchedCount = matchedSkus.size;
      const toCreate = skuStrings.length - matchedCount;

      setMatchResult({ matched: matchedCount, toCreate, total: skuStrings.length, skus: skuStrings });
      const priceNote = hasPrices ? " مع أسعار" : "";
      const nameNote = hasNames ? " مع أسماء" : "";
      toast({
        title: `✓ ${matchedCount} موجود + ${toCreate} سيُضاف جديد (إجمالي ${skuStrings.length})${priceNote}${nameNote}`,
      });
    } catch (err) {
      console.error("Excel parse error:", err);
      toast({ title: "خطأ في قراءة ملف Excel", variant: "destructive" });
    }

    setMatchingSkus(false);
  };

  const handleUpload = async () => {
    if (!form.title.trim()) {
      toast({ title: "يرجى إدخال عنوان الكشف", variant: "destructive" });
      return;
    }
    setUploading(true);

    let fileUrl: string | null = null;

    // Upload PDF
    if (selectedPdf) {
      const ext = selectedPdf.name.split(".").pop();
      const path = `${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("price-lists")
        .upload(path, selectedPdf, { contentType: selectedPdf.type });

      if (uploadError) {
        toast({ title: "خطأ في رفع ملف PDF", description: uploadError.message, variant: "destructive" });
        setUploading(false);
        return;
      }

      fileUrl = path;
    }

    // Create price list record
    const { data: newList, error } = await supabase.from("price_lists").insert({
      title: form.title,
      description: form.description || null,
      version: form.version || null,
      file_url: fileUrl,
    }).select().single();

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    toast({ title: "تم رفع الكشف ✓" });
    await notifyDealers(form.title);

    // Link products from Excel — and AUTO-CREATE missing ones
    if (newList && selectedExcel) {
      try {
        const excelRows = await extractSkusFromExcel(selectedExcel);
        const skuStrings = excelRows.map(r => r.sku);
        // Build maps from Excel: sku -> price/name (with normalized key)
        const priceMap = new Map<string, number | null>();
        const nameMap = new Map<string, string | null>();
        for (const row of excelRows) {
          const norm = row.sku.replace(/[-\s]/g, "").toUpperCase();
          priceMap.set(row.sku, row.price);
          priceMap.set(norm, row.price);
          nameMap.set(row.sku, row.name);
          nameMap.set(norm, row.name);
        }

        if (skuStrings.length > 0) {
          const batchSize = 50;
          // Step 1: Find existing products (by sku OR erp_item_code, exact + normalized)
          const matchedProducts: { id: string; sku: string; matchedKey: string }[] = [];
          const matchedKeys = new Set<string>(); // excel keys (original) that found a match

          for (let i = 0; i < skuStrings.length; i += batchSize) {
            const batch = skuStrings.slice(i, i + batchSize);
            const { data: bySku } = await supabase
              .from("products").select("id, sku").in("sku", batch);
            if (bySku) {
              for (const p of bySku) {
                matchedProducts.push({ id: p.id, sku: p.sku, matchedKey: p.sku });
                matchedKeys.add(p.sku);
              }
            }
            const { data: byErp } = await supabase
              .from("products").select("id, sku, erp_item_code").in("erp_item_code", batch);
            if (byErp) {
              for (const p of byErp) {
                if (!matchedProducts.some(m => m.id === p.id)) {
                  matchedProducts.push({ id: p.id, sku: p.sku, matchedKey: (p as any).erp_item_code });
                  matchedKeys.add((p as any).erp_item_code);
                }
              }
            }
          }

          // Normalized matching
          const { data: allProducts } = await supabase
            .from("products").select("id, sku, erp_item_code");
          if (allProducts) {
            const normExcel = new Map<string, string>();
            skuStrings.forEach(s => normExcel.set(s.replace(/[-\s]/g, "").toUpperCase(), s));
            for (const product of allProducts) {
              if (matchedProducts.some(m => m.id === product.id)) continue;
              for (const c of [product.sku, product.erp_item_code].filter(Boolean)) {
                const norm = String(c).replace(/[-\s]/g, "").toUpperCase();
                const original = normExcel.get(norm);
                if (original) {
                  matchedProducts.push({ id: product.id, sku: product.sku, matchedKey: original });
                  matchedKeys.add(original);
                  break;
                }
              }
            }
          }

          // Step 2: AUTO-CREATE missing items via bulk_import_products RPC
          const missing = excelRows.filter(r => !matchedKeys.has(r.sku));
          let createdCount = 0;
          if (missing.length > 0) {
            const importItems = missing.map(r => ({
              id: r.sku,
              name: r.name || `صنف ${r.sku}`,
              price: r.price ?? 0,
              qty: 0,
            }));
            const { data: importRes, error: importErr } = await supabase
              .rpc("bulk_import_products", { _items: importItems as any });
            if (importErr) {
              console.error("bulk_import error:", importErr);
            } else if (importRes) {
              const r = importRes as any;
              createdCount = (r.imported || 0) + (r.updated || 0);
            }

            // Now fetch the newly-created products and add to matched list
            const missingSkus = missing.map(m => m.sku);
            for (let i = 0; i < missingSkus.length; i += batchSize) {
              const batch = missingSkus.slice(i, i + batchSize);
              const { data: newlyFound } = await supabase
                .from("products").select("id, sku, erp_item_code")
                .or(`sku.in.(${batch.map(s => `"${s}"`).join(",")}),erp_item_code.in.(${batch.map(s => `"${s}"`).join(",")})`);
              if (newlyFound) {
                for (const p of newlyFound) {
                  if (!matchedProducts.some(m => m.id === p.id)) {
                    const matchedKey = batch.find(b =>
                      b === p.sku || b === (p as any).erp_item_code
                    ) || p.sku;
                    matchedProducts.push({ id: p.id, sku: p.sku, matchedKey });
                  }
                }
              }
            }
          }

          // Step 3: Link all matched products with prices
          const seenIds = new Set<string>();
          const uniqueProducts = matchedProducts.filter(p => {
            if (seenIds.has(p.id)) return false;
            seenIds.add(p.id);
            return true;
          });

          if (uniqueProducts.length > 0) {
            for (let i = 0; i < uniqueProducts.length; i += batchSize) {
              const batch = uniqueProducts.slice(i, i + batchSize).map(product => {
                const norm = product.matchedKey.replace(/[-\s]/g, "").toUpperCase();
                const price = priceMap.get(product.matchedKey) ?? priceMap.get(norm) ?? null;
                return {
                  price_list_id: (newList as any).id,
                  product_id: product.id,
                  price,
                };
              });
              await supabase.from("price_list_products").upsert(batch as any, {
                onConflict: "price_list_id,product_id",
                ignoreDuplicates: true,
              });
            }
            const withPrices = uniqueProducts.filter(p => {
              const norm = p.matchedKey.replace(/[-\s]/g, "").toUpperCase();
              return (priceMap.get(p.matchedKey) ?? priceMap.get(norm)) != null;
            }).length;
            toast({
              title: `✅ تم ربط ${uniqueProducts.length} صنف بالكشف`,
              description: `${createdCount} صنف جديد تمت إضافته للنظام • ${withPrices} بسعر من الكشف`,
            });
          } else {
            toast({ title: "⚠️ لم يتم ربط أي صنف", variant: "destructive" });
          }
        }
      } catch (e) {
        console.error("Excel linking error:", e);
        toast({ title: "⚠️ خطأ في ربط الأصناف من Excel", variant: "destructive" });
      }
    }

    if (newList) {
      setManagingList(newList as PriceListRow);
      fetchLinkedProducts((newList as any).id);
    }

    setForm({ title: "", description: "", version: "" });
    setSelectedPdf(null);
    setSelectedExcel(null);
    setMatchResult(null);
    setShowForm(false);
    fetchLists();
    setUploading(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("price_lists").update({ is_active: !current }).eq("id", id);
    fetchLists();
  };

  const deleteList = async (id: string) => {
    await supabase.from("price_lists").delete().eq("id", id);
    toast({ title: "تم الحذف" });
    fetchLists();
  };

  // Product association functions
  const fetchLinkedProducts = async (listId: string) => {
    setLoadingLinked(true);
    const { data } = await supabase
      .from("price_list_products")
      .select("product_id, products:product_id(id, name_ar, sku)")
      .eq("price_list_id", listId) as any;

    const products = (data || []).map((d: any) => d.products).filter(Boolean);
    setLinkedProducts(products);
    setLoadingLinked(false);
  };

  const searchProductsForLink = useCallback(async (query: string) => {
    if (query.length < 2) { setProductResults([]); return; }
    setSearchingProducts(true);
    const { data } = await supabase
      .from("products")
      .select("id, name_ar, sku")
      .eq("is_active", true)
      .or(`name_ar.ilike.%${query}%,sku.ilike.%${query}%`)
      .limit(15);
    setProductResults(data || []);
    setSearchingProducts(false);
  }, []);

  useEffect(() => {
    if (!managingList) return;
    const timeout = setTimeout(() => searchProductsForLink(productSearch), 300);
    return () => clearTimeout(timeout);
  }, [productSearch, searchProductsForLink, managingList]);

  const linkProduct = async (productId: string) => {
    if (!managingList) return;
    const { error } = await supabase.from("price_list_products").insert({
      price_list_id: managingList.id,
      product_id: productId,
    } as any);
    if (!error) {
      fetchLinkedProducts(managingList.id);
      setProductSearch("");
      setProductResults([]);
    }
  };

  const unlinkProduct = async (productId: string) => {
    if (!managingList) return;
    await supabase
      .from("price_list_products")
      .delete()
      .eq("price_list_id", managingList.id)
      .eq("product_id", productId);
    fetchLinkedProducts(managingList.id);
  };

  const linkAllActiveProducts = async () => {
    if (!managingList) return;
    if (!confirm("سيتم ربط جميع الأصناف النشطة بهذا الكشف. هل أنت متأكد؟")) return;
    setBulkLinking(true);
    try {
      const allIds: string[] = [];
      let from = 0;
      const pageSize = 1000;
      while (true) {
        const { data, error } = await supabase
          .from("products")
          .select("id")
          .eq("is_active", true)
          .range(from, from + pageSize - 1);
        if (error) throw error;
        if (!data || data.length === 0) break;
        allIds.push(...data.map((p: any) => p.id));
        if (data.length < pageSize) break;
        from += pageSize;
      }
      if (allIds.length === 0) {
        toast({ title: "لا توجد أصناف نشطة", variant: "destructive" });
        return;
      }
      const batchSize = 500;
      for (let i = 0; i < allIds.length; i += batchSize) {
        const batch = allIds.slice(i, i + batchSize).map(pid => ({
          price_list_id: managingList.id,
          product_id: pid,
        }));
        await supabase
          .from("price_list_products")
          .upsert(batch as any, { onConflict: "price_list_id,product_id", ignoreDuplicates: true });
      }
      toast({ title: "✅ تم الربط", description: `تم ربط ${allIds.length} صنف بالكشف` });
      fetchLinkedProducts(managingList.id);
    } catch (e: any) {
      toast({ title: "خطأ", description: e.message, variant: "destructive" });
    } finally {
      setBulkLinking(false);
    }
  };

  const unlinkAllProducts = async () => {
    if (!managingList) return;
    if (!confirm("سيتم فك ربط جميع الأصناف من هذا الكشف. هل أنت متأكد؟")) return;
    setBulkLinking(true);
    const { error } = await supabase
      .from("price_list_products")
      .delete()
      .eq("price_list_id", managingList.id);
    if (!error) {
      toast({ title: "تم فك الربط" });
      fetchLinkedProducts(managingList.id);
    }
    setBulkLinking(false);
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  // Views report for a specific list
  if (viewingReport) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            تقرير الاطلاع: {viewingReport.title}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => setViewingReport(null)}>
            ✕ إغلاق
          </Button>
        </CardHeader>
        <CardContent>
          {loadingViews ? (
            <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
          ) : viewsData.length === 0 ? (
            <p className="text-center text-muted-foreground text-sm py-6">لم يطّلع أحد على هذا الكشف بعد</p>
          ) : (
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="grid grid-cols-3 gap-2 p-3 bg-muted/50 text-xs font-bold text-foreground border-b border-border">
                <span>الاسم</span>
                <span>رقم التليفون</span>
                <span>التاريخ والوقت</span>
              </div>
              <div className="divide-y divide-border max-h-96 overflow-y-auto">
                {viewsData.map((v, i) => (
                  <div key={i} className="grid grid-cols-3 gap-2 p-3 text-xs text-foreground">
                    <span className="font-medium truncate">{v.user_name}</span>
                    <span className="font-mono text-muted-foreground" dir="ltr">{v.phone}</span>
                    <span className="text-muted-foreground">
                      {new Date(v.viewed_at).toLocaleString("ar-EG", { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>
              <div className="p-3 bg-muted/30 border-t border-border text-xs text-muted-foreground">
                إجمالي المشاهدات: <strong className="text-foreground">{viewsData.length}</strong>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Managing products for a specific list
  if (managingList) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="w-5 h-5 text-primary" />
            أصناف كشف: {managingList.title}
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={() => { setManagingList(null); setProductSearch(""); setProductResults([]); }}>
            ✕ إغلاق
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Bulk actions */}
          <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-primary/20 bg-primary/5">
            <Button
              size="sm"
              onClick={linkAllActiveProducts}
              disabled={bulkLinking}
              className="gap-1.5 text-xs"
            >
              {bulkLinking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              ربط جميع الأصناف النشطة بالكشف
            </Button>
            {linkedProducts.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={unlinkAllProducts}
                disabled={bulkLinking}
                className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
                فك ربط الكل
              </Button>
            )}
            <p className="text-[10px] text-muted-foreground self-center mr-auto">
              💡 استخدم الزر لعرض كل الأصناف للتاجر تحت معاينة الـ PDF
            </p>
          </div>

          {/* Search to add */}
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="ابحث عن صنف لإضافته (رقم القطعة أو الاسم)..."
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="pr-10"
            />
            {productSearch && (
              <button onClick={() => { setProductSearch(""); setProductResults([]); }} className="absolute left-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-muted-foreground" />
              </button>
            )}
          </div>

          {/* Search results */}
          {productResults.length > 0 && (
            <div className="border border-border rounded-lg max-h-48 overflow-y-auto">
              {productResults.map(p => {
                const alreadyLinked = linkedProducts.some(lp => lp.id === p.id);
                return (
                  <button
                    key={p.id}
                    onClick={() => !alreadyLinked && linkProduct(p.id)}
                    disabled={alreadyLinked}
                    className={`w-full flex items-center gap-2 p-2.5 text-right border-b border-border last:border-0 ${alreadyLinked ? "opacity-50 cursor-not-allowed bg-muted/30" : "hover:bg-muted transition-colors"}`}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{p.name_ar}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{p.sku}</p>
                    </div>
                    {alreadyLinked ? (
                      <Badge variant="secondary" className="text-[9px]">مضاف</Badge>
                    ) : (
                      <div className="w-6 h-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <Plus className="w-3 h-3 text-primary" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {searchingProducts && <div className="flex justify-center py-2"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>}

          {/* Linked products */}
          <div className="border border-border rounded-lg">
            <div className="p-3 border-b border-border bg-muted/30">
              <p className="text-sm font-bold text-foreground">الأصناف المرتبطة ({linkedProducts.length})</p>
            </div>
            {loadingLinked ? (
              <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
            ) : linkedProducts.length === 0 ? (
              <p className="text-center text-muted-foreground text-sm py-6">لا توجد أصناف مرتبطة. ابحث وأضف أصناف أعلاه.</p>
            ) : (
              <div className="divide-y divide-border max-h-80 overflow-y-auto">
                {linkedProducts.map(p => (
                  <div key={p.id} className="flex items-center gap-2 p-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{p.name_ar}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">{p.sku}</p>
                    </div>
                    <button onClick={() => unlinkProduct(p.id)} className="p-1 hover:bg-destructive/10 rounded">
                      <X className="w-3.5 h-3.5 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">إدارة كشوفات المصرية</CardTitle>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 ml-1" />
          رفع كشف جديد
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/30">
            <Input
              placeholder="عنوان الكشف *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <div className="flex gap-2">
              <Input
                placeholder="رقم الإصدار (اختياري)"
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
                className="w-1/3"
              />
              <Textarea
                placeholder="وصف مختصر (اختياري)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="flex-1"
                rows={2}
              />
            </div>

            {/* File uploads */}
            <div className="space-y-2">
              <div className="flex items-center gap-3 flex-wrap">
                {/* PDF Upload */}
                <input
                  ref={pdfInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => setSelectedPdf(e.target.files?.[0] || null)}
                />
                <Button variant="outline" size="sm" onClick={() => pdfInputRef.current?.click()}>
                  <FileText className="w-4 h-4 ml-1" />
                  {selectedPdf ? selectedPdf.name : "ملف PDF (للعرض)"}
                </Button>

                {/* Excel Upload */}
                <input
                  ref={excelInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleExcelSelected(file);
                  }}
                />
                <Button variant="outline" size="sm" onClick={() => excelInputRef.current?.click()}>
                  <Table2 className="w-4 h-4 ml-1" />
                  {selectedExcel ? selectedExcel.name : "ملف Excel (أرقام القطع) *"}
                </Button>
              </div>

              {/* Excel match preview */}
              {matchingSkus && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground p-2 rounded bg-muted/50">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  جاري مطابقة أرقام القطع...
                </div>
              )}

              {matchResult && (
                <div className={`flex items-center gap-2 text-xs p-2.5 rounded border ${matchResult.matched > 0 ? "bg-primary/5 border-primary/20 text-primary" : "bg-destructive/5 border-destructive/20 text-destructive"}`}>
                  <CheckCircle2 className="w-4 h-4 shrink-0" />
                  <span>
                    <strong>{matchResult.matched}</strong> صنف مطابق من أصل <strong>{matchResult.total}</strong> رقم قطعة في الملف
                  </span>
                </div>
              )}

              <p className="text-[10px] text-muted-foreground">
                * ملف Excel يجب أن يحتوي على عمود "رقم القطعة" أو "SKU" — النظام يطابقه مع المنتجات تلقائياً
              </p>
            </div>

            <Button size="sm" onClick={handleUpload} disabled={uploading}>
              {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "رفع وإرسال إشعار"}
            </Button>
          </div>
        )}

        {lists.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">لا توجد كشوفات</p>
        ) : (
          <div className="space-y-2">
            {lists.map((list) => (
              <div key={list.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                <FileText className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{list.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {list.version && `${list.version} • `}
                    {new Date(list.created_at).toLocaleDateString("ar-EG")}
                  </p>
                </div>
                <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => { setManagingList(list); fetchLinkedProducts(list.id); }}>
                  <Package className="w-3.5 h-3.5" />
                  الأصناف
                </Button>
                <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => { setViewingReport(list); fetchViews(list.id); }}>
                  <Users className="w-3.5 h-3.5" />
                  المشاهدات
                </Button>
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => toggleActive(list.id, list.is_active)}>
                  {list.is_active ? <Eye className="w-4 h-4 text-emerald-500" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                </Button>
                <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive" onClick={() => deleteList(list.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminPriceLists;
