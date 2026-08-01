import { ReactNode } from "react";

/**
 * Stable route host.
 *
 * Route-level AnimatePresence must not wrap a Suspense-driven <Routes> tree:
 * with `mode="wait"`, a lazy route can suspend after the outgoing route has
 * already been removed, leaving the host empty indefinitely in WKWebView and
 * some Chromium builds. Keep route transitions synchronous; components may
 * still animate their own local content safely.
 */
const AnimatedRoutes = ({ children }: { children: ReactNode }) => {
  return <div className="min-h-screen bg-background">{children}</div>;
};

export default AnimatedRoutes;

