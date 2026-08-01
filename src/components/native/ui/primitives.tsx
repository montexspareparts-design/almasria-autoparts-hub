import { forwardRef, useState, type ReactNode, type ButtonHTMLAttributes } from "react";
import { Link } from "react-router-dom";
import {
  ChevronLeft,
  Check,
  AlertTriangle,
  XCircle,
  HelpCircle,
  Car,
  PackageCheck,
  PackageX,
  Clock,
  Copy,
  CheckCheck,
  Loader2,
  type LucideIcon,
} from "lucide-react";
import { haptic } from "@/lib/haptics";

/* ═══════════════════════════════════════════════════════════════
   Native UI primitives — "Precision Luxury Commerce".
   Presentation-only building blocks for the iOS/Android shell.
   Every component ships default / pressed / selected / loading /
   disabled states and works in RTL and dark mode via the
   `--n-*` design tokens in index.css.
   ═══════════════════════════════════════════════════════════════ */

export const GUTTER = "px-5";

/* ── Section headers ─────────────────────────────────────────── */

export const SectionHeader = ({
  title,
  to,
  action = "عرض الكل",
}: {
  title: string;
  to?: string;
  action?: string;
}) => (
  <div className={`flex items-baseline justify-between gap-3 ${GUTTER}`}>
    <h2 className="ar-display font-bold text-[19px] leading-tight text-[hsl(var(--n-text))]">{title}</h2>
    {to && (
      <Link
        to={to}
        onClick={() => void haptic("light")}
        className="shrink-0 ar-body text-[13px] font-semibold text-[hsl(var(--n-accent))] inline-flex items-center gap-0.5 n-press py-1"
      >
        {action}
        <ChevronLeft className="w-4 h-4" />
      </Link>
    )}
  </div>
);

export const GroupTitle = ({ children }: { children: ReactNode }) => (
  <h2 className="ar-body text-[12.5px] font-bold text-[hsl(var(--n-text-3))] mb-2.5 px-1 tracking-wide">
    {children}
  </h2>
);

/* ── Grouped list row (iOS settings pattern) ─────────────────── */

export const ListRow = ({
  label,
  hint,
  to,
  href,
  icon: Icon,
  tone = "default",
  trailing,
}: {
  label: string;
  hint?: string;
  to?: string;
  href?: string;
  icon?: LucideIcon;
  tone?: "default" | "destructive";
  trailing?: ReactNode;
}) => {
  const destructive = tone === "destructive";
  const body = (
    <>
      {Icon && (
        <span
          className="w-9 h-9 rounded-[10px] grid place-items-center shrink-0"
          style={{
            background: destructive
              ? "hsl(var(--n-error-bg))"
              : "hsl(var(--n-accent) / 0.10)",
          }}
        >
          <Icon
            className="w-[18px] h-[18px]"
            style={{ color: destructive ? "hsl(var(--n-error))" : "hsl(var(--n-accent))" }}
          />
        </span>
      )}
      <span className="flex-1 min-w-0">
        <span
          className="block ar-body text-[15px] font-semibold leading-tight"
          style={{ color: destructive ? "hsl(var(--n-error))" : "hsl(var(--n-text))" }}
        >
          {label}
        </span>
        {hint && (
          <span className="block ar-body text-[12px] text-[hsl(var(--n-text-3))] mt-1 leading-tight">
            {hint}
          </span>
        )}
      </span>
      {trailing ?? <ChevronLeft className="w-[18px] h-[18px] text-[hsl(var(--n-text-3))] shrink-0" />}
    </>
  );

  const cls =
    "n-row flex items-center gap-3.5 px-4 min-h-[56px] py-3 transition-colors";

  if (href) {
    return (
      <a href={href} onClick={() => void haptic("light")} className={cls}>
        {body}
      </a>
    );
  }
  return (
    <Link to={to ?? "#"} onClick={() => void haptic("light")} className={cls}>
      {body}
    </Link>
  );
};

