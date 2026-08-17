import { supabase } from "@/integrations/supabase/client";
import { Capacitor } from "@capacitor/core";
import { getBuildCommit, getBuildNumber, sanitize } from "@/lib/runtimeDiagnostics";

/**
 * Sends a crash report to the backend so production crashes (TestFlight /
 * Google Play) can be diagnosed without asking the user for a screenshot.
 * Fire-and-forget: never throws, never blocks the UI.
 */
export async function reportClientError(input: {
  code?: string;
  error?: { name?: string; message?: string; stack?: string } | null;
  componentStack?: string | null;
}): Promise<void> {
  try {
    let platform = "web";
    let native = false;
    try {
      platform = Capacitor.getPlatform?.() ?? "web";
      native = Capacitor.isNativePlatform?.() ?? false;
    } catch {
      /* ignore */
    }

    const { data } = await supabase.auth.getUser();

    await supabase.from("client_error_reports").insert({
      user_id: data?.user?.id ?? null,
      code: input.code ?? null,
      error_name: sanitize(input.error?.name || "Error").slice(0, 120),
      error_message: sanitize(input.error?.message || "unknown").slice(0, 500),
      stack: (input.error?.stack || "").slice(0, 3000) || null,
      component_stack: (input.componentStack || "").slice(0, 3000) || null,
      route:
        typeof window !== "undefined"
          ? window.location.pathname + window.location.search
          : null,
      platform,
      is_native: native,
      build_commit: getBuildCommit(),
      build_number: String(getBuildNumber()),
      user_agent:
        typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 300) : null,
    } as never);
  } catch {
    /* reporting must never break the app */
  }
}
