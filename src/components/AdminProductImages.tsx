import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { Search, Upload, X, Package, Loader2, ImageIcon, Wand2, ExternalLink, Check } from "lucide-react";

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

  const { data: products, isLoading } = useQuery({
    queryKey: ["admin-products", search],
    queryFn: async () => {
      let query = supabase
        .from("products")
        .select("id, name_ar, sku, brand, image_url, product_categories(name_ar)")
        .order("name_ar");

      if (search) {
        query = query.or(`name_ar.ilike.%${search}%,sku.ilike.%${search}%`);
      }

      const { data, error } = await query.limit(50);
      if (error) throw error;
      return data;
    },
  });

  const handleUploadClick = (productId: string) => {
    setTargetProductId(productId);
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !targetProductId) return;

    if (!file.type.startsWith("image/")) {
      toast({ title: "يرجى اختيار ملف صورة", variant: "destructive" });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "حجم الصورة يجب أن يكون أقل من 5MB", variant: "destructive" });
      return;
    }

    setUploading(targetProductId);

    try {
      const ext = file.name.split(".").pop();
      const filePath = `${targetProductId}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from("products")
        .update({ image_url: urlData.publicUrl })
        .eq("id", targetProductId);

      if (updateError) throw updateError;

      toast({ title: "تم رفع الصورة بنجاح" });
      queryClient.invalidateQueries({ queryKey: ["admin-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    } catch (err: any) {
      toast({ title: "خطأ في رفع الصورة", description: err.message, variant: "destructive" });
    } finally {
      setUploading(null);
      setTargetProductId(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
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

  const openGoogleSearch = (sku: string) => {
    window.open(`https://www.google.com/search?q=${encodeURIComponent(sku + " toyota genuine part")}&tbm=isch`, "_blank");
  };

  const brandLabels: Record<string, string> = {
    toyota_genuine: "تويوتا أصلي",
    toyota_oils: "زيوت تويوتا",
    mtx_aftermarket: "MTX",
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
        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Search */}
        <div className="relative mb-4">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث بالاسم أو Part Number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
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
                className="flex items-center gap-3 border border-border rounded-lg p-3 hover:border-primary/30 transition-colors"
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
                  <p className="text-xs text-muted-foreground">
                    {product.sku} • {brandLabels[product.brand] || product.brand}
                  </p>
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

        {/* Image Search Results Dialog */}
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
      </CardContent>
    </Card>
  );
};

export default AdminProductImages;
