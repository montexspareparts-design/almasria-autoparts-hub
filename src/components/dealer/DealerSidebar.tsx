import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Search, ClipboardList, FileText, Receipt,
  Heart, Upload, Bell, Tag, Settings, LogOut, User, CreditCard,
  ListPlus, Scale, ChevronDown, ChevronUp, Package, Zap,
  BarChart3, ShoppingCart, Shield, Eye
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/contexts/AuthContext";

export type DealerTab =
  | "quotes" | "priced_today" | "orders" | "invoices" | "price_lists"
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
  wholesale_tier1: "Wholesale T1",
  wholesale_tier2: "Wholesale T2",
  corporate: "Corporate",
  retail: "Retail",
};

const SwitchToAdminButton = () => {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  if (!isAdmin) return null;
  return (
    <button
      onClick={() => { localStorage.setItem("almasria_last_role", "admin"); navigate("/admin"); }}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-bold text-primary hover:bg-primary/10 transition-colors"
    >
      <Shield className="w-4 h-4" />
      <span>التبديل لوضع المدير</span>
    </button>
  );
};

const tierColors: Record<string, string> = {
  wholesale_tier1: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  wholesale_tier2: "bg-blue-500/15 text-blue-700 dark:text-blue-400",
  corporate: "bg-violet-500/15 text-violet-700 dark:text-violet-400",
  retail: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400",
};

interface NavItem {
  id: DealerTab;
  label: string;
  icon: typeof LayoutDashboard;
  badge?: number;
  iconColor?: string;
  iconBg?: string;
}

interface NavGroup {
  label: string;
  items: NavItem[];
  defaultOpen?: boolean;
}

