import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ListPlus, Plus, Minus, Trash2, Package, ShoppingCart, Edit2, Check, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useDealerCart } from "@/hooks/useDealerCart";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";

interface ShoppingList {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  items: ListItem[];
}

interface ListItem {
  id: string;
  product_id: string;
  quantity: number;
  product?: {
    name_ar: string;
    name_en: string | null;
    sku: string;
    image_url: string | null;
    stock_quantity: number;
  };
}

const ease = [0.22, 1, 0.36, 1] as const;

const DealerShoppingLists = () => {
  const { user } = useAuth();
  const { addItem } = useDealerCart();
  const { toast } = useToast();
  const [lists, setLists] = useState<ShoppingList[]>([]);
  const [loading, setLoading] = useState(true);
  const [newListName, setNewListName] = useState("");
  const [creating, setCreating] = useState(false);
  const [expandedList, setExpandedList] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const fetchLists = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from("dealer_shopping_lists")
      .select("id, name, description, created_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });

    if (!data) { setLoading(false); return; }

    // Fetch items for all lists
    const listIds = data.map(l => l.id);
    const { data: allItems } = listIds.length > 0
      ? await supabase
          .from("dealer_shopping_list_items")
          .select("id, list_id, product_id, quantity")
          .in("list_id", listIds)
      : { data: [] };

    // Fetch product details
    const productIds = [...new Set((allItems || []).map(i => i.product_id))];
    const { data: products } = productIds.length > 0
      ? await supabase.from("products").select("id, name_ar, name_en, sku, image_url, stock_quantity").in("id", productIds)
      : { data: [] };

    const prodMap = new Map((products || []).map(p => [p.id, p]));

    const result: ShoppingList[] = data.map(l => ({
      ...l,
      items: (allItems || [])
        .filter(i => i.list_id === l.id)
        .map(i => ({ ...i, product: prodMap.get(i.product_id) })),
    }));

    setLists(result);
    setLoading(false);
  }, [user]);

  useEffect(() => { fetchLists(); }, [fetchLists]);

  const createList = async () => {
    if (!user || !newListName.trim()) return;
    setCreating(true);
    await supabase.from("dealer_shopping_lists").insert({ user_id: user.id, name: newListName.trim() });
    setNewListName("");
    setCreating(false);
    await fetchLists();
    toast({ title: "✅", description: "تم إنشاء القائمة" });
  };

  const deleteList = async (listId: string) => {
    await supabase.from("dealer_shopping_lists").delete().eq("id", listId);
    setLists(prev => prev.filter(l => l.id !== listId));
    toast({ title: "تم حذف القائمة" });
  };

  const renameList = async (listId: string) => {
    if (!editValue.trim()) return;
    await supabase.from("dealer_shopping_lists").update({ name: editValue.trim(), updated_at: new Date().toISOString() }).eq("id", listId);
    setLists(prev => prev.map(l => l.id === listId ? { ...l, name: editValue.trim() } : l));
    setEditingName(null);
  };

  const updateItemQty = async (itemId: string, listId: string, qty: number) => {
    if (qty <= 0) {
      await supabase.from("dealer_shopping_list_items").delete().eq("id", itemId);
      setLists(prev => prev.map(l => l.id === listId ? { ...l, items: l.items.filter(i => i.id !== itemId) } : l));
      return;
    }
    await supabase.from("dealer_shopping_list_items").update({ quantity: qty }).eq("id", itemId);
    setLists(prev => prev.map(l => l.id === listId ? { ...l, items: l.items.map(i => i.id === itemId ? { ...i, quantity: qty } : i) } : l));
  };

  const orderEntireList = async (list: ShoppingList) => {
    for (const item of list.items) {
      if (item.product && item.product.stock_quantity > 0) {
        await addItem(item.product_id, item.quantity);
      }
    }
    toast({ title: "✅", description: `تم إضافة ${list.items.length} صنف للسلة` });
  };

  if (loading) {
    return <div className="space-y-3">{[1,2].map(i => <div key={i} className="h-20 bg-muted/50 animate-pulse rounded-xl" />)}</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
          <ListPlus className="w-5 h-5 text-primary" />
          قوائم الشراء ({lists.length})
        </h2>
      </div>

      {/* Create new list */}
      <div className="flex gap-2">
        <Input
          value={newListName}
          onChange={e => setNewListName(e.target.value)}
          placeholder="اسم القائمة الجديدة (مثال: طلبية كورولا الشهرية)"
          className="rounded-xl h-11"
          onKeyDown={e => e.key === "Enter" && createList()}
        />
        <Button onClick={createList} disabled={creating || !newListName.trim()} className="h-11 px-5 rounded-xl gap-1.5 shrink-0">
          {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          إنشاء
        </Button>
      </div>

      {lists.length === 0 ? (
        <Card className="border-dashed border-border/60">
          <CardContent className="p-10 text-center">
            <ListPlus className="w-12 h-12 text-muted-foreground/20 mx-auto mb-3" />
            <p className="font-bold text-foreground">لا توجد قوائم شراء</p>
            <p className="text-xs text-muted-foreground mt-1">أنشئ قائمة لتسهيل الطلبات المتكررة</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {lists.map(list => (
            <motion.div key={list.id} layout>
              <Card className="border-border/40 rounded-2xl overflow-hidden">
                <button onClick={() => setExpandedList(expandedList === list.id ? null : list.id)} className="w-full text-right">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
                      <ListPlus className="w-5 h-5 text-violet-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      {editingName === list.id ? (
                        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                          <Input value={editValue} onChange={e => setEditValue(e.target.value)} className="h-8 text-sm rounded-lg" autoFocus onKeyDown={e => e.key === "Enter" && renameList(list.id)} />
                          <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => renameList(list.id)}><Check className="w-3.5 h-3.5" /></Button>
                          <Button size="icon" variant="ghost" className="w-7 h-7" onClick={() => setEditingName(null)}><X className="w-3.5 h-3.5" /></Button>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-foreground">{list.name}</p>
                          <p className="text-[11px] text-muted-foreground">{list.items.length} صنف</p>
                        </>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0" onClick={e => e.stopPropagation()}>
                      <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg" onClick={() => { setEditingName(list.id); setEditValue(list.name); }}>
                        <Edit2 className="w-3.5 h-3.5 text-muted-foreground" />
                      </Button>
                      <Button variant="ghost" size="icon" className="w-8 h-8 rounded-lg text-destructive" onClick={() => deleteList(list.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </button>

                <AnimatePresence>
                  {expandedList === list.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease }}
                      className="overflow-hidden"
                    >
                      <div className="border-t border-border/30 bg-muted/20 p-4 space-y-3">
                        {list.items.length === 0 ? (
                          <p className="text-sm text-muted-foreground text-center py-4">القائمة فارغة — أضف أصناف من صفحة المنتج</p>
                        ) : (
                          <>
                            {list.items.map(item => (
                              <div key={item.id} className="flex items-center gap-3 bg-card rounded-xl p-3 border border-border/20">
                                <LazyImage
                                  src={item.product?.image_url}
                                  alt={item.product?.name_ar || ""}
                                  wrapperClassName="w-10 h-10 rounded-lg bg-muted/30 shrink-0"
                                  className="w-full h-full object-contain p-1"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-bold text-foreground truncate">{item.product?.name_ar}</p>
                                  <p className="text-[10px] text-muted-foreground font-mono">{item.product?.sku}</p>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  <Button variant="outline" size="icon" className="w-7 h-7 rounded-lg" onClick={() => updateItemQty(item.id, list.id, item.quantity - 1)}>
                                    <Minus className="w-3 h-3" />
                                  </Button>
                                  <span className="w-8 text-center text-sm font-bold">{item.quantity}</span>
                                  <Button variant="outline" size="icon" className="w-7 h-7 rounded-lg" onClick={() => updateItemQty(item.id, list.id, item.quantity + 1)}>
                                    <Plus className="w-3 h-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                            <Button onClick={() => orderEntireList(list)} className="w-full h-10 gap-2 rounded-xl font-bold">
                              <ShoppingCart className="w-4 h-4" />
                              اطلب القائمة كاملة ({list.items.length} صنف)
                            </Button>
                          </>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DealerShoppingLists;
