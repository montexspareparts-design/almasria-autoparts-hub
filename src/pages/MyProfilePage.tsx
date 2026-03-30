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
import { User, Phone, Mail, Car, Save, Loader2, ArrowRight, Lock, Eye, EyeOff } from "lucide-react";

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

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    const fetchProfile = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        setFullName(data.full_name || "");
        setPhone(data.phone || "");
        setEmail(data.email || "");
        setCarModel(data.car_model || "");
        setCarYear(data.car_year ? String(data.car_year) : "");
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user, navigate]);

  const validatePhone = (value: string): string => {
    if (!value) return "";
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

    if (phone) {
      const err = validatePhone(phone);
      if (err) {
        setPhoneError(err);
        toast.error(err);
        return;
      }
    }

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({
        full_name: fullName || null,
        phone: phone || null,
        car_model: carModel || null,
        car_year: carYear ? parseInt(carYear) : null,
      })
      .eq("user_id", user.id);

    if (error) {
      toast.error("حدث خطأ أثناء حفظ البيانات");
    } else {
      toast.success("تم حفظ بياناتك بنجاح ✅");
    }
    setSaving(false);
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
                    <Label className="text-xs font-bold">رقم الهاتف</Label>
                    <div className="relative">
                      <Input
                        value={phone}
                        onChange={(e) => handlePhoneChange(e.target.value)}
                        placeholder="01xxxxxxxxx"
                        dir="ltr"
                        maxLength={11}
                        type="tel"
                        inputMode="numeric"
                        className={`h-11 pl-9 ${phoneError ? "border-destructive" : ""}`}
                      />
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
                    </div>
                    {phoneError && <p className="text-xs text-destructive">{phoneError}</p>}
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

              {/* Save Button */}
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
