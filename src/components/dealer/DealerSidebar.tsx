import {
  LayoutDashboard, Search, ClipboardList, FileText, Receipt,
  Heart, Upload, Bell, Tag, Settings, LogOut, User
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
  { id: "overview", label: "Dashboard", icon: LayoutDashboard },
  { id: "quotes", label: "Search Parts", icon: Search },
  { id: "quick_order", label: "Quick Order", icon: Upload },
  { id: "orders", label: "Orders", icon: ClipboardList },
  { id: "invoices", label: "Invoices", icon: Receipt },
  { id: "price_lists", label: "Price Lists", icon: FileText },
  { id: "favorites", label: "Favorites", icon: Heart },
];

const secondaryTabs: { id: DealerTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "offers", label: "Offers", icon: Tag },
  { id: "catalogs", label: "Catalogs", icon: FileText },
  { id: "settings", label: "Settings", icon: Settings },
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
        "w-full flex items-center gap-2.5 px-3 py-2 rounded text-[13px] font-medium transition-all",
        activeTab === tab.id
          ? "bg-primary text-primary-foreground"
          : "text-secondary-foreground/60 hover:bg-secondary-foreground/5 hover:text-secondary-foreground"
      )}
    >
      <tab.icon className="w-4 h-4 shrink-0" />
      <span className="truncate">{tab.label}</span>
      {tab.id === "notifications" && unreadCount > 0 && (
        <span className="mr-auto bg-primary text-primary-foreground text-[9px] font-bold rounded-full w-4.5 h-4.5 flex items-center justify-center">
          {unreadCount}
        </span>
      )}
    </button>
  );

  return (
    <aside className="w-56 bg-secondary border-l border-secondary/80 flex flex-col h-full shrink-0 hidden lg:flex">
      {/* Profile */}
      <div className="p-4 border-b border-secondary-foreground/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded bg-secondary-foreground/10 flex items-center justify-center">
            <User className="w-4 h-4 text-secondary-foreground/70" />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-secondary-foreground text-xs truncate">{dealerName}</p>
            <span className="text-[10px] text-secondary-foreground/40 uppercase tracking-wider">
              {tierLabels[tier] || tier}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
        <p className="text-[9px] font-semibold text-secondary-foreground/30 uppercase tracking-widest px-3 pt-2 pb-1.5">Operations</p>
        {mainTabs.map(renderTab)}

        <div className="h-px bg-secondary-foreground/10 my-2.5" />
        <p className="text-[9px] font-semibold text-secondary-foreground/30 uppercase tracking-widest px-3 pt-1 pb-1.5">System</p>
        {secondaryTabs.map(renderTab)}
      </nav>

      {/* Sign Out */}
      <div className="p-2.5 border-t border-secondary-foreground/10">
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded text-[13px] text-secondary-foreground/40 hover:bg-destructive/10 hover:text-destructive transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </aside>
  );
};

export default DealerSidebar;
