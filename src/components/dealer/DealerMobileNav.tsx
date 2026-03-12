import { LayoutDashboard, Search, ClipboardList, FileText, Bell, Menu } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { DealerTab } from "./DealerSidebar";

interface DealerMobileNavProps {
  activeTab: DealerTab;
  onTabChange: (tab: DealerTab) => void;
  unreadCount: number;
}

const primaryTabs: { id: DealerTab; label: string; emoji: string }[] = [
  { id: "overview", label: "الرئيسية", emoji: "🏠" },
  { id: "quotes", label: "اطلب قطع", emoji: "🔍" },
  { id: "orders", label: "طلباتي", emoji: "📦" },
  { id: "price_lists", label: "الأسعار", emoji: "📋" },
];

const moreTabs: { id: DealerTab; label: string; emoji: string }[] = [
  { id: "payment", label: "الدفع", emoji: "💳" },
  { id: "invoices", label: "الفواتير", emoji: "🧾" },
  { id: "statement", label: "كشف الحساب", emoji: "💰" },
  { id: "favorites", label: "المفضلة", emoji: "❤️" },
  { id: "stock_alerts", label: "تنبيهات المخزون", emoji: "🔔" },
  { id: "notifications", label: "الإشعارات", emoji: "📬" },
  { id: "offers", label: "العروض", emoji: "🎁" },
  { id: "quick_order", label: "طلب سريع", emoji: "📤" },
  { id: "settings", label: "الإعدادات", emoji: "⚙️" },
];

const DealerMobileNav = ({ activeTab, onTabChange, unreadCount }: DealerMobileNavProps) => {
  const [showMore, setShowMore] = useState(false);

  return (
    <>
      {/* More Menu Overlay */}
      {showMore && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setShowMore(false)}>
          <div className="absolute inset-0 bg-black/40" />
          <div className="absolute bottom-16 left-3 right-3 bg-card rounded-2xl shadow-2xl border border-border p-3 animate-in slide-in-from-bottom-4 duration-200">
            <p className="text-xs font-bold text-muted-foreground px-2 pb-2">أقسام أخرى</p>
            <div className="grid grid-cols-3 gap-1.5">
              {moreTabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onTabChange(tab.id);
                    setShowMore(false);
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1 p-3 rounded-xl transition-all relative",
                    activeTab === tab.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <span className="text-xl">{tab.emoji}</span>
                  <span className="text-[11px] font-medium leading-tight text-center">{tab.label}</span>
                  {tab.id === "notifications" && unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                      {unreadCount}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Bottom Nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-lg border-t border-border lg:hidden safe-area-bottom">
        <div className="flex items-center justify-around h-16 px-1">
          {primaryTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { onTabChange(tab.id); setShowMore(false); }}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[60px]",
                activeTab === tab.id ? "text-primary" : "text-muted-foreground"
              )}
            >
              <span className="text-xl">{tab.emoji}</span>
              <span className={cn("text-[10px] font-medium", activeTab === tab.id && "font-bold")}>{tab.label}</span>
            </button>
          ))}
          {/* More button */}
          <button
            onClick={() => setShowMore(!showMore)}
            className={cn(
              "flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-xl transition-colors min-w-[60px] relative",
              showMore || moreTabs.some(t => t.id === activeTab) ? "text-primary" : "text-muted-foreground"
            )}
          >
            <span className="text-xl">⋯</span>
            <span className="text-[10px] font-medium">المزيد</span>
            {unreadCount > 0 && !showMore && (
              <span className="absolute top-0 right-2 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        </div>
      </nav>
    </>
  );
};

export default DealerMobileNav;
