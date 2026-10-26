/**
 * @component SituationSection (Fase 24 — §1)
 * @namespace .glass-decision__section
 * @depends DecisionDocument.css
 */

import { ShieldCheck } from "lucide-react";
import { SectionSkeleton } from "./SectionSkeleton";

interface SituationSectionProps {
  id: string;
  summary: string | undefined;
}

export function SituationSection({ id, summary }: SituationSectionProps) {
  return (
    <div id={id} className="glass-decision__section">
      <div className="glass-decision__section-header">
        <ShieldCheck size={16} className="glass-decision__section-icon" />
        <h2 className="glass-decision__section-title">1. Situación Actual</h2>
      </div>
      {summary ? (
        <p style={{ fontFamily: "var(--font-body, 'Source Serif 4', serif)", fontSize: 13, lineHeight: 1.7, margin: 0, color: "var(--color-silver-300, #b8b2a9)" }}>
          {summary}
        </p>
      ) : (
        <SectionSkeleton />
      )}
    </div>
  );
}