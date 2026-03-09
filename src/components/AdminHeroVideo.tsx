import { useState, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Film, Loader2, Check, Upload, Trash2 } from "lucide-react";

const SETTING_KEY = "hero_video_url";
const BUCKET = "product-images"; // reuse existing public bucket

const AdminHeroVideo = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [inputUrl, setInputUrl] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: currentUrl, isLoading } = useQuery({
    queryKey: ["site-setting", SETTING_KEY],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", SETTING_KEY)
        .maybeSingle();
      return (data?.value as string) || "";
    },
  });

  const displayUrl = inputUrl || currentUrl || "";

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("video/")) {
      toast({ title: "يرجى اختيار ملف فيديو", variant: "destructive" });
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast({ title: "حجم الفيديو كبير جداً (الحد الأقصى 50MB)", variant: "destructive" });
      return;
    }

    setUploading(true);
    const fileName = `hero-videos/hero-${Date.now()}.${file.name.split(".").pop()}`;

    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(fileName, file, { upsert: true });

    if (error) {
      toast({ title: "فشل رفع الفيديو", description: error.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
    setInputUrl(urlData.publicUrl);
    setUploading(false);
    toast({ title: "تم رفع الفيديو بنجاح ✅" });
  };

  const handleSave = async () => {
    const url = inputUrl || displayUrl;
    if (!url) {
      toast({ title: "يرجى إدخال رابط أو رفع فيديو", variant: "destructive" });
      return;
    }

    setSaving(true);

    // Upsert the setting
    const { error } = await supabase
      .from("site_settings")
      .update({ value: url, updated_at: new Date().toISOString() })
      .eq("key", SETTING_KEY);

    if (error) {
      await supabase
        .from("site_settings")
        .insert({ key: SETTING_KEY, value: url });
    }

    queryClient.invalidateQueries({ queryKey: ["site-setting", SETTING_KEY] });
    toast({ title: "تم تحديث فيديو الهيرو بنجاح ✅" });
    setSaving(false);
  };

  const handleReset = async () => {
    setSaving(true);
    await supabase
      .from("site_settings")
      .delete()
      .eq("key", SETTING_KEY);

    setInputUrl("");
    queryClient.invalidateQueries({ queryKey: ["site-setting", SETTING_KEY] });
    toast({ title: "تم إعادة الفيديو الافتراضي" });
    setSaving(false);
  };

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Film className="w-5 h-5 text-primary" />
          فيديو خلفية الهيرو
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">رابط الفيديو (MP4)</label>
          <Input
            dir="ltr"
            placeholder="https://example.com/video.mp4"
            value={inputUrl || displayUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="text-left"
          />
          <p className="text-xs text-muted-foreground">
            أدخل رابط فيديو MP4 مباشر أو ارفع فيديو جديد
          </p>
        </div>

        {/* Upload */}
        <div className="flex gap-2">
          <input
            ref={fileRef}
            type="file"
            accept="video/mp4,video/webm"
            className="hidden"
            onChange={handleUpload}
          />
          <Button
            variant="outline"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="gap-2"
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            رفع فيديو
          </Button>
        </div>

        {/* Preview */}
        {displayUrl && (
          <div className="rounded-lg overflow-hidden border border-border">
            <video
              src={displayUrl}
              className="w-full aspect-video object-cover"
              muted
              autoPlay
              loop
              playsInline
            />
          </div>
        )}

        <div className="flex gap-2">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
            حفظ التغييرات
          </Button>
          <Button variant="outline" onClick={handleReset} disabled={saving} className="gap-2">
            <Trash2 className="w-4 h-4" />
            إعادة للافتراضي
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default AdminHeroVideo;
