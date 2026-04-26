import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Loader2, Send, Trash2, MessageCircle, Phone, Mail, MapPin, User, Calendar, Clock, Bell, BellOff, CheckCircle2, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { checkDuplicateCommunication } from "@/lib/duplicateCommCheck";
import { cn } from "@/lib/utils";

const COMM_TYPES = [
  { value: "phone", label: "📞 مكالمة هاتفية", icon: Phone, color: "bg-blue-100 text-blue-800" },
  { value: "whatsapp", label: "💬 واتساب", icon: MessageCircle, color: "bg-green-100 text-green-800" },
  { value: "whatsapp_reply", label: "📩 رد واتساب (وارد)", icon: MessageCircle, color: "bg-emerald-100 text-emerald-800 border border-emerald-300" },
  { value: "visit", label: "🏪 زيارة ميدانية", icon: MapPin, color: "bg-orange-100 text-orange-800" },
  { value: "email", label: "📧 بريد إلكتروني", icon: Mail, color: "bg-purple-100 text-purple-800" },
] as const;

const fmtFullDate = (iso: string) =>
  new Date(iso).toLocaleDateString("ar-EG", { weekday: "short", day: "numeric", month: "short", year: "numeric" });
const fmtFullTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", hour12: true });
const fmtRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "الآن";
  if (min < 60) return `منذ ${min} د`;
  const h = Math.floor(min / 60);
  if (h < 24) return `منذ ${h} س`;
  const d = Math.floor(h / 24);
  if (d < 30) return `منذ ${d} يوم`;
  return "";
};

interface CommRecord {
  id: string;
  comm_type: string;
  note: string | null;
  staff_user_id: string;
  created_at: string;
  staff_name?: string;
}

interface CustomerCommunicationLogProps {
  customerUserId: string;
  compact?: boolean;
}

export default function CustomerCommunicationLog({ customerUserId, compact = false }: CustomerCommunicationLogProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [records, setRecords] = useState<CommRecord[]>([]);
  const [commType, setCommType] = useState("phone");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchRecords = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("customer_communications")
      .select("*")
      .eq("customer_user_id", customerUserId)
      .order("created_at", { ascending: false });

    if (data) {
      const staffIds = [...new Set(data.map(r => r.staff_user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", staffIds);

      const nameMap: Record<string, string> = {};
      profiles?.forEach(p => { nameMap[p.user_id] = p.full_name || "موظف"; });

      setRecords(data.map(r => ({ ...r, staff_name: nameMap[r.staff_user_id] || "موظف" })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchRecords(); }, [customerUserId]);

  const handleAdd = async () => {
    if (!user) return;
    const dup = await checkDuplicateCommunication({ customerUserId, commType });
    if (dup.isDuplicate && !dup.shouldProceed) return;
    setSaving(true);
    const { error } = await supabase.from("customer_communications").insert({
      customer_user_id: customerUserId,
      staff_user_id: user.id,
      comm_type: commType,
      note: note.trim() || null,
    });
    if (error) {
      toast({ title: "خطأ", description: "فشل حفظ سجل التواصل", variant: "destructive" });
    } else {
      setNote("");
      await fetchRecords();
      toast({ title: "تم", description: "تم تسجيل التواصل بنجاح" });
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("customer_communications").delete().eq("id", id);
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  const getTypeInfo = (type: string) => COMM_TYPES.find(t => t.value === type) || COMM_TYPES[0];

  return (
    <Card>
      <CardHeader className={compact ? "pb-2 px-4 pt-4" : "pb-3"}>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-primary" />
          سجل التواصل ({records.length})
        </CardTitle>
      </CardHeader>
      <CardContent className={compact ? "px-4 pb-4 space-y-3" : "space-y-3"}>
        {/* Add record */}
        <div className="space-y-2">
          <div className="flex gap-2">
            <Select value={commType} onValueChange={setCommType}>
              <SelectTrigger className="w-[180px] text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMM_TYPES.map(t => (
                  <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              onClick={handleAdd}
              disabled={saving}
              className="shrink-0"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4 ms-1" />}
              سجّل
            </Button>
          </div>
          <Textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="ملاحظة قصيرة عن المحادثة (اختياري)..."
            rows={2}
            className="text-sm resize-none"
            onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) handleAdd(); }}
          />
        </div>

        {/* Records list */}
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : records.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">لا توجد سجلات تواصل بعد</p>
        ) : (
          <div className={`space-y-2 ${compact ? "max-h-48" : "max-h-72"} overflow-y-auto`}>
            {records.map(record => {
              const typeInfo = getTypeInfo(record.comm_type);
              return (
                <div key={record.id} className="bg-muted/50 rounded-lg p-3 text-sm group relative">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className={`text-xs ${typeInfo.color}`}>
                      {typeInfo.label}
                    </Badge>
                  </div>
                  {record.note && (
                    <p className="text-foreground whitespace-pre-wrap mt-1">{record.note}</p>
                  )}
                  <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-border/50 text-xs flex-wrap">
                    <span className="flex items-center gap-1 text-muted-foreground font-medium">
                      <User className="w-3 h-3" />
                      {record.staff_name}
                    </span>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="flex items-center gap-1 text-foreground/80 font-medium">
                        <Calendar className="w-3 h-3 text-primary/70" />
                        {fmtFullDate(record.created_at)}
                      </span>
                      <span className="flex items-center gap-1 text-foreground/80 font-mono">
                        <Clock className="w-3 h-3 text-primary/70" />
                        {fmtFullTime(record.created_at)}
                      </span>
                      {fmtRelative(record.created_at) && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4">
                          {fmtRelative(record.created_at)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  {record.staff_user_id === user?.id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-1 left-1 h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(record.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
