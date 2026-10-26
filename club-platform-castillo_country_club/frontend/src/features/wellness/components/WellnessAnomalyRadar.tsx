// src/features/wellness/components/WellnessAnomalyRadar.tsx
// ═══════════════════════════════════════════════════════════
// Wellness — Anomaly Radar · "The Watchtower" (P7)
//
// @level       Level 6+ Agency · Apple Production Grade · 2027
// @role        Senior Expert UI/UX, AI/ML, Architecture
// @namespace   .wr / .wr__* (wellness radar family)
// @keyframes   3 (wr-scan, wr-blip-critical, wr-star)
//              — in WellnessAnomalyRadar.css
// @depends     globals.css §1 tokens, ../types (Wellness domain),
//              shared/lib/utils (cn), react (memo, useMemo)
//
// Radar SVG circular con blips por severidad. La geometría es un
// DECISIÓN DE DISEÑO documentada (no decorativa):
//   · Ángulo: distribución uniforme tras ordenar por severidad —
//     critical ocupa las 12:00 y el recorrido continúa horario.
//   · Radio: la severidad es distancia al corazón — critical en
//     el anillo interior (donde el ojo aterriza primero), low
//     hacia el perímetro. NO "corregir" esto: es intencional.
//   · Scan line: geometría estática en JSX + rotación CSS pura
//     (transform-box: view-box) — cero matemática por frame.
//
// ANTI-PATTERNS REMOVED:
// [x] Import CSS insertado DENTRO de la declaración `import type {…}`
//     (la corrupción de los 36 TS1003/TS1005) → import co-ubicado al
//     final del bloque de imports (BC-06)
// [x] Record<string, …> + ?? 9 / ?? 3 / ?? color dispersos (tres
//     degradaciones INCONSISTENTES para el mismo input desconocido:
//     ordenarlo último pero dibujarlo en el anillo low) →
//     Record<Severity, …> exhaustivo + normalizeSeverity() único en
//     la frontera (defensa en profundidad en UN lugar, no en cada uso)
// [x] Tinta inline en el JSX (rgba blancos hardcodeados → invisibles
//     en .light) → severidad → clase → --wr-blip-color; tema y light
//     mode se resuelven enteramente en CSS
// [x] Idioma mixto ("Observatorio" + "Clear Skies" + aria en español)
//     → COPY único, español, i18n-ready
// [x] slice(0, 2) mágico que trunca en silencio → MAX_VISIBLE_ALERTS
//     + indicador explícito "+N más"
// [x] key={i} en blips y alertas → claves compuestas estables
// [x] Constantes de geometría recreadas por render → módulo, congeladas
// [x] Math.max(anomalies.length, 1) muerto (el map no corre con lista
//     vacía) → eliminado
// [x] Contador "0" y estrella simultáneos en vacío → estrella
//     centrada como único estado vacío
// [x] aria-label estático que ignora el estado → etiqueta dinámica
//     (n activas + críticas) — el rol="img" hace invisible el resto
//     del SVG para los lectores de pantalla
// [x] Sin memo / sin data-testid / props mutables → house standard
// ═══════════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════════
// §0 IMPORTS
// ═══════════════════════════════════════════════════════════

import { memo, useMemo } from "react";

// Shared — Utils
import { cn } from "@/shared/lib/utils";

// Wellness — Domain types
import type {
  WellnessAlert,
  WellnessAnomaly,
  WellnessMode,
} from "../types";

// Styles (BC-06: co-ubicado — este componente posee su propio CSS)
import "./WellnessAnomalyRadar.css";

// ═══════════════════════════════════════════════════════════
// §1 SEVERITY MODEL — exhaustivo por construcción
// ═══════════════════════════════════════════════════════════

export const RADAR_SEVERITIES = ["critical", "high", "medium", "low"] as const;
export type RadarSeverity = (typeof RADAR_SEVERITIES)[number];

/** Anillo de severidad: 0 = más cerca del corazón. */
const SEVERITY_RING: Readonly<Record<RadarSeverity, number>> = Object.freeze({
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
});

function isRadarSeverity(raw: string): raw is RadarSeverity {
  return (RADAR_SEVERITIES as readonly string[]).includes(raw);
}

