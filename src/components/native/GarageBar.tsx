import { useState } from "react";
import { Car, ChevronLeft, Plus, Repeat2 } from "lucide-react";
import { useGarage } from "@/contexts/GarageContext";
import { useAuth } from "@/contexts/AuthContext";
import VehiclePickerSheet from "@/components/native/VehiclePickerSheet";
import { haptic } from "@/lib/haptics";

/**
 * "بتشتري لعربية ..." — the fitment anchor of the native home screen.
 * Fixed 56px height so it never shifts layout while auth/garage resolve.
 */
const GarageBar = ({ className = "", loading = false }: { className?: string; loading?: boolean }) => {
  const { activeVehicle } = useGarage();
  const { isDealer, dealerAccount } = useAuth();
  const [open, setOpen] = useState(false);

  if (loading) {
    return <div className={`w-full h-14 rounded-[16px] pd-skeleton ${className}`} />;
  }

  const dealerLabel = isDealer
    ? (dealerAccount?.tier || "").toLowerCase() === "retail"
      ? "حساب قطاعي"
      : "حساب جملة"
    : null;

  return (
    <>
      <button
        type="button"
        onClick={() => {
          void haptic("light");
          setOpen(true);
        }}
        className={`w-full flex items-center gap-3 h-14 rounded-[16px] pd-card ios-press px-3.5 text-right ${className}`}
      >
        <span className="w-9 h-9 rounded-full bg-gold/12 grid place-items-center shrink-0">
          {activeVehicle ? <Car className="w-[18px] h-[18px] text-gold" /> : <Plus className="w-[18px] h-[18px] text-gold" />}
        </span>
        <span className="flex-1 min-w-0">
          <span className="flex items-center gap-1.5 text-[10.5px] text-white/40 leading-none mb-1">
            {activeVehicle ? "بتشتري لعربية" : "حدّد عربيتك"}
            {dealerLabel && (
              <span className="rounded bg-white/[0.07] px-1.5 py-0.5 text-[9.5px] text-white/55">{dealerLabel}</span>
            )}
          </span>
          <span className="block text-[14px] font-semibold text-white truncate pd-mono">
            {activeVehicle ? activeVehicle.displayName : "اختار الموديل وسنة الصنع"}
          </span>
        </span>
        {activeVehicle ? (
          <Repeat2 className="w-[18px] h-[18px] text-white/35 shrink-0" />
        ) : (
          <ChevronLeft className="w-4 h-4 text-white/30 shrink-0" />
        )}
      </button>

      <VehiclePickerSheet open={open} onOpenChange={setOpen} />
    </>
  );
};

export default GarageBar;
