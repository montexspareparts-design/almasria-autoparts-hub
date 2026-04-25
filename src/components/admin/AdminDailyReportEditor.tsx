import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Trash2,
  Edit,
  GripVertical,
  Users,
  HelpCircle,
  Loader2,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

type QType = "text" | "textarea" | "number" | "choice" | "boolean";
type Scope = "all" | "role" | "team" | "users";
type AppRole = "admin" | "moderator";

interface Team {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  is_active: boolean;
}

interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
}

interface Question {
  id: string;
  question_text: string;
  question_type: QType;
  options: string[];
  placeholder: string | null;
  is_required: boolean;
  is_active: boolean;
  sort_order: number;
  target_scope: Scope;
  target_role: AppRole | null;
  target_team_ids: string[];
  target_user_ids: string[];
}

interface StaffUser {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

const emptyQ: Omit<Question, "id"> = {
  question_text: "",
  question_type: "text",
  options: [],
  placeholder: "",
  is_required: false,
  is_active: true,
  sort_order: 0,
  target_scope: "all",
  target_role: null,
  target_team_ids: [],
  target_user_ids: [],
};

const typeLabels: Record<QType, string> = {
  text: "نص قصير",
  textarea: "نص طويل",
  number: "رقم",
  choice: "اختيار من قائمة",
  boolean: "نعم / لا",
};

const AdminDailyReportEditor = () => {
  const { toast } = useToast();
  const [tab, setTab] = useState<"questions" | "teams">("questions");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    setLoading(true);
    const [qRes, tRes, mRes, sRes] = await Promise.all([
      supabase.from("daily_report_questions").select("*").order("sort_order", { ascending: true }),
      supabase.from("teams").select("*").order("name"),
      supabase.from("team_members").select("*"),
      supabase.rpc("get_staff_users" as any).then((r) => {
        if (r.error) {
          // fallback: from user_roles + profiles
          return supabase
            .from("user_roles")
            .select("user_id")
            .in("role", ["admin", "moderator"])
            .then(async (rr) => {
              const ids = (rr.data || []).map((x: any) => x.user_id);
              if (!ids.length) return { data: [] as StaffUser[], error: null };
              const { data: profs } = await supabase
                .from("profiles")
                .select("user_id, full_name, email")
                .in("user_id", ids);
              return { data: (profs || []) as StaffUser[], error: null };
            });
        }
        return r;
      }),
    ]);

    if (qRes.data) {
      setQuestions(
        qRes.data.map((q: any) => ({
          ...q,
          options: Array.isArray(q.options) ? q.options : [],
          target_team_ids: q.target_team_ids || [],
          target_user_ids: q.target_user_ids || [],
        }))
      );
    }
    if (tRes.data) setTeams(tRes.data as Team[]);
    if (mRes.data) setMembers(mRes.data as TeamMember[]);
    if ((sRes as any).data) setStaff((sRes as any).data as StaffUser[]);
    setLoading(false);
  };

  useEffect(() => {
    loadAll();
  }, []);

