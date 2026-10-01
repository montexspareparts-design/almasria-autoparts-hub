import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import {
  CheckCircle2, Clock, Copy, Droplets, FileText, KeyRound, Loader2, MessageCircle, Phone,
  RefreshCw, Search, UserPlus, Users, XCircle,
} from "lucide-react";
import type { Database } from "@/integrations/supabase/types";

type App = Database["public"]["Tables"]["dealer_applications"]["Row"];
type Tier = Database["public"]["Enums"]["customer_tier"];

const APP_LINK = "https://play.google.com/store/apps/details?id=com.almasria.oils";
const WEB_LINK = "https://almasriaautoparts.com/oils";

const TIERS: { value: Tier; label: string }[] = [
  { value: "wholesale_tier1", label: "جملة 1" },
  { value: "wholesale_tier2", label: "جملة 2" },
  { value: "corporate", label: "شركات" },
  { value: "retail", label: "قطاعي" },
];
const TYPE_LABEL: Record<string, string> = {
  workshop: "مركز تغيير زيوت", wholesale: "تاجر جملة", distributor: "موزّع", company: "شركة / أسطول",
};
const STATUS: Record<string, { label: string; cls: string }> = {
  pending: { label: "قيد المراجعة", cls: "bg-amber-500/15 text-amber-700" },
  approved: { label: "معتمد", cls: "bg-emerald-500/15 text-emerald-700" },
  rejected: { label: "مرفوض", cls: "bg-destructive/15 text-destructive" },
  suspended: { label: "موقوف", cls: "bg-muted text-muted-foreground" },
};

const waOpen = (phone: string, text: string) => {
  const d = (phone || "").replace(/\D/g, "");
  const intl = d.startsWith("0") ? `20${d.slice(1)}` : d.startsWith("20") ? d : `20${d}`;
  window.open(`https://wa.me/${intl}?text=${encodeURIComponent(text)}`, "_blank");
};

const DocThumb = ({ path }: { path: string }) => {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    supabase.storage.from("dealer-documents").createSignedUrl(path, 3600).then(({ data }) => setUrl(data?.signedUrl ?? null));
  }, [path]);
  const pdf = path.endsWith(".pdf");
  const label = path.includes("shop_card") ? "كارت المحل" : path.includes("tax_card") ? "بطاقة ضريبية"
    : path.includes("commercial_register") ? "سجل تجاري" : path.includes("invoice") ? "فاتورة" : "مستند";
  return (
    <a href={url ?? "#"} target="_blank" rel="noreferrer" className="block w-24 shrink-0">
      <div className="h-20 w-24 rounded-lg border bg-muted overflow-hidden grid place-items-center">
        {!url ? <Loader2 className="w-4 h-4 animate-spin" /> : pdf ? <FileText className="w-6 h-6 text-primary" /> : <img src={url} alt={label} className="h-full w-full object-cover" />}
      </div>
      <p className="text-[10px] text-center mt-1 text-muted-foreground">{label}</p>
    </a>
  );
};

const docsOf = (a: App) => [a.commercial_register_doc, a.tax_card_doc, a.national_id_doc, ...(a.additional_docs ?? [])].filter(Boolean) as string[];

