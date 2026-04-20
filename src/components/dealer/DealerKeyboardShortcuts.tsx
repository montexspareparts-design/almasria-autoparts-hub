import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Keyboard } from "lucide-react";
import type { DealerTab } from "./DealerSidebar";

interface DealerKeyboardShortcutsProps {
  onTabChange: (tab: DealerTab) => void;
}

const SHORTCUTS: { keys: string; label: string; tab?: DealerTab; action?: string }[] = [
  { keys: "G then S", label: "بحث القطع", tab: "quotes" },
  { keys: "G then C", label: "السلة (طلباتي)", tab: "cart" },
  { keys: "G then O", label: "الطلبية", tab: "orders" },
  { keys: "G then P", label: "ما تم تسعيره", tab: "priced_today" },
  { keys: "G then L", label: "كشوفات الأسعار", tab: "price_lists" },
  { keys: "G then I", label: "الفواتير", tab: "invoices" },
  { keys: "G then F", label: "المفضلة", tab: "favorites" },
  { keys: "G then N", label: "الإشعارات", tab: "notifications" },
  { keys: "?", label: "عرض هذه القائمة", action: "help" },
];

export const DealerKeyboardShortcuts = ({ onTabChange }: DealerKeyboardShortcutsProps) => {
  const [open, setOpen] = useState(false);
  const [waitingForG, setWaitingForG] = useState(false);

  useEffect(() => {
    let gTimeout: ReturnType<typeof setTimeout> | null = null;

    const handler = (e: KeyboardEvent) => {
      // Ignore when typing in inputs
      const target = e.target as HTMLElement;
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        return;
      }
      // Ignore with modifier keys (except Shift for ?)
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      const key = e.key.toLowerCase();

      // Help dialog
      if (e.key === "?" || (e.shiftKey && key === "/")) {
        e.preventDefault();
        setOpen(true);
        return;
      }

      // Escape closes dialog
      if (key === "escape") {
        setOpen(false);
        setWaitingForG(false);
        return;
      }

      // First key: G
      if (!waitingForG && key === "g") {
        e.preventDefault();
        setWaitingForG(true);
        gTimeout = setTimeout(() => setWaitingForG(false), 1500);
        return;
      }

      // Second key after G
      if (waitingForG) {
        e.preventDefault();
        if (gTimeout) clearTimeout(gTimeout);
        setWaitingForG(false);

        const map: Record<string, DealerTab> = {
          s: "quotes",
          c: "cart",
          o: "orders",
          p: "priced_today",
          l: "price_lists",
          i: "invoices",
          f: "favorites",
          n: "notifications",
        };
        const tab = map[key];
        if (tab) onTabChange(tab);
      }
    };

    window.addEventListener("keydown", handler);
    return () => {
      window.removeEventListener("keydown", handler);
      if (gTimeout) clearTimeout(gTimeout);
    };
  }, [waitingForG, onTabChange]);

  return (
    <>
      {waitingForG && (
        <div className="fixed bottom-24 lg:bottom-6 left-6 z-[60] bg-primary text-primary-foreground px-4 py-2 rounded-xl shadow-lg flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-bottom-2">
          <Keyboard className="w-4 h-4" />
          اضغط حرف للانتقال (S/C/O/P/L/I/F/N)
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir="rtl" className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <Keyboard className="w-5 h-5 text-primary" />
              اختصارات لوحة المفاتيح
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 mt-2">
            {SHORTCUTS.map((s) => (
              <div
                key={s.keys}
                className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 hover:bg-muted transition-colors"
              >
                <span className="text-sm text-foreground">{s.label}</span>
                <kbd className="px-2 py-1 text-[11px] font-mono font-bold bg-background border border-border rounded shadow-sm text-primary">
                  {s.keys}
                </kbd>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground text-center mt-3">
            مثال: اضغط <kbd className="px-1 py-0.5 bg-muted rounded">G</kbd> ثم{" "}
            <kbd className="px-1 py-0.5 bg-muted rounded">C</kbd> للذهاب إلى السلة
          </p>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default DealerKeyboardShortcuts;
