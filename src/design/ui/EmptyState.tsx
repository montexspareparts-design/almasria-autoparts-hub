import type { LucideIcon } from "lucide-react";
import Button from "./Button";

export interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  hint?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState = ({ icon: Icon, title, hint, actionLabel, onAction }: EmptyStateProps) => (
  <div className="flex flex-col items-center text-center gap-3 py-12 px-6">
    <Icon className="w-8 h-8" strokeWidth={1.5} style={{ color: "var(--ink-300)" }} />
    <p className="ds-body-strong">{title}</p>
    {hint && (
      <p className="ds-caption" style={{ color: "var(--ink-500)" }}>
        {hint}
      </p>
    )}
    {actionLabel && (
      <Button variant="secondary" onClick={onAction} className="mt-1">
        {actionLabel}
      </Button>
    )}
  </div>
);

export default EmptyState;
