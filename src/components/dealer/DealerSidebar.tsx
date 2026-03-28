import {
  LayoutDashboard, Search, ClipboardList, FileText, Receipt,
  Heart, Upload, Bell, Tag, Settings, LogOut, User, CreditCard, Star,
  ListPlus, Scale
} from "lucide-react";
import { cn } from "@/lib/utils";

export type DealerTab =
  | "overview" | "quotes" | "orders" | "invoices" | "price_lists"
  | "favorites" | "quick_order" | "notifications" | "offers"
  | "catalogs" | "settings" | "statement" | "payment" | "stock_alerts"
  | "shopping_lists" | "compare";

interface DealerSidebarProps {
  activeTab: DealerTab;
  onTabChange: (tab: DealerTab) => void;
  dealerName: string;
  tier: string;
  onSignOut: () => void;
  unreadCount: number;
}

const tierLabels: Record<string, string> = {
  wholesale_tier1: "تاجر جملة — درجة أولى",
  wholesale_tier2: "تاجر جملة — درجة ثانية",
  corporate: "شركة / مؤسسة",
  retail: "عميل قطاعي",
};

const DealerSidebar = ({ activeTab, onTabChange, dealerName, tier, onSignOut, unreadCount }: DealerSidebarProps) => {

  const renderItem = (id: DealerTab, label: string, Icon: typeof LayoutDashboard, options?: { badge?: number; highlight?: boolean }) => {
    const isActive = activeTab === id;
    return (
      <button
        key={id}
        onClick={() => onTabChange(id)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-200",
          isActive
            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
            : options?.highlight
              ? "text-primary bg-primary/5 hover:bg-primary/10 font-semibold"
              : "text-foreground/60 hover:bg-muted hover:text-foreground"
        )}
      >
        <Icon className={cn("w-4 h-4 shrink-0", isActive ? "text-primary-foreground" : options?.highlight ? "text-primary" : "text-muted-foreground")} />
        <span className="truncate">{label}</span>
        {(options?.badge || 0) > 0 && (
          <span className="mr-auto bg-primary text-primary-foreground text-[9px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
            {options!.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className="w-60 bg-card border-l border-border/40 flex flex-col h-full shrink-0 hidden lg:flex shadow-sm">
      {/* Profile */}
      <div className="p-4 border-b border-border/30">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
            <User className="w-4.5 h-4.5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-foreground text-sm truncate">{dealerName}</p>
            <span className="text-[10px] text-muted-foreground font-medium">
              {tierLabels[tier] || tier}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-2.5 space-y-0.5 overflow-y-auto">
        <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-[0.15em] px-3 pt-3 pb-1.5">الرئيسية</p>
        {renderItem("overview", "لوحة التحكم", LayoutDashboard)}
        {renderItem("quotes", "اطلب قطع غيار", Search)}
        {renderItem("price_lists", "كشوفات المصرية", FileText, { highlight: true })}

        <div className="h-px bg-border/30 my-2" />
        <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-[0.15em] px-3 pt-1 pb-1.5">طلباتي</p>
        {renderItem("orders", "الطلبية", ClipboardList)}
        {renderItem("payment", "الدفع الإلكتروني", CreditCard, { highlight: true })}
        {renderItem("invoices", "الفواتير", Receipt)}
        {renderItem("statement", "كشف الحساب", CreditCard)}

        <div className="h-px bg-border/30 my-2" />
        <p className="text-[9px] font-bold text-muted-foreground/50 uppercase tracking-[0.15em] px-3 pt-1 pb-1.5">المزيد</p>
        {renderItem("favorites", "المفضلة", Heart)}
        {renderItem("stock_alerts", "تنبيهات المخزون", Bell)}
        {renderItem("notifications", "الإشعارات", Bell, { badge: unreadCount })}
        {renderItem("offers", "العروض الخاصة", Tag)}
        {renderItem("quick_order", "طلب سريع (Excel)", Upload)}
        {renderItem("settings", "إعدادات الحساب", Settings)}
      </nav>

      {/* Sign Out */}
      <div className="p-2.5 border-t border-border/30">
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-muted-foreground hover:bg-destructive/5 hover:text-destructive transition-all"
        >
          <LogOut className="w-4 h-4" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
};

export default DealerSidebar;