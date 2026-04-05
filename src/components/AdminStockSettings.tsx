import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Save, ShieldCheck } from "lucide-react";

const SETTING_KEY = "max_order_percentage";

const AdminStockSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [saving, setSaving] = useState(false);
  const [percentage, setPercentage] = useState("");

  const { isLoading } = useQuery({
    queryKey: ["site_settings", SETTING_KEY],
    queryFn: async () => {
      const { data } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", SETTING_KEY)
        .maybeSingle();
      const val = data?.value || "50";
      setPercentage(val);
      return val;
    },
  });

  const handleSave = async () => {
    const num = parseInt(percentage);
    if (isNaN(num) || num < 10 || num > 100) {
      toast({ title: "النسبة يجب أن تكون بين 10% و 100%", variant: "destructive" });
      return;
    }
    setSaving(true);

    const { data: existing } = await supabase
      .from("site_settings")
      .select("id")
      .eq("key", SETTING_KEY)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("site_settings")
        .update({ value: String(num), updated_at: new Date().toISOString() })
        .eq("key", SETTING_KEY);
    } else {
      await supabase
        .from("site_settings")
        .insert({ key: SETTING_KEY, value: String(num) });
    }

    queryClient.invalidateQueries({ queryKey: ["site_settings", SETTING_KEY] });
    toast({ title: `✅ تم حفظ نسبة الحد الأقصى: ${num}%` });
    setSaving(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          إعدادات المخزون والحماية
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-primary" />
          </div>
        ) : (
          <div className="max-w-md space-y-4">
            <div className="space-y-2">
              <Label className="text-base font-semibold">الحد الأقصى لطلب العميل (% من الرصيد المتاح)</Label>
              <p className="text-sm text-muted-foreground">
                يحدد أقصى نسبة يمكن لعميل واحد طلبها من رصيد أي صنف. مثال: إذا كان الرصيد 100 والنسبة 50%، فالحد الأقصى للطلب 50 قطعة.
              </p>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={10}
                  max={100}
                  value={percentage}
                  onChange={e => setPercentage(e.target.value)}
                  className="w-28 text-center text-lg font-bold"
                  dir="ltr"
                />
                <span className="text-lg font-bold text-muted-foreground">%</span>
              </div>
            </div>

            <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">📌 كيف يعمل النظام:</p>
              <ul className="space-y-1 list-disc list-inside">
                <li>الرصيد المتاح = الرصيد الفعلي − حد الأمان (Safety Stock)</li>
                <li>الحد الأقصى للطلب = الرصيد المتاح × النسبة المحددة</li>
                <li>إذا طلب العميل كمية أكبر، يتم تعديلها تلقائياً مع رسالة توضيحية</li>
                <li>الحماية مطبقة على 3 مستويات: الواجهة، السلة، وقاعدة البيانات</li>
              </ul>
            </div>

            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ الإعداد
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminStockSettings;
