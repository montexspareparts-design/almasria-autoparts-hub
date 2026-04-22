import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, Trash2, Eye, EyeOff, Plus, Search, X, Package, Table2, CheckCircle2, Users, Download, AlertCircle, PlusCircle, LinkIcon, Sparkles, Target } from "lucide-react";
import * as XLSX from "xlsx";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

type UploadReportRow = {
  sku: string;
  name: string | null;
  price: number | null;
  status: "linked" | "created" | "failed";
  reason?: string;
  product_sku?: string;
};

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
  const [aiLinking, setAiLinking] = useState(false);
  const [aiResult, setAiResult] = useState<{ extracted_count: number; matched_count: number; linked_count: number; unmatched: string[]; sample_extracted?: string[] } | null>(null);

  // Bulk AI re-link across all price lists
  const [bulkAiRunning, setBulkAiRunning] = useState(false);
  const [bulkAiProgress, setBulkAiProgress] = useState<{ current: number; total: number; currentTitle: string }>({ current: 0, total: 0, currentTitle: "" });
  const [bulkAiResults, setBulkAiResults] = useState<Array<{ title: string; linked: number; extracted: number; error?: string }>>([]);

  // Calibration: minimum confidence (0-100) for linking SKUs to products.
  // 100 = exact match only. Lower = allow fuzzy matches.
  // Per-field thresholds: SKU and ERP code can be tuned independently
  // because price lists often use one type of code more reliably than the other.
  const [minConfidence, setMinConfidence] = useState<number>(100);
  const [minConfidenceSku, setMinConfidenceSku] = useState<number>(100);
  const [minConfidenceErp, setMinConfidenceErp] = useState<number>(100);

  // Matching log (dry-run preview) — top candidates per extracted SKU + reason.
  type MatchCandidate = {
    product_id: string;
    sku: string;
    erp_item_code: string | null;
    score: number;
    matchedField: "sku" | "erp";
  };
  type MatchDiagnostic = {
    code: string;
    chosen: { product_id: string; sku: string; score: number; matchedField: "sku" | "erp" } | null;
    reason: string;
    candidates: MatchCandidate[];
  };
  const [matchLogOpen, setMatchLogOpen] = useState(false);
  const [matchLogLoading, setMatchLogLoading] = useState(false);
  const [matchLogApplying, setMatchLogApplying] = useState(false);
  const [matchLogData, setMatchLogData] = useState<{
    extracted_count: number;
    matched_count: number;
    unmatched: string[];
    avg_score: number;
    diagnostics: MatchDiagnostic[];
  } | null>(null);
  const [matchLogFilter, setMatchLogFilter] = useState<"all" | "matched" | "unmatched" | "tied">("all");

  // Verification dialog (post bulk AI)
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyData, setVerifyData] = useState<Array<{
    listId: string;
    listTitle: string;
    totalLinked: number;
    samples: Array<{ id: string; sku: string; name_ar: string }>;
  }>>([]);

  // Upload report
  const [uploadReport, setUploadReport] = useState<UploadReportRow[] | null>(null);
  const [reportListTitle, setReportListTitle] = useState("");
  const [reportFilter, setReportFilter] = useState<"all" | "linked" | "created" | "failed">("all");

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
    const reportRows: UploadReportRow[] = [];
    if (newList && selectedExcel) {
      try {
        const excelRows = await extractSkusFromExcel(selectedExcel);
        const skuStrings = excelRows.map(r => r.sku);
        // Initialize report rows (default failed; we'll override below)
        for (const r of excelRows) {
          reportRows.push({ sku: r.sku, name: r.name, price: r.price, status: "failed", reason: "لم تتم المعالجة" });
        }
        const reportIndex = new Map<string, number>();
        excelRows.forEach((r, i) => reportIndex.set(r.sku, i));
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

          // Step 2: AUTO-CREATE missing items — with strict pre-check to avoid duplicates
          let missing = excelRows.filter(r => !matchedKeys.has(r.sku));

          // Final safety check: re-verify each "missing" item against DB by sku, erp_item_code,
          // and normalized variants (strip dashes/spaces, uppercase). Skip any that exist.
          if (missing.length > 0) {
            const normalize = (s: string) => s.replace(/[-\s]/g, "").toUpperCase();
            const { data: allProductsCheck } = await supabase
              .from("products").select("id, sku, erp_item_code");
            const existingNormSet = new Set<string>();
            const existingExactSet = new Set<string>();
            if (allProductsCheck) {
              for (const p of allProductsCheck) {
                for (const c of [p.sku, (p as any).erp_item_code].filter(Boolean)) {
                  existingExactSet.add(String(c));
                  existingNormSet.add(normalize(String(c)));
                }
              }
            }
            const beforeCount = missing.length;
            missing = missing.filter(r => {
              const exact = existingExactSet.has(r.sku);
              const norm = existingNormSet.has(normalize(r.sku));
              if (exact || norm) {
                // Already exists — link instead of create
                const found = allProductsCheck?.find(p =>
                  p.sku === r.sku || (p as any).erp_item_code === r.sku ||
                  normalize(p.sku) === normalize(r.sku) ||
                  ((p as any).erp_item_code && normalize((p as any).erp_item_code) === normalize(r.sku))
                );
                if (found && !matchedProducts.some(m => m.id === found.id)) {
                  matchedProducts.push({ id: found.id, sku: found.sku, matchedKey: r.sku });
                  matchedKeys.add(r.sku);
                }
                return false;
              }
              return true;
            });
            const skippedDuplicates = beforeCount - missing.length;
            if (skippedDuplicates > 0) {
              console.log(`✅ Prevented ${skippedDuplicates} duplicate product creation(s) — linked to existing instead.`);
            }
          }

          let createdCount = 0;
          const createdKeys = new Set<string>();
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
              // Mark all missing as failed with reason
              for (const r of missing) {
                const idx = reportIndex.get(r.sku);
                if (idx !== undefined) {
                  reportRows[idx].status = "failed";
                  reportRows[idx].reason = `فشل إنشاء الصنف: ${importErr.message}`;
                }
              }
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
                    createdKeys.add(matchedKey);
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
              const slice = uniqueProducts.slice(i, i + batchSize);
              const batch = slice.map(product => {
                const norm = product.matchedKey.replace(/[-\s]/g, "").toUpperCase();
                const price = priceMap.get(product.matchedKey) ?? priceMap.get(norm) ?? null;
                return {
                  price_list_id: (newList as any).id,
                  product_id: product.id,
                  price,
                };
              });
              const { error: linkErr } = await supabase.from("price_list_products").upsert(batch as any, {
                onConflict: "price_list_id,product_id",
                ignoreDuplicates: true,
              });
              for (const product of slice) {
                const idx = reportIndex.get(product.matchedKey);
                if (idx !== undefined) {
                  if (linkErr) {
                    reportRows[idx].status = "failed";
                    reportRows[idx].reason = `فشل الربط: ${linkErr.message}`;
                  } else {
                    reportRows[idx].status = createdKeys.has(product.matchedKey) ? "created" : "linked";
                    reportRows[idx].product_sku = product.sku;
                    reportRows[idx].reason = undefined;
                  }
                }
              }
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
      } catch (e: any) {
        console.error("Excel linking error:", e);
        toast({ title: "⚠️ خطأ في ربط الأصناف من Excel", variant: "destructive" });
        for (const r of reportRows) {
          if (r.status === "failed" && !r.reason) r.reason = e?.message || "خطأ غير معروف";
        }
      }
    }

    // Show report dialog if we processed an Excel
    if (selectedExcel && reportRows.length > 0) {
      setUploadReport(reportRows);
      setReportListTitle(form.title);
      setReportFilter("all");
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

  const linkFromPdfWithAI = async () => {
    if (!managingList) return;
    if (!confirm("سيتم استخراج أكواد الأصناف من ملف الـ PDF تلقائياً عبر الذكاء الصناعي وربطها بالكشف (سيتم استبدال الأصناف الحالية). متابعة؟")) return;
    setAiLinking(true);
    setAiResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("extract-pricelist-skus", {
        body: { price_list_id: managingList.id, min_confidence: minConfidence, min_confidence_sku: minConfidenceSku, min_confidence_erp: minConfidenceErp },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const res = data as { extracted_count: number; matched_count: number; linked_count: number; unmatched: string[]; sample_extracted?: string[] };
      setAiResult(res);
      toast({
        title: "✅ تم التحليل",
        description: `استخرج ${res.extracted_count} كود، ربط ${res.linked_count} صنف${res.unmatched.length ? `، ${res.unmatched.length} بدون مطابقة` : ""}`,
      });
      fetchLinkedProducts(managingList.id);
    } catch (e: any) {
      toast({ title: "فشل التحليل", description: e.message, variant: "destructive" });
    } finally {
      setAiLinking(false);
    }
  };

  // Dry-run preview: extract SKUs and compute matches WITHOUT writing to DB.
  // Opens a "سجل المطابقة" dialog with top candidates + reason per code.
  const previewMatchingLog = async () => {
    if (!managingList) return;
    setMatchLogOpen(true);
    setMatchLogLoading(true);
    setMatchLogData(null);
    setMatchLogFilter("all");
    try {
      const { data, error } = await supabase.functions.invoke("extract-pricelist-skus", {
        body: {
          price_list_id: managingList.id,
          min_confidence: minConfidence,
          min_confidence_sku: minConfidenceSku,
          min_confidence_erp: minConfidenceErp,
          dry_run: true,
          include_diagnostics: true,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const res = data as {
        extracted_count: number;
        matched_count: number;
        unmatched: string[];
        avg_score: number;
        diagnostics: MatchDiagnostic[];
      };
      setMatchLogData({
        extracted_count: res.extracted_count,
        matched_count: res.matched_count,
        unmatched: res.unmatched || [],
        avg_score: res.avg_score || 0,
        diagnostics: res.diagnostics || [],
      });
    } catch (e: any) {
      toast({ title: "فشل التحليل", description: e.message, variant: "destructive" });
      setMatchLogOpen(false);
    } finally {
      setMatchLogLoading(false);
    }
  };

  // Apply (commit) the previewed matching by re-running without dry_run.
  const applyMatchingFromLog = async () => {
    if (!managingList) return;
    if (!confirm("سيتم اعتماد المطابقة وكتابتها في الكشف (سيتم استبدال الأصناف الحالية). متابعة؟")) return;
    setMatchLogApplying(true);
    try {
      const { data, error } = await supabase.functions.invoke("extract-pricelist-skus", {
        body: { price_list_id: managingList.id, min_confidence: minConfidence, min_confidence_sku: minConfidenceSku, min_confidence_erp: minConfidenceErp },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const res = data as { extracted_count: number; matched_count: number; linked_count: number; unmatched: string[] };
      setAiResult(res);
      toast({
        title: "✅ تم اعتماد المطابقة",
        description: `تم ربط ${res.linked_count} صنف`,
      });
      fetchLinkedProducts(managingList.id);
      setMatchLogOpen(false);
    } catch (e: any) {
      toast({ title: "فشل الاعتماد", description: e.message, variant: "destructive" });
    } finally {
      setMatchLogApplying(false);
    }
  };


  const linkAllPriceListsFromPdfWithAI = async () => {
    const candidates = lists.filter((l) => l.file_url);
    if (candidates.length === 0) {
      toast({ title: "لا توجد كشوفات بملفات PDF للتحليل", variant: "destructive" });
      return;
    }
    if (!confirm(`سيتم تحليل ${candidates.length} كشف بالـ AI واستخراج أكواد الأصناف من ملفات PDF وربطها (سيتم استبدال الأصناف الحالية في كل كشف). هذه العملية قد تستغرق عدة دقائق. متابعة؟`)) return;

    setBulkAiRunning(true);
    setBulkAiResults([]);
    setBulkAiProgress({ current: 0, total: candidates.length, currentTitle: "" });

    const results: Array<{ title: string; linked: number; extracted: number; error?: string }> = [];

    for (let i = 0; i < candidates.length; i++) {
      const list = candidates[i];
      setBulkAiProgress({ current: i + 1, total: candidates.length, currentTitle: list.title });
      try {
        const { data, error } = await supabase.functions.invoke("extract-pricelist-skus", {
          body: { price_list_id: list.id, min_confidence: minConfidence, min_confidence_sku: minConfidenceSku, min_confidence_erp: minConfidenceErp },
        });
        if (error) throw error;
        if ((data as any)?.error) throw new Error((data as any).error);
        const res = data as { extracted_count: number; linked_count: number };
        results.push({ title: list.title, linked: res.linked_count, extracted: res.extracted_count });
      } catch (e: any) {
        results.push({ title: list.title, linked: 0, extracted: 0, error: e.message || "خطأ غير معروف" });
      }
      setBulkAiResults([...results]);
    }

    const totalLinked = results.reduce((s, r) => s + r.linked, 0);
    const failedCount = results.filter((r) => r.error).length;
    toast({
      title: "✅ اكتمل التحليل الجماعي",
      description: `تم ربط ${totalLinked} صنف عبر ${candidates.length} كشف${failedCount ? ` (${failedCount} فشل)` : ""}`,
    });
    setBulkAiRunning(false);

    // Open verification dialog with sample SKUs from each linked list
    const successful = candidates.filter((c, i) => !results[i]?.error && results[i]?.linked > 0);
    if (successful.length > 0) {
      await openVerificationFor(successful.map((c) => ({ id: c.id, title: c.title })));
    }
  };

  const openVerificationFor = async (
    items: Array<{ id: string; title: string }>
  ) => {
    setVerifyLoading(true);
    setVerifyOpen(true);
    setVerifyData([]);
    const out: Array<{
      listId: string;
      listTitle: string;
      totalLinked: number;
      samples: Array<{ id: string; sku: string; name_ar: string }>;
    }> = [];
    for (const it of items) {
      const { data, count } = await supabase
        .from("price_list_products")
        .select("product_id, products:product_id(id, sku, name_ar)", { count: "exact" })
        .eq("price_list_id", it.id)
        .limit(8) as any;
      const samples = (data || [])
        .map((r: any) => r.products)
        .filter(Boolean) as Array<{ id: string; sku: string; name_ar: string }>;
      out.push({
        listId: it.id,
        listTitle: it.title,
        totalLinked: count ?? samples.length,
        samples,
      });
      setVerifyData([...out]);
    }
    setVerifyLoading(false);
  };

  const removeSampleFromList = async (listId: string, productId: string) => {
    await supabase
      .from("price_list_products")
      .delete()
      .eq("price_list_id", listId)
      .eq("product_id", productId);
    setVerifyData((prev) =>
      prev.map((d) =>
        d.listId === listId
          ? { ...d, samples: d.samples.filter((s) => s.id !== productId), totalLinked: Math.max(0, d.totalLinked - 1) }
          : d
      )
    );
    toast({ title: "تم حذف الصنف من الكشف" });
  };

  const clearListLinks = async (listId: string) => {
    if (!confirm("سيتم إلغاء كل الأصناف المربوطة بهذا الكشف. متابعة؟")) return;
    await supabase.from("price_list_products").delete().eq("price_list_id", listId);
    setVerifyData((prev) =>
      prev.map((d) => (d.listId === listId ? { ...d, samples: [], totalLinked: 0 } : d))
    );
    toast({ title: "تم إلغاء الربط لهذا الكشف" });
  };

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
              onClick={linkFromPdfWithAI}
              disabled={aiLinking || bulkLinking}
              className="gap-1.5 text-xs bg-gradient-to-r from-primary to-accent text-primary-foreground"
            >
              {aiLinking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              ربط من ملف الـ PDF تلقائياً (AI)
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={previewMatchingLog}
              disabled={aiLinking || bulkLinking || matchLogLoading}
              className="gap-1.5 text-xs border-primary/40"
              title="معاينة سجل المطابقة قبل اعتمادها (Dry-run)"
            >
              {matchLogLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Target className="w-3.5 h-3.5" />}
              معاينة سجل المطابقة
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={linkAllActiveProducts}
              disabled={bulkLinking || aiLinking}
              className="gap-1.5 text-xs"
            >
              {bulkLinking ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
              ربط كل الأصناف النشطة
            </Button>
            {linkedProducts.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                onClick={unlinkAllProducts}
                disabled={bulkLinking || aiLinking}
                className="gap-1.5 text-xs text-destructive border-destructive/30 hover:bg-destructive/10"
              >
                <Trash2 className="w-3.5 h-3.5" />
                فك ربط الكل
              </Button>
            )}
            <p className="text-[10px] text-muted-foreground self-center mr-auto">
              💡 الذكاء الصناعي يستخرج أكواد الأصناف من الـ PDF ويربط الموجود منها تلقائياً
            </p>
          </div>

          {/* AI extraction result */}
          {aiResult && (
            <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  نتيجة استخراج AI
                </p>
                <button onClick={() => setAiResult(null)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px]">
                <div className="p-2 rounded bg-background border border-border">
                  <p className="text-muted-foreground">مستخرج</p>
                  <p className="font-bold text-foreground">{aiResult.extracted_count}</p>
                </div>
                <div className="p-2 rounded bg-background border border-border">
                  <p className="text-muted-foreground">تم ربطه</p>
                  <p className="font-bold text-primary">{aiResult.linked_count}</p>
                </div>
                <div className="p-2 rounded bg-background border border-border">
                  <p className="text-muted-foreground">بدون مطابقة</p>
                  <p className="font-bold text-destructive">{aiResult.unmatched.length}</p>
                </div>
              </div>
              {aiResult.unmatched.length > 0 && (
                <details className="text-[10px] text-muted-foreground">
                  <summary className="cursor-pointer hover:text-foreground">عرض الأكواد بدون مطابقة ({aiResult.unmatched.length})</summary>
                  <div className="mt-1.5 p-2 bg-background rounded font-mono max-h-32 overflow-y-auto break-all" dir="ltr">
                    {aiResult.unmatched.join(", ")}
                  </div>
                </details>
              )}
            </div>
          )}

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

  const downloadReportCsv = () => {
    if (!uploadReport) return;
    const headers = ["الحالة", "رقم القطعة (من Excel)", "اسم الصنف", "السعر", "رقم الصنف في النظام", "ملاحظة/سبب الفشل"];
    const statusLabel = (s: UploadReportRow["status"]) =>
      s === "linked" ? "تم الربط" : s === "created" ? "تم الإنشاء والربط" : "فشل";
    const escape = (v: any) => {
      const s = v == null ? "" : String(v);
      return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const lines = [
      headers.join(","),
      ...uploadReport.map(r => [
        statusLabel(r.status),
        r.sku,
        r.name ?? "",
        r.price ?? "",
        r.product_sku ?? "",
        r.reason ?? "",
      ].map(escape).join(",")),
    ];
    const blob = new Blob(["\uFEFF" + lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `price-list-upload-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const reportCounts = uploadReport
    ? {
        linked: uploadReport.filter(r => r.status === "linked").length,
        created: uploadReport.filter(r => r.status === "created").length,
        failed: uploadReport.filter(r => r.status === "failed").length,
        total: uploadReport.length,
      }
    : { linked: 0, created: 0, failed: 0, total: 0 };

  const filteredReport = uploadReport
    ? reportFilter === "all"
      ? uploadReport
      : uploadReport.filter(r => r.status === reportFilter)
    : [];

  return (
    <>
    <Card>
      <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
        <CardTitle className="text-lg">إدارة كشوفات المصرية</CardTitle>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            size="sm"
            variant="outline"
            onClick={linkAllPriceListsFromPdfWithAI}
            disabled={bulkAiRunning || lists.length === 0}
            className="border-primary/40 text-primary hover:bg-primary/10"
          >
            {bulkAiRunning ? (
              <>
                <Loader2 className="w-4 h-4 ml-1 animate-spin" />
                جاري التحليل ({bulkAiProgress.current}/{bulkAiProgress.total})
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 ml-1" />
                ربط أصناف جميع الكشوفات بالـ AI
              </>
            )}
          </Button>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="w-4 h-4 ml-1" />
            رفع كشف جديد
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Calibration: confidence threshold for SKU matching */}
        <div className="p-3 rounded-lg border border-border bg-muted/30 space-y-2">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 text-sm font-bold">
              <Target className="w-4 h-4 text-primary" />
              <span>وضع المعايرة — حد التشابه (Confidence)</span>
            </div>
            <Badge
              variant={minConfidence >= 100 ? "default" : minConfidence >= 85 ? "secondary" : "outline"}
              className="text-xs"
            >
              {minConfidence}%{" "}
              {minConfidence >= 100 ? "(مطابقة تامة)" : minConfidence >= 85 ? "(صارم)" : minConfidence >= 70 ? "(متوسط)" : "(مرن)"}
            </Badge>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[10px] text-muted-foreground shrink-0">50%</span>
            <Slider
              value={[minConfidence]}
              onValueChange={(v) => setMinConfidence(v[0] ?? 100)}
              min={50}
              max={100}
              step={5}
              disabled={bulkAiRunning || aiLinking}
              className="flex-1"
            />
            <span className="text-[10px] text-muted-foreground shrink-0">100%</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            يحدد هذا الإعداد مدى التطابق المطلوب بين الكود المستخرج من الـ PDF وكود المنتج في قاعدة البيانات قبل الربط.
            <span className="font-semibold text-foreground"> 100% = مطابقة تامة فقط</span> (الأكثر أماناً، قد يفوّت أكواد بها فروقات بسيطة).
            القيم الأقل تسمح بمطابقة تقريبية (Levenshtein) لاستيعاب الأخطاء الإملائية أو فروقات التنسيق.
          </p>
        </div>

        {/* Bulk AI re-link progress and results */}
        {(bulkAiRunning || bulkAiResults.length > 0) && (
          <div className="p-3 rounded-lg border border-primary/30 bg-primary/5 space-y-2">
            <div className="flex items-center gap-2 text-sm font-bold text-primary">
              <Sparkles className="w-4 h-4" />
              <span>تحليل جميع الكشوفات بالذكاء الاصطناعي</span>
              {bulkAiRunning && <Loader2 className="w-4 h-4 animate-spin mr-auto" />}
            </div>
            {bulkAiRunning && bulkAiProgress.currentTitle && (
              <div className="text-xs text-muted-foreground">
                جاري تحليل: <span className="font-semibold text-foreground">{bulkAiProgress.currentTitle}</span> ({bulkAiProgress.current}/{bulkAiProgress.total})
              </div>
            )}
            {bulkAiResults.length > 0 && (
              <div className="space-y-1 max-h-48 overflow-y-auto text-xs">
                {bulkAiResults.map((r, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 p-1.5 rounded bg-background/60 border border-border">
                    <span className="truncate flex-1 text-foreground">{r.title}</span>
                    {r.error ? (
                      <span className="text-destructive font-semibold flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {r.error.slice(0, 40)}
                      </span>
                    ) : (
                      <span className="text-primary font-semibold">
                        ربط {r.linked} من {r.extracted}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
            {!bulkAiRunning && bulkAiResults.length > 0 && (
              <Button
                size="sm"
                variant="outline"
                className="border-primary/40 text-primary hover:bg-primary/10"
                onClick={() => {
                  const successful = bulkAiResults
                    .filter((r) => !r.error && r.linked > 0)
                    .map((r) => {
                      const list = lists.find((l) => l.title === r.title);
                      return list ? { id: list.id, title: list.title } : null;
                    })
                    .filter(Boolean) as Array<{ id: string; title: string }>;
                  if (successful.length > 0) openVerificationFor(successful);
                }}
              >
                <Eye className="w-4 h-4 ml-1" />
                مراجعة عينات SKU من النتائج
              </Button>
            )}
          </div>
        )}


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
                <div className="flex flex-col gap-1 text-xs p-2.5 rounded border bg-primary/5 border-primary/20 text-primary">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>
                      <strong>{matchResult.matched}</strong> صنف موجود + <strong>{matchResult.toCreate}</strong> سيُضاف جديد للنظام (إجمالي <strong>{matchResult.total}</strong>)
                    </span>
                  </div>
                  {matchResult.toCreate > 0 && (
                    <p className="text-[10px] text-muted-foreground pr-6">
                      الأصناف الجديدة سيتم إنشاؤها تلقائياً وستظهر في البحث للعملاء
                    </p>
                  )}
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

    <Dialog open={!!uploadReport} onOpenChange={(open) => { if (!open) setUploadReport(null); }}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            ملخص رفع الكشف: {reportListTitle}
          </DialogTitle>
        </DialogHeader>

        {/* Summary cards */}
        <div className="grid grid-cols-4 gap-2">
          <button
            onClick={() => setReportFilter("all")}
            className={`p-3 rounded-lg border text-center transition-colors ${reportFilter === "all" ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"}`}
          >
            <p className="text-2xl font-bold text-foreground">{reportCounts.total}</p>
            <p className="text-xs text-muted-foreground">الإجمالي</p>
          </button>
          <button
            onClick={() => setReportFilter("linked")}
            className={`p-3 rounded-lg border text-center transition-colors ${reportFilter === "linked" ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"}`}
          >
            <p className="text-2xl font-bold text-emerald-600 flex items-center justify-center gap-1">
              <LinkIcon className="w-4 h-4" />
              {reportCounts.linked}
            </p>
            <p className="text-xs text-muted-foreground">تم ربطها</p>
          </button>
          <button
            onClick={() => setReportFilter("created")}
            className={`p-3 rounded-lg border text-center transition-colors ${reportFilter === "created" ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"}`}
          >
            <p className="text-2xl font-bold text-blue-600 flex items-center justify-center gap-1">
              <PlusCircle className="w-4 h-4" />
              {reportCounts.created}
            </p>
            <p className="text-xs text-muted-foreground">تم إنشاؤها</p>
          </button>
          <button
            onClick={() => setReportFilter("failed")}
            className={`p-3 rounded-lg border text-center transition-colors ${reportFilter === "failed" ? "border-primary bg-primary/10" : "border-border hover:bg-muted/50"}`}
          >
            <p className="text-2xl font-bold text-destructive flex items-center justify-center gap-1">
              <AlertCircle className="w-4 h-4" />
              {reportCounts.failed}
            </p>
            <p className="text-xs text-muted-foreground">فشل ربطها</p>
          </button>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            عرض {filteredReport.length} من {reportCounts.total} صنف
          </p>
          <Button size="sm" variant="outline" onClick={downloadReportCsv} className="gap-1.5">
            <Download className="w-3.5 h-3.5" />
            تنزيل CSV
          </Button>
        </div>

        {/* Table */}
        <div className="flex-1 overflow-auto border border-border rounded-lg">
          <table className="w-full text-xs">
            <thead className="bg-muted/50 sticky top-0">
              <tr>
                <th className="text-right p-2 font-bold">الحالة</th>
                <th className="text-right p-2 font-bold">رقم القطعة</th>
                <th className="text-right p-2 font-bold">الاسم</th>
                <th className="text-right p-2 font-bold">السعر</th>
                <th className="text-right p-2 font-bold">السبب</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredReport.length === 0 ? (
                <tr><td colSpan={5} className="text-center text-muted-foreground py-6">لا توجد عناصر في هذه الفئة</td></tr>
              ) : filteredReport.map((r, i) => (
                <tr key={i} className="hover:bg-muted/30">
                  <td className="p-2">
                    {r.status === "linked" && <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px]">تم الربط</Badge>}
                    {r.status === "created" && <Badge className="bg-blue-600 hover:bg-blue-700 text-white text-[10px]">إنشاء وربط</Badge>}
                    {r.status === "failed" && <Badge variant="destructive" className="text-[10px]">فشل</Badge>}
                  </td>
                  <td className="p-2 font-mono">{r.sku}</td>
                  <td className="p-2 truncate max-w-[200px]">{r.name || "—"}</td>
                  <td className="p-2 font-mono">{r.price ?? "—"}</td>
                  <td className="p-2 text-destructive">{r.reason || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>

    {/* Verification Dialog: sample SKUs per linked price list */}
    <Dialog open={verifyOpen} onOpenChange={setVerifyOpen}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-primary" />
            مراجعة عينات الـ SKU المربوطة لكل كشف
          </DialogTitle>
        </DialogHeader>
        <p className="text-xs text-muted-foreground -mt-2">
          راجع عينة من الأصناف المربوطة في كل كشف. لو لقيت صنف غلط، اضغط ✕ لإزالته من الكشف. اضغط "اعتماد" لما تخلص.
        </p>
        {verifyLoading && verifyData.length === 0 ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-4">
            {verifyData.map((d) => (
              <div key={d.listId} className="border border-border rounded-lg p-3 bg-muted/20">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <FileText className="w-4 h-4 text-primary shrink-0" />
                    <span className="font-bold text-sm truncate">{d.listTitle}</span>
                    <Badge variant="secondary" className="text-[10px]">
                      {d.totalLinked} صنف
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-7"
                      onClick={() => {
                        const list = lists.find((l) => l.id === d.listId);
                        if (list) {
                          setVerifyOpen(false);
                          setManagingList(list);
                          fetchLinkedProducts(list.id);
                        }
                      }}
                    >
                      <Package className="w-3 h-3 ml-1" />
                      إدارة كاملة
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-xs h-7 text-destructive hover:bg-destructive/10"
                      onClick={() => clearListLinks(d.listId)}
                    >
                      <Trash2 className="w-3 h-3 ml-1" />
                      إلغاء الكل
                    </Button>
                  </div>
                </div>
                {d.samples.length === 0 ? (
                  <p className="text-xs text-muted-foreground py-2 text-center">لا توجد أصناف للعرض</p>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-1.5">
                    {d.samples.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between gap-2 p-2 rounded bg-background border border-border text-xs"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{s.name_ar}</p>
                          <p className="font-mono text-[10px] text-muted-foreground">{s.sku}</p>
                        </div>
                        <button
                          onClick={() => removeSampleFromList(d.listId, s.id)}
                          className="p-1 hover:bg-destructive/10 rounded shrink-0"
                          title="حذف من الكشف"
                        >
                          <X className="w-3.5 h-3.5 text-destructive" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {d.totalLinked > d.samples.length && (
                  <p className="text-[10px] text-muted-foreground mt-1.5">
                    عرض {d.samples.length} من {d.totalLinked} — افتح "إدارة كاملة" لرؤية الباقي
                  </p>
                )}
              </div>
            ))}
            {verifyLoading && verifyData.length > 0 && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="w-3 h-3 animate-spin" /> جاري تحميل المزيد...
              </div>
            )}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <Button variant="outline" size="sm" onClick={() => setVerifyOpen(false)}>
            إغلاق
          </Button>
          <Button
            size="sm"
            className="bg-primary text-primary-foreground"
            onClick={() => {
              setVerifyOpen(false);
              toast({ title: "✅ تم اعتماد النتائج" });
            }}
          >
            <CheckCircle2 className="w-4 h-4 ml-1" />
            اعتماد النتائج
          </Button>
        </div>
      </DialogContent>
    </Dialog>

    {/* Matching Log Dialog (dry-run preview before commit) */}
    <Dialog open={matchLogOpen} onOpenChange={setMatchLogOpen}>
      <DialogContent className="max-w-5xl max-h-[88vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-primary" />
            سجل المطابقة — معاينة قبل الاعتماد
            {managingList && <span className="text-sm text-muted-foreground">({managingList.title})</span>}
          </DialogTitle>
        </DialogHeader>

        {matchLogLoading && (
          <div className="flex items-center justify-center py-16 gap-2 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin" />
            جاري استخراج الأكواد وحساب التطابقات...
          </div>
        )}

        {!matchLogLoading && matchLogData && (
          <div className="space-y-4">
            {/* Summary KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <div className="p-3 rounded-lg bg-muted/40 border">
                <div className="text-muted-foreground">SKUs مستخرجة</div>
                <div className="text-lg font-bold text-foreground">{matchLogData.extracted_count}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border">
                <div className="text-muted-foreground">تم تطابقها</div>
                <div className="text-lg font-bold text-primary">{matchLogData.matched_count}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border">
                <div className="text-muted-foreground">بدون مطابقة</div>
                <div className="text-lg font-bold text-destructive">{matchLogData.unmatched.length}</div>
              </div>
              <div className="p-3 rounded-lg bg-muted/40 border">
                <div className="text-muted-foreground">متوسط الـ score</div>
                <div className="text-lg font-bold text-foreground">{matchLogData.avg_score}%</div>
              </div>
            </div>

            {/* Filter chips */}
            <div className="flex flex-wrap gap-2 text-xs">
              {([
                { k: "all", label: "الكل" },
                { k: "matched", label: "تم تطابقها" },
                { k: "unmatched", label: "بدون مطابقة" },
                { k: "tied", label: "تعادل (Tie-break)" },
              ] as const).map((f) => (
                <Button
                  key={f.k}
                  size="sm"
                  variant={matchLogFilter === f.k ? "default" : "outline"}
                  onClick={() => setMatchLogFilter(f.k)}
                  className="text-xs h-7"
                >
                  {f.label}
                </Button>
              ))}
            </div>

            {/* Diagnostics list */}
            <div className="border rounded-lg divide-y max-h-[50vh] overflow-y-auto">
              {matchLogData.diagnostics
                .filter((d) => {
                  if (matchLogFilter === "matched") return !!d.chosen;
                  if (matchLogFilter === "unmatched") return !d.chosen;
                  if (matchLogFilter === "tied") {
                    if (!d.candidates.length) return false;
                    const top = d.candidates[0].score;
                    return d.candidates.filter((c) => c.score === top).length > 1;
                  }
                  return true;
                })
                .slice(0, 500)
                .map((d, idx) => (
                  <div key={idx} className="p-3 text-xs space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <code className="px-2 py-0.5 rounded bg-muted font-mono">{d.code}</code>
                        {d.chosen ? (
                          <Badge variant="default" className="text-[10px]">
                            ✓ مطابق ({d.chosen.score}%) على {d.chosen.matchedField === "sku" ? "SKU" : "ERP"}
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="text-[10px]">بدون مطابقة</Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-muted-foreground">{d.reason}</p>
                    {d.candidates.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[10px] text-muted-foreground font-semibold">أفضل المرشحين:</div>
                        {d.candidates.map((c, i) => {
                          const isChosen = d.chosen?.product_id === c.product_id && d.chosen?.matchedField === c.matchedField;
                          return (
                            <div
                              key={i}
                              className={`flex items-center gap-2 p-1.5 rounded text-[11px] ${
                                isChosen ? "bg-primary/10 border border-primary/30" : "bg-muted/30"
                              }`}
                            >
                              <span className="font-bold w-10 text-center">{c.score}%</span>
                              <Badge
                                variant={c.matchedField === "sku" ? "default" : "secondary"}
                                className="text-[9px] px-1.5"
                              >
                                {c.matchedField === "sku" ? "SKU" : "ERP"}
                              </Badge>
                              <code className="font-mono">{c.matchedField === "sku" ? c.sku : (c.erp_item_code || c.sku)}</code>
                              {isChosen && <span className="ml-auto text-primary font-bold">← المختار</span>}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              {matchLogData.diagnostics.length === 0 && (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  لا توجد بيانات لعرضها
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 justify-end pt-2 border-t">
              <Button variant="outline" size="sm" onClick={() => setMatchLogOpen(false)}>
                إغلاق
              </Button>
              <Button
                size="sm"
                onClick={applyMatchingFromLog}
                disabled={matchLogApplying || matchLogData.matched_count === 0}
                className="gap-1.5 bg-gradient-to-r from-primary to-accent text-primary-foreground"
              >
                {matchLogApplying ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                اعتماد المطابقة وحفظها ({matchLogData.matched_count})
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
    </>
  );
};

export default AdminPriceLists;
