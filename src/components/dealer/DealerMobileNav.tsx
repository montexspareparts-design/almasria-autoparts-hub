import { LayoutDashboard, ShoppingCart, Bell, Tag, FileText, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { DealerTab } from "./DealerSidebar";

interface DealerMobileNavProps {
  activeTab: DealerTab;
  onTabChange: (tab: DealerTab) => void;
  unreadCount: number;
}

const tabs: { id: DealerTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "overview", label: "الرئيسية", icon: LayoutDashboard },
  { id: "quotes", label: "الأسعار", icon: Search },
  { id: "orders", label: "الطلبات", icon: ShoppingCart },
  { id: "notifications", label: "إشعارات", icon: Bell },
  { id: "catalogs", label: "كتالوج", icon: FileText },
];

const DealerMobileNav = ({ activeTab, onTabChange, unreadCount }: DealerMobileNavProps) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-lg border-t border-border lg:hidden">
      <div className="flex items-center justify-around h-14">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              "flex flex-col items-center gap-0.5 px-2 py-1 rounded-lg transition-colors relative",
              activeTab === tab.id ? "text-primary" : "text-muted-foreground"
            )}
          >
            <tab.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{tab.label}</span>
            {tab.id === "notifications" && unreadCount > 0 && (
              <span className="absolute -top-0.5 right-0 bg-destructive text-destructive-foreground text-[8px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                {unreadCount}
              </span>
            )}
          </button>
        ))}
      </div>
    </nav>
  );
};

export default DealerMobileNav;
