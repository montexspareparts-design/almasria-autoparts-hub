import { MapPin } from "lucide-react";

export const PICKUP_BRANCHES = [
  { value: "ossim", label: "أوسيم" },
  { value: "luxor", label: "الأقصر" },
  { value: "tawfiqia", label: "التوفيقية" },
] as const;

export const getStoredPickupBranch = (): string =>
  (typeof window !== "undefined" && localStorage.getItem("dealer_pickup_branch")) || "";

interface Props {
  value: string;
  onChange: (v: string) => void;
  compact?: boolean;
}

const PickupBranchSelector = ({ value, onChange, compact }: Props) => {
  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      <div className="flex items-center gap-1.5 text-xs font-bold text-foreground">
        <MapPin className="w-3.5 h-3.5 text-primary" />
        فرع الاستلام <span className="text-destructive">*</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {PICKUP_BRANCHES.map((branch) => {
          const selected = value === branch.value;
          return (
            <button
              key={branch.value}
              type="button"
              onClick={() => {
                onChange(branch.value);
                localStorage.setItem("dealer_pickup_branch", branch.value);
              }}
              className={`relative h-10 rounded-lg border-2 text-xs font-bold transition-all flex items-center justify-center ${
                selected
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-background text-foreground hover:border-primary/50"
              }`}
            >
              {branch.label}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PickupBranchSelector;
