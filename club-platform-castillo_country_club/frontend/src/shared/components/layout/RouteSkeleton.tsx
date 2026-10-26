// src/shared/components/layout/RouteSkeleton.tsx
// Fase 21 — Silver Tide Route Skeleton
// Glass blocks · Stagger shimmer · Content shape fidelity
// ═══════════════════════════════════════════════════════════════════

import './RouteSkeleton.css';

export function RouteSkeleton() {
  return (
    <div
      className="glass-skeleton-route"
      aria-label="Cargando página"
      role="status"
    >
      {/* ── Header skeleton ── */}
      <div className="glass-skeleton-section" style={{ animationDelay: "0ms" }}>
        <div className="glass-skeleton-block glass-skeleton-block--title" />
        <div className="glass-skeleton-block glass-skeleton-block--subtitle" />
      </div>

      {/* ── KPI row skeleton ── */}
      <div className="glass-skeleton-kpi-grid">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="glass-skeleton-card glass-skeleton-card--kpi"
            style={{ animationDelay: `${100 + i * 100}ms` }}
          >
            <div className="glass-skeleton-card__icon" />
            <div className="glass-skeleton-card__label" />
            <div className="glass-skeleton-card__value" />
            <div className="glass-skeleton-card__bar" />
          </div>
        ))}
      </div>

      {/* ── Content block skeleton ── */}
      <div className="glass-skeleton-content-grid">
        <div
          className="glass-skeleton-card glass-skeleton-card--chart"
          style={{ animationDelay: "500ms" }}
        >
          <div className="glass-skeleton-card__chart-line" />
          <div className="glass-skeleton-card__chart-bars">
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                className="glass-skeleton-card__chart-bar"
                style={{ height: `${30 + Math.sin(i * 0.9) * 25 + 15}%` }}
              />
            ))}
          </div>
        </div>
        <div
          className="glass-skeleton-card glass-skeleton-card--sidebar"
          style={{ animationDelay: "600ms" }}
        >
          <div className="glass-skeleton-card__gauge" />
          <div className="glass-skeleton-card__sidebar-items">
            {[0, 1, 2].map((i) => (
              <div key={i} className="glass-skeleton-card__sidebar-row" />
            ))}
          </div>
        </div>
      </div>

      {/* ── Table rows skeleton ── */}
      <div className="glass-skeleton-table">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="glass-skeleton-table__row"
            style={{ animationDelay: `${700 + i * 80}ms` }}
          >
            <div className="glass-skeleton-table__avatar" />
            <div className="glass-skeleton-table__col glass-skeleton-table__col--wide" />
            <div className="glass-skeleton-table__col glass-skeleton-table__col--medium" />
            <div className="glass-skeleton-table__col glass-skeleton-table__col--narrow" />
          </div>
        ))}
      </div>
    </div>
  );
}