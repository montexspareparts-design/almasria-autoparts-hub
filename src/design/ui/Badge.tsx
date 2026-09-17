export type BadgeTone = "neutral" | "red" | "success" | "warning" | "info";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  dot?: boolean;
}

export const Badge = ({ tone = "neutral", dot, children, className = "", ...rest }: BadgeProps) => (
  <span className={`ds-chip ds-chip--${tone} ${className}`} {...rest}>
    {dot && <span className="ds-dot" />}
    {children}
  </span>
);

export default Badge;
