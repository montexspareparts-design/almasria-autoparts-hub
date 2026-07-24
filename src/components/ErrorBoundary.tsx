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