const DealerSidebar = ({ activeTab, onTabChange, dealerName, tier, onSignOut, unreadCount }: DealerSidebarProps) => {
  const navGroups: NavGroup[] = [
    {
      label: "القائمة الرئيسية",
      defaultOpen: true,
      items: [
        { id: "quotes", label: "ابحث عن القطعة", icon: Search, iconColor: "text-slate-600 dark:text-slate-400", iconBg: "bg-slate-500/10" },
        { id: "priced_today", label: "عرض سعر", icon: Eye, iconColor: "text-primary", iconBg: "bg-primary/10" },
        { id: "price_lists", label: "كشوفات المصرية", icon: FileText, iconColor: "text-amber-600", iconBg: "bg-amber-500/10" },
      ],
    },
    {
      label: "الطلبات والمعاملات",
      defaultOpen: true,
      items: [
        { id: "orders", label: "طلباتي", icon: ClipboardList, iconColor: "text-slate-600 dark:text-slate-400", iconBg: "bg-slate-500/10" },
        { id: "payment", label: "الدفع الإلكتروني", icon: CreditCard, iconColor: "text-emerald-600", iconBg: "bg-emerald-500/10" },
        { id: "invoices", label: "الفواتير", icon: Receipt, iconColor: "text-violet-600", iconBg: "bg-violet-500/10" },
        { id: "statement", label: "كشف الحساب", icon: BarChart3, iconColor: "text-blue-600", iconBg: "bg-blue-500/10" },
      ],
    },
    {
      label: "الأدوات",
      defaultOpen: true,
      items: [
        { id: "shopping_lists", label: "قوائم الشراء", icon: ListPlus, iconColor: "text-blue-600", iconBg: "bg-blue-500/10" },
        { id: "compare", label: "مقارنة المنتجات", icon: Scale, iconColor: "text-teal-600", iconBg: "bg-teal-500/10" },
        { id: "stock_alerts", label: "تنبيهات المخزون", icon: Package, iconColor: "text-orange-600", iconBg: "bg-orange-500/10" },
      ],
    },
    {
      label: "الإشعارات والعروض",
      defaultOpen: false,
      items: [
        { id: "notifications", label: "الإشعارات", icon: Bell, badge: unreadCount, iconColor: "text-sky-600", iconBg: "bg-sky-500/10" },
        { id: "offers", label: "العروض الخاصة", icon: Tag, iconColor: "text-pink-600", iconBg: "bg-pink-500/10" },
      ],
    },
  ];

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    navGroups.forEach(g => { initial[g.label] = g.defaultOpen ?? false; });
    // Also open the group that contains the active tab
    navGroups.forEach(g => {
      if (g.items.some(i => i.id === activeTab)) initial[g.label] = true;
    });
    return initial;
  });

  const toggleGroup = (label: string) => {
    setOpenGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  return (
    <aside className="w-[250px] bg-card/50 backdrop-blur-sm border-l border-border/20 flex flex-col h-full shrink-0 hidden lg:flex">
      {/* Profile Card */}
      <div className="p-4">
        <div className="bg-gradient-to-br from-secondary to-secondary/80 rounded-2xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-sm flex items-center justify-center ring-2 ring-white/10">
              <User className="w-4.5 h-4.5 text-secondary-foreground/80" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-secondary-foreground text-sm truncate leading-tight">{dealerName}</p>
              <span className={cn(
                "inline-flex items-center text-[9px] font-bold mt-1 px-2 py-0.5 rounded-md",
                tierColors[tier] || "bg-muted text-muted-foreground"
              )}>
                {tierLabels[tier] || tier}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 pb-3 overflow-y-auto scrollbar-thin space-y-1">
        {navGroups.map((group) => {
          const isOpen = openGroups[group.label] ?? false;
          const hasActiveItem = group.items.some(i => i.id === activeTab);

          return (
            <div key={group.label}>
              <button
                onClick={() => toggleGroup(group.label)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 rounded-lg text-[11px] font-bold uppercase tracking-wider transition-colors",
                  hasActiveItem
                    ? "text-foreground/70"
                    : "text-muted-foreground/50 hover:text-muted-foreground/70"
                )}
              >
                <span>{group.label}</span>
                {isOpen
                  ? <ChevronUp className="w-3 h-3 opacity-40" />
                  : <ChevronDown className="w-3 h-3 opacity-40" />
                }
              </button>

              {isOpen && (
                <div className="space-y-0.5 mt-0.5 mb-2">
                  {group.items.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        onClick={() => onTabChange(item.id)}
                        className={cn(
                          "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] transition-all duration-150 group/item relative",
                          isActive
                            ? "bg-primary/10 text-primary font-bold"
                            : "text-foreground/65 hover:bg-muted/50 hover:text-foreground font-medium"
                        )}
                      >
                        {/* Active indicator bar */}
                        {isActive && (
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-primary rounded-l-full" />
                        )}

                        <span className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors",
                          isActive
                            ? "bg-primary/15"
                            : item.iconBg || "bg-muted/50"
                        )}>
                          <item.icon className={cn(
                            "w-4 h-4 transition-colors",
                            isActive
                              ? "text-primary"
                              : item.iconColor || "text-muted-foreground/60"
                          )} />
                        </span>
                        <span className="truncate">{item.label}</span>

                        {(item.badge || 0) > 0 && (
                          <span className="mr-auto bg-primary text-primary-foreground text-[9px] font-bold rounded-md min-w-[20px] h-5 flex items-center justify-center px-1.5">
                            {item.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-3 space-y-1">
        <button
          onClick={() => onTabChange("settings")}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium transition-colors",
            activeTab === "settings"
              ? "bg-primary/10 text-primary font-bold"
              : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
          )}
        >
          <Settings className="w-4 h-4" />
          <span>الإعدادات</span>
        </button>
        <SwitchToAdminButton />
        <button
          onClick={onSignOut}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-[13px] font-medium text-muted-foreground/60 hover:bg-destructive/5 hover:text-destructive transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>تسجيل الخروج</span>
        </button>
      </div>
    </aside>
  );
};

export default DealerSidebar;
