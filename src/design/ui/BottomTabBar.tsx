import type { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";
import { dsSpring } from "../motion";
import { light } from "../haptics";

export interface TabItem {
  key: string;
  label: string;
  icon: LucideIcon;
}

export interface BottomTabBarProps {
  items: TabItem[];
  value: string;
  onChange: (key: string) => void;
}

export const BottomTabBar = ({ items, value, onChange }: BottomTabBarProps) => (
  <nav className="ds-tabbar" aria-label="التنقل الرئيسي">
    <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, 1fr)` }}>
      {items.map((item) => {
        const active = item.key === value;
        const Icon = item.icon;
        return (
          <button
            key={item.key}
            type="button"
            aria-current={active ? "page" : undefined}
            className={`ds-tabbar__item ds-focus ${active ? "ds-tabbar__item--active" : ""}`}
            onClick={() => {
              light();
              onChange(item.key);
            }}
          >
            <Icon className="w-[22px] h-[22px]" strokeWidth={1.5} />
            <span className="ds-micro">{item.label}</span>
            {active && (
              <motion.span
                layoutId="ds-tab-dot"
                transition={dsSpring}
                className="absolute bottom-2 w-1 h-1 rounded-full"
                style={{ background: "var(--brand-red)" }}
              />
            )}
          </button>
        );
      })}
    </div>
  </nav>
);

export default BottomTabBar;