/* ── Buttons ─────────────────────────────────────────────────── */

type ButtonVariant = "primary" | "secondary" | "tertiary" | "destructive";

interface NativeButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: LucideIcon;
}

const variantStyle: Record<ButtonVariant, React.CSSProperties> = {
  primary: { background: "hsl(var(--n-brand))", color: "hsl(var(--n-text-on-brand))" },
  secondary: {
    background: "hsl(var(--n-surface))",
    color: "hsl(var(--n-text))",
    border: "1px solid hsl(var(--n-border-strong))",
  },
  tertiary: { background: "transparent", color: "hsl(var(--n-accent))" },
  destructive: { background: "hsl(var(--n-error))", color: "#fff" },
};

export const NativeButton = forwardRef<HTMLButtonElement, NativeButtonProps>(
  ({ variant = "primary", loading, fullWidth, icon: Icon, children, disabled, className = "", ...rest }, ref) => (
    <button
      ref={ref}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={`n-press inline-flex items-center justify-center gap-2 rounded-full ar-display font-bold text-[15px] px-6 ${
        fullWidth ? "w-full" : ""
      } ${className}`}
      style={{ height: "var(--n-control-h)", ...variantStyle[variant] }}
      {...rest}
    >
      {loading ? <Loader2 className="w-[18px] h-[18px] animate-spin" /> : Icon && <Icon className="w-[18px] h-[18px]" />}
      {children}
    </button>
  ),
);
NativeButton.displayName = "NativeButton";

/* ── Compatibility badge — icon + text, never colour alone ───── */

export type CompatibilityState =
  | "compatible"
  | "verify"
  | "incompatible"
  | "no-vehicle"
  | "unknown";

const COMPAT: Record<
  CompatibilityState,
  { label: string; icon: LucideIcon; fg: string; bg: string }
> = {
  compatible: { label: "مطابق لعربيتك", icon: Check, fg: "--n-success", bg: "--n-success-bg" },
  verify: { label: "يحتاج تأكيد التركيب", icon: AlertTriangle, fg: "--n-warning", bg: "--n-warning-bg" },
  incompatible: { label: "غير مطابق لعربيتك", icon: XCircle, fg: "--n-error", bg: "--n-error-bg" },
  "no-vehicle": { label: "اختر عربيتك للتأكد", icon: Car, fg: "--n-info", bg: "--n-info-bg" },
  unknown: { label: "بيانات التركيب غير متاحة", icon: HelpCircle, fg: "--n-text-2", bg: "--n-surface-2" },
};

