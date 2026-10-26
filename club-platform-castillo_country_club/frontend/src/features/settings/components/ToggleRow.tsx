/**
 * @component ToggleRow (Fase 25)
 * @namespace .glass-settings__toggle-row
 * @depends SettingsPage.css
 * @note Accessible toggle switch with label and description.
 * @import import '../SettingsPage.css';
 */

import { cn } from "@/shared/lib/utils";

interface ToggleRowProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}

export function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: ToggleRowProps) {
  return (
    <div className="glass-settings__toggle-row">
      <div className="glass-settings__toggle-row-text">
        <p className="glass-settings__toggle-label">{label}</p>
        {description && (
          <p className="glass-settings__toggle-description">
            {description}
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={`${label}: ${checked ? "activado" : "desactivado"}`}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cn(
          "glass-settings__toggle-switch",
          checked && "glass-settings__toggle-switch--on",
        )}
      >
        <span className="glass-settings__toggle-switch-knob" />
      </button>
    </div>
  );
}