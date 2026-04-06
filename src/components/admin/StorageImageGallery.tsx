import { useState, useMemo, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ImageIcon, Search, Link2, Check, Package, Wand2, ArrowLeft, ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const BUCKET = "product-images";

interface StorageFile {
  name: string;
  created_at: string;
  publicUrl: string;
}

interface Product {
  id: string;
  name_ar: string;
  sku: string;
  brand: string;
  image_url: string | null;
}

const StorageImageGallery = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedImage, setSelectedImage] = useState<StorageFile | null>(null);
  const [productSearch, setProductSearch] = useState("");
  const [linking, setLinking] = useState<string | null>(null);
  const [quickLinkMode, setQuickLinkMode] = useState(false);
  const [currentImageIdx, setCurrentImageIdx] = useState(0);
  const [filterUnlinked, setFilterUnlinked] = useState(false);
  const [imageFilter, setImageFilter] = useState("");

  // Fetch all images from storage
  const { data: storageFiles, isLoading: loadingFiles } = useQuery({
    queryKey: ["storage-images-gallery"],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list("", { limit: 1000, sortBy: { column: "created_at", order: "desc" } });

      if (error) throw error;

      const imageFiles = (data || []).filter(f => {
        const ext = f.name.split(".").pop()?.toLowerCase();
        return ["jpg", "jpeg", "png", "webp", "gif", "avif"].includes(ext || "") && !f.name.includes("/");
      });

      return imageFiles.map(f => ({
        name: f.name,
        created_at: f.created_at || "",
        publicUrl: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${f.name}`,
      }));
    },
  });

  // Fetch products without images for quick-link mode
  const { data: noImageProducts } = useQuery({
    queryKey: ["products-no-image"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, name_ar, sku, brand, image_url")
        .is("image_url", null)
        .eq("is_active", true)
        .order("name_ar");
      return (data || []) as Product[];
    },
  });

  // Fetch all products with images (to know which storage files are linked)
  const { data: linkedProducts } = useQuery({
    queryKey: ["products-with-images"],
    queryFn: async () => {
      const { data } = await supabase
        .from("products")
        .select("id, image_url")
        .not("image_url", "is", null)
        .eq("is_active", true);
      return (data || []) as { id: string; image_url: string }[];
    },
  });

  const linkedFileNames = useMemo(() => {
    if (!linkedProducts) return new Set<string>();
    const names = new Set<string>();
    for (const p of linkedProducts) {
      if (p.image_url) {
        const match = p.image_url.match(/product-images\/([^?]+)/);
        if (match) names.add(match[1]);
      }
    }
    return names;
  }, [linkedProducts]);

  const allImages = useMemo(() => {
    let imgs = storageFiles || [];
    if (filterUnlinked) {
      imgs = imgs.filter(f => !linkedFileNames.has(f.name));
    }
    if (imageFilter) {
      imgs = imgs.filter(f => f.name.toLowerCase().includes(imageFilter.toLowerCase()));
    }
    return imgs;
  }, [storageFiles, filterUnlinked, linkedFileNames, imageFilter]);

  // Search products to link
  const { data: matchProducts, isLoading: loadingProducts } = useQuery({
    queryKey: ["link-products-search", productSearch],
    queryFn: async () => {
      if (!productSearch || productSearch.length < 2) return [];
      const { data } = await supabase
        .from("products")
        .select("id, name_ar, sku, brand, image_url")
        .or(`name_ar.ilike.%${productSearch}%,sku.ilike.%${productSearch}%`)
        .limit(20);
      return (data || []) as Product[];
    },
    enabled: !!productSearch && productSearch.length >= 2,
  });

  const handleLinkImage = async (product: Product, imageFile?: StorageFile) => {
    const img = imageFile || selectedImage;
    if (!img) return;
    setLinking(product.id);
    try {
      const urlWithCacheBust = `${img.publicUrl}?t=${Date.now()}`;
      const { error } = await supabase
        .from("products")
        .update({ image_url: urlWithCacheBust })
        .eq("id", product.id);

      if (error) throw error;

      toast({ title: `✅ تم ربط الصورة بـ ${product.name_ar}` });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["products-no-image"] });
      queryClient.invalidateQueries({ queryKey: ["products-with-images"] });
      
      // In quick link mode, move to next image
      if (quickLinkMode) {
        setCurrentImageIdx(prev => Math.min(prev, allImages.length - 1));
      }
    } catch (err: any) {
      toast({ title: "خطأ في الربط", description: err.message, variant: "destructive" });
    } finally {
      setLinking(null);
    }
  };

  const currentQuickImage = quickLinkMode && allImages.length > 0 ? allImages[currentImageIdx] : null;

  if (loadingFiles) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
        <p className="font-medium text-foreground mb-1">📂 معرض صور الـ Storage ({allImages.length} صورة)</p>
        <p>اضغط على أي صورة لربطها بمنتج، أو استخدم وضع الربط السريع.</p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <Button
          variant={quickLinkMode ? "default" : "outline"}
          size="sm"
          className="gap-1.5"
          onClick={() => { setQuickLinkMode(!quickLinkMode); setCurrentImageIdx(0); setProductSearch(""); }}
        >
          <Wand2 className="w-3.5 h-3.5" />
          {quickLinkMode ? "إغلاق الربط السريع" : "وضع الربط السريع"}
        </Button>
        <Button
          variant={filterUnlinked ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterUnlinked(!filterUnlinked)}
        >
          {filterUnlinked ? "عرض الكل" : "غير المرتبطة فقط"}
        </Button>
        <Badge variant="secondary" className="text-xs">
          {noImageProducts?.length || 0} منتج بدون صورة
        </Badge>
        <div className="relative flex-1 min-w-[150px] max-w-[250px]">
          <Search className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="فلترة الصور..."
            value={imageFilter}
            onChange={(e) => setImageFilter(e.target.value)}
            className="pr-8 h-8 text-xs"
          />
        </div>
      </div>

      {/* Quick Link Mode */}
      {quickLinkMode && currentQuickImage && (
        <div className="border-2 border-primary/30 rounded-xl p-4 bg-primary/5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-primary">
              وضع الربط السريع — صورة {currentImageIdx + 1} من {allImages.length}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" disabled={currentImageIdx === 0} onClick={() => setCurrentImageIdx(i => i - 1)}>
                <ChevronRight className="w-4 h-4" />
              </Button>
              <Input
                type="number"
                min={1}
                max={allImages.length}
                value={currentImageIdx + 1}
                onChange={(e) => {
                  const v = parseInt(e.target.value);
                  if (!isNaN(v) && v >= 1 && v <= allImages.length) setCurrentImageIdx(v - 1);
                }}
                className="w-14 h-8 text-center text-xs"
                dir="ltr"
              />
              <Button variant="outline" size="sm" disabled={currentImageIdx >= allImages.length - 1} onClick={() => setCurrentImageIdx(i => i + 1)}>
                <ChevronLeft className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setCurrentImageIdx(i => Math.min(i + 1, allImages.length - 1))} className="text-xs text-muted-foreground">
                تخطي ←
              </Button>
            </div>
          </div>

          <div className="flex gap-4 flex-col md:flex-row">
            {/* Image preview */}
            <div className="w-full md:w-1/3 shrink-0">
              <div className="border border-border rounded-lg overflow-hidden bg-white flex items-center justify-center aspect-square">
                <img
                  src={currentQuickImage.publicUrl}
                  alt={currentQuickImage.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-1 truncate" dir="ltr">{currentQuickImage.name}</p>
            </div>

            {/* Product search & list */}
            <div className="flex-1 space-y-3">
              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="ابحث عن المنتج بالاسم أو رقم القطعة..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pr-10"
                  autoFocus
                />
              </div>

              {loadingProducts ? (
                <div className="flex justify-center py-3">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              ) : (matchProducts && matchProducts.length > 0) ? (
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  {matchProducts.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 p-2 border border-border rounded-lg hover:border-primary/40 transition-colors">
                      <div className="w-8 h-8 bg-muted rounded overflow-hidden shrink-0 flex items-center justify-center">
                        {p.image_url ? (
                          <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-3.5 h-3.5 text-muted-foreground/30" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{p.name_ar}</p>
                        <p className="text-[10px] text-muted-foreground" dir="ltr">{p.sku}</p>
                      </div>
                      <Button
                        size="sm"
                        variant={p.image_url ? "outline" : "default"}
                        className="shrink-0 gap-1 text-xs h-7"
                        onClick={() => handleLinkImage(p, currentQuickImage)}
                        disabled={!!linking}
                      >
                        {linking === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        {p.image_url ? "استبدال" : "ربط"}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : productSearch.length >= 2 ? (
                <p className="text-center text-muted-foreground text-xs py-3">لا توجد نتائج</p>
              ) : (
                /* Show products without images as suggestions */
                <div className="space-y-1 max-h-[200px] overflow-y-auto">
                  <p className="text-xs text-muted-foreground mb-1">💡 منتجات بدون صور:</p>
                  {noImageProducts?.slice(0, 15).map((p) => (
                    <div key={p.id} className="flex items-center gap-2 p-1.5 border border-border rounded hover:border-primary/40 transition-colors">
                      <Package className="w-3.5 h-3.5 text-muted-foreground/30 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs truncate">{p.name_ar}</p>
                        <p className="text-[10px] text-muted-foreground" dir="ltr">{p.sku}</p>
                      </div>
                      <Button
                        size="sm"
                        className="shrink-0 text-[10px] h-6 px-2"
                        onClick={() => handleLinkImage(p, currentQuickImage)}
                        disabled={!!linking}
                      >
                        {linking === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : "ربط"}
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Grid view */}
      {allImages.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">لا توجد صور في الـ Storage</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-[500px] overflow-y-auto p-1">
          {allImages.map((file, idx) => (
            <button
              key={file.name}
              onClick={() => {
                if (quickLinkMode) {
                  setCurrentImageIdx(idx);
                } else {
                  setSelectedImage(file);
                  setProductSearch("");
                }
              }}
              className={`group relative border rounded-lg overflow-hidden hover:border-primary hover:ring-2 hover:ring-primary/20 transition-all bg-muted aspect-square ${
                quickLinkMode && idx === currentImageIdx ? "border-primary ring-2 ring-primary/30" : "border-border"
              } ${linkedFileNames.has(file.name) ? "opacity-40" : ""}`}
            >
              <img
                src={file.publicUrl}
                alt={file.name}
                className="w-full h-full object-contain p-1"
                loading="lazy"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder.svg";
                }}
              />
              {linkedFileNames.has(file.name) && (
                <div className="absolute top-1 right-1">
                  <Badge variant="secondary" className="text-[8px] px-1 py-0 h-4">مرتبطة</Badge>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                {file.name}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Standard Link Dialog (non-quick mode) */}
      <Dialog open={!!selectedImage && !quickLinkMode} onOpenChange={(open) => { if (!open) setSelectedImage(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              ربط الصورة بمنتج
            </DialogTitle>
          </DialogHeader>

          {selectedImage && (
            <div className="space-y-4">
              <div className="border border-border rounded-lg overflow-hidden bg-muted flex items-center justify-center h-40">
                <img src={selectedImage.publicUrl} alt={selectedImage.name} className="max-h-full max-w-full object-contain" />
              </div>
              <p className="text-xs text-muted-foreground text-center" dir="ltr">{selectedImage.name}</p>

              <div className="relative">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="ابحث عن المنتج بالاسم أو رقم القطعة..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="pr-10"
                  autoFocus
                />
              </div>

              {loadingProducts ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              ) : matchProducts && matchProducts.length > 0 ? (
                <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                  {matchProducts.map((p) => (
                    <div key={p.id} className="flex items-center gap-2 p-2 border border-border rounded-lg hover:border-primary/40 transition-colors">
                      <div className="w-10 h-10 bg-muted rounded overflow-hidden shrink-0 flex items-center justify-center">
                        {p.image_url ? (
                          <img src={p.image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-4 h-4 text-muted-foreground/30" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{p.name_ar}</p>
                        <p className="text-xs text-muted-foreground" dir="ltr">{p.sku}</p>
                      </div>
                      <Button
                        size="sm"
                        variant={p.image_url ? "outline" : "default"}
                        className="shrink-0 gap-1 text-xs"
                        onClick={() => handleLinkImage(p)}
                        disabled={!!linking}
                      >
                        {linking === p.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                        {p.image_url ? "استبدال" : "ربط"}
                      </Button>
                    </div>
                  ))}
                </div>
              ) : productSearch.length >= 2 ? (
                <p className="text-center text-muted-foreground text-sm py-4">لا توجد نتائج</p>
              ) : (
                <p className="text-center text-muted-foreground text-sm py-4">اكتب اسم المنتج أو رقم القطعة للبحث</p>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default StorageImageGallery;
