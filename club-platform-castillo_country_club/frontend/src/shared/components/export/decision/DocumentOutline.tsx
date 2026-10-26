/**
 * @component DocumentOutline (Fase 24)
 * @namespace .glass-decision__outline
 * @depends DecisionDocument.css
 * @note Sticky sidebar (desktop) / horizontal chips (mobile).
 *       Shows active section + loaded/pending per module.
 */

import { cn } from "@/shared/lib/utils";

interface DocSection {
  id: string;
  label: string;
  module: string;
}

interface DocumentOutlineProps {
  sections: readonly DocSection[];
  activeId: string | null;
  loadedModules: string[];
  onNavigate: (id: string) => void;
}

export function DocumentOutline({
  sections,
  activeId,
  loadedModules,
  onNavigate,
}: DocumentOutlineProps) {
  return (
    <nav className="glass-decision__outline" aria-label="Secciones del documento">
      {sections.map((section) => {
        const isActive = section.id === activeId;
        const isLoaded = loadedModules.includes(section.module);
        return (
          <button
            key={section.id}
            type="button"
            className={cn(
              "glass-decision__outline-item",
              isActive && "glass-decision__outline-item--active",
            )}
            onClick={() => onNavigate(section.id)}
            aria-current={isActive ? "true" : undefined}
          >
            <span>{section.label}</span>
            <span
              className={cn(
                "glass-decision__outline-badge",
                isLoaded && "glass-decision__outline-badge--loaded",
              )}
              aria-label={isLoaded ? "Cargado" : "Pendiente"}
            />
          </button>
        );
      })}
    </nav>
  );
}