import { Link, useNavigate } from "react-router-dom";
import { Check, X, HelpCircle, Plus } from "lucide-react";
import { LazyImage } from "@/components/ui/lazy-image";
import { useAuth } from "@/contexts/AuthContext";
import { useCart } from "@/contexts/CartContext";
import { evaluateFit } from "@/lib/productFitment";
import { resolvePriceState, canQuickAdd } from "@/lib/pricing";
import { haptic } from "@/lib/haptics";

interface Props {
  product: any;
  /** Active garage year — omit to hide the fitment badge entirely. */
  year?: number | null;
  className?: string;
}

type Badge = { label: string; cls: string; Icon: typeof Check };

const badgeFor = (kind?: string | null): Badge | null => {
  if (!kind) return null;
  if (kind === "fits_exact" || kind === "fits_range")
    return { label: "يركّب", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", Icon: Check };
  if (kind === "out_of_range")
    return { label: "مش مطابق", cls: "bg-red-500/15 text-red-400 border-red-500/30", Icon: X };
  return { label: "غير مؤكد", cls: "bg-white/[0.06] text-white/50 border-white/10", Icon: HelpCircle };
};

/**
 * Precision Dark part card.
 * 1:1 image plate, mandatory 3-column identity
 * (كود الصنف + بارت نمبر + اسم الصنف), fitment badge, gold add action.
 */
const FitPartCard = ({ product: p, year, className = "" }: Props) => {
  const navigate = useNavigate();
  const { user, isDealer, dealerAccount } = useAuth();
  const { addItem } = useCart();

  const verdict = year ? evaluateFit(p, year) : null;
  const badge = year ? badgeFor(verdict?.kind ?? "unknown") : null;
  const dimmed = verdict?.kind === "out_of_range";

  const price = resolvePriceState({
    user,
    isDealer,
    tier: dealerAccount?.tier,
    basePrice: p.base_price,
  });
  const quickAdd = canQuickAdd(price);

  const onAdd = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    void haptic("medium");
    if (!quickAdd) {
      navigate(`/products?search=${encodeURIComponent(p.sku || p.part_number || p.name_ar)}`);
      return;
    }
    addItem({
      id: p.id,
      name_ar: p.name_ar,
      sku: p.sku || p.erp_item_code || "",
      image_url: p.image_url ?? null,
      unit_price: Number(p.base_price || 0),
      quantity: 1,
      stock_quantity: Number(p.stock_quantity ?? 99),
      min_order_qty: Number(p.min_order_qty ?? 1),
      brand: p.brand || "",
    });
  };

  return (
    <Link
      to={`/products?search=${encodeURIComponent(p.sku || p.part_number || p.name_ar)}`}
      onClick={() => void haptic("light")}
      className={`pd-card overflow-hidden flex flex-col ios-press ${dimmed ? "opacity-55" : ""} ${className}`}
    >
      <div className="relative p-2 pb-0">
        <div className="aspect-square rounded-[12px] bg-white p-2.5 overflow-hidden">
          <LazyImage src={p.image_url} alt={p.name_ar} className="w-full h-full object-contain" />
        </div>
        {badge && (
          <span
            className={`absolute top-3.5 right-3.5 inline-flex items-center gap-1 rounded-full border px-2 h-6 text-[10px] font-medium ${badge.cls}`}
          >
            <badge.Icon className="w-3 h-3" />
            {badge.label}
          </span>
        )}
      </div>

      <div className="p-3 pt-2.5 flex flex-col flex-1">
        <div className="flex items-center gap-1.5 min-h-[20px]">
          {p.erp_item_code && (
            <span className="pd-mono text-[10px] text-gold leading-none rounded bg-gold/10 px-1.5 py-1">
              {p.erp_item_code}
            </span>
          )}
          {p.part_number && (
            <span className="pd-mono text-[10px] text-white/40 leading-none truncate max-w-[58%]">
              {p.part_number}
            </span>
          )}
        </div>

        <p className="text-[12.5px] font-medium leading-[1.55] line-clamp-2 min-h-[2.5rem] mt-1.5 text-white/90">
          {p.name_ar}
        </p>

        <div className="mt-auto pt-2.5 flex items-center justify-between gap-2">
          {price.kind === "visible" ? (
            <span className="pd-mono text-[14px] font-semibold text-white">{price.label}</span>
          ) : (
            <span className="text-[11px] font-medium text-gold/85 leading-tight">{price.label}</span>
          )}
          <button
            type="button"
            onClick={onAdd}
            aria-label={quickAdd ? "أضف إلى السلة" : price.label}
            className="w-9 h-9 shrink-0 rounded-full bg-gold grid place-items-center ios-press"
          >
            <Plus className="w-[18px] h-[18px] text-black" strokeWidth={2.6} />
          </button>
        </div>
      </div>
    </Link>
  );
};

export default FitPartCard;
