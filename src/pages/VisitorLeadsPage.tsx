import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Phone, MessageCircle, CheckCircle, Clock, Trash2, Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

type Lead = {
  id: string;
  phone: string;
  source: string | null;
  first_path: string | null;
  referrer: string | null;
  status: string;
  staff_notes: string | null;
  contacted_by: string | null;
  contacted_at: string | null;
  created_at: string;
};

const sourceMeta = (s: string | null) => {
  switch (s) {
    case "facebook": return { icon: "📘", label: "فيسبوك", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" };
    case "instagram": return { icon: "📷", label: "إنستجرام", color: "bg-pink-500/10 text-pink-600 border-pink-500/20" };
    case "google": return { icon: "🔍", label: "جوجل", color: "bg-red-500/10 text-red-600 border-red-500/20" };
    case "tiktok": return { icon: "🎵", label: "تيك توك", color: "bg-purple-500/10 text-purple-600 border-purple-500/20" };
    case "whatsapp": return { icon: "💬", label: "واتساب", color: "bg-green-500/10 text-green-600 border-green-500/20" };
    default: return { icon: "✨", label: "مباشر", color: "bg-muted text-muted-foreground border-border" };
  }
};

const statusMeta: Record<string, { label: string; color: string }> = {
  new: { label: "جديد", color: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  contacted: { label: "تم التواصل", color: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  interested: { label: "مهتم", color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  not_interested: { label: "مش مهتم", color: "bg-muted text-muted-foreground border-border" },
  converted: { label: "اشترى ✨", color: "bg-primary/15 text-primary border-primary/30" },
};

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleString("ar-EG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: true });

const fmtRel = (iso: string) => {
  const m = Math.floor((Date.now() - new Date(iso).getTime()) / 60000);
  if (m < 60) return `منذ ${m} د`;
  const h = Math.floor(m / 60);
  if (h < 24) return `منذ ${h} س`;
  return `منذ ${Math.floor(h / 24)} يوم`;
};

const VisitorLeadsPage = () => {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const { toast } = useToast();

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("visitor_leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) toast({ title: "خطأ في تحميل البيانات", variant: "destructive" });
    else setLeads((data || []) as Lead[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (id: string, status: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("visitor_leads")
      .update({
        status,
        contacted_by: status !== "new" ? user?.id : null,
        contacted_at: status !== "new" ? new Date().toISOString() : null,
      })
      .eq("id", id);
    if (error) {
      toast({ title: "فشل التحديث", variant: "destructive" });
    } else {
      toast({ title: "تم التحديث ✅" });
      setLeads((prev) => prev.map((l) => l.id === id ? { ...l, status } : l));
    }
  };

  const deleteLead = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الـ Lead؟")) return;
    const { error } = await supabase.from("visitor_leads").delete().eq("id", id);
    if (error) toast({ title: "فشل الحذف", variant: "destructive" });
    else {
      toast({ title: "تم الحذف" });
      setLeads((prev) => prev.filter((l) => l.id !== id));
    }
  };

  const callPhone = (phone: string) => { window.location.href = `tel:${phone}`; };
  const whatsappPhone = (phone: string) => {
    const cleaned = phone.startsWith("0") ? `2${phone}` : phone;
    const msg = encodeURIComponent("السلام عليكم، شكراً لاهتمامكم بالمصرية جروب لقطع غيار تويوتا. كيف يمكنني مساعدتك؟");
    window.open(`https://wa.me/${cleaned}?text=${msg}`, "_blank");
  };

  const filtered = leads.filter((l) => {
    if (filter !== "all" && l.status !== filter) return false;
    if (search && !l.phone.includes(search)) return false;
    return true;
  });

  const counts = {
    all: leads.length,
    new: leads.filter((l) => l.status === "new").length,
    contacted: leads.filter((l) => l.status === "contacted").length,
    interested: leads.filter((l) => l.status === "interested").length,
    converted: leads.filter((l) => l.status === "converted").length,
  };

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      <header className="bg-card border-b border-border sticky top-0 z-10 backdrop-blur-md bg-card/90">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <span className="text-2xl">📞</span> Leads من الزوار
            </h1>
            <p className="text-xs text-muted-foreground">أرقام واتساب جمعها popup الزوار غير المسجلين</p>
          </div>
          <Link to="/admin">
            <Button variant="ghost" size="sm">
              <ArrowRight className="w-4 h-4 ml-1" /> رجوع
            </Button>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {[
            { key: "all", label: "الإجمالي", value: counts.all, icon: "📊" },
            { key: "new", label: "جديد", value: counts.new, icon: "🆕" },
            { key: "contacted", label: "تم التواصل", value: counts.contacted, icon: "💬" },
            { key: "interested", label: "مهتم", value: counts.interested, icon: "🔥" },
            { key: "converted", label: "اشترى", value: counts.converted, icon: "✨" },
          ].map((k) => (
            <button
              key={k.key}
              onClick={() => setFilter(k.key)}
              className={`p-4 rounded-2xl border-2 transition-all text-right ${
                filter === k.key ? "border-primary bg-primary/5 shadow-lg" : "border-border bg-card hover:border-primary/40"
              }`}
            >
              <div className="text-2xl mb-1">{k.icon}</div>
              <div className="text-2xl font-bold">{k.value}</div>
              <div className="text-xs text-muted-foreground">{k.label}</div>
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="ابحث برقم التليفون..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pr-10"
          />
        </div>

        {/* List */}
        {loading ? (
          <div className="text-center py-12 text-muted-foreground">جاري التحميل...</div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 bg-card rounded-2xl border border-border">
            <div className="text-5xl mb-3">📭</div>
            <p className="text-muted-foreground">لا يوجد leads في هذا التصنيف بعد</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map((lead, idx) => {
              const src = sourceMeta(lead.source);
              const st = statusMeta[lead.status] || statusMeta.new;
              return (
                <motion.div
                  key={lead.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.02 }}
                  className="bg-card border border-border rounded-2xl p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <Badge variant="outline" className={src.color}>
                          {src.icon} {src.label}
                        </Badge>
                        <Badge variant="outline" className={st.color}>{st.label}</Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {fmtRel(lead.created_at)} · {fmtDate(lead.created_at)}
                        </span>
                      </div>
                      <div className="text-2xl font-bold tracking-wider mb-1" dir="ltr">{lead.phone}</div>
                      {lead.first_path && (
                        <p className="text-xs text-muted-foreground">
                          أول صفحة: <code className="bg-muted px-1 rounded">{lead.first_path}</code>
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <Button size="sm" onClick={() => whatsappPhone(lead.phone)} className="bg-green-600 hover:bg-green-700">
                        <MessageCircle className="w-4 h-4 ml-1" /> واتساب
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => callPhone(lead.phone)}>
                        <Phone className="w-4 h-4 ml-1" /> اتصال
                      </Button>
                    </div>
                  </div>

                  {/* Status actions */}
                  <div className="mt-3 pt-3 border-t border-border flex items-center gap-2 flex-wrap">
                    <span className="text-xs text-muted-foreground">تحديث الحالة:</span>
                    {(["contacted", "interested", "converted", "not_interested"] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => updateStatus(lead.id, s)}
                        disabled={lead.status === s}
                        className={`text-xs px-2 py-1 rounded-lg border transition-all ${
                          lead.status === s
                            ? "bg-primary/10 border-primary text-primary font-bold"
                            : "border-border hover:bg-muted"
                        }`}
                      >
                        {statusMeta[s].label}
                      </button>
                    ))}
                    <button
                      onClick={() => deleteLead(lead.id)}
                      className="ms-auto text-xs text-destructive hover:bg-destructive/10 p-1.5 rounded-lg"
                      aria-label="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
};

export default VisitorLeadsPage;
