import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Bell, Plus, Trash2, Phone, Loader2, MessageCircle } from "lucide-react";

interface NotificationPhone {
  id: string;
  phone: string;
  label: string | null;
  is_active: boolean;
  notify_new_orders: boolean;
  created_at: string;
}

const AdminNotificationPhones = () => {
  const { toast } = useToast();
  const [phones, setPhones] = useState<NotificationPhone[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newPhone, setNewPhone] = useState("");
  const [newLabel, setNewLabel] = useState("");

  const fetchPhones = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("admin_notification_phones" as any)
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "خطأ في جلب الأرقام", variant: "destructive" });
    } else {
      setPhones((data as any) || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchPhones();
  }, []);

  const handleAdd = async () => {
    let phone = newPhone.trim().replace(/[\s\-()+]/g, "");
    if (phone.startsWith("0")) phone = "2" + phone;
    if (/^1\d{9}$/.test(phone)) phone = "20" + phone;

    if (!/^20(10|11|12|15)\d{8}$/.test(phone)) {
      toast({ title: "رقم غير صحيح", description: "أدخل رقم موبايل مصري صحيح", variant: "destructive" });
      return;
    }

    setAdding(true);
    const { error } = await supabase.from("admin_notification_phones" as any).insert({
      phone,
      label: newLabel.trim() || null,
      is_active: true,
      notify_new_orders: true,
    });

    if (error) {
      toast({ title: "خطأ", description: error.message.includes("duplicate") ? "الرقم موجود بالفعل" : error.message, variant: "destructive" });
    } else {
      toast({ title: "✅ تم إضافة الرقم بنجاح" });
      setNewPhone("");
      setNewLabel("");
      fetchPhones();
    }
    setAdding(false);
  };

  const toggleActive = async (id: string, current: boolean) => {
    const { error } = await supabase
      .from("admin_notification_phones" as any)
      .update({ is_active: !current })
      .eq("id", id);
    if (error) {
      toast({ title: "خطأ", variant: "destructive" });
    } else {
      fetchPhones();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الرقم؟")) return;
    const { error } = await supabase.from("admin_notification_phones" as any).delete().eq("id", id);
    if (error) {
      toast({ title: "خطأ", variant: "destructive" });
    } else {
      toast({ title: "تم الحذف" });
      fetchPhones();
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-primary" />
              أرقام تنبيهات الطلبات الجديدة (واتساب)
            </CardTitle>
            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-0 gap-1">
              <MessageCircle className="w-3 h-3" />
              {phones.filter((p) => p.is_active && p.notify_new_orders).length} نشط
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-2">
            هذه الأرقام تستقبل رسالة واتساب فورية عند وصول أي طلب جديد، تتضمن: رقم الطلب، اسم العميل، رقمه، والإجمالي.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Add new phone */}
          <div className="border border-dashed border-primary/30 rounded-xl p-4 bg-primary/5 space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <Label htmlFor="new-phone" className="text-xs">رقم الموبايل</Label>
                <Input
                  id="new-phone"
                  placeholder="01xxxxxxxxx"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  dir="ltr"
                />
              </div>
              <div>
                <Label htmlFor="new-label" className="text-xs">الاسم/الوظيفة</Label>
                <Input
                  id="new-label"
                  placeholder="مثال: أحمد - مسؤول الطلبات"
                  value={newLabel}
                  onChange={(e) => setNewLabel(e.target.value)}
                />
              </div>
              <div className="flex items-end">
                <Button onClick={handleAdd} disabled={adding || !newPhone} className="w-full gap-2">
                  {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  إضافة الرقم
                </Button>
              </div>
            </div>
          </div>

          {/* List */}
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
            </div>
          ) : phones.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">لا توجد أرقام مسجلة</p>
          ) : (
            <div className="space-y-2">
              {phones.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                      <Phone className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="font-bold text-foreground" dir="ltr">{p.phone}</p>
                      {p.label && <p className="text-xs text-muted-foreground">{p.label}</p>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                      <Switch checked={p.is_active} onCheckedChange={() => toggleActive(p.id, p.is_active)} />
                      <span className="text-xs text-muted-foreground">{p.is_active ? "نشط" : "موقوف"}</span>
                    </div>
                    <Button variant="ghost" size="icon" className="text-destructive hover:bg-destructive/10" onClick={() => handleDelete(p.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3 border border-border">
            💡 <b>نصيحة:</b> أضف رقم مسؤول الطلبات الأساسي + رقم بديل (مدير) لضمان عدم فقد أي طلب. التنبيه يصل عبر WhatsMeta CRM خلال ثوانٍ من إنشاء الطلب.
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminNotificationPhones;
