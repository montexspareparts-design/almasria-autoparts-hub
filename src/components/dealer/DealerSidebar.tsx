import {
  LayoutDashboard, Search, ClipboardList, FileText, Receipt,
  Heart, Upload, Bell, Tag, Settings, LogOut, User, CreditCard, Star
} from "lucide-react";
import { cn } from "@/lib/utils";

export type DealerTab =
  | "overview" | "quotes" | "orders" | "invoices" | "price_lists"
  | "favorites" | "quick_order" | "notifications" | "offers"
  | "catalogs" | "settings" | "statement" | "payment" | "stock_alerts";

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

  const renderItem = (id: DealerTab, label: string, Icon: typeof LayoutDashboard, options?: { badge?: number; highlight?: boolean; emoji?: string }) => {
    const isActive = activeTab === id;
    const isHighlight = options?.highlight && !isActive;
    return (
      <button
        key={id}
        onClick={() => onTabChange(id)}
        className={cn(
          "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all",
          isActive
            ? "bg-primary text-primary-foreground shadow-md"
            : isHighlight
              ? "bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 font-bold"
              : "text-secondary-foreground/70 hover:bg-secondary-foreground/5 hover:text-secondary-foreground"
        )}
      >
        {options?.emoji ? (
          <span className="text-lg w-5 text-center shrink-0">{options.emoji}</span>
        ) : (
          <Icon className="w-5 h-5 shrink-0" />
        )}
        <span className="truncate">{label}</span>
        {(options?.badge || 0) > 0 && (
          <span className="mr-auto bg-destructive text-destructive-foreground text-[10px] font-bold rounded-full min-w-[22px] h-[22px] flex items-center justify-center px-1">
            {options!.badge}
          </span>
        )}
      </button>
    );
  };

  return (
    <aside className="w-64 bg-secondary border-l border-secondary/80 flex flex-col h-full shrink-0 hidden lg:flex">
      {/* Profile */}
      <div className="p-4 border-b border-secondary-foreground/10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-primary/20 flex items-center justify-center">
            <User className="w-5 h-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-secondary-foreground text-sm truncate">{dealerName}</p>
            <span className="text-[11px] text-secondary-foreground/50 font-medium">
              {tierLabels[tier] || tier}
            </span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {/* Main Actions - most used */}
        <p className="text-[10px] font-bold text-secondary-foreground/30 uppercase tracking-widest px-3 pt-2 pb-1.5">الرئيسية</p>
        {renderItem("overview", "لوحة التحكم", LayoutDashboard, { emoji: "🏠" })}
        {renderItem("quotes", "اطلب قطع غيار", Search, { emoji: "🔍" })}
        {renderItem("price_lists", "كشوفات الأسعار", FileText, { highlight: true, emoji: "📋" })}

        <div className="h-px bg-secondary-foreground/10 my-2.5" />
        <p className="text-[10px] font-bold text-secondary-foreground/30 uppercase tracking-widest px-3 pt-1 pb-1.5">طلباتي</p>
        {renderItem("orders", "الطلبية", ClipboardList, { emoji: "📦" })}
        {renderItem("payment", "الدفع الإلكتروني", CreditCard, { highlight: true, emoji: "💳" })}
        {renderItem("invoices", "الفواتير", Receipt, { emoji: "🧾" })}
        {renderItem("statement", "كشف الحساب", CreditCard, { emoji: "💰" })}

        <div className="h-px bg-secondary-foreground/10 my-2.5" />
        <p className="text-[10px] font-bold text-secondary-foreground/30 uppercase tracking-widest px-3 pt-1 pb-1.5">المزيد</p>
        {renderItem("favorites", "المفضلة", Heart, { emoji: "❤️" })}
        {renderItem("stock_alerts", "تنبيهات المخزون", Bell, { emoji: "🔔" })}
        {renderItem("notifications", "الإشعارات", Bell, { badge: unreadCount, emoji: "📬" })}
        {renderItem("offers", "العروض الخاصة", Tag, { emoji: "🎁" })}
        {renderItem("quick_order", "طلب سريع (Excel)", Upload, { emoji: "📤" })}
        {renderItem("settings", "إعدادات الحساب", Settings, { emoji: "⚙️" })}
      </nav>

      {/* Sign Out */}
      <div className="p-3 border-t border-secondary-foreground/10">
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm text-secondary-foreground/40 hover:bg-destructive/10 hover:text-destructive transition-all"
        >
          <span className="text-lg w-5 text-center">🚪</span>
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
};

export default DealerSidebar;
