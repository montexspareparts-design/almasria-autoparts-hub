import { useNavigate } from "react-router-dom";
import { X } from "lucide-react";
import { haptic } from "@/lib/haptics";

export interface PickerOption {
  label: string;
  /** Destination path (already includes filter query params). */
  to: string;
  hint?: string;
}

interface Props {
  open: boolean;
  title: string;
  kicker?: string;
  options: PickerOption[];
  onClose: () => void;
}

/** Lightweight bottom sheet used by the native home quick actions. */
const NativePickerSheet = ({ open, title, kicker, options, onClose }: Props) => {
  const navigate = useNavigate();
  if (!open) return null;

  return (
    <div dir="rtl" className="fixed inset-0 z-[120]">
      <button
        aria-label="إغلاق"
        onClick={onClose}
        className="absolute inset-0 bg-black/70"
      />
      <div
        className="absolute inset-x-0 bottom-0 pd-s1 rounded-t-[20px] pd-hair max-h-[72vh] overflow-y-auto"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
      >
        <div className="sticky top-0 pd-s1 px-4 pt-4 pb-3 flex items-center justify-between">
          <div>
            {kicker && <p className="pd-mono text-[10px] text-gold/70 mb-1">{kicker}</p>}
            <h3 className="text-[15px] text-white font-semibold">{title}</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="w-9 h-9 rounded-full pd-s3 grid place-items-center"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>
        </div>

        <div className="px-4 pb-2 grid grid-cols-2 gap-2">
          {options.map((o) => (
            <button
              key={o.to}
              onClick={() => {
                void haptic("light");
                onClose();
                navigate(o.to);
              }}
              className="pd-card h-[58px] px-3 flex flex-col items-start justify-center ios-press text-right"
            >
              <span className="text-[13px] text-white leading-tight">{o.label}</span>
              {o.hint && <span className="text-[10.5px] text-white/45 mt-0.5">{o.hint}</span>}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default NativePickerSheet;
