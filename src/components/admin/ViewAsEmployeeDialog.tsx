import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Eye, Loader2, UserCircle2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Employee {
  user_id: string;
  name: string;
  email: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * ViewAsEmployeeDialog — Lists every moderator (employee) and lets the admin
 * pick one to "view as". On confirm, switches the frontend role flags via
 * AuthContext.startImpersonation and routes to /admin (the staff home).
 *
 * Backend session is untouched — see ImpersonationBanner.tsx for the full note.
 */
export default function ViewAsEmployeeDialog({ open, onOpenChange }: Props) {
  const { startImpersonation } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        // Get all moderators
        const { data: roles, error: rolesErr } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "moderator");
        if (rolesErr) throw rolesErr;

        const ids = (roles || []).map((r) => r.user_id);
        if (ids.length === 0) {
          if (!cancelled) setEmployees([]);
          return;
        }

        // Pull display name from profiles (auth.users isn't readable client-side)
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", ids);

        const profileMap = new Map<string, { name: string | null; email: string | null }>();
        for (const p of profiles || []) {
          profileMap.set(p.user_id, { name: p.full_name, email: p.email });
        }

        const list: Employee[] = ids.map((id) => {
          const p = profileMap.get(id);
          return {
            user_id: id,
            name: p?.name?.trim() || p?.email?.split("@")[0] || "موظف",
            email: p?.email || null,
          };
        });

        if (!cancelled) setEmployees(list);
      } catch (e) {
        console.error("[ViewAsEmployeeDialog] load error", e);
        if (!cancelled) {
          toast({
            title: "تعذر تحميل قائمة الموظفين",
            description: "حاول مرة أخرى بعد قليل.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, toast]);

  const handlePick = (emp: Employee) => {
    startImpersonation({ userId: emp.user_id, name: emp.name });
    onOpenChange(false);
    toast({
      title: `تم تفعيل وضع المعاينة كـ ${emp.name}`,
      description: "ستشاهد الواجهة كما يراها الموظف. اضغط «إنهاء المعاينة» في الشريط الأحمر للعودة.",
    });
    // Land on the staff home so the role-tasks panel shows immediately.
    navigate("/admin");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            معاينة كموظف
          </DialogTitle>
          <DialogDescription className="text-xs leading-relaxed">
            اختر موظفاً لمشاهدة الواجهة بنفس الصلاحيات والمهام التي يراها. هذا
            وضع عرض فقط — جلسة دخولك كأدمن لا تتغير، وأي إجراء سيُسجَّل باسمك.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 max-h-[50vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : employees.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-6">
              لا يوجد موظفون مسجلون.
            </p>
          ) : (
            employees.map((emp) => (
              <button
                key={emp.user_id}
                onClick={() => handlePick(emp)}
                className="w-full flex items-center justify-between gap-3 p-3 rounded-lg border bg-card hover:bg-accent hover:border-primary/40 transition text-right"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <UserCircle2 className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-semibold truncate">{emp.name}</div>
                    {emp.email && (
                      <div className="text-[11px] text-muted-foreground truncate">
                        {emp.email}
                      </div>
                    )}
                  </div>
                </div>
                <Eye className="w-4 h-4 text-muted-foreground shrink-0" />
              </button>
            ))
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            إغلاق
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
