import { memo } from "react";

/**
 * Skeleton placeholder that mirrors the real ProductCard layout
 * (image frame + badges + title + SKU + price + button) so the grid
 * keeps stable dimensions and visual rhythm while data is loading.
 */
interface ProductCardSkeletonProps {
  viewMode?: "grid" | "list";
}

const Shimmer = ({ className = "" }: { className?: string }) => (
  <div className={`relative overflow-hidden bg-muted/60 rounded-md ${className}`}>
    <div className="absolute inset-0 -translate-x-full animate-skeleton-shimmer bg-gradient-to-r from-transparent via-white/40 to-transparent dark:via-white/5" />
  </div>
);

const ProductCardSkeleton = memo(({ viewMode = "grid" }: ProductCardSkeletonProps) => {
  if (viewMode === "list") {
    return (
      <div
        dir="rtl"
        className="relative bg-card rounded-2xl overflow-hidden border border-border/40 shadow-[0_2px_8px_rgba(0,0,0,0.04)] flex"
      >
        {/* Image placeholder — same square frame as the real card */}
        <div className="w-28 sm:w-40 md:w-48 aspect-square shrink-0 bg-muted/30 relative">
          <Shimmer className="absolute inset-3 sm:inset-4 rounded-lg" />
        </div>

        {/* Content placeholder */}
        <div className="flex-1 p-3 sm:p-4 flex flex-col justify-center gap-2 text-right">
          <div className="flex items-center justify-end gap-1.5">
            <Shimmer className="h-4 w-14 rounded-md" />
            <Shimmer className="h-4 w-16 rounded-md" />
          </div>
          <Shimmer className="h-3.5 w-full rounded" />
          <Shimmer className="h-3.5 w-3/4 rounded" />
          <Shimmer className="h-3 w-20 rounded self-end" />
          <div className="mt-2 flex items-center justify-between gap-2">
            <Shimmer className="h-8 w-24 rounded-xl" />
            <Shimmer className="h-5 w-16 rounded" />
          </div>
        </div>
      </div>
    );
  }

  // Grid mode — mirrors the premium grid card
  return (
    <div
      dir="rtl"
      className="relative bg-card rounded-[20px] overflow-hidden border border-border/20 shadow-[0_2px_12px_rgba(0,0,0,0.03)] flex flex-col"
    >
      {/* Image area — identical 1:1 frame and padding as ProductCard grid */}
      <div className="relative aspect-square bg-muted/20 overflow-hidden">
        {/* Floating badge placeholders match real overlay positions */}
        <div className="absolute top-2 right-2 z-10">
          <Shimmer className="h-4 w-14 rounded-md" />
        </div>
        <div className="absolute top-2 left-2 z-10">
          <Shimmer className="h-4 w-12 rounded-md" />
        </div>
        {/* Centered image shimmer */}
        <div className="absolute inset-0 p-4 sm:p-5 flex items-center justify-center">
          <Shimmer className="w-full h-full rounded-xl" />
        </div>
      </div>

      {/* Content placeholder — matches title + SKU + price + button rhythm */}
      <div className="flex-1 flex flex-col p-2.5 sm:p-4 text-right">
        <div className="space-y-1.5 mb-2">
          <Shimmer className="h-3.5 w-full rounded" />
          <Shimmer className="h-3.5 w-2/3 rounded mr-auto" />
        </div>
        <Shimmer className="h-2.5 w-24 rounded mr-auto mb-3" />
        <Shimmer className="h-2.5 w-16 rounded mr-auto mb-2.5" />
        <div className="flex-1" />
        <div className="pt-2.5 border-t border-border/10">
          <Shimmer className="h-5 w-20 rounded mr-auto" />
        </div>
        <Shimmer className="h-8 sm:h-10 w-full rounded-xl mt-2 sm:mt-3" />
      </div>
    </div>
  );
});

ProductCardSkeleton.displayName = "ProductCardSkeleton";

export default ProductCardSkeleton;
