import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, CheckCircle, XCircle, AlertTriangle, ScanSearch, Package } from "lucide-react";

type VerifyResult = {
  productId: string;
  sku: string;
  name: string;
  imageUrl: string;
  brand?: string;
  confidence: "match" | "mismatch" | "uncertain" | "error";
  reason: string;
  imageDescription?: string;
  partNumberVisible?: boolean;
  partNumberMatch?: boolean | null;
  nameMatch?: boolean;
};

const brandLabels: Record<string, string> = {
  toyota_genuine: "قطع تويوتا الأصلية",
  toyota_oils: "زيوت تويوتا",
  mtx_aftermarket: "MTX Aftermarket",
  denso: "DENSO",
  aisin: "AISIN",
  fbk: "تيل فرامل FBK",
};

const AdminImageVerifier = () => {
  const [results, setResults] = useState<VerifyResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [brand, setBrand] = useState<string>("all");
  const [page, setPage] = useState(0);

  const handleVerify = async () => {
    setLoading(true);
    setResults([]);
    try {
      // Get products with images for selected brand
      let query = supabase
        .from("products")
        .select("id")
        .eq("is_active", true)
        .not("image_url", "is", null);

      if (brand !== "all") {
        query = query.eq("brand", brand as any);
      }

      const { data: products } = await query
        .range(page * 20, (page + 1) * 20 - 1);

      if (!products || products.length === 0) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase.functions.invoke(
        "verify-product-images",
        {
          body: { productIds: products.map((p) => p.id) },
        }
      );

      if (error) throw error;
      setResults(data.results || []);
    } catch (e) {
      console.error("Verification error:", e);
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    match: results.filter((r) => r.confidence === "match").length,
    mismatch: results.filter((r) => r.confidence === "mismatch").length,
    uncertain: results.filter((r) => r.confidence === "uncertain").length,
    error: results.filter((r) => r.confidence === "error").length,
  };

  const confidenceIcon = (c: string) => {
    switch (c) {
      case "match":
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case "mismatch":
        return <XCircle className="w-5 h-5 text-destructive" />;
      case "uncertain":
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-muted-foreground" />;
    }
  };

  const confidenceLabel = (c: string) => {
    switch (c) {
      case "match": return "مطابق ✅";
      case "mismatch": return "غير مطابق ❌";
      case "uncertain": return "غير مؤكد ⚠️";
      default: return "خطأ";
    }
  };

  const confidenceBg = (c: string) => {
    switch (c) {
      case "match": return "bg-green-500/10 border-green-500/20";
      case "mismatch": return "bg-destructive/10 border-destructive/20";
      case "uncertain": return "bg-amber-500/10 border-amber-500/20";
      default: return "bg-muted border-border";
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ScanSearch className="w-5 h-5 text-primary" />
          مراجعة صور المنتجات بالذكاء الاصطناعي
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={brand} onValueChange={setBrand}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="اختر الماركة" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">جميع الماركات</SelectItem>
              {Object.entries(brandLabels).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              السابق
            </Button>
            <span className="text-sm text-muted-foreground">
              صفحة {page + 1}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => p + 1)}
            >
              التالي
            </Button>
          </div>

          <Button
            onClick={handleVerify}
            disabled={loading}
            className="gap-2"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <ScanSearch className="w-4 h-4" />
            )}
            {loading ? "جاري التحليل..." : "ابدأ المراجعة (20 صنف)"}
          </Button>
        </div>

        {loading && (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">
              جاري تحليل الصور بالذكاء الاصطناعي... قد يستغرق دقيقة
            </p>
          </div>
        )}

        {/* Stats */}
        {results.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-green-500/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-black text-green-600">{stats.match}</p>
              <p className="text-xs text-green-600/80">مطابق</p>
            </div>
            <div className="bg-destructive/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-black text-destructive">{stats.mismatch}</p>
              <p className="text-xs text-destructive/80">غير مطابق</p>
            </div>
            <div className="bg-amber-500/10 rounded-lg p-3 text-center">
              <p className="text-2xl font-black text-amber-600">{stats.uncertain}</p>
              <p className="text-xs text-amber-600/80">غير مؤكد</p>
            </div>
            <div className="bg-muted rounded-lg p-3 text-center">
              <p className="text-2xl font-black text-muted-foreground">{stats.error}</p>
              <p className="text-xs text-muted-foreground">خطأ</p>
            </div>
          </div>
        )}

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-3">
            {/* Show mismatches first */}
            {[...results]
              .sort((a, b) => {
                const order = { mismatch: 0, uncertain: 1, error: 2, match: 3 };
                return (order[a.confidence] ?? 4) - (order[b.confidence] ?? 4);
              })
              .map((r) => (
                <div
                  key={r.productId}
                  className={`border rounded-xl p-4 ${confidenceBg(r.confidence)}`}
                >
                  <div className="flex gap-4">
                    {/* Image */}
                    <div className="w-20 h-20 bg-white rounded-lg overflow-hidden shrink-0">
                      {r.imageUrl ? (
                        <img
                          src={r.imageUrl}
                          alt={r.name}
                          className="w-full h-full object-contain p-1"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Package className="w-8 h-8 text-muted-foreground/20" />
                        </div>
                      )}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div>
                          <p className="font-bold text-foreground text-sm line-clamp-1">
                            {r.name}
                          </p>
                          <p className="text-xs font-mono text-muted-foreground">
                            {r.sku}
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          {confidenceIcon(r.confidence)}
                          <span className="text-xs font-bold">
                            {confidenceLabel(r.confidence)}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground leading-relaxed mt-1">
                        {r.reason}
                      </p>
                      {r.imageDescription && (
                        <p className="text-xs text-muted-foreground/70 mt-1 italic">
                          📷 {r.imageDescription}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminImageVerifier;