const OilsPartnersCenter = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [apps, setApps] = useState<App[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("pending");
  const [sourceFilter, setSourceFilter] = useState("oils_app");
  const [q, setQ] = useState("");
  const [accQ, setAccQ] = useState("");

  const [reviewing, setReviewing] = useState<{ app: App; mode: "approve" | "reject" } | null>(null);
  const [tier, setTier] = useState<Tier>("wholesale_tier1");
  const [erpCode, setErpCode] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);

  const [nf, setNf] = useState({ name: "", phone: "", shop_name: "", erp_customer_code: "", client_type: "workshop" });
  const [creds, setCreds] = useState<{ name: string; phone: string; password: string } | null>(null);

  const load = async () => {
    setLoading(true);
    const [a, d] = await Promise.all([
      supabase.from("dealer_applications").select("*").order("created_at", { ascending: false }).limit(500),
      supabase.from("dealer_accounts").select("id,user_id,tier,is_active,erp_customer_code,erp_customer_name,business_type,created_at").order("created_at", { ascending: false }).limit(1000),
    ]);
    const accs = d.data ?? [];
    const ids = accs.map((x) => x.user_id);
    const profs: Record<string, any> = {};
    for (let i = 0; i < ids.length; i += 200) {
      const { data } = await supabase.from("profiles").select("user_id,full_name,phone,email").in("user_id", ids.slice(i, i + 200));
      (data ?? []).forEach((p) => { profs[p.user_id] = p; });
    }
    setApps(a.data ?? []);
    setAccounts(accs.map((x) => ({ ...x, profile: profs[x.user_id] })));
    setLoading(false);
  };
  useEffect(() => { void load(); }, []);

  const filtered = useMemo(() => apps.filter((a) =>
    (statusFilter === "all" || a.status === statusFilter) &&
    (sourceFilter === "all" || (a as any).source === sourceFilter) &&
    (!q || [a.business_name, a.phone, a.email, a.governorate].some((v) => v?.toLowerCase().includes(q.toLowerCase())))
  ), [apps, statusFilter, sourceFilter, q]);

  const filteredAcc = useMemo(() => accounts.filter((a) => !accQ ||
    [a.profile?.full_name, a.profile?.phone, a.erp_customer_code, a.erp_customer_name].some((v: string) => v?.toLowerCase?.().includes(accQ.toLowerCase()))
  ), [accounts, accQ]);

  const oilsApps = apps.filter((a) => (a as any).source === "oils_app");
  const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
  const kpis = [
    { label: "طلبات تطبيق الزيوت المعلّقة", value: oilsApps.filter((a) => a.status === "pending").length, icon: Clock },
    { label: "طلبات بدون مستندات", value: apps.filter((a) => a.status === "pending" && docsOf(a).length === 0).length, icon: FileText },
    { label: "اعتمادات الشهر", value: apps.filter((a) => a.status === "approved" && a.reviewed_at && new Date(a.reviewed_at) >= monthStart).length, icon: CheckCircle2 },
    { label: "حسابات تجار نشطة", value: accounts.filter((a) => a.is_active).length, icon: Users },
  ];

  const submitReview = async () => {
    if (!reviewing) return;
    const { app, mode } = reviewing;
    if (mode === "reject" && !notes.trim()) { toast({ title: "اكتب سبب الرفض", variant: "destructive" }); return; }
    setBusy(true);
    try {
      const { error } = await supabase.from("dealer_applications").update({
        status: mode === "approve" ? "approved" : "rejected",
        assigned_tier: mode === "approve" ? tier : null,
        reviewed_by: user!.id, review_notes: notes || null, reviewed_at: new Date().toISOString(),
      }).eq("id", app.id);
      if (error) throw error;
      if (mode === "approve") {
        const { data: existing } = await supabase.from("dealer_accounts").select("id").eq("user_id", app.user_id).maybeSingle();
        const payload: any = {
          tier, is_active: true, application_id: app.id,
          business_type: app.client_type === "company" ? "corporate" : app.client_type === "distributor" ? "wholesale" : app.client_type,
          ...(erpCode.trim() ? { erp_customer_code: erpCode.trim(), erp_customer_name: app.business_name } : {}),
        };
        const res = existing
          ? await supabase.from("dealer_accounts").update(payload).eq("id", existing.id)
          : await supabase.from("dealer_accounts").insert({ user_id: app.user_id, ...payload });
        if (res.error) throw res.error;
        await supabase.functions.invoke("send-dealer-notification", {
          body: { dealerUserId: app.user_id, dealerEmail: app.email, status: "approved", businessName: app.business_name, reviewNotes: notes },
        }).catch(() => {});
        waOpen(app.phone, `أهلاً ${app.business_name} 👋\nتم اعتماد حسابك في تطبيق *المصرية زيوت جملة* ✅\nادخل بنفس البريد (${app.email}) وكلمة المرور اللي سجّلت بيها وشوف أسعار الجملة.\nتحميل التطبيق: ${APP_LINK}\nأو من الموقع: ${WEB_LINK}`);
      } else {
        waOpen(app.phone, `أهلاً ${app.business_name}، شكراً لاهتمامك بتطبيق المصرية زيوت جملة.\nللأسف مقدرناش نعتمد الطلب حالياً: ${notes}\nلو عندك أي استفسار ابعتلنا هنا.`);
      }
      toast({ title: mode === "approve" ? "تم اعتماد التاجر ✅" : "تم رفض الطلب" });
      setReviewing(null);
      void load();
    } catch (e: any) {
      toast({ title: "حصل خطأ", description: e.message, variant: "destructive" });
    } finally { setBusy(false); }
  };

  const createAccount = async () => {
    const phone = nf.phone.replace(/\D/g, "");
    if (nf.name.trim().length < 2 || !/^01\d{9}$/.test(phone) || !nf.erp_customer_code.trim()) {
      toast({ title: "اكمل الاسم ورقم موبايل صحيح وكود الفيصل", variant: "destructive" }); return;
    }
    setBusy(true);
    const { data, error } = await supabase.functions.invoke("create-client-account", {
      body: { ...nf, phone, erp_customer_code: nf.erp_customer_code.trim() },
    });
    setBusy(false);
    const err = (data as any)?.error || (error ? "تعذّر إنشاء الحساب — ممكن يكون الرقم أو الكود مسجّل قبل كده" : null);
    if (err) { toast({ title: err, variant: "destructive" }); return; }
    setCreds({ name: nf.name, phone, password: (data as any).password });
    setNf({ name: "", phone: "", shop_name: "", erp_customer_code: "", client_type: "workshop" });
    void load();
  };

  const credsMsg = (c: { name: string; phone: string; password: string }) =>
    `أهلاً ${c.name} 👋\nعملنالك حساب في تطبيق *المصرية زيوت جملة* علشان تطلب بأسعار الجملة مباشرة.\n📱 رقم الدخول: ${c.phone}\n🔑 كلمة المرور: ${c.password}\nتحميل التطبيق: ${APP_LINK}\nأو من الموقع: ${WEB_LINK}`;

  const resetPassword = async (acc: any) => {
    const email = acc.profile?.email || (acc.profile?.phone ? `${acc.profile.phone}@phone.almasria.local` : null);
    if (!email) { toast({ title: "مفيش بريد أو موبايل للحساب", variant: "destructive" }); return; }
    const pw = Math.random().toString(36).slice(2, 10);
    const { data, error } = await supabase.functions.invoke("create-client-account", {
      body: { action: "reset_password", email, new_password: pw, erp_customer_code: acc.erp_customer_code || undefined },
    });
    if (error || (data as any)?.error) { toast({ title: (data as any)?.error || "تعذّر تغيير كلمة المرور", variant: "destructive" }); return; }
    setCreds({ name: acc.profile?.full_name || acc.erp_customer_name || "", phone: acc.profile?.phone || email, password: pw });
  };

  const toggleActive = async (acc: any) => {
    const { error } = await supabase.from("dealer_accounts").update({ is_active: !acc.is_active }).eq("id", acc.id);
    if (error) { toast({ title: error.message, variant: "destructive" }); return; }
    setAccounts((all) => all.map((x) => x.id === acc.id ? { ...x, is_active: !acc.is_active } : x));
  };

  return (
    <div className="space-y-5" dir="rtl">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Droplets className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-bold">شركاء تطبيق الزيوت</h1>
            <p className="text-xs text-muted-foreground">طلبات الانضمام، إنشاء حسابات لعملاء الواتساب، وإدارة حسابات التجار</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={`w-4 h-4 ml-1 ${loading ? "animate-spin" : ""}`} /> تحديث
        </Button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card key={k.label} className="p-4">
            <k.icon className="w-5 h-5 text-primary mb-2" />
            <p className="text-2xl font-bold">{k.value}</p>
            <p className="text-xs text-muted-foreground">{k.label}</p>
          </Card>
        ))}
      </div>

      <Tabs defaultValue="requests">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="requests">طلبات الانضمام</TabsTrigger>
          <TabsTrigger value="create">إنشاء حساب لعميل حالي</TabsTrigger>
          <TabsTrigger value="accounts">حسابات التجار</TabsTrigger>
        </TabsList>

        <TabsContent value="requests" className="space-y-3 mt-4">
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="بحث بالاسم أو الموبايل أو المحافظة" className="pr-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">قيد المراجعة</SelectItem>
                <SelectItem value="approved">معتمد</SelectItem>
                <SelectItem value="rejected">مرفوض</SelectItem>
                <SelectItem value="all">الكل</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sourceFilter} onValueChange={setSourceFilter}>
              <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="oils_app">تطبيق الزيوت</SelectItem>
                <SelectItem value="website">الموقع</SelectItem>
                <SelectItem value="all">كل المصادر</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? <div className="py-12 grid place-items-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
            : filtered.length === 0 ? <Card className="p-10 text-center text-sm text-muted-foreground">مفيش طلبات هنا</Card>
            : filtered.map((a) => {
              const docs = docsOf(a);
              const st = STATUS[a.status] ?? STATUS.pending;
              return (
                <Card key={a.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold">{a.business_name}</h3>
                        <span className={`text-[11px] px-2 py-0.5 rounded-full ${st.cls}`}>{st.label}</span>
                        <Badge variant="outline" className="text-[10px]">{TYPE_LABEL[a.client_type] ?? a.client_type}</Badge>
                        {(a as any).source === "oils_app" && <Badge className="text-[10px]">تطبيق الزيوت</Badge>}
                        {docs.length === 0 && <Badge variant="destructive" className="text-[10px]">بدون مستندات</Badge>}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {a.governorate} — {a.detailed_address} · {new Date(a.created_at).toLocaleString("ar-EG")}
                      </p>
                      <p className="text-xs mt-1" dir="ltr">{a.phone} · {a.email}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        خبرة: {a.years_in_business} سنة · مشتريات شهرية: {a.avg_monthly_purchase || "—"} · سجل: {a.commercial_register_no} · ضريبية: {a.tax_card_no}
                      </p>
                      {a.review_notes && <p className="text-xs mt-1">ملاحظة: {a.review_notes}</p>}
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <Button size="sm" variant="outline" onClick={() => window.open(`tel:${a.phone}`)}><Phone className="w-4 h-4" /></Button>
                      <Button size="sm" variant="outline" onClick={() => waOpen(a.phone, `أهلاً ${a.business_name} 👋 معاك فريق المصرية زيوت جملة بخصوص طلب الانضمام.`)}>
                        <MessageCircle className="w-4 h-4 ml-1" /> واتساب
                      </Button>
                      {a.status === "pending" && <>
                        <Button size="sm" onClick={() => { setReviewing({ app: a, mode: "approve" }); setTier(a.client_type === "company" ? "corporate" : "wholesale_tier1"); setErpCode(""); setNotes(""); }}>
                          <CheckCircle2 className="w-4 h-4 ml-1" /> اعتماد
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => { setReviewing({ app: a, mode: "reject" }); setNotes(""); }}>
                          <XCircle className="w-4 h-4 ml-1" /> رفض
                        </Button>
                      </>}
                    </div>
                  </div>
                  {docs.length > 0 && <div className="flex gap-2 overflow-x-auto pb-1">{docs.map((p) => <DocThumb key={p} path={p} />)}</div>}
                </Card>
              );
            })}
        </TabsContent>

        <TabsContent value="create" className="mt-4">
          <Card className="p-5 max-w-xl space-y-3">
            <div>
              <h3 className="font-bold flex items-center gap-2"><UserPlus className="w-4 h-4" /> حساب لعميل بيتعامل معانا على الواتساب</h3>
              <p className="text-xs text-muted-foreground mt-1">الحساب بيتفعّل فوراً، والعميل بيدخل برقم الموبايل وكلمة مرور بتتولد تلقائياً. بعدها ابعتله البيانات على الواتساب بضغطة.</p>
            </div>
            <Input placeholder="اسم العميل" value={nf.name} onChange={(e) => setNf({ ...nf, name: e.target.value })} />
            <Input placeholder="رقم الموبايل 01XXXXXXXXX" dir="ltr" inputMode="tel" value={nf.phone} onChange={(e) => setNf({ ...nf, phone: e.target.value.replace(/\D/g, "").slice(0, 11) })} />
            <Input placeholder="اسم المحل / النشاط" value={nf.shop_name} onChange={(e) => setNf({ ...nf, shop_name: e.target.value })} />
            <Input placeholder="كود العميل في الفيصل" value={nf.erp_customer_code} onChange={(e) => setNf({ ...nf, erp_customer_code: e.target.value })} />
            <Select value={nf.client_type} onValueChange={(v) => setNf({ ...nf, client_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="workshop">مركز تغيير زيوت (جملة)</SelectItem>
                <SelectItem value="wholesale">تاجر جملة</SelectItem>
                <SelectItem value="corporate">شركة / أسطول</SelectItem>
                <SelectItem value="retail">قطاعي</SelectItem>
              </SelectContent>
            </Select>
            <Button className="w-full" onClick={() => void createAccount()} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4 ml-1" />} إنشاء الحساب
            </Button>
          </Card>
        </TabsContent>

        <TabsContent value="accounts" className="mt-4 space-y-3">
          <div className="relative max-w-md">
            <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={accQ} onChange={(e) => setAccQ(e.target.value)} placeholder="بحث بالاسم أو الموبايل أو كود الفيصل" className="pr-9" />
          </div>
          <Card className="divide-y">
            {filteredAcc.slice(0, 200).map((acc) => (
              <div key={acc.id} className="p-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <p className="font-semibold text-sm truncate">{acc.profile?.full_name || acc.erp_customer_name || "—"}</p>
                  <p className="text-xs text-muted-foreground" dir="ltr">{acc.profile?.phone || acc.profile?.email || "—"}</p>
                  <div className="flex gap-1 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-[10px]">{TIERS.find((t) => t.value === acc.tier)?.label ?? acc.tier}</Badge>
                    {acc.erp_customer_code ? <Badge variant="secondary" className="text-[10px]">فيصل {acc.erp_customer_code}</Badge>
                      : <Badge variant="destructive" className="text-[10px]">بدون كود فيصل</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {acc.profile?.phone && <Button size="sm" variant="outline" onClick={() => waOpen(acc.profile.phone, `أهلاً ${acc.profile.full_name || ""} 👋 حمّل تطبيق المصرية زيوت جملة واطلب بأسعار الجملة: ${APP_LINK}`)}><MessageCircle className="w-4 h-4" /></Button>}
                  <Button size="sm" variant="outline" onClick={() => void resetPassword(acc)}><KeyRound className="w-4 h-4 ml-1" /> كلمة مرور جديدة</Button>
                  <div className="flex items-center gap-1 text-xs"><Switch checked={acc.is_active} onCheckedChange={() => void toggleActive(acc)} /> {acc.is_active ? "نشط" : "موقوف"}</div>
                </div>
              </div>
            ))}
            {filteredAcc.length === 0 && <p className="p-8 text-center text-sm text-muted-foreground">مفيش حسابات</p>}
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!reviewing} onOpenChange={(o) => !o && setReviewing(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>{reviewing?.mode === "approve" ? "اعتماد" : "رفض"} — {reviewing?.app.business_name}</DialogTitle></DialogHeader>
          {reviewing?.mode === "approve" && <div className="space-y-3">
            <Select value={tier} onValueChange={(v) => setTier(v as Tier)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TIERS.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
            <Input placeholder="كود العميل في الفيصل (اختياري لو عميل جديد)" value={erpCode} onChange={(e) => setErpCode(e.target.value)} />
          </div>}
          <Textarea placeholder={reviewing?.mode === "reject" ? "سبب الرفض (هيتبعت للعميل)" : "ملاحظات (اختياري)"} value={notes} onChange={(e) => setNotes(e.target.value)} />
          <p className="text-[11px] text-muted-foreground">بعد الحفظ هيتفتح واتساب برسالة جاهزة للعميل.</p>
          <DialogFooter>
            <Button onClick={() => void submitReview()} disabled={busy} variant={reviewing?.mode === "reject" ? "destructive" : "default"}>
              {busy && <Loader2 className="w-4 h-4 animate-spin ml-1" />} تأكيد
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!creds} onOpenChange={(o) => !o && setCreds(null)}>
        <DialogContent dir="rtl">
          <DialogHeader><DialogTitle>بيانات دخول العميل</DialogTitle></DialogHeader>
          {creds && <div className="space-y-2 text-sm">
            <p>الاسم: <b>{creds.name}</b></p>
            <p>رقم الدخول: <b dir="ltr">{creds.phone}</b></p>
            <p>كلمة المرور: <b dir="ltr">{creds.password}</b></p>
          </div>}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { void navigator.clipboard.writeText(credsMsg(creds!)); toast({ title: "اتنسخت ✅" }); }}><Copy className="w-4 h-4 ml-1" /> نسخ</Button>
            <Button onClick={() => waOpen(creds!.phone, credsMsg(creds!))}><MessageCircle className="w-4 h-4 ml-1" /> إرسال على واتساب</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default OilsPartnersCenter;
