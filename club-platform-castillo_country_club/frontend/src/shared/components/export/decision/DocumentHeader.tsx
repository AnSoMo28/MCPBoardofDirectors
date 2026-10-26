interface DocumentHeaderProps {
  period: string;
  audience: string;
  confidence: number;
  generatedAt: string;
  loadedCount: number;
  totalCount: number;
}

export function DocumentHeader({
  period,
  audience,
  confidence,
  generatedAt,
  loadedCount,
  totalCount,
}: DocumentHeaderProps) {
  const date = new Date(generatedAt).toLocaleDateString("es-CR", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="glass-decision__header">
      <div className="glass-decision__header-top">
        <div>
          <h1 className="glass-decision__header-title">
            Documento de Decisión
          </h1>
          <p className="glass-decision__header-subtitle">
            Castillo Country Club — {period}
          </p>
          <p className="glass-decision__header-meta">
            Generado: {date} · Audiencia: {audience} · Confianza: {confidence}%
          </p>
        </div>
        <span className="glass-decision__header-source">
          {loadedCount}/{totalCount} fuentes
        </span>
      </div>
    </div>
  );
}