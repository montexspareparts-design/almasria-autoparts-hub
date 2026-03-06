import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, ArrowRight, Upload, CheckCircle, Loader2 } from "lucide-react";
import Navbar from "@/components/Navbar";

const governorates = [
  "القاهرة", "الجيزة", "الإسكندرية", "الدقهلية", "الشرقية", "المنوفية",
  "الغربية", "كفر الشيخ", "البحيرة", "المنيا", "أسيوط", "سوهاج",
  "قنا", "الأقصر", "أسوان", "الفيوم", "بني سويف", "الإسماعيلية",
  "السويس", "بورسعيد", "دمياط", "شمال سيناء", "جنوب سيناء",
  "البحر الأحمر", "الوادي الجديد", "مطروح",
];

const DealerRegister = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1 - Basic
  const [businessName, setBusinessName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [commercialRegNo, setCommercialRegNo] = useState("");
  const [taxCardNo, setTaxCardNo] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState(user?.email || "");
  const [governorate, setGovernorate] = useState("");
  const [address, setAddress] = useState("");

  // Step 2 - Business
  const [clientType, setClientType] = useState<string>("");
  const [yearsInBusiness, setYearsInBusiness] = useState("");
  const [avgMonthly, setAvgMonthly] = useState("");
  const [hasBranches, setHasBranches] = useState(false);
  const [coverageAreas, setCoverageAreas] = useState("");

  // Step 3 - Documents
  const [commercialDoc, setCommercialDoc] = useState<File | null>(null);
  const [taxDoc, setTaxDoc] = useState<File | null>(null);
  const [nationalIdDoc, setNationalIdDoc] = useState<File | null>(null);
  const [additionalDocs, setAdditionalDocs] = useState<File[]>([]);

  // Agreements
  const [agreedPricing, setAgreedPricing] = useState(false);
  const [agreedMarket, setAgreedMarket] = useState(false);
  const [agreedReturn, setAgreedReturn] = useState(false);
  const [agreedTerms, setAgreedTerms] = useState(false);

  // Auth for non-logged in users
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");

  const uploadFile = async (file: File, folder: string): Promise<string | null> => {
    const userId = user?.id || "temp";
    const path = `${userId}/${folder}/${Date.now()}-${file.name}`;
    const { error } = await supabase.storage.from("dealer-documents").upload(path, file);
    if (error) {
      console.error("Upload error:", error);
      return null;
    }
    return path;
  };

  const handleSubmit = async () => {
    if (!agreedPricing || !agreedMarket || !agreedReturn || !agreedTerms) {
      toast({ title: "يرجى الموافقة على جميع السياسات", variant: "destructive" });
      return;
    }

    setLoading(true);

    let currentUser = user;

    // If not logged in, create account first
    if (!currentUser) {
      const { data, error } = await supabase.auth.signUp({
        email: authEmail || email,
        password: authPassword,
        options: { data: { full_name: authName || businessName } },
      });
      if (error || !data.user) {
        toast({ title: "خطأ في إنشاء الحساب", description: error?.message, variant: "destructive" });
        setLoading(false);
        return;
      }
      currentUser = data.user;
    }

    // Upload documents
    const commercialPath = commercialDoc ? await uploadFile(commercialDoc, "commercial") : null;
    const taxPath = taxDoc ? await uploadFile(taxDoc, "tax") : null;
    const nationalIdPath = nationalIdDoc ? await uploadFile(nationalIdDoc, "national-id") : null;
    const additionalPaths: string[] = [];
    for (const doc of additionalDocs) {
      const p = await uploadFile(doc, "additional");
      if (p) additionalPaths.push(p);
    }

    // Submit application
    const { error } = await supabase.from("dealer_applications").insert({
      user_id: currentUser.id,
      business_name: businessName,
      legal_name: legalName,
      commercial_register_no: commercialRegNo,
      tax_card_no: taxCardNo,
      phone,
      email: email || authEmail,
      governorate,
      detailed_address: address,
      client_type: clientType as "wholesale" | "company" | "workshop" | "distributor",
      years_in_business: parseInt(yearsInBusiness) || 0,
      avg_monthly_purchase: avgMonthly,
      has_branches: hasBranches,
      coverage_areas: coverageAreas,
      commercial_register_doc: commercialPath,
      tax_card_doc: taxPath,
      national_id_doc: nationalIdPath,
      additional_docs: additionalPaths.length > 0 ? additionalPaths : null,
      agreed_pricing_policy: agreedPricing,
      agreed_market_protection: agreedMarket,
      agreed_return_policy: agreedReturn,
      agreed_terms: agreedTerms,
    });

    if (error) {
      toast({ title: "خطأ في تقديم الطلب", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم تقديم طلبك بنجاح!", description: "سيتم مراجعة طلبك والرد خلال 48 ساعة" });
      navigate("/dealer");
    }
    setLoading(false);
  };

  const canProceedStep1 = businessName && legalName && commercialRegNo && taxCardNo && phone && (email || authEmail) && governorate && address;
  const canProceedStep2 = clientType && yearsInBusiness;

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="container mx-auto px-4 max-w-2xl">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground text-center mb-2">
            تسجيل <span className="text-gradient-red">تاجر معتمد</span>
          </h1>
          <p className="text-center text-muted-foreground mb-8">أكمل البيانات المطلوبة لفتح حسابك</p>

          {/* Progress */}
          <div className="flex items-center justify-center gap-2 mb-10">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${
                  step >= s ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}>
                  {step > s ? <CheckCircle className="w-5 h-5" /> : s}
                </div>
                {s < 3 && <div className={`w-12 h-0.5 ${step > s ? "bg-primary" : "bg-muted"}`} />}
              </div>
            ))}
          </div>

          <div className="bg-card border border-border rounded-lg p-6 md:p-8">
            {/* Step 1: Basic Info */}
            {step === 1 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-card-foreground mb-4">البيانات الأساسية</h2>

                {!user && (
                  <div className="bg-muted/50 rounded-lg p-4 mb-4 space-y-3">
                    <p className="text-sm font-medium text-foreground">بيانات الحساب</p>
                    <div className="space-y-2">
                      <Label>الاسم الكامل</Label>
                      <Input value={authName} onChange={(e) => setAuthName(e.target.value)} placeholder="اسمك الكامل" />
                    </div>
                    <div className="space-y-2">
                      <Label>البريد الإلكتروني</Label>
                      <Input type="email" value={authEmail} onChange={(e) => { setAuthEmail(e.target.value); setEmail(e.target.value); }} placeholder="example@email.com" dir="ltr" />
                    </div>
                    <div className="space-y-2">
                      <Label>كلمة المرور</Label>
                      <Input type="password" value={authPassword} onChange={(e) => setAuthPassword(e.target.value)} placeholder="6 أحرف على الأقل" dir="ltr" minLength={6} />
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>اسم النشاط التجاري *</Label>
                    <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="مثال: مؤسسة الأمل لقطع الغيار" />
                  </div>
                  <div className="space-y-2">
                    <Label>الاسم القانوني *</Label>
                    <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="كما هو في السجل التجاري" />
                  </div>
                  <div className="space-y-2">
                    <Label>رقم السجل التجاري *</Label>
                    <Input value={commercialRegNo} onChange={(e) => setCommercialRegNo(e.target.value)} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label>رقم البطاقة الضريبية *</Label>
                    <Input value={taxCardNo} onChange={(e) => setTaxCardNo(e.target.value)} dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label>رقم الهاتف *</Label>
                    <Input value={phone} onChange={(e) => setPhone(e.target.value)} dir="ltr" placeholder="01xxxxxxxxx" />
                  </div>
                  <div className="space-y-2">
                    <Label>البريد الإلكتروني *</Label>
                    <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} dir="ltr" disabled={!!user} />
                  </div>
                  <div className="space-y-2">
                    <Label>المحافظة *</Label>
                    <Select value={governorate} onValueChange={setGovernorate}>
                      <SelectTrigger><SelectValue placeholder="اختر المحافظة" /></SelectTrigger>
                      <SelectContent>
                        {governorates.map((g) => (<SelectItem key={g} value={g}>{g}</SelectItem>))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>العنوان التفصيلي *</Label>
                  <Textarea value={address} onChange={(e) => setAddress(e.target.value)} placeholder="الشارع - المنطقة - أقرب علامة مميزة" />
                </div>

                <div className="flex justify-start">
                  <Button onClick={() => setStep(2)} disabled={!canProceedStep1} className="gap-2">
                    التالي <ArrowLeft className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Business Details */}
            {step === 2 && (
              <div className="space-y-4">
                <h2 className="text-lg font-bold text-card-foreground mb-4">بيانات النشاط</h2>

                <div className="space-y-2">
                  <Label>نوع العميل *</Label>
                  <Select value={clientType} onValueChange={setClientType}>
                    <SelectTrigger><SelectValue placeholder="اختر نوع النشاط" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="wholesale">تاجر جملة</SelectItem>
                      <SelectItem value="company">شركة / هيئة</SelectItem>
                      <SelectItem value="workshop">ورشة / مركز صيانة</SelectItem>
                      <SelectItem value="distributor">موزع</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>عدد سنوات النشاط *</Label>
                    <Input type="number" value={yearsInBusiness} onChange={(e) => setYearsInBusiness(e.target.value)} min="0" />
                  </div>
                  <div className="space-y-2">
                    <Label>متوسط حجم الشراء الشهري</Label>
                    <Select value={avgMonthly} onValueChange={setAvgMonthly}>
                      <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="less_10k">أقل من 10,000 ج.م</SelectItem>
                        <SelectItem value="10k_50k">10,000 - 50,000 ج.م</SelectItem>
                        <SelectItem value="50k_100k">50,000 - 100,000 ج.م</SelectItem>
                        <SelectItem value="100k_500k">100,000 - 500,000 ج.م</SelectItem>
                        <SelectItem value="more_500k">أكثر من 500,000 ج.م</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Checkbox id="branches" checked={hasBranches} onCheckedChange={(c) => setHasBranches(!!c)} />
                  <Label htmlFor="branches">لدي فروع أخرى</Label>
                </div>

                <div className="space-y-2">
                  <Label>المناطق التي تغطيها</Label>
                  <Textarea value={coverageAreas} onChange={(e) => setCoverageAreas(e.target.value)} placeholder="مثال: القاهرة الكبرى - الدلتا" />
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(1)} className="gap-2">
                    <ArrowRight className="w-4 h-4" /> السابق
                  </Button>
                  <Button onClick={() => setStep(3)} disabled={!canProceedStep2} className="gap-2">
                    التالي <ArrowLeft className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Documents & Agreements */}
            {step === 3 && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-card-foreground mb-4">رفع المستندات والموافقات</h2>

                {/* File uploads */}
                <div className="space-y-4">
                  {[
                    { label: "صورة السجل التجاري *", file: commercialDoc, setFile: setCommercialDoc },
                    { label: "صورة البطاقة الضريبية *", file: taxDoc, setFile: setTaxDoc },
                    { label: "صورة بطاقة الرقم القومي *", file: nationalIdDoc, setFile: setNationalIdDoc },
                  ].map((item) => (
                    <div key={item.label} className="space-y-2">
                      <Label>{item.label}</Label>
                      <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                        {item.file ? (
                          <div className="flex items-center justify-center gap-2 text-sm text-primary">
                            <CheckCircle className="w-4 h-4" />
                            {item.file.name}
                            <button onClick={() => item.setFile(null)} className="text-destructive text-xs hover:underline mr-2">حذف</button>
                          </div>
                        ) : (
                          <label className="cursor-pointer">
                            <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                            <span className="text-sm text-muted-foreground">اضغط لرفع الملف</span>
                            <input type="file" className="hidden" accept="image/*,.pdf" onChange={(e) => item.setFile(e.target.files?.[0] || null)} />
                          </label>
                        )}
                      </div>
                    </div>
                  ))}

                  <div className="space-y-2">
                    <Label>مستندات إضافية (اختياري)</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                      <label className="cursor-pointer">
                        <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                        <span className="text-sm text-muted-foreground">اضغط لرفع ملفات إضافية</span>
                        <input type="file" className="hidden" accept="image/*,.pdf" multiple onChange={(e) => setAdditionalDocs(Array.from(e.target.files || []))} />
                      </label>
                      {additionalDocs.length > 0 && (
                        <p className="text-sm text-primary mt-2">{additionalDocs.length} ملف مرفق</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Agreements */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-3">
                  <h3 className="font-bold text-foreground">الموافقة على السياسات</h3>
                  {[
                    { id: "pricing", label: "أوافق على سياسة التسعير الخاصة بالمصرية جروب", checked: agreedPricing, set: setAgreedPricing },
                    { id: "market", label: "أوافق على سياسة عدم كسر السوق والالتزام بالأسعار المحددة", checked: agreedMarket, set: setAgreedMarket },
                    { id: "return", label: "أوافق على سياسة الاسترجاع والاستبدال", checked: agreedReturn, set: setAgreedReturn },
                    { id: "terms", label: "أوافق على شروط استخدام المنصة", checked: agreedTerms, set: setAgreedTerms },
                  ].map((a) => (
                    <div key={a.id} className="flex items-start gap-2">
                      <Checkbox id={a.id} checked={a.checked} onCheckedChange={(c) => a.set(!!c)} className="mt-1" />
                      <Label htmlFor={a.id} className="text-sm text-foreground/80">{a.label}</Label>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between">
                  <Button variant="outline" onClick={() => setStep(2)} className="gap-2">
                    <ArrowRight className="w-4 h-4" /> السابق
                  </Button>
                  <Button
                    onClick={handleSubmit}
                    disabled={loading || !agreedPricing || !agreedMarket || !agreedReturn || !agreedTerms}
                    className="gap-2 red-glow"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    {loading ? "جاري الإرسال..." : "تقديم الطلب"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DealerRegister;
