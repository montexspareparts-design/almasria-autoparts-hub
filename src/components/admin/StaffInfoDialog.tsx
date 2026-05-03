import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, User, Shield, Mail, Phone, Calendar, BadgeCheck } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface Props {
  staffUserId: string | null;
  fallbackName?: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ROLE_META: Record<string, { label: string; cls: string; desc: string }> = {
  admin: {
    label: "مدير النظام",
    cls: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-300/60",
    desc: "صلاحيات كاملة: إدارة المستخدمين، الأدوار، الأصناف، الأسعار، والتقارير",
  },
  moderator: {
    label: "موظف خدمة عملاء",
    cls: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-300/60",
    desc: "متابعة العملاء، تسجيل الإجراءات، استقبال البلاغات، وإدارة الطلبات (بدون أسعار/مخزون)",
  },
  reporter: {
    label: "موظف تقارير",
    cls: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-300/60",
    desc: "تقديم التقرير اليومي، بلاغات النواقص، ومتابعة الأداء الشخصي",
  },
  user: {
    label: "عميل",
    cls: "bg-slate-100 text-slate-700 dark:bg-slate-900/30 dark:text-slate-400 border-slate-300/60",
    desc: "حساب عميل قطاعي/جملة عادي",
  },
};

export function StaffInfoDialog({ staffUserId, fallbackName, open, onOpenChange }: Props) {
  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [roles, setRoles] = useState<string[]>([]);

  useEffect(() => {
    if (!open || !staffUserId) return;
    let cancelled = false;
    setLoading(true);
    setProfile(null);
    setRoles([]);
    (async () => {
      const [profileRes, rolesRes] = await Promise.all([
        supabase
          .from("profiles")
          .select("full_name, email, phone, created_at, avatar_url")
          .eq("user_id", staffUserId)
          .maybeSingle(),
        supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", staffUserId),
      ]);
      if (cancelled) return;
      setProfile(profileRes.data);
      setRoles(((rolesRes.data as any[]) || []).map((r) => r.role));
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, staffUserId]);

  const displayName = profile?.full_name || fallbackName || "موظف";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <BadgeCheck className="w-4 h-4 text-primary" />
            بيانات الموظف
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-3 p-3 rounded-xl bg-gradient-to-l from-primary/10 to-transparent border border-primary/20">
              <div className="w-12 h-12 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center shrink-0 overflow-hidden">
                {profile?.avatar_url ? (
                  <img src={profile.avatar_url} alt={displayName} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-6 h-6 text-primary" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-bold text-foreground truncate">{displayName}</div>
                <div className="flex items-center gap-1 flex-wrap mt-1">
                  {roles.length === 0 ? (
                    <span className="text-[10px] text-muted-foreground">— بدون دور —</span>
                  ) : (
                    roles.map((r) => {
                      const m = ROLE_META[r] || { label: r, cls: "bg-muted text-muted-foreground border-border" };
                      return (
                        <span key={r} className={cn("text-[10px] font-bold px-2 py-0.5 rounded-full border", m.cls)}>
                          {m.label}
                        </span>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Contact */}
            <div className="space-y-2">
              {profile?.email && (
                <div className="flex items-center gap-2 text-xs">
                  <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">البريد:</span>
                  <span className="font-medium text-foreground" dir="ltr">{profile.email}</span>
                </div>
              )}
              {profile?.phone && (
                <div className="flex items-center gap-2 text-xs">
                  <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">الموبايل:</span>
                  <span className="font-medium text-foreground" dir="ltr">{profile.phone}</span>
                </div>
              )}
              {profile?.created_at && (
                <div className="flex items-center gap-2 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="text-muted-foreground">تاريخ الانضمام:</span>
                  <span className="font-medium text-foreground">
                    {format(new Date(profile.created_at), "dd MMM yyyy", { locale: ar })}
                  </span>
                </div>
              )}
            </div>

            {/* Permissions */}
            <div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-foreground mb-2">
                <Shield className="w-3.5 h-3.5 text-primary" />
                الصلاحيات
              </div>
              <div className="space-y-2">
                {roles.length === 0 ? (
                  <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
                    لا توجد صلاحيات مُسنَدة لهذا الحساب.
                  </div>
                ) : (
                  roles.map((r) => {
                    const m = ROLE_META[r] || { label: r, cls: "bg-muted text-muted-foreground border-border", desc: "—" };
                    return (
                      <div key={r} className={cn("rounded-lg border p-2.5", m.cls)}>
                        <div className="text-xs font-bold mb-0.5">{m.label}</div>
                        <div className="text-[11px] opacity-80 leading-relaxed">{m.desc}</div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