  return (
    <div className="space-y-6" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold">محرر التقرير اليومي</h1>
        <p className="text-sm text-muted-foreground mt-1">
          خصّص الأسئلة الإضافية اللي تظهر للموظف في التقرير، ووجّهها حسب الدور أو الفريق
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="questions" className="gap-2">
            <HelpCircle className="w-4 h-4" />
            الأسئلة ({questions.length})
          </TabsTrigger>
          <TabsTrigger value="teams" className="gap-2">
            <Users className="w-4 h-4" />
            الفرق ({teams.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="mt-4">
          <QuestionsEditor
            questions={questions}
            teams={teams}
            staff={staff}
            loading={loading}
            onChange={loadAll}
            toast={toast}
          />
        </TabsContent>

        <TabsContent value="teams" className="mt-4">
          <TeamsEditor
            teams={teams}
            members={members}
            staff={staff}
            loading={loading}
            onChange={loadAll}
            toast={toast}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// ---------------- Questions Editor ----------------
const QuestionsEditor = ({
  questions,
  teams,
  staff,
  loading,
  onChange,
  toast,
}: {
  questions: Question[];
  teams: Team[];
  staff: StaffUser[];
  loading: boolean;
  onChange: () => void;
  toast: ReturnType<typeof useToast>["toast"];
}) => {
  const [editing, setEditing] = useState<Question | null>(null);
  const [open, setOpen] = useState(false);

  const openNew = () => {
    setEditing({ id: "", ...emptyQ, sort_order: (questions.at(-1)?.sort_order ?? 0) + 10 });
    setOpen(true);
  };

  const openEdit = (q: Question) => {
    setEditing(q);
    setOpen(true);
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("daily_report_questions").delete().eq("id", id);
    if (error) {
      toast({ title: "فشل الحذف", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "تم الحذف" });
      onChange();
    }
  };

  const move = async (q: Question, dir: -1 | 1) => {
    const idx = questions.findIndex((x) => x.id === q.id);
    const swap = questions[idx + dir];
    if (!swap) return;
    await Promise.all([
      supabase.from("daily_report_questions").update({ sort_order: swap.sort_order }).eq("id", q.id),
      supabase.from("daily_report_questions").update({ sort_order: q.sort_order }).eq("id", swap.id),
    ]);
    onChange();
  };

  const toggleActive = async (q: Question) => {
    await supabase
      .from("daily_report_questions")
      .update({ is_active: !q.is_active })
      .eq("id", q.id);
    onChange();
  };

  const scopeBadge = (q: Question) => {
    if (q.target_scope === "all") return <Badge variant="secondary">كل الموظفين</Badge>;
    if (q.target_scope === "role")
      return <Badge variant="outline">دور: {q.target_role === "admin" ? "أدمن" : "موظف"}</Badge>;
    if (q.target_scope === "team") {
      const names = teams
        .filter((t) => q.target_team_ids.includes(t.id))
        .map((t) => t.name)
        .join("، ");
      return <Badge className="bg-blue-500/10 text-blue-700 border-blue-300">فرق: {names || "—"}</Badge>;
    }
    return <Badge className="bg-purple-500/10 text-purple-700 border-purple-300">{q.target_user_ids.length} موظف محدد</Badge>;
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">
          هذه الأسئلة تظهر للموظف فوق ملاحظات التقرير اليومي
        </p>
        <Button onClick={openNew} className="gap-2">
          <Plus className="w-4 h-4" /> سؤال جديد
        </Button>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><Loader2 className="w-6 h-6 animate-spin" /></div>
      ) : questions.length === 0 ? (
        <div className="py-12 text-center text-muted-foreground">
          مفيش أسئلة بعد — اضغط "سؤال جديد" للبدء
        </div>
      ) : (
        <div className="space-y-2">
          {questions.map((q, i) => (
            <div
              key={q.id}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                q.is_active ? "bg-card hover:bg-muted/30" : "bg-muted/20 opacity-60"
              }`}
            >
              <div className="flex flex-col">
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(q, -1)} disabled={i === 0}>
                  <ChevronUp className="w-3 h-3" />
                </Button>
                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => move(q, 1)} disabled={i === questions.length - 1}>
                  <ChevronDown className="w-3 h-3" />
                </Button>
              </div>
              <GripVertical className="w-4 h-4 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{q.question_text}</span>
                  {q.is_required && <Badge variant="destructive" className="text-[10px]">إجباري</Badge>}
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge variant="outline" className="text-[10px]">{typeLabels[q.question_type]}</Badge>
                  {scopeBadge(q)}
                </div>
              </div>
              <Switch checked={q.is_active} onCheckedChange={() => toggleActive(q)} />
              <Button size="icon" variant="ghost" onClick={() => openEdit(q)}>
                <Edit className="w-4 h-4" />
              </Button>
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button size="icon" variant="ghost" className="text-destructive">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>حذف السؤال؟</AlertDialogTitle>
                    <AlertDialogDescription>
                      هيتم حذف السؤال وكل إجابات الموظفين عليه. هذا الإجراء لا يمكن التراجع عنه.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>إلغاء</AlertDialogCancel>
                    <AlertDialogAction onClick={() => remove(q.id)}>حذف</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <QuestionDialog
          open={open}
          onOpenChange={setOpen}
          question={editing}
          teams={teams}
          staff={staff}
          onSaved={() => {
            setOpen(false);
            onChange();
          }}
        />
      )}
    </Card>
  );
};

// ---------------- Question Dialog ----------------
const QuestionDialog = ({
  open,
  onOpenChange,
  question,
  teams,
  staff,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  question: Question;
  teams: Team[];
  staff: StaffUser[];
  onSaved: () => void;
}) => {
  const { toast } = useToast();
  const [q, setQ] = useState<Question>(question);
  const [saving, setSaving] = useState(false);
  const [optionsRaw, setOptionsRaw] = useState((question.options || []).join("\n"));

  useEffect(() => {
    setQ(question);
    setOptionsRaw((question.options || []).join("\n"));
  }, [question]);

  const save = async () => {
    if (!q.question_text.trim()) {
      toast({ title: "اكتب نص السؤال", variant: "destructive" });
      return;
    }
    if (q.question_type === "choice") {
      const opts = optionsRaw.split("\n").map((s) => s.trim()).filter(Boolean);
      if (opts.length < 2) {
        toast({ title: "أضف خيارين على الأقل (سطر لكل خيار)", variant: "destructive" });
        return;
      }
      q.options = opts;
    } else {
      q.options = [];
    }

    setSaving(true);
    const { id, ...payload } = q;
    const op = id
      ? supabase.from("daily_report_questions").update(payload as any).eq("id", id)
      : supabase.from("daily_report_questions").insert(payload as any);
    const { error } = await op;
    setSaving(false);
    if (error) {
      toast({ title: "فشل الحفظ", description: error.message, variant: "destructive" });
    } else {
      toast({ title: id ? "تم التحديث" : "تم إنشاء السؤال" });
      onSaved();
    }
  };

  const toggleTeam = (tid: string) => {
    setQ((s) => ({
      ...s,
      target_team_ids: s.target_team_ids.includes(tid)
        ? s.target_team_ids.filter((x) => x !== tid)
        : [...s.target_team_ids, tid],
    }));
  };

  const toggleUser = (uid: string) => {
    setQ((s) => ({
      ...s,
      target_user_ids: s.target_user_ids.includes(uid)
        ? s.target_user_ids.filter((x) => x !== uid)
        : [...s.target_user_ids, uid],
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto" dir="rtl">
        <DialogHeader>
          <DialogTitle>{question.id ? "تعديل سؤال" : "سؤال جديد"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div>
            <Label>نص السؤال *</Label>
            <Input
              value={q.question_text}
              onChange={(e) => setQ({ ...q, question_text: e.target.value })}
              placeholder="مثال: كم مكالمة عملت اليوم؟"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>نوع الإجابة</Label>
              <Select value={q.question_type} onValueChange={(v) => setQ({ ...q, question_type: v as QType })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(typeLabels).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-3 pb-2">
              <div className="flex items-center gap-2">
                <Switch checked={q.is_required} onCheckedChange={(v) => setQ({ ...q, is_required: v })} />
                <Label>إجباري</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={q.is_active} onCheckedChange={(v) => setQ({ ...q, is_active: v })} />
                <Label>مفعّل</Label>
              </div>
            </div>
          </div>

          {(q.question_type === "text" || q.question_type === "textarea" || q.question_type === "number") && (
            <div>
              <Label>نص توضيحي (Placeholder)</Label>
              <Input
                value={q.placeholder ?? ""}
                onChange={(e) => setQ({ ...q, placeholder: e.target.value })}
                placeholder="اختياري — يساعد الموظف يفهم نوع الإجابة"
              />
            </div>
          )}

          {q.question_type === "choice" && (
            <div>
              <Label>الخيارات (سطر لكل خيار)</Label>
              <Textarea
                value={optionsRaw}
                onChange={(e) => setOptionsRaw(e.target.value)}
                rows={4}
                placeholder={"ممتاز\nجيد\nمحتاج تحسين"}
              />
            </div>
          )}

          <div className="border-t pt-4">
            <Label className="text-base font-bold">توجيه السؤال لـ:</Label>
            <Select value={q.target_scope} onValueChange={(v) => setQ({ ...q, target_scope: v as Scope })}>
              <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الموظفين</SelectItem>
                <SelectItem value="role">حسب الدور (أدمن / موظف)</SelectItem>
                <SelectItem value="team">حسب الفريق</SelectItem>
                <SelectItem value="users">موظفين محددين</SelectItem>
              </SelectContent>
            </Select>

            {q.target_scope === "role" && (
              <div className="mt-3">
                <Select value={q.target_role ?? ""} onValueChange={(v) => setQ({ ...q, target_role: v as AppRole })}>
                  <SelectTrigger><SelectValue placeholder="اختر الدور" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="moderator">موظف (Moderator)</SelectItem>
                    <SelectItem value="admin">أدمن</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {q.target_scope === "team" && (
              <div className="mt-3 space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                {teams.length === 0 ? (
                  <p className="text-sm text-muted-foreground">مفيش فرق — أنشئ فرق من تبويب "الفرق" أولاً</p>
                ) : teams.map((t) => (
                  <label key={t.id} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={q.target_team_ids.includes(t.id)}
                      onChange={() => toggleTeam(t.id)}
                    />
                    <span>{t.name}</span>
                  </label>
                ))}
              </div>
            )}

            {q.target_scope === "users" && (
              <div className="mt-3 space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                {staff.length === 0 ? (
                  <p className="text-sm text-muted-foreground">جاري تحميل قائمة الموظفين...</p>
                ) : staff.map((s) => (
                  <label key={s.user_id} className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={q.target_user_ids.includes(s.user_id)}
                      onChange={() => toggleUser(s.user_id)}
                    />
                    <span>{s.full_name || s.email || s.user_id.slice(0, 8)}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>إلغاء</Button>
          <Button onClick={save} disabled={saving}>
            {saving && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
            حفظ
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ---------------- Teams Editor ----------------
const TeamsEditor = ({
  teams,
  members,
  staff,
  loading,
  onChange,
  toast,
}: {
  teams: Team[];
  members: TeamMember[];
  staff: StaffUser[];
  loading: boolean;
  onChange: () => void;
  toast: ReturnType<typeof useToast>["toast"];
}) => {
  const [name, setName] = useState("");
  const [desc, setDesc] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [creating, setCreating] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  const create = async () => {
    if (!name.trim()) {
      toast({ title: "اكتب اسم الفريق", variant: "destructive" });
      return;
    }
    setCreating(true);
    const { error } = await supabase
      .from("teams")
      .insert({ name: name.trim(), description: desc.trim() || null, color });
    setCreating(false);
    if (error) {
      toast({ title: "فشل الإنشاء", description: error.message, variant: "destructive" });
    } else {
      setName("");
      setDesc("");
      onChange();
    }
  };

  const removeTeam = async (id: string) => {
    const { error } = await supabase.from("teams").delete().eq("id", id);
    if (error) toast({ title: "فشل الحذف", description: error.message, variant: "destructive" });
    else onChange();
  };

  const toggleMember = async (teamId: string, userId: string) => {
    const exists = members.find((m) => m.team_id === teamId && m.user_id === userId);
    if (exists) {
      await supabase.from("team_members").delete().eq("id", exists.id);
    } else {
      await supabase.from("team_members").insert({ team_id: teamId, user_id: userId });
    }
    onChange();
  };

  return (
    <div className="grid md:grid-cols-2 gap-4">
      <Card className="p-5">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Plus className="w-4 h-4" /> فريق جديد
        </h3>
        <div className="space-y-3">
          <div>
            <Label>اسم الفريق</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="مثال: المبيعات / الدعم / اللوجستيات" />
          </div>
          <div>
            <Label>وصف (اختياري)</Label>
            <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
          </div>
          <div>
            <Label>لون الفريق</Label>
            <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} className="h-10 w-20" />
          </div>
          <Button onClick={create} disabled={creating} className="w-full">
            {creating && <Loader2 className="w-4 h-4 animate-spin ml-2" />}
            إنشاء الفريق
          </Button>
        </div>

        <div className="mt-6 space-y-2">
          <h4 className="text-sm font-semibold">الفرق الموجودة ({teams.length})</h4>
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin" />
          ) : teams.length === 0 ? (
            <p className="text-sm text-muted-foreground">لا توجد فرق بعد</p>
          ) : (
            teams.map((t) => {
              const count = members.filter((m) => m.team_id === t.id).length;
              return (
                <div
                  key={t.id}
                  className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-colors ${
                    selectedTeam === t.id ? "bg-primary/5 border-primary" : "hover:bg-muted/30"
                  }`}
                  onClick={() => setSelectedTeam(t.id)}
                >
                  <div className="w-3 h-3 rounded-full" style={{ background: t.color || "#3B82F6" }} />
                  <span className="flex-1 font-medium text-sm">{t.name}</span>
                  <Badge variant="secondary" className="text-[10px]">{count} عضو</Badge>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost" className="h-7 w-7 text-destructive" onClick={(e) => e.stopPropagation()}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>حذف الفريق "{t.name}"؟</AlertDialogTitle>
                        <AlertDialogDescription>
                          هيتم إزالة كل الأعضاء، والأسئلة الموجّهة لهذا الفريق هتفقد توجيهها.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>إلغاء</AlertDialogCancel>
                        <AlertDialogAction onClick={() => removeTeam(t.id)}>حذف</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              );
            })
          )}
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-bold mb-4 flex items-center gap-2">
          <Users className="w-4 h-4" /> أعضاء الفريق
        </h3>
        {!selectedTeam ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            اختر فريق من اليمين لإدارة أعضائه
          </p>
        ) : (
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            <p className="text-sm text-muted-foreground mb-3">
              اختر الموظفين اللي ينتموا لفريق <strong>{teams.find((t) => t.id === selectedTeam)?.name}</strong>
            </p>
            {staff.length === 0 ? (
              <p className="text-sm text-muted-foreground">جاري تحميل الموظفين...</p>
            ) : (
              staff.map((s) => {
                const checked = members.some((m) => m.team_id === selectedTeam && m.user_id === s.user_id);
                return (
                  <label
                    key={s.user_id}
                    className="flex items-center gap-2 p-2 rounded-lg border cursor-pointer hover:bg-muted/30"
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleMember(selectedTeam, s.user_id)}
                    />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{s.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{s.email}</div>
                    </div>
                  </label>
                );
              })
            )}
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdminDailyReportEditor;
