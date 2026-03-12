import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/hooks/use-toast";
import { User, Phone, Mail, Building, Save, Loader2, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";

const tierLabels: Record<string, string> = {
  wholesale_tier1: "تاجر جملة – درجة أولى",
  wholesale_tier2: "تاجر جملة – درجة ثانية",
  corporate: "شركة / هيئة",
  retail: "عميل قطاعي",
};

const DealerAccountSettings = () => {
  const { user, dealerAccount } = useAuth();
  const [profile, setProfile] = useState({ full_name: "", phone: "", email: "" });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    const { data } = await supabase
      .from("profiles")
      .select("full_name, phone, email")
      .eq("user_id", user!.id)
      .maybeSingle();
    if (data) {
      setProfile({
        full_name: data.full_name || "",
        phone: data.phone || "",
        email: data.email || user?.email || "",
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: profile.full_name.trim(),
        phone: profile.phone.trim(),
      })
      .eq("user_id", user!.id);

    if (error) {
      toast({ title: "خطأ", description: "فشل حفظ البيانات", variant: "destructive" });
    } else {
      toast({ title: "تم الحفظ ✓", description: "تم تحديث بيانات الحساب" });
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => <div key={i} className="h-24 rounded-lg bg-muted/50 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-2xl">
      <h2 className="text-lg font-bold text-foreground">إعدادات الحساب</h2>

      {/* Account Info (Read Only) */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            معلومات الحساب التجاري
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-[11px] text-muted-foreground mb-1">فئة الحساب</p>
              <Badge variant="secondary" className="text-xs">
                {dealerAccount ? tierLabels[dealerAccount.tier] || dealerAccount.tier : "—"}
              </Badge>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-[11px] text-muted-foreground mb-1">حالة الحساب</p>
              <Badge variant={dealerAccount?.is_active ? "default" : "destructive"} className="text-xs">
                {dealerAccount?.is_active ? "نشط" : "غير نشط"}
              </Badge>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-[11px] text-muted-foreground mb-1">حد الائتمان</p>
              <p className="text-sm font-semibold text-foreground">
                {(dealerAccount as any)?.credit_limit ? `${Number((dealerAccount as any).credit_limit).toLocaleString("ar-EG")} ج.م` : "غير محدد"}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50">
              <p className="text-[11px] text-muted-foreground mb-1">البريد الإلكتروني</p>
              <p className="text-sm text-foreground truncate">{user?.email}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Editable Profile */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="w-4 h-4 text-primary" />
            البيانات الشخصية
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-xs">الاسم الكامل</Label>
            <div className="relative">
              <User className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="name"
                value={profile.full_name}
                onChange={(e) => setProfile(p => ({ ...p, full_name: e.target.value }))}
                className="pr-10"
                placeholder="اسم التاجر"
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone" className="text-xs">رقم الهاتف</Label>
            <div className="relative">
              <Phone className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                id="phone"
                value={profile.phone}
                onChange={(e) => setProfile(p => ({ ...p, phone: e.target.value }))}
                className="pr-10"
                placeholder="01xxxxxxxxx"
                dir="ltr"
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? <Loader2 className="w-4 h-4 ml-1.5 animate-spin" /> : <Save className="w-4 h-4 ml-1.5" />}
            حفظ التغييرات
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default DealerAccountSettings;
