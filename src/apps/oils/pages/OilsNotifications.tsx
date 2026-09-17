import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  BellRing,
  CheckCheck,
  CheckCircle2,
  ChevronRight,
  Info,
  Package,
  Phone,
  Sparkles,
  Tag,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { haptic } from "@/lib/haptics";

interface OilsNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

const ICONS: Record<string, typeof Info> = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  order: Package,
  order_edit: AlertTriangle,
  offer: Tag,
  stock_alert: Package,
  price_list: Info,
  contact: Phone,
};

const TONES: Record<string, string> = {
  success: "is-success",
  warning: "is-warning",
  order: "is-order",
  order_edit: "is-warning",
  offer: "is-offer",
  stock_alert: "is-success",
  contact: "is-contact",
};

const FILTERS = [
  { key: "all", label: "الكل" },
  { key: "unread", label: "غير مقروء" },
  { key: "orders", label: "الطلبات" },
  { key: "offers", label: "العروض" },
] as const;

type FilterKey = (typeof FILTERS)[number]["key"];

const clean = (message: string) => message.replace(/\[order_edit:[a-f0-9-]+\]\n?/, "");

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "الآن";
  if (m < 60) return `منذ ${m} دقيقة`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} ساعة`;
  const d = Math.floor(h / 24);
  if (d < 30) return `منذ ${d} يوم`;
  return new Date(iso).toLocaleDateString("ar-EG", { day: "numeric", month: "long" });
};

/** صفحة الإشعارات — تطبيق جملة الزيوت */
const OilsNotifications = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [items, setItems] = useState<OilsNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>("all");

  const fetchItems = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("id,title,message,type,is_read,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(60);
    setItems((data as OilsNotification[]) || []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void fetchItems();
    if (!user) return;
    const channel = supabase
      .channel(`oils-notifs-${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        (payload) => setItems((prev) => [payload.new as OilsNotification, ...prev]),
      )
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [user, fetchItems]);

  const unread = useMemo(() => items.filter((n) => !n.is_read).length, [items]);

  const visible = useMemo(() => {
    if (filter === "unread") return items.filter((n) => !n.is_read);
    if (filter === "orders") return items.filter((n) => n.type.startsWith("order"));
    if (filter === "offers") return items.filter((n) => n.type === "offer" || n.type === "price_list");
    return items;
  }, [items, filter]);

  const markOne = async (n: OilsNotification) => {
    if (n.is_read) return;
    setItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)));
    await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
  };

  const markAll = async () => {
    if (!user || unread === 0) return;
    void haptic("medium");
    setItems((prev) => prev.map((x) => ({ ...x, is_read: true })));
    await supabase.from("notifications").update({ is_read: true }).eq("user_id", user.id).eq("is_read", false);
  };

  return (
    <main className="oils-screen oils-notifs" dir="rtl">
      <header className="oils-page-header">
        <div>
          <span className="oils-eyebrow">مركز التنبيهات</span>
          <h1>الإشعارات</h1>
        </div>
        <button type="button" className="oils-header-symbol" aria-label="رجوع" onClick={() => navigate(-1)}>
          <ChevronRight />
        </button>
      </header>

      {/* لوحة الحالة */}
      <section className="oils-nt-hero">
        <span className="oils-nt-hero-mark">{unread > 0 ? <BellRing /> : <Bell />}</span>
        <div className="oils-nt-hero-copy">
          <small>{unread > 0 ? "تنبيهات جديدة بانتظارك" : "كل حاجة تحت السيطرة"}</small>
          <strong className="oils-num">{unread > 0 ? `${unread} غير مقروء` : "لا جديد"}</strong>
        </div>
        <button type="button" className="oils-nt-mark-all" disabled={unread === 0} onClick={() => void markAll()}>
          <CheckCheck />تعليم الكل
        </button>
      </section>

      {/* الفلاتر */}
      <div className="oils-nt-filters">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            className={`oils-nt-chip ${filter === f.key ? "is-active" : ""}`}
            onClick={() => { void haptic("light"); setFilter(f.key); }}
          >
            {f.label}
            {f.key === "unread" && unread > 0 && <i className="oils-num">{unread}</i>}
          </button>
        ))}
      </div>

      {/* القائمة */}
      {loading ? (
        <div className="oils-nt-list">
          {[0, 1, 2].map((i) => <div key={i} className="oils-nt-skeleton" />)}
        </div>
      ) : visible.length === 0 ? (
        <div className="oils-qo-empty">
          <span className="oils-qo-empty-mark"><Sparkles /></span>
          <h4>مفيش إشعارات هنا</h4>
          <p>هنبلغك فورًا بحالة طلباتك، العروض الجديدة، ووصول الأصناف.</p>
        </div>
      ) : (
        <div className="oils-nt-list">
          {visible.map((n) => {
            const Icon = ICONS[n.type] || Info;
            const tone = TONES[n.type] || "is-info";
            return (
              <article
                key={n.id}
                className={`oils-nt-card ${tone} ${n.is_read ? "" : "is-unread"}`}
                onClick={() => void markOne(n)}
              >
                <span className="oils-nt-icon"><Icon /></span>
                <div className="oils-nt-body">
                  <h3>{n.title}</h3>
                  <p>{clean(n.message)}</p>
                  <time>{timeAgo(n.created_at)}</time>
                </div>
                {!n.is_read && <span className="oils-nt-dot" aria-label="غير مقروء" />}
              </article>
            );
          })}
        </div>
      )}
    </main>
  );
};

export default OilsNotifications;
