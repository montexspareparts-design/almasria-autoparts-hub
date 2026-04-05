import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Download, Search, Link2, CheckCircle, Users, Building2, AlertCircle } from "lucide-react";

interface ERPCustomer {
  id: string;
  name: string;
}

interface DealerAccount {
  id: string;
  user_id: string;
  erp_customer_code: string | null;
  erp_customer_name: string | null;
  tier: string;
  is_active: boolean;
}

interface DealerApp {
  user_id: string;
  business_name: string;
  legal_name: string;
  phone: string;
}

const AdminERPCustomers = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [erpCustomers, setErpCustomers] = useState<ERPCustomer[]>([]);
  const [dealers, setDealers] = useState<(DealerAccount & { app?: DealerApp })[]>([]);
  const [search, setSearch] = useState("");
  const [matchResults, setMatchResults] = useState<{
    matched: { erpId: string; erpName: string; dealerId: string; dealerName: string }[];
    unmatched_erp: ERPCustomer[];
    unmatched_dealers: (DealerAccount & { app?: DealerApp })[];
    already_linked: { erpId: string; erpName: string; dealerName: string }[];
  } | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setMatchResults(null);

    try {
      // Fetch ERP customers and local dealers in parallel
      const [erpRes, dealerAccountsRes, dealerAppsRes] = await Promise.all([
        supabase.functions.invoke("erp-sync-outbound", {
          body: { action: "fetch_erp_customers" },
        }),
        supabase.from("dealer_accounts").select("*"),
        supabase.from("dealer_applications").select("user_id, business_name, legal_name, phone").eq("status", "approved"),
      ]);

      if (!erpRes.data?.success) {
        throw new Error(erpRes.data?.error || "فشل جلب عملاء الفيصل");
      }

      const erpList: ERPCustomer[] = erpRes.data.customers || [];
      const accounts: DealerAccount[] = (dealerAccountsRes.data || []) as DealerAccount[];
      const apps: DealerApp[] = dealerAppsRes.data || [];

      // Merge apps into accounts
      const enrichedDealers = accounts.map(acc => ({
        ...acc,
        app: apps.find(a => a.user_id === acc.user_id),
      }));

      setErpCustomers(erpList);
      setDealers(enrichedDealers);

      // Auto-match by name similarity
      const already_linked: { erpId: string; erpName: string; dealerName: string }[] = [];
      const matched: { erpId: string; erpName: string; dealerId: string; dealerName: string }[] = [];
      const matchedDealerIds = new Set<string>();
      const matchedErpIds = new Set<string>();

      // First: identify already-linked dealers
      for (const dealer of enrichedDealers) {
        if (dealer.erp_customer_code) {
          const erpMatch = erpList.find(e => e.id === dealer.erp_customer_code);
          already_linked.push({
            erpId: dealer.erp_customer_code,
            erpName: erpMatch?.name || dealer.erp_customer_name || "",
            dealerName: dealer.app?.business_name || "",
          });
          matchedDealerIds.add(dealer.id);
          matchedErpIds.add(dealer.erp_customer_code);
        }
      }

      // Then: try auto-matching unlinked dealers by name
      const unlinkdDealers = enrichedDealers.filter(d => !d.erp_customer_code);
      const unlinkdErp = erpList.filter(e => !matchedErpIds.has(e.id));

      for (const dealer of unlinkdDealers) {
        const dealerName = normalize(dealer.app?.business_name || "");
        const dealerLegalName = normalize(dealer.app?.legal_name || "");
        
        const erpMatch = unlinkdErp.find(e => {
          const erpName = normalize(e.name);
          if (!erpName || (!dealerName && !dealerLegalName)) return false;
          return erpName === dealerName || erpName === dealerLegalName ||
            dealerName.includes(erpName) || erpName.includes(dealerName) ||
            dealerLegalName.includes(erpName) || erpName.includes(dealerLegalName);
        });

        if (erpMatch && !matchedErpIds.has(erpMatch.id)) {
          matched.push({
            erpId: erpMatch.id,
            erpName: erpMatch.name,
            dealerId: dealer.id,
            dealerName: dealer.app?.business_name || "",
          });
          matchedDealerIds.add(dealer.id);
          matchedErpIds.add(erpMatch.id);
        }
      }

      const unmatched_erp = erpList.filter(e => !matchedErpIds.has(e.id));
      const unmatched_dealers = enrichedDealers.filter(d => !matchedDealerIds.has(d.id) && !d.erp_customer_code);

      setMatchResults({ matched, unmatched_erp, unmatched_dealers, already_linked });

      toast({
        title: `تم جلب ${erpList.length} عميل من الفيصل`,
        description: `مربوط: ${already_linked.length} | مطابقة جديدة: ${matched.length} | بدون مطابقة: ${unmatched_dealers.length}`,
      });
    } catch (err: any) {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    }

    setLoading(false);
  };

  const normalize = (s: string) => s.replace(/[^\u0600-\u06FFa-zA-Z0-9 ]/g, "").replace(/\s+/g, " ").trim().toLowerCase();

  const applyMatches = async () => {
    if (!matchResults?.matched.length) return;
    setLinking(true);

    let success = 0;
    for (const match of matchResults.matched) {
      const { error } = await supabase
        .from("dealer_accounts")
        .update({
          erp_customer_code: match.erpId,
          erp_customer_name: match.erpName,
        } as any)
        .eq("id", match.dealerId);
      if (!error) success++;
    }

    toast({
      title: `تم ربط ${success} تاجر بنجاح`,
      description: success < matchResults.matched.length
        ? `فشل ربط ${matchResults.matched.length - success} تاجر`
        : undefined,
    });

    // Refresh
    await fetchData();
    setLinking(false);
  };

  const removeMatch = (erpId: string) => {
    if (!matchResults) return;
    const removed = matchResults.matched.find(m => m.erpId === erpId);
    if (!removed) return;
    
    setMatchResults({
      ...matchResults,
      matched: matchResults.matched.filter(m => m.erpId !== erpId),
      unmatched_erp: [...matchResults.unmatched_erp, { id: removed.erpId, name: removed.erpName }],
      unmatched_dealers: [...matchResults.unmatched_dealers, dealers.find(d => d.id === removed.dealerId)!].filter(Boolean),
    });
  };

  const filteredErp = matchResults?.unmatched_erp.filter(e =>
    e.name.includes(search) || e.id.includes(search)
  ) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">ربط عملاء الفيصل</h2>
          <p className="text-sm text-muted-foreground">جلب قائمة العملاء من نظام الفيصل ومطابقتها مع التجار المسجلين</p>
        </div>
        <Button onClick={fetchData} disabled={loading} className="gap-2">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          جلب العملاء من الفيصل
        </Button>
      </div>

      {/* Stats */}
      {matchResults && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <CheckCircle className="w-5 h-5 text-green-500 mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{matchResults.already_linked.length}</p>
              <p className="text-xs text-muted-foreground">مربوط مسبقاً</p>
            </CardContent>
          </Card>
          <Card className="border-primary/30">
            <CardContent className="p-4 text-center">
              <Link2 className="w-5 h-5 text-primary mx-auto mb-1" />
              <p className="text-2xl font-bold text-primary">{matchResults.matched.length}</p>
              <p className="text-xs text-muted-foreground">مطابقة جديدة</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{matchResults.unmatched_dealers.length}</p>
              <p className="text-xs text-muted-foreground">تاجر بدون كود</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Building2 className="w-5 h-5 text-muted-foreground mx-auto mb-1" />
              <p className="text-2xl font-bold text-foreground">{matchResults.unmatched_erp.length}</p>
              <p className="text-xs text-muted-foreground">عميل فيصل بدون تاجر</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Auto-matched */}
      {matchResults && matchResults.matched.length > 0 && (
        <Card className="border-primary/30">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Link2 className="w-5 h-5 text-primary" />
                مطابقات جديدة ({matchResults.matched.length})
              </CardTitle>
              <Button onClick={applyMatches} disabled={linking} className="gap-2" size="sm">
                {linking ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                ربط الكل
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {matchResults.matched.map(m => (
                <div key={m.erpId} className="flex items-center justify-between border border-border rounded-lg p-3 bg-primary/5">
                  <div className="flex items-center gap-4 text-sm">
                    <div>
                      <p className="font-medium text-foreground">{m.dealerName}</p>
                      <p className="text-xs text-muted-foreground">تاجر محلي</p>
                    </div>
                    <span className="text-primary">↔</span>
                    <div>
                      <p className="font-medium text-foreground">{m.erpName}</p>
                      <p className="text-xs text-muted-foreground font-mono" dir="ltr">{m.erpId}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => removeMatch(m.erpId)} className="text-destructive hover:text-destructive">
                    ✕
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Already linked */}
      {matchResults && matchResults.already_linked.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              مربوط مسبقاً ({matchResults.already_linked.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {matchResults.already_linked.map(m => (
                <div key={m.erpId} className="flex items-center gap-3 text-sm border border-border rounded-lg p-3">
                  <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{m.dealerName || m.erpName}</p>
                    <p className="text-xs text-muted-foreground font-mono" dir="ltr">{m.erpId} — {m.erpName}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unmatched dealers */}
      {matchResults && matchResults.unmatched_dealers.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-yellow-500" />
              تجار بدون كود فيصل ({matchResults.unmatched_dealers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {matchResults.unmatched_dealers.map(d => (
                <div key={d.id} className="flex items-center gap-3 text-sm border border-border rounded-lg p-3">
                  <Users className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium text-foreground truncate">{d.app?.business_name || "—"}</p>
                    <p className="text-xs text-muted-foreground">{d.app?.phone || ""} · {d.tier}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unmatched ERP customers */}
      {matchResults && matchResults.unmatched_erp.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="w-5 h-5 text-muted-foreground" />
                عملاء الفيصل بدون تاجر ({matchResults.unmatched_erp.length})
              </CardTitle>
              <div className="w-64">
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="بحث بالاسم أو الكود..."
                  className="h-8 text-sm"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-96 overflow-y-auto">
              {(search ? filteredErp : matchResults.unmatched_erp.slice(0, 60)).map(e => (
                <div key={e.id} className="flex items-center gap-3 text-sm border border-border rounded-lg p-2">
                  <Building2 className="w-3 h-3 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <p className="text-foreground truncate text-xs">{e.name}</p>
                    <p className="text-xs text-muted-foreground font-mono" dir="ltr">{e.id}</p>
                  </div>
                </div>
              ))}
              {!search && matchResults.unmatched_erp.length > 60 && (
                <p className="text-xs text-muted-foreground col-span-full text-center py-2">
                  +{matchResults.unmatched_erp.length - 60} عميل آخر — استخدم البحث لعرض المزيد
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdminERPCustomers;
