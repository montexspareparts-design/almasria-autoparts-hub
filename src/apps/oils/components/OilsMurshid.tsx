import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { Bot, RotateCcw, SendHorizonal, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { haptic } from "@/lib/haptics";
import OilsBrandMark from "./OilsBrandMark";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

const STORAGE_KEY = "oils_murshid_messages";
const MAX_HISTORY = 14;

const GREETING: ChatMessage = {
  role: "assistant",
  content: "أهلًا بيك في المصرية للزيوت 👋\nأنا **مرشد** — هساعدك تلاقي الزيت المناسب، أعرفلك الأسعار، وأتابع معاك طلبك. اسألني براحتك.",
};

const SUGGESTIONS = [
  "الأسعار كام؟",
  "إيه أنسب زيت لعربيتي؟",
  "طلبي وصل فين؟",
  "إزاي أدفع؟",
];

/** تحويل **النص العريض** في رد البوت لعنصر <strong> بدل عرض النجوم */
const renderInline = (text: string): ReactNode =>
  text.split(/\*\*(.+?)\*\*/g).map((chunk, i) => (i % 2 === 1 ? <strong key={i}>{chunk}</strong> : <Fragment key={i}>{chunk}</Fragment>));

const loadMessages = (): ChatMessage[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as ChatMessage[]) : null;
    if (Array.isArray(parsed) && parsed.length > 0) return parsed;
  } catch {
    /* corrupted storage */
  }
  return [GREETING];
};

/**
 * "مرشد" — المساعد الذكي لتطبيق المصرية للزيوت.
 * محادثة واحدة محفوظة على الجهاز (localStorage) + بث مباشر من بوابة Lovable AI.
 */
const OilsMurshid = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    } catch {
      /* quota */
    }
  }, [messages]);

  useEffect(() => {
    if (open) {
      bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: "smooth" });
      inputRef.current?.focus({ preventScroll: true });
    }
  }, [open, messages, streaming]);

  const send = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean || streaming) return;
      void haptic("light");
      setError(null);
      const userMsg: ChatMessage = { role: "user", content: clean };
      const history = [...messages, userMsg];
      setMessages([...history, { role: "assistant", content: "" }]);
      setInput("");
      setStreaming(true);

      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/oils-chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            messages: history.slice(-MAX_HISTORY).map(({ role, content }) => ({ role, content })),
          }),
        });

        if (!res.ok || !res.body) {
          let friendly = "المساعد مش متاح حاليًا، جرب تاني بعد شوية.";
          try {
            const data = await res.json();
            if (data?.error) friendly = data.error;
          } catch {
            /* non-JSON */
          }
          throw new Error(friendly);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let answer = "";

        const flushEvent = (payload: string) => {
          if (!payload || payload === "[DONE]") return;
          try {
            const evt = JSON.parse(payload);
            if (evt.type === "response.output_text.delta" && typeof evt.delta === "string") {
              answer += evt.delta;
              setMessages((prev) => {
                const next = [...prev];
                next[next.length - 1] = { role: "assistant", content: answer };
                return next;
              });
            } else if (evt.type === "response.failed") {
              throw new Error("المساعد وقف فجأة — جرب تاني.");
            }
          } catch (e) {
            if (e instanceof SyntaxError) return; // سطر ناقص — بيتكمل في الشنك القادم
            throw e;
          }
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const events = buffer.split("\n\n");
          buffer = events.pop() ?? "";
          for (const block of events) {
            const dataLine = block
              .split("\n")
              .filter((l) => l.startsWith("data:"))
              .map((l) => l.slice(5).trim())
              .join("");
            flushEvent(dataLine);
          }
        }
        const tail = buffer
          .split("\n")
          .filter((l) => l.startsWith("data:"))
          .map((l) => l.slice(5).trim())
          .join("");
        flushEvent(tail);

        if (!answer.trim()) {
          setMessages((prev) => {
            const next = [...prev];
            next[next.length - 1] = {
              role: "assistant",
              content: "معرفش أوصل لرد دلوقتي — جرب تاني أو كلمنا واتساب 01156332243.",
            };
            return next;
          });
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : "حصلت مشكلة، جرب تاني.";
        setError(msg);
        setMessages((prev) => {
          const next = [...prev];
          if (next[next.length - 1]?.content === "") next.pop();
          return next;
        });
      } finally {
        setStreaming(false);
      }
    },
    [messages, streaming]
  );

  const resetConversation = () => {
    void haptic("light");
    setMessages([GREETING]);
    setError(null);
    inputRef.current?.focus({ preventScroll: true });
  };

  return (
    <>
      {!open && (
        <button
          type="button"
          className="oils-murshid-fab"
          aria-label="افتح مرشد، المساعد الذكي"
          onClick={() => { void haptic("light"); setOpen(true); }}
        >
          <Bot />
          <span className="oils-murshid-fab-dot" />
        </button>
      )}

      {open && (
        <section className="oils-murshid-panel" dir="rtl" aria-label="مرشد — المساعد الذكي">
          <header className="oils-murshid-head">
            <div className="oils-murshid-head-brand">
              <span className="oils-murshid-head-logo"><OilsBrandMark /></span>
              <span className="oils-murshid-head-titles">
                <strong>مرشد</strong>
                <small>مساعد المصرية الذكي · متصل</small>
              </span>
            </div>
            <div className="oils-murshid-head-actions">
              <button type="button" className="oils-murshid-head-btn" aria-label="محادثة جديدة" onClick={resetConversation}>
                <RotateCcw />
              </button>
              <button type="button" className="oils-murshid-head-btn" aria-label="إغلاق" onClick={() => setOpen(false)}>
                <X />
              </button>
            </div>
          </header>

          <div className="oils-murshid-body" ref={bodyRef}>
            {messages.map((msg, i) => (
              <div key={i} className={`oils-murshid-msg oils-murshid-msg--${msg.role}`}>
                {renderInline(msg.content)}
              </div>
            ))}
            {streaming && messages[messages.length - 1]?.content === "" && (
              <div className="oils-murshid-typing" aria-label="مرشد بيكتب">
                <span /><span /><span />
              </div>
            )}
            {messages.length <= 1 && !streaming && (
              <div className="oils-murshid-chips">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" disabled={streaming} onClick={() => void send(s)}>
                    {s}
                  </button>
                ))}
              </div>
            )}
            {error && (
              <div className="oils-murshid-error" role="alert">{error}</div>
            )}
          </div>

          <form
            className="oils-murshid-composer"
            onSubmit={(e) => { e.preventDefault(); void send(input); }}
          >
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب سؤالك لمرشد…"
              aria-label="رسالتك لمرشد"
              disabled={streaming}
              enterKeyHint="send"
            />
            <button type="submit" aria-label="إرسال" disabled={streaming || !input.trim()}>
              <SendHorizonal />
            </button>
          </form>
        </section>
      )}
    </>
  );
};

export default OilsMurshid;
