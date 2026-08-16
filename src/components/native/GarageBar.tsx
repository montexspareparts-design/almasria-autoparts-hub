import { useState } from "react";
import { Car, ChevronLeft, Plus } from "lucide-react";
import { useGarage } from "@/contexts/GarageContext";
import VehiclePickerSheet from "@/components/native/VehiclePickerSheet";
import { haptic } from "@/lib/haptics";

/** "بتشتري لعربية ..." — the fitment anchor of the native home screen. */
const GarageBar = ({ className = "" }: { className?: string }) => {
  const { activeVehicle } = useGarage();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          void haptic("light");
          setOpen(true);
        }}
        className={`w-full flex items-center gap-3 h-14 rounded-2xl ios-card ios-press px-4 text-right ${className}`}
      >
        <span className="w-9 h-9 rounded-full bg-gold/12 grid place-items-center shrink-0">
          {activeVehicle ? <Car className="w-4.5 h-4.5 text-gold" /> : <Plus className="w-4.5 h-4.5 text-gold" />}
        </span>
        <span className="flex-1 min-w-0">
          <span className="block ar-body text-[10.5px] text-white/40 leading-none mb-1">
            {activeVehicle ? "بتشتري لعربية" : "حدّد عربيتك"}
          </span>
          <span className="block ar-body text-[14px] font-bold text-white truncate numeric">
            {activeVehicle ? activeVehicle.displayName : "اختار الموديل وسنة الصنع"}
          </span>
        </span>
        <ChevronLeft className="w-4 h-4 text-white/30 shrink-0" />
      </button>

      <VehiclePickerSheet open={open} onOpenChange={setOpen} />
    </>
  );
};

export default GarageBar;
