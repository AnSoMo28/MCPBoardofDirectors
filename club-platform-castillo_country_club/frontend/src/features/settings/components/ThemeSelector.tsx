/**
 * @component ThemeSelector (Fase 25)
 * @namespace .glass-settings__theme
 * @depends SettingsPage.css
 * @note Dark/Light theme toggle with visual feedback.
 * @import import '../SettingsPage.css';
 */

import { Sun, Moon, Check } from "lucide-react";
import { cn } from "@/shared/lib/utils";

interface ThemeSelectorProps {
  theme: string;
  onToggle: () => void;
}

export function ThemeSelector({
  theme,
  onToggle,
}: ThemeSelectorProps) {
  const options = [
    { key: "dark" as const, label: "Oscuro", icon: Moon },
    { key: "light" as const, label: "Claro", icon: Sun },
  ];

  return (
    <div className="glass-settings__theme">
      {options.map((opt) => {
        const active = theme === opt.key;
        const Icon = opt.icon;
        return (
          <button
            key={opt.key}
            type="button"
            onClick={() => !active && onToggle()}
            aria-pressed={active}
            className={cn(
              "glass-settings__theme-btn",
              active && "glass-settings__theme-btn--active",
            )}
          >
            <Icon size={20} />
            <span>{opt.label}</span>
            {active && <Check size={14} />}
          </button>
        );
      })}
    </div>
  );
}