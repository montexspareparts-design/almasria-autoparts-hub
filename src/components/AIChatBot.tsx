import { useState, useRef, useEffect, useCallback, forwardRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, X, Send, Loader2, Trash2, Share2, ImagePlus, Mic, MicOff, Volume2, VolumeX, MapPin } from "lucide-react";
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

// Branch coordinates
const BRANCHES = [
  {
    name: "فرع القاهرة – التوفيقية",
    lat: 30.0561,
    lng: 31.2394,
    phone: "01153961008",
    mapUrl: "https://maps.app.goo.gl/B3Kb6At4dnfGy28T9",
    serves: "القاهرة، القليوبية، الشرقية، الدقهلية، الإسكندرية، والدلتا"
  },
  {
    name: "فرع الجيزة – أوسيم",
    lat: 30.1269,
    lng: 31.1356,
    phone: "01153961008",
    mapUrl: "https://maps.app.goo.gl/trZ9Q4ZhnwtsFXTB8",
    serves: "الجيزة، الفيوم، بني سويف، المنيا، والصعيد الأدنى"
  },
  {
    name: "فرع الأقصر – صعيد مصر",
    lat: 25.6872,
    lng: 32.6396,
    phone: "01153961008",
    mapUrl: "https://maps.app.goo.gl/c9B4yDBY2QHWPKcT8",
    serves: "الأقصر، أسوان، قنا، سوهاج، وصعيد مصر"
  }
];

const QUICK_QUESTIONS_LOGGED_IN = [
  "عندكم فلتر زيت لكورولا 2020؟",
  "محتاج باقة صيانة دورية",
  "📍 أقرب فرع ليا",
];

const QUICK_QUESTIONS_GUEST = [
  "إيه الماركات المتوفرة عندكم؟",
  "📍 أقرب فرع ليا",
  "بتشحنوا لكل المحافظات؟",
];

const getTextContent = (content: MessageContent): string => {
  if (typeof content === "string") return content;
  return content.filter((c) => c.type === "text").map((c) => (c as any).text).join("");
};

// Calculate distance between two coordinates (Haversine formula)
const getDistance = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Find nearest branch
const findNearestBranch = (userLat: number, userLng: number) => {
  let nearest = BRANCHES[0];
  let minDist = getDistance(userLat, userLng, nearest.lat, nearest.lng);
  
  for (const branch of BRANCHES) {
    const dist = getDistance(userLat, userLng, branch.lat, branch.lng);
    if (dist < minDist) {
      minDist = dist;
      nearest = branch;
    }
  }
  
  return { branch: nearest, distance: Math.round(minDist) };
};

// Speech Recognition setup
const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

