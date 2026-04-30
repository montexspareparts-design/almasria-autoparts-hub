import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ArrowRightLeft, History, User, Search, Check, X } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

interface Staff {
  user_id: string;
  name: string;
  role: string;
}

interface TransferRecord {
  id: string;
  from_name: string;
  to_name: string;
  note: string | null;
  created_at: string;
}

interface Props {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  requestId: string | null;
  customerName?: string | null;
  onTransferred?: () => void;
}

export default function TransferToColleagueDialog({
  open, onOpenChange, requestId, customerName, onTransferred,
}: Props) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [staff, setStaff] = useState<Staff[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [note, setNote] = useState("");
  const [history, setHistory] = useState<TransferRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "admin" | "moderator" | "reporter">("all");

  const filteredStaff = useMemo(() => {
    const q = search.trim().toLowerCase();
    return staff.filter((s) => {
      if (roleFilter !== "all" && s.role !== roleFilter) return false;
      if (!q) return true;
      return s.name.toLowerCase().includes(q);
    });
  }, [staff, search, roleFilter]);

  const selectedObj = useMemo(
    () => staff.find((s) => s.user_id === selectedStaff) || null,
    [staff, selectedStaff]
  );

  const roleLabel = (r: string) =>
    r === "admin" ? "أدمن" : r === "reporter" ? "مندوب" : "موظف";
  const roleBadgeClass = (r: string) =>
    r === "admin"
      ? "bg-amber-100 text-amber-800 border-amber-200"
      : r === "reporter"
      ? "bg-violet-100 text-violet-800 border-violet-200"
      : "bg-sky-100 text-sky-800 border-sky-200";

  useEffect(() => {
    if (!open || !requestId) return;
    setSelectedStaff("");
    setNote("");
    fetchData();
  }, [open, requestId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch all staff via SECURITY DEFINER RPC (bypasses profiles RLS)
      const { data: colleagues } = await (supabase as any).rpc("list_staff_colleagues");
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("role", ["admin", "moderator", "reporter"]);
      const roleMap = new Map<string, string>();
      (roles || []).forEach((r: any) => {
        // prefer admin > moderator > reporter when user has multiple
        const prev = roleMap.get(r.user_id);
        const rank = (x: string) => (x === "admin" ? 3 : x === "moderator" ? 2 : 1);
        if (!prev || rank(r.role) > rank(prev)) roleMap.set(r.user_id, r.role);
      });
      const list: Staff[] = (colleagues || [])
        .filter((c: any) => c.user_id !== user?.id)
        .map((c: any) => ({
          user_id: c.user_id,
          name: c.full_name || "موظف",
          role: roleMap.get(c.user_id) || "moderator",
        }))
        .sort((a: Staff, b: Staff) => a.name.localeCompare(b.name, "ar"));
      setStaff(list);

      // Fetch transfer history for this request
      const { data: transfers } = await (supabase as any)
        .from("support_request_transfers")
        .select("id, from_staff_id, to_staff_id, note, created_at")
        .eq("support_request_id", requestId)
        .order("created_at", { ascending: false });

      if (transfers && transfers.length > 0) {
        const allIds = [...new Set(transfers.flatMap((t: any) => [t.from_staff_id, t.to_staff_id]))];
        const { data: nameProfs } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", allIds as string[]);
        const nameMap = new Map((nameProfs || []).map((p: any) => [p.user_id, p.full_name || p.email || "موظف"]));
        setHistory(
          transfers.map((t: any) => ({
            id: t.id,
            from_name: nameMap.get(t.from_staff_id) || "موظف",
            to_name: nameMap.get(t.to_staff_id) || "موظف",
            note: t.note,
            created_at: t.created_at,
          }))
        );
      } else {
        setHistory([]);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (!user || !requestId || !selectedStaff) return;
    setSubmitting(true);
    try {
      // 1. Insert transfer record
      const { error: transferErr } = await (supabase as any)
        .from("support_request_transfers")
        .insert({
          support_request_id: requestId,
          from_staff_id: user.id,
          to_staff_id: selectedStaff,
          note: note.trim() || null,
        });
      if (transferErr) throw transferErr;

      // 2. Reassign the support request
      const { error: updateErr } = await (supabase as any)
        .from("support_requests")
        .update({
          claimed_by: selectedStaff,
          assigned_to: selectedStaff,
          claimed_at: new Date().toISOString(),
        })
        .eq("id", requestId);
      if (updateErr) throw updateErr;

      toast({ title: "✅ تم التحويل بنجاح", description: "الزميل سيستلم إشعار فوراً" });
      onTransferred?.();
      onOpenChange(false);
    } catch (err: any) {
      toast({ title: "خطأ في التحويل", description: err.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="w-5 h-5 text-primary" />
            تحويل الطلب لزميل
          </DialogTitle>
          <DialogDescription>
            {customerName ? `طلب من: ${customerName}` : "اختر زميل لتحويل الطلب إليه مع ملاحظة سريعة"}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>اختر الزميل</Label>
              <Select value={selectedStaff} onValueChange={setSelectedStaff}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر موظف..." />
                </SelectTrigger>
                <SelectContent>
                  {staff.length === 0 && (
                    <div className="px-3 py-2 text-sm text-muted-foreground">لا يوجد زملاء آخرون</div>
                  )}
                  {staff.map((s) => (
                    <SelectItem key={s.user_id} value={s.user_id}>
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6">
                          <AvatarFallback className="text-xs">{s.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span>{s.name}</span>
                        <Badge variant="outline" className="text-[10px] h-4">
                          {s.role === "admin" ? "أدمن" : "موظف"}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>ملاحظة (اختيارية)</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="مثال: العميل بيسأل عن قطعة غيار MTX، محتاج خبرتك..."
                rows={3}
                maxLength={300}
              />
              <p className="text-xs text-muted-foreground text-end">{note.length}/300</p>
            </div>

            {history.length > 0 && (
              <div className="space-y-2 border-t pt-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                  <History className="w-4 h-4" />
                  سجل التحويلات ({history.length})
                </div>
                <ScrollArea className="max-h-32">
                  <div className="space-y-1.5">
                    {history.map((h) => (
                      <div key={h.id} className="text-xs bg-muted/50 rounded-md p-2 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <User className="w-3 h-3" />
                          <span className="font-medium">{h.from_name}</span>
                          <ArrowRightLeft className="w-3 h-3 text-primary" />
                          <span className="font-medium">{h.to_name}</span>
                          <span className="text-muted-foreground ms-auto">
                            {new Date(h.created_at).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" })}
                          </span>
                        </div>
                        {h.note && <p className="text-muted-foreground italic">"{h.note}"</p>}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={submitting}>
            إلغاء
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={!selectedStaff || submitting}
            className="gap-1"
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
            تحويل الآن
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
