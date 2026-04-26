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
  ...rest
}: LazyImageProps & { optimizeWidth?: number }) => {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(eager);
  const [loaded, setLoaded] = useState(() => (src ? loadedCache.has(src) : false));
  const [errored, setErrored] = useState(false);

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

  // Skeleton shows while: image not yet visible (lazy) OR visible but not loaded yet.
  // It stays *behind* any sibling overlays (badges) because it sits at z-0 inside the wrapper.
  const showSkeleton = !!src && !errored && !loaded;

  return (
    <div
      ref={ref}
      className={cn(
        "relative overflow-hidden bg-muted/30",
        wrapperClassName
      )}
    >
      {/* Shimmer skeleton — fills the wrapper, sits at the bottom layer.
          Uses a moving gradient sweep over a neutral base so badges remain
          fully legible on top while the image is loading. */}
      {showSkeleton && (
        <div
          aria-hidden="true"
          className="absolute inset-0 z-0 overflow-hidden bg-gradient-to-br from-muted/40 via-muted/20 to-muted/40"
        >
          <div className="absolute inset-0 -translate-x-full animate-skeleton-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          {fallbackIcon && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Package className="w-1/4 h-1/4 text-muted-foreground/20" />
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
          onLoad={() => {
            loadedCache.add(src!);
            setLoaded(true);
          }}
          onError={() => setErrored(true)}
          className={cn(
            "relative z-[1] transition-opacity duration-300",
            loaded ? "opacity-100" : "opacity-0",
            className
          )}
          {...rest}
        />
      )}
      {showFallback && (
        <div className="w-full h-full flex items-center justify-center">
          <Package className="w-1/3 h-1/3 text-muted-foreground/20" />
        </div>
      )}
    </div>
  );
};

export default LazyImage;
