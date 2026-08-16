import { useState } from "react";
import { Link } from "react-router-dom";
import { Car, Plus, Repeat2, ShieldCheck, Truck, Boxes, ChevronLeft } from "lucide-react";
import { useGarage } from "@/contexts/GarageContext";
import { useAuth } from "@/contexts/AuthContext";
import VehiclePickerSheet from "@/components/native/VehiclePickerSheet";
import { haptic } from "@/lib/haptics";

/**
 * Precision Dark — signature hero plate.
 * Replaces the flat garage bar with an editorial "control plate":
 * etched grid, one gold light source, a slow sheen, and the vehicle
 * identity rendered as a machined spec block.
 */

const METRICS = [
  { icon: Boxes, label: "12K+ صنف" },
  { icon: ShieldCheck, label: "قطع أصلية" },
  { icon: Truck, label: "شحن لكل مصر" },
];

const NativeSignatureHero = ({ loading = false }: { loading?: boolean }) => {
  const { activeVehicle } = useGarage();
  const { isDealer, dealerAccount } = useAuth();
  const [open, setOpen] = useState(false);

  if (loading) return <div className="h-[188px] rounded-[22px] pd-skeleton" />;

  const tier = (dealerAccount?.tier || "").toLowerCase();
  const accountLabel = isDealer ? (tier === "retail" ? "حساب قطاعي" : "حساب جملة") : null;

  return (
    <>
      <div className="pd-hero pd-sheen p-5 pt-4">
        {/* eyebrow — live garage state */}
        <div className="relative flex items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-gold animate-pulse" />
            <span className="pd-index">ACTIVE GARAGE</span>
          </span>
          {accountLabel && (
            <span className="rounded-full border border-gold/25 bg-gold/10 px-2 py-[3px] text-[9.5px] text-gold leading-none">
              {accountLabel}
            </span>
          )}
        </div>

        {/* identity block */}
        <button
          type="button"
          onClick={() => {
            void haptic("medium");
            setOpen(true);
          }}
          className="relative w-full mt-3 flex items-end justify-between gap-3 text-right ios-press"
        >
          <span className="flex-1 min-w-0">
            {activeVehicle ? (
              <span className="block text-[22px] font-bold text-white leading-tight truncate">
                {activeVehicle.displayName}
              </span>
            ) : (
              <span className="block text-[19px] font-bold text-white leading-tight">
                اختار الموديل وسنة الصنع
              </span>
            )}
            <span className="mt-1.5 block pd-index">
              {activeVehicle ? "TOYOTA GENUINE FITMENT" : "AL MASRIA GROUP · EST. 1999"}
            </span>
          </span>

          <span className="shrink-0 rounded-[12px] bg-gold text-white px-4 h-9 grid place-items-center text-[12px] font-bold">
            {activeVehicle ? "تغيير" : "اختيار"}
          </span>
        </button>

        {/* precision line */}
        <div className="relative mt-4 pd-edge-t opacity-70" />

        {/* action */}
        <Link
          to={
            activeVehicle
              ? `/products?search=${encodeURIComponent(activeVehicle.model)}`
              : "/products"
          }
          onClick={() => void haptic("light")}
          className="relative mt-4 h-11 w-full rounded-[14px] pd-s3 border border-white/10 text-white text-[13.5px] font-semibold grid place-items-center ios-press"
        >
          {activeVehicle ? "شوف القطع المطابقة" : "تصفّح الكتالوج"}
        </Link>

        {/* spec strip */}
        <div className="relative mt-3.5 flex items-center justify-between gap-2">
          {METRICS.map((m) => (
            <span key={m.label} className="flex items-center gap-1.5 min-w-0">
              <m.icon className="w-[13px] h-[13px] text-gold/70 shrink-0" />
              <span className="text-[10.5px] text-white/45 leading-none truncate">{m.label}</span>
            </span>
          ))}
        </div>
      </div>


      <VehiclePickerSheet open={open} onOpenChange={setOpen} />
    </>
  );
};

export default NativeSignatureHero;
