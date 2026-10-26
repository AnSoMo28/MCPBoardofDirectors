// src/features/families/components/FamilyPulse.tsx
// ═══════════════════════════════════════════════════════════
// Phase 34+ Migration — Family Pulse Component
// Level 6+ Agency · Production Grade
//
// "The Heartbeat Loom" — living ECG monitor of family engagement.
//
// Sections:
//   1. Header: section label + rhythm badge
//   2. ECG Monitor: animated sweep + phosphor glow waveform + grid
//   3. BPM Display: heartbeat-pulsing dot + score
//   4. Amplitude Bar: engagement depth fill
//   5. Zone Distribution: active/passive/dormant segments
//   6. Trend Deltas: 7d / 30d with color-coded direction
//   7. Narrative: rhythm interpretation (P1)
//
// CSS STANDARD: Level 6+ (13 Dimensions)
//   D1: Glass morphism (inset highlight, monitor bezel)
//   D2: Stagger (7 section groups)
//   D3: Cubic-bezier easing on entrance
//   D4: Mono for data/UI/labels
//   D5: Rhythm-driven dynamic colors via CSS var bridges
//   D6: Pseudo-element depth (scanlines, grid, sweep trail)
//   D7: Hover on sections
//   D8: Tight spatial density
//   D9: Responsive ≤768px
//   D10: aria-label on ECG, aria-hidden on decorative
//   D11: Light mode complete
//   D12: Reduced motion + print
//   D13: fm-pulse* namespaced keyframes
//
// PRE-WRITE VERIFICATION:
//   FamilyPulseVital → ../ai-types.ts §N+1 ✅
//   PULSE_RHYTHMS    → ../config.ts §20 ✅
//
// ANTI-PATTERNS REMOVED:
//   - 3 cn() → data-* attributes
//   - ~25 glass-family-pulse → fm-pulse
//   - FamilyPulseVital from ../types → ../ai-types
//   - useReducedMotion → CSS handles
//   - ~12 inline colors → CSS var bridges
//   - 2 inline SVG stroke → CSS class
//   - className prop → removed
//   - Tailwind classes → BEM
//   - Zone segment inline colors → data-zone attribute
//   - ECG grid in JS → CSS background pattern
//   - No sweep animation → ADD CRT sweep
//   - No heartbeat pulse → ADD lub-dub
//   - No glass morphism → ADD monitor surface
//   - No stagger → ADD 7 groups
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";
import type { CSSProperties } from "react";

import type { FamilyPulseVital } from "../ai-types";
import { PULSE_RHYTHMS } from "../config";

import "./FamilyPulse.css";

// ═══════════════════════════════════════════════════════════
// §1  Constants
// ═══════════════════════════════════════════════════════════

const ECG_WIDTH = 320;
const ECG_HEIGHT = 56;

// ═══════════════════════════════════════════════════════════
// §2  ECG Waveform Generator
// ═══════════════════════════════════════════════════════════

function generateWaveform(
  rhythm: FamilyPulseVital["rhythm"],
  amplitude: number,
  width: number,
  height: number,
): string {
  const mid = height / 2;
  const normAmp = (amplitude / 100) * (height * 0.38);
  const points: string[] = [];
  const steps = 200;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const x = t * width;
    let y = mid;

    switch (rhythm) {
      case "steady": {
        const phase = t * Math.PI * 8;
        const beat = Math.sin(phase);
        const peak = Math.pow(Math.abs(Math.sin(phase * 0.5)), 8) * normAmp * 0.6;
        y = mid - beat * normAmp * 0.3 - peak * Math.sign(Math.sin(phase));
        break;
      }
      case "sporadic": {
        const phase1 = t * Math.PI * 6;
        const phase2 = t * Math.PI * 13;
        const beat1 = Math.sin(phase1) * 0.4;
        const beat2 = Math.sin(phase2) * 0.2;
        const spike =
          (Math.sin(t * Math.PI * 3) > 0.7 ? 1 : 0.15) *
          Math.pow(Math.abs(Math.sin(phase1 * 0.5)), 6);
        y = mid - (beat1 + beat2 + spike * 0.8) * normAmp;
        break;
      }
      case "accelerating": {
        const speedup = 1 + t * 2;
        const phase = t * Math.PI * 6 * speedup;
        const beat = Math.sin(phase);
        const peak = Math.pow(Math.abs(Math.sin(phase * 0.5)), 8) * normAmp * 0.5;
        y = mid - beat * normAmp * 0.25 - peak * Math.sign(Math.sin(phase));
        break;
      }
      case "decelerating": {
        const slowdown = 3 - t * 1.8;
        const phase = t * Math.PI * 6 * Math.max(0.5, slowdown);
        const beat = Math.sin(phase);
        const peak = Math.pow(Math.abs(Math.sin(phase * 0.5)), 8) * normAmp * 0.5;
        y = mid - beat * normAmp * 0.25 - peak * Math.sign(Math.sin(phase));
        break;
      }
      case "flatline": {
        const noise = Math.sin(t * Math.PI * 40) * 1.5;
        const occasional =
          (Math.sin(t * Math.PI * 3) > 0.95 ? 1 : 0) * normAmp * 0.15;
        y = mid - noise - occasional;
        break;
      }
    }

    points.push(`${i === 0 ? "M" : "L"} ${x.toFixed(1)},${y.toFixed(1)}`);
  }

  return points.join(" ");
}

