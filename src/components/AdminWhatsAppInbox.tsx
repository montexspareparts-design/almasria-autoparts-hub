import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import {
  Send, Search, Paperclip, Loader2, MessageCircle, User as UserIcon,
  Image as ImageIcon, FileText, Mic, Check, CheckCheck, X
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";

interface Conversation {
  id: string;
  phone: string;
  contact_name: string | null;
  customer_user_id: string | null;
  assigned_to: string | null;
  last_message_at: string;
  last_message_preview: string | null;
  unread_count: number;
}

interface Message {
  id: string;
  conversation_id: string;
  direction: "inbound" | "outbound";
  source: "manual" | "system" | "customer";
  message_type: string;
  body: string | null;
  media_url: string | null;
  media_mime: string | null;
  media_caption: string | null;
  status: string;
  sent_by: string | null;
  created_at: string;
}

interface StaffOption { user_id: string; full_name: string | null; }

const AdminWhatsAppInbox = () => {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [selected, setSelected] = useState<Conversation | null>(null);
  const [search, setSearch] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffOption[]>([]);
  const [mediaUploading, setMediaUploading] = useState(false);
  const [mediaSignedUrls, setMediaSignedUrls] = useState<Record<string, string>>({});
  const fileRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Initial load
  useEffect(() => { loadConversations(); if (isAdmin) loadStaff(); }, [isAdmin]);

  // Realtime subscription for conversations
  useEffect(() => {
    const channel = supabase
      .channel("wa-conversations-rt")
      .on("postgres_changes", { event: "*", schema: "public", table: "whatsapp_conversations" },
        () => loadConversations())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  // Realtime for selected conversation messages
  useEffect(() => {
    if (!selected) return;
    loadMessages(selected.id);
    const channel = supabase
      .channel(`wa-msgs-${selected.id}`)
      .on("postgres_changes",
        { event: "INSERT", schema: "public", table: "whatsapp_messages", filter: `conversation_id=eq.${selected.id}` },
        () => loadMessages(selected.id))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selected?.id]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from("whatsapp_conversations")
      .select("*")
      .eq("is_archived", false)
      .order("last_message_at", { ascending: false })
      .limit(200);
    if (!error && data) setConversations(data as Conversation[]);
    setLoading(false);
  };

  const loadStaff = async () => {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("user_id")
      .in("role", ["admin", "moderator"]);
    if (!roles) return;
    const ids = roles.map(r => r.user_id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("user_id, full_name")
      .in("user_id", ids);
    setStaff((profiles || []) as StaffOption[]);
  };

  const loadMessages = async (convId: string) => {
    const { data } = await supabase
      .from("whatsapp_messages")
      .select("*")
      .eq("conversation_id", convId)
      .order("created_at", { ascending: true })
      .limit(500);
    const msgs = (data || []) as Message[];
    setMessages(msgs);

    // Sign media URLs
    const toSign = msgs.filter(m => m.media_url && !mediaSignedUrls[m.media_url]);
    if (toSign.length > 0) {
      const next: Record<string, string> = {};
      for (const m of toSign) {
        if (!m.media_url) continue;
        const { data: signed } = await supabase.storage
          .from("whatsapp-media")
          .createSignedUrl(m.media_url, 3600);
        if (signed?.signedUrl) next[m.media_url] = signed.signedUrl;
      }
      setMediaSignedUrls(prev => ({ ...prev, ...next }));
    }

    // Mark as read
    if (selected && selected.unread_count > 0) {
      await supabase.from("whatsapp_conversations").update({ unread_count: 0 }).eq("id", convId);
    }
  };

  const sendMessage = async (mediaPath?: string, mediaMime?: string) => {
    if (!selected) return;
    if (!body.trim() && !mediaPath) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("whatsapp-send-message", {
        body: {
          conversationId: selected.id,
          phone: selected.phone,
          body: body.trim() || undefined,
          mediaPath,
          mediaMime,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setBody("");
      loadMessages(selected.id);
    } catch (err: any) {
      toast({ title: "فشل الإرسال", description: err.message || String(err), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  const onFileSelected = async (file: File) => {
    if (!selected || !user) return;
    setMediaUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `outbound/${new Date().toISOString().slice(0, 10)}/${user.id}-${Date.now()}.${ext}`;
      const { error } = await supabase.storage
        .from("whatsapp-media")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (error) throw error;
      await sendMessage(path, file.type);
    } catch (err: any) {
      toast({ title: "فشل رفع الملف", description: err.message, variant: "destructive" });
    } finally {
      setMediaUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const assignTo = async (userId: string | null) => {
    if (!selected) return;
    const { error } = await supabase
      .from("whatsapp_conversations")
      .update({ assigned_to: userId })
      .eq("id", selected.id);
    if (error) {
      toast({ title: "فشل الإسناد", variant: "destructive" });
    } else {
      toast({ title: userId ? "تم إسناد المحادثة" : "تم إلغاء الإسناد" });
      setSelected({ ...selected, assigned_to: userId });
      loadConversations();
    }
  };

  const filtered = conversations.filter(c => {
    if (!search.trim()) return true;
    const s = search.toLowerCase();
    return (c.contact_name || "").toLowerCase().includes(s) || c.phone.includes(s);
  });

  const StatusIcon = ({ s }: { s: string }) => {
    if (s === "read") return <CheckCheck className="w-3.5 h-3.5 text-blue-500" />;
    if (s === "delivered") return <CheckCheck className="w-3.5 h-3.5 text-muted-foreground" />;
    if (s === "sent") return <Check className="w-3.5 h-3.5 text-muted-foreground" />;
    if (s === "failed") return <X className="w-3.5 h-3.5 text-destructive" />;
    return null;
  };

  const renderMessageBody = (m: Message) => {
    if (m.media_url) {
      const url = mediaSignedUrls[m.media_url];
      const mime = m.media_mime || "";
      if (!url) return <div className="text-xs italic opacity-70">جاري تحميل الوسائط...</div>;
      if (mime.startsWith("image/")) {
        return (
          <div className="space-y-1">
            <img src={url} alt="" className="rounded-lg max-w-[260px] max-h-[300px] object-cover" />
            {m.media_caption && <p className="text-sm">{m.media_caption}</p>}
          </div>
        );
      }
      if (mime.startsWith("audio/")) {
        return <audio controls src={url} className="max-w-[260px]" />;
      }
      if (mime.startsWith("video/")) {
        return <video controls src={url} className="rounded-lg max-w-[260px]" />;
      }
      return (
        <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 underline">
          <FileText className="w-4 h-4" /> {m.media_caption || "تنزيل المستند"}
        </a>
      );
    }
    return <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>;
  };

  if (loading) {
    return <div className="flex items-center justify-center py-20"><Loader2 className="w-6 h-6 animate-spin" /></div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 h-[calc(100vh-180px)]">
      {/* Conversations list */}
      <Card className="flex flex-col overflow-hidden">
        <div className="p-3 border-b space-y-2">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5 text-primary" />
            <h2 className="font-bold">الواتساب ({conversations.length})</h2>
          </div>
          <div className="relative">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="ابحث بالاسم أو الرقم..." className="pr-9" />
          </div>
        </div>
        <ScrollArea className="flex-1">
          {filtered.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-10">
              لا توجد محادثات
            </div>
          )}
          {filtered.map(c => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className={`w-full text-right p-3 border-b hover:bg-accent/50 transition-colors flex items-start gap-3 ${
                selected?.id === c.id ? "bg-accent" : ""
              }`}
            >
              <Avatar className="w-10 h-10">
                <AvatarFallback className="bg-primary/10 text-primary">
                  {(c.contact_name || c.phone).charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-semibold truncate text-sm">
                    {c.contact_name || c.phone}
                  </span>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {formatDistanceToNow(new Date(c.last_message_at), { locale: ar, addSuffix: false })}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {c.last_message_preview || c.phone}
                </p>
                <div className="flex items-center gap-1.5 mt-1">
                  {c.unread_count > 0 && (
                    <Badge className="h-5 px-1.5 text-[10px] bg-green-600 hover:bg-green-700">
                      {c.unread_count}
                    </Badge>
                  )}
                  {c.customer_user_id && (
                    <Badge variant="outline" className="h-5 px-1.5 text-[10px]">
                      <UserIcon className="w-2.5 h-2.5 ml-1" /> عميل
                    </Badge>
                  )}
                  {c.assigned_to && (
                    <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">مُسند</Badge>
                  )}
                </div>
              </div>
            </button>
          ))}
        </ScrollArea>
      </Card>

      {/* Chat area */}
      <Card className="flex flex-col overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageCircle className="w-16 h-16 mx-auto mb-3 opacity-30" />
              <p>اختر محادثة لعرض الرسائل</p>
            </div>
          </div>
        ) : (
          <>
            {/* Chat header */}
            <div className="p-3 border-b flex items-center justify-between gap-3 bg-card">
              <div className="flex items-center gap-3">
                <Avatar className="w-10 h-10">
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {(selected.contact_name || selected.phone).charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-bold text-sm">{selected.contact_name || "بدون اسم"}</p>
                  <p className="text-xs text-muted-foreground" dir="ltr">+{selected.phone}</p>
                </div>
              </div>
              {isAdmin && (
                <Select
                  value={selected.assigned_to || "none"}
                  onValueChange={(v) => assignTo(v === "none" ? null : v)}
                >
                  <SelectTrigger className="w-44 h-9 text-xs">
                    <SelectValue placeholder="إسناد..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">غير مُسند</SelectItem>
                    {staff.map(s => (
                      <SelectItem key={s.user_id} value={s.user_id}>
                        {s.full_name || s.user_id.slice(0, 8)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2 bg-muted/20">
              {messages.map(m => {
                const isOut = m.direction === "outbound";
                return (
                  <div key={m.id} className={`flex ${isOut ? "justify-start" : "justify-end"}`}>
                    <div
                      className={`max-w-[70%] rounded-2xl px-3 py-2 shadow-sm ${
                        isOut
                          ? m.source === "system"
                            ? "bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800"
                            : "bg-primary text-primary-foreground"
                          : "bg-card border"
                      }`}
                    >
                      {m.source === "system" && (
                        <Badge variant="outline" className="mb-1 text-[10px]">رسالة آلية</Badge>
                      )}
                      {renderMessageBody(m)}
                      <div className={`flex items-center gap-1 mt-1 ${isOut ? "justify-start" : "justify-end"}`}>
                        <span className="text-[10px] opacity-70">
                          {new Date(m.created_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {isOut && <StatusIcon s={m.status} />}
                      </div>
                    </div>
                  </div>
                );
              })}
              {messages.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-10">لا توجد رسائل بعد</p>
              )}
            </div>

            {/* Composer */}
            <div className="p-3 border-t bg-card">
              <div className="flex items-end gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept="image/*,audio/*,video/*,application/pdf"
                  onChange={(e) => e.target.files?.[0] && onFileSelected(e.target.files[0])}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => fileRef.current?.click()}
                  disabled={mediaUploading || sending}
                  title="إرفاق ملف"
                >
                  {mediaUploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Paperclip className="w-5 h-5" />}
                </Button>
                <Textarea
                  value={body}
                  onChange={e => setBody(e.target.value)}
                  placeholder="اكتب رسالتك..."
                  rows={1}
                  className="min-h-[42px] max-h-[120px] resize-none"
                  onKeyDown={e => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      sendMessage();
                    }
                  }}
                />
                <Button
                  onClick={() => sendMessage()}
                  disabled={sending || (!body.trim() && !mediaUploading)}
                  size="icon"
                  className="shrink-0"
                >
                  {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground mt-1.5">
                Enter للإرسال • Shift+Enter لسطر جديد
              </p>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default AdminWhatsAppInbox;
