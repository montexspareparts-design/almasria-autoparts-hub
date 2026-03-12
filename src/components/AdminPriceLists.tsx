import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, FileText, Trash2, Eye, EyeOff, Plus } from "lucide-react";

interface PriceListRow {
  id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  version: string | null;
  is_active: boolean;
  created_at: string;
}

const AdminPriceLists = () => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [lists, setLists] = useState<PriceListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: "", description: "", version: "" });
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  useEffect(() => { fetchLists(); }, []);

  const fetchLists = async () => {
    const { data } = await supabase
      .from("price_lists")
      .select("*")
      .order("created_at", { ascending: false });
    setLists((data as PriceListRow[]) || []);
    setLoading(false);
  };

  const notifyDealers = async (title: string) => {
    // Get all active dealers
    const { data: dealers } = await supabase
      .from("dealer_accounts")
      .select("user_id")
      .eq("is_active", true);

    if (!dealers?.length) return;

    // Insert notifications for all dealers
    const notifications = dealers.map((d) => ({
      user_id: d.user_id,
      title: "📋 كشف أسعار جديد",
      message: `تم رفع كشف أسعار جديد: ${title}. يمكنك الاطلاع عليه وإضافة الأصناف لعرض السعر.`,
      type: "price_list",
    }));

    await supabase.from("notifications").insert(notifications);
  };

  const handleUpload = async () => {
    if (!form.title.trim()) {
      toast({ title: "يرجى إدخال عنوان الكشف", variant: "destructive" });
      return;
    }
    setUploading(true);

    let fileUrl: string | null = null;

    if (selectedFile) {
      const ext = selectedFile.name.split(".").pop();
      const path = `${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("price-lists")
        .upload(path, selectedFile, { contentType: selectedFile.type });

      if (uploadError) {
        toast({ title: "خطأ في رفع الملف", description: uploadError.message, variant: "destructive" });
        setUploading(false);
        return;
      }

      // Store the path, not the public URL (bucket is private)
      fileUrl = path;
    }

    const { error } = await supabase.from("price_lists").insert({
      title: form.title,
      description: form.description || null,
      version: form.version || null,
      file_url: fileUrl,
    });

    if (error) {
      toast({ title: "خطأ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم رفع الكشف ✓" });
      await notifyDealers(form.title);
      toast({ title: "تم إرسال إشعار لجميع التجار ✓" });
    }

    setForm({ title: "", description: "", version: "" });
    setSelectedFile(null);
    setShowForm(false);
    fetchLists();
    setUploading(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    await supabase.from("price_lists").update({ is_active: !current }).eq("id", id);
    fetchLists();
  };

  const deleteList = async (id: string) => {
    await supabase.from("price_lists").delete().eq("id", id);
    toast({ title: "تم الحذف" });
    fetchLists();
  };

  if (loading) return <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-lg">إدارة كشوفات الأسعار</CardTitle>
        <Button size="sm" onClick={() => setShowForm(!showForm)}>
          <Plus className="w-4 h-4 ml-1" />
          رفع كشف جديد
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {showForm && (
          <div className="space-y-3 p-4 border border-border rounded-lg bg-muted/30">
            <Input
              placeholder="عنوان الكشف *"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <div className="flex gap-2">
              <Input
                placeholder="رقم الإصدار (اختياري)"
                value={form.version}
                onChange={(e) => setForm({ ...form, version: e.target.value })}
                className="w-1/3"
              />
              <Textarea
                placeholder="وصف مختصر (اختياري)"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="flex-1"
                rows={2}
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
              />
              <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                <Upload className="w-4 h-4 ml-1" />
                {selectedFile ? selectedFile.name : "اختر ملف PDF"}
              </Button>
              <Button size="sm" onClick={handleUpload} disabled={uploading}>
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : "رفع وإرسال إشعار"}
              </Button>
            </div>
          </div>
        )}

        {lists.length === 0 ? (
          <p className="text-center text-muted-foreground py-6">لا توجد كشوفات</p>
        ) : (
          <div className="space-y-2">
            {lists.map((list) => (
              <div key={list.id} className="flex items-center gap-3 p-3 border border-border rounded-lg">
                <FileText className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground truncate">{list.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {list.version && `${list.version} • `}
                    {new Date(list.created_at).toLocaleDateString("ar-EG")}
                  </p>
                </div>
                <Button variant="ghost" size="icon" className="w-8 h-8" onClick={() => toggleActive(list.id, list.is_active)}>
                  {list.is_active ? <Eye className="w-4 h-4 text-emerald-500" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                </Button>
                <Button variant="ghost" size="icon" className="w-8 h-8 text-destructive" onClick={() => deleteList(list.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminPriceLists;
