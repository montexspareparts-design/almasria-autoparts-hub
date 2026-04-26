import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * <ImageBadge /> — single source of truth for every badge that floats on
 * top of a product image (or any photographic background).
 *
 * Why a dedicated component?
 * --------------------------
 * Auto-contrast on busy / light / dark images relies on a stack of
 * coordinated tricks: opaque-enough fill, frosted backdrop fallback
 * (`.badge-glass` from index.css), white halo ring, drop shadow tinted
 * by tone, and a multi-layer text-shadow. If each consumer reinvents
 * these classes, they drift apart and small visual bugs reappear
 * (unreadable text on white rims, halo missing on dark engines, etc.).
 *
 * This component centralises the entire recipe: callers only choose a
 * semantic `tone` (stock / sale / brand / priced / neutral) and a `size`
 * that snaps to the responsive scale we use on cards. Every other
 * decoration is identical across the app.
 *
 * Layout helpers `<ImageBadgeColumn />` mirror the four corner anchors
 * we use on the card (top-start / top-end / bottom-start / bottom-end)
 * so absolute positioning is consistent too.
 */

// ─────────────────────────────────────────────────────────────────────
// Tone variants — semantic, not raw colors
// ─────────────────────────────────────────────────────────────────────
const imageBadgeVariants = cva(
  // Base — applied to EVERY badge regardless of tone/size:
  // - inline-flex with min-content so it never grows past its content
  // - badge-glass: progressive frosted backdrop (see index.css)
  // - ring + drop shadow: white halo + tone-tinted glow
  // - text-shadow: keeps glyphs crisp on busy/photographic backgrounds
  // - whitespace-nowrap so it never wraps inside a corner stack
  "pointer-events-auto inline-flex items-center max-w-full truncate " +
    "rounded-md leading-none whitespace-nowrap " +
    "badge-glass ring-1 " +
    "[text-shadow:0_1px_2px_rgba(0,0,0,0.35)]",
  {
    variants: {
      tone: {
        // Live stock indicator — green when in stock, red otherwise.
        // Use `stockAvailable` prop on the wrapper to flip it.
        stock: "text-white ring-white/30",
        // Promotional flag (e.g. تخفيض) — destructive red, strong glow
        sale:
          "bg-destructive/95 text-destructive-foreground ring-white/25 " +
          "shadow-[0_2px_10px_rgba(220,38,38,0.4)] font-black tracking-wide",
        // "Already viewed/priced" indicator — emerald success
        priced:
          "bg-emerald-600/95 text-white ring-white/30 " +
          "shadow-[0_2px_10px_rgba(16,185,129,0.35)] font-bold",
        // Brand chip (Toyota Genuine, MTX, ...). Uses a dark default so
        // legibility is guaranteed on white product photos; consumers
        // can override with the `colorClass` prop for brand-specific
        // colored chips.
        brand:
          "text-white ring-white/30 " +
          "shadow-[0_2px_8px_rgba(0,0,0,0.25)] font-extrabold",
        // Catch-all for ad-hoc informational badges
        neutral: "text-white ring-white/30 shadow-[0_2px_8px_rgba(0,0,0,0.3)] font-bold",
      },
      size: {
        // Responsive sizing matches the card breakpoints exactly so the
        // floating badges never visually clash with each other across
        // mobile / tablet / desktop. Anything else (admin previews,
        // listing pages) gets the same scale automatically.
        sm:
          "text-[7px] sm:text-[9px] lg:text-[10px] " +
          "px-1.5 py-[2px] sm:px-2 sm:py-[3px] lg:px-2.5 lg:py-1 gap-0.5 sm:gap-1",
        md:
          "text-[9px] sm:text-[10px] lg:text-[11px] " +
          "px-2 py-[3px] sm:px-2.5 sm:py-1 lg:px-3 lg:py-1.5 gap-1",
        lg:
          "text-[11px] sm:text-xs lg:text-sm " +
          "px-2.5 py-1 sm:px-3 sm:py-1.5 lg:px-3.5 lg:py-2 gap-1.5",
      },
    },
    defaultVariants: {
      tone: "neutral",
      size: "sm",
    },
  }
);

// ─────────────────────────────────────────────────────────────────────
// Tone → background helpers (for stateful tones)
// ─────────────────────────────────────────────────────────────────────
function stockBackground(stockAvailable: boolean) {
  return stockAvailable
    ? "bg-emerald-600/95 shadow-[0_2px_10px_rgba(16,185,129,0.35)] font-bold"
    : "bg-red-600/95 shadow-[0_2px_10px_rgba(239,68,68,0.35)] font-bold";
}

