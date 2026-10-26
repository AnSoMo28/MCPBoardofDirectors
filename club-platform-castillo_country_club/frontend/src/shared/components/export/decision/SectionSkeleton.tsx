/**
 * @component SectionSkeleton (Fase 24)
 * @namespace .glass-decision__skeleton
 * @depends DecisionDocument.css
 */

export function SectionSkeleton() {
  return (
    <div className="glass-decision__skeleton" aria-hidden="true">
      <div className="glass-decision__skeleton-line glass-decision__skeleton-line--heading" />
      <div className="glass-decision__skeleton-line" />
      <div className="glass-decision__skeleton-line" />
      <div className="glass-decision__skeleton-line glass-decision__skeleton-line--short" />
    </div>
  );
}