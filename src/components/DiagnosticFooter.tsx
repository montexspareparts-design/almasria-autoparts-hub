import { useEffect, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { getBuildCommit, getBuildNumber, isDiagnosticMode } from "@/lib/runtimeDiagnostics";

/**
 * Visible only when VITE_DIAGNOSTIC_MODE=true.
 * Shows commit SHA, platform, and native flag on the login footer so a
 * TestFlight screenshot always identifies the exact build.
 */
const DiagnosticFooter = () => {
  const [info, setInfo] = useState<{ platform: string; native: boolean }>({
    platform: "web",
    native: false,
  });

  useEffect(() => {
    try {
      setInfo({
        platform: Capacitor.getPlatform?.() ?? "web",
        native: Capacitor.isNativePlatform?.() ?? false,
      });
    } catch {
      /* ignore */
    }
  }, []);

  if (!isDiagnosticMode()) return null;

  const commit = getBuildCommit();
  const build = getBuildNumber();

  return (
    <div
      dir="ltr"
      className="mt-4 text-center text-[10px] font-mono text-white/40 tracking-wide select-all"
    >
      <div>DIAG • Build: {commit.slice(0, 7)} (#{build})</div>
      <div>
        Platform: {info.platform} • Native: {info.native ? "true" : "false"}
      </div>
    </div>
  );
};

export default DiagnosticFooter;
