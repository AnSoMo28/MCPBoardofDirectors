/**
 * @component PeriodSelector (Fase 25)
 * @namespace .glass-board__period-*
 * @depends PeriodSelector.css
 * @note URL-synced period selector with keyboard navigation.
 * @import import './PeriodSelector.css';
 */
import "./PeriodSelector.css";

import { useCallback } from "react";
import { cn } from "@/shared/lib/utils";
import { Button } from "@/shared/components/ui/Button";

interface PeriodSelectorProps {
  periods: { value: string; label: string }[];
  selectedPeriod: string;
  onSelect: (period: string) => void;
}

export function PeriodSelector({
  periods,
  selectedPeriod,
  onSelect,
}: PeriodSelectorProps) {
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      const buttons = Array.from(
        (e.currentTarget as HTMLElement).querySelectorAll("button"),
      );
      const idx = buttons.indexOf(e.target as HTMLButtonElement);
      if (idx === -1) return;

      if (e.key === "ArrowRight") {
        e.preventDefault();
        buttons[Math.min(idx + 1, buttons.length - 1)]?.focus();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        buttons[Math.max(idx - 1, 0)]?.focus();
      }
    },
    [],
  );

  return (
    <div
      className="glass-board__period-bar"
      role="group"
      aria-label="Seleccionar periodo"
      onKeyDown={handleKeyDown}
    >
      <span className="glass-board__period-label">Periodo:</span>
      {periods.map((p) => (
        <Button
          variant="unstyled"
          key={p.value}
          type="button"
          aria-pressed={selectedPeriod === p.value}
          onClick={() => onSelect(p.value)}
          className={cn(
            "glass-board__period-btn",
            selectedPeriod === p.value &&
              "glass-board__period-btn--active",
          )}
        >
          {p.label}
        </Button>
      ))}
    </div>
  );
}