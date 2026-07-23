import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import AddPhonePrompt from "@/components/AddPhonePrompt";
import RoleSelectionDialog from "@/components/RoleSelectionDialog";
import { consumeOAuthReturnTo } from "@/lib/googleOAuth";
import { recordDiagnostic } from "@/lib/runtimeDiagnostics";

export type PostAuthState =
  | "INITIALIZING"
  | "UNAUTHENTICATED"
  | "AUTHENTICATED_LOADING"
  | "NEEDS_PROFILE"
  | "NEEDS_PHONE"
  | "READY"
  | "RECOVERABLE_ERROR";

interface DealerAccount {
  id: string;
  tier: string;
  is_active: boolean;
  custom_discount: number | null;
  min_order_amount: number | null;
  vehicle_types: string[];
  business_type?: string | null;
}

type CanonicalProfile = {
  user_id: string;
  email?: string | null;
  full_name?: string | null;
  phone?: string | null;
  whatsapp_opt_in?: boolean | null;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  postAuthState: PostAuthState;
  profile: CanonicalProfile | null;
  dealerAccount: DealerAccount | null;
  isDealer: boolean;
  isAdmin: boolean;
  isModerator: boolean;
  isReporter: boolean;
  isReporterOnly: boolean;
  signOut: () => Promise<void>;
  refreshAuthProfile: () => Promise<void>;
  isImpersonating: boolean;
  impersonatedUserId: string | null;
  impersonatedName: string | null;
  startImpersonation: (target: { userId: string; name: string }) => void;
  stopImpersonation: () => void;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  loading: true,
  postAuthState: "INITIALIZING",
  profile: null,
  dealerAccount: null,
  isDealer: false,
  isAdmin: false,
  isModerator: false,
  isReporter: false,
  isReporterOnly: false,
  signOut: async () => {},
  refreshAuthProfile: async () => {},
  isImpersonating: false,
  impersonatedUserId: null,
  impersonatedName: null,
  startImpersonation: () => {},
  stopImpersonation: () => {},
});

export const useAuth = () => useContext(AuthContext);

const SESSION_KEY = "dealer_session_id";
const IMPERSONATE_KEY = "almasria_impersonate_v1";
const PHONE_PROMPT_SKIP_KEY = "phone_prompt_skipped_v1";

function generateSessionId() {
  return crypto.randomUUID();
}

interface ImpersonationState {
  userId: string;
  name: string;
}

function readImpersonation(): ImpersonationState | null {
  try {
    const raw = sessionStorage.getItem(IMPERSONATE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed.userId === "string" && typeof parsed.name === "string") return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

const StableAuthScreen = ({ message = "جاري تجهيز حسابك..." }: { message?: string }) => (
  <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
    <div className="flex flex-col items-center gap-3 text-center px-4">
      <div className="w-10 h-10 border-3 border-primary border-t-transparent rounded-full animate-spin" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  </div>
);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [postAuthState, setPostAuthState] = useState<PostAuthState>("INITIALIZING");
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<CanonicalProfile | null>(null);
  const [dealerAccount, setDealerAccount] = useState<DealerAccount | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isModerator, setIsModerator] = useState(false);
  const [isReporter, setIsReporter] = useState(false);
  const [showRoleSelection, setShowRoleSelection] = useState(false);
  const [impersonation, setImpersonation] = useState<ImpersonationState | null>(() => readImpersonation());
  const sessionCheckRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const flowIdRef = useRef(0);
  const lastLoginTargetRef = useRef<string | null>(null);
  const pathnameRef = useRef(location.pathname);

  useEffect(() => {
    pathnameRef.current = location.pathname;
  }, [location.pathname]);

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

  const resetAuthData = useCallback(() => {
    setUser(null);
    setSession(null);
    setProfile(null);
    setDealerAccount(null);
    setIsAdmin(false);
    setIsModerator(false);
    setIsReporter(false);
    setShowRoleSelection(false);
  }, []);

  const registerDealerSession = useCallback(async (dealerId: string) => {
    const sessionId = generateSessionId();
    localStorage.setItem(SESSION_KEY, sessionId);
    await supabase.from("dealer_accounts").update({ active_session_id: sessionId } as never).eq("id", dealerId);
    return sessionId;
  }, []);

  const startSessionMonitor = useCallback((dealerId: string) => {
    clearSessionCheck();
    sessionCheckRef.current = setInterval(async () => {
      try {
        const localSessionId = localStorage.getItem(SESSION_KEY);
        if (!localSessionId) return;
        const { data } = await supabase
          .from("dealer_accounts")
          .select("active_session_id")
          .eq("id", dealerId)
          .maybeSingle();

        if (data && (data as any).active_session_id && (data as any).active_session_id !== localSessionId) {
          clearSessionCheck();
          clearAllAuthStorage();
          toast({
            title: "تم تسجيل الدخول من جهاز آخر",
            description: "تم تسجيل خروجك تلقائياً لأن حسابك مفتوح على جهاز آخر.",
            variant: "destructive",
          });
          await supabase.auth.signOut();
        }
      } catch (error) {
        recordDiagnostic("role", error, "AuthContext.sessionMonitor");
      }
    }, 10000);
  }, [clearAllAuthStorage, clearSessionCheck, toast]);

  const fallbackProfileFromUser = useCallback((authUser: User): CanonicalProfile => {
    const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
    const fullName = String(meta.full_name || meta.name || "").trim();
    const phone = typeof meta.phone === "string" ? meta.phone.trim() : "";
    return {
      user_id: authUser.id,
      email: authUser.email ?? null,
      full_name: fullName || null,
      phone: phone || null,
      whatsapp_opt_in: typeof meta.whatsapp_opt_in === "boolean" ? meta.whatsapp_opt_in : null,
    };
  }, []);

  const ensureProfile = useCallback(async (authUser: User): Promise<CanonicalProfile> => {
    const { data: existing, error: readError } = await supabase
      .from("profiles")
      .select("user_id, email, full_name, phone, whatsapp_opt_in")
      .eq("user_id", authUser.id)
      .maybeSingle();

    if (readError) {
      recordDiagnostic("profile", readError, "AuthContext.profile.read");
      return fallbackProfileFromUser(authUser);
    }

    if (!existing) {
      const meta = (authUser.user_metadata ?? {}) as Record<string, unknown>;
      const { error: upsertError } = await supabase
        .from("profiles")
        .upsert({
          user_id: authUser.id,
          email: authUser.email ?? null,
          full_name: String(meta.full_name || meta.name || ""),
        } as never, { onConflict: "user_id" });

      if (upsertError) {
        recordDiagnostic("profile", upsertError, "AuthContext.profile.upsert");
        return fallbackProfileFromUser(authUser);
      }

      const { data: created, error: rereadError } = await supabase
        .from("profiles")
        .select("user_id, email, full_name, phone, whatsapp_opt_in")
        .eq("user_id", authUser.id)
        .maybeSingle();

      if (rereadError || !created) {
        recordDiagnostic("profile", rereadError || "profile missing after upsert", "AuthContext.profile.reread");
        return fallbackProfileFromUser(authUser);
      }
      return created as CanonicalProfile;
    }

    return existing as CanonicalProfile;
  }, [fallbackProfileFromUser]);

  const resolvePostAuth = useCallback(async (nextSession: Session | null, event = "MANUAL") => {
    const flowId = ++flowIdRef.current;

    if (!nextSession?.user) {
      clearSessionCheck();
      clearAllAuthStorage();
      resetAuthData();
      setPostAuthState("UNAUTHENTICATED");
      return;
    }

    setPostAuthState("AUTHENTICATED_LOADING");
    setSession(nextSession);
    setUser(nextSession.user);

    try {
      const isFreshSignIn = event === "SIGNED_IN" || event === "INITIAL_SESSION" || event === "USER_UPDATED";
      const [canonicalProfile, dealerRes, rolesRes] = await Promise.all([
        ensureProfile(nextSession.user),
        supabase
          .from("dealer_accounts")
          .select("id, tier, is_active, custom_discount, min_order_amount, vehicle_types, business_type")
          .eq("user_id", nextSession.user.id)
          .eq("is_active", true)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", nextSession.user.id),
      ]);

      if (flowId !== flowIdRef.current) return;

      if (dealerRes.error) {
        recordDiagnostic("role", dealerRes.error, "AuthContext.dealer.read");
      }
      if (rolesRes.error) {
        recordDiagnostic("role", rolesRes.error, "AuthContext.roles.read");
      }

      const dealer = dealerRes.error ? null : ((dealerRes.data as DealerAccount | null) ?? null);
      const roles = rolesRes.error ? [] : (rolesRes.data ?? []);
      const hasAdmin = roles.some((r) => r.role === "admin");
      const hasModerator = roles.some((r) => r.role === "moderator");
      const hasReporter = roles.some((r) => (r.role as string) === "reporter");

      setProfile(canonicalProfile);
      setDealerAccount(dealer);
      setIsAdmin(hasAdmin);
      setIsModerator(hasModerator);
      setIsReporter(hasReporter);

      if (dealer && !hasModerator && !hasAdmin) {
        if (isFreshSignIn && !localStorage.getItem(SESSION_KEY)) {
          try {
            await registerDealerSession(dealer.id);
          } catch (error) {
            recordDiagnostic("role", error, "AuthContext.dealer.session.register");
          }
        }
        startSessionMonitor(dealer.id);
      } else {
        clearSessionCheck();
      }

      if (!hasAdmin && !hasModerator) {
        import("@/lib/sessionTracker").then((m) => m.trackCustomerSession()).catch(() => {});
      }

      const phoneMissing = !canonicalProfile.phone || canonicalProfile.phone.trim() === "";
      const phoneLogin = (nextSession.user.email || "").endsWith("@phone.almasria.local");
      const skippedPhone = localStorage.getItem(PHONE_PROMPT_SKIP_KEY) === nextSession.user.id;

      if (phoneMissing && !phoneLogin && !skippedPhone && !hasAdmin && !hasModerator) {
        setPostAuthState("NEEDS_PHONE");
        return;
      }

      if (dealer && hasAdmin) {
        const savedRole = localStorage.getItem("almasria_last_role");
        const dismissed = localStorage.getItem("almasria_role_dismissed");
        const isAlreadyOnAdminRoute = pathnameRef.current.startsWith("/admin");
        if (savedRole !== "dealer" && savedRole !== "admin" && dismissed !== "1" && !isAlreadyOnAdminRoute) {
          setShowRoleSelection(true);
        }
      }

      setPostAuthState("READY");
    } catch (error) {
      if (flowId !== flowIdRef.current) return;
      recordDiagnostic("pauth", error, "AuthContext.resolvePostAuth");
      setPostAuthState("RECOVERABLE_ERROR");
    }
  }, [clearAllAuthStorage, clearSessionCheck, ensureProfile, registerDealerSession, resetAuthData, startSessionMonitor]);

  const refreshAuthProfile = useCallback(async () => {
    const { data: { session: currentSession }, error } = await supabase.auth.getSession();
    if (error) {
      recordDiagnostic("pauth", error, "AuthContext.refresh.getSession");
      setPostAuthState("RECOVERABLE_ERROR");
      return;
    }
    await resolvePostAuth(currentSession, "PROFILE_REFRESH");
  }, [resolvePostAuth]);

  const resolvePostAuthRef = useRef(resolvePostAuth);

  useEffect(() => {
    resolvePostAuthRef.current = resolvePostAuth;
  }, [resolvePostAuth]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === "USER_UPDATED") localStorage.removeItem("almasria_remember_me");
      void resolvePostAuthRef.current(nextSession, event);
    });

    supabase.auth.getSession()
      .then(({ data: { session: currentSession }, error }) => {
        if (error) {
          recordDiagnostic("pauth", error, "AuthContext.initial.getSession");
          setPostAuthState("RECOVERABLE_ERROR");
          return;
        }
        void resolvePostAuthRef.current(currentSession, "INITIAL_SESSION");
      })
      .catch((error) => {
        recordDiagnostic("pauth", error, "AuthContext.initial.catch");
        setPostAuthState("RECOVERABLE_ERROR");
      });

    return () => {
      subscription.unsubscribe();
      clearSessionCheck();
      flowIdRef.current += 1;
    };
  }, [clearSessionCheck]);

  const startImpersonation = useCallback((target: { userId: string; name: string }) => {
    const next: ImpersonationState = { userId: target.userId, name: target.name };
    sessionStorage.setItem(IMPERSONATE_KEY, JSON.stringify(next));
    setImpersonation(next);
  }, []);

  const stopImpersonation = useCallback(() => {
    sessionStorage.removeItem(IMPERSONATE_KEY);
    setImpersonation(null);
  }, []);

  const signOut = useCallback(async () => {
    clearSessionCheck();
    clearAllAuthStorage();
    sessionStorage.removeItem(IMPERSONATE_KEY);
    setImpersonation(null);
    resetAuthData();
    setPostAuthState("UNAUTHENTICATED");
    await supabase.auth.signOut();
  }, [clearAllAuthStorage, clearSessionCheck, resetAuthData]);

  const isImpersonating = !!impersonation && isAdmin;
  const effectiveIsAdmin = isImpersonating ? false : isAdmin;
  const effectiveIsModerator = isImpersonating ? true : isModerator;
  const effectiveIsDealer = !!dealerAccount && !effectiveIsModerator && !effectiveIsAdmin;
  const isReporterOnly = isReporter && !isAdmin && !isModerator;

  const routeForReadyUser = useCallback((oauthReturnTo: string | null) => {
    if (isReporterOnly) return "/admin/daily-report";
    if (effectiveIsAdmin || effectiveIsModerator) return "/admin";
    if (effectiveIsDealer) return "/dealer";
    if (oauthReturnTo && oauthReturnTo !== "/auth" && oauthReturnTo !== "/dealer-login") return oauthReturnTo;
    return "/";
  }, [effectiveIsAdmin, effectiveIsDealer, effectiveIsModerator, isReporterOnly]);

  useEffect(() => {
    if (postAuthState !== "READY" || !user) return;
    if (location.pathname !== "/auth" && location.pathname !== "/dealer-login" && location.pathname !== "/auth-callback") return;

    if (
      location.pathname === "/dealer-login" &&
      !isReporterOnly &&
      !effectiveIsAdmin &&
      !effectiveIsModerator &&
      !effectiveIsDealer
    ) {
      return;
    }

    const oauthReturnTo = consumeOAuthReturnTo();
    const target = routeForReadyUser(oauthReturnTo);
    if (lastLoginTargetRef.current === target && location.pathname === target) return;
    lastLoginTargetRef.current = target;
    navigate(target, { replace: true });
  }, [effectiveIsAdmin, effectiveIsDealer, effectiveIsModerator, isReporterOnly, location.pathname, navigate, postAuthState, routeForReadyUser, user]);

  const contextValue = useMemo<AuthContextType>(() => ({
    user,
    session,
    loading: postAuthState === "INITIALIZING" || postAuthState === "AUTHENTICATED_LOADING",
    postAuthState,
    profile,
    dealerAccount,
    isDealer: effectiveIsDealer,
    isAdmin: effectiveIsAdmin,
    isModerator: effectiveIsModerator,
    isReporter,
    isReporterOnly,
    signOut,
    refreshAuthProfile,
    isImpersonating,
    impersonatedUserId: impersonation?.userId ?? null,
    impersonatedName: impersonation?.name ?? null,
    startImpersonation,
    stopImpersonation,
  }), [dealerAccount, effectiveIsAdmin, effectiveIsDealer, effectiveIsModerator, impersonation?.name, impersonation?.userId, isImpersonating, isReporter, isReporterOnly, postAuthState, profile, refreshAuthProfile, session, signOut, startImpersonation, stopImpersonation, user]);

  if (postAuthState === "INITIALIZING" || postAuthState === "AUTHENTICATED_LOADING") {
    return (
      <AuthContext.Provider value={contextValue}>
        <StableAuthScreen />
      </AuthContext.Provider>
    );
  }

  if (postAuthState === "NEEDS_PHONE" && user) {
    return (
      <AuthContext.Provider value={contextValue}>
        <StableAuthScreen message="أكمل رقم الهاتف لتفعيل الحساب" />
        <AddPhonePrompt
          open
          userId={user.id}
          onCompleted={refreshAuthProfile}
          onSkipped={refreshAuthProfile}
        />
      </AuthContext.Provider>
    );
  }

  if (postAuthState === "RECOVERABLE_ERROR") {
    return (
      <AuthContext.Provider value={contextValue}>
        <div className="min-h-screen bg-background flex items-center justify-center p-4" dir="rtl">
          <div className="max-w-sm text-center space-y-3">
            <h1 className="text-lg font-bold text-foreground">تعذر تجهيز الحساب</h1>
            <p className="text-sm text-muted-foreground">اتصال الشبكة أو بيانات الحساب لم تكتمل. جرّب مرة أخرى.</p>
            <button className="h-10 px-4 rounded-lg bg-primary text-primary-foreground font-bold" onClick={refreshAuthProfile}>
              إعادة المحاولة
            </button>
          </div>
        </div>
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      {user && (
        <RoleSelectionDialog
          open={showRoleSelection}
          onOpenChange={setShowRoleSelection}
        />
      )}
    </AuthContext.Provider>
  );
};