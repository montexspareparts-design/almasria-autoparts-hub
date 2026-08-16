import { Link } from "react-router-dom";
import { CheckCircle2, AlertTriangle } from "lucide-react";
import { LazyImage } from "@/components/ui/lazy-image";
import { useAuth } from "@/contexts/AuthContext";
import { evaluateFit } from "@/lib/productFitment";
import { haptic } from "@/lib/haptics";

interface Props {
  product: any;
  /** Active garage year — omit to hide the fitment badge entirely. */
  year?: number | null;
  className?: string;
}

/**
 * Native product card. Mandatory 3-column identity:
 * كود الصنف (erp_item_code) + بارت نمبر (part_number) + اسم الصنف (name_ar).
 * Adds a fitment badge when a garage vehicle is active.
 */
const FitPartCard = ({ product: p, year, className = "" }: Props) => {
  const { user, isDealer, dealerAccount } = useAuth();
  const verdict = year ? evaluateFit(p, year) : null;
  const outOfRange = verdict?.kind === "out_of_range";
  const fits = verdict?.kind === "fits_exact" || verdict?.kind === "fits_range";

  const isRetailTier = (dealerAccount?.tier || "").toLowerCase() === "retail";
  const showBasePrice = !!user && (!isDealer || isRetailTier);

  return (
    <Link
      to={`/products?search=${encodeURIComponent(p.sku || p.part_number || p.name_ar)}`}
      onClick={() => void haptic("light")}
      className={`snap-start shrink-0 rounded-[22px] ios-card overflow-hidden ios-press flex flex-col ${
        outOfRange ? "opacity-60" : ""
      } ${className}`}
    >
      <div className="p-2.5 pb-0 relative">
        <div className="aspect-square rounded-[16px] bg-white p-3">
          <LazyImage src={p.image_url} alt={p.name_ar} className="w-full h-full object-contain" />
        </div>
        {fits && (
          <span className="absolute top-4 right-4 inline-flex items-center gap-1 rounded-full bg-emerald-500/90 px-2 py-1 ar-body text-[9.5px] font-bold text-white">
            <CheckCircle2 className="w-3 h-3" /> مطابق
          </span>
        )}
        {outOfRange && (
          <span className="absolute top-4 right-4 inline-flex items-center gap-1 rounded-full bg-destructive/90 px-2 py-1 ar-body text-[9.5px] font-bold text-white">
            <AlertTriangle className="w-3 h-3" /> مش مطابق
          </span>
        )}
      </div>

      <div className="p-3.5 pt-3 flex flex-col flex-1">
        <div className="flex items-center gap-1.5 flex-wrap">
          {p.erp_item_code && (
            <span className="ar-body text-[10px] text-gold leading-none numeric rounded-md bg-gold/10 px-1.5 py-1">
              {p.erp_item_code}
            </span>
          )}
          {p.part_number && (
            <span className="font-mono text-[10px] text-white/40 leading-none truncate numeric max-w-[60%]">
              {p.part_number}
            </span>
          )}
        </div>

        <p className="ar-body text-[12.5px] font-semibold leading-snug line-clamp-2 min-h-[2.4rem] mt-2 text-white">
          {p.name_ar}
        </p>

        <div className="mt-auto pt-2.5 border-t border-white/[0.07]">
          {!user ? (
            <p className="ar-body text-[11px] font-semibold text-gold/80">سجّل لرؤية السعر</p>
          ) : showBasePrice ? (
            <p className="ar-display text-[15px] font-bold text-white numeric">
              {Number(p.base_price || 0).toLocaleString("en-US")} EGP
            </p>
          ) : (
            <p className="ar-body text-[11px] font-semibold text-gold/80">اعرض سعر الجملة</p>
          )}
        </div>
      </div>
    </Link>
  );
};

export default FitPartCard;