export const CompatibilityBadge = ({
  state,
  label,
  compact = false,
}: {
  state: CompatibilityState;
  label?: string;
  compact?: boolean;
}) => {
  const c = COMPAT[state];
  const Icon = c.icon;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ar-body font-bold ${
        compact ? "text-[11px] px-2 py-1" : "text-[12px] px-2.5 py-1.5"
      }`}
      style={{ background: `hsl(var(${c.bg}))`, color: `hsl(var(${c.fg}))` }}
    >
      <Icon className={compact ? "w-3 h-3" : "w-3.5 h-3.5"} aria-hidden />
      {label ?? c.label}
    </span>
  );
};

/* ── Availability badge — distinct shape from compatibility ──── */

export type AvailabilityState = "in-stock" | "low" | "out" | "on-order";

const AVAIL: Record<AvailabilityState, { label: string; icon: LucideIcon; fg: string }> = {
  "in-stock": { label: "متوفر", icon: PackageCheck, fg: "--n-success" },
  low: { label: "كمية محدودة", icon: Clock, fg: "--n-warning" },
  out: { label: "غير متوفر", icon: PackageX, fg: "--n-text-3" },
  "on-order": { label: "تحت الطلب", icon: Clock, fg: "--n-info" },
};

export const AvailabilityBadge = ({ state, label }: { state: AvailabilityState; label?: string }) => {
  const a = AVAIL[state];
  const Icon = a.icon;
  return (
    <span
      className="inline-flex items-center gap-1.5 ar-body text-[11.5px] font-semibold"
      style={{ color: `hsl(var(${a.fg}))` }}
    >
      <Icon className="w-3.5 h-3.5 shrink-0" aria-hidden />
      {label ?? a.label}
    </span>
  );
};

/* ── Price display ───────────────────────────────────────────── */

export const PriceDisplay = ({
  value,
  locked = false,
  lockedLabel = "سجّل لرؤية السعر",
  size = "md",
}: {
  value?: number | null;
  locked?: boolean;
  lockedLabel?: string;
  size?: "sm" | "md" | "lg";
}) => {
  if (locked || value == null) {
    return (
      <span className="ar-body text-[12px] font-semibold text-[hsl(var(--n-accent))]">{lockedLabel}</span>
    );
  }
  const cls = size === "lg" ? "text-[22px]" : size === "sm" ? "text-[14px]" : "text-[17px]";
  return (
    <span className={`ar-display font-black n-num text-[hsl(var(--n-text))] ${cls}`} dir="ltr">
      {Number(value).toLocaleString("en-US")}
      <span className="ar-body font-bold text-[0.62em] text-[hsl(var(--n-text-2))] ms-1">EGP</span>
    </span>
  );
};

/* ── Part number — copyable, monospaced, LTR-isolated ────────── */

export const PartNumber = ({
  value,
  label,
  copyable = true,
}: {
  value: string;
  label?: string;
  copyable?: boolean;
}) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      void haptic("light");
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard unavailable — silent */
    }
  };
  return (
    <span className="inline-flex items-center gap-1.5 min-w-0">
      {label && <span className="ar-body text-[11px] text-[hsl(var(--n-text-3))] shrink-0">{label}</span>}
      <span className="n-code text-[11.5px] text-[hsl(var(--n-text-2))] truncate">{value}</span>
      {copyable && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            void copy();
          }}
          aria-label={copied ? "تم نسخ الكود" : `نسخ الكود ${value}`}
          className="shrink-0 grid place-items-center w-6 h-6 rounded-md n-press"
        >
          {copied ? (
            <CheckCheck className="w-3.5 h-3.5" style={{ color: "hsl(var(--n-success))" }} />
          ) : (
            <Copy className="w-3.5 h-3.5 text-[hsl(var(--n-text-3))]" />
          )}
        </button>
      )}
    </span>
  );
};

/* ── States: skeleton / empty / error ────────────────────────── */

export const Skeleton = ({ className = "" }: { className?: string }) => (
  <div className={`n-skeleton ${className}`} aria-hidden />
);

export const EmptyState = ({
  icon: Icon,
  title,
  body,
  action,
}: {
  icon: LucideIcon;
  title: string;
  body?: string;
  action?: ReactNode;
}) => (
  <div className="flex flex-col items-center text-center px-8 py-12">
    <span
      className="w-14 h-14 rounded-2xl grid place-items-center"
      style={{ background: "hsl(var(--n-surface-2))" }}
    >
      <Icon className="w-6 h-6 text-[hsl(var(--n-text-3))]" />
    </span>
    <h3 className="ar-display font-bold text-[16.5px] mt-4 text-[hsl(var(--n-text))]">{title}</h3>
    {body && (
      <p className="ar-body text-[13.5px] leading-[1.7] text-[hsl(var(--n-text-2))] mt-2 max-w-[20rem]">{body}</p>
    )}
    {action && <div className="mt-5">{action}</div>}
  </div>
);

/* ── Sticky action bar (cart / product detail purchase) ──────── */

export const StickyActionBar = ({ children }: { children: ReactNode }) => (
  <div
    className="fixed inset-x-0 bottom-0 z-40 n-chrome rounded-t-[22px] border-x-0 border-b-0 px-5 pt-3"
    style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 12px)" }}
  >
    {children}
  </div>
);
