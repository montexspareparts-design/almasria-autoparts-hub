import { useEffect } from "react";
import { createPortal } from "react-dom";
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

/**
 * Lightweight bottom sheet used by the native home quick actions.
 * Rendered in a portal on <body> so it always sits above the sticky
 * header and the floating tab bar (no visual overlap).
 */
const NativePickerSheet = ({ open, title, kicker, options, onClose }: Props) => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div dir="rtl" className="fixed inset-0 z-[300] pd-root">
      <button
        aria-label="إغلاق"
        onClick={onClose}
        className="absolute inset-0 bg-black/80 animate-in fade-in duration-150"
      />
      <div
        className="absolute inset-x-0 bottom-0 pd-s1 rounded-t-[22px] border-t border-white/10 shadow-2xl shadow-black/80 max-h-[78vh] flex flex-col animate-in slide-in-from-bottom duration-200"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom) + 16px)" }}
      >
        <div className="pt-2.5 pb-1 grid place-items-center shrink-0">
          <span className="w-10 h-1 rounded-full bg-white/15" />
        </div>

        <div className="px-4 pb-3 flex items-center justify-between shrink-0 border-b border-white/[0.07]">
          <div className="min-w-0">
            {kicker && <p className="pd-mono text-[10px] text-gold/70 mb-1">{kicker}</p>}
            <h3 className="text-[15px] text-white font-semibold truncate">{title}</h3>
          </div>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="w-9 h-9 rounded-full pd-s3 grid place-items-center shrink-0"
          >
            <X className="w-4 h-4 text-white/70" />
          </button>
        </div>

        <div className="px-4 pt-3 pb-2 grid grid-cols-2 gap-2 overflow-y-auto overscroll-contain">
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
    </div>,
    document.body,
  );
};

export default NativePickerSheet;
