import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Car, Check } from "lucide-react";
import { VEHICLE_MODELS, yearsForModel, type VehicleModel } from "@/data/vehicleCatalogue";
import { useGarage } from "@/contexts/GarageContext";
import { haptic } from "@/lib/haptics";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Two-step bottom sheet: model → year. Toyota only (single-brand distributor). */
const VehiclePickerSheet = ({ open, onOpenChange }: Props) => {
  const { addVehicle, vehicles, activeVehicle, setActiveVehicle, removeVehicle } = useGarage();
  const [model, setModel] = useState<VehicleModel | null>(null);

  const close = () => {
    onOpenChange(false);
    setTimeout(() => setModel(null), 250);
  };

  const pickYear = (year: number) => {
    if (!model) return;
    void haptic("medium");
    addVehicle(model.key, model.label, year);
    close();
  };

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    const previousTouchAction = document.body.style.touchAction;
    document.body.style.overflow = "hidden";
    document.body.style.touchAction = "none";

    return () => {
      document.body.style.overflow = previousOverflow;
      document.body.style.touchAction = previousTouchAction;
    };
  }, [open]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <div dir="rtl" className="fixed inset-0 z-[400] isolate flex items-end overflow-hidden pd-root">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="absolute inset-0 bg-black/85 touch-none"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 38 }}
            role="dialog"
            aria-modal="true"
            aria-label={model ? `اختيار سنة صنع ${model.label}` : "اختيار موديل العربية"}
            className="relative z-10 w-full max-h-[min(82dvh,720px)] overflow-hidden rounded-t-[26px] bg-carbon border-t border-white/10 shadow-2xl shadow-black/80 flex flex-col pb-[calc(env(safe-area-inset-bottom)+20px)]"
          >
            <div className="shrink-0 bg-carbon px-5 pt-3 pb-3 border-b border-white/[0.07]">
              <div className="mx-auto w-10 h-1 rounded-full bg-white/20 mb-3" />
              <div className="flex items-center justify-between">
                <h3 className="ar-display text-[16px] font-bold text-white">
                  {model ? `سنة صنع ${model.label}` : "اختار عربيتك"}
                </h3>
                <button
                  type="button"
                  aria-label="إغلاق"
                  onClick={close}
                  className="w-9 h-9 rounded-full ios-card grid place-items-center"
                >
                  <X className="w-4 h-4 text-white/70" />
                </button>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain touch-pan-y">
            {!model && (
              <div className="px-5 pt-4 pb-2">
                {vehicles.length > 0 && (
                  <div className="mb-5">
                    <p className="ar-body text-[11px] text-white/40 mb-2">جراجك</p>
                    <div className="space-y-2">
                      {vehicles.map((v) => (
                        <div
                          key={v.id}
                          className="flex items-center gap-3 rounded-2xl ios-card px-4 h-12"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              void haptic("light");
                              setActiveVehicle(v.id);
                              close();
                            }}
                            className="flex-1 flex items-center gap-2 text-right"
                          >
                            <Car className="w-4 h-4 text-gold" />
                            <span className="ar-body text-[13.5px] font-semibold text-white numeric">
                              {v.displayName}
                            </span>
                            {activeVehicle?.id === v.id && <Check className="w-4 h-4 text-gold" />}
                          </button>
                          <button
                            type="button"
                            aria-label="حذف"
                            onClick={() => removeVehicle(v.id)}
                            className="text-white/35 text-[11px] ar-body"
                          >
                            حذف
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <p className="ar-body text-[11px] text-white/40 mb-2">موديلات تويوتا</p>
                <div className="grid grid-cols-2 gap-2.5">
                  {VEHICLE_MODELS.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => {
                        void haptic("light");
                        setModel(m);
                      }}
                      className="h-12 rounded-2xl ios-card ios-press ar-body text-[13.5px] font-semibold text-white"
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {model && (
              <div className="px-5 pt-4 pb-2">
                <button
                  type="button"
                  onClick={() => setModel(null)}
                  className="ar-body text-[12px] text-gold mb-3"
                >
                  ← تغيير الموديل
                </button>
                <div className="grid grid-cols-4 gap-2.5">
                  {yearsForModel(model).map((y) => (
                    <button
                      key={y}
                      type="button"
                      onClick={() => pickYear(y)}
                      className="h-11 rounded-xl ios-card ios-press ar-body text-[13px] font-semibold text-white numeric"
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>
            )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
};

export default VehiclePickerSheet;
