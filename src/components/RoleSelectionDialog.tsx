import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Briefcase, Shield, Users } from "lucide-react";
import { motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";

interface RoleSelectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const RoleSelectionDialog = ({ open, onOpenChange }: RoleSelectionDialogProps) => {
  const navigate = useNavigate();
  const { isAdmin, isModerator } = useAuth();

  const handleSelect = (role: "dealer" | "admin") => {
    localStorage.setItem("almasria_last_role", role);
    onOpenChange(false);
    navigate(role === "dealer" ? "/dealer" : "/admin", { replace: true });
  };

  const adminLabel = isAdmin ? "مدير" : "موظف";
  const adminDesc = isAdmin ? "لوحة الإدارة" : "لوحة الموظفين";
  const AdminIcon = isAdmin ? Shield : Users;

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent
        className="max-w-sm p-0 gap-0 overflow-hidden border-border/60"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader className="p-6 pb-2 text-center">
          <DialogTitle className="text-lg font-black text-foreground">
            اختر وضع الدخول
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            حسابك يملك صلاحيتين — اختر اللوحة المناسبة
          </p>
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
      </DialogContent>
    </Dialog>
  );
};

export default RoleSelectionDialog;
