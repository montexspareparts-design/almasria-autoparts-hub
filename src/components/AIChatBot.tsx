import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Send, Loader2, Trash2, Share2, ImagePlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { useAuth } from "@/contexts/AuthContext";
import { usePersonalization } from "@/hooks/usePersonalization";

type MessageContent =
  | string
  | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string } }>;

type Message = { role: "user" | "assistant"; content: MessageContent; imagePreview?: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`;

const QUICK_QUESTIONS_LOGGED_IN = [
  "عندكم فلتر زيت لكورولا 2020؟",
  "محتاج باقة صيانة دورية",
  "عايز أعرف أقرب فرع ليا",
];

const QUICK_QUESTIONS_GUEST = [
  "إيه الماركات المتوفرة عندكم؟",
  "عايز أعرف أقرب فرع ليا",
  "بتشحنوا لكل المحافظات؟",
];

const getTextContent = (content: MessageContent): string => {
  if (typeof content === "string") return content;
  return content.filter((c) => c.type === "text").map((c) => (c as any).text).join("");
};

const AIChatBot = () => {
  const { user } = useAuth();
  const { consent, interests, getTopCategories, getTopBrands } = usePersonalization();
  const [isOpen, setIsOpen] = useState(false);

  // Listen for global open event
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setIsOpen(true);
      if (e.detail?.message) {
        // Will be handled after open
        setTimeout(() => {
          const inputEl = document.querySelector<HTMLTextAreaElement>('[data-chatbot-input]');
          if (inputEl) {
            inputEl.value = e.detail.message;
            inputEl.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }, 300);
      }
    };
    window.addEventListener('open-ai-chat', handler as EventListener);
    return () => window.removeEventListener('open-ai-chat', handler as EventListener);
  }, []);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [pendingImage, setPendingImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);
  useEffect(() => { if (isOpen) inputRef.current?.focus(); }, [isOpen]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("يرجى اختيار صورة فقط");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("حجم الصورة كبير جداً (الحد الأقصى 5MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPendingImage(reader.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const streamChat = async (allMessages: Message[]) => {
    // Convert messages for API: strip imagePreview, keep content as-is
    const apiMessages = allMessages.map(({ role, content }) => ({ role, content }));

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({ messages: apiMessages, isLoggedIn: !!user }),
    });

    if (!resp.ok) {
      const err = await resp.json().catch(() => ({ error: "حدث خطأ" }));
      throw new Error(err.error || "حدث خطأ في الاتصال");
    }
    if (!resp.body) throw new Error("No response body");

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let textBuffer = "";
    let assistantSoFar = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      textBuffer += decoder.decode(value, { stream: true });

      let newlineIndex: number;
      while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
        let line = textBuffer.slice(0, newlineIndex);
        textBuffer = textBuffer.slice(newlineIndex + 1);
        if (line.endsWith("\r")) line = line.slice(0, -1);
        if (line.startsWith(":") || line.trim() === "") continue;
        if (!line.startsWith("data: ")) continue;
        const jsonStr = line.slice(6).trim();
        if (jsonStr === "[DONE]") break;
        try {
          const parsed = JSON.parse(jsonStr);
          const content = parsed.choices?.[0]?.delta?.content as string | undefined;
          if (content) {
            assistantSoFar += content;
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last?.role === "assistant") {
                return prev.map((m, i) => i === prev.length - 1 ? { ...m, content: assistantSoFar } : m);
              }
              return [...prev, { role: "assistant", content: assistantSoFar }];
            });
          }
        } catch {
          textBuffer = line + "\n" + textBuffer;
          break;
        }
      }
    }
  };

  const sendMessage = async (text: string) => {
    if ((!text.trim() && !pendingImage) || isLoading) return;

    let content: MessageContent;
    let imagePreview: string | undefined;

    if (pendingImage) {
      const parts: MessageContent = [];
      if (text.trim()) parts.push({ type: "text", text: text.trim() });
      else parts.push({ type: "text", text: "ما هي هذه القطعة؟ وهل متوفر لها بديل؟" });
      parts.push({ type: "image_url", image_url: { url: pendingImage } });
      content = parts;
      imagePreview = pendingImage;
      setPendingImage(null);
    } else {
      content = text.trim();
    }

    const userMsg: Message = { role: "user", content, imagePreview };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput("");
    setIsLoading(true);

    try {
      await streamChat(updatedMessages);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "حدث خطأ");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleImageSelect} />

      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-20 left-4 md:bottom-24 md:left-6 z-50 w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
            aria-label="فتح المساعد الذكي"
          >
            <Bot className="w-7 h-7" />
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-4 left-4 md:bottom-6 md:left-6 z-50 w-[360px] max-w-[calc(100vw-32px)] h-[480px] max-h-[calc(100vh-80px)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-primary text-primary-foreground">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                <div>
                  <p className="font-bold text-sm">المساعد الذكي</p>
                  <p className="text-[10px] opacity-80">المصرية جروب - قطع غيار</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {messages.length > 0 && (
                  <>
                    <button
                      onClick={() => {
                        const text = messages
                          .map((m) => (m.role === "user" ? `🙋 العميل: ${getTextContent(m.content)}` : `🤖 المساعد: ${getTextContent(m.content)}`))
                          .join("\n\n");
                        const waUrl = `https://wa.me/201020412358?text=${encodeURIComponent("📋 محادثة من المساعد الذكي:\n\n" + text)}`;
                        window.open(waUrl, "_blank");
                      }}
                      className="p-1.5 rounded-lg hover:bg-primary-foreground/20 transition-colors"
                      title="مشاركة المحادثة عبر واتساب"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setMessages([])}
                      className="p-1.5 rounded-lg hover:bg-primary-foreground/20 transition-colors"
                      title="مسح المحادثة"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </>
                )}
                <button onClick={() => setIsOpen(false)} className="p-1.5 rounded-lg hover:bg-primary-foreground/20 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3" dir="rtl">
              {messages.length === 0 && (
                <div className="text-center space-y-4 pt-4">
                  <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                    <Bot className="w-8 h-8 text-primary" />
                  </div>
                  {user ? (
                    <div>
                      <p className="font-bold text-foreground">أهلاً بيك! 👋</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        أنا مساعد المصرية، أقدر أساعدك تلاقي قطع الغيار المناسبة لعربيتك وأعرفك الأسعار
                      </p>
                      <p className="text-xs text-muted-foreground mt-2 flex items-center justify-center gap-1">
                        <ImagePlus className="w-3.5 h-3.5" />
                        تقدر تبعتلي صورة القطعة وأعرّفها لك
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-bold text-foreground">أهلاً بيك! 👋</p>
                      <p className="text-sm text-muted-foreground mt-1">
                        أنا مساعد المصرية، أقدر أساعدك تعرف عن منتجاتنا وفروعنا
                      </p>
                      <div className="mt-3 p-3 rounded-xl bg-primary/10 border border-primary/20">
                        <p className="text-xs text-primary font-bold mb-1">💡 عشان تشوف الأسعار وتطلب</p>
                        <p className="text-xs text-muted-foreground">
                          سجّل دخولك أو أنشئ حساب مجاني — بياخد ثواني بس!
                        </p>
                        <a href="/auth" className="inline-block mt-2 text-xs font-bold text-primary hover:underline">
                          سجّل دخولك الآن ←
                        </a>
                      </div>
                    </div>
                  )}
                  <div className="space-y-2">
                    {(user ? QUICK_QUESTIONS_LOGGED_IN : QUICK_QUESTIONS_GUEST).map((q) => (
                      <button key={q} onClick={() => sendMessage(q)}
                        className="block w-full text-right text-xs px-3 py-2 rounded-lg border border-border hover:bg-accent/10 hover:border-primary/30 transition-colors text-foreground">
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    msg.role === "user" ? "bg-primary text-primary-foreground rounded-br-sm" : "bg-muted text-foreground rounded-bl-sm"
                  }`}>
                    {msg.imagePreview && (
                      <img src={msg.imagePreview} alt="صورة مرفقة" className="rounded-lg mb-2 max-h-32 w-auto" />
                    )}
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none [&_p]:m-0 [&_ul]:my-1 [&_li]:my-0">
                        <ReactMarkdown>{getTextContent(msg.content)}</ReactMarkdown>
                      </div>
                    ) : (
                      getTextContent(msg.content)
                    )}
                  </div>
                </div>
              ))}

              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex justify-end">
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Pending image preview */}
            {pendingImage && (
              <div className="px-3 pt-2 flex items-center gap-2 border-t border-border" dir="rtl">
                <div className="relative">
                  <img src={pendingImage} alt="صورة مرفقة" className="w-14 h-14 rounded-lg object-cover border border-border" />
                  <button
                    onClick={() => setPendingImage(null)}
                    className="absolute -top-1.5 -left-1.5 w-5 h-5 bg-destructive text-destructive-foreground rounded-full flex items-center justify-center text-xs"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <span className="text-xs text-muted-foreground">صورة جاهزة للإرسال</span>
              </div>
            )}

            {/* Input */}
            <div className="border-t border-border p-3" dir="rtl">
              <form onSubmit={(e) => { e.preventDefault(); sendMessage(input); }} className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isLoading}
                  className="shrink-0 w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-accent/20 transition-colors disabled:opacity-50"
                  title="إرفاق صورة"
                >
                  <ImagePlus className="w-4 h-4 text-muted-foreground" />
                </button>
                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={pendingImage ? "أضف وصف للصورة (اختياري)..." : "اكتب سؤالك هنا..."}
                  disabled={isLoading}
                  className="flex-1 bg-muted rounded-xl px-3 py-2 text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
                />
                <Button type="submit" size="icon" disabled={(!input.trim() && !pendingImage) || isLoading} className="rounded-xl shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIChatBot;
