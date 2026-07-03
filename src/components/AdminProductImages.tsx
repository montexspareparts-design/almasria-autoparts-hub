import { useState, useRef, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Search, Upload, X, Package, Loader2, ImageIcon, Wand2, ExternalLink, Check, Copy, FolderOpen } from "lucide-react";

const StorageImageGallery = lazy(() => import("@/components/admin/StorageImageGallery"));

const AdminProductImages = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetProductId, setTargetProductId] = useState<string | null>(null);

  // Image search state
  const [searchingImages, setSearchingImages] = useState<string | null>(null);
  const [imageResults, setImageResults] = useState<string[]>([]);
  const [imageSearchProduct, setImageSearchProduct] = useState<{ id: string; name: string; sku: string } | null>(null);
  const [savingImage, setSavingImage] = useState<string | null>(null);
  const [manualUrl, setManualUrl] = useState("");

  // Bulk search state
  const [bulkSearching, setBulkSearching] = useState(false);
  const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0, currentSku: "", found: 0, failed: 0 });
  const bulkAbortRef = useRef(false);
  const [dragOverProductId, setDragOverProductId] = useState<string | null>(null);
  const [copiedSku, setCopiedSku] = useState<string | null>(null);

  // AI Vision matching state
  const [aiMatching, setAiMatching] = useState(false);
  const [aiProgress, setAiProgress] = useState({ scanned: 0, total: 0, applied: 0, candidates: 0 });
  const aiAbortRef = useRef(false);

  const handleCopySku = (sku: string) => {
    navigator.clipboard.writeText(sku);
    setCopiedSku(sku);
    toast({ title: `تم نسخ رقم القطعة: ${sku}` });
    setTimeout(() => setCopiedSku(null), 2000);
  };

  const [page, setPage] = useState(0);
  const [dealerOnly, setDealerOnly] = useState(false);
  const [missingImageOnly, setMissingImageOnly] = useState(false);
  const PAGE_SIZE = 50;

  const { data: productsData, isLoading } = useQuery({
    queryKey: ["admin-products", search, page, dealerOnly, missingImageOnly],
    queryFn: async () => {
      // If dealerOnly, fetch IDs of products that have wholesale tier prices
      let dealerProductIds: string[] | null = null;
      if (dealerOnly) {
        const { data: tierRows, error: tierErr } = await supabase
          .from("product_tier_prices")
          .select("product_id")
          .in("tier", ["wholesale_tier1", "wholesale_tier2"]);
        if (tierErr) throw tierErr;
        dealerProductIds = Array.from(new Set((tierRows || []).map((r: any) => r.product_id)));
        if (dealerProductIds.length === 0) {
          return { products: [], total: 0 };
        }
      }

      let query = supabase
        .from("products")
        .select("id, name_ar, sku, part_number, brand, image_url, product_categories(name_ar)", { count: "exact" })
        .order("name_ar")
        .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      if (search) {
        const term = search.trim();
        const cleaned = term.replace(/[\s-]/g, "");
        query = query.or(
          `name_ar.ilike.%${term}%,sku.ilike.%${term}%,part_number.ilike.%${term}%,part_number.ilike.%${cleaned}%`
        );
      }

      if (missingImageOnly) {
        query = query.or("image_url.is.null,image_url.eq.");
      }

      if (dealerProductIds) {
        query = query.in("id", dealerProductIds);
      }

      const { data, error, count } = await query;
      if (error) throw error;
      return { products: data, total: count || 0 };
    },
  });

  const products = productsData?.products;
  const totalProducts = productsData?.total || 0;
  const totalPages = Math.ceil(totalProducts / PAGE_SIZE);

  const handleUploadClick = (productId: string) => {
    setTargetProductId(productId);
    // Use setTimeout to ensure state is set before file dialog opens
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const productId = targetProductId;
    if (!file || !productId) {
      console.error("Upload failed: no file or no targetProductId", { file: !!file, productId });
      return;
    }

    if (!file.type.startsWith("image/")) {
      toast({ title: "يرجى اختيار ملف صورة", variant: "destructive" });
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "حجم الصورة يجب أن يكون أقل من 20MB", variant: "destructive" });
      return;
    }

    setUploading(productId);

    try {
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${productId}.${ext}`;

      console.log("Uploading to storage:", filePath);

      // First try to remove old file if exists (different extension)
      const { data: existingFiles } = await supabase.storage
        .from("product-images")
        .list("", { search: productId });
      
      if (existingFiles && existingFiles.length > 0) {
        const oldFiles = existingFiles.filter(f => f.name.startsWith(productId));
        if (oldFiles.length > 0) {
          await supabase.storage
            .from("product-images")
            .remove(oldFiles.map(f => f.name));
        }
      }

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
        throw uploadError;
      }

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      // Add cache-busting timestamp to avoid browser caching old images
      const publicUrlWithCacheBust = `${urlData.publicUrl}?t=${Date.now()}`;

      console.log("Updating product image_url:", publicUrlWithCacheBust);

      const { error: updateError } = await supabase
        .from("products")
        .update({ image_url: publicUrlWithCacheBust })
        .eq("id", productId);

      if (updateError) {
        console.error("Product update error:", updateError);
        throw updateError;
      }

      toast({ title: "تم رفع الصورة بنجاح ✅" });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (err: any) {
      console.error("Full upload error:", err);
      toast({ title: "خطأ في رفع الصورة", description: err.message, variant: "destructive" });
    } finally {
      setUploading(null);
      setTargetProductId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDropFile = async (productId: string, file: File) => {
    if (file.size > 20 * 1024 * 1024) {
      toast({ title: "حجم الصورة يجب أن يكون أقل من 20MB", variant: "destructive" });
      return;
    }
    setTargetProductId(productId);
    setUploading(productId);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const filePath = `${productId}.${ext}`;
      const { data: existingFiles } = await supabase.storage.from("product-images").list("", { search: productId });
      if (existingFiles && existingFiles.length > 0) {
        const oldFiles = existingFiles.filter(f => f.name.startsWith(productId));
        if (oldFiles.length > 0) await supabase.storage.from("product-images").remove(oldFiles.map(f => f.name));
      }
      const { error: uploadError } = await supabase.storage.from("product-images").upload(filePath, file, { upsert: true });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(filePath);
      const publicUrlWithCacheBust = `${urlData.publicUrl}?t=${Date.now()}`;
      const { error: updateError } = await supabase.from("products").update({ image_url: publicUrlWithCacheBust }).eq("id", productId);
      if (updateError) throw updateError;
      toast({ title: "تم رفع الصورة بنجاح ✅" });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (err: any) {
      toast({ title: "خطأ في رفع الصورة", description: err.message, variant: "destructive" });
    } finally {
      setUploading(null);
      setTargetProductId(null);
    }
  };


  const handleRemoveImage = async (productId: string, imageUrl: string) => {
    setUploading(productId);
    try {
      const parts = imageUrl.split("/product-images/");
      if (parts[1]) {
        await supabase.storage.from("product-images").remove([parts[1]]);
      }

      await supabase
        .from("products")
        .update({ image_url: null })
        .eq("id", productId);

      toast({ title: "تم حذف الصورة" });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (err: any) {
      toast({ title: "خطأ في حذف الصورة", description: err.message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const handleAutoSearch = async (product: { id: string; name_ar: string; sku: string }) => {
    setSearchingImages(product.id);
    setImageSearchProduct({ id: product.id, name: product.name_ar, sku: product.sku });
    setImageResults([]);
    setManualUrl("");

    try {
      const { data, error } = await supabase.functions.invoke("search-part-image", {
        body: { partNumber: product.sku, productId: product.id },
      });

      if (error) throw error;

      if (data?.success && data.images?.length > 0) {
        setImageResults(data.images);
      } else {
        toast({ title: "لم يتم العثور على صور", description: "جرّب البحث يدوياً أو لصق رابط صورة" });
      }
    } catch (err: any) {
      toast({ title: "خطأ في البحث", description: err.message, variant: "destructive" });
    } finally {
      setSearchingImages(null);
    }
  };

  const handleSelectImage = async (imageUrl: string) => {
    if (!imageSearchProduct) return;
    setSavingImage(imageUrl);

    try {
      const { data, error } = await supabase.functions.invoke("save-image-from-url", {
        body: { imageUrl, productId: imageSearchProduct.id },
      });

      if (error) throw error;

      if (data?.success) {
        toast({ title: "تم حفظ الصورة بنجاح ✅" });
        setImageSearchProduct(null);
        setImageResults([]);
        queryClient.invalidateQueries({ queryKey: ["admin-products"] });
        queryClient.invalidateQueries({ queryKey: ["products"] });
      } else {
        toast({ title: "خطأ في حفظ الصورة", description: data?.error, variant: "destructive" });
      }
    } catch (err: any) {
      toast({ title: "خطأ في حفظ الصورة", description: err.message, variant: "destructive" });
    } finally {
      setSavingImage(null);
    }
  };

  const handleManualUrlSave = () => {
    if (!manualUrl.trim()) return;
    handleSelectImage(manualUrl.trim());
  };

  const handleBulkSearch = async () => {
    // Get all products without images
    const { data: noImageProducts, error } = await supabase
      .from("products")
      .select("id, name_ar, sku")
      .is("image_url", null)
      .eq("is_active", true)
      .order("sku");

    if (error || !noImageProducts || noImageProducts.length === 0) {
      toast({ title: "لا توجد منتجات بدون صور", variant: "default" });
      return;
    }

    setBulkSearching(true);
    bulkAbortRef.current = false;
    setBulkProgress({ current: 0, total: noImageProducts.length, currentSku: "", found: 0, failed: 0 });

    let found = 0;
    let failed = 0;

    for (let i = 0; i < noImageProducts.length; i++) {
      if (bulkAbortRef.current) break;

      const product = noImageProducts[i];
      setBulkProgress(prev => ({ ...prev, current: i + 1, currentSku: product.sku }));

      try {
        // Search for images
        const { data, error: searchErr } = await supabase.functions.invoke("search-part-image", {
          body: { partNumber: product.sku, productId: product.id },
        });

        if (searchErr || !data?.success || !data.images?.length) {
          failed++;
          setBulkProgress(prev => ({ ...prev, failed }));
          continue;
        }

        // Auto-save the first found image
        const { data: saveData, error: saveErr } = await supabase.functions.invoke("save-image-from-url", {
          body: { imageUrl: data.images[0], productId: product.id },
        });

        if (saveErr || !saveData?.success) {
          failed++;
        } else {
          found++;
        }
        setBulkProgress(prev => ({ ...prev, found, failed }));

        // Delay to avoid rate limits
        await new Promise(r => setTimeout(r, 1500));
      } catch {
        failed++;
        setBulkProgress(prev => ({ ...prev, failed }));
      }
    }

    setBulkSearching(false);
    queryClient.invalidateQueries({ queryKey: ["admin-products"] });
    queryClient.invalidateQueries({ queryKey: ["products"] });
    toast({
      title: "اكتمل البحث المجمّع",
      description: `تم العثور على ${found} صورة، فشل ${failed}`,
    });
  };

  const handleStopBulk = () => {
    bulkAbortRef.current = true;
  };

  const handleAiMatchAll = async () => {
    if (!confirm("سيتم فحص كل صور Storage بالذكاء الاصطناعي ومطابقة البارت نمبر فيها مع المنتجات.\n\nالشروط:\n• تطابق نصي 100% فقط بين الكود في الصورة و SKU/erp_item_code\n• لن يتم استبدال الصور الموجودة\n• قد يستغرق وقتاً ويستهلك credits\n\nمتابعة؟")) return;

    setAiMatching(true);
    aiAbortRef.current = false;
    setAiProgress({ scanned: 0, total: 0, applied: 0, candidates: 0 });

    let offset = 0;
    const batchSize = 25;
    let totalApplied = 0;
    let totalCandidates = 0;
    let totalFiles = 0;

    try {
      while (!aiAbortRef.current) {
        const { data, error } = await supabase.functions.invoke("match-product-images-by-vision", {
          body: { dryRun: false, limit: batchSize, offset, onlyUnassigned: true },
        });

        if (error) throw error;
        if (!data) break;

        totalFiles = data.totalFilesInBucket || totalFiles;
        totalApplied += data.applied || 0;
        totalCandidates += data.candidateMatches || 0;

        setAiProgress({
          scanned: data.nextOffset,
          total: totalFiles,
          applied: totalApplied,
          candidates: totalCandidates,
        });

        if (data.scanned === 0 || data.nextOffset >= totalFiles) break;
        offset = data.nextOffset;
      }

      toast({
        title: "اكتمل الفحص الذكي ✅",
        description: `تم تعيين ${totalApplied} صورة من أصل ${totalCandidates} تطابق محتمل`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (e: any) {
      toast({
        title: "خطأ في الفحص الذكي",
        description: e.message || String(e),
        variant: "destructive",
      });
    } finally {
      setAiMatching(false);
    }
  };

  const handleStopAi = () => {
    aiAbortRef.current = true;
  };

  const openGoogleSearch = (sku: string) => {
    window.open(`https://www.google.com/search?q=${encodeURIComponent(sku + " toyota genuine part")}&tbm=isch`, "_blank");
  };

  const openPartSouq = (sku: string) => {
    window.open(`https://partsouq.com/en/search/all?q=${encodeURIComponent(sku.replace(/[\s-]/g, ""))}`, "_blank");
  };

  const brandLabels: Record<string, string> = {
    toyota_genuine: "تويوتا أصلي",
    toyota_oils: "زيوت تويوتا",
    mtx_aftermarket: "MTX",
    denso: "DENSO",
    aisin: "AISIN",
    fbk: "تيل فرامل FBK",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ImageIcon className="w-5 h-5" />
          إدارة صور المنتجات
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="products" dir="rtl">
          <TabsList className="mb-4 w-full justify-start">
            <TabsTrigger value="products" className="gap-1.5">
              <ImageIcon className="w-3.5 h-3.5" />
              صور المنتجات
            </TabsTrigger>
            <TabsTrigger value="storage" className="gap-1.5">
              <FolderOpen className="w-3.5 h-3.5" />
              معرض الـ Storage
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products">
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث بالاسم أو Part Number..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            className="pr-10"
          />
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-wrap gap-2">
          <Button
            variant={dealerOnly ? "default" : "outline"}
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => { setDealerOnly((v) => !v); setPage(0); }}
            title="عرض المنتجات التي لها أسعار جملة (متاحة للتجار)"
          >
            🏪 خاص بالتجار فقط
          </Button>
          <Button
            variant={missingImageOnly ? "default" : "outline"}
            size="sm"
            className="gap-1.5 text-xs"
            onClick={() => { setMissingImageOnly((v) => !v); setPage(0); }}
            title="عرض المنتجات التي لا تحتوي على صورة"
          >
            🖼️ بدون صورة فقط
          </Button>
          {(dealerOnly || missingImageOnly) && (
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-xs text-muted-foreground"
              onClick={() => { setDealerOnly(false); setMissingImageOnly(false); setPage(0); }}
            >
              <X className="w-3 h-3" />
              مسح الفلاتر
            </Button>
          )}
          <span className="text-xs text-muted-foreground self-center mr-auto">
            النتائج: {totalProducts}
          </span>
        </div>

        {/* Bulk Search Button */}
        <div className="mb-4 flex flex-col gap-2">
          {bulkSearching ? (
            <div className="flex items-center gap-3 w-full bg-muted/50 rounded-lg p-3">
              <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">
                    {bulkProgress.current}/{bulkProgress.total} — {bulkProgress.currentSku}
                  </span>
                  <span className="text-primary font-semibold">✅ {bulkProgress.found} | ❌ {bulkProgress.failed}</span>
                </div>
                <div className="w-full bg-border rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all"
                    style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                  />
                </div>
              </div>
              <Button variant="destructive" size="sm" onClick={handleStopBulk} className="shrink-0 text-xs">
                إيقاف
              </Button>
            </div>
          ) : aiMatching ? (
            <div className="flex items-center gap-3 w-full bg-primary/10 border border-primary/30 rounded-lg p-3">
              <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-muted-foreground">
                    🤖 فحص ذكي: {aiProgress.scanned}/{aiProgress.total || "..."} صورة
                  </span>
                  <span className="text-primary font-semibold">
                    ✅ تم ربط {aiProgress.applied} • محتمل {aiProgress.candidates}
                  </span>
                </div>
                <div className="w-full bg-border rounded-full h-1.5">
                  <div
                    className="bg-primary h-1.5 rounded-full transition-all"
                    style={{ width: aiProgress.total ? `${(aiProgress.scanned / aiProgress.total) * 100}%` : "5%" }}
                  />
                </div>
              </div>
              <Button variant="destructive" size="sm" onClick={handleStopAi} className="shrink-0 text-xs">
                إيقاف
              </Button>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" className="gap-2" onClick={handleBulkSearch}>
                <Wand2 className="w-4 h-4" />
                بحث تلقائي مجمّع
              </Button>
              <Button
                variant="default"
                className="gap-2 bg-primary hover:bg-primary/90"
                onClick={handleAiMatchAll}
                title="يفحص كل صور Storage بالذكاء الاصطناعي ويطابق البارت نمبر بدقة 100%"
              >
                <Wand2 className="w-4 h-4" />
                🤖 مطابقة الصور بالـ AI (تطابق 100%)
              </Button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !products || products.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">لا توجد منتجات</p>
        ) : (
          <div className="space-y-2 max-h-[600px] overflow-y-auto">
            {products.map((product) => (
              <div
                key={product.id}
                className={`flex items-center gap-3 border rounded-lg p-3 transition-colors ${
                  dragOverProductId === product.id
                    ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                    : "border-border hover:border-primary/30"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverProductId(product.id);
                }}
                onDragLeave={(e) => {
                  e.preventDefault();
                  if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                    setDragOverProductId(null);
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setDragOverProductId(null);
                  const file = e.dataTransfer.files?.[0];
                  if (file && file.type.startsWith("image/")) {
                    handleDropFile(product.id, file);
                  }
                }}
              >
                {/* Thumbnail */}
                <div className="w-14 h-14 rounded-lg bg-muted overflow-hidden shrink-0 flex items-center justify-center">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name_ar}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Package className="w-6 h-6 text-muted-foreground/30" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-card-foreground text-sm truncate">{product.name_ar}</p>
                  {(product as any).part_number && (
                    <p className="text-[11px] font-mono text-primary/80 truncate" dir="ltr" title="Part Number">
                      PN: {(product as any).part_number}
                    </p>
                  )}
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>{product.sku}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleCopySku(product.sku); }}
                      className="p-0.5 rounded hover:bg-muted transition-colors"
                      title="نسخ رقم القطعة"
                    >
                      {copiedSku === product.sku ? (
                        <Check className="w-3 h-3 text-green-500" />
                      ) : (
                        <Copy className="w-3 h-3 text-muted-foreground hover:text-foreground" />
                      )}
                    </button>
                    <span>• {brandLabels[product.brand] || product.brand}</span>
                  </div>
                  {dragOverProductId === product.id && (
                    <p className="text-xs text-primary font-medium mt-0.5">📥 أفلت الصورة هنا</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-1.5 shrink-0">
                  {uploading === product.id || searchingImages === product.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : (
                    <>
                      {/* Auto search button */}
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={() => handleAutoSearch(product)}
                        title="بحث تلقائي عن صورة"
                      >
                        <Wand2 className="w-3 h-3" />
                        بحث
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1 text-xs"
                        onClick={() => handleUploadClick(product.id)}
                      >
                        <Upload className="w-3 h-3" />
                        {product.image_url ? "تغيير" : "رفع"}
                      </Button>
                      {product.image_url && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveImage(product.id, product.image_url!)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-4 pt-4 border-t border-border flex-wrap gap-3">
            <p className="text-xs text-muted-foreground">
              {totalProducts} منتج • صفحة {page + 1} من {totalPages}
            </p>
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(0)}>
                الأولى
              </Button>
              <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                السابق
              </Button>
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={1}
                  max={totalPages}
                  value={page + 1}
                  onChange={(e) => {
                    const val = parseInt(e.target.value);
                    if (!isNaN(val) && val >= 1 && val <= totalPages) {
                      setPage(val - 1);
                    }
                  }}
                  className="w-16 h-8 text-center text-sm [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  dir="ltr"
                />
                <span className="text-xs text-muted-foreground">/ {totalPages}</span>
              </div>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                التالي
              </Button>
              <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(totalPages - 1)}>
                الأخيرة
              </Button>
            </div>
          </div>
        )}


        <Dialog open={!!imageSearchProduct} onOpenChange={(open) => { if (!open) setImageSearchProduct(null); }}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-right">
                بحث عن صورة: {imageSearchProduct?.sku}
              </DialogTitle>
            </DialogHeader>

            <p className="text-sm text-muted-foreground text-right mb-4">{imageSearchProduct?.name}</p>

            {/* Manual URL input */}
            <div className="flex gap-2 mb-4">
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1"
                onClick={() => imageSearchProduct && openPartSouq(imageSearchProduct.sku)}
              >
                <ExternalLink className="w-3 h-3" />
                PartSouq
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 gap-1"
                onClick={() => imageSearchProduct && openGoogleSearch(imageSearchProduct.sku)}
              >
                <ExternalLink className="w-3 h-3" />
                Google Images
              </Button>
              <Input
                placeholder="أو الصق رابط الصورة هنا..."
                value={manualUrl}
                onChange={(e) => setManualUrl(e.target.value)}
                className="text-sm"
                dir="ltr"
              />
              <Button
                size="sm"
                onClick={handleManualUrlSave}
                disabled={!manualUrl.trim() || !!savingImage}
                className="shrink-0"
              >
                {savingImage === manualUrl ? <Loader2 className="w-3 h-3 animate-spin" /> : "حفظ"}
              </Button>
            </div>

            {/* Image results */}
            {searchingImages ? (
              <div className="flex flex-col items-center gap-2 py-8">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">جاري البحث عن صور...</p>
              </div>
            ) : imageResults.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {imageResults.map((url, i) => (
                  <div
                    key={i}
                    className="relative border border-border rounded-lg overflow-hidden group cursor-pointer hover:border-primary transition-colors"
                    onClick={() => handleSelectImage(url)}
                  >
                    <img
                      src={url}
                      alt={`نتيجة ${i + 1}`}
                      className="w-full h-32 object-contain bg-muted"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = "none";
                      }}
                    />
                    <div className="absolute inset-0 bg-primary/0 group-hover:bg-primary/10 transition-colors flex items-center justify-center">
                      {savingImage === url ? (
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                      ) : (
                        <Check className="w-6 h-6 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : !searchingImages ? (
              <p className="text-center text-muted-foreground py-6 text-sm">
                لم يتم العثور على نتائج تلقائية. جرّب البحث في Google Images أو الصق رابط صورة.
              </p>
            ) : null}
          </DialogContent>
        </Dialog>
          </TabsContent>

          <TabsContent value="storage">
            <Suspense fallback={<div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>}>
              <StorageImageGallery />
            </Suspense>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AdminProductImages;