// ═══════════════════════════════════════════════════════════
// §3  Rhythm Narrative (P1)
// ═══════════════════════════════════════════════════════════

function getRhythmNarrative(vital: FamilyPulseVital): string {
  const { rhythm, bpm, amplitude, trend7d } = vital;

  switch (rhythm) {
    case "steady":
      return bpm >= 4
        ? `Actividad constante con ${bpm} eventos/semana. Engagement profundo (${amplitude}%). Familia comprometida.`
        : `Actividad regular pero baja (${bpm}/semana). Mantener frecuencia actual.`;
    case "sporadic":
      return `Actividad irregular — picos seguidos de silencio. ${bpm} eventos/semana en promedio. Buscar consistencia.`;
    case "accelerating":
      return `Aceleración positiva — la familia está incrementando su participación. ${trend7d > 0 ? "+" : ""}${trend7d} esta semana.`;
    case "decelerating":
      return `Desaceleración detectada — la actividad está bajando. ${trend7d < 0 ? trend7d : `+${trend7d}`} esta semana. Intervención recomendada.`;
    case "flatline":
      return `Sin actividad detectada. Último pulso hace más de 30 días. Contacto urgente requerido.`;
    default:
      return "";
  }
}

// ═══════════════════════════════════════════════════════════
// §4  Color Helpers → data-attribute classes
// ═══════════════════════════════════════════════════════════

function bpmColorClass(bpm: number): "high" | "medium" | "low" | "critical" {
  if (bpm >= 5) return "high";
  if (bpm >= 3) return "medium";
  if (bpm >= 1) return "low";
  return "critical";
}

function ampColorClass(amplitude: number): "high" | "medium" | "low" | "critical" {
  if (amplitude >= 70) return "high";
  if (amplitude >= 40) return "medium";
  if (amplitude >= 20) return "low";
  return "critical";
}

function trendDir(value: number): "up" | "down" | "stable" {
  if (value > 0) return "up";
  if (value < 0) return "down";
  return "stable";
}

// ═══════════════════════════════════════════════════════════
// §5  Types
// ═══════════════════════════════════════════════════════════

interface FamilyPulseProps {
  readonly vital: FamilyPulseVital;
}

// ═══════════════════════════════════════════════════════════
// §6  Component
// ═══════════════════════════════════════════════════════════

/**
 * FamilyPulse — "The Heartbeat Loom"
 *
 * Renders family engagement as a living ECG monitor:
 *   - Animated sweep line with phosphor glow
 *   - Rhythm-specific waveform patterns
 *   - BPM counter with heartbeat-pulsing dot
 *   - Amplitude bar (depth of engagement)
 *   - Zone distribution (active/passive/dormant)
 *   - Trend deltas (7d / 30d)
 *   - Narrative interpretation (P1)
 *
 * @example
 * <FamilyPulse vital={derivedPulseVital} />
 */
