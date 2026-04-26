import { CalendarRange, Car, CheckCircle2, AlertTriangle, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  computeFitmentRange,
  evaluateFit,
  formatRange,
  getCompatibleModels,
  isYearIrrelevantProduct,
  type FitVerdict,
} from "@/lib/productFitment";

interface ProductFitmentSectionProps {
  product: any;
  /** Year extracted from the search query the user came from (e.g. 2018). */
  searchYear?: number | null;
  /** Saved profile car year (used as a secondary match signal). */
  profileCarYear?: number | null;
  /** Saved profile car model (matched against compatible_models). */
  profileCarModel?: string | null;
}

/* Map a verdict to a colored "match indicator" pill. */
const verdictView = (v: FitVerdict, source: "search" | "profile"): {
  tone: "success" | "warning" | "info";
  icon: React.ComponentType<{ className?: string }>;
  text: string;
} => {
  const ctx = source === "search" ? "البحث" : "سيارتك";
  switch (v.kind) {
    case "fits_exact":
      return {
        tone: "success",
        icon: CheckCircle2,
        text: `مطابق لـ ${v.year} (${ctx}) — مذكور صراحة باسم الصنف`,
      };
    case "fits_range":
      return {
        tone: "success",
        icon: CheckCircle2,
        text: `يركّب على ${v.year} (${ctx}) — يدخل ضمن نطاق التوافق`,
      };
    case "out_of_range":
      return {
        tone: "warning",
        icon: AlertTriangle,
        text: `قد لا يناسب ${v.year} (${ctx}) — خارج نطاق التغطية الرسمي`,
      };
    case "unknown":
      return {
        tone: "info",
        icon: HelpCircle,
        text: `لم نتمكن من تأكيد التوافق مع ${v.year} (${ctx}) — راجع تفاصيل الصنف`,
      };
  }
};

const TONE_CLASS: Record<"success" | "warning" | "info", string> = {
  success:
    "bg-emerald-50 text-emerald-800 border-emerald-300 ring-1 ring-emerald-100 " +
    "dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800/60",
  warning:
    "bg-amber-50 text-amber-900 border-amber-300 ring-1 ring-amber-100 " +
    "dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800/60",
  info:
    "bg-sky-50 text-sky-900 border-sky-300 ring-1 ring-sky-100 " +
    "dark:bg-sky-950/40 dark:text-sky-200 dark:border-sky-800/60",
};

/**
 * Visible inside ProductDetailDialog. Communicates three things at a glance:
 *   1. The model-year coverage range for this part.
 *   2. Which models it fits (chips).
 *   3. Whether it matches the year the user searched for and/or their saved car.
 *
 * Hidden entirely for products where year doesn't apply (oils, fluids).
 */
const ProductFitmentSection = ({
  product,
  searchYear,
  profileCarYear,
  profileCarModel,
}: ProductFitmentSectionProps) => {
  if (!product || isYearIrrelevantProduct(product)) return null;

  const range = computeFitmentRange(product);
  const models = getCompatibleModels(product);
  const searchVerdict = evaluateFit(product, searchYear ?? null);
  const profileVerdict =
    profileCarYear && profileCarYear !== searchYear
      ? evaluateFit(product, profileCarYear)
      : null;

  // Nothing meaningful to show
  if (!range && models.length === 0 && !searchVerdict && !profileVerdict) return null;

  const profileModelMatches =
    !!profileCarModel &&
    models.some((m) => m.includes(profileCarModel) || profileCarModel.includes(m));

  return (
    <div className="rounded-xl border border-border/60 bg-muted/30 p-3 sm:p-4 space-y-3">
      <div className="flex items-center gap-2">
        <Car className="w-4 h-4 text-primary shrink-0" />
        <h3 className="text-sm font-bold text-foreground">توافق الصنف مع سيارتك</h3>
      </div>

      {/* ── Year coverage row ─────────────────────────────────────────── */}
      {range && (
        <div className="flex items-start gap-2">
          <CalendarRange className="w-4 h-4 text-primary mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-[11px] text-muted-foreground">سنوات الموديل المتوافقة</p>
            <p className="text-sm font-semibold text-foreground">
              {formatRange(range)}
              {range.source === "name" && (
                <span className="text-[10px] text-muted-foreground font-normal mr-2">
                  (مستخرجة من اسم الصنف)
                </span>
              )}
            </p>
          </div>
        </div>
      )}

      {/* ── Compatible-models chips ───────────────────────────────────── */}
      {models.length > 0 && (
        <div>
          <p className="text-[11px] text-muted-foreground mb-1.5">يناسب الموديلات</p>
          <div className="flex flex-wrap gap-1.5">
            {models.map((m) => {
              const isUserModel = !!profileCarModel && (m.includes(profileCarModel) || profileCarModel.includes(m));
              return (
                <Badge
                  key={m}
                  variant="secondary"
                  className={
                    isUserModel
                      ? "bg-emerald-100 text-emerald-800 border-emerald-300 text-[10px] sm:text-xs"
                      : "text-[10px] sm:text-xs"
                  }
                >
                  {m}
                  {isUserModel && " ✓"}
                </Badge>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Live match verdicts (search + profile) ────────────────────── */}
      {(searchVerdict || profileVerdict) && (
        <div className="space-y-1.5 pt-1">
          {searchVerdict && (() => {
            const v = verdictView(searchVerdict, "search");
            const Icon = v.icon;
            return (
              <div className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 text-xs sm:text-sm ${TONE_CLASS[v.tone]}`}>
                <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                <span className="leading-relaxed">{v.text}</span>
              </div>
            );
          })()}
          {profileVerdict && (() => {
            const v = verdictView(profileVerdict, "profile");
            const Icon = v.icon;
            return (
              <div className={`flex items-start gap-2 rounded-lg border px-2.5 py-2 text-xs sm:text-sm ${TONE_CLASS[v.tone]}`}>
                <Icon className="w-4 h-4 mt-0.5 shrink-0" />
                <span className="leading-relaxed">
                  {v.text}
                  {profileCarModel && profileModelMatches && " — وموديل سيارتك متوافق ✓"}
                </span>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
};

export default ProductFitmentSection;
