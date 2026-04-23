import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { defaultTranslations } from "@/contexts/translations";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Languages, Save, Search, RotateCcw, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface TranslationRow {
  key: string;
  value_ar: string;
  value_en: string;
  category: string;
  isModified?: boolean;
  isNew?: boolean;
}

const getCategoryFromKey = (key: string): string => {
  return key.split(".")[0] || "general";
};

const CATEGORY_LABELS: Record<string, string> = {
  nav: "شريط التنقل",
  hero: "البانر الرئيسي",
  about: "نبذة قصيرة",
  aboutpage: "صفحة من نحن",
  contact: "صفحة التواصل",
  footer: "التذييل",
  brands: "الماركات",
  products: "صفحة المنتجات",
  catalogs: "الكتالوجات",
  policies: "السياسات",
  install: "صفحة التطبيق",
  common: "نصوص مشتركة",
  lang: "تبديل اللغة",
  general: "عام",
};

export const AdminTranslations = () => {
  const { toast } = useToast();
  const { refreshTranslations } = useLanguage();
  const [rows, setRows] = useState<TranslationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState<string>("nav");

  const loadData = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("ui_translations")
      .select("key, value_ar, value_en, category");

    const dbMap = new Map<string, TranslationRow>();
    (data || []).forEach((r) => {
      dbMap.set(r.key, {
        key: r.key,
        value_ar: r.value_ar || "",
        value_en: r.value_en || "",
        category: r.category || getCategoryFromKey(r.key),
      });
    });

    // Merge defaults: any default key not in DB shows the default value
    const allKeys = new Set<string>([
      ...Object.keys(defaultTranslations.ar),
      ...dbMap.keys(),
    ]);

    const merged: TranslationRow[] = [];
    allKeys.forEach((key) => {
      const dbRow = dbMap.get(key);
      if (dbRow) {
        merged.push(dbRow);
      } else {
        merged.push({
          key,
          value_ar: defaultTranslations.ar[key] || "",
          value_en: defaultTranslations.en[key] || "",
          category: getCategoryFromKey(key),
          isNew: true,
        });
      }
    });

    merged.sort((a, b) => a.key.localeCompare(b.key));
    setRows(merged);
    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const categories = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(r.category));
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (r.category !== activeCategory) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        r.key.toLowerCase().includes(q) ||
        r.value_ar.toLowerCase().includes(q) ||
        r.value_en.toLowerCase().includes(q)
      );
    });
  }, [rows, activeCategory, search]);

  const updateRow = (key: string, field: "value_ar" | "value_en", value: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.key === key ? { ...r, [field]: value, isModified: true } : r
      )
    );
  };

  const resetRow = (key: string) => {
    setRows((prev) =>
      prev.map((r) =>
        r.key === key
          ? {
              ...r,
              value_ar: defaultTranslations.ar[key] || "",
              value_en: defaultTranslations.en[key] || "",
              isModified: true,
            }
          : r
      )
    );
  };

  const saveAll = async () => {
    const modified = rows.filter((r) => r.isModified);
    if (modified.length === 0) {
      toast({ title: "لا توجد تعديلات للحفظ" });
      return;
    }
    setSaving(true);
    try {
      const payload = modified.map((r) => ({
        key: r.key,
        value_ar: r.value_ar,
        value_en: r.value_en,
        category: r.category,
      }));
      const { error } = await supabase
        .from("ui_translations")
        .upsert(payload, { onConflict: "key" });
      if (error) throw error;
      toast({
        title: "✓ تم الحفظ",
        description: `تم حفظ ${modified.length} ترجمة بنجاح`,
      });
      await refreshTranslations();
      await loadData();
    } catch (e: any) {
      toast({
        title: "فشل الحفظ",
        description: e.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const modifiedCount = rows.filter((r) => r.isModified).length;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <Languages className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>إدارة الترجمات</CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  حرّر النصوص العربية والإنجليزية لكل صفحات الموقع
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {modifiedCount > 0 && (
                <Badge variant="secondary" className="text-sm">
                  {modifiedCount} تعديل غير محفوظ
                </Badge>
              )}
              <Button onClick={saveAll} disabled={saving || modifiedCount === 0}>
                {saving ? (
                  <Loader2 className="h-4 w-4 me-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 me-2" />
                )}
                حفظ التغييرات
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative mb-4">
            <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="ابحث بالمفتاح أو النص..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="ps-10"
            />
          </div>

          <Tabs value={activeCategory} onValueChange={setActiveCategory}>
            <TabsList className="flex flex-wrap h-auto gap-1 mb-4 bg-muted p-1">
              {categories.map((cat) => (
                <TabsTrigger key={cat} value={cat} className="text-xs">
                  {CATEGORY_LABELS[cat] || cat}
                  <Badge variant="outline" className="ms-2 text-[10px] h-4 px-1">
                    {rows.filter((r) => r.category === cat).length}
                  </Badge>
                </TabsTrigger>
              ))}
            </TabsList>

            {categories.map((cat) => (
              <TabsContent key={cat} value={cat} className="space-y-3 mt-0">
                {filtered.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    لا توجد نتائج مطابقة
                  </p>
                )}
                {filtered.map((row) => (
                  <Card
                    key={row.key}
                    className={
                      row.isModified
                        ? "border-primary/40 bg-primary/5"
                        : ""
                    }
                  >
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                          {row.key}
                        </code>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resetRow(row.key)}
                          title="إعادة للنص الافتراضي"
                        >
                          <RotateCcw className="h-3 w-3 me-1" />
                          إعادة تعيين
                        </Button>
                      </div>
                      <div className="grid md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                            العربية 🇪🇬
                          </label>
                          {(row.value_ar?.length || 0) > 80 ? (
                            <Textarea
                              value={row.value_ar}
                              onChange={(e) =>
                                updateRow(row.key, "value_ar", e.target.value)
                              }
                              dir="rtl"
                              rows={3}
                            />
                          ) : (
                            <Input
                              value={row.value_ar}
                              onChange={(e) =>
                                updateRow(row.key, "value_ar", e.target.value)
                              }
                              dir="rtl"
                            />
                          )}
                        </div>
                        <div>
                          <label className="text-xs font-semibold text-muted-foreground mb-1 block">
                            English 🇬🇧
                          </label>
                          {(row.value_en?.length || 0) > 80 ? (
                            <Textarea
                              value={row.value_en}
                              onChange={(e) =>
                                updateRow(row.key, "value_en", e.target.value)
                              }
                              dir="ltr"
                              rows={3}
                            />
                          ) : (
                            <Input
                              value={row.value_en}
                              onChange={(e) =>
                                updateRow(row.key, "value_en", e.target.value)
                              }
                              dir="ltr"
                            />
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminTranslations;
