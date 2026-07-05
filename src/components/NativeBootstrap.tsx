import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { registerDeepLinkListener } from "@/lib/native";

/**
 * Mounts the native-side deep-link listener once, from inside the router
 * context so it has access to `useNavigate`. Renders nothing.
 *
 * On the web this is a no-op (registerDeepLinkListener short-circuits when
 * not on native).
 */
export const NativeBootstrap = () => {
  const navigate = useNavigate();
  useEffect(() => {
    registerDeepLinkListener((path, opts) => navigate(path, opts));
  }, [navigate]);
  return null;
};

export default NativeBootstrap;
