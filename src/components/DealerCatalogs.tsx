import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Download, Lock, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Catalog {
  id: string;
  title_ar: string;
  title_en: string | null;
  category: string | null;
  description_ar: string | null;
  file_url: string | null;
  is_active: boolean;
  sort_order: number | null;
}

interface DealerCatalogsProps {
  isWholesale: boolean;
}

const categoryColors: Record<string, string> = {
  toyota_genuine: "bg-blue-500/10 text-blue-400",
  toyota_oils: "bg-amber-500/10 text-amber-400",
  mtx_aftermarket: "bg-violet-500/10 text-violet-400",
  denso: "bg-green-500/10 text-green-400",
  aisin: "bg-rose-500/10 text-rose-400",
  general: "bg-muted text-muted-foreground",
};

const categoryLabels: Record<string, string> = {
  toyota_genuine: "قطع أصلية تويوتا",
  toyota_oils: "زيوت تويوتا",
  mtx_aftermarket: "قطع MTX",
  denso: "DENSO",
  aisin: "AISIN",
  general: "عام",
};

const DealerCatalogs = ({ isWholesale }: DealerCatalogsProps) => {
  const { toast } = useToast();
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState<string | null>(null);

  useEffect(() => {
    if (isWholesale) fetchCatalogs();
    else setLoading(false);
  }, [isWholesale]);

  const fetchCatalogs = async () => {
    const { data } = await supabase
      .from("catalogs")
      .select("*")
      .eq("is_active", true)
      .order("sort_order", { ascending: true });
    setCatalogs(data || []);
    setLoading(false);
  };

  const handleDownload = async (catalog: Catalog) => {
    if (!catalog.file_url) {
      toast({ title: "الملف غير متوفر", variant: "destructive" });
      return;
    }

    setDownloading(catalog.id);

    const { data, error } = await supabase.storage
      .from("catalogs")
      .createSignedUrl(catalog.file_url, 300); // 5 minutes

    if (error || !data?.signedUrl) {
      toast({ title: "تعذّر تحميل الملف، حاول مجدداً", variant: "destructive" });
    } else {
      const a = document.createElement("a");
      a.href = data.signedUrl;
      a.download = `${catalog.title_ar}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      toast({ title: `جاري تحميل: ${catalog.title_ar}` });
    }

    setDownloading(null);
  };

  // Locked state for non-wholesale dealers
  if (!isWholesale) {
    return (
      <Card className="border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="w-5 h-5 text-primary" />
            كتالوجات المنتجات
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-12 text-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Lock className="w-8 h-8 text-primary/50" />
            </div>
            <div>
              <p className="font-bold text-foreground mb-1">محتوى حصري لتجار الجملة</p>
              <p className="text-sm text-muted-foreground max-w-xs">
                الكتالوجات التفصيلية متاحة فقط لتجار الجملة المعتمدين (درجة أولى أو ثانية)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card className="border-primary/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <FileText className="w-5 h-5 text-primary" />
          كتالوجات المنتجات الحصرية
          <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-normal">
            تجار الجملة فقط
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {catalogs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            لا توجد كتالوجات متاحة حالياً، تابعونا للتحديثات
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {catalogs.map((catalog) => (
              <div
                key={catalog.id}
                className="border border-border rounded-lg p-4 hover:border-primary/40 transition-all hover:shadow-md group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-12 h-14 bg-primary/10 rounded-md flex items-center justify-center flex-shrink-0 group-hover:bg-primary/20 transition-colors">
                    <FileText className="w-6 h-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-foreground text-sm leading-snug">{catalog.title_ar}</p>
                    {catalog.title_en && (
                      <p className="text-xs text-muted-foreground mt-0.5" dir="ltr">{catalog.title_en}</p>
                    )}
                    {catalog.description_ar && (
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{catalog.description_ar}</p>
                    )}
                    {catalog.category && (
                      <span
                        className={`inline-block text-xs px-2 py-0.5 rounded mt-2 font-medium ${
                          categoryColors[catalog.category] || categoryColors.general
                        }`}
                      >
                        {categoryLabels[catalog.category] || catalog.category}
                      </span>
                    )}
                  </div>
                </div>

                <Button
                  size="sm"
                  className="w-full mt-3 gap-2"
                  onClick={() => handleDownload(catalog)}
                  disabled={downloading === catalog.id || !catalog.file_url}
                >
                  {downloading === catalog.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Download className="w-3 h-3" />
                  )}
                  {downloading === catalog.id ? "جاري التحميل..." : "تحميل PDF"}
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DealerCatalogs;