const AIChatBot = forwardRef<HTMLDivElement>((_, _ref) => {
  const { user } = useAuth();
  const { consent, interests, getTopCategories, getTopBrands } = usePersonalization();
  const [isOpen, setIsOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);

  // Show unread badge after 5 seconds for guests (without opening the chat)
  useEffect(() => {
    const shown = sessionStorage.getItem("chatbot_shown");
    if (!shown && !user) {
      const timer = setTimeout(() => {
        setHasUnread(true);
        sessionStorage.setItem("chatbot_shown", "true");
        // Prepare intro message so it's ready when user opens
        setMessages([{
          role: "assistant",
          content: "أهلاً بيك في المصرية جروب! 👋\n\nأنا مساعدك الذكي، هساعدك تلاقي قطع الغيار الأصلية والبديلة لعربيتك.\n\n🔹 اسألني عن أي قطعة غيار\n🔹 ابعتلي صورة القطعة وأعرّفهالك\n🔹 اعرف أقرب فرع ليك\n\nإزاي أقدر أساعدك النهاردة؟"
        }]);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [user]);

  // Listen for global open event
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      setIsOpen(true);
      if (e.detail?.message) {
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
  const [isListening, setIsListening] = useState(false);
  const [speakingMsgIndex, setSpeakingMsgIndex] = useState<number | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => { scrollToBottom(); }, [messages, scrollToBottom]);
  useEffect(() => { if (isOpen) inputRef.current?.focus(); }, [isOpen]);

  // Cleanup speech on unmount or close
  useEffect(() => {
    return () => {
      synthRef.current.cancel();
      recognitionRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) {
      synthRef.current.cancel();
      setSpeakingMsgIndex(null);
      if (isListening) {
        recognitionRef.current?.stop();
        setIsListening(false);
      }
    }
  }, [isOpen, isListening]);

  // ---- Find Nearest Branch with Geolocation ----
  const findNearestBranchByLocation = useCallback(() => {
    if (!navigator.geolocation) {
      toast.error("المتصفح لا يدعم تحديد الموقع");
      return;
    }

    setIsLocating(true);
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        const { branch, distance } = findNearestBranch(latitude, longitude);
        
        const response = `📍 **أقرب فرع ليك:**\n\n` +
          `**${branch.name}**\n` +
          `📞 ${branch.phone}\n` +
          `📍 المسافة: حوالي ${distance} كم\n` +
          `🗺️ [افتح الخريطة](${branch.mapUrl})\n\n` +
          `**بيخدم**: ${branch.serves}\n\n` +
          `⏰ مواعيد العمل: 9 صباحًا - 7 مساءً\n` +
          `🚚 كمان بنوصّل لجميع المحافظات خلال 24-72 ساعة!`;
        
        setMessages(prev => [
          ...prev,
          { role: "user", content: "📍 أقرب فرع ليا" },
          { role: "assistant", content: response }
        ]);
        setIsLocating(false);
      },
      (error) => {
        console.error("Geolocation error:", error);
        setIsLocating(false);
        
        if (error.code === error.PERMISSION_DENIED) {
          toast.error("يرجى السماح بالوصول للموقع من إعدادات المتصفح");
        } else {
          toast.error("تعذر تحديد موقعك، حاول مرة تانية");
        }
        
        // Fallback: send to chat to ask manually
        sendMessage("عايز أعرف أقرب فرع ليا");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }, []);

  // ---- Voice Input (STT) ----
  const toggleListening = useCallback(() => {
    console.log("SpeechRecognition available:", !!SpeechRecognition);
    if (!SpeechRecognition) {
      toast.error("المتصفح لا يدعم التعرف على الصوت، جرب من Chrome على الموبايل أو الكمبيوتر");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = "ar-EG";
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((r: any) => r[0].transcript)
        .join("");
      setInput(transcript);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event: any) => {
      console.error("Speech recognition error:", event.error, event);
      setIsListening(false);
      if (event.error === "not-allowed") {
        toast.error("يرجى السماح بالوصول للميكروفون من إعدادات المتصفح");
      } else if (event.error === "network") {
        toast.error("خطأ في الشبكة - تأكد من اتصالك بالإنترنت");
      } else if (event.error !== "aborted") {
        toast.error(`خطأ في التعرف على الصوت: ${event.error}`);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  }, [isListening]);

  // ---- Voice Output (TTS) ----
  const speakMessage = useCallback((text: string, msgIndex: number) => {
    const synth = synthRef.current;

    if (speakingMsgIndex === msgIndex) {
      synth.cancel();
      setSpeakingMsgIndex(null);
      return;
    }

    synth.cancel();

    const cleanText = text
      .replace(/[#*_~`>|[\](){}]/g, "")
      .replace(/\n+/g, ". ")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = "ar-EG";
    utterance.rate = 1;
    utterance.pitch = 1;

    const voices = synth.getVoices();
    const arabicVoice = voices.find((v: SpeechSynthesisVoice) => v.lang.startsWith("ar"));
    if (arabicVoice) utterance.voice = arabicVoice;

    utterance.onend = () => setSpeakingMsgIndex(null);
    utterance.onerror = () => setSpeakingMsgIndex(null);

    setSpeakingMsgIndex(msgIndex);
    synth.speak(utterance);
  }, [speakingMsgIndex]);

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
    const apiMessages = allMessages.map(({ role, content }) => ({ role, content }));

    const resp = await fetch(CHAT_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        messages: apiMessages,
        isLoggedIn: !!user,
        userInterests: consent ? {
          topCategories: getTopCategories(3),
          topBrands: getTopBrands(2),
          recentSearches: interests.searchTerms.slice(0, 5),
        } : null,
      }),
    });

    if (!resp.ok) {
      const fallbackMsg = "عذراً، المساعد الذكي غير متاح حالياً 😊\n\nلكن فريق المبيعات موجود لخدمتك! تواصل معانا مباشرة:\n\n📞 **فرع القاهرة (التوفيقية)**: 01032104861\n📞 **فرع الجيزة (أوسيم)**: 01153961008\n📞 **فرع الأقصر**: 01016177204\n📱 **واتساب**: [اضغط هنا](https://wa.me/201032104861)\n\n⏰ مواعيد العمل: من 9 صباحاً لـ 7 مساءً\n\n_يمكنك المحاولة مرة تانية بعد دقيقة_ 🔄";
      setMessages((prev) => [...prev, { role: "assistant", content: fallbackMsg }]);
      return;
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

    // Check if asking for nearest branch - use geolocation
    const branchKeywords = ["أقرب فرع", "فرع قريب", "أقرب فرع ليا", "فين فروعكم"];
    if (branchKeywords.some(kw => text.includes(kw))) {
      findNearestBranchByLocation();
      return;
    }

    // Stop listening if active
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    }

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
      console.error("Chat error:", e);
      const errorMsg = "حصل مشكلة في الاتصال 😅\n\nممكن تكون مشكلة مؤقتة — جرب تاني بعد شوية.\n\nأو تواصل مع فريق المبيعات مباشرة:\n📞 01032104861\n📱 [واتساب](https://wa.me/201032104861)";
      setMessages((prev) => [...prev, { role: "assistant", content: errorMsg }]);
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
            onClick={() => { setIsOpen(true); setHasUnread(false); }}
            className="fixed bottom-20 left-4 md:bottom-6 md:left-6 z-50 w-12 h-12 md:w-14 md:h-14 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:scale-110 transition-transform"
            aria-label="فتح المساعد الذكي"
          >
            <Bot className="w-7 h-7" />
            {hasUnread && (
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-destructive rounded-full border-2 border-background animate-pulse" />
            )}
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
            className="fixed inset-0 z-[100] flex flex-col bg-card h-[100dvh] md:inset-auto md:bottom-6 md:left-6 md:w-[360px] md:h-[480px] md:max-h-[calc(100vh-80px)] md:border md:border-border md:rounded-2xl shadow-2xl overflow-hidden"
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
                        const waUrl = `https://wa.me/201153961008?text=${encodeURIComponent("📋 محادثة من المساعد الذكي:\n\n" + text)}`;
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
                      <p className="text-xs text-muted-foreground mt-1 flex items-center justify-center gap-1">
                        <Mic className="w-3.5 h-3.5" />
                        أو اتكلم بصوتك وأنا هسمعك
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
                <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                    msg.role === "user" ? "bg-primary text-primary-foreground rounded-tl-sm" : "bg-muted text-foreground rounded-tr-sm"
                  }`}>
                    {msg.imagePreview && (
                      <img src={msg.imagePreview} alt="صورة مرفقة" className="rounded-lg mb-2 max-h-32 w-auto" />
                    )}
                    {msg.role === "assistant" ? (
                      <>
                        <div className="prose prose-sm max-w-none [&_p]:m-0 [&_ul]:my-1 [&_li]:my-0">
                          <ReactMarkdown>{getTextContent(msg.content)}</ReactMarkdown>
                        </div>
                        {/* TTS button for assistant messages */}
                        {!isLoading && (
                          <button
                            onClick={() => speakMessage(getTextContent(msg.content), i)}
                            className="mt-1.5 flex items-center gap-1 text-[10px] opacity-60 hover:opacity-100 transition-opacity"
                            title={speakingMsgIndex === i ? "إيقاف القراءة" : "اسمع الرد بالصوت"}
                          >
                            {speakingMsgIndex === i ? (
                              <>
                                <VolumeX className="w-3 h-3" />
                                <span>إيقاف</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3 h-3" />
                                <span>اسمع</span>
                              </>
                            )}
                          </button>
                        )}
                      </>
                    ) : (
                      getTextContent(msg.content)
                    )}
                  </div>
                </div>
              ))}

              {(isLoading || isLocating) && messages[messages.length - 1]?.role !== "assistant" && (
                <div className="flex justify-end">
                  <div className="bg-muted rounded-2xl rounded-bl-sm px-4 py-3">
                    {isLocating ? (
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <MapPin className="w-4 h-4 animate-pulse" />
                        <span>جاري تحديد موقعك...</span>
                      </div>
                    ) : (
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    )}
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
                  disabled={isLoading || isLocating}
                  className="shrink-0 w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-accent/20 transition-colors disabled:opacity-50"
                  title="إرفاق صورة"
                >
                  <ImagePlus className="w-4 h-4 text-muted-foreground" />
                </button>

                {/* Mic button */}
                <button
                  type="button"
                  onClick={toggleListening}
                  disabled={isLoading || isLocating}
                  className={`shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 ${
                    isListening
                      ? "bg-destructive text-destructive-foreground animate-pulse"
                      : "bg-muted hover:bg-accent/20"
                  }`}
                  title={isListening ? "إيقاف التسجيل" : "تحدث بصوتك"}
                >
                  {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-muted-foreground" />}
                </button>

                <input
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isListening ? "🎤 بتكلم..." : pendingImage ? "أضف وصف للصورة (اختياري)..." : "اكتب سؤالك هنا..."}
                  disabled={isLoading || isLocating}
                  className="flex-1 bg-muted rounded-xl px-3 py-2 text-base md:text-sm outline-none placeholder:text-muted-foreground disabled:opacity-50"
                />
                <Button type="submit" size="icon" disabled={(!input.trim() && !pendingImage) || isLoading || isLocating} className="rounded-xl shrink-0">
                  <Send className="w-4 h-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

AIChatBot.displayName = "AIChatBot";

export default AIChatBot;
