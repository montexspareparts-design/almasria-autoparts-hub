import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { Droplets, Home, LayoutGrid, User, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDealerCart } from "@/hooks/useDealerCart";
import { haptic } from "@/lib/haptics";
import "./theme.css";

const OilsHome = lazy(() => import("./pages/OilsHome"));
const OilsCatalog = lazy(() => import("./pages/OilsCatalog"));
const OilsQuickOrder = lazy(() => import("./pages/OilsQuickOrder"));
const OilsAccount = lazy(() => import("./pages/OilsAccount"));
const OilsLogin = lazy(() => import("./pages/OilsLogin"));

const TABS = [
  { path: "/oils", label: "الرئيسية", icon: Home, end: true },
  { path: "/oils/catalog", label: "الكتالوج", icon: LayoutGrid, end: false },
  { path: "/oils/quick", label: "طلب سريع", icon: Zap, end: false },
  { path: "/oils/account", label: "حسابي", icon: User, end: false },
];

const Fallback = () => (
  <div className="min-h-[60dvh] grid place-items-center">
    <Droplets className="w-8 h-8 animate-pulse" style={{ color: "hsl(var(--oils-accent))" }} />
  </div>
);

const TabBar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { itemCount } = useDealerCart();

  return (
    <nav className="oils-tabbar" aria-label="تنقل تطبيق الزيوت">
      <div className="grid grid-cols-4">
        {TABS.map((tab) => {
          const active = tab.end ? location.pathname === tab.path : location.pathname.startsWith(tab.path);
          const Icon = tab.icon;
          return (
            <button
              key={tab.path}
              type="button"
              className={`oils-tab ${active ? "oils-tab--active" : ""}`}
              onClick={() => { void haptic("light"); navigate(tab.path); }}
            >
              <span className="relative">
                <Icon className="w-5 h-5" />
                {tab.path === "/oils/quick" && itemCount > 0 && (
                  <span
                    className="absolute -top-1.5 -left-2 min-w-[15px] h-[15px] px-0.5 rounded-full grid place-items-center text-[8.5px] font-extrabold"
                    style={{ background: "hsl(var(--oils-accent))", color: "hsl(210 62% 9%)" }}
                  >
                    {itemCount > 99 ? "99+" : itemCount}
                  </span>
                )}
              </span>
              {tab.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

/**
 * تطبيق جملة الزيوت — قسم مستقل بالكامل (هوية بصرية منفصلة) يعمل على
 * نفس البنية التحتية: حساب التاجر، السلة، الطلبات، والمزامنة مع الفيصل.
 */
const OilsApp = () => {
  const { user, dealerAccount, loading, postAuthState } = useAuth();

  if (loading || (user && postAuthState !== "READY")) {
    return (
      <div className="oils-app grid place-items-center">
        <Droplets className="w-10 h-10 animate-pulse" style={{ color: "hsl(var(--oils-accent))" }} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="oils-app">
        <Suspense fallback={<Fallback />}>
          <OilsLogin />
        </Suspense>
      </div>
    );
  }

  // مسجل لكن ليس تاجرًا نشطًا → صفحة انتظار الاعتماد
  if (!dealerAccount?.is_active) {
    return (
      <div className="oils-app grid place-items-center px-6" dir="rtl">
        <div className="oils-card p-6 text-center max-w-sm">
          <Droplets className="w-10 h-10 mx-auto mb-3" style={{ color: "hsl(var(--oils-accent))" }} />
          <h2 className="text-[16px] font-extrabold mb-2">حسابك قيد المراجعة</h2>
          <p className="text-[12px] leading-relaxed" style={{ color: "hsl(var(--oils-muted))" }}>
            تطبيق جملة الزيوت مخصص للتجار المعتمدين. سيتم تفعيل حسابك خلال 48 ساعة، أو تواصل معنا للاستعجال.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="oils-app">
      <Suspense fallback={<Fallback />}>
        <Routes>
          <Route index element={<OilsHome />} />
          <Route path="catalog" element={<OilsCatalog />} />
          <Route path="quick" element={<OilsQuickOrder />} />
          <Route path="account" element={<OilsAccount />} />
          <Route path="login" element={<Navigate to="/oils" replace />} />
          <Route path="*" element={<Navigate to="/oils" replace />} />
        </Routes>
      </Suspense>
      <TabBar />
    </div>
  );
};

export default OilsApp;
