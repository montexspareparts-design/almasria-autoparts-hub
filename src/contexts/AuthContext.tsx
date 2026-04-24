import { createContext, useContext, useEffect, useState, useRef, useCallback, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import CompleteProfileDialog from "@/components/CompleteProfileDialog";
import RoleSelectionDialog from "@/components/RoleSelectionDialog";

interface DealerAccount {
  id: string;
  tier: string;
  is_active: boolean;
  custom_discount: number | null;
  min_order_amount: number | null;
  vehicle_types: string[];
  business_type?: string | null;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  dealerAccount: DealerAccount | null;
  isDealer: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  dealerAccount: null,
  isDealer: false,
  isAdmin: false,
  isModerator: false,
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
  const [isModerator, setIsModerator] = useState(false);
  const [showCompleteProfile, setShowCompleteProfile] = useState(false);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const sessionCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { toast } = useToast();

  // Central cleanup for ALL auth-related localStorage keys
  const clearAllAuthStorage = useCallback(() => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem("almasria_remember_me");
    localStorage.removeItem("almasria_remember_client");
    localStorage.removeItem("almasria_last_role");
    sessionStorage.removeItem("almasria_session_active");
  }, []);

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
          // Only re-register dealer session on a fresh sign-in, NOT on token refresh
          // (TOKEN_REFRESHED fires during payment flows and would race with the session monitor → false logout)
          const isFreshSignIn = event === "SIGNED_IN" || event === "INITIAL_SESSION";

          setTimeout(async () => {
            try {
              const [{ data: dealer }, { data: roles }] = await Promise.all([
                supabase
                  .from("dealer_accounts")
                  .select("id, tier, is_active, custom_discount, min_order_amount, vehicle_types, business_type")
                  .eq("user_id", session.user.id)
                  .eq("is_active", true)
                  .maybeSingle(),
                supabase
                  .from("user_roles")
                  .select("role")
                  .eq("user_id", session.user.id),
              ]);

              setDealerAccount(dealer as any);

              const hasAdmin = roles?.some((r) => r.role === "admin") ?? false;
              const hasModerator = roles?.some((r) => r.role === "moderator") ?? false;
              setIsAdmin(hasAdmin);
              setIsModerator(hasModerator);

              // If dealer (and not staff), register session and start monitoring
              if (dealer && !hasModerator && !hasAdmin) {
                if (isFreshSignIn) {
                  const existingSessionId = localStorage.getItem(SESSION_KEY);
                  if (!existingSessionId) {
                    await registerDealerSession(dealer.id);
                  }
                }
                startSessionMonitor(dealer.id);
              }

              // Track customer session for CRM (non-staff users only)
              if (!hasAdmin && !hasModerator) {
                import("@/lib/sessionTracker").then(m => m.trackCustomerSession()).catch(() => {});
              }

              // Moderator-only: always go to admin, no role selection
              if (hasModerator && !hasAdmin && dealer) {
                // Moderators don't get dealer access even if they have an account
              } else if (dealer && hasAdmin) {
                const savedRole = localStorage.getItem("almasria_last_role");
                const dismissed = localStorage.getItem("almasria_role_dismissed");
                if (savedRole === "dealer" || savedRole === "admin" || dismissed === "1") {
                  // Auto-redirect to saved role or dismissed — no dialog
                } else {
                  setShowRoleSelection(true);
                }
              }

              // Check if Google user needs to complete phone (only once)
              const COMPLETE_PROFILE_KEY = "complete-profile-shown";
              const provider = session.user.app_metadata?.provider;
              if (provider === "google" && !hasAdmin && !hasModerator && !localStorage.getItem(COMPLETE_PROFILE_KEY)) {
                const { data: profile } = await supabase
                  .from("profiles")
                  .select("phone")
                  .eq("user_id", session.user.id)
                  .maybeSingle();
                if (!profile?.phone) {
                  setShowCompleteProfile(true);
                  localStorage.setItem(COMPLETE_PROFILE_KEY, "1");
                }
              }
            } finally {
              // CRITICAL: only mark loading=false AFTER roles are resolved,
              // otherwise gated routes (e.g. /admin) see isModerator=false and bounce to /dealer.
              setLoading(false);
            }
          }, 0);
        } else {
          setDealerAccount(null);
          setIsAdmin(false);
          setIsModerator(false);
          clearSessionCheck();
          clearAllAuthStorage();
          setLoading(false);
        }
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
    clearAllAuthStorage();
    await supabase.auth.signOut();
    setDealerAccount(null);
    setIsAdmin(false);
    setIsModerator(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        dealerAccount,
        isDealer: !!dealerAccount && !isModerator,
        isAdmin,
        isModerator,
        signOut,
      }}
    >
      {children}
      {user && (
        <CompleteProfileDialog
          open={showCompleteProfile}
          onOpenChange={setShowCompleteProfile}
          userId={user.id}
        />
      )}
      {user && (
        <RoleSelectionDialog
          open={showRoleSelection}
          onOpenChange={setShowRoleSelection}
        />
      )}
    </AuthContext.Provider>
  );
};
