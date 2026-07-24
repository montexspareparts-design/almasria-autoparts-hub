import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  extractStackFrames,
  getBuildCommit,
  getBuildNumber,
  getLastDiagnosticCode,
  getLastDiagnosticRecord,
  isDiagnosticMode,
  recordDiagnostic,
  sanitize,
} from "@/lib/runtimeDiagnostics";
import { Capacitor } from "@capacitor/core";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  code: string;
}

/** Deterministic short diagnostic code so we can identify the failing pipeline
 *  from a TestFlight screenshot without needing the full stack. */
function deriveDiagnosticCode(err: Error | null): string {
  const msg = (err?.message || "").toLowerCase();
  const stack = (err?.stack || "").toLowerCase();
  if (/chunk|dynamically imported|loading/.test(msg)) return "ERR-CHUNK-001";
  if (/authcontext|onauthstate|getsession/.test(stack)) return "ERR-PAUTH-001";
  if (/completeprofile|addphoneprompt/.test(stack)) return "ERR-PAUTH-002";
  if (/dealer|role/.test(stack)) return "ERR-PAUTH-003";
  if (/cannot read propert|undefined is not/.test(msg)) return "ERR-RENDER-001";
  if (/network|failed to fetch/.test(msg)) return "ERR-NET-001";
  return getLastDiagnosticCode() || "ERR-RENDER-000";
}

const AUTO_RECOVER_KEY = "err-boundary-auto-recovered-at";
const AUTO_RECOVER_COOLDOWN_MS = 60_000; // don't loop-reload more than once per minute

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, code: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, code: deriveDiagnosticCode(error) };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    const code = recordDiagnostic("render", error, "ErrorBoundary") || deriveDiagnosticCode(error);
    this.setState({ code });
    console.error(`[ErrorBoundary][${code}] ${error.name}: ${error.message}`);
    if (error.stack) console.error(`[ErrorBoundary][${code}] stack:`, error.stack);
    if (errorInfo?.componentStack) console.error(`[ErrorBoundary][${code}] component:`, errorInfo.componentStack);

    // Auto-recover on FIRST crash only (rate-limited). Fixes transient
    // post-auth crashes on iOS WebView where the boundary would otherwise
    // trap the user on an error screen after a successful login.
    // In diagnostic mode we intentionally disable auto-recovery so the
    // reviewer sees the real error details captured on this device.
    if (isDiagnosticMode()) {
      recordDiagnostic("render", error, "ErrorBoundary", errorInfo?.componentStack || undefined);
      return;
    }

    try {
      const last = Number(sessionStorage.getItem(AUTO_RECOVER_KEY) || 0);
      const now = Date.now();
      if (!last || now - last > AUTO_RECOVER_COOLDOWN_MS) {
        sessionStorage.setItem(AUTO_RECOVER_KEY, String(now));
        setTimeout(() => {
          try {
            window.location.replace("/");
          } catch {
            window.location.href = "/";
          }
        }, 400);
      }
    } catch {
      /* sessionStorage unavailable — fall through to manual recovery UI */
    }
  }


  handleReload = () => {
    this.setState({ hasError: false, error: null, code: "" });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null, code: "" });
    window.location.href = "/";
  };

  renderDiagnosticPanel() {
    const err = this.state.error;
    const stored = getLastDiagnosticRecord();
    let platform = stored?.platform ?? "web";
    let native = stored?.native ?? false;
    try {
      platform = Capacitor.getPlatform?.() ?? platform;
      native = Capacitor.isNativePlatform?.() ?? native;
    } catch {
      /* ignore */
    }
    const name = sanitize(err?.name || stored?.name || "Error").slice(0, 80);
    const message = sanitize(err?.message || stored?.message || "unknown").slice(0, 240);
    const frames = err?.stack ? extractStackFrames(err.stack, 3) : stored?.frames ?? [];
    const route =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : stored?.route ?? "unknown";
    const commit = getBuildCommit();
    const build = getBuildNumber();

    return (
      <div
        dir="ltr"
        className="text-left bg-muted/50 rounded-lg p-3 text-[11px] font-mono space-y-2 select-all"
      >
        <div className="text-destructive font-bold">
          {name}: {message}
        </div>
        {frames.length > 0 && (
          <pre className="whitespace-pre-wrap break-words text-muted-foreground">
            {frames.join("\n")}
          </pre>
        )}
        {stored?.componentStack && (
          <div className="text-muted-foreground">
            <div className="font-bold text-foreground/80">component:</div>
            <pre className="whitespace-pre-wrap break-words">{stored.componentStack.split("\n").slice(0, 4).join("\n")}</pre>
          </div>
        )}
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-muted-foreground pt-1 border-t border-border/50">
          <div>route: <span className="text-foreground">{route}</span></div>
          <div>platform: <span className="text-foreground">{platform}</span></div>
          <div>native: <span className="text-foreground">{String(native)}</span></div>
          <div>build: <span className="text-foreground">#{build}</span></div>
          <div className="col-span-2">commit: <span className="text-foreground">{commit}</span></div>
          <div className="col-span-2">code: <span className="text-foreground">{this.state.code || "ERR-APP-000"}</span></div>
        </div>
      </div>
    );
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const message = this.state.error?.message || "خطأ غير متوقع";
    const isChunkError = /chunk|loading|dynamically imported/i.test(message);
    const code = this.state.code || "ERR-APP-000";

    return (
      <div
        dir="rtl"
        className="min-h-screen flex items-center justify-center bg-background p-4"
      >
        <div className="max-w-md w-full bg-card border border-border rounded-2xl shadow-lg p-6 sm:p-8 text-center space-y-5">
          <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-destructive" />
          </div>

          <div className="space-y-2">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">
              {isChunkError ? "تحديث جديد متاح" : "حدث خطأ غير متوقع"}
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {isChunkError
                ? "تم تحديث الموقع، فضلاً أعد التحميل للحصول على أحدث إصدار."
                : "نعتذر عن هذا الخطأ. فريقنا التقني يعمل على حله. يمكنك إعادة المحاولة أو العودة للرئيسية."}
            </p>
            <p className="text-[11px] font-mono text-muted-foreground/70 tracking-wider">
              كود التشخيص: {code}
            </p>
          </div>

          {import.meta.env.DEV && this.state.error && (
            <details className="text-right bg-muted/50 rounded-lg p-3 text-xs">
              <summary className="cursor-pointer font-medium text-muted-foreground">
                تفاصيل تقنية (Dev)
              </summary>
              <pre className="mt-2 overflow-auto text-destructive whitespace-pre-wrap break-words">
                {message}
                {this.state.error.stack && `\n\n${this.state.error.stack}`}
              </pre>
            </details>
          )}

          {isDiagnosticMode() && this.renderDiagnosticPanel()}




          <div className="flex flex-col sm:flex-row gap-2 pt-2">
            <Button onClick={this.handleReload} className="flex-1 gap-2">
              <RefreshCw className="w-4 h-4" />
              إعادة التحميل
            </Button>
            <Button
              onClick={this.handleGoHome}
              variant="outline"
              className="flex-1 gap-2"
            >
              <Home className="w-4 h-4" />
              الرئيسية
            </Button>
          </div>

          <p className="text-xs text-muted-foreground pt-2 border-t border-border">
            للدعم:{" "}
            <a
              href="https://wa.me/201034806288"
              className="text-primary hover:underline"
            >
              تواصل عبر واتساب
            </a>
          </p>
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
