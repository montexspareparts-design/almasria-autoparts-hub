import { useEffect, useState } from "react";
import { ChevronRight } from "lucide-react";
import IconButton from "./IconButton";

export interface AppHeaderProps {
  title: string;
  onBack?: () => void;
  action?: React.ReactNode;
  /** عنصر التمرير المراقَب؛ الافتراضي هو النافذة */
  scrollRef?: React.RefObject<HTMLElement>;
}

export const AppHeader = ({ title, onBack, action, scrollRef }: AppHeaderProps) => {
  const [solid, setSolid] = useState(false);

  useEffect(() => {
    const target: HTMLElement | Window = scrollRef?.current ?? window;
    const read = () =>
      setSolid((target === window ? window.scrollY : (target as HTMLElement).scrollTop) > 4);
    read();
    target.addEventListener("scroll", read, { passive: true });
    return () => target.removeEventListener("scroll", read);
  }, [scrollRef]);

  return (
    <header className={`ds-header sticky top-0 z-40 ${solid ? "ds-header--solid" : ""}`}>
      <div className="w-11">
        {onBack && (
          <IconButton label="رجوع" onClick={onBack}>
            {/* يُقلب تلقائيًا في RTL */}
            <ChevronRight className="w-[20px] h-[20px] rtl:rotate-0 ltr:rotate-180" strokeWidth={1.5} />
          </IconButton>
        )}
      </div>
      <h1 className="ds-body-strong flex-1 text-center truncate">{title}</h1>
      <div className="w-11 flex justify-end">{action}</div>
    </header>
  );
};

export default AppHeader;
