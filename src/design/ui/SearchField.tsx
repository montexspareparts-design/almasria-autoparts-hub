import { Search, ScanLine, X } from "lucide-react";

export interface SearchFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  onScan?: () => void;
}

export const SearchField = ({
  value,
  onChange,
  placeholder = "ابحث برقم القطعة أو اسم الصنف",
  onScan,
}: SearchFieldProps) => (
  <div className="relative w-full">
    <Search
      className="absolute top-1/2 -translate-y-1/2 w-[18px] h-[18px] pointer-events-none"
      style={{ insetInlineStart: 14, color: "var(--ink-500)" }}
      strokeWidth={1.5}
    />
    <input
      className="ds-input"
      style={{ paddingInlineStart: 42, paddingInlineEnd: onScan ? 80 : 44 }}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      aria-label={placeholder}
    />
    <div
      className="absolute top-1/2 -translate-y-1/2 flex items-center gap-1"
      style={{ insetInlineEnd: 6 }}
    >
      {value && (
        <button
          type="button"
          aria-label="مسح البحث"
          className="w-9 h-9 grid place-items-center ds-focus rounded-[10px]"
          style={{ color: "var(--ink-500)" }}
          onClick={() => onChange("")}
        >
          <X className="w-[16px] h-[16px]" strokeWidth={1.5} />
        </button>
      )}
      {onScan && (
        <button
          type="button"
          aria-label="مسح الباركود"
          className="w-9 h-9 grid place-items-center ds-focus rounded-[10px]"
          style={{ color: "var(--ink-900)" }}
          onClick={onScan}
        >
          <ScanLine className="w-[18px] h-[18px]" strokeWidth={1.5} />
        </button>
      )}
    </div>
  </div>
);

export default SearchField;
