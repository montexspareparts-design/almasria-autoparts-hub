import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ImageIcon, Search, Link2, Check, Package } from "lucide-react";

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

  // Fetch all images from storage
  const { data: storageFiles, isLoading: loadingFiles } = useQuery({
    queryKey: ["storage-images-gallery"],
    queryFn: async () => {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .list("", { limit: 500, sortBy: { column: "created_at", order: "desc" } });

      if (error) throw error;

      // Filter only image files (exclude folders like brand-logos, hero-videos)
      const imageFiles = (data || []).filter(f => {
        const ext = f.name.split(".").pop()?.toLowerCase();
        return ["jpg", "jpeg", "png", "webp", "gif"].includes(ext || "") && !f.name.includes("/");
      });

      return imageFiles.map(f => ({
        name: f.name,
        created_at: f.created_at || "",
        publicUrl: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${f.name}`,
      }));
    },
  });

  // Also fetch brand-logos subfolder
  const { data: brandLogos } = useQuery({
    queryKey: ["storage-images-gallery-brand-logos"],
    queryFn: async () => {
      const { data } = await supabase.storage.from(BUCKET).list("brand-logos", { limit: 100 });
      return (data || []).filter(f => {
        const ext = f.name.split(".").pop()?.toLowerCase();
        return ["jpg", "jpeg", "png", "webp"].includes(ext || "");
      }).map(f => ({
        name: `brand-logos/${f.name}`,
        created_at: f.created_at || "",
        publicUrl: `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/brand-logos/${f.name}`,
      }));
    },
  });

  const allImages = useMemo(() => [
    ...(storageFiles || []),
    ...(brandLogos || []),
  ], [storageFiles, brandLogos]);

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

  const handleLinkImage = async (product: Product) => {
    if (!selectedImage) return;
    setLinking(product.id);
    try {
      const urlWithCacheBust = `${selectedImage.publicUrl}?t=${Date.now()}`;
      const { error } = await supabase
        .from("products")
        .update({ image_url: urlWithCacheBust })
        .eq("id", product.id);

      if (error) throw error;

      toast({ title: `✅ تم ربط الصورة بـ ${product.name_ar}` });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (err: any) {
      toast({ title: "خطأ في الربط", description: err.message, variant: "destructive" });
    } finally {
      setLinking(null);
    }
  };

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
        <p>اضغط على أي صورة لربطها بمنتج. الصور القديمة اللي كانت موجودة قبل الحذف لسه هنا.</p>
      </div>

      {allImages.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">لا توجد صور في الـ Storage</p>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3 max-h-[500px] overflow-y-auto p-1">
          {allImages.map((file) => (
            <button
              key={file.name}
              onClick={() => { setSelectedImage(file); setProductSearch(""); }}
              className="group relative border border-border rounded-lg overflow-hidden hover:border-primary hover:ring-2 hover:ring-primary/20 transition-all bg-muted aspect-square"
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
              <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] px-1 py-0.5 truncate opacity-0 group-hover:opacity-100 transition-opacity">
                {file.name}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Link Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => { if (!open) setSelectedImage(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2">
              <Link2 className="w-4 h-4" />
              ربط الصورة بمنتج
            </DialogTitle>
          </DialogHeader>

          {selectedImage && (
            <div className="space-y-4">
              {/* Image preview */}
              <div className="border border-border rounded-lg overflow-hidden bg-muted flex items-center justify-center h-40">
                <img
                  src={selectedImage.publicUrl}
                  alt={selectedImage.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
              <p className="text-xs text-muted-foreground text-center" dir="ltr">{selectedImage.name}</p>

              {/* Product search */}
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

              {/* Results */}
              {loadingProducts ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                </div>
              ) : matchProducts && matchProducts.length > 0 ? (
                <div className="space-y-1.5 max-h-[250px] overflow-y-auto">
                  {matchProducts.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 p-2 border border-border rounded-lg hover:border-primary/40 transition-colors"
                    >
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
                        {linking === p.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3" />
                        )}
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
