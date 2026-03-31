import { LayoutDashboard, Search, ClipboardList, FileText, Bell, CreditCard, Receipt, Heart, Zap, Tag, Settings, Upload, Eye, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import type { DealerTab } from "./DealerSidebar";

interface DealerMobileNavProps {
  activeTab: DealerTab;
  onTabChange: (tab: DealerTab) => void;
  unreadCount: number;
  cartItemCount?: number;
}

const primaryTabs: { id: DealerTab; label: string; Icon: typeof LayoutDashboard }[] = [
  { id: "quotes", label: "المنتجات", Icon: Search },
  { id: "cart", label: "السلة", Icon: ShoppingCart },
  { id: "orders", label: "طلباتي", Icon: ClipboardList },
  { id: "price_lists", label: "الأسعار", Icon: FileText },
  { id: "payment", label: "الدفع", Icon: CreditCard },
];

const moreTabs: { id: DealerTab; label: string; Icon: typeof LayoutDashboard }[] = [
  { id: "priced_today", label: "ما تم تسعيره", Icon: Eye },
  { id: "invoices", label: "الفواتير", Icon: Receipt },
  { id: "statement", label: "كشف الحساب", Icon: CreditCard },
  { id: "shopping_lists", label: "قوائم الشراء", Icon: FileText },
  { id: "compare", label: "مقارنة المنتجات", Icon: Search },
  { id: "stock_alerts", label: "تنبيهات المخزون", Icon: Bell },
  { id: "favorites", label: "المفضلة", Icon: Heart },
  { id: "quick_order", label: "طلب سريع", Icon: Zap },
  { id: "notifications", label: "الإشعارات", Icon: Bell },
  { id: "offers", label: "العروض", Icon: Tag },
  { id: "settings", label: "حسابي", Icon: Settings },
];

const DealerMobileNav = ({ activeTab, onTabChange, unreadCount }: DealerMobileNavProps) => {
  const [showMore, setShowMore] = useState(false);

  return (
    <>
      {/* More Menu Overlay */}
      {showMore && (
        <div className="fixed inset-0 z-50 lg:hidden" onClick={() => setShowMore(false)}>
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
          <div className="absolute bottom-16 left-3 right-3 bg-card rounded-2xl shadow-2xl border border-border/50 p-3 animate-in slide-in-from-bottom-4 duration-200">
            <p className="text-[11px] font-bold text-muted-foreground px-2 pb-2.5">أقسام أخرى</p>
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
                    "flex flex-col items-center gap-1.5 p-3 rounded-xl transition-all relative",
                    activeTab === tab.id
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  )}
                >
                  <tab.Icon className="w-5 h-5" />
                  <span className="text-[10px] font-medium leading-tight text-center">{tab.label}</span>
                  {tab.id === "notifications" && unreadCount > 0 && (
                    <span className="absolute top-1 right-1 bg-primary text-primary-foreground text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
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
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-card/95 backdrop-blur-lg border-t border-border/40 lg:hidden safe-area-bottom shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-around h-16 px-1">
          {primaryTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => { onTabChange(tab.id); setShowMore(false); }}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors min-w-[60px]",
                activeTab === tab.id ? "text-primary" : "text-muted-foreground"
              )}
            >
              <tab.Icon className={cn("w-5 h-5", activeTab === tab.id && "text-primary")} />
              <span className={cn("text-[10px] font-medium", activeTab === tab.id && "font-bold text-primary")}>{tab.label}</span>
            </button>
          ))}
          {/* More button */}
          <button
            onClick={() => setShowMore(!showMore)}
            className={cn(
              "flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-colors min-w-[60px] relative",
              showMore || moreTabs.some(t => t.id === activeTab) ? "text-primary" : "text-muted-foreground"
            )}
          >
            <div className="flex items-center justify-center w-5 h-5">
              <div className="flex gap-0.5">
                <div className="w-1 h-1 rounded-full bg-current" />
                <div className="w-1 h-1 rounded-full bg-current" />
                <div className="w-1 h-1 rounded-full bg-current" />
              </div>
            </div>
            <span className="text-[10px] font-medium">المزيد</span>
            {unreadCount > 0 && !showMore && (
              <span className="absolute top-0 right-2 bg-primary text-primary-foreground text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
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