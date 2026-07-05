import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { registerDeepLinkListener } from "@/lib/native";
import { supabase } from "@/integrations/supabase/client";
import { registerNativePush } from "@/lib/pushNotifications";
import { isNativePlatform } from "@/lib/native";

/**
 * Mounts native-side listeners once, from inside the router context so it
 * has access to `useNavigate`. Renders nothing.
 *
 *  - Deep-link listener (Universal Links + custom scheme)
 *  - Native APNs push registration when the user is logged in
 *
 * On the web everything short-circuits and is a no-op.
 */
export const NativeBootstrap = () => {
  const navigate = useNavigate();

  useEffect(() => {
    registerDeepLinkListener((path, opts) => navigate(path, opts));
  }, [navigate]);

  useEffect(() => {
    if (!isNativePlatform()) return;

    // Register push whenever there is a logged-in user (initial + on sign-in).
    const tryRegister = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        void registerNativePush();
      }
    };
    void tryRegister();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "SIGNED_IN" || event === "TOKEN_REFRESHED") {
          void tryRegister();
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return null;
};

export default NativeBootstrap;
