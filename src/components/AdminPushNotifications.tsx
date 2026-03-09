import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Bell, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const AdminPushNotifications = () => {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/");
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (!title || !body) {
      toast.error("يرجى إدخال العنوان والرسالة");
      return;
    }

    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-push", {
        body: { title, body, url },
      });

      if (error) throw error;

      toast.success(`تم إرسال الإشعار بنجاح إلى ${data?.total || 0} مشترك`);
      setTitle("");
      setBody("");
      setUrl("/");
    } catch (err: any) {
      toast.error("فشل إرسال الإشعار: " + err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-card rounded-xl border p-6 space-y-4">
      <div className="flex items-center gap-2 mb-4">
        <Bell className="w-5 h-5 text-primary" />
        <h3 className="font-bold text-lg">إرسال إشعار Push</h3>
      </div>

      <div className="space-y-3">
        <Input
          placeholder="عنوان الإشعار"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          dir="rtl"
        />
        <Textarea
          placeholder="نص الإشعار"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          dir="rtl"
        />
        <Input
          placeholder="رابط عند الضغط (اختياري)"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          dir="ltr"
        />
        <Button
          onClick={handleSend}
          disabled={sending || !title || !body}
          className="w-full gap-2"
        >
          <Send className="w-4 h-4" />
          {sending ? "جاري الإرسال..." : "إرسال الإشعار"}
        </Button>
      </div>
    </div>
  );
};

export default AdminPushNotifications;
