import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { registerDeepLinkListener } from "@/lib/native";

/**
 * Mounts native-side listeners once, from inside the router context so it
 * has access to `useNavigate`. Renders nothing.
 *
 *  - Deep-link listener (Universal Links + custom scheme)
 * On the web everything short-circuits and is a no-op.
 */
export const NativeBootstrap = () => {
  const navigate = useNavigate();

  useEffect(() => {
    registerDeepLinkListener((path, opts) => navigate(path, opts));
  }, [navigate]);

  return null;
};

export default NativeBootstrap;
