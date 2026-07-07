import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Uncaught error:", error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = "/";
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    if (this.props.fallback) return this.props.fallback;

    const message = this.state.error?.message || "خطأ غير متوقع";
    const isChunkError = /chunk|loading|dynamically imported/i.test(message);

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
