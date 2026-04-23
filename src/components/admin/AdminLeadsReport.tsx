import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Phone, Store, FileDown, Loader2, TrendingUp, Building2, Wrench, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Lead {
  id: string;
  name: string;
  phone: string;
  shop_name: string | null;
  notes: string | null;
  status: string;
  client_type: string;
  erp_customer_code: string | null;
  created_at: string;
}

const clientTypeLabels: Record<string, string> = {
  retail: "قطاعي",
  corporate: "شركات وهيئات",
  wholesale: "جملة",
  workshop: "مركز صيانة / ورشة",
};

const clientTypeIcons: Record<string, any> = {
  retail: ShoppingBag,
  corporate: Building2,
  wholesale: TrendingUp,
  workshop: Wrench,
};

const clientTypeTier: Record<string, string> = {
  retail: "قطاعي",
  corporate: "قطاعي",
  wholesale: "جملة",
  workshop: "جملة",
};

const statusLabels: Record<string, string> = {
  new: "جديد",
  contacted: "تم التواصل",
  converted: "محول لتاجر",
  rejected: "مرفوض",
};

const AdminLeadsReport = () => {
  const { toast } = useToast();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  useEffect(() => {
    fetchLeads();
  }, []);

  const fetchLeads = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("leads")
      .select("*")
      .order("created_at", { ascending: false });
    if (data) setLeads(data as Lead[]);
    setLoading(false);
  };

  const stats = useMemo(() => {
    const byType: Record<string, number> = { retail: 0, corporate: 0, wholesale: 0, workshop: 0 };
    leads.forEach((l) => {
      byType[l.client_type] = (byType[l.client_type] || 0) + 1;
    });
    return {
      total: leads.length,
      byType,
      converted: leads.filter((l) => l.status === "converted").length,
      retailPricing: (byType.retail || 0) + (byType.corporate || 0),
      wholesalePricing: (byType.wholesale || 0) + (byType.workshop || 0),
    };
  }, [leads]);

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (filterType !== "all" && l.client_type !== filterType) return false;
      if (filterStatus !== "all" && l.status !== filterStatus) return false;
      if (search) {
        const q = search.toLowerCase();
        return (
          l.name.toLowerCase().includes(q) ||
          l.phone.includes(q) ||
          (l.shop_name || "").toLowerCase().includes(q) ||
          (l.erp_customer_code || "").includes(q)
        );
      }
      return true;
    });
  }, [leads, filterType, filterStatus, search]);

  const exportCSV = () => {
    if (filtered.length === 0) {
      toast({ title: "لا توجد بيانات للتصدير", variant: "destructive" });
      return;
    }
    const headers = ["الاسم", "الهاتف", "اسم المحل", "النوع", "التسعير", "كود الفيصل", "الحالة", "ملاحظات", "تاريخ الإضافة"];
    const rows = filtered.map((l) => [
      l.name,
      l.phone,
      l.shop_name || "",
      clientTypeLabels[l.client_type] || l.client_type,
      clientTypeTier[l.client_type] || "",
      l.erp_customer_code || "",
      statusLabels[l.status] || l.status,
      (l.notes || "").replace(/[\n,]/g, " "),
      new Date(l.created_at).toLocaleDateString("ar-EG"),
    ]);
    const csv = "\uFEFF" + [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `leads-report-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "تم تصدير التقرير" });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  const statCards = [
    { key: "retail", label: "قطاعي", count: stats.byType.retail || 0, color: "text-blue-600 bg-blue-500/10" },
    { key: "corporate", label: "شركات وهيئات", count: stats.byType.corporate || 0, color: "text-purple-600 bg-purple-500/10" },
    { key: "wholesale", label: "جملة", count: stats.byType.wholesale || 0, color: "text-amber-600 bg-amber-500/10" },
    { key: "workshop", label: "مراكز صيانة / ورش", count: stats.byType.workshop || 0, color: "text-emerald-600 bg-emerald-500/10" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-bold">تقرير العملاء</h2>
          <p className="text-sm text-muted-foreground">
            إجمالي {stats.total} عميل — {stats.converted} محول لتاجر — {stats.retailPricing} بسعر قطاعي / {stats.wholesalePricing} بسعر جملة
          </p>
        </div>
        <Button onClick={exportCSV} size="sm" variant="outline" className="gap-1.5">
          <FileDown className="w-4 h-4" /> تصدير Excel
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {statCards.map((c) => {
          const Icon = clientTypeIcons[c.key];
          return (
            <Card key={c.key} className="cursor-pointer hover:shadow-md transition" onClick={() => setFilterType(filterType === c.key ? "all" : c.key)}>
              <CardContent className="p-3 flex items-center gap-3">
                <div className={`p-2 rounded-lg ${c.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground truncate">{c.label}</p>
                  <p className="text-2xl font-bold">{c.count}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 flex flex-col md:flex-row gap-2">
          <Input
            placeholder="🔍 ابحث بالاسم أو الهاتف أو المحل..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="md:max-w-sm"
          />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="md:max-w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الأنواع</SelectItem>
              <SelectItem value="retail">قطاعي</SelectItem>
              <SelectItem value="corporate">شركات وهيئات</SelectItem>
              <SelectItem value="wholesale">جملة</SelectItem>
              <SelectItem value="workshop">مركز صيانة / ورشة</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="md:max-w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">كل الحالات</SelectItem>
              <SelectItem value="new">جديد</SelectItem>
              <SelectItem value="contacted">تم التواصل</SelectItem>
              <SelectItem value="converted">محول لتاجر</SelectItem>
              <SelectItem value="rejected">مرفوض</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Detailed table */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="w-4 h-4" /> القائمة التفصيلية ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-start">الاسم</TableHead>
                <TableHead className="text-start">الهاتف</TableHead>
                <TableHead className="text-start">المحل</TableHead>
                <TableHead className="text-start">النوع</TableHead>
                <TableHead className="text-start">التسعير</TableHead>
                <TableHead className="text-start">الحالة</TableHead>
                <TableHead className="text-start">ملخص</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    لا توجد نتائج
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell className="font-medium whitespace-nowrap">{l.name}</TableCell>
                    <TableCell dir="ltr" className="whitespace-nowrap">
                      <a href={`tel:${l.phone}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                        <Phone className="w-3 h-3" /> {l.phone}
                      </a>
                    </TableCell>
                    <TableCell className="whitespace-nowrap">
                      {l.shop_name ? (
                        <span className="inline-flex items-center gap-1">
                          <Store className="w-3 h-3 text-muted-foreground" /> {l.shop_name}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{clientTypeLabels[l.client_type] || l.client_type}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={clientTypeTier[l.client_type] === "جملة" ? "bg-amber-500/15 text-amber-700 hover:bg-amber-500/20" : "bg-blue-500/15 text-blue-700 hover:bg-blue-500/20"}>
                        {clientTypeTier[l.client_type] || "—"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{statusLabels[l.status] || l.status}</Badge>
                    </TableCell>
                    <TableCell className="max-w-[300px] text-sm text-muted-foreground truncate" title={l.notes || ""}>
                      {l.notes || "—"}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLeadsReport;
