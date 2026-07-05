import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

const CONFIRM_PHRASE = "حذف حسابي نهائيا";

export default function DeleteAccountDialog({ open, onOpenChange }: Props) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const isGoogle = user?.app_metadata?.provider === "google";
  const [ack, setAck] = useState(false);
  const [password, setPassword] = useState("");
  const [phrase, setPhrase] = useState("");
  const [loading, setLoading] = useState(false);

  const canSubmit =
    ack && (isGoogle ? phrase.trim() === CONFIRM_PHRASE : password.length >= 6);

  const handleDelete = async () => {
    if (!canSubmit || loading) return;
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("delete-my-account", {
        body: isGoogle ? { confirmPhrase: phrase } : { password },
      });
      if (error || !data?.success) {
        const msg = (data as any)?.error || error?.message || "فشل الحذف";
        toast.error(msg);
        setLoading(false);
        return;
      }
      toast.success("تم حذف حسابك نهائيًا");
      // Clean local state and sign out
      try { await signOut(); } catch { /* ignore */ }
      try {
        localStorage.clear();
        sessionStorage.clear();
      } catch { /* ignore */ }
      try {
        const reg = await navigator.serviceWorker?.getRegistration();
        const sub = await reg?.pushManager?.getSubscription();
        await sub?.unsubscribe();
      } catch { /* ignore */ }
      navigate("/", { replace: true });
      setTimeout(() => window.location.reload(), 300);
    } catch (e: any) {
      toast.error(e?.message || "خطأ غير متوقع");
      setLoading(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={(v) => !loading && onOpenChange(v)}>
      <AlertDialogContent dir="rtl" className="max-w-lg">
        <AlertDialogHeader>
          <div className="w-12 h-12 rounded-full bg-destructive/10 border border-destructive/30 flex items-center justify-center mx-auto mb-2">
            <AlertTriangle className="w-6 h-6 text-destructive" />
          </div>
          <AlertDialogTitle className="text-center text-xl font-black text-destructive">
            حذف الحساب نهائيًا
          </AlertDialogTitle>
          <AlertDialogDescription className="text-center text-sm leading-7">
            هذا الإجراء نهائي ولا يمكن التراجع عنه. سيتم حذف حسابك وبياناتك الشخصية
            (الاسم، الهاتف، العنوان، المفضلة، السلة، الإشعارات، تفضيلات التطبيق).
            قد يتم الاحتفاظ بسجلات الطلبات والفواتير السابقة بشكل مجهول الهوية فقط
            عندما يكون ذلك مطلوبًا لأغراض محاسبية أو قانونية.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4 py-2">
          {isGoogle ? (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">
                اكتب العبارة التالية للتأكيد:
                <span className="mx-1 font-mono text-destructive">{CONFIRM_PHRASE}</span>
              </Label>
              <Input
                value={phrase}
                onChange={(e) => setPhrase(e.target.value)}
                placeholder={CONFIRM_PHRASE}
                dir="rtl"
                className="h-11"
                disabled={loading}
              />
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold">أدخل كلمة المرور لتأكيد هويتك</Label>
              <Input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                placeholder="كلمة المرور"
                dir="ltr"
                className="h-11"
                disabled={loading}
                autoComplete="current-password"
              />
            </div>
          )}

          <label className="flex items-start gap-2 cursor-pointer select-none">
            <Checkbox
              checked={ack}
              onCheckedChange={(v) => setAck(!!v)}
              disabled={loading}
              className="mt-0.5"
            />
            <span className="text-xs leading-6">
              أفهم أن حذف الحساب نهائي وأن بياناتي الشخصية لن يمكن استرجاعها.
            </span>
          </label>
        </div>

        <AlertDialogFooter className="flex-row-reverse gap-2 sm:gap-2">
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!canSubmit || loading}
            className="gap-2"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> جاري الحذف...</>
            ) : (
              <><Trash2 className="w-4 h-4" /> حذف حسابي نهائيًا</>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={loading}
          >
            إلغاء
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
