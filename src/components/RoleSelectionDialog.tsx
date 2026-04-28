import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Briefcase, Shield, Users, Home } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

interface RoleSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RoleSelectionDialog = ({ open, onOpenChange }: RoleSelectionDialogProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, isModerator } = useAuth();

  useEffect(() => {
    if (!open) return;
    if (location.pathname.startsWith("/admin") || location.pathname.startsWith("/dealer")) {
      onOpenChange(false);
    }
  }, [open, location.pathname, onOpenChange]);

  const handleSelect = (role: "dealer" | "admin") => {
    localStorage.setItem("almasria_last_role", role);
    onOpenChange(false);
    navigate(role === "dealer" ? "/dealer" : "/admin", { replace: true });
  };

  const handleBrowseAsGuest = () => {
    // علامة "مرفوض" حتى لا يعود الديالوج للظهور في نفس الجلسة
    localStorage.setItem("almasria_role_dismissed", "1");
    onOpenChange(false);
    // لا توجيه — يبقى المستخدم على الصفحة الحالية (الرئيسية)
  };

  const adminLabel = isAdmin ? "مدير" : "موظف";
  const adminDesc = isAdmin ? "لوحة الإدارة" : "لوحة الموظفين";
  const AdminIcon = isAdmin ? Shield : Users;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { localStorage.setItem("almasria_role_dismissed", "1"); onOpenChange(false); } }}>
      <DialogContent
        className="max-w-sm p-0 gap-0 overflow-hidden border-border/60"
      >
        <DialogHeader className="p-6 pb-2 text-center">
          <DialogTitle className="text-lg font-black text-foreground">
            اختر وضع الدخول
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground mt-1">
            حسابك يملك صلاحيتين — اختر اللوحة المناسبة أو تصفّح الموقع كزائر
          </DialogDescription>
        </DialogHeader>

        <div className="p-6 pt-4 grid grid-cols-2 gap-3" dir="rtl">
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleSelect("dealer")}
            className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group"
          >
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center group-hover:bg-blue-500/20 transition-colors">
              <Briefcase className="w-7 h-7 text-blue-600" />
            </div>
            <div className="text-center">
              <p className="font-bold text-sm text-foreground">تاجر</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">لوحة التاجر</p>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => handleSelect("admin")}
            className="flex flex-col items-center gap-3 p-5 rounded-xl border-2 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
              <AdminIcon className="w-7 h-7 text-primary" />
            </div>
            <div className="text-center">
              <p className="font-bold text-sm text-foreground">{adminLabel}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{adminDesc}</p>
            </div>
          </motion.button>
        </div>

        {/* خيار التصفّح كزائر — صف منفصل أسفل الخيارات، واضح وسهل اللمس على الموبايل */}
        <div className="px-6 pb-6 pt-1" dir="rtl">
          <button
            type="button"
            onClick={handleBrowseAsGuest}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-border/50 bg-muted/40 hover:bg-muted active:bg-muted/80 text-foreground text-sm font-semibold transition-colors min-h-[44px]"
          >
            <Home className="w-4 h-4" />
            تصفّح كزائر (الصفحة الرئيسية)
          </button>
          <p className="text-[10px] text-muted-foreground text-center mt-2">
            يمكنك العودة لاختيار الدور من قائمة الحساب في أي وقت
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default RoleSelectionDialog;

