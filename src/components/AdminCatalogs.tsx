import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, Trash2, Eye, EyeOff, Plus } from "lucide-react";

interface Catalog {
  id: string;
  title_ar: string;
  title_en: string | null;
  category: string | null;
  description_ar: string | null;
  file_url: string | null;
  is_active: boolean;
  sort_order: number | null;
  created_at: string;
}

const categories = [
  { value: "toyota_genuine", label: "قطع غيار تويوتا الأصلية" },
  { value: "toyota_oils", label: "زيوت تويوتا" },
  { value: "mtx_aftermarket", label: "قطع MTX" },
  { value: "denso", label: "DENSO" },
  { value: "aisin", label: "AISIN" },
  { value: "general", label: "عام" },
];

const AdminCatalogs = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [catalogs, setCatalogs] = useState<Catalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title_ar: "",
    title_en: "",
    category: "",
    description_ar: "",
    sort_order: "0",
  });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => {
    fetchCatalogs();
  }, []);

  const fetchCatalogs = async () => {
    const { data } = await supabase
      .from("catalogs")
      .select("*")
      .order("sort_order", { ascending: true });
    setCatalogs(data || []);
    setLoading(false);
  };

  const handleUpload = async () => {
    if (!form.title_ar || !selectedFile) {
      toast({ title: "يرجى إدخال العنوان واختيار ملف PDF", variant: "destructive" });
      return;
    }

    setUploading(true);

    // Upload PDF to storage
    const fileName = `${Date.now()}-${selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("catalogs")
      .upload(fileName, selectedFile, { contentType: "application/pdf" });

    if (uploadError) {
      toast({ title: "خطأ في رفع الملف", description: uploadError.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    // Save catalog record
    const { error: dbError } = await supabase.from("catalogs").insert({
      title_ar: form.title_ar,
      title_en: form.title_en || null,
      category: form.category || null,
      description_ar: form.description_ar || null,
      file_url: uploadData.path,
      sort_order: parseInt(form.sort_order) || 0,
      is_active: true,
    });

    if (dbError) {
      toast({ title: "خطأ في حفظ البيانات", description: dbError.message, variant: "destructive" });
    } else {
      toast({ title: "تم رفع الكتالوج بنجاح ✅" });
      setForm({ title_ar: "", title_en: "", category: "", description_ar: "", sort_order: "0" });
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setShowForm(false);
      fetchCatalogs();
    }

    setUploading(false);
  };

  const toggleActive = async (catalog: Catalog) => {
    await supabase
      .from("catalogs")
      .update({ is_active: !catalog.is_active })
      .eq("id", catalog.id);
    fetchCatalogs();
  };

  const handleDelete = async (catalog: Catalog) => {
    if (!confirm(`هل أنت متأكد من حذف "${catalog.title_ar}"؟`)) return;

    if (catalog.file_url) {
      await supabase.storage.from("catalogs").remove([catalog.file_url]);
    }

    await supabase.from("catalogs").delete().eq("id", catalog.id);
    toast({ title: "تم حذف الكتالوج" });
    fetchCatalogs();
  };

  const getCategoryLabel = (value: string | null) =>
    categories.find((c) => c.value === value)?.label || value || "—";

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-primary" />
          إدارة كتالوجات PDF
        </CardTitle>
        <Button
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="gap-2"
        >
          <Plus className="w-4 h-4" />
          رفع كتالوج جديد
        </Button>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Upload Form */}
        {showForm && (
          <div className="border border-primary/20 rounded-lg p-4 space-y-4 bg-primary/5">
            <h3 className="font-bold text-foreground">بيانات الكتالوج الجديد</h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">العنوان بالعربي *</label>
                <Input
                  value={form.title_ar}
                  onChange={(e) => setForm({ ...form, title_ar: e.target.value })}
                  placeholder="مثال: كتالوج قطع غيار تويوتا 2024"
                  dir="rtl"
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">العنوان بالإنجليزي</label>
                <Input
                  value={form.title_en}
                  onChange={(e) => setForm({ ...form, title_en: e.target.value })}
                  placeholder="Toyota Genuine Parts Catalog 2024"
                  dir="ltr"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">الفئة</label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="اختر الفئة" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">الترتيب</label>
                <Input
                  type="number"
                  value={form.sort_order}
                  onChange={(e) => setForm({ ...form, sort_order: e.target.value })}
                  placeholder="0"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">وصف مختصر</label>
              <Textarea
                value={form.description_ar}
                onChange={(e) => setForm({ ...form, description_ar: e.target.value })}
                placeholder="وصف محتوى الكتالوج..."
                rows={2}
                dir="rtl"
              />
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">ملف PDF *</label>
              <div
                className="border-2 border-dashed border-primary/30 rounded-lg p-6 text-center cursor-pointer hover:border-primary/60 transition-colors"
                onClick={() => fileInputRef.current?.click()}
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-2 text-primary">
                    <FileText className="w-5 h-5" />
                    <span className="font-medium">{selectedFile.name}</span>
                    <span className="text-xs text-muted-foreground">
                      ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </span>
                  </div>
                ) : (
                  <div className="text-muted-foreground">
                    <Upload className="w-8 h-8 mx-auto mb-2" />
                    <p>انقر لرفع ملف PDF</p>
                    <p className="text-xs mt-1">الحد الأقصى 50 MB</p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
            </div>

            <div className="flex gap-3">
              <Button onClick={handleUpload} disabled={uploading} className="gap-2">
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Upload className="w-4 h-4" />
                )}
                {uploading ? "جاري الرفع..." : "رفع الكتالوج"}
              </Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                إلغاء
              </Button>
            </div>
          </div>
        )}

        {/* Catalogs List */}
        {catalogs.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            لا توجد كتالوجات بعد. ارفع أول كتالوج الآن!
          </p>
        ) : (
          <div className="space-y-3">
            {catalogs.map((catalog) => (
              <div
                key={catalog.id}
                className="flex items-center justify-between border border-border rounded-lg p-4 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className={`w-8 h-8 flex-shrink-0 ${catalog.is_active ? "text-primary" : "text-muted-foreground"}`} />
                  <div>
                    <p className="font-bold text-foreground">{catalog.title_ar}</p>
                    {catalog.title_en && (
                      <p className="text-xs text-muted-foreground" dir="ltr">{catalog.title_en}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs bg-secondary text-secondary-foreground px-2 py-0.5 rounded">
                        {getCategoryLabel(catalog.category)}
                      </span>
                      <span className={`text-xs font-medium ${catalog.is_active ? "text-green-500" : "text-muted-foreground"}`}>
                        {catalog.is_active ? "● نشط" : "○ مخفي"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => toggleActive(catalog)}
                    title={catalog.is_active ? "إخفاء" : "إظهار"}
                  >
                    {catalog.is_active ? (
                      <Eye className="w-4 h-4 text-primary" />
                    ) : (
                      <EyeOff className="w-4 h-4 text-muted-foreground" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(catalog)}
                    title="حذف"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminCatalogs;
