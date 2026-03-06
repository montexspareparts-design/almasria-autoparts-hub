import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Search, Upload, X, Package, Loader2, ImageIcon } from "lucide-react";

const AdminProductImages = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [uploading, setUploading] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [targetProductId, setTargetProductId] = useState<string | null>(null);

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

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from("product-images")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("product-images")
        .getPublicUrl(filePath);

      // Update product record
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
      // Extract file path from URL
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
            placeholder="ابحث بالاسم أو رقم الصنف..."
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
                    {product.product_categories && ` • ${(product.product_categories as any).name_ar}`}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex gap-2 shrink-0">
                  {uploading === product.id ? (
                    <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  ) : (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-1"
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
      </CardContent>
    </Card>
  );
};

export default AdminProductImages;
