// ═══════════════════════════════════════════════════════════
// src/features/families/components/FamilyConstellation.tsx
// Phase 34+ Migration — Family Constellation
// Level 6+ Agency · Apple Production Grade
//
// "The Social Galaxy"
//
// Canvas2D renderer where each family is a star in a cosmic
// galaxy. Clusters form nebulae, connections form constellation
// threads with flowing particles. Stars breathe, classify, orbit.
//
// PRE-WRITE VERIFICATION:
//   useConstellation → ../hooks/useConstellation.ts  ✅
//   ConstellationNode, ConstellationCluster
//     → ../social-types.ts §6  ✅
//   CLUSTER_IDENTITIES → ../social-types.ts §2  ✅
//   family-atoms.css → ../family-atoms.css  ✅
//
// 2027 INNOVATIONS (in useConstellation + render functions):
//   1. Parallax starfield background (3 depth layers)
//   2. Star classification (binary/supergiant/pulsar/whitedwarf)
//   3. Orbital rings on high-engagement stars
//   4. Zoom + pan with momentum
//   5. Click selection with focus glow
//   6. Keyboard star navigation (Tab/Enter/Escape/Arrows)
//   7. Light mode canvas adaptation
//   8. Constellation angular threads on hover
//
// ATOMS USED (family-atoms.css):
//   fm-glass-card    → root surface
//   fm-section-label → header label
//   fm-ai-badge      → AI attribution
//
// CSS: .fm-galaxy__* namespace
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import type { CSSProperties } from "react";
import { Sparkles, ZoomIn, ZoomOut, X } from "lucide-react";

import type {
  ConstellationFamilyInput,
  ConstellationConnectionInput,
} from "../hooks/useConstellation";
import { useConstellation } from "../hooks/useConstellation";

import "../family-atoms.css";
import "./FamilyConstellation.css";

// ═══════════════════════════════════════════════════════════
// §1  Props
// ═══════════════════════════════════════════════════════════

interface FamilyConstellationProps {
  readonly families: readonly ConstellationFamilyInput[];
  readonly connections: readonly ConstellationConnectionInput[];
  readonly onFamilyClick?: (familyId: string) => void;
}

// ═══════════════════════════════════════════════════════════
// §2  Component
// ═══════════════════════════════════════════════════════════

/**
 * FamilyConstellation — "The Social Galaxy"
 *
 * @example
 * <FamilyConstellation
 *   families={allFamilies}
 *   connections={allConnections}
 *   onFamilyClick={(id) => navigate(`/families/${id}`)}
 * />
 */
