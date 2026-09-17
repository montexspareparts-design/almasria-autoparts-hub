export interface SkeletonProps {
  width?: number | string;
  height?: number | string;
  radius?: string;
  className?: string;
}

export const Skeleton = ({ width = "100%", height = 16, radius = "var(--r-sm)", className = "" }: SkeletonProps) => (
  <span
    className={`ds-skeleton block ${className}`}
    style={{ width, height, borderRadius: radius }}
    aria-hidden
  />
);

export const SkeletonText = ({ lines = 2 }: { lines?: number }) => (
  <span className="flex flex-col gap-2 w-full">
    {Array.from({ length: lines }).map((_, i) => (
      <Skeleton key={i} height={12} width={i === lines - 1 ? "60%" : "100%"} />
    ))}
  </span>
);

export default Skeleton;
