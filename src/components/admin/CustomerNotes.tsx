import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Send, Trash2, StickyNote, User } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Note {
  id: string;
  note: string;
  staff_user_id: string;
  created_at: string;
  staff_name?: string;
}

interface CustomerNotesProps {
  customerUserId: string;
  compact?: boolean;
}

export default function CustomerNotes({ customerUserId, compact = false }: CustomerNotesProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNote, setNewNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchNotes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("customer_notes")
      .select("*")
      .eq("customer_user_id", customerUserId)
      .order("created_at", { ascending: false });

    if (data) {
      // Fetch staff names
      const staffIds = [...new Set(data.map(n => n.staff_user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .in("user_id", staffIds);

      const nameMap: Record<string, string> = {};
      profiles?.forEach(p => { nameMap[p.user_id] = p.full_name || "موظف"; });

      setNotes(data.map(n => ({ ...n, staff_name: nameMap[n.staff_user_id] || "موظف" })));
    }
    setLoading(false);
  };

  useEffect(() => { fetchNotes(); }, [customerUserId]);

  const handleAdd = async () => {
    if (!newNote.trim() || !user) return;
    setSaving(true);
    const { error } = await supabase.from("customer_notes").insert({
      customer_user_id: customerUserId,
      staff_user_id: user.id,
      note: newNote.trim(),
    });
    if (error) {
      toast({ title: "خطأ", description: "فشل حفظ الملاحظة", variant: "destructive" });
    } else {
      setNewNote("");
      await fetchNotes();
    }
    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    await supabase.from("customer_notes").delete().eq("id", id);
    setNotes(prev => prev.filter(n => n.id !== id));
  };

  return (
    <Card>
      <CardHeader className={compact ? "pb-2 px-4 pt-4" : "pb-3"}>
        <CardTitle className="text-base flex items-center gap-2">
          <StickyNote className="w-4 h-4 text-amber-500" />
          ملاحظات داخلية ({notes.length})
        </CardTitle>
      </CardHeader>
      <CardContent className={compact ? "px-4 pb-4 space-y-3" : "space-y-3"}>
        {/* Add note */}
        <div className="flex gap-2">
          <Textarea
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
            placeholder="اكتب ملاحظة عن العميل..."
            rows={2}
            className="text-sm resize-none"
            onKeyDown={e => { if (e.key === "Enter" && e.ctrlKey) handleAdd(); }}
          />
          <Button
            size="icon"
            onClick={handleAdd}
            disabled={saving || !newNote.trim()}
            className="shrink-0 self-end"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>

        {/* Notes list */}
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : notes.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-3">لا توجد ملاحظات بعد</p>
        ) : (
          <div className={`space-y-2 ${compact ? "max-h-48" : "max-h-72"} overflow-y-auto`}>
            {notes.map(note => (
              <div key={note.id} className="bg-muted/50 rounded-lg p-3 text-sm group relative">
                <p className="text-foreground whitespace-pre-wrap">{note.note}</p>
                <div className="flex items-center justify-between mt-2 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3" />
                    {note.staff_name}
                  </span>
                  <span>{new Date(note.created_at).toLocaleDateString("ar-EG", {
                    day: "numeric", month: "short", hour: "2-digit", minute: "2-digit"
                  })}</span>
                </div>
                {note.staff_user_id === user?.id && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-1 left-1 h-6 w-6 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                    onClick={() => handleDelete(note.id)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