/**
 * Frontera de confianza única: la API es la dueña del contrato, pero
 * este componente no se rompe si el contrato cambia — degrada a "low"
 * con una advertencia DEV visible (fail-notice, no fail-silent).
 */
function normalizeSeverity(raw: string): RadarSeverity {
  if (isRadarSeverity(raw)) return raw;
  if (import.meta.env.DEV) {
    console.warn(
      `[WellnessAnomalyRadar] severidad desconocida "${raw}" — degradada a "low"`,
    );
  }
  return "low";
}

// ═══════════════════════════════════════════════════════════
// §2 GEOMETRY + PURE LAYOUT (núcleo testeable, sin React)
// ═══════════════════════════════════════════════════════════

/** ViewBox 140×140 — única fuente de verdad de la retícula. */
export const RADAR_GEOMETRY = Object.freeze({
  viewBox: 140,
  cx: 70,
  cy: 70,
  maxR: 55,
  rings: [0.33, 0.66, 1] as const,
});

export interface RadarBlip {
  /** Clave estable: severidad + índice ORIGINAL (sobrevive a re-ordenas) */
  readonly key: string;
  readonly x: number;
  readonly y: number;
  readonly severity: RadarSeverity;
}

const EMPTY_BLIPS: readonly RadarBlip[] = [];

/**
 * Layout puro del radar — exportado para tests (misma disciplina que
 * evaluatePermissionGate en G11): sin React, sin DOM, determinista.
 *
 * El ángulo usa la posición POST-orden (critical a las 12:00); la clave
 * usa el índice ORIGINAL (identidad estable aunque la severidad cambie
 * y la lista se re-ordene — React reconcilia sin remontar nodos).
 */
export function layoutRadarBlips(
  anomalies: readonly WellnessAnomaly[],
): readonly RadarBlip[] {
  const total = anomalies.length;
  if (total === 0) return EMPTY_BLIPS;

  return anomalies
    .map((anomaly, i) => ({
      originalIndex: i,
      severity: normalizeSeverity(anomaly.severity),
    }))
    .sort((a, b) => SEVERITY_RING[a.severity] - SEVERITY_RING[b.severity])
    .map(({ originalIndex, severity }, position) => {
      const angle = (position / total) * Math.PI * 2 - Math.PI / 2;
      const ring = SEVERITY_RING[severity];
      const r = RADAR_GEOMETRY.maxR * (0.3 + (ring / 3) * 0.6);

      return {
        key: `${severity}-${originalIndex}`,
        x: RADAR_GEOMETRY.cx + r * Math.cos(angle),
        y: RADAR_GEOMETRY.cy + r * Math.sin(angle),
        severity,
      };
    });
}

// ═══════════════════════════════════════════════════════════
// §3 COPY (i18n-ready: un solo lugar de texto)
// ═══════════════════════════════════════════════════════════

const COPY = {
  title: "Observatorio",
  clearSkies: "Cielo despejado",
  radarLabel: (activas: number, criticas: number) =>
    `Radar de anomalías: ${activas} ${activas === 1 ? "activa" : "activas"}${
      criticas > 0 ? `, ${criticas} críticas` : ""
    }`,
  moreAlerts: (hidden: number) => `+${hidden} más`,
} as const;

/** Máximo de alertas críticas visibles antes del "+N más" */
const MAX_VISIBLE_ALERTS = 2;

// ═══════════════════════════════════════════════════════════
// §4 COMPONENT
// ═══════════════════════════════════════════════════════════

export interface WellnessAnomalyRadarProps {
  readonly anomalies: readonly WellnessAnomaly[];
  readonly alerts: readonly WellnessAlert[];
  /** Variante de presentación — hook CSS vía [data-mode] */
  readonly mode: WellnessMode;
  readonly className?: string;
}

/**
 * WellnessAnomalyRadar — "The Watchtower". Widget observacional puro:
 * toda la tinta (colores/tintes por severidad, tema, light) vive en el
 * CSS vía clases de severidad; el JSX porta exclusivamente geometría.
 *
 * memo: presentacional puro — los re-renders del dashboard no
 * re-pintan el radar si las anomalías no cambiaron.
 */
