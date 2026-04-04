import { useState, useRef } from "react";
import { Hash, Search, Loader2, Car, Calendar, AlertCircle, Package, ChevronDown, ChevronUp, Camera, Upload, X, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

interface DecodedVIN {
  valid: boolean;
  vin: string;
  is_toyota: boolean;
  year: number | null;
  model: string | null;
  model_ar: string | null;
  manufacturer: string;
}

interface VINProduct {
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

const VINScannerDialog = ({ onProductFound }: Props) => {
  const [open, setOpen] = useState(false);
  const [vin, setVin] = useState("");
  const [loading, setLoading] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [decoded, setDecoded] = useState<DecodedVIN | null>(null);
  const [products, setProducts] = useState<VINProduct[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const handleScan = async () => {
    const cleanVin = vin.trim().replace(/[^A-Za-z0-9]/g, "");
    if (cleanVin.length !== 17) {
      toast({ title: "رقم شاسيه غير صحيح", description: "يجب أن يتكون من 17 حرف ورقم", variant: "destructive" });
      return;
    }

    setLoading(true);
    setDecoded(null);
    setProducts([]);

    try {
      const { data, error } = await supabase.functions.invoke("decode-vin", {
        body: { vin: cleanVin },
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setDecoded(data.decoded);
      setProducts(data.products || []);

      if (!data.decoded.is_toyota) {
        toast({ title: "هذا الرقم ليس لسيارة تويوتا", description: "نحن متخصصون في قطع غيار تويوتا فقط", variant: "destructive" });
      }
    } catch (err) {
      console.error("VIN decode error:", err);
      toast({ title: "حدث خطأ", description: "فشل في فك رقم الشاسيه", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = async (file: File) => {
    if (!file || !file.type.startsWith("image/")) {
      toast({ title: "يرجى اختيار صورة", variant: "destructive" });
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = async (e) => {
      const dataUrl = e.target?.result as string;
      setPreviewImage(dataUrl);

      // Extract base64
      const base64 = dataUrl.split(",")[1];
      setOcrLoading(true);

      try {
        const { data, error } = await supabase.functions.invoke("ocr-vin", {
          body: { image_base64: base64 },
        });

        if (error) throw error;

        if (data?.vin) {
          setVin(data.vin);
          toast({ title: "تم التعرف على رقم الشاسيه ✅", description: data.vin });
        } else {
          toast({
            title: "لم يتم التعرف على الرقم",
            description: data?.error || "حاول التقاط صورة أوضح",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.error("OCR error:", err);
        toast({ title: "حدث خطأ في قراءة الصورة", variant: "destructive" });
      } finally {
        setOcrLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCopyVin = () => {
    if (vin) {
      navigator.clipboard.writeText(vin);
      setCopied(true);
      toast({ title: "تم نسخ رقم الشاسيه ✅" });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleApplySearch = (keyword: string) => {
    onProductFound?.(keyword);
    setOpen(false);
  };

  const resetState = () => {
    setVin("");
    setDecoded(null);
    setProducts([]);
    setShowAll(false);
    setPreviewImage(null);
    setCopied(false);
  };

  const displayedProducts = showAll ? products : products.slice(0, 6);

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetState(); }}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="shrink-0 border-primary/20 hover:border-primary/50 hover:bg-primary/5" title="بحث برقم الشاسيه">
          <Hash className="w-4 h-4 text-primary" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-right">
            <Car className="w-5 h-5 text-primary" />
            ماسح رقم الشاسيه (VIN)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg p-3 leading-relaxed">
            أدخل رقم الشاسيه يدوياً أو <strong>صوّره بالكاميرا / ارفع صورة</strong> وهنتعرف عليه تلقائياً بالذكاء الاصطناعي.
          </div>

          {/* Image Upload Section */}
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
            />
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
            />

            <Button
              variant="outline"
              className="flex-1 gap-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 h-12"
              onClick={() => cameraInputRef.current?.click()}
              disabled={ocrLoading}
            >
              <Camera className="w-5 h-5 text-primary" />
              <span className="text-sm font-bold">صوّر الرقم</span>
            </Button>
            <Button
              variant="outline"
              className="flex-1 gap-2 border-dashed border-primary/30 hover:border-primary/60 hover:bg-primary/5 h-12"
              onClick={() => fileInputRef.current?.click()}
              disabled={ocrLoading}
            >
              <Upload className="w-5 h-5 text-primary" />
              <span className="text-sm font-bold">ارفع صورة</span>
            </Button>
          </div>

          {/* Image Preview */}
          <AnimatePresence>
            {previewImage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="relative rounded-xl overflow-hidden border border-border"
              >
                <img src={previewImage} alt="VIN" className="w-full max-h-40 object-contain bg-muted/30" />
                {ocrLoading && (
                  <div className="absolute inset-0 bg-background/80 flex flex-col items-center justify-center gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                    <span className="text-xs font-bold text-primary">جاري قراءة الرقم بالذكاء الاصطناعي...</span>
                  </div>
                )}
                <button
                  onClick={() => setPreviewImage(null)}
                  className="absolute top-2 left-2 w-6 h-6 rounded-full bg-background/80 flex items-center justify-center hover:bg-background transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Divider */}
          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-border" />
            <span className="text-[10px] text-muted-foreground font-bold">أو أدخل يدوياً</span>
            <div className="flex-1 h-px bg-border" />
          </div>

          {/* VIN Input */}
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Input
                value={vin}
                onChange={(e) => setVin(e.target.value.toUpperCase())}
                placeholder="مثال: JTDKN3DU5A0123456"
                className="font-mono text-sm tracking-wider pr-9"
                dir="ltr"
                maxLength={17}
              />
              {vin.length > 0 && (
                <button
                  onClick={handleCopyVin}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted transition-colors"
                  title="نسخ"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-muted-foreground" />}
                </button>
              )}
            </div>
            <Button onClick={handleScan} disabled={loading || vin.length < 17} className="gap-1.5 shrink-0">
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              فك
            </Button>
          </div>

          {/* VIN character count */}
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground text-left" dir="ltr">
              <span className={vin.replace(/[^A-Za-z0-9]/g, "").length === 17 ? "text-green-500 font-bold" : ""}>
                {vin.replace(/[^A-Za-z0-9]/g, "").length}
              </span>
              /17
            </div>
            {vin.length === 17 && !loading && !decoded && (
              <motion.span
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-xs text-primary font-bold"
              >
                ✅ جاهز — اضغط "فك"
              </motion.span>
            )}
          </div>

          {/* Decoded info */}
          <AnimatePresence>
            {decoded && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-4"
              >
                {/* Vehicle info card */}
                <div className={`rounded-xl p-4 border ${decoded.is_toyota ? "bg-primary/5 border-primary/20" : "bg-destructive/5 border-destructive/20"}`}>
                  <div className="flex items-center gap-2 mb-3">
                    <Car className={`w-5 h-5 ${decoded.is_toyota ? "text-primary" : "text-destructive"}`} />
                    <span className="font-bold text-foreground">
                      {decoded.is_toyota ? "سيارة تويوتا" : "ليست تويوتا"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {decoded.model_ar && (
                      <div className="flex items-center gap-2">
                        <Car className="w-3.5 h-3.5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">الموديل</p>
                          <p className="font-bold text-sm text-foreground">{decoded.model_ar}</p>
                        </div>
                      </div>
                    )}
                    {decoded.year && (
                      <div className="flex items-center gap-2">
                        <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                        <div>
                          <p className="text-xs text-muted-foreground">سنة الصنع</p>
                          <p className="font-bold text-sm text-foreground">{decoded.year}</p>
                        </div>
                      </div>
                    )}
                  </div>

                  {decoded.model_ar && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-3 gap-1.5"
                      onClick={() => handleApplySearch(decoded.model_ar!)}
                    >
                      <Search className="w-3.5 h-3.5" />
                      بحث عن قطع {decoded.model_ar}
                    </Button>
                  )}
                </div>

                {/* Compatible products */}
                {products.length > 0 ? (
                  <div>
                    <h4 className="text-sm font-bold text-foreground mb-2 flex items-center gap-1.5">
                      <Package className="w-4 h-4 text-primary" />
                      {products.length} قطعة متوافقة
                    </h4>
                    <div className="space-y-2">
                      {displayedProducts.map((p) => (
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

                    {products.length > 6 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-2 gap-1"
                        onClick={() => setShowAll(!showAll)}
                      >
                        {showAll ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {showAll ? "عرض أقل" : `عرض الكل (${products.length})`}
                      </Button>
                    )}
                  </div>
                ) : decoded.is_toyota ? (
                  <div className="text-center py-4">
                    <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">لم يتم العثور على قطع متوافقة محددة</p>
                    {decoded.model_ar && (
                      <Button variant="outline" size="sm" className="mt-2" onClick={() => handleApplySearch(decoded.model_ar!)}>
                        ابحث عن قطع {decoded.model_ar}
                      </Button>
                    )}
                  </div>
                ) : null}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default VINScannerDialog;
