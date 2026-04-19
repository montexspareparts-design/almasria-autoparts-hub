import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Package, Plus, Tag, RefreshCw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useDealerCart } from "@/hooks/useDealerCart";
import { toast } from "sonner";

interface AIRecommendation {
  id: string;
  sku: string;
  name: string;
  brand: string;
  price: number;
  in_stock: number;
  on_sale: boolean;
  reason_type: "reorder" | "complementary" | "seasonal" | "opportunity";
}

const ease = [0.22, 1, 0.36, 1] as const;

const DealerAIRecommendations = ({ isRTL = true }: { isRTL?: boolean }) => {
  const { user, dealerAccount } = useAuth();
  const { addItem } = useDealerCart();
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = async (forceRefresh = false) => {
    if (!user?.id) return;
    if (forceRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/dealer-ai-recommendations`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "apikey": import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
        },
        body: JSON.stringify({ user_id: user.id, force_refresh: forceRefresh }),
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const data = await resp.json();
      setRecommendations(data?.recommendations || []);
    } catch (err: any) {
      console.error("AI recs error:", err);
      if (forceRefresh) toast.error("تعذر تحديث التوصيات");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    if (user?.id && dealerAccount?.is_active) load(false);
  }, [user?.id, dealerAccount?.is_active]);

  if (loading) {
    return (
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-4 h-4 text-primary animate-pulse" />
          <h3 className="text-sm font-bold text-foreground">جاري تحضير توصيات ذكية لك...</h3>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="aspect-[3/4] bg-muted/40 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (recommendations.length === 0) return null;

  const handleAdd = (p: AIRecommendation) => {
    addItem(p.id, 1);
    toast.success(`تمت إضافة ${p.name} للسلة`);
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease }}
      className="mt-6"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-bold text-foreground flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-[10px] bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          {isRTL ? "مختار لك بالذكاء الاصطناعي" : "Picked for you by AI"}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-primary"
          onClick={() => load(true)}
          disabled={refreshing}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "تحديث..." : "تحديث"}
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {recommendations.slice(0, 4).map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05, ease }}
            className="bg-card border border-border/40 rounded-2xl overflow-hidden group
              shadow-[0_1px_3px_rgba(0,0,0,0.04)]
              hover:shadow-[0_12px_32px_-8px_hsl(var(--primary)/0.15)]
              hover:border-primary/20
              transition-all duration-500 relative"
          >
            <div className="aspect-square bg-gradient-to-br from-muted/10 to-muted/30 relative flex items-center justify-center">
              <Package className="w-8 h-8 text-muted-foreground/15" />
              <span className={`absolute top-2.5 right-2.5 w-2 h-2 rounded-full ring-[2.5px] ring-card ${p.in_stock > 0 ? "bg-emerald-500" : "bg-muted-foreground/25"}`} />
              {p.on_sale && (
                <span className="absolute top-2 left-2 text-[9px] font-black bg-orange-500 text-white px-2 py-0.5 rounded-lg shadow-md">
                  عرض
                </span>
              )}
            </div>
            <div className="p-3 border-t border-border/20">
              <p className="text-xs font-bold text-foreground line-clamp-1 mb-0.5">{p.name}</p>
              <p className="text-[10px] text-muted-foreground font-mono mb-2.5">{p.sku}</p>
              <Button
                size="sm"
                className="w-full h-8 text-[11px] font-bold gap-1 rounded-xl shadow-sm"
                onClick={() => handleAdd(p)}
                disabled={p.in_stock === 0}
              >
                <Plus className="w-3 h-3" />{isRTL ? "أضف للسلة" : "Add to cart"}
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
};

export default DealerAIRecommendations;
