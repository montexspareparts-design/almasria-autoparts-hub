import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import CarModelSelector from "@/components/CarModelSelector";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { User, Phone, Mail, Car, Save, Loader2, ArrowRight, Lock, Eye, EyeOff, Sparkles, X } from "lucide-react";
import { recoverPhoneFromChannels, type RecoveredPhone } from "@/lib/recoverPhone";

const egyptianPhoneRegex = /^01[0-25]\d{8}$/;

const MyProfilePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [carModel, setCarModel] = useState("");
  const [carYear, setCarYear] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [isGoogleUser, setIsGoogleUser] = useState(false);
  const [recoveredPhone, setRecoveredPhone] = useState<RecoveredPhone | null>(null);
  const [recoveryDismissed, setRecoveryDismissed] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    // Check if Google user
    const provider = user.app_metadata?.provider;
    setIsGoogleUser(provider === "google");

    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      const currentPhone = data?.phone || "";
      if (data) {
        setFullName(data.full_name || "");
        setPhone(currentPhone);
        setEmail(data.email || "");
        setCarModel(data.car_model || "");
        setCarYear(data.car_year ? String(data.car_year) : "");
      }
      setLoading(false);

      // If profile has no phone, try to recover one from contact channels (WhatsApp / support / leads)
      if (!currentPhone) {
        try {
          const recovered = await recoverPhoneFromChannels(user.id, data?.email || user.email);
          if (recovered) setRecoveredPhone(recovered);
        } catch { /* silently ignore */ }
      }
    };
    fetchProfile();
  }, [user, navigate]);

  const validatePhone = (value: string): string => {
    if (!value) return "رقم الهاتف مطلوب — علشان نقدر نتواصل معاك بخصوص طلباتك";
    const digits = value.replace(/\D/g, "");
    if (!digits.startsWith("01")) return "الرقم لازم يبدأ بـ 01";
    if (digits.length !== 11) return "الرقم لازم يكون 11 رقم";
    if (!egyptianPhoneRegex.test(digits)) return "رقم هاتف مصري غير صحيح";
    return "";
  };

  const handlePhoneChange = (value: string) => {
    const digitsOnly = value.replace(/[^\d]/g, "");
    setPhone(digitsOnly);
    if (phoneError) setPhoneError(validatePhone(digitsOnly));
  };

  const handleSave = async () => {
    if (!user) return;

    const err = validatePhone(phone);
    if (err) {
      setPhoneError(err);
      toast.error(err);
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName || null,
        phone: phone,
        car_model: carModel || null,
        car_year: carYear ? parseInt(carYear) : null,
      })
      .eq("user_id", user.id);

    if (error) {
      toast.error("حدث خطأ أثناء حفظ البيانات", {
        description: error.message,
      });
    } else {
      toast.success("تم حفظ بياناتك بنجاح ✅", {
        description: phone
          ? `تم تحديث رقم الهاتف إلى ${phone} — هنقدر نتواصل معاك بخصوص طلباتك`
          : "تم تحديث بياناتك الشخصية",
        duration: 4000,
      });
    }
    setSaving(false);
  };

  const handleChangePassword = async () => {
    if (!newPassword || !confirmPassword) {
      toast.error("يرجى ملء جميع الحقول");
      return;
    }
    if (newPassword.length < 6) {
      toast.error("كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل");
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error("كلمة المرور الجديدة غير متطابقة");
      return;
    }
    setChangingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      toast.error("حدث خطأ: " + error.message);
    } else {
      toast.success("تم تغيير كلمة المرور بنجاح ✅");
      setNewPassword("");
      setConfirmPassword("");
    }
    setChangingPassword(false);
  };

  if (!user) return null;

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-background pt-24 pb-16 px-4" dir="rtl">
        <div className="max-w-xl mx-auto space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
              <User className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-black text-foreground">حسابي</h1>
            <p className="text-sm text-muted-foreground">عدّل بياناتك الشخصية ومعلومات سيارتك</p>
          </div>

          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-5">
              {/* Loyalty Program */}
              <LoyaltyCard />

              {/* Personal Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="w-4 h-4 text-primary" />
                    البيانات الشخصية
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">الاسم</Label>
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="الاسم الكامل"
                      dir="rtl"
                      className="h-11"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold">البريد الإلكتروني</Label>
                    <div className="relative">
                      <Input
                        value={email}
                        disabled
                        dir="ltr"
                        className="h-11 pl-9 bg-muted/50 cursor-not-allowed"
                      />
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    </div>
                    <p className="text-[11px] text-muted-foreground">البريد مرتبط بحساب تسجيل الدخول ولا يمكن تغييره</p>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-xs font-bold flex items-center gap-1">
                      رقم الهاتف <span className="text-destructive">*</span>
                      {phone && !phoneError && validatePhone(phone) === "" && (
                        <span className="text-[10px] font-normal text-emerald-600 mr-auto">✓ رقم صحيح</span>
                      )}
                    </Label>

                    {/* Auto-recovered phone suggestion from contact channels */}
                    {recoveredPhone && !recoveryDismissed && !phone && (
                      <div className="flex items-start gap-2 rounded-lg border border-primary/30 bg-primary/[0.06] p-2.5">
                        <Sparkles className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] leading-relaxed text-foreground/80">
                            لقينا رقم موبايل مرتبط بحسابك من <strong className="text-foreground">{recoveredPhone.sourceLabel}</strong>:
                          </p>
                          <p className="font-mono text-sm font-bold text-foreground mt-1" dir="ltr">
                            {recoveredPhone.phone}
                          </p>
                          <div className="flex items-center gap-2 mt-2">
                            <Button
                              type="button"
                              size="sm"
                              variant="default"
                              className="h-7 text-[11px] px-3"
                              onClick={() => {
                                setPhone(recoveredPhone.phone);
                                setPhoneError("");
                                setRecoveryDismissed(true);
                              }}
                            >
                              استخدم هذا الرقم
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-7 text-[11px] px-2"
                              onClick={() => setRecoveryDismissed(true)}
                            >
                              <X className="w-3 h-3 ml-1" />
                              تجاهل
                            </Button>
                          </div>
                        </div>
                      </div>
                    )}
                    <div className="relative">
                      <Input
                        value={phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        onBlur={() => setPhoneError(validatePhone(phone))}
                        placeholder="01xxxxxxxxx"
                        dir="ltr"
                        maxLength={11}
                        type="tel"
                        inputMode="numeric"
                        className={`h-11 pl-9 ${
                          phoneError
                            ? "border-destructive focus-visible:ring-destructive"
                            : phone && validatePhone(phone) === ""
                            ? "border-emerald-500/60"
                            : ""
                        }`}
                      />
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    </div>
                    {phoneError ? (
                      <p className="text-xs text-destructive">{phoneError}</p>
                    ) : (
                      <p className="text-[11px] text-muted-foreground">
                        رقم مصري مكون من 11 رقم يبدأ بـ 010 / 011 / 012 / 015 — يستخدم للتواصل بخصوص طلباتك
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Car Info */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Car className="w-4 h-4 text-primary" />
                    بيانات السيارة
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <CarModelSelector
                    carModel={carModel}
                    carYear={carYear}
                    onModelChange={setCarModel}
                    onYearChange={setCarYear}
                    compact
                  />
                </CardContent>
              </Card>

              {/* Change Password - only for non-Google users */}
              {!isGoogleUser && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <Lock className="w-4 h-4 text-primary" />
                      تغيير كلمة المرور
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">كلمة المرور الجديدة</Label>
                      <div className="relative">
                        <Input
                          value={newPassword}
                          onChange={(e) => setNewPassword(e.target.value)}
                          placeholder="أدخل كلمة المرور الجديدة"
                          type={showNewPw ? "text" : "password"}
                          dir="ltr"
                          className="h-11 pl-9"
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowNewPw(!showNewPw)}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground/50 hover:text-muted-foreground"
                        >
                          {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-bold">تأكيد كلمة المرور</Label>
                      <Input
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="أعد إدخال كلمة المرور"
                        type="password"
                        dir="ltr"
                        className="h-11"
                        minLength={6}
                      />
                      {confirmPassword && newPassword !== confirmPassword && (
                        <p className="text-xs text-destructive">كلمة المرور غير متطابقة</p>
                      )}
                    </div>

                    <Button
                      onClick={handleChangePassword}
                      disabled={changingPassword || !newPassword || !confirmPassword || newPassword !== confirmPassword}
                      variant="outline"
                      className="w-full h-11 gap-2 font-bold"
                    >
                      {changingPassword ? (
                        <><Loader2 className="w-4 h-4 animate-spin" /> جاري التغيير...</>
                      ) : (
                        <><Lock className="w-4 h-4" /> تغيير كلمة المرور</>
                      )}
                    </Button>
                  </CardContent>
                </Card>
              )}

              <Button
                onClick={handleSave}
                disabled={saving}
                className="w-full h-12 text-base font-bold gap-2"
              >
                {saving ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> جاري الحفظ...</>
                ) : (
                  <><Save className="w-5 h-5" /> حفظ التعديلات</>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
};

export default MyProfilePage;
