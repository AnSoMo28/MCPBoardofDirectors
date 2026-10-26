// src/features/families/components/FamilyTemperature.tsx
// ═══════════════════════════════════════════════════════════
// Phase 34+ Migration — Family Temperature Component
// Level 6+ Agency · Production Grade
//
// "The Thermal Fabric" — living thermal visualization of family engagement.
//
// Sections:
//   1. Header: section label + zone badge
//   2. Thermal Aura Orb: SVG ring with benchmark ghost + current arc + pulse
//   3. Delta Callout: vs club average
//   4. Distribution Bar: club-wide position
//   5. Thermal Ribbon: 30-day color history with hover tooltip
//   6. Predictive Lane: 30-day projection gradient
//   7. Narrative: P1 narrative-first storyline
//
// CSS STANDARD: Level 6+ (13 Dimensions)
//   D1: Glass morphism (inset highlight, gold accent, shadow)
//   D2: Stagger (7 section groups + ribbon day cascade)
//   D3: Cubic-bezier easing on entrance
//   D4: Mono for data, UI for body, mono-uppercased for labels
//   D5: Zone-driven dynamic colors via CSS var bridges
//   D6: Pseudo-element depth (::before inset highlight)
//   D7: Hover on ribbon days + metric-like sections
//   D8: Tight spatial density (14px gap, -2px label margin)
//   D9: Responsive ≤768px
//   D10: role="figure", aria-label, aria-hidden on decorative SVG
//   D11: Light mode complete
//   D12: Reduced motion + print
//   D13: fm-temp* namespaced keyframes
//
// PRE-WRITE VERIFICATION:
//   EngagementTemperature → ../ai-types.ts ✅ (AI-derived)
//   getTemperatureZone    → ../config.ts §29 ✅
//   TemperatureZoneConfig → ../types.ts ✅
//
// ANTI-PATTERNS REMOVED:
//   - 3 cn() → data-* attributes
//   - ~30 glass-thermal classes → fm-temperature
//   - EngagementTemperature from ../types → ../ai-types
//   - useReducedMotion → CSS handles
//   - ~12 inline color styles → CSS var bridges (--temp-*)
//   - 3 inline SVG stroke → CSS var bridge
//   - className prop → removed
//   - Mutable props → readonly
//   - No glass morphism → ADD D1 (inset highlight, gold accent)
//   - No stagger → ADD D2 (7 groups)
//   - No cubic-bezier → ADD D3
//   - No hover on sections → ADD D7
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import type { CSSProperties } from "react";

import type { EngagementTemperature } from "../ai-types";
import { getTemperatureZone } from "../config";

import "./FamilyTemperature.css";

// ═══════════════════════════════════════════════════════════
// §1  Orb Geometry Constants
// ═══════════════════════════════════════════════════════════

const ORB_RADIUS = 48;
const ORB_CX = 60;
const ORB_CY = 60;
const ORB_CIRCUMFERENCE = 2 * Math.PI * ORB_RADIUS;
const ORB_SIZE = 120;

// ═══════════════════════════════════════════════════════════
// §2  Pure Helpers
// ═══════════════════════════════════════════════════════════

function deltaColorClass(value: number): "positive" | "slightly-positive" | "neutral" | "slightly-negative" | "negative" {
  if (value > 5) return "positive";
  if (value > 0) return "slightly-positive";
  if (value > -5) return "slightly-negative";
  return "negative";
}

function directionSymbol(predicted: number, current: number): string {
  if (predicted > current + 3) return "↑";
  if (predicted < current - 3) return "↓";
  return "→";
}

function formatDelta(value: number): string {
  return `${value > 0 ? "+" : ""}${value}°`;
}

function getThermalNarrative(temp: EngagementTemperature): string {
  const zonePhrases: Record<string, string> = {
    frozen: `Zona frozen (${temp.current}°) — engagement prácticamente inexistente`,
    cold: `Zona cold (${temp.current}°) — engagement por debajo de lo deseado`,
    warm: `Zona warm (${temp.current}°) — engagement moderado con espacio de crecimiento`,
    hot: `Zona hot (${temp.current}°) — engagement sólido y activo`,
    burning: `Zona burning (${temp.current}°) — engagement excepcional, familia comprometida`,
  };

  const delta = temp.deltaVsClub;
  const benchmark =
    delta > 10 ? `Destaca +${delta}° sobre el promedio del club (${temp.avgClubTemp}°).`
    : delta > 3 ? `Ligeramente sobre el promedio del club (${temp.avgClubTemp}°).`
    : delta < -10 ? `${Math.abs(delta)}° bajo el promedio del club (${temp.avgClubTemp}°) — brecha significativa.`
    : delta < -3 ? `Por debajo del promedio del club (${temp.avgClubTemp}°).`
    : `En línea con el promedio del club (${temp.avgClubTemp}°).`;

  const dir = directionSymbol(temp.predicted30d, temp.current);
  const projection =
    dir === "↑" ? `Proyección ascendente ${dir} ${temp.predicted30d}° — mantener impulso.`
    : dir === "↓" ? `Proyección descendente ${dir} ${temp.predicted30d}° — intervención recomendada.`
    : `Proyección estable ${dir} ${temp.predicted30d}°.`;

  return `${zonePhrases[temp.zone] ?? zonePhrases.warm}. ${benchmark} ${projection}`;
}

