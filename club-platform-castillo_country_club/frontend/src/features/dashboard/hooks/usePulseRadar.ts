/**
 * @hook usePulseRadar (Fase 25)
 * @module features/dashboard/hooks
 * @note Radar geometry calculation, arc path generation,
 *       node positioning, connector endpoints, timeline state.
 *
 *       Calculates everything needed for the SVG rendering:
 *       - Partial arc SVG paths (~270°)
 *       - Node travel paths (offset-path)
 *       - Connector line endpoints
 *       - Label positions
 *       - Timeline state machine (which phase is active)
 */

import { useMemo } from "react";
import { useBreakpoint } from "@/shared/hooks/useBreakpoint";
import {
  RADAR_ARC,
  RADAR_DESKTOP,
  RADAR_TABLET,
  RADAR_MOBILE,
  RADAR_CONNECTOR,
  type RadarGeometry,
  type RadarRingData,
} from "../config/radar";

/* ═══════════════════════════════════════
   Types
   ═══════════════════════════════════════ */

export interface RingRenderData {
  id: string;
  label: string;
  score: number | null;
  /** Radius */
  r: number;
  /** Stroke width */
  strokeW: number;
  /** Full circumference */
  circumference: number;
  /** Arc length (270° portion) */
  arcLength: number;
  /** Stroke-dasharray for the arc: [arcLen, circumference - arcLen] */
  dashArray: string;
  /** Stroke-dashoffset to show X% of the arc */
  dashOffsetForScore: number;
  /** SVG path for the partial arc (for offset-path node travel) */
  arcPath: string;
  /** Endpoint of the arc (where the drop lands) — in SVG coords */
  endPoint: { x: number; y: number };
  /** Connector end point (where label connects) */
  connectorEnd: { x: number; y: number };
  /** Start point of connector (on the arc at score position) */
  connectorStart: { x: number; y: number };
  /** Index (for stagger timing) */
  index: number;
}

export interface PulseRadarData {
  geometry: RadarGeometry;
  rings: RingRenderData[];
  hubRadius: number;
}

/* ═══════════════════════════════════════
   Helpers
   ═══════════════════════════════════════ */

/**
 * Generate SVG path for a partial arc.
 * @param cx Center X
 * @param cy Center Y
 * @param r Radius
 * @param startDeg Start angle (0° = 12 o'clock, CW)
 * @param endDeg End angle
 */
function arcPath(
  cx: number,
  cy: number,
  r: number,
  startDeg: number,
  endDeg: number,
): string {
  const toRad = (deg: number) => ((deg - 90) * Math.PI) / 180;
  const startX = cx + r * Math.cos(toRad(startDeg));
  const startY = cy + r * Math.sin(toRad(startDeg));
  const endX = cx + r * Math.cos(toRad(endDeg));
  const endY = cy + r * Math.sin(toRad(endDeg));
  const sweep = endDeg > startDeg ? endDeg - startDeg : 360 - startDeg + endDeg;
  const largeArc = sweep > 180 ? 1 : 0;
  return `M ${startX} ${startY} A ${r} ${r} 0 ${largeArc} 1 ${endX} ${endY}`;
}

/**
 * Get point on arc at a given angle.
 */
function pointOnArc(
  cx: number,
  cy: number,
  r: number,
  deg: number,
): { x: number; y: number } {
  const toRad = (d: number) => ((d - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(toRad(deg)),
    y: cy + r * Math.sin(toRad(deg)),
  };
}

/**
 * Get the angle where a score percentage sits on the arc.
 * 0% = arcStart, 100% = arcEnd.
 */
function scoreToAngle(scorePct: number): number {
  const arcSpan = 360 - (RADAR_ARC.endDeg - RADAR_ARC.startDeg + 360) % 360;
  return RADAR_ARC.startDeg + (scorePct / 100) * arcSpan;
}

/* ═══════════════════════════════════════
   Hook
   ═══════════════════════════════════════ */

export function usePulseRadar(
  ringsData: RadarRingData[],
  _centerScore: number | null,
): PulseRadarData {
  const { isMobile, isTablet } = useBreakpoint();

  const geometry = useMemo<RadarGeometry>(() => {
    if (isMobile) return RADAR_MOBILE;
    if (isTablet) return RADAR_TABLET;
    return RADAR_DESKTOP;
  }, [isMobile, isTablet]);

  const { cx, cy } = geometry;

  const rings = useMemo<RingRenderData[]>(() => {
    return ringsData.map((ring, index) => {
      const ringCfg = geometry.rings[index];
      if (!ringCfg) return null;

      const { r, stroke: strokeW } = ringCfg;
      const circumference = 2 * Math.PI * r;
      const arcLength = circumference * RADAR_ARC.arcFraction;
      const score = ring.score ?? 0;
      const scorePct = Math.max(0, Math.min(100, score));

      /* Dasharray: [visible arc, gap] */
      const dashArray = `${arcLength} ${circumference - arcLength}`;

      /* Dashoffset: how much of the arc to hide */
      const scoreFraction = scorePct / 100;
      const dashOffsetForScore =
        arcLength - scoreFraction * arcLength;

      /* Full arc path (for offset-path node travel) */
      const path = arcPath(
        cx,
        cy,
        r,
        RADAR_ARC.startDeg,
        RADAR_ARC.endDeg,
      );

      /* End point: where the drop lands (at score angle) */
      const scoreAngle = scoreToAngle(scorePct);
      const endPoint = pointOnArc(cx, cy, r, scoreAngle);

      /* Connector start: on the arc at score position */
      const connectorStart = { ...endPoint };

      /* Connector end: horizontal right extension */
      const connectorEnd = {
        x:
          endPoint.x +
          RADAR_CONNECTOR.extension +
          (isMobile ? 10 : 30),
        y: endPoint.y,
      };

      return {
        id: ring.id,
        label: ring.label,
        score: ring.score,
        r,
        strokeW,
        circumference,
        arcLength,
        dashArray,
        dashOffsetForScore,
        arcPath: path,
        endPoint,
        connectorStart,
        connectorEnd,
        index,
      };
    }).filter(Boolean) as RingRenderData[];
  }, [ringsData, geometry, cx, cy, isMobile]);

  return {
    geometry,
    rings,
    hubRadius: isMobile ? 22 : 28,
  };
}