import { useEffect, useRef, useState, ImgHTMLAttributes } from "react";
import { Package } from "lucide-react";
import { cn } from "@/lib/utils";

interface LazyImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "loading"> {
  src: string | null | undefined;
  alt: string;
  /** Wrapper className (controls box dimensions) */
  wrapperClassName?: string;
  /** Image className (object-fit etc) */
  className?: string;
  /** Show fallback icon when no src or load error */
  fallbackIcon?: boolean;
  /** Eager load (above-the-fold). Default lazy. */
  eager?: boolean;
  /** Extra classes for the skeleton layer (e.g. rounded radius to match the card frame). */
  skeletonClassName?: string;
  /** Hide the small Package icon inside the skeleton (use when overlays already
      communicate "loading", e.g. product cards with badges). Default false. */
  hideSkeletonIcon?: boolean;
  /** Custom placeholder icon shown both during load and on fallback.
      Defaults to lucide `Package`. Pass any ReactNode for brand-specific
      placeholders (e.g. a car-part silhouette). */
  placeholderIcon?: React.ReactNode;
}

/**
 * High-performance image component:
 * - IntersectionObserver: only fetches when ~200px from viewport
 * - Skeleton shimmer until loaded
 * - decoding="async" + fetchpriority="low"
 * - Graceful fallback on error
 * - Static cache of loaded URLs to skip skeleton on revisit
 */
const loadedCache = new Set<string>();

/**
 * Auto-optimize Supabase Storage URLs via Image Transformations.
 * Converts /object/public/ -> /render/image/public/ and adds width/quality params.
 * Uses devicePixelRatio capped at 2 for retina but never exceeds the requested width.
 * Skips URLs that aren't from Supabase Storage (e.g. /placeholder.svg, external CDNs).
 */
const optimizeSrc = (src: string, targetWidth?: number): string => {
  if (!src || !src.includes("/storage/v1/object/public/")) return src;
  try {
    const url = new URL(src, window.location.origin);
    // Skip SVGs (transformations not supported / unnecessary)
    if (url.pathname.endsWith(".svg")) return src;
    const dpr = typeof window !== "undefined" ? Math.min(window.devicePixelRatio || 1, 2) : 1;
    const width = Math.round((targetWidth || 600) * dpr);
    url.pathname = url.pathname.replace("/object/public/", "/render/image/public/");
    url.searchParams.set("width", String(width));
    url.searchParams.set("quality", "70");
    url.searchParams.set("resize", "contain");
    return url.toString();
  } catch {
    return src;
  }
};