export function FamilyPulse({ vital }: FamilyPulseProps) {
  const rhythmCfg = PULSE_RHYTHMS[vital.rhythm];

  // ── Waveform (B-07) ──
  const waveformPath = useMemo(
    () => generateWaveform(vital.rhythm, vital.amplitude, ECG_WIDTH, ECG_HEIGHT),
    [vital.rhythm, vital.amplitude],
  );

  // ── Narrative (P1) ──
  const narrative = useMemo(() => getRhythmNarrative(vital), [vital]);

  // ── Color classes ──
  const bpmClass = bpmColorClass(vital.bpm);
  const ampClass = ampColorClass(vital.amplitude);
  const isFlatline = vital.rhythm === "flatline";

  return (
    <div
      className="fm-pulse"
      data-testid="family-pulse"
      data-rhythm={vital.rhythm}
      role="figure"
      aria-label={`Pulso vital de la familia: ritmo ${rhythmCfg?.label ?? vital.rhythm}, ${vital.bpm} eventos por semana`}
      style={{ "--pulse-color": rhythmCfg?.color ?? "var(--color-emerald-400)" } as CSSProperties}
    >
      {/* ══════ Header ══════ */}
      <div className="fm-pulse__header">
        <span className="fm-pulse__section-label">Pulso Vital</span>
        {rhythmCfg && (
          <span className="fm-pulse__rhythm-badge">
            {rhythmCfg.label}
          </span>
        )}
      </div>

      {/* ══════ ECG Monitor ══════ */}
      <div className="fm-pulse__ecg" aria-hidden="true">
        <svg
          className="fm-pulse__ecg-svg"
          viewBox={`0 0 ${ECG_WIDTH} ${ECG_HEIGHT}`}
          preserveAspectRatio="none"
          aria-label={`Ritmo: ${vital.rhythm}, BPM: ${vital.bpm}`}
          role="img"
        >
          {/* Glow path (wider, blurred) */}
          <path
            d={waveformPath}
            className="fm-pulse__ecg-glow"
          />
          {/* Main line */}
          <path
            d={waveformPath}
            className="fm-pulse__ecg-line"
          />
        </svg>

        {/* Sweep line — CSS-only monitor sweep */}
        <div className="fm-pulse__ecg-sweep" />
      </div>

      {/* ══════ BPM Display ══════ */}
      <div className="fm-pulse__bpm">
        <span
          className="fm-pulse__bpm-number"
          data-bpm={bpmClass}
        >
          {vital.bpm}
        </span>
        <span className="fm-pulse__bpm-unit">eventos/sem</span>
        <span
          className="fm-pulse__bpm-dot"
          data-bpm={bpmClass}
          data-flatline={isFlatline || undefined}
        />
      </div>

      {/* ══════ Amplitude Bar ══════ */}
      <div
        className="fm-pulse__amplitude"
        style={{ "--pulse-amp": `${vital.amplitude}%` } as CSSProperties}
      >
        <div className="fm-pulse__amplitude-header">
          <span className="fm-pulse__amplitude-label">Amplitud</span>
          <span className="fm-pulse__amplitude-value" data-amp={ampClass}>
            {vital.amplitude}%
          </span>
        </div>
        <div className="fm-pulse__amplitude-track">
          <div className="fm-pulse__amplitude-fill" data-amp={ampClass} />
        </div>
      </div>

      {/* ══════ Zone Distribution ══════ */}
      <div
        className="fm-pulse__zones"
        style={
          {
            "--zone-active": `${vital.zones.active}%`,
            "--zone-passive": `${vital.zones.passive}%`,
            "--zone-dormant": `${vital.zones.dormant}%`,
          } as CSSProperties
        }
      >
        <div className="fm-pulse__zone-bar">
          <div className="fm-pulse__zone-segment" data-zone="active" />
          <div className="fm-pulse__zone-segment" data-zone="passive" />
          <div className="fm-pulse__zone-segment" data-zone="dormant" />
        </div>
        <div className="fm-pulse__zone-labels">
          <span className="fm-pulse__zone-label" data-zone="active">
            <span className="fm-pulse__zone-dot" data-zone="active" />
            Activo {Math.round(vital.zones.active)}%
          </span>
          <span className="fm-pulse__zone-label" data-zone="passive">
            <span className="fm-pulse__zone-dot" data-zone="passive" />
            Pasivo {Math.round(vital.zones.passive)}%
          </span>
          <span className="fm-pulse__zone-label" data-zone="dormant">
            <span className="fm-pulse__zone-dot" data-zone="dormant" />
            Dormante {Math.round(vital.zones.dormant)}%
          </span>
        </div>
      </div>

      {/* ══════ Trend Deltas ══════ */}
      <div className="fm-pulse__trends">
        <div className="fm-pulse__trend">
          <span className="fm-pulse__trend-period">7d</span>
          <span className="fm-pulse__trend-value" data-trend={trendDir(vital.trend7d)}>
            {vital.trend7d > 0 ? "+" : ""}{vital.trend7d}
          </span>
        </div>
        <div className="fm-pulse__trend">
          <span className="fm-pulse__trend-period">30d</span>
          <span className="fm-pulse__trend-value" data-trend={trendDir(vital.trend30d)}>
            {vital.trend30d > 0 ? "+" : ""}{vital.trend30d}
          </span>
        </div>
      </div>

      {/* ══════ Narrative (P1) ══════ */}
      <p className="fm-pulse__narrative">{narrative}</p>
    </div>
  );
}