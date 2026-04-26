import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Shield, Search, ChevronLeft, ChevronRight, Eye, RefreshCw } from "lucide-react";
import { format } from "date-fns";
import { ar } from "date-fns/locale";

interface AuditLog {
  id: string;
  performed_by: string;
  action: string;
  table_name: string;
  record_id: string | null;
  old_data: any;
  new_data: any;
  ip_address: string | null;
  created_at: string;
}

const ACTION_LABELS: Record<string, { label: string; color: string }> = {
  create: { label: "إنشاء", color: "bg-green-500/10 text-green-600 border-green-500/20" },
  update: { label: "تعديل", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
  delete: { label: "حذف", color: "bg-red-500/10 text-red-600 border-red-500/20" },
};

const TABLE_LABELS: Record<string, string> = {
  products: "المنتجات",
  orders: "الطلبات",
  dealer_accounts: "حسابات التجار",
  dealer_applications: "طلبات التجار",
  coupons: "الكوبونات",
  catalogs: "الكتالوجات",
  price_lists: "قوائم الأسعار",
  site_settings: "إعدادات الموقع",
  product_categories: "التصنيفات",
  maintenance_bundles: "باقات الصيانة",
  bundle_items: "محتويات الباقات",
  quantity_discounts: "خصومات الكمية",
  product_tier_prices: "أسعار الفئات",
  user_roles: "صلاحيات المستخدمين",
  notifications: "الإشعارات",
  erp_config: "إعدادات الفيصل (ERP)",
  admin_notification_phones: "أرقام إشعارات الأدمن",
  daily_report_questions: "أسئلة التقرير اليومي",
  "auth.users": "حسابات المستخدمين",
};

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  admin: { label: "أدمن", color: "bg-red-500/10 text-red-600 border-red-500/30" },
  moderator: { label: "موظف", color: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
};

const ITEMS_PER_PAGE = 20;

const AdminAuditLog = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [filterTable, setFilterTable] = useState<string>("all");
  const [filterAction, setFilterAction] = useState<string>("all");
  const [filterUser, setFilterUser] = useState("");
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [profilesMap, setProfilesMap] = useState<Record<string, string>>({});
  const [rolesMap, setRolesMap] = useState<Record<string, "admin" | "moderator">>({});

  const fetchLogs = async () => {
    setLoading(true);
    let query = supabase
      .from("audit_logs")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * ITEMS_PER_PAGE, (page + 1) * ITEMS_PER_PAGE - 1);

    if (filterTable !== "all") query = query.eq("table_name", filterTable);
    if (filterAction !== "all") query = query.eq("action", filterAction);
    if (filterUser.trim()) query = query.eq("performed_by", filterUser.trim());

    const { data, count } = await query;
    setLogs((data as AuditLog[]) || []);
    setTotalCount(count || 0);

    // Fetch profile names + roles for unique user IDs
    const userIds = [...new Set((data || []).map((l: any) => l.performed_by))];
    if (userIds.length > 0) {
      const [{ data: profiles }, { data: roles }] = await Promise.all([
        supabase
          .from("profiles")
          .select("user_id, full_name, email")
          .in("user_id", userIds),
        supabase
          .from("user_roles")
          .select("user_id, role")
          .in("user_id", userIds)
          .in("role", ["admin", "moderator"]),
      ]);
      const nameMap: Record<string, string> = {};
      (profiles || []).forEach((p: any) => {
        nameMap[p.user_id] = p.full_name || p.email || p.user_id.slice(0, 8);
      });
      setProfilesMap(nameMap);

      // Admin wins over moderator if user has both
      const rMap: Record<string, "admin" | "moderator"> = {};
      (roles || []).forEach((r: any) => {
        if (rMap[r.user_id] === "admin") return;
        rMap[r.user_id] = r.role;
      });
      setRolesMap(rMap);
    }

    setLoading(false);
  };

  useEffect(() => { fetchLogs(); }, [page, filterTable, filterAction]);

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

  const handleSearch = () => {
    setPage(0);
    fetchLogs();
  };

  return (
    <div className="space-y-4">
      <Card className="border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="w-5 h-5 text-primary" />
            سجل المراجعة الأمنية
            <Badge variant="outline" className="mr-auto text-xs">{totalCount} سجل</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1 min-w-[150px]">
              <label className="text-xs text-muted-foreground">الجدول</label>
              <Select value={filterTable} onValueChange={(v) => { setFilterTable(v); setPage(0); }}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  {Object.entries(TABLE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 min-w-[120px]">
              <label className="text-xs text-muted-foreground">الإجراء</label>
              <Select value={filterAction} onValueChange={(v) => { setFilterAction(v); setPage(0); }}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">الكل</SelectItem>
                  <SelectItem value="create">إنشاء</SelectItem>
                  <SelectItem value="update">تعديل</SelectItem>
                  <SelectItem value="delete">حذف</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 flex-1 min-w-[200px]">
              <label className="text-xs text-muted-foreground">معرف المستخدم</label>
              <div className="flex gap-2">
                <Input
                  className="h-9 text-sm"
                  placeholder="UUID المستخدم..."
                  value={filterUser}
                  onChange={(e) => setFilterUser(e.target.value)}
                />
                <Button size="sm" variant="outline" className="h-9" onClick={handleSearch}>
                  <Search className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <Button size="sm" variant="ghost" className="h-9" onClick={() => { setFilterTable("all"); setFilterAction("all"); setFilterUser(""); setPage(0); }}>
              <RefreshCw className="w-4 h-4 ml-1" /> إعادة ضبط
            </Button>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : logs.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">لا توجد سجلات</div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead className="text-right">التاريخ والوقت</TableHead>
                    <TableHead className="text-right">المستخدم</TableHead>
                    <TableHead className="text-right">الدور</TableHead>
                    <TableHead className="text-right">الإجراء</TableHead>
                    <TableHead className="text-right">الجدول</TableHead>
                    <TableHead className="text-right">معرف السجل</TableHead>
                    <TableHead className="text-right w-[60px]">تفاصيل</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const actionInfo = ACTION_LABELS[log.action] || { label: log.action, color: "bg-muted text-muted-foreground" };
                    const role = rolesMap[log.performed_by];
                    const roleBadge = role ? ROLE_BADGE[role] : null;
                    return (
                      <TableRow key={log.id} className="hover:bg-muted/20">
                        <TableCell className="text-xs whitespace-nowrap font-mono">
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm:ss", { locale: ar })}
                        </TableCell>
                        <TableCell className="text-xs">
                          {profilesMap[log.performed_by] || log.performed_by.slice(0, 8) + "..."}
                        </TableCell>
                        <TableCell>
                          {roleBadge ? (
                            <Badge variant="outline" className={`text-xs ${roleBadge.color}`}>
                              {roleBadge.label}
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={`text-xs ${actionInfo.color}`}>
                            {actionInfo.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {TABLE_LABELS[log.table_name] || log.table_name}
                        </TableCell>
                        <TableCell className="text-xs font-mono text-muted-foreground">
                          {log.record_id?.slice(0, 8) || "—"}
                        </TableCell>
                        <TableCell>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setSelectedLog(log)}>
                            <Eye className="w-4 h-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-muted-foreground">
                صفحة {page + 1} من {totalPages}
              </p>
              <div className="flex gap-1">
                <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
                  <ChevronRight className="w-4 h-4" />
                </Button>
                <Button size="sm" variant="outline" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>
                  <ChevronLeft className="w-4 h-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Dialog */}
      <Dialog open={!!selectedLog} onOpenChange={(o) => { if (!o) setSelectedLog(null); }}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              تفاصيل السجل
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4 text-sm">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-muted-foreground">التاريخ:</span>
                    <p className="font-medium">{format(new Date(selectedLog.created_at), "dd/MM/yyyy HH:mm:ss")}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">المستخدم:</span>
                    <p className="font-medium">{profilesMap[selectedLog.performed_by] || selectedLog.performed_by}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">الإجراء:</span>
                    <p className="font-medium">{ACTION_LABELS[selectedLog.action]?.label || selectedLog.action}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">الجدول:</span>
                    <p className="font-medium">{TABLE_LABELS[selectedLog.table_name] || selectedLog.table_name}</p>
                  </div>
                </div>
                {selectedLog.old_data && (
                  <div>
                    <p className="text-muted-foreground mb-1">البيانات القديمة:</p>
                    <pre className="bg-muted/50 rounded-lg p-3 text-xs overflow-auto max-h-48 direction-ltr" dir="ltr">
                      {JSON.stringify(selectedLog.old_data, null, 2)}
                    </pre>
                  </div>
                )}
                {selectedLog.new_data && (
                  <div>
                    <p className="text-muted-foreground mb-1">البيانات الجديدة:</p>
                    <pre className="bg-muted/50 rounded-lg p-3 text-xs overflow-auto max-h-48 direction-ltr" dir="ltr">
                      {JSON.stringify(selectedLog.new_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminAuditLog;
