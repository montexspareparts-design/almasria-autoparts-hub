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
      <div className="pd-hero pd-sheen p-4 pt-3.5">
        {/* eyebrow */}
        <div className="relative flex items-center justify-between gap-2">
          <span className="pd-index">AL MASRIA GROUP · EST. 1999</span>
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
          className="relative w-full mt-3 flex items-center gap-3 text-right ios-press"
        >
          <span className="w-11 h-11 rounded-[14px] grid place-items-center shrink-0 border border-gold/25 bg-gold/[0.09]">
            {activeVehicle ? (
              <Car className="w-[21px] h-[21px] text-gold" />
            ) : (
              <Plus className="w-[21px] h-[21px] text-gold" />
            )}
          </span>

          <span className="flex-1 min-w-0">
            <span className="block text-[10.5px] text-white/45 leading-none mb-1.5">
              {activeVehicle ? "بتشتري لعربية" : "ابدأ من عربيتك"}
            </span>
            {activeVehicle ? (
              <span className="block text-[19px] font-semibold text-white leading-tight truncate">
                {activeVehicle.displayName}
              </span>
            ) : (
              <span className="block text-[17px] font-semibold text-white leading-tight">
                اختار الموديل وسنة الصنع
              </span>
            )}
          </span>

          <span className="w-9 h-9 rounded-full pd-s3 grid place-items-center shrink-0 border border-white/10">
            {activeVehicle ? (
              <Repeat2 className="w-[17px] h-[17px] text-white/60" />
            ) : (
              <ChevronLeft className="w-[17px] h-[17px] text-gold" />
            )}
          </span>
        </button>

        {/* precision line */}
        <div className="relative mt-3.5 pd-edge-t opacity-70" />

        {/* action + metrics */}
        <div className="relative mt-3.5 flex items-center gap-2">
          <Link
            to={
              activeVehicle
                ? `/products?search=${encodeURIComponent(activeVehicle.model)}`
                : "/products"
            }
            onClick={() => void haptic("light")}
            className="h-10 px-4 rounded-full bg-gold text-black text-[12.5px] font-semibold grid place-items-center ios-press shrink-0"
          >
            {activeVehicle ? "شوف القطع المطابقة" : "تصفّح الكتالوج"}
          </Link>
          <div className="flex-1 min-w-0 flex items-center justify-end gap-3 overflow-hidden">
            {METRICS.map((m) => (
              <span key={m.label} className="flex items-center gap-1 shrink-0">
                <m.icon className="w-[13px] h-[13px] text-white/35" />
                <span className="text-[10.5px] text-white/45 leading-none whitespace-nowrap">{m.label}</span>
              </span>
            ))}
          </div>
        </div>
      </div>

      <VehiclePickerSheet open={open} onOpenChange={setOpen} />
    </>
  );
};

export default NativeSignatureHero;
