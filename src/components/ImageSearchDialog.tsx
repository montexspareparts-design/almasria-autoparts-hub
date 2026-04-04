import { useState, useRef } from "react";
import { Camera, Upload, X, Loader2, Search, Package, Sparkles, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface IdentifiedPart {
  part_name_ar: string;
  part_name_en: string;
  category: string;
  confidence: number;
  search_keywords: string[];
  compatible_models?: string[];
}

interface MatchedProduct {
  id: string;
  name_ar: string;
  sku: string;
  image_url: string | null;
  base_price: number;
  brand: string;
  stock_quantity: number;
}

interface Props {
  onProductFound?: (searchTerm: string) => void;
}

const ImageSearchDialog = ({ onProductFound }: Props) => {
  const [open, setOpen] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ identification: IdentifiedPart; products: MatchedProduct[] } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "حجم الصورة كبير", description: "الحد الأقصى 5 ميجابايت", variant: "destructive" });
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      setImagePreview(ev.target?.result as string);
      setResult(null);
    };
    reader.readAsDataURL(file);
  };

  const handleSearch = async () => {
    if (!imagePreview) return;
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke("identify-part-image", {
        body: { imageBase64: imagePreview },
      });

      if (error) throw error;
      if (data?.error) {
        if (data.error === "rate_limited") {
          toast({ title: "يرجى المحاولة لاحقاً", description: "تم تجاوز الحد المسموح من الطلبات", variant: "destructive" });
        } else if (data.error === "credits_exhausted") {
          toast({ title: "الرصيد غير كافي", description: "يرجى التواصل مع الإدارة", variant: "destructive" });
        } else {
          throw new Error(data.error);
        }
        return;
      }

      setResult(data);

      if (data.identification?.confidence < 30) {
        toast({ title: "لم نتمكن من تحديد القطعة بدقة", description: "حاول التقاط صورة أوضح", variant: "destructive" });
      }
    } catch (err) {
      console.error("Image search error:", err);
      toast({ title: "حدث خطأ", description: "فشل في تحليل الصورة", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleApplySearch = (keyword: string) => {
    onProductFound?.(keyword);
    setOpen(false);
    resetState();
  };

  const resetState = () => {
    setImagePreview(null);
    setResult(null);
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetState(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0 border-primary/20 hover:border-primary/50 hover:bg-primary/5" title="بحث بالصورة">
          <Camera className="w-4 h-4 text-primary" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <Sparkles className="w-5 h-5 text-primary" />
            بحث ذكي بالصورة
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Upload area */}
          {!imagePreview ? (
            <label className="flex flex-col items-center justify-center gap-3 border-2 border-dashed border-primary/30 rounded-xl p-8 cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-all">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Upload className="w-8 h-8 text-primary" />
              </div>
              <div className="text-center">
                <p className="font-bold text-foreground">التقط أو ارفع صورة القطعة</p>
                <p className="text-xs text-muted-foreground mt-1">JPG, PNG — حد أقصى 5MB</p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleImageSelect}
              />
            </label>
          ) : (
            <div className="relative">
              <img src={imagePreview} alt="Preview" className="w-full h-48 object-contain rounded-xl bg-muted" />
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 left-2 w-7 h-7"
                onClick={resetState}
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          )}

          {/* Search button */}
          {imagePreview && !result && (
            <Button className="w-full gap-2" onClick={handleSearch} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  جاري تحليل الصورة بالذكاء الاصطناعي...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  ابحث عن القطعة
                </>
              )}
            </Button>
          )}

          {/* Results */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Identification card */}
                <div className="bg-primary/5 border border-primary/20 rounded-xl p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h3 className="font-bold text-foreground text-lg">{result.identification.part_name_ar}</h3>
                      <p className="text-sm text-muted-foreground">{result.identification.part_name_en}</p>
                    </div>
                    <div className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      result.identification.confidence >= 70 ? "bg-green-100 text-green-700" :
                      result.identification.confidence >= 40 ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    }`}>
                      {result.identification.confidence}% دقة
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {result.identification.search_keywords?.map((kw, i) => (
                      <button
                        key={i}
                        onClick={() => handleApplySearch(kw)}
                        className="text-xs bg-primary/10 text-primary px-2.5 py-1 rounded-full hover:bg-primary/20 transition-colors cursor-pointer"
                      >
                        {kw}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Matched products */}
                {result.products.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-primary" />
                      {result.products.length} منتج متوافق
                    </h4>
                    <div className="max-h-48 overflow-y-auto space-y-2 custom-scrollbar">
                      {result.products.slice(0, 8).map((p) => (
                        <button
                          key={p.id}
                          onClick={() => handleApplySearch(p.name_ar.split(" ").slice(0, 3).join(" "))}
                          className="w-full flex items-center gap-3 p-2.5 rounded-lg border border-border hover:border-primary/30 hover:bg-muted/50 transition-all text-right"
                        >
                          {p.image_url ? (
                            <img src={p.image_url} alt="" className="w-10 h-10 rounded-lg object-contain bg-white shrink-0" />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center shrink-0">
                              <Package className="w-5 h-5 text-muted-foreground" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground truncate">{p.name_ar}</p>
                            <p className="text-xs text-muted-foreground font-mono" dir="ltr">{p.sku}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">لم يتم العثور على منتجات متطابقة</p>
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => handleApplySearch(result.identification.part_name_ar)}>
                      ابحث في الكتالوج
                    </Button>
                  </div>
                )}

                {/* Try again */}
                <Button variant="outline" className="w-full" onClick={resetState}>
                  جرب صورة أخرى
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageSearchDialog;
