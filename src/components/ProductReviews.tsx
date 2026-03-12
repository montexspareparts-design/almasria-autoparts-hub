import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Star, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  reviewer_name: string | null;
  created_at: string;
}

interface ProductReviewsProps {
  productId: string;
}

const ProductReviews = ({ productId }: ProductReviewsProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [hoverRating, setHoverRating] = useState(0);

  useEffect(() => {
    fetchReviews();
  }, [productId]);

  const fetchReviews = async () => {
    const { data } = await supabase
      .from("product_reviews")
      .select("id, rating, comment, reviewer_name, created_at")
      .eq("product_id", productId)
      .eq("is_approved", true)
      .order("created_at", { ascending: false })
      .limit(10);
    setReviews(data || []);
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);

    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("user_id", user.id)
      .maybeSingle();

    const { error } = await supabase.from("product_reviews").insert({
      product_id: productId,
      user_id: user.id,
      rating,
      comment: comment.trim() || null,
      reviewer_name: profile?.full_name || "عميل",
    });

    if (error) {
      toast({ title: "حدث خطأ", variant: "destructive" });
    } else {
      toast({ title: "شكراً! تم إرسال تقييمك وسيظهر بعد المراجعة" });
      setComment("");
      setRating(5);
    }
    setSubmitting(false);
  };

  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-foreground">التقييمات ({reviews.length})</h3>
        {avgRating && (
          <div className="flex items-center gap-1.5">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="text-sm font-bold text-foreground">{avgRating}</span>
          </div>
        )}
      </div>

      {/* Review list */}
      {loading ? (
        <div className="flex justify-center py-4">
          <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
        </div>
      ) : reviews.length > 0 ? (
        <div className="space-y-3 max-h-48 overflow-y-auto">
          {reviews.map((r) => (
            <div key={r.id} className="bg-muted/50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-foreground">{r.reviewer_name || "عميل"}</span>
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      className={`w-3 h-3 ${s <= r.rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"}`}
                    />
                  ))}
                </div>
              </div>
              {r.comment && (
                <p className="text-xs text-muted-foreground leading-relaxed">{r.comment}</p>
              )}
              <p className="text-[10px] text-muted-foreground/60 mt-1">
                {new Date(r.created_at).toLocaleDateString("ar-EG")}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-muted-foreground text-center py-3">لا توجد تقييمات بعد. كن أول من يقيّم!</p>
      )}

      {/* Add review form */}
      {user && (
        <div className="border border-border rounded-lg p-3 space-y-3">
          <p className="text-xs font-medium text-foreground">أضف تقييمك</p>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <button
                key={s}
                onMouseEnter={() => setHoverRating(s)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setRating(s)}
              >
                <Star
                  className={`w-5 h-5 transition-colors ${
                    s <= (hoverRating || rating)
                      ? "fill-yellow-400 text-yellow-400"
                      : "text-muted-foreground/30"
                  }`}
                />
              </button>
            ))}
          </div>
          <Textarea
            placeholder="اكتب تعليقك (اختياري)..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="text-sm min-h-[60px]"
          />
          <Button size="sm" onClick={handleSubmit} disabled={submitting} className="gap-1.5 w-full">
            {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            إرسال التقييم
          </Button>
        </div>
      )}
    </div>
  );
};

export default ProductReviews;
