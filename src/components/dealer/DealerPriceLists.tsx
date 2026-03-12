import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Download, Clock, RefreshCw } from "lucide-react";

interface PriceList {
  id: string;
  title: string;
  description: string | null;
  file_url: string | null;
  version: string | null;
  created_at: string;
  updated_at: string;
}

const DealerPriceLists = () => {
  const [lists, setLists] = useState<PriceList[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLists();
  }, []);

  const fetchLists = async () => {
    const { data } = await supabase
      .from("price_lists")
      .select("*")
      .eq("is_active", true)
      .order("created_at", { ascending: false });
    setLists((data as PriceList[]) || []);
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => <div key={i} className="h-20 rounded-lg bg-muted/50 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground">كشوفات الأسعار</h2>
        <Button variant="ghost" size="sm" onClick={fetchLists}>
          <RefreshCw className="w-4 h-4 ml-1" />
          تحديث
        </Button>
      </div>

      {lists.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="p-10 text-center">
            <FileText className="w-12 h-12 mx-auto text-muted-foreground/40 mb-3" />
            <p className="text-muted-foreground font-medium">لا توجد كشوفات أسعار متاحة حالياً</p>
            <p className="text-xs text-muted-foreground/60 mt-1">سيتم إشعارك عند رفع كشف جديد</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {lists.map(list => {
            const isRecent = Date.now() - new Date(list.created_at).getTime() < 7 * 24 * 60 * 60 * 1000;
            return (
              <Card key={list.id} className="border-border/50 hover:shadow-sm transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                      <FileText className="w-6 h-6 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-foreground text-sm truncate">{list.title}</h3>
                        {isRecent && <Badge variant="default" className="text-[9px] h-4 bg-emerald-500">جديد</Badge>}
                        {list.version && <Badge variant="secondary" className="text-[9px] h-4">{list.version}</Badge>}
                      </div>
                      {list.description && (
                        <p className="text-xs text-muted-foreground mb-2">{list.description}</p>
                      )}
                      <div className="flex items-center gap-3 text-[10px] text-muted-foreground/70">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(list.updated_at).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" })}
                        </span>
                      </div>
                    </div>
                    {list.file_url && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0"
                        onClick={() => window.open(list.file_url!, "_blank")}
                      >
                        <Download className="w-4 h-4 ml-1" />
                        تحميل
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default DealerPriceLists;
