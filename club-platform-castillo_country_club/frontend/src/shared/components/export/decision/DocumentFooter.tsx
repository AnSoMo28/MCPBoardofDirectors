/**
 * @component DocumentFooter (Fase 24)
 * @namespace .glass-decision__footer
 * @depends DecisionDocument.css
 */

export function DocumentFooter() {
  return (
    <div className="glass-decision__footer">
      <p className="glass-decision__footer-text">
        Documento generado por Castillo Country Club — AI Intelligence Platform
      </p>
      <p className="glass-decision__footer-disclaimer">
        Los datos y recomendaciones deben ser validados por el equipo directivo antes de tomar decisiones.
      </p>
    </div>
  );
}