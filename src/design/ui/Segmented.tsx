import { motion } from "framer-motion";
import { dsSpring } from "../motion";
import { light } from "../haptics";

export interface SegmentedProps {
  options: { value: string; label: string }[];
  value: string;
  onChange: (value: string) => void;
  name?: string;
}

export const Segmented = ({ options, value, onChange, name = "ds-seg" }: SegmentedProps) => (
  <div className="ds-segmented" role="tablist">
    {options.map((opt) => {
      const active = opt.value === value;
      return (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={active}
          className={`ds-segment ds-focus ${active ? "ds-segment--active" : ""}`}
          onClick={() => {
            light();
            onChange(opt.value);
          }}
        >
          {active && (
            <motion.span
              layoutId={`${name}-pill`}
              transition={dsSpring}
              className="absolute inset-0 rounded-[10px]"
              style={{ background: "var(--surface-0)", boxShadow: "var(--shadow-1)" }}
            />
          )}
          <span className="relative">{opt.label}</span>
        </button>
      );
    })}
  </div>
);

export default Segmented;
