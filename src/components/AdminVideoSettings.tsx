import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Video, Loader2, Check } from "lucide-react";

const AdminVideoSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [inputUrl, setInputUrl] = useState("");

  const { data: currentId, isLoading } = useQuery({
    queryKey: ["site-setting", "video_youtube_id"],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", "video_youtube_id")
        .maybeSingle();
      return (data?.value as string) || "";
    },
    meta: {
      onSuccess: (val: string) => setInputUrl(val ? `https://www.youtube.com/watch?v=${val}` : ""),
    },
  });

  // Set input once loaded
  const displayUrl = inputUrl || (currentId ? `https://www.youtube.com/watch?v=${currentId}` : "");

  const extractVideoId = (url: string): string | null => {
    // Support various YouTube URL formats
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /^([a-zA-Z0-9_-]{11})$/, // raw ID
    ];
    for (const p of patterns) {
      const match = url.trim().match(p);
      if (match) return match[1];
    }
    return null;
  };

  const handleSave = async () => {
    const videoId = extractVideoId(inputUrl || displayUrl);
    if (!videoId) {
      toast({ title: "رابط غير صالح", description: "يرجى إدخال رابط YouTube صحيح", variant: "destructive" });
      return;
    }

    setSaving(true);
    const { data: existing } = await supabase
      .from("site_settings")
      .select("id")
      .eq("key", "video_youtube_id")
      .maybeSingle();

    if (existing) {
      await supabase
        .from("site_settings")
        .update({ value: videoId, updated_at: new Date().toISOString() })
        .eq("key", "video_youtube_id");
    } else {
      await supabase
        .from("site_settings")
        .insert({ key: "video_youtube_id", value: videoId });
    }

    queryClient.invalidateQueries({ queryKey: ["site-setting", "video_youtube_id"] });
    toast({ title: "تم تحديث الفيديو بنجاح ✅" });
    setSaving(false);
  };

  if (isLoading) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Video className="w-5 h-5 text-primary" />
          فيديو الصفحة الرئيسية
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">رابط فيديو YouTube</label>
          <Input
            dir="ltr"
            placeholder="https://www.youtube.com/watch?v=..."
            value={inputUrl || displayUrl}
            onChange={(e) => setInputUrl(e.target.value)}
            className="text-left"
          />
          <p className="text-xs text-muted-foreground">
            الصق رابط YouTube الكامل أو معرّف الفيديو فقط
          </p>
        </div>

        {/* Preview */}
        {(inputUrl || displayUrl) && extractVideoId(inputUrl || displayUrl) && (
          <div className="rounded-lg overflow-hidden border border-border">
            <img
              src={`https://img.youtube.com/vi/${extractVideoId(inputUrl || displayUrl)}/mqdefault.jpg`}
              alt="معاينة الفيديو"
              className="w-full aspect-video object-cover"
            />
          </div>
        )}

        <Button onClick={handleSave} disabled={saving} className="gap-2">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          حفظ التغييرات
        </Button>
      </CardContent>
    </Card>
  );
};

export default AdminVideoSettings;
