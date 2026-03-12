import { LayoutDashboard, ShoppingCart, Bell, Tag, FileText, LogOut, User, ChevronRight, Search } from "lucide-react";
import { cn } from "@/lib/utils";

export type DealerTab = "overview" | "quotes" | "orders" | "notifications" | "offers" | "catalogs";

interface DealerSidebarProps {
  activeTab: DealerTab;
  onTabChange: (tab: DealerTab) => void;
  dealerName: string;
  tier: string;
  onSignOut: () => void;
  unreadCount: number;
}

const tabs: { id: DealerTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "نظرة عامة", icon: LayoutDashboard },
  { id: "quotes", label: "عروض الأسعار", icon: Search },
  { id: "orders", label: "الطلبات", icon: ShoppingCart },
  { id: "notifications", label: "الإشعارات", icon: Bell },
  { id: "offers", label: "العروض", icon: Tag },
  { id: "catalogs", label: "الكتالوجات", icon: FileText },
];

const tierLabels: Record<string, string> = {
  wholesale_tier1: "تاجر جملة – درجة أولى",
  wholesale_tier2: "تاجر جملة – درجة ثانية",
  corporate: "شركة / هيئة",
  retail: "عميل قطاعي",
};

const DealerSidebar = ({ activeTab, onTabChange, dealerName, tier, onSignOut, unreadCount }: DealerSidebarProps) => {
  return (
    <aside className="w-64 bg-secondary border-l border-border flex flex-col h-full shrink-0 hidden lg:flex">
      {/* Profile Section */}
      <div className="p-5 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-foreground text-sm truncate">{dealerName}</p>
            <p className="text-[11px] text-muted-foreground truncate">{tierLabels[tier] || tier}</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
              activeTab === tab.id
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            <tab.icon className="w-4.5 h-4.5 shrink-0" />
            <span>{tab.label}</span>
            {tab.id === "notifications" && unreadCount > 0 && (
              <span className="mr-auto bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
            <ChevronRight className={cn("w-3.5 h-3.5 mr-auto transition-transform", activeTab === tab.id && "rotate-90", tab.id === "notifications" && unreadCount > 0 && "hidden")} />
          </button>
        ))}
      </nav>

      {/* Sign Out */}
      <div className="p-3 border-t border-border">
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
        >
          <LogOut className="w-4.5 h-4.5" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
};

export default DealerSidebar;