// ═══════════════════════════════════════════════════════════
// §3  Types
// ═══════════════════════════════════════════════════════════

interface FamilyTemperatureProps {
  readonly temperature: EngagementTemperature;
}

// ═══════════════════════════════════════════════════════════
// §4  Component
// ═══════════════════════════════════════════════════════════

/**
 * FamilyTemperature — "The Thermal Fabric"
 *
 * Renders engagement temperature as a living thermal visualization:
 *   - Thermal Aura Orb with benchmark ghost ring
 *   - 30-day color ribbon with hover tooltips
 *   - Predictive lane with gradient projection
 *   - Club distribution context bar
 *   - Narrative-first storyline (P1)
 *
 * Pure presentational — all data pre-computed by deriveTemperature.
 *
 * @example
 * <FamilyTemperature temperature={derivedTemperature} />
 */
export function FamilyTemperature({ temperature }: FamilyTemperatureProps) {
  const [hoveredDay, setHoveredDay] = useState<number | null>(null);

  // ── Zone derivations (B-07) ──
  const currentZone = useMemo(
    () => getTemperatureZone(temperature.current),
    [temperature.current],
  );
  const predictedZone = useMemo(
    () => getTemperatureZone(temperature.predicted30d),
    [temperature.predicted30d],
  );
  const ribbonZones = useMemo(
    () => temperature.history30d.map((s) => getTemperatureZone(s)),
    [temperature.history30d],
  );

  // ── Orb geometry (B-07) ──
  const arcOffset = ORB_CIRCUMFERENCE * (1 - temperature.current / 100);
  const ghostOffset = ORB_CIRCUMFERENCE * (1 - temperature.avgClubTemp / 100);

  // ── Narrative (P1) ──
  const narrative = useMemo(() => getThermalNarrative(temperature), [temperature]);

  // ── Zone flags ──
  const isGlowZone = currentZone.zone === "warm" || currentZone.zone === "hot" || currentZone.zone === "burning";
  const isPulseZone = currentZone.zone === "hot" || currentZone.zone === "burning";
  const deltaClass = deltaColorClass(temperature.deltaVsClub);
  const dir = directionSymbol(temperature.predicted30d, temperature.current);

  // ── Handlers (B-08) ──
  const handleDayEnter = useCallback((i: number) => setHoveredDay(i), []);
  const handleDayLeave = useCallback(() => setHoveredDay(null), []);

  return (
    <div
      className="fm-temperature"
      data-testid="family-temperature"
      data-zone={currentZone.zone}
      data-glow={isGlowZone || undefined}
      data-pulse={isPulseZone || undefined}
      role="figure"
      aria-label="Temperatura de engagement de la familia"
      style={
        {
          "--temp-zone-color": currentZone.color,
          "--temp-zone-glow": currentZone.glowColor,
        } as CSSProperties
      }
    >
      {/* ══════ Header ══════ */}
      <div className="fm-temperature__header">
        <span className="fm-temperature__section-label">Temperatura</span>
        <span className="fm-temperature__zone-badge">
          {currentZone.emoji} {currentZone.label}
        </span>
      </div>

      {/* ══════ Thermal Aura Orb ══════ */}
      <div className="fm-temperature__orb">
        <svg
          className="fm-temperature__orb-svg"
          viewBox={`0 0 ${ORB_SIZE} ${ORB_SIZE}`}
          role="meter"
          aria-valuenow={temperature.current}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuetext={`${temperature.current} grados, zona ${currentZone.label}`}
        >
          <circle
            cx={ORB_CX}
            cy={ORB_CY}
            r={ORB_RADIUS}
            className="fm-temperature__orb-track"
          />
          <circle
            cx={ORB_CX}
            cy={ORB_CY}
            r={ORB_RADIUS}
            className="fm-temperature__orb-ghost"
            strokeDasharray={ORB_CIRCUMFERENCE}
            strokeDashoffset={ghostOffset}
            transform={`rotate(-90 ${ORB_CX} ${ORB_CY})`}
          />
          <circle
            cx={ORB_CX}
            cy={ORB_CY}
            r={ORB_RADIUS}
            className="fm-temperature__orb-arc"
            strokeDasharray={ORB_CIRCUMFERENCE}
            strokeDashoffset={arcOffset}
            transform={`rotate(-90 ${ORB_CX} ${ORB_CY})`}
          />
          <circle
            cx={ORB_CX}
            cy={ORB_CY}
            r={ORB_RADIUS + 3}
            className="fm-temperature__orb-aura"
          />
        </svg>
        <div className="fm-temperature__orb-center">
          <span className="fm-temperature__orb-score">
            {temperature.current}°
          </span>
          <span className="fm-temperature__orb-zone-label">
            {currentZone.label}
          </span>
        </div>
      </div>

      {/* ══════ Delta Callout ══════ */}
      <div className="fm-temperature__delta">
        <span
          className="fm-temperature__delta-value"
          data-delta={deltaClass}
        >
          {formatDelta(temperature.deltaVsClub)}
        </span>
        <span className="fm-temperature__delta-label">
          {temperature.deltaVsClub > 0 ? "sobre"
            : temperature.deltaVsClub < 0 ? "bajo"
            : "en"}{" "}
          promedio del club
        </span>
      </div>

      {/* ══════ Club Distribution Context ══════ */}
      <div
        className="fm-temperature__distribution"
        aria-hidden="true"
        style={
          {
            "--temp-avg-pos": `${temperature.avgClubTemp}%`,
            "--temp-family-pos": `${temperature.current}%`,
          } as CSSProperties
        }
      >
        <div className="fm-temperature__distribution-bar">
          <div className="fm-temperature__distribution-avg" />
          <div className="fm-temperature__distribution-marker">
            <span className="fm-temperature__distribution-dot" />
          </div>
        </div>
        <div className="fm-temperature__distribution-labels">
          <span>0°</span>
          <span className="fm-temperature__distribution-club-label">
            club {temperature.avgClubTemp}°
          </span>
          <span>100°</span>
        </div>
      </div>

      {/* ══════ Thermal Gradient Ribbon (30d) ══════ */}
      <div className="fm-temperature__ribbon-section">
        <span className="fm-temperature__ribbon-label">Últimos 30 días</span>
        <div
          className="fm-temperature__ribbon-wrapper"
          style={
            {
              "--temp-tooltip-left": hoveredDay !== null
                ? `${((hoveredDay + 0.5) / 30) * 100}%`
                : "0%",
            } as CSSProperties
          }
        >
          <div className="fm-temperature__ribbon">
            {ribbonZones.map((zone, i) => (
              <span
                key={i}
                className="fm-temperature__ribbon-day"
                data-active={hoveredDay === i || undefined}
                style={
                  {
                    "--temp-day-color": zone.color,
                    "--temp-day-index": i,
                  } as CSSProperties
                }
                onMouseEnter={() => handleDayEnter(i)}
                onMouseLeave={handleDayLeave}
              />
            ))}
          </div>
          {hoveredDay !== null && ribbonZones[hoveredDay] && (
            <div className="fm-temperature__tooltip">
              <span className="fm-temperature__tooltip-day">
                Día {hoveredDay + 1}
              </span>
              <span className="fm-temperature__tooltip-score">
                {temperature.history30d[hoveredDay]}°
              </span>
              <span className="fm-temperature__tooltip-zone">
                {ribbonZones[hoveredDay].emoji}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ══════ Predictive Lane ══════ */}
      <div className="fm-temperature__prediction">
        <span className="fm-temperature__prediction-label">Proyección 30d</span>
        <div
          className="fm-temperature__prediction-track"
          style={
            {
              "--temp-pred-from": currentZone.color,
              "--temp-pred-to": predictedZone.color,
            } as CSSProperties
          }
        >
          <div className="fm-temperature__prediction-fill" />
        </div>
        <span
          className="fm-temperature__prediction-value"
          style={{ "--temp-pred-color": predictedZone.color } as CSSProperties}
        >
          {dir} {temperature.predicted30d}°
        </span>
      </div>

      {/* ══════ Narrative (P1) ══════ */}
      <p className="fm-temperature__narrative">
        {narrative}
      </p>
    </div>
  );
}