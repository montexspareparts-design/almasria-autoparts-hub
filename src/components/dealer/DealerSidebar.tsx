import {
  LayoutDashboard, Search, ClipboardList, FileText, Receipt,
  Heart, Upload, Bell, Tag, Settings, LogOut, User, BookOpen
} from "lucide-react";
import { cn } from "@/lib/utils";

export type DealerTab =
  | "overview" | "quotes" | "orders" | "invoices" | "price_lists"
  | "favorites" | "quick_order" | "notifications" | "offers"
  | "catalogs" | "settings" | "statement";

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
  { id: "quotes", label: "بحث القطع وعروض الأسعار", icon: Search },
  { id: "orders", label: "الطلبية", icon: ClipboardList },
  { id: "invoices", label: "الفواتير", icon: Receipt },
  { id: "statement", label: "كشف الحساب", icon: FileText },
  { id: "price_lists", label: "كشوفات الأسعار", icon: FileText },
  { id: "favorites", label: "المفضلة", icon: Heart },
];

const secondaryTabs: { id: DealerTab; label: string; icon: typeof LayoutDashboard }[] = [
  { id: "notifications", label: "الإشعارات", icon: Bell },
  { id: "offers", label: "العروض الخاصة", icon: Tag },
  { id: "settings", label: "إعدادات الحساب", icon: Settings },
  { id: "quick_order", label: "طلب سريع", icon: Upload },
];

const tierLabels: Record<string, string> = {
  wholesale_tier1: "تاجر جملة — درجة أولى",
  wholesale_tier2: "تاجر جملة — درجة ثانية",
  corporate: "شركة / مؤسسة",
  retail: "عميل قطاعي",
};

const DealerSidebar = ({ activeTab, onTabChange, dealerName, tier, onSignOut, unreadCount }: DealerSidebarProps) => {
  const renderTab = (tab: typeof mainTabs[0]) => (
    <button
      key={tab.id}
      onClick={() => onTabChange(tab.id)}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all",
        activeTab === tab.id
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-secondary-foreground/60 hover:bg-secondary-foreground/5 hover:text-secondary-foreground"
      )}
    >
      <tab.icon className="w-4 h-4 shrink-0" />
      <span className="truncate">{tab.label}</span>
      {tab.id === "notifications" && unreadCount > 0 && (
        <span className="mr-auto bg-destructive text-destructive-foreground text-[9px] font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {unreadCount}
        </span>
      )}
    </button>
  );

  return (
    <aside className="w-60 bg-secondary border-l border-secondary/80 flex flex-col h-full shrink-0 hidden lg:flex">
      {/* Profile */}
      <div className="p-4 border-b border-secondary-foreground/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-secondary-foreground text-sm truncate">{dealerName}</p>
            <span className="text-[10px] text-secondary-foreground/50 font-medium">
              {tierLabels[tier] || tier}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <p className="text-[10px] font-bold text-secondary-foreground/30 uppercase tracking-widest px-3 pt-2 pb-2">العمليات</p>
        {mainTabs.map(renderTab)}

        <div className="h-px bg-secondary-foreground/10 my-3" />
        <p className="text-[10px] font-bold text-secondary-foreground/30 uppercase tracking-widest px-3 pt-1 pb-2">النظام</p>
        {secondaryTabs.map(renderTab)}
      </nav>

      {/* Sign Out */}
      <div className="p-3 border-t border-secondary-foreground/10">
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] text-secondary-foreground/40 hover:bg-destructive/10 hover:text-destructive transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
};

export default DealerSidebar;
