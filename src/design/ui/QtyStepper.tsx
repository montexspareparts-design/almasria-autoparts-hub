import { useState } from "react";
import { Minus, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { dsSpring } from "../motion";
import { light } from "../haptics";

export interface QtyStepperProps {
  value: number;
  onChange: (next: number) => void;
  step?: number;
  min?: number;
  max?: number;
  /** مثال: "جركن" أو "كرتونة" */
  unitLabel?: string;
  disabled?: boolean;
}

export const QtyStepper = ({
  value,
  onChange,
  step = 1,
  min = 0,
  max = 9999,
  unitLabel,
  disabled,
}: QtyStepperProps) => {
  const [draft, setDraft] = useState<string | null>(null);

  const commit = (next: number) => {
    const clamped = Math.min(max, Math.max(min, next));
    light();
    onChange(clamped);
  };

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <div
        className="inline-flex items-center rounded-[12px]"
        style={{ background: "var(--surface-100)", opacity: disabled ? 0.45 : 1 }}
      >
        <motion.button
          type="button"
          aria-label="إنقاص الكمية"
          whileTap={{ scale: 0.92 }}
          transition={dsSpring}
          className="w-11 h-11 grid place-items-center ds-focus"
          style={{ color: value <= min ? "var(--ink-300)" : "var(--ink-900)" }}
          disabled={disabled || value <= min}
          onClick={() => commit(value - step)}
        >
          <Minus className="w-[18px] h-[18px]" strokeWidth={1.5} />
        </motion.button>

        <input
          inputMode="numeric"
          className="ds-num ds-body-strong w-12 h-11 text-center bg-transparent outline-none"
          value={draft ?? String(value)}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value.replace(/[^\d]/g, ""))}
          onBlur={() => {
            if (draft !== null) commit(Number(draft || min));
            setDraft(null);
          }}
        />

        <motion.button
          type="button"
          aria-label="زيادة الكمية"
          whileTap={{ scale: 0.92 }}
          transition={dsSpring}
          className="w-11 h-11 grid place-items-center ds-focus"
          style={{ color: value >= max ? "var(--ink-300)" : "var(--ink-900)" }}
          disabled={disabled || value >= max}
          onClick={() => commit(value + step)}
        >
          <Plus className="w-[18px] h-[18px]" strokeWidth={1.5} />
        </motion.button>
      </div>
      {unitLabel && (
        <span className="ds-micro" style={{ color: "var(--ink-500)" }}>
          {unitLabel}
        </span>
      )}
    </div>
  );
};

export default QtyStepper;
