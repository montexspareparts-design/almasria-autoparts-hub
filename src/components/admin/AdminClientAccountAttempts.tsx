import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CheckCircle2, XCircle, RefreshCw, Search, Loader2, KeyRound, UserPlus, Phone, ShieldAlert } from "lucide-react";

type Attempt = {
  id: string;
  attempted_by: string | null;
  attempt_type: "create" | "reset_password" | string;
  status: "success" | "failure" | string;
  lead_id: string | null;
  phone: string | null;
  erp_customer_code: string | null;
  client_name: string | null;
  error_message: string | null;
  details: Record<string, unknown> | null;
  created_at: string;
};

type StaffProfile = { user_id: string; full_name: string | null; email: string | null };

const formatDateTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleString("ar-EG", {
      year: "numeric", month: "2-digit", day: "2-digit",
      hour: "2-digit", minute: "2-digit", second: "2-digit",
    });
  } catch {
    return iso;
  }
};

const AdminClientAccountAttempts = () => {
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [staffMap, setStaffMap] = useState<Record<string, StaffProfile>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "failure">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "create" | "reset_password">("all");

  const fetchAttempts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("client_account_attempts" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(500);

    if (error) {
      console.error("Failed to load attempts:", error);
      setAttempts([]);
      setLoading(false);
      return;
    }

    const list = (data || []) as unknown as Attempt[];
    setAttempts(list);

    // Load staff names
    const staffIds = Array.from(new Set(list.map(a => a.attempted_by).filter(Boolean))) as string[];
    if (staffIds.length > 0) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, full_name, email")
        .in("user_id", staffIds);
      const map: Record<string, StaffProfile> = {};
      (profiles || []).forEach(p => { map[p.user_id] = p as StaffProfile; });
      setStaffMap(map);
    }

    setLoading(false);
  };

  useEffect(() => { fetchAttempts(); }, []);

  const filtered = useMemo(() => {
    return attempts.filter(a => {
      if (statusFilter !== "all" && a.status !== statusFilter) return false;
      if (typeFilter !== "all" && a.attempt_type !== typeFilter) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const hay = [
          a.client_name || "", a.phone || "", a.erp_customer_code || "",
          a.error_message || "", staffMap[a.attempted_by || ""]?.full_name || "",
        ].join(" ").toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [attempts, search, statusFilter, typeFilter, staffMap]);

  const stats = useMemo(() => {
    const total = attempts.length;
    const success = attempts.filter(a => a.status === "success").length;
    const failure = attempts.filter(a => a.status === "failure").length;
    return { total, success, failure };
  }, [attempts]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-primary" />
            سجل محاولات إنشاء/إعادة تعيين الحسابات
          </h2>
          <p className="text-sm text-muted-foreground">تتبع كل محاولة قام بها الموظفون مع السبب التفصيلي والوقت</p>
        </div>
        <Button onClick={fetchAttempts} variant="outline" size="sm" className="gap-1.5" disabled={loading}>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          تحديث
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="pt-4">
          <div className="text-xs text-muted-foreground">الإجمالي</div>
          <div className="text-2xl font-bold">{stats.total}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-xs text-muted-foreground">نجاح</div>
          <div className="text-2xl font-bold text-emerald-600">{stats.success}</div>
        </CardContent></Card>
        <Card><CardContent className="pt-4">
          <div className="text-xs text-muted-foreground">فشل</div>
          <div className="text-2xl font-bold text-destructive">{stats.failure}</div>
        </CardContent></Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-4 gap-2">
          <div className="relative md:col-span-2">
            <Search className="w-4 h-4 absolute right-2.5 top-2.5 text-muted-foreground" />
            <Input
              placeholder="بحث (اسم، هاتف، كود فيصل، خطأ، موظف)..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="ps-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
            <SelectTrigger><SelectValue placeholder="الحالة" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="success">نجاح</SelectItem>
              <SelectItem value="failure">فشل</SelectItem>
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={(v: any) => setTypeFilter(v)}>
            <SelectTrigger><SelectValue placeholder="النوع" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأنواع</SelectItem>
              <SelectItem value="create">إنشاء حساب</SelectItem>
              <SelectItem value="reset_password">إعادة تعيين كلمة مرور</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">
            عرض {filtered.length} من {attempts.length}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-10 text-sm text-muted-foreground">لا توجد محاولات مسجلة</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-start">الوقت</TableHead>
                  <TableHead className="text-start">النوع</TableHead>
                  <TableHead className="text-start">الحالة</TableHead>
                  <TableHead className="text-start">العميل</TableHead>
                  <TableHead className="text-start">الهاتف</TableHead>
                  <TableHead className="text-start">كود الفيصل</TableHead>
                  <TableHead className="text-start">الموظف</TableHead>
                  <TableHead className="text-start">السبب / التفاصيل</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(a => {
                  const staff = a.attempted_by ? staffMap[a.attempted_by] : null;
                  const isCreate = a.attempt_type === "create";
                  const isSuccess = a.status === "success";
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="text-xs whitespace-nowrap font-mono" dir="ltr">
                        {formatDateTime(a.created_at)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="gap-1 text-[11px]">
                          {isCreate ? <UserPlus className="w-3 h-3" /> : <KeyRound className="w-3 h-3" />}
                          {isCreate ? "إنشاء" : "إعادة تعيين"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {isSuccess ? (
                          <Badge className="gap-1 bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" /> نجاح
                          </Badge>
                        ) : (
                          <Badge variant="destructive" className="gap-1">
                            <XCircle className="w-3 h-3" /> فشل
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-sm font-medium">{a.client_name || "—"}</TableCell>
                      <TableCell className="text-xs font-mono" dir="ltr">
                        {a.phone ? (
                          <span className="inline-flex items-center gap-1"><Phone className="w-3 h-3 text-muted-foreground" />{a.phone}</span>
                        ) : "—"}
                      </TableCell>
                      <TableCell className="text-xs font-mono" dir="ltr">{a.erp_customer_code || "—"}</TableCell>
                      <TableCell className="text-xs">{staff?.full_name || staff?.email || "—"}</TableCell>
                      <TableCell className="text-xs max-w-[320px]">
                        {a.error_message ? (
                          <span className="text-destructive break-words">{a.error_message}</span>
                        ) : a.details && Object.keys(a.details).length > 0 ? (
                          <span className="text-muted-foreground break-words">
                            {Object.entries(a.details).map(([k, v]) => `${k}: ${String(v)}`).join(" • ")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminClientAccountAttempts;
