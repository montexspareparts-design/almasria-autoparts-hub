import { forwardRef } from "react";
import { motion } from "framer-motion";
import { dsSpring } from "../motion";

export interface IconButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label: string;
  children: React.ReactNode;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ label, children, className = "", ...rest }, ref) => (
    <motion.button
      ref={ref}
      type="button"
      aria-label={label}
      whileTap={{ scale: 0.94 }}
      transition={dsSpring}
      className={`ds-iconbtn ds-focus ${className}`}
      {...(rest as any)}
    >
      {children}
    </motion.button>
  ),
);
IconButton.displayName = "IconButton";

export default IconButton;
