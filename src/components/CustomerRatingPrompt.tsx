import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Star, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

interface PendingRating {
  request_id: string;
  staff_user_id: string;
  staff_name: string;
}

const SKIPPED_KEY = "rating_skipped_requests";

const getSkipped = (): string[] => {
  try {
    return JSON.parse(localStorage.getItem(SKIPPED_KEY) || "[]");
  } catch {
    return [];
  }
};

const addSkipped = (id: string) => {
  const list = getSkipped();
  if (!list.includes(id)) {
    list.push(id);
    localStorage.setItem(SKIPPED_KEY, JSON.stringify(list.slice(-50)));
  }
};

interface Props {
  /** Triggered when the prompt is shown — useful for the parent chat to know to defer messages */
  onShown?: () => void;
}

export default function CustomerRatingPrompt({ onShown }: Props) {
  const { user } = useAuth();
  const [pending, setPending] = useState<PendingRating | null>(null);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const fetchPending = async () => {
      const skipped = getSkipped();

      // Find latest resolved request for this user with a staff handler
      const { data: requests } = await (supabase as any)
        .from("support_requests")
        .select("id, claimed_by, assigned_to, resolved_at")
        .eq("user_id", user.id)
        .in("status", ["resolved", "closed"])
        .not("claimed_by", "is", null)
        .order("resolved_at", { ascending: false })
        .limit(5);

      if (!requests || requests.length === 0 || cancelled) return;

      // Get already-rated request ids
      const reqIds = requests.map((r: any) => r.id);
      const { data: rated } = await (supabase as any)
        .from("support_request_ratings")
        .select("support_request_id")
        .in("support_request_id", reqIds);

      const ratedSet = new Set((rated || []).map((r: any) => r.support_request_id));

      // First request that is not rated AND not skipped
      const target = requests.find(
        (r: any) => !ratedSet.has(r.id) && !skipped.includes(r.id)
      );
      if (!target || cancelled) return;

      const staffId = target.claimed_by || target.assigned_to;
      if (!staffId) return;

      // Get staff name
      const { data: prof } = await supabase
        .from("profiles")
        .select("full_name, email")
        .eq("user_id", staffId)
        .maybeSingle();

      const staffName = (prof as any)?.full_name || (prof as any)?.email?.split("@")[0] || "فريق الدعم";

      if (!cancelled) {
        setPending({
          request_id: target.id,
          staff_user_id: staffId,
          staff_name: staffName,
        });
        onShown?.();
      }
    };

    fetchPending();
    return () => {
      cancelled = true;
    };
  }, [user, onShown]);

  const handleSkip = () => {
    if (pending) addSkipped(pending.request_id);
    setPending(null);
  };

  const handleSubmit = async () => {
    if (!pending || !user || rating === 0) return;
    setSubmitting(true);
    try {
      const { error } = await (supabase as any).from("support_request_ratings").insert({
        support_request_id: pending.request_id,
        staff_user_id: pending.staff_user_id,
        customer_user_id: user.id,
        rating,
        comment: comment.trim() || null,
      });
      if (error) throw error;
      toast.success("شكراً على تقييمك! 🌟", {
        description: "رأيك بيساعدنا نحسن من خدمتنا",
      });
      setPending(null);
    } catch (err: any) {
      toast.error("لم يتم حفظ التقييم", { description: err.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AnimatePresence>
      {pending && (
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -10, scale: 0.95 }}
          className="bg-gradient-to-br from-primary/10 via-card to-card border border-primary/30 rounded-2xl p-4 mx-3 my-2 shadow-lg relative"
          dir="rtl"
        >
          <button
            onClick={handleSkip}
            className="absolute top-2 left-2 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="تخطي"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="space-y-3">
            <div>
              <h4 className="font-bold text-sm text-foreground">
                كيف كانت تجربتك مع <span className="text-primary">{pending.staff_name}</span>؟
              </h4>
              <p className="text-xs text-muted-foreground mt-0.5">
                تقييمك اختياري ويساعدنا نقدم خدمة أفضل
              </p>
            </div>

            <div className="flex items-center justify-center gap-1.5 py-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(0)}
                  className="transition-transform hover:scale-110"
                  disabled={submitting}
                >
                  <Star
                    className={`w-7 h-7 transition-colors ${
                      (hover || rating) >= star
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground/40"
                    }`}
                  />
                </button>
              ))}
            </div>

            {rating > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                className="space-y-2"
              >
                <Textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder={
                    rating >= 4
                      ? "إيه اللي عجبك في الخدمة؟ (اختياري)"
                      : "كيف نقدر نتحسن؟ (اختياري)"
                  }
                  rows={2}
                  maxLength={300}
                  className="text-xs resize-none"
                  disabled={submitting}
                />
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleSkip}
                    disabled={submitting}
                    className="flex-1 h-8 text-xs"
                  >
                    تخطي
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSubmit}
                    disabled={submitting || rating === 0}
                    className="flex-1 h-8 text-xs gap-1"
                  >
                    {submitting && <Loader2 className="w-3 h-3 animate-spin" />}
                    إرسال التقييم
                  </Button>
                </div>
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
