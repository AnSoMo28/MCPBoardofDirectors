/**
 * @component PrintPage (Fase 25)
 * @namespace .glass-print__page
 * @depends PrintView.css
 * @note A4 page layout: institution header, report title,
 *       content area, confidentiality footer.
 * @import import '../PrintView.css';
 */

import type { ReactNode } from "react";

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

interface PrintPageProps {
  title: string;
  subtitle?: string;
  formattedDate: string;
  printedAt: string;
  children: ReactNode;
  className?: string;
}

/* ═══════════════════════════════════════
   Component
   ═══════════════════════════════════════ */

export function PrintPage({
  title,
  subtitle,
  formattedDate,
  printedAt,
  children,
  className,
}: PrintPageProps) {
  return (
    <div className={`glass-print__page ${className ?? ""}`}>
      {/* Institution header */}
      <div className="glass-print__page-header">
        <div className="glass-print__page-header-left">
          <img
            src="/CCC.png"
            alt="Castillo Country Club"
            className="glass-print__page-header-logo"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display =
                "none";
            }}
          />
          <div>
            <h1 className="glass-print__page-header-title">
              Castillo Country Club
            </h1>
            <p className="glass-print__page-header-sub">
              San José, Costa Rica
            </p>
          </div>
        </div>
        <div>
          <span className="glass-print__page-header-date-label">
            Generado el
          </span>
          <span className="glass-print__page-header-date">
            {formattedDate}
          </span>
        </div>
      </div>

      {/* Report title */}
      <div className="glass-print__page-title-section">
        <h2 className="glass-print__page-title">{title}</h2>
        {subtitle && (
          <p className="glass-print__page-subtitle">
            {subtitle}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="glass-print__page-content">
        {children}
      </div>

      {/* Footer */}
      <div className="glass-print__page-footer">
        <span>Castillo Country Club — Confidencial</span>
        <span>Impreso: {printedAt}</span>
      </div>
    </div>
  );
}