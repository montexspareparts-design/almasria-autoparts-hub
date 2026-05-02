import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { TrendingUp, Flame, Package, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

interface RestockedItem {
  product_id: string;
  sku: string;
  name_ar: string;
  brand: string | null;
  prev_stock: number;
  current_stock: number;
  delta: number;
  was_zero: boolean;
  had_shortage_request: boolean;
  shortage_requests_count: number;
  base_price: number | null;
}

export default function RestockedYesterdayCard() {
  const [items, setItems] = useState<RestockedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [showOnlyShortages, setShowOnlyShortages] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.rpc("get_restocked_items" as any, { _days_back: 1 });
      setItems((data as any) || []);
      setLoading(false);
    };
    load();
  }, []);

  if (loading) {
    return (
      <Card className="p-4 border-2 border-emerald-200 bg-emerald-50/30">
        <div className="flex items-center gap-2 text-emerald-700 text-sm">
          <Loader2 className="w-4 h-4 animate-spin" />
          جاري تحميل الأصناف اللي وصلت امبارح...
        </div>
      </Card>
    );
  }

  if (items.length === 0) {
    return (
      <Card className="p-4 border-2 border-muted bg-muted/20">
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Package className="w-4 h-4" />
          مفيش أصناف رصيدها زاد عن امبارح. (المقارنة بتشتغل بعد أول snapshot صباحي)
        </div>
      </Card>
    );
  }

  const filtered = showOnlyShortages ? items.filter(i => i.had_shortage_request) : items;
  const visibleItems = expanded ? filtered : filtered.slice(0, 5);
  const shortageCount = items.filter(i => i.had_shortage_request).length;

  return (
    <Card className="p-4 border-2 border-emerald-300 bg-gradient-to-br from-emerald-50 via-white to-amber-50 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-start gap-2 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-full bg-emerald-500 text-white flex items-center justify-center shrink-0 shadow">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-base text-emerald-900">🎉 وصل امبارح — فرص بيع جاهزة</h3>
            <p className="text-xs text-emerald-700 mt-0.5">
              {items.length} صنف رصيدهم زاد عن امبارح
              {shortageCount > 0 && (
                <> • <span className="font-bold text-rose-700">{shortageCount}</span> منهم كان عميل بيسأل عليهم</>
              )}
            </p>
          </div>
        </div>
        {shortageCount > 0 && (
          <button
            onClick={() => setShowOnlyShortages(v => !v)}
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
              showOnlyShortages
                ? "bg-rose-600 text-white"
                : "bg-rose-100 text-rose-700 hover:bg-rose-200"
            }`}
          >
            🔥 الفرص المؤكدة فقط
          </button>
        )}
      </div>

      <ScrollArea className={expanded ? "h-72" : ""}>
        <div className="space-y-1.5">
          {visibleItems.map(item => (
            <div
              key={item.product_id}
              className={`p-2.5 rounded-lg border flex items-start gap-3 transition-colors ${
                item.had_shortage_request
                  ? "bg-rose-50/70 border-rose-200 hover:bg-rose-100/70"
                  : "bg-white border-emerald-100 hover:bg-emerald-50/50"
              }`}
            >
              <div className="flex flex-col items-center gap-1 shrink-0">
                {item.had_shortage_request ? (
                  <Badge className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] px-1.5 py-0 h-5">
                    <Flame className="w-3 h-3 mr-0.5" /> فرصة
                  </Badge>
                ) : item.was_zero ? (
                  <Badge variant="secondary" className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0 h-5">
                    رجع متاح
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-5">
                    +{item.delta}
                  </Badge>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-semibold text-foreground truncate font-mono leading-tight" dir="ltr">
                    {item.name_ar}
                  </p>
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="text-[10px] font-mono bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded" dir="ltr">
                    كود: {item.sku}
                  </span>
                  <span className="text-[10px] text-muted-foreground">
                    من <span className="font-bold text-rose-600">{item.prev_stock}</span> →{" "}
                    <span className="font-bold text-emerald-700">{item.current_stock}</span>
                  </span>
                  {item.had_shortage_request && (
                    <span className="text-[10px] font-semibold text-rose-700">
                      {item.shortage_requests_count} بلاغ نقص سابق
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      {filtered.length > 5 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setExpanded(v => !v)}
          className="w-full mt-2 text-emerald-700 hover:bg-emerald-100"
        >
          {expanded ? (
            <>إخفاء <ChevronUp className="w-4 h-4 mr-1" /></>
          ) : (
            <>عرض الكل ({filtered.length}) <ChevronDown className="w-4 h-4 mr-1" /></>
          )}
        </Button>
      )}
    </Card>
  );
}
