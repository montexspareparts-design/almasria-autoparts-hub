import { forwardRef } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { dsSpring } from "../motion";

export type ButtonVariant = "primary" | "accent" | "secondary" | "ghost" | "destructive";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: "md" | "lg";
  block?: boolean;
  loading?: boolean;
  icon?: React.ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    { variant = "primary", size = "md", block, loading, icon, children, className = "", disabled, ...rest },
    ref,
  ) => (
    <motion.button
      ref={ref}
      whileTap={disabled || loading ? undefined : { scale: 0.98 }}
      transition={dsSpring}
      disabled={disabled || loading}
      className={`ds-btn ds-btn--${variant} ds-focus ${size === "lg" ? "ds-btn--lg" : ""} ${
        block ? "ds-btn--block" : ""
      } ${className}`}
      {...(rest as any)}
    >
      {loading ? (
        <Loader2 className="w-[18px] h-[18px] animate-spin" strokeWidth={1.5} />
      ) : (
        <>
          {icon}
          {children}
        </>
      )}
    </motion.button>
  ),
);
Button.displayName = "Button";

export default Button;
