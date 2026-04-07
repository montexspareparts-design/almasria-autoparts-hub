import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Loader2, CheckCircle, XCircle, Eye, Phone, Mail,
  Banknote, Clock, Image as ImageIcon, ExternalLink, RefreshCw
} from "lucide-react";
import WhatsAppQuickChat from "@/components/admin/WhatsAppQuickChat";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle
} from "@/components/ui/dialog";

interface InstaPayOrder {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  notes: string | null;
  created_at: string;
  user_id: string;
  payment_method: string | null;
  profile?: { full_name: string | null; phone: string | null; email: string | null };
}

const AdminInstaPayReceipts = () => {
  const { toast } = useToast();
  const [orders, setOrders] = useState<InstaPayOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [rejecting, setRejecting] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [filter, setFilter] = useState<"pending" | "confirmed" | "all">("pending");

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("orders")
        .select("*")
        .eq("payment_method", "instapay")
        .order("created_at", { ascending: false });

      if (filter === "pending") {
        query = query.in("status", ["pending", "confirmed", "awaiting_payment"]);
      } else if (filter === "confirmed") {
        query = query.eq("status", "processing");
      }

      const { data, error } = await query;
      if (error) throw error;

      // Fetch profiles
      const userIds = [...new Set((data || []).map(o => o.user_id))];
      let profiles: Record<string, { full_name: string | null; phone: string | null; email: string | null }> = {};
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("user_id, full_name, phone, email")
          .in("user_id", userIds);
        if (profilesData) {
          profilesData.forEach(p => {
            profiles[p.user_id] = { full_name: p.full_name, phone: p.phone, email: p.email };
          });
        }
      }

      setOrders((data || []).map(o => ({
        ...o,
        profile: profiles[o.user_id] || null,
      })));
    } catch (err) {
      console.error(err);
      toast({ title: "خطأ في جلب الطلبات", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [filter, toast]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const getReceiptUrl = (notes: string | null): string | null => {
    if (!notes) return null;
    const match = notes.match(/instapay_receipt:\s*(.+)/);
    return match ? match[1].trim() : null;
  };

  const getSignedUrl = async (path: string) => {
    const { data } = await supabase.storage
      .from("dealer-documents")
      .createSignedUrl(path, 300);
    return data?.signedUrl || null;
  };

  const handlePreview = async (notes: string | null) => {
    const path = getReceiptUrl(notes);
    if (!path) {
      toast({ title: "لا يوجد إيصال مرفق", variant: "destructive" });
      return;
    }
    const url = await getSignedUrl(path);
    if (url) setPreviewUrl(url);
    else toast({ title: "تعذر عرض الإيصال", variant: "destructive" });
  };

  const handleConfirmPayment = async (orderId: string) => {
    setConfirming(orderId);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "processing" })
        .eq("id", orderId);
      if (error) throw error;
      toast({ title: "✅ تم تأكيد الدفع ونقل الطلب لمرحلة التجهيز" });
      fetchOrders();
    } catch {
      toast({ title: "خطأ في تأكيد الدفع", variant: "destructive" });
    } finally {
      setConfirming(null);
    }
  };

  const handleReject = async (orderId: string) => {
    setRejecting(orderId);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: "awaiting_payment", notes: "تم رفض إيصال InstaPay — يرجى إعادة التحويل" })
        .eq("id", orderId);
      if (error) throw error;
      toast({ title: "تم رفض الإيصال وطلب إعادة التحويل" });
      fetchOrders();
    } catch {
      toast({ title: "خطأ", variant: "destructive" });
    } finally {
      setRejecting(null);
    }
  };

  const pendingCount = orders.filter(o => ["pending", "confirmed", "awaiting_payment"].includes(o.status)).length;

  return (
    <div className="space-y-4" dir="rtl">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Banknote className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-bold text-foreground">إيصالات InstaPay</h2>
          {pendingCount > 0 && (
            <Badge variant="destructive" className="text-xs animate-pulse">
              {pendingCount} بانتظار المراجعة
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="flex rounded-lg border border-border overflow-hidden text-xs">
            {(["pending", "confirmed", "all"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`px-3 py-1.5 transition-colors ${
                  filter === f
                    ? "bg-primary text-primary-foreground font-bold"
                    : "bg-card text-muted-foreground hover:bg-muted"
                }`}
              >
                {f === "pending" ? "بانتظار المراجعة" : f === "confirmed" ? "تم التأكيد" : "الكل"}
              </button>
            ))}
          </div>
          <Button variant="outline" size="sm" onClick={fetchOrders} disabled={loading}>
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </div>

      {/* Orders list */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-primary" />
        </div>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Banknote className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">لا توجد إيصالات {filter === "pending" ? "بانتظار المراجعة" : ""}</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {orders.map(order => {
            const hasReceipt = !!getReceiptUrl(order.notes);
            const isPending = ["pending", "confirmed", "awaiting_payment"].includes(order.status);

            return (
              <Card key={order.id} className={`transition-all ${isPending ? "border-amber-500/30 bg-amber-500/5" : ""}`}>
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    {/* Order info */}
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-sm text-foreground">
                          #{order.order_number}
                        </span>
                        <Badge variant={isPending ? "secondary" : "default"} className="text-[10px]">
                          {isPending ? "بانتظار التأكيد" : order.status === "processing" ? "تم التأكيد ✓" : order.status}
                        </Badge>
                        {hasReceipt ? (
                          <Badge variant="outline" className="text-[10px] text-green-600 border-green-600/30">
                            <ImageIcon className="w-3 h-3 ml-1" />
                            إيصال مرفق
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px] text-red-500 border-red-500/30">
                            بدون إيصال
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                        <span className="font-bold text-base text-foreground">
                          {order.total_amount.toLocaleString("ar-EG")} ج.م
                        </span>
                        <span>•</span>
                        <span>{new Date(order.created_at).toLocaleDateString("ar-EG", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</span>
                      </div>

                      {order.profile && (
                        <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                          <span className="font-medium text-foreground">{order.profile.full_name || "—"}</span>
                          {order.profile.phone && (
                            <span className="flex items-center gap-1">
                              <Phone className="w-3 h-3" />
                              {order.profile.phone}
                              <WhatsAppQuickChat
                                phone={order.profile.phone}
                                customerName={order.profile.full_name || undefined}
                                context={`بخصوص طلبك رقم #${order.order_number} والدفع عبر إنستا باي.`}
                              />
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {hasReceipt && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handlePreview(order.notes)}
                          className="text-xs"
                        >
                          <Eye className="w-3.5 h-3.5 ml-1" />
                          عرض الإيصال
                        </Button>
                      )}

                      {isPending && (
                        <>
                          <Button
                            size="sm"
                            onClick={() => handleConfirmPayment(order.id)}
                            disabled={!!confirming}
                            className="text-xs bg-green-600 hover:bg-green-700"
                          >
                            {confirming === order.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckCircle className="w-3.5 h-3.5 ml-1" />
                            )}
                            تأكيد الدفع
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleReject(order.id)}
                            disabled={!!rejecting}
                            className="text-xs text-red-500 border-red-500/30 hover:bg-red-500/10"
                          >
                            {rejecting === order.id ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5 ml-1" />
                            )}
                            رفض
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Receipt preview dialog */}
      <Dialog open={!!previewUrl} onOpenChange={() => setPreviewUrl(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-right">معاينة إيصال InstaPay</DialogTitle>
          </DialogHeader>
          {previewUrl && (
            <div className="space-y-3">
              <img
                src={previewUrl}
                alt="InstaPay Receipt"
                className="w-full rounded-lg border border-border"
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.open(previewUrl, "_blank")}
              >
                <ExternalLink className="w-3.5 h-3.5 ml-1" />
                فتح في نافذة جديدة
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminInstaPayReceipts;
