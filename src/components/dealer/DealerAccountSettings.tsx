import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/hooks/use-toast";
import { User, Phone, Save, Loader2, Shield, Volume2, VolumeX, Sun, Moon, Monitor, Type, Minus, Plus, Palette, Car, Bus, Check, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { isSoundEnabled, setSoundEnabled, playPricingSound } from "@/lib/pricingSound";
import { useTheme } from "next-themes";
import { useHighContrast } from "@/hooks/useHighContrast";

const tierLabels: Record<string, string> = {
  wholesale_tier1: "تاجر جملة – درجة أولى",
  wholesale_tier2: "تاجر جملة – درجة ثانية",
  corporate: "شركة / هيئة",
  retail: "عميل قطاعي",
};

const FONT_SIZE_KEY = "dealer_font_size";
const getFontSize = (): number => Number(localStorage.getItem(FONT_SIZE_KEY) || "16");
const setFontSizeStorage = (size: number) => {
  localStorage.setItem(FONT_SIZE_KEY, String(size));
  document.documentElement.style.fontSize = `${size}px`;
};

const DealerAccountSettings = () => {
  const { user, dealerAccount } = useAuth();
  const { theme, setTheme } = useTheme();
  const { enabled: highContrast, toggle: toggleHighContrast } = useHighContrast();
  const [profile, setProfile] = useState({ full_name: "", phone: "", email: "" });
  const [soundOn, setSoundOn] = useState(isSoundEnabled());
  const [fontSize, setFontSize] = useState(getFontSize());
  const [vehicleTypes, setVehicleTypes] = useState<string[]>((dealerAccount as any)?.vehicle_types || []);
  const [savingVehicle, setSavingVehicle] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Apply saved font size on mount
  useEffect(() => {
    const saved = getFontSize();
    if (saved !== 16) document.documentElement.style.fontSize = `${saved}px`;
  }, []);

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

  const adjustFontSize = (delta: number) => {
    const newSize = Math.min(22, Math.max(12, fontSize + delta));
    setFontSize(newSize);
    setFontSizeStorage(newSize);
  };

  const resetFontSize = () => {
    setFontSize(16);
    setFontSizeStorage(16);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2].map(i => <div key={i} className="h-24 rounded-lg bg-muted/50 animate-pulse" />)}
      </div>
    );
  }

  const themeOptions = [
    { value: "light", label: "فاتح", icon: Sun },
    { value: "dark", label: "داكن", icon: Moon },
    { value: "system", label: "تلقائي", icon: Monitor },
  ];

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

      {/* Vehicle Types */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Car className="w-4 h-4 text-primary" />
            نوع العربيات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-[11px] text-muted-foreground">اختر نوع العربيات اللي بتشتغل فيها عشان نعرض لك الأصناف المناسبة</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: "sedan", label: "ملاكي", icon: Car },
              { id: "microbus", label: "ميكروباص", icon: Bus },
            ].map((opt) => {
              const isSelected = vehicleTypes.includes(opt.id);
              return (
                <button
                  key={opt.id}
                  onClick={() => setVehicleTypes((prev) =>
                    prev.includes(opt.id) ? prev.filter((v) => v !== opt.id) : [...prev, opt.id]
                  )}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                    isSelected
                      ? "border-primary bg-primary/5"
                      : "border-border/50 bg-muted/30 hover:border-primary/30"
                  }`}
                >
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}>
                    <opt.icon className="w-4 h-4" />
                  </div>
                  <span className="text-sm font-bold text-foreground">{opt.label}</span>
                  {isSelected && <Check className="w-4 h-4 text-primary me-auto" />}
                </button>
              );
            })}
          </div>
          <Button
            size="sm"
            disabled={vehicleTypes.length === 0 || savingVehicle}
            onClick={async () => {
              setSavingVehicle(true);
              await supabase
                .from("dealer_accounts")
                .update({ vehicle_types: vehicleTypes } as any)
                .eq("id", dealerAccount!.id);
              toast({ title: "✅ تم حفظ نوع العربيات" });
              setSavingVehicle(false);
            }}
          >
            {savingVehicle ? <Loader2 className="w-3 h-3 ms-1 animate-spin" /> : <Save className="w-3 h-3 ms-1" />}
            حفظ
          </Button>
        </CardContent>
      </Card>


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
                className="pe-10"
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
                className="pe-10"
                placeholder="01xxxxxxxxx"
                dir="ltr"
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? <Loader2 className="w-4 h-4 ms-1.5 animate-spin" /> : <Save className="w-4 h-4 ms-1.5" />}
            حفظ التغييرات
          </Button>
        </CardContent>
      </Card>

      {/* Appearance Preferences */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            المظهر والعرض
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Theme */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">وضع الألوان</p>
            <div className="grid grid-cols-3 gap-2">
              {themeOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setTheme(opt.value);
                    toast({ title: `تم التبديل إلى الوضع ${opt.label}` });
                  }}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border transition-all duration-200 ${
                    theme === opt.value
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border/50 bg-muted/30 text-muted-foreground hover:border-primary/30 hover:bg-muted/50"
                  }`}
                >
                  <opt.icon className="w-5 h-5" />
                  <span className="text-[11px] font-bold">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Font Size */}
          <div className="space-y-2">
            <p className="text-xs font-medium text-foreground">حجم الخط</p>
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <button
                onClick={() => adjustFontSize(-1)}
                disabled={fontSize <= 12}
                className="w-8 h-8 rounded-lg border border-border/50 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 disabled:opacity-30 transition-all"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <div className="flex-1 text-center">
                <span className="text-lg font-bold text-foreground">{fontSize}</span>
                <span className="text-[10px] text-muted-foreground me-1">px</span>
              </div>
              <button
                onClick={() => adjustFontSize(1)}
                disabled={fontSize >= 22}
                className="w-8 h-8 rounded-lg border border-border/50 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/30 disabled:opacity-30 transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
            {fontSize !== 16 && (
              <button
                onClick={resetFontSize}
                className="text-[10px] text-primary hover:underline"
              >
                إعادة للحجم الافتراضي (16px)
              </button>
            )}
            <p className="text-[10px] text-muted-foreground">معاينة: <span style={{ fontSize: `${fontSize}px` }}>هذا نص تجريبي بالحجم المختار</span></p>
          </div>
        </CardContent>
      </Card>

      {/* Sound Preferences */}
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            {soundOn ? <Volume2 className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4 text-muted-foreground" />}
            تفضيلات الصوت
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
            <div>
              <p className="text-sm font-medium text-foreground">صوت التسعير</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">تشغيل صوت تنبيه عند تسعير منتج</p>
            </div>
            <Switch
              checked={soundOn}
              onCheckedChange={(checked) => {
                setSoundOn(checked);
                setSoundEnabled(checked);
                if (checked) playPricingSound();
                toast({ title: checked ? "🔊 تم تفعيل الصوت" : "🔇 تم كتم الصوت" });
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DealerAccountSettings;