// ─────────────────────────────────────────────────────────────────────
// Component
// ─────────────────────────────────────────────────────────────────────
type Tone = NonNullable<VariantProps<typeof imageBadgeVariants>["tone"]>;

export interface ImageBadgeProps
  extends Omit<HTMLAttributes<HTMLSpanElement>, "color">,
    VariantProps<typeof imageBadgeVariants> {
  /** Optional leading icon — sized automatically to match `size`. */
  icon?: ReactNode;
  /**
   * For `tone="stock"`: switches background between in-stock and out-of-stock.
   * Ignored for other tones.
   */
  stockAvailable?: boolean;
  /**
   * For `tone="brand"`: extra Tailwind classes that paint the chip in
   * the brand's signature color (e.g. `bg-red-600/95 text-white`).
   * Use this only for brand chips — other tones already encode color.
   */
  colorClass?: string;
}

const ImageBadge = forwardRef<HTMLSpanElement, ImageBadgeProps>(
  ({ tone = "neutral", size = "sm", icon, stockAvailable = true, colorClass, className, children, ...rest }, ref) => {
    const stateful =
      tone === "stock" ? stockBackground(stockAvailable) : tone === "brand" && colorClass ? colorClass : "";

    return (
      <span ref={ref} className={cn(imageBadgeVariants({ tone, size }), stateful, className)} {...rest}>
        {tone === "stock" && (
          // The little white pulse dot — reinforces the live nature of the indicator
          <span
            aria-hidden
            className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-white shadow-[0_0_4px_rgba(255,255,255,0.6)]"
          />
        )}
        {icon && (
          <span className="inline-flex items-center [&>svg]:w-2 [&>svg]:h-2 sm:[&>svg]:w-2.5 sm:[&>svg]:h-2.5 [&>svg]:drop-shadow-[0_1px_1px_rgba(0,0,0,0.3)]">
            {icon}
          </span>
        )}
        {children}
      </span>
    );
  }
);
ImageBadge.displayName = "ImageBadge";

// ─────────────────────────────────────────────────────────────────────
// Corner anchor — keeps absolute positioning consistent across the app
// ─────────────────────────────────────────────────────────────────────
type Corner = "top-start" | "top-end" | "bottom-start" | "bottom-end";

const cornerClass: Record<Corner, string> = {
  "top-start":
    "top-1.5 start-1.5 sm:top-2 sm:start-2 lg:top-2.5 lg:start-2.5 items-start",
  "top-end":
    "top-1.5 end-1.5 sm:top-2 sm:end-2 lg:top-2.5 lg:end-2.5 items-end",
  "bottom-start":
    "bottom-2 start-2 sm:bottom-2.5 sm:start-2.5 lg:bottom-3 lg:start-3 items-start",
  "bottom-end":
    "bottom-2 end-2 sm:bottom-2.5 sm:end-2.5 lg:bottom-3 lg:end-3 items-end",
};

export interface ImageBadgeColumnProps extends HTMLAttributes<HTMLDivElement> {
  corner: Corner;
  /** Cap how wide the column can grow so it never crowds the opposite corner. */
  maxWidth?: "narrow" | "wide";
  /**
   * Higher z-index when stacking promotional / state badges above
   * informational ones. Defaults to 30 (matches ProductCard convention).
   */
  level?: 30 | 40;
}

export function ImageBadgeColumn({
  corner,
  maxWidth = "wide",
  level = 30,
  className,
  children,
  ...rest
}: ImageBadgeColumnProps) {
  return (
    <div
      className={cn(
        "absolute flex flex-col gap-1 sm:gap-1.5 pointer-events-none",
        cornerClass[corner],
        maxWidth === "narrow" ? "max-w-[40%]" : "max-w-[48%] sm:max-w-[55%]",
        level === 40 ? "z-40" : "z-30",
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

/**
 * IMAGE_OVERLAY_Z — canonical z-index ladder for any surface that floats
 * content on top of a product image. Import these constants instead of
 * hand-writing `z-30`/`z-40`/etc. so the ordering invariant holds:
 *
 *     SKELETON (0) < IMAGE (1) < DECOR (10) < INFO (30) < STATE (40)
 *
 * The skeleton lives inside <LazyImage> and is hard-coded to z-0; this
 * map is consumed by every consumer that places things ABOVE the image.
 */
export const IMAGE_OVERLAY_Z = {
  skeleton: 0,
  image: 1,
  decoration: 10,
  badgeInfo: 30,
  badgeState: 40,
} as const;

export { ImageBadge, imageBadgeVariants };
export type { Tone };
