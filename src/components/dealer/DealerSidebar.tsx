import {
  LayoutDashboard, Search, ClipboardList, FileText, Receipt,
  Heart, Upload, Bell, Tag, Settings, LogOut, User, CreditCard,
  ListPlus, Scale, Package
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

  const renderItem = (
    id: DealerTab,
    label: string,
    Icon: typeof LayoutDashboard,
    options?: { badge?: number; highlight?: boolean }
  ) => {
    const isActive = activeTab === id;
    return (
      <button
        key={id}
        onClick={() => onTabChange(id)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-foreground text-background font-bold"
            : options?.highlight
              ? "text-primary font-bold hover:bg-primary/5"
              : "text-foreground/70 hover:bg-muted/60 hover:text-foreground"
        )}
      >
        <div className={cn(
          "w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors",
          isActive
            ? "bg-background/20"
            : options?.highlight
              ? "bg-primary/10"
              : "bg-transparent"
        )}>
          <Icon className={cn(
            "w-[18px] h-[18px]",
            isActive
              ? "text-background"
              : options?.highlight
                ? "text-primary"
                : "text-muted-foreground"
          )} />
        </div>
        <span className="truncate">{label}</span>
        {(options?.badge || 0) > 0 && (
          <span className="mr-auto bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center px-1.5">
            {options!.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className="w-64 bg-card border-l border-border/30 flex flex-col h-full shrink-0 hidden lg:flex">
      {/* Profile */}
      <div className="px-5 py-4 border-b border-border/20">
        <div className="flex items-center gap-3 justify-end">
          <div className="text-left min-w-0 flex-1">
            <p className="font-bold text-foreground text-[15px] truncate">{dealerName}</p>
            <span className="text-[11px] text-muted-foreground font-medium leading-tight">
              {tierLabels[tier] || tier}
            </span>
          </div>
          <div className="w-11 h-11 rounded-xl bg-muted/60 flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto scrollbar-thin">
        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] px-3 pt-2 pb-2">الرئيسية</p>
        {renderItem("overview", "لوحة التحكم", LayoutDashboard)}
        {renderItem("quotes", "اطلب قطع غيار", Search)}
        {renderItem("price_lists", "كشوفات المصرية", FileText, { highlight: true })}

        <div className="h-px bg-border/20 my-3 mx-2" />
        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] px-3 pt-1 pb-2">طلباتي</p>
        {renderItem("orders", "الطلبية", ClipboardList)}
        {renderItem("payment", "الدفع الإلكتروني", CreditCard, { highlight: true })}
        {renderItem("invoices", "الفواتير", Receipt)}
        {renderItem("statement", "كشف الحساب", CreditCard)}

        <div className="h-px bg-border/20 my-3 mx-2" />
        <p className="text-[10px] font-bold text-muted-foreground/60 uppercase tracking-[0.15em] px-3 pt-1 pb-2">المزيد</p>
        {renderItem("favorites", "المفضلة", Heart)}
        {renderItem("shopping_lists", "قوائم الشراء", ListPlus)}
        {renderItem("compare", "مقارنة المنتجات", Scale)}
        {renderItem("stock_alerts", "تنبيهات المخزون", Bell)}
        {renderItem("notifications", "الإشعارات", Bell, { badge: unreadCount })}
        {renderItem("offers", "العروض الخاصة", Tag)}
        {renderItem("quick_order", "طلب سريع (Excel)", Upload)}
        {renderItem("settings", "إعدادات الحساب", Settings)}
      </nav>

      {/* Sign Out */}
      <div className="p-3 border-t border-border/20">
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-muted-foreground hover:bg-destructive/5 hover:text-destructive transition-all"
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center">
            <LogOut className="w-[18px] h-[18px]" />
          </div>
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
};

export default DealerSidebar;
