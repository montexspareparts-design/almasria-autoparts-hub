import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Car } from "lucide-react";

const toyotaModels = [
  { value: "هاي اس", label: "هاي اس (Hiace)" },
  { value: "كوستر", label: "كوستر (Coaster)" },
  { value: "كورولا", label: "كورولا (Corolla)" },
  { value: "هاي لوكس", label: "هاي لوكس (Hilux)" },
  { value: "فورتشنر", label: "فورتشنر (Fortuner)" },
  { value: "لاند كروزر", label: "لاند كروزر (Land Cruiser)" },
  { value: "برادو", label: "برادو (Prado)" },
  { value: "كامري", label: "كامري (Camry)" },
  { value: "ياريس", label: "ياريس (Yaris)" },
  { value: "راش", label: "راش (Rush)" },
  { value: "افانزا", label: "افانزا (Avanza)" },
  { value: "راف فور", label: "راف فور (RAV4)" },
];

const currentYear = new Date().getFullYear();
const years = Array.from({ length: 35 }, (_, i) => currentYear - i);

interface CarModelSelectorProps {
  carModel: string;
  carYear: string;
  onModelChange: (val: string) => void;
  onYearChange: (val: string) => void;
  required?: boolean;
  compact?: boolean;
}

const CarModelSelector = ({ carModel, carYear, onModelChange, onYearChange, required = false, compact = false }: CarModelSelectorProps) => {
  return (
    <div className={compact ? "space-y-3" : "space-y-4"}>
      {!compact && (
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground/80">
          <Car className="w-4 h-4 text-primary" />
          <span>بيانات العربية {!required && <span className="text-muted-foreground/50 text-[10px]">(اختياري)</span>}</span>
        </div>
      )}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground/80">
            موديل العربية {required && <span className="text-primary">*</span>}
          </Label>
          <Select value={carModel} onValueChange={onModelChange}>
            <SelectTrigger className="text-right h-11">
              <SelectValue placeholder="اختر الموديل" />
            </SelectTrigger>
            <SelectContent className="z-[100] bg-popover" position="popper" sideOffset={4}>

              {toyotaModels.map((model) => (
                <SelectItem key={model.value} value={model.value}>
                  {model.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-semibold text-foreground/80">
            سنة الصنع {required && <span className="text-primary">*</span>}
          </Label>
          <Select value={carYear} onValueChange={onYearChange}>
            <SelectTrigger className="text-right h-11">
              <SelectValue placeholder="السنة" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export { toyotaModels };
export default CarModelSelector;