export const WellnessAnomalyRadar = memo(function WellnessAnomalyRadar({
  anomalies,
  alerts,
  mode,
  className,
}: WellnessAnomalyRadarProps) {
  const blips = useMemo(() => layoutRadarBlips(anomalies), [anomalies]);

  const criticalAlerts = alerts.filter((a) => a.level === "critical");
  const visibleAlerts = criticalAlerts.slice(0, MAX_VISIBLE_ALERTS);
  const hiddenAlertCount = criticalAlerts.length - visibleAlerts.length;
  const hasAnomalies = anomalies.length > 0;

  const { cx, cy, maxR, viewBox } = RADAR_GEOMETRY;

  return (
    <div
      className={cn("wr", className)}
      data-mode={mode}
      data-testid="wellness-anomaly-radar"
    >
      <div className="wr__header">
        <span className="wr__title">{COPY.title}</span>
        {hasAnomalies ? (
          <span className="wr__count" data-testid="wr-count">
            {anomalies.length}
          </span>
        ) : (
          <span className="wr__clear" data-testid="wr-clear">
            {COPY.clearSkies}
          </span>
        )}
      </div>

      {/* role="img": el SVG es una imagen semántica única — la etiqueta
          dinámica lleva el estado al lector de pantalla (el contenido
          interno del SVG es invisible para AT). */}
      <svg
        viewBox={`0 0 ${viewBox} ${viewBox}`}
        className="wr__svg"
        role="img"
        aria-label={COPY.radarLabel(anomalies.length, criticalAlerts.length)}
        data-testid="wr-radar"
      >
        {/* Retícula: geometría en JSX, tinta en CSS (D5/Light) */}
        {RADAR_GEOMETRY.rings.map((scale) => (
          <circle
            key={scale}
            className="wr__ring"
            cx={cx}
            cy={cy}
            r={maxR * scale}
          />
        ))}

        <line
          className="wr__cross wr__cross--h"
          x1={cx - maxR}
          y1={cy}
          x2={cx + maxR}
          y2={cy}
        />
        <line
          className="wr__cross wr__cross--v"
          x1={cx}
          y1={cy - maxR}
          x2={cx}
          y2={cy + maxR}
        />

        {/* Scan line — solo cuando hay algo que vigilar */}
        {hasAnomalies && (
          <line
            className="wr__scan"
            x1={cx}
            y1={cy}
            x2={cx + maxR}
            y2={cy}
          />
        )}

        {/* Corazón del radar */}
        <circle className="wr__hub" cx={cx} cy={cy} r={6} />
        {hasAnomalies && (
          <text className="wr__center" x={cx} y={cy + 2} textAnchor="middle">
            {anomalies.length}
          </text>
        )}

        {/* Blips: la clase de severidad expone --wr-blip-color */}
        {blips.map(({ key, x, y, severity }) => (
          <g
            key={key}
            className={cn("wr__blip-group", `wr__blip-group--${severity}`)}
          >
            <circle className="wr__blip" cx={x} cy={y} r={4} />
            <circle className="wr__halo" cx={x} cy={y} r={8} />
          </g>
        ))}

        {/* Estado vacío: la estrella ES el corazón */}
        {!hasAnomalies && (
          <text
            className="wr__star"
            x={cx}
            y={cy + 5}
            textAnchor="middle"
            aria-hidden="true"
          >
            ✦
          </text>
        )}
      </svg>

      {criticalAlerts.length > 0 && (
        <ul className="wr__alerts" data-testid="wr-alerts">
          {visibleAlerts.map((alert, i) => (
            <li key={`${alert.message}-${i}`} className="wr__alert">
              <span className="wr__alert-dot" aria-hidden="true" />
              <span className="wr__alert-msg">{alert.message}</span>
            </li>
          ))}
          {hiddenAlertCount > 0 && (
            <li
              className="wr__alert wr__alert--more"
              aria-label={`${hiddenAlertCount} alertas críticas adicionales`}
            >
              {COPY.moreAlerts(hiddenAlertCount)}
            </li>
          )}
        </ul>
      )}
    </div>
  );
});
