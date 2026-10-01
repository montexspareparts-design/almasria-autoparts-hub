import { useEffect, useState } from "react";

interface Props {
  value: number;
  disabled?: boolean;
  onCommit: (value: number) => void;
  ariaLabel: string;
  className?: string;
  suffix?: string;
}

/** Numeric field that keeps a local draft and commits on blur / Enter only. */
export default function OilsQtyInput({ value, disabled, onCommit, ariaLabel, className, suffix }: Props) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => setDraft(String(value)), [value]);

  const commit = () => {
    const normalized = draft.replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d))).replace(/\D/g, "");
    const next = parseInt(normalized, 10);
    if (!Number.isFinite(next) || next <= 0 || next === value) {
      setDraft(String(value));
      return;
    }
    setDraft(String(value));
    onCommit(next);
  };

  return (
    <label className={`oils-qty-input ${className ?? ""}`}>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        dir="ltr"
        aria-label={ariaLabel}
        disabled={disabled}
        value={disabled ? "…" : draft}
        onFocus={(e) => e.currentTarget.select()}
        onChange={(e) => setDraft(e.target.value.slice(0, 6))}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") e.currentTarget.blur();
        }}
      />
      {suffix && <span>{suffix}</span>}
    </label>
  );
}
