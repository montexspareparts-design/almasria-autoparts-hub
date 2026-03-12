import {
  LayoutDashboard, Search, ClipboardList, FileText, Receipt,
  Heart, Upload, Bell, Tag, Settings, LogOut, User, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

export type DealerTab =
  | "overview" | "quotes" | "orders" | "invoices" | "price_lists"
  | "favorites" | "quick_order" | "notifications" | "offers"
  | "catalogs" | "settings";

interface DealerSidebarProps {
  activeTab: DealerTab;
  onTabChange: (tab: DealerTab) => void;
  dealerName: string;
  tier: string;
  onSignOut: () => void;
  unreadCount: number;
}

const mainTabs: { id: DealerTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "لوحة التحكم", icon: LayoutDashboard },
  { id: "quotes", label: "البحث عن قطع", icon: Search },
  { id: "quick_order", label: "طلب سريع", icon: Upload },
  { id: "orders", label: "سجل الطلبات", icon: ClipboardList },
  { id: "invoices", label: "الفواتير", icon: Receipt },
  { id: "price_lists", label: "كشوفات الأسعار", icon: FileText },
  { id: "favorites", label: "المفضلة", icon: Heart },
];

const secondaryTabs: { id: DealerTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "notifications", label: "الإشعارات", icon: Bell },
  { id: "offers", label: "العروض الخاصة", icon: Tag },
  { id: "catalogs", label: "الكتالوجات", icon: FileText },
  { id: "settings", label: "إعدادات الحساب", icon: Settings },
];

const tierLabels: Record<string, string> = {
  wholesale_tier1: "Wholesale T1",
  wholesale_tier2: "Wholesale T2",
  corporate: "Corporate",
  retail: "Retail",
};

const DealerSidebar = ({ activeTab, onTabChange, dealerName, tier, onSignOut, unreadCount }: DealerSidebarProps) => {
  const renderTab = (tab: typeof mainTabs[0]) => (
    <button
      key={tab.id}
      onClick={() => onTabChange(tab.id)}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
        activeTab === tab.id
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <tab.icon className="w-4 h-4 shrink-0" />
      <span className="truncate">{tab.label}</span>
      {tab.id === "notifications" && unreadCount > 0 && (
        <span className="mr-auto bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount}
        </span>
      )}
    </button>
  );

  return (
    <aside className="w-60 bg-card border-l border-border flex flex-col h-full shrink-0 hidden lg:flex">
      {/* Profile */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-foreground text-sm truncate">{dealerName}</p>
            <span className="text-[10px] font-medium bg-muted text-muted-foreground px-2 py-0.5 rounded">
              {tierLabels[tier] || tier}
            </span>
          </div>
        </div>
      </div>

      {/* Main Nav */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-3 mb-2">العمليات</p>
        {mainTabs.map(renderTab)}

        <div className="h-px bg-border my-3" />
        <p className="text-[10px] font-semibold text-muted-foreground/60 uppercase tracking-wider px-3 mb-2">أخرى</p>
        {secondaryTabs.map(renderTab)}
      </nav>

      {/* Sign Out */}
      <div className="p-3 border-t border-border">
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
};

export default DealerSidebar;
