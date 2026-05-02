import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Boxes, Search, X, Loader2, PackageCheck } from "lucide-react";

interface InStockItem {
  product_id: string;
  sku: string;
  erp_item_code: string | null;
  part_number: string | null;
  name_ar: string;
  brand: string | null;
  current_stock: number;
  base_price: number | null;
  snapshot_date: string;
}

interface Props {
  /** نص الزر اللي بيفتح الـ Dialog */
  triggerLabel?: string;
  /** عدّاد إجمالي معروض على الزر — لو متعرف هنحسبه بعد التحميل */
  totalHint?: number | null;
  variant?: "primary" | "ghost";
}

export default function CurrentlyInStockDialog({
  triggerLabel = "📦 المتاح حالياً في المخزن",
  totalHint = null,
  variant = "primary",
}: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<InStockItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!open || loaded) return;
    const load = async () => {
      setLoading(true);
      const { data } = await supabase.rpc("get_currently_in_stock_items" as any);
      setItems((data as any) || []);
      setLoaded(true);
      setLoading(false);
    };
    load();
  }, [open, loaded]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (i) =>
        i.name_ar?.toLowerCase().includes(q) ||
        i.sku?.toLowerCase().includes(q) ||
        (i.erp_item_code || "").toLowerCase().includes(q) ||
        (i.part_number || "").toLowerCase().includes(q) ||
        i.brand?.toLowerCase().includes(q)
    );
  }, [items, search]);

  const total = items.length || totalHint || 0;
  const snapDate = items[0]?.snapshot_date;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant={variant === "primary" ? "default" : "outline"}
          className={
            variant === "primary"
              ? "bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
              : "gap-1.5 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
          }
        >
          <Boxes className="w-4 h-4" />
          {triggerLabel}
          {total > 0 && (
            <Badge
              variant="secondary"
              className="ms-1 bg-white/20 text-white border-0 font-mono"
            >
              {total}
            </Badge>
          )}
        </Button>
      </DialogTrigger>

      <DialogContent
        dir="rtl"
        className="max-w-3xl p-0 overflow-hidden"
      >
        <DialogHeader className="p-4 border-b bg-gradient-to-l from-emerald-50 to-white">
          <DialogTitle className="flex items-center gap-2 text-emerald-900">
            <PackageCheck className="w-5 h-5 text-emerald-600" />
            المتاح حالياً في المخزن
            <Badge className="bg-emerald-600 text-white font-mono">
              {filtered.length}
              {filtered.length !== items.length && ` / ${items.length}`}
            </Badge>
          </DialogTitle>
          {snapDate && (
            <p className="text-[11px] text-muted-foreground mt-1">
              مصدر البيانات: آخر Snapshot للمخزون بتاريخ{" "}
              {new Intl.DateTimeFormat("ar-EG", {
                day: "2-digit",
                month: "short",
                year: "numeric",
              }).format(new Date(snapDate))}
            </p>
          )}
        </DialogHeader>

        <div className="p-4 border-b bg-muted/20">
          <div className="relative">
            <Search className="w-4 h-4 absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="ابحث باسم الصنف، البارت نمبر، أو الماركة..."
              className="pr-9 pl-8 h-9 text-sm"
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                aria-label="مسح"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="p-10 flex flex-col items-center gap-2 text-muted-foreground text-sm">
            <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
            جاري تحميل الأصناف المتاحة...
          </div>
        ) : (
          <>
            <div
              className="hidden sm:grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_110px] gap-3 px-4 py-2 text-[11px] font-bold text-emerald-900/80 bg-emerald-100/60 border-b border-emerald-200"
            >
              <div>الرصيد الحالي</div>
              <div>البارت نمبر</div>
              <div className="text-center">اسم الصنف</div>
            </div>

            <ScrollArea className="h-[450px]">
              {filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  مفيش نتائج للبحث الحالي.
                </div>
              ) : (
                <div className="divide-y divide-emerald-100">
                  {filtered.map((item) => (
                    <div
                      key={item.product_id}
                      className="grid grid-cols-1 sm:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)_110px] gap-3 px-4 py-2.5 items-center bg-white hover:bg-emerald-50/60 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground leading-tight break-words">
                          {item.name_ar}
                        </p>
                        {item.brand && (
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {item.brand}
                          </p>
                        )}
                      </div>
                      <div className="min-w-0" dir="ltr">
                        <span className="inline-block font-mono text-xs font-bold text-emerald-950 bg-emerald-100/70 px-2 py-1 rounded break-all tracking-wide">
                          {item.sku}
                        </span>
                      </div>
                      <div className="text-center">
                        <span className="font-mono text-base font-extrabold text-emerald-700">
                          {item.current_stock}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