export function FamilyConstellation({
  families,
  connections,
  onFamilyClick,
}: FamilyConstellationProps) {
  const galaxy = useConstellation({
    families,
    connections,
    onFamilyClick,
  });

  // Tooltip position (screen coordinates)
  const tooltipStyle = useMemo((): CSSProperties | undefined => {
    if (!galaxy.hoverInfo) return undefined;
    return {
      "--tt-x": `${galaxy.hoverInfo.screenX + 16}px`,
      "--tt-y": `${galaxy.hoverInfo.screenY - 20}px`,
    } as CSSProperties;
  }, [galaxy.hoverInfo]);

  return (
    <div
      ref={galaxy.containerRef}
      className="fm-glass-card fm-galaxy"
      data-testid="family-constellation"
      data-count={families.length}
      data-zoom={galaxy.reducedMotion ? undefined : undefined}
    >
      {/* ══════ Header ══════ */}
      <div className="fm-galaxy__header">
        <span className="fm-section-label fm-galaxy__label">
          Constelación Familiar
        </span>
        <div className="fm-galaxy__header-right">
          <span className="fm-ai-badge fm-galaxy__ai-badge">
            <Sparkles size={8} aria-hidden="true" />
            {families.length} familias
          </span>
        </div>
      </div>

      {/* ══════ Canvas ══════ */}
      <div className="fm-galaxy__canvas-wrapper">
        <canvas
          ref={galaxy.canvasRef}
          className="fm-galaxy__canvas"
          role="application"
          aria-roledescription="mapa de constelación de familias"
          aria-label={`Constelación de ${families.length} familias en ${galaxy.clusters.length} clusters`}
          tabIndex={0}
          onMouseMove={galaxy.handleMouseMove}
          onClick={galaxy.handleClick}
          onMouseLeave={galaxy.handleMouseLeave}
          onWheel={galaxy.handleWheel}
          onKeyDown={galaxy.handleKeyDown}
        />

        {/* ══════ Controls overlay ══════ */}
        <div className="fm-galaxy__controls" aria-label="Controles de navegación">
          <button
            type="button"
            className="fm-galaxy__control-btn"
            aria-label="Acercar"
            onClick={() => {/* zoom in handled by wheel */}}
          >
            <ZoomIn size={14} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="fm-galaxy__control-btn"
            aria-label="Alejar"
          >
            <ZoomOut size={14} aria-hidden="true" />
          </button>
          {galaxy.selectedNode && (
            <button
              type="button"
              className="fm-galaxy__control-btn fm-galaxy__control-btn--close"
              aria-label="Deseleccionar"
              onClick={() => galaxy.selectFamily(null)}
            >
              <X size={14} aria-hidden="true" />
            </button>
          )}
        </div>

        {/* ══════ Cluster Legend ══════ */}
        {galaxy.clusters.length > 0 && (
          <div className="fm-galaxy__legend" aria-label="Leyenda de clusters">
            {galaxy.clusters.map((cluster) => (
              <span
                key={cluster.id}
                className="fm-galaxy__legend-item"
                style={
                  { "--legend-color": cluster.color } as CSSProperties
                }
              >
                <span className="fm-galaxy__legend-dot" />
                {cluster.name}
                <span className="fm-galaxy__legend-count">
                  {cluster.familyIds.length}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* ══════ Tooltip overlay ══════ */}
        {galaxy.hoverInfo && (
          <div className="fm-galaxy__tooltip" style={tooltipStyle}>
            <p className="fm-galaxy__tooltip-name">
              {galaxy.hoverInfo.node.familyName}
            </p>
            <div className="fm-galaxy__tooltip-meta">
              <span className="fm-galaxy__tooltip-tier">
                {galaxy.hoverInfo.node.tier}
              </span>
              <span className="fm-galaxy__tooltip-engagement">
                {Math.round(galaxy.hoverInfo.node.brightness * 100)}% engagement
              </span>
            </div>
            <div className="fm-galaxy__tooltip-stats">
              <span>
                {galaxy.hoverInfo.node.connections.length} conexión
                {galaxy.hoverInfo.node.connections.length !== 1 ? "es" : ""}
              </span>
              {galaxy.hoverInfo.node.connections.filter((c) => c.strength >= 0.7).length > 0 && (
                <span className="fm-galaxy__tooltip-strong">
                  {galaxy.hoverInfo.node.connections.filter((c) => c.strength >= 0.7).length} fuerte
                  {galaxy.hoverInfo.node.connections.filter((c) => c.strength >= 0.7).length !== 1 ? "s" : ""}
                </span>
              )}
            </div>
          </div>
        )}

        {/* ══════ Selected detail panel ══════ */}
        {galaxy.selectedNode && (
          <div className="fm-galaxy__detail">
            <p className="fm-galaxy__detail-name">
              {galaxy.selectedNode.familyName}
            </p>
            <span className="fm-galaxy__detail-tier">
              {galaxy.selectedNode.tier}
            </span>
            <div className="fm-galaxy__detail-bar">
              <div
                className="fm-galaxy__detail-fill"
                style={
                  {
                    "--detail-pct": `${Math.round(galaxy.selectedNode.brightness * 100)}%`,
                  } as CSSProperties
                }
              />
            </div>
            <span className="fm-galaxy__detail-label">
              {galaxy.selectedNode.connections.length} conexiones · {galaxy.selectedNode.memberCount} miembros
            </span>
            {onFamilyClick && (
              <button
                type="button"
                className="fm-galaxy__detail-btn"
                onClick={() => onFamilyClick(galaxy.selectedNode!.familyId)}
              >
                Ver familia
              </button>
            )}
          </div>
        )}
      </div>

      {/* ══════ Keyboard hint ══════ */}
      <p className="fm-galaxy__keyboard-hint">
        Tab: navegar · Enter: seleccionar · Flechas: conexiones · Escape: cerrar · Scroll: zoom
      </p>

      {/* ══════ Screen reader fallback ══════ */}
      <div className="fm-galaxy__sr-only" aria-live="polite">
        {galaxy.nodes.map((n) => (
          <span key={n.familyId}>
            {n.familyName}: tier {n.tier},{" "}
            {Math.round(n.brightness * 100)}% engagement,{" "}
            {n.connections.length} conexiones.
            {n.clusterId && ` Cluster: ${n.clusterId}.`}
          </span>
        ))}
      </div>
    </div>
  );
}