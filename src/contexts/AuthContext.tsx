import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DealerAccount {
  id: string;
  tier: string;
  is_active: boolean;
  custom_discount: number | null;
  min_order_amount: number | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  dealerAccount: DealerAccount | null;
  isDealer: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  dealerAccount: null,
  isDealer: false,
  isAdmin: false,
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const SESSION_KEY = "dealer_session_id";

function generateSessionId() {
  return crypto.randomUUID();
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [dealerAccount, setDealerAccount] = useState<DealerAccount | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const sessionCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();

  const clearSessionCheck = useCallback(() => {
    if (sessionCheckRef.current) {
      clearInterval(sessionCheckRef.current);
      sessionCheckRef.current = null;
    }
  }, []);

  // Register this device's session for a dealer
  const registerDealerSession = useCallback(async (dealerId: string) => {
    const sessionId = generateSessionId();
    localStorage.setItem(SESSION_KEY, sessionId);

    await supabase
      .from("dealer_accounts")
      .update({ active_session_id: sessionId } as any)
      .eq("id", dealerId);

    return sessionId;
  }, []);

  // Check if current session is still valid
  const startSessionMonitor = useCallback((dealerId: string) => {
    clearSessionCheck();

    sessionCheckRef.current = setInterval(async () => {
      const localSessionId = localStorage.getItem(SESSION_KEY);
      if (!localSessionId) return;

      const { data } = await supabase
        .from("dealer_accounts")
        .select("active_session_id")
        .eq("id", dealerId)
        .maybeSingle();

      if (data && (data as any).active_session_id && (data as any).active_session_id !== localSessionId) {
        // Another device logged in — force logout
        clearSessionCheck();
        clearAllAuthStorage();
        toast({
          title: "تم تسجيل الدخول من جهاز آخر",
          description: "تم تسجيل خروجك تلقائياً لأن حسابك مفتوح على جهاز آخر.",
          variant: "destructive",
        });
        await supabase.auth.signOut();
      }
    }, 10000); // Check every 10 seconds
  }, [clearSessionCheck, toast]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // On password change, clear remember-me flag
        if (event === "USER_UPDATED") {
          localStorage.removeItem("almasria_remember_me");
        }

        setSession(session);
        setUser(session?.user ?? null);

        if (session?.user) {
          setTimeout(async () => {
            const { data: dealer } = await supabase
              .from("dealer_accounts")
              .select("id, tier, is_active, custom_discount, min_order_amount")
              .eq("user_id", session.user.id)
              .eq("is_active", true)
              .maybeSingle();
            setDealerAccount(dealer);

            // If dealer, register session and start monitoring
            if (dealer) {
              await registerDealerSession(dealer.id);
              startSessionMonitor(dealer.id);
            }

            // Check admin role
            const { data: roles } = await supabase
              .from("user_roles")
              .select("role")
              .eq("user_id", session.user.id);
            setIsAdmin(roles?.some((r) => r.role === "admin") ?? false);
          }, 0);
        } else {
          setDealerAccount(null);
          setIsAdmin(false);
          clearSessionCheck();
          localStorage.removeItem(SESSION_KEY);
        }

        setLoading(false);
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
      clearSessionCheck();
    };
  }, []);

  const signOut = async () => {
    clearSessionCheck();
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem("almasria_remember_me");
    await supabase.auth.signOut();
    setDealerAccount(null);
    setIsAdmin(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        dealerAccount,
        isDealer: !!dealerAccount,
        isAdmin,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
