import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ShieldAlert, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface RequestPermissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Short machine-friendly label, e.g. "delete_order", "edit_price" */
  actionType: string;
  /** Human-readable Arabic description shown to the admin, e.g. "حذف طلب رقم ORD-123" */
  actionDescription: string;
  /** Optional extra context (orderId, productId, …) stored as JSON */
  contextData?: Record<string, any>;
}

export default function RequestPermissionDialog({
  open,
  onOpenChange,
  actionType,
  actionDescription,
  contextData = {},
}: RequestPermissionDialogProps) {
  const { user } = useAuth();
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;
    setSubmitting(true);
    try {
      // Fetch profile to attach name/email
      const { data: profile } = await supabase
        .from("profiles")
        .select("display_name, full_name, email")
        .eq("user_id", user.id)
        .maybeSingle();

      const requesterName =
        (profile as any)?.display_name ||
        (profile as any)?.full_name ||
        user.email?.split("@")[0] ||
        "موظف";

      const { error } = await supabase.from("permission_requests").insert({
        requester_id: user.id,
        requester_name: requesterName,
        requester_email: user.email,
        action_type: actionType,
        action_description: actionDescription,
        context_data: contextData,
        reason: reason.trim() || null,
        status: "pending",
      });

      if (error) throw error;

      toast.success("تم إرسال الطلب للأدمن", {
        description: "هتوصلك إشعار فور الرد على طلبك",
      });
      setReason("");
      onOpenChange(false);
    } catch (e: any) {
      toast.error("تعذّر إرسال الطلب", { description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <ShieldAlert className="h-6 w-6 text-destructive" />
          </div>
          <DialogTitle className="text-center">ليس لديك صلاحية</DialogTitle>
          <DialogDescription className="text-center">
            هذا الإجراء يحتاج موافقة الأدمن. تقدر تطلب الإذن وهيوصله إشعار فوراً.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="rounded-lg border bg-muted/50 p-3 text-sm">
            <div className="font-medium text-muted-foreground">الإجراء المطلوب:</div>
            <div className="mt-1 font-semibold">{actionDescription}</div>
          </div>

          <div>
            <Label htmlFor="reason">سبب الطلب (اختياري)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="اكتب سبب احتياجك لهذه الصلاحية..."
              rows={3}
              className="mt-1"
            />
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            إلغاء
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            <Send className="ml-2 h-4 w-4" />
            {submitting ? "جاري الإرسال..." : "اطلب الإذن من الأدمن"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