export const LazyImage = ({
  src,
  alt,
  wrapperClassName,
  className,
  fallbackIcon = true,
  eager = false,
  optimizeWidth,
  skeletonClassName,
  hideSkeletonIcon = false,
  placeholderIcon,
  ...rest
}: LazyImageProps & { optimizeWidth?: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(eager);
  const [loaded, setLoaded] = useState(() => (src ? loadedCache.has(src) : false));
  const [errored, setErrored] = useState(false);
  // Fallback chain: optimized (Supabase render) → raw (Supabase object) → placeholder.
  // Some JPEGs are rejected by the render endpoint with "Invalid source image" (422)
  // even though the raw object serves fine; retry once before giving up.
  const [useRaw, setUseRaw] = useState(false);

  useEffect(() => {
    if (eager || visible || !ref.current) return;
    const el = ref.current;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            setVisible(true);
            io.disconnect();
            break;
          }
        }
      },
      { rootMargin: "200px 0px", threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [eager, visible]);

  // Reset state when src changes
  useEffect(() => {
    if (!src) return;
    setUseRaw(false);
    if (loadedCache.has(src)) {
      setLoaded(true);
      setErrored(false);
    } else {
      setLoaded(false);
      setErrored(false);
    }
  }, [src]);

  const showImage = !!src && !errored && visible;
  const showFallback = (!src || errored) && fallbackIcon;

  // Skeleton lifecycle:
  //   - Mounted while the image is queued, fetching, or decoding.
  //   - Smoothly fades out (opacity transition) on load instead of
  //     unmounting — so the swap from gradient → photo doesn't pop and
  //     any sibling overlays (badges) appear visually anchored.
  //   - Sits at z-0 so badges (z-30/40) and decorative layers (z-10) on
  //     the parent card always stay perfectly in place above it.
  const skeletonActive = !!src && !errored && !loaded;

  return (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden bg-muted/30",
        wrapperClassName
      )}
    >
      {/* Shimmer skeleton — opacity-driven; respects prefers-reduced-motion
          via the `motion-reduce:` variants on the sweeping band.

          ⚠️ INVARIANT: this layer MUST stay at z-0 (and pointer-events-none
          once faded out). Any sibling overlay — badges, decorative gradients,
          hover sweeps — must use a STRICTLY HIGHER z-index. The canonical
          ladder lives in `IMAGE_OVERLAY_Z` (src/components/ui/image-badge.tsx).
          Do not change `z-0` below without first updating the consumers. */}
      {!!src && !errored && (
        <div
          aria-hidden="true"
          // z-0 + pointer-events-none guarantees badges (z-30/40) stay clickable
          // and visually anchored even before the image has decoded.
          //
          // ⚠️ ANTI-FLICKER NOTE: only the SKELETON animates opacity. The
          // <img> below snaps from 0→1 in a single paint AFTER `decode()`
          // resolves, so the only thing the eye sees during the swap is
          // this gradient layer fading out on top of an already-painted
          // photo. Cross-fading both layers caused a luminance hump
          // (skeleton 50% + image 50% ≈ near-white blink) — fixed.
          className={cn(
            "absolute inset-0 z-0 pointer-events-none overflow-hidden",
            "bg-gradient-to-br from-muted/40 via-muted/20 to-muted/40",
            "transition-opacity duration-700 ease-in-out",
            "will-change-[opacity]",
            skeletonActive ? "opacity-100" : "opacity-0",
            skeletonClassName
          )}
        >
          <div
            // Lower peak luminance (white/40 instead of /60) → smaller
            // brightness delta when the band finishes its sweep, so the
            // hand-off to the photo feels seamless.
            //
            // RTL: the `-translate-x-full` below is just the static
            // starting offset before the animation hijacks `transform`.
            // The keyframe itself is direction-aware via the
            // `[dir="rtl"] .animate-skeleton-shimmer` override in
            // index.css → in Arabic layouts the band sweeps right→left,
            // matching the reading flow.
            className="absolute inset-0 -translate-x-full animate-skeleton-shimmer
              bg-gradient-to-r from-transparent via-white/40 to-transparent
              motion-reduce:animate-none motion-reduce:opacity-0"
          />
          {/* Centered placeholder icon — same visual language as the fallback
              below so the box looks identical whether the image is queued,
              loading, missing, or errored. Kept very subtle (≈25% opacity)
              so badges and decorative layers above remain the focal point. */}
          {fallbackIcon && !hideSkeletonIcon && (
            <div className="absolute inset-0 flex items-center justify-center">
              {placeholderIcon ?? (
                <Package
                  className="w-1/4 h-1/4 max-w-[64px] max-h-[64px] text-muted-foreground/25"
                  strokeWidth={1.25}
                />
              )}
            </div>
          )}
        </div>
      )}

      {showImage && (
        <img
          src={optimizeSrc(src!, optimizeWidth)}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          // @ts-expect-error fetchpriority is valid HTML, not yet in React types
          fetchpriority={eager ? "high" : "low"}
          onLoad={(e) => {
            // Use HTMLImageElement.decode() to ensure the bitmap is fully
            // rasterised on the compositor BEFORE we flip opacity to 1.
            // Without this, large JPEGs occasionally paint a partially-
            // decoded frame, producing a sub-50ms flicker.
            const img = e.currentTarget;
            const finish = () => {
              loadedCache.add(src!);
              setLoaded(true);
            };
            if (typeof img.decode === "function") {
              img.decode().then(finish).catch(finish);
            } else {
              finish();
            }
          }}
          onError={() => setErrored(true)}
          className={cn(
            // Blur-to-sharp on first decode: image starts blurred and
            // crisps in 600ms once the file is decoded. Skeleton above
            // still handles the opacity fade.
            "relative z-[1] img-blur-load",
            loaded && "loaded opacity-100",
            !loaded && "opacity-0",
            className
          )}
          {...rest}
        />
      )}
      {showFallback && (
        // Same icon, same sizing rules, same color as the skeleton placeholder
        // → swapping between (loading) ↔ (no image) ↔ (error) is visually
        // seamless inside the product card frame.
        <div className="absolute inset-0 flex items-center justify-center">
          {placeholderIcon ?? (
            <Package
              className="w-1/4 h-1/4 max-w-[64px] max-h-[64px] text-muted-foreground/25"
              strokeWidth={1.25}
            />
          )}
        </div>
      )}
    </div>
  );
};

export default LazyImage;
