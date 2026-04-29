import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Plus, Trash2, GripVertical, Eye, EyeOff, Save, Loader2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface Section {
  id: string;
  key: string;
  title_ar: string;
  description_ar: string | null;
  sort_order: number;
  is_active: boolean;
  is_auto: boolean;
}

interface Field {
  id: string;
  section_id: string;
  field_key: string;
  label_ar: string;
  field_type: "number" | "text" | "textarea" | "select";
  options: { value: string; label: string }[];
  placeholder: string | null;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  is_auto: boolean;
}

/**
 * Admin-only editor for the reporter (Al-Faisal staff) daily report layout.
 * Allows adding/removing/reordering/toggling sections and their fields.
 * Lives at /admin/reporter-sections-editor — guarded by isAdmin in App.tsx.
 */
export default function ReporterSectionsEditor() {
  const navigate = useNavigate();
  const { isAdmin, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [sections, setSections] = useState<Section[]>([]);
  const [fieldsBySection, setFieldsBySection] = useState<Record<string, Field[]>>({});

  useEffect(() => {
    if (authLoading) return;
    if (!isAdmin) {
      navigate("/admin", { replace: true });
      return;
    }
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAdmin]);

  const load = async () => {
    setLoading(true);
    try {
      const [{ data: secs }, { data: flds }] = await Promise.all([
        supabase.from("reporter_report_sections").select("*").order("sort_order"),
        supabase.from("reporter_report_fields").select("*").order("sort_order"),
      ]);
      const sList = (secs as any as Section[]) || [];
      setSections(sList);
      const grouped: Record<string, Field[]> = {};
      for (const s of sList) grouped[s.id] = [];
      for (const f of (flds as any as Field[]) || []) {
        if (!grouped[f.section_id]) grouped[f.section_id] = [];
        grouped[f.section_id].push({ ...f, options: Array.isArray(f.options) ? f.options : [] });
      }
      setFieldsBySection(grouped);
    } finally {
      setLoading(false);
    }
  };

  // ---- Section ops ----
  const addSection = async () => {
    const nextOrder = (sections.at(-1)?.sort_order ?? 0) + 1;
    const key = `section_${Date.now()}`;
    const { error } = await supabase.from("reporter_report_sections").insert({
      key, title_ar: "قسم جديد", sort_order: nextOrder, is_active: true,
    } as any);
    if (error) return toast({ title: "خطأ", description: error.message, variant: "destructive" });
    await load();
  };

  const updateSection = async (id: string, patch: Partial<Section>) => {
    const { error } = await supabase.from("reporter_report_sections").update(patch as any).eq("id", id);
    if (error) return toast({ title: "خطأ", description: error.message, variant: "destructive" });
    setSections((s) => s.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  };

  const deleteSection = async (id: string) => {
    const { error } = await supabase.from("reporter_report_sections").delete().eq("id", id);
    if (error) return toast({ title: "خطأ", description: error.message, variant: "destructive" });
    toast({ title: "تم الحذف" });
    await load();
  };

  const moveSection = async (id: string, dir: -1 | 1) => {
    const idx = sections.findIndex((s) => s.id === id);
    const swap = sections[idx + dir];
    if (!swap) return;
    const a = sections[idx], b = swap;
    await Promise.all([
      supabase.from("reporter_report_sections").update({ sort_order: b.sort_order } as any).eq("id", a.id),
      supabase.from("reporter_report_sections").update({ sort_order: a.sort_order } as any).eq("id", b.id),
    ]);
    await load();
  };

  // ---- Field ops ----
  const addField = async (sectionId: string) => {
    const list = fieldsBySection[sectionId] || [];
    const nextOrder = (list.at(-1)?.sort_order ?? 0) + 1;
    const fkey = `field_${Date.now()}`;
    const { error } = await supabase.from("reporter_report_fields").insert({
      section_id: sectionId, field_key: fkey, label_ar: "حقل جديد",
      field_type: "number", sort_order: nextOrder, is_active: true,
    } as any);
    if (error) return toast({ title: "خطأ", description: error.message, variant: "destructive" });
    await load();
  };

  const updateField = async (id: string, patch: Partial<Field>) => {
    const { error } = await supabase.from("reporter_report_fields").update(patch as any).eq("id", id);
    if (error) return toast({ title: "خطأ", description: error.message, variant: "destructive" });
    setFieldsBySection((m) => {
      const next = { ...m };
      for (const k of Object.keys(next)) {
        next[k] = next[k].map((f) => (f.id === id ? { ...f, ...patch } as Field : f));
      }
      return next;
    });
  };

  const deleteField = async (id: string) => {
    const { error } = await supabase.from("reporter_report_fields").delete().eq("id", id);
    if (error) return toast({ title: "خطأ", description: error.message, variant: "destructive" });
    await load();
  };

  if (loading || authLoading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <header className="sticky top-0 z-30 bg-card/95 backdrop-blur-md border-b">
        <div className="max-w-5xl mx-auto px-3 sm:px-6 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 grid place-items-center shadow-sm">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm sm:text-base font-bold leading-tight">محرّر أقسام تقرير موظف الفيصل</h1>
              <p className="text-[10px] sm:text-xs text-muted-foreground">أضف/احذف/أعد ترتيب الأقسام والحقول</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.open("/admin/daily-report?edit=1", "_blank")} className="gap-1.5">
              <Eye className="w-4 h-4" /> معاينة
            </Button>
            <Button variant="outline" size="sm" onClick={() => navigate("/admin")} className="gap-1.5">
              <ArrowRight className="w-4 h-4" /> رجوع
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 space-y-4">
        {sections.map((s, i) => {
          const fields = fieldsBySection[s.id] || [];
          return (
            <Card key={s.id} className={`p-4 sm:p-5 ${s.is_active ? "" : "opacity-60"}`}>
              <div className="flex items-start gap-3 mb-3 flex-wrap">
                <div className="flex flex-col gap-0.5">
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveSection(s.id, -1)} disabled={i === 0}>
                    <GripVertical className="w-3.5 h-3.5 rotate-90" />↑
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => moveSection(s.id, 1)} disabled={i === sections.length - 1}>
                    ↓
                  </Button>
                </div>
                <div className="flex-1 min-w-[180px] space-y-1.5">
                  <Input
                    value={s.title_ar}
                    onChange={(e) => setSections((arr) => arr.map((x) => x.id === s.id ? { ...x, title_ar: e.target.value } : x))}
                    onBlur={(e) => updateSection(s.id, { title_ar: e.target.value })}
                    className="h-9 font-bold"
                    placeholder="اسم القسم"
                  />
                  <Input
                    value={s.description_ar || ""}
                    onChange={(e) => setSections((arr) => arr.map((x) => x.id === s.id ? { ...x, description_ar: e.target.value } : x))}
                    onBlur={(e) => updateSection(s.id, { description_ar: e.target.value })}
                    className="h-8 text-xs"
                    placeholder="وصف اختياري"
                  />
                </div>
                <div className="flex items-center gap-3">
                  {s.is_auto && <Badge variant="outline" className="text-[10px]">تلقائي</Badge>}
                  <div className="flex items-center gap-1.5">
                    <Switch checked={s.is_active} onCheckedChange={(v) => updateSection(s.id, { is_active: v })} />
                    {s.is_active ? <Eye className="w-4 h-4 text-emerald-600" /> : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent dir="rtl">
                      <AlertDialogHeader>
                        <AlertDialogTitle>حذف القسم؟</AlertDialogTitle>
                        <AlertDialogDescription>سيتم حذف القسم وكل حقوله. لا يمكن التراجع.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteSection(s.id)}>حذف</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>

              {/* Fields */}
              <div className="space-y-2 pl-6 border-r-2 border-primary/20 pr-3">
                {fields.map((f) => (
                  <div key={f.id} className={`flex items-center gap-2 flex-wrap p-2 rounded-lg border ${f.is_active ? "bg-muted/30" : "bg-muted/10 opacity-60"}`}>
                    <Input
                      value={f.label_ar}
                      onChange={(e) => setFieldsBySection((m) => ({ ...m, [s.id]: m[s.id].map((x) => x.id === f.id ? { ...x, label_ar: e.target.value } : x) }))}
                      onBlur={(e) => updateField(f.id, { label_ar: e.target.value })}
                      className="h-8 flex-1 min-w-[150px] text-sm"
                      placeholder="اسم الحقل"
                    />
                    <Select
                      value={f.field_type}
                      onValueChange={(v) => updateField(f.id, { field_type: v as Field["field_type"] })}
                    >
                      <SelectTrigger className="h-8 w-[110px] text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="number">رقم</SelectItem>
                        <SelectItem value="text">نص قصير</SelectItem>
                        <SelectItem value="textarea">نص طويل</SelectItem>
                        <SelectItem value="select">قائمة</SelectItem>
                      </SelectContent>
                    </Select>
                    {f.is_auto && <Badge variant="outline" className="text-[10px]">Auto</Badge>}
                    <div className="flex items-center gap-1.5">
                      <Label className="text-[10px] text-muted-foreground">إجباري</Label>
                      <Switch checked={f.is_required} onCheckedChange={(v) => updateField(f.id, { is_required: v })} />
                    </div>
                    <Switch checked={f.is_active} onCheckedChange={(v) => updateField(f.id, { is_active: v })} />
                    <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={() => deleteField(f.id)}>
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                ))}
                <Button size="sm" variant="outline" onClick={() => addField(s.id)} className="gap-1.5 mt-2">
                  <Plus className="w-3.5 h-3.5" /> إضافة حقل
                </Button>
              </div>
            </Card>
          );
        })}

        <Button onClick={addSection} size="lg" className="w-full gap-2 bg-gradient-to-r from-amber-500 to-orange-500 text-white">
          <Plus className="w-5 h-5" /> إضافة قسم جديد
        </Button>

        <div className="text-center text-xs text-muted-foreground pt-4">
          <Save className="w-3.5 h-3.5 inline ml-1" />
          التغييرات تُحفظ تلقائياً عند الكتابة أو التبديل
        </div>
      </main>
    </div>
  );
}
