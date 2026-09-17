import { forwardRef } from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, className = "", id, ...rest }, ref) => (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label htmlFor={id} className="ds-caption" style={{ color: "var(--ink-500)" }}>
          {label}
        </label>
      )}
      <input
        ref={ref}
        id={id}
        className={`ds-input ${error ? "ds-input--error" : ""} ${className}`}
        aria-invalid={!!error}
        {...rest}
      />
      {(error || hint) && (
        <span className="ds-micro" style={{ color: error ? "var(--danger)" : "var(--ink-500)" }}>
          {error || hint}
        </span>
      )}
    </div>
  ),
);
Input.displayName = "Input";

export default Input;
