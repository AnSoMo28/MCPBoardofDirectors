// ═══════════════════════════════════════════════════════════
// src/features/guests/components/ConversionChemistry.tsx
// Phase 34 "The Gateway" — Signature: Conversion Chemistry
// Level 6+ Agency · Production Grade
//
// Multi-dimensional chemistry analysis between guest and club.
// Shows 5 chemistry dimensions as horizontal bars,
// sponsor match cards, and conversion prediction.
//
// Depends on: conversionChemistry.ts engine output types
// Checklist: TSX-1-39, CSS-1-40
//
// PRE-WRITURE VERIFICATION:
//   ChemistryScore { guestId, overall, dimensions, topSponsor,
//     confidence, computedAt }                           ← conversionChemistry.ts ✅
//   ChemistryDimensions { guestClubFit, guestSponsorFit,
//     activityAlignment, socialResonance,
//     temporalFit } — all number 0-100                   ← conversionChemistry.ts ✅
//   SponsorMatch { memberId, memberName, compatibility,
//     sharedInterests, scheduleAlignment,
//     effectiveness(SponsorEffectiveness|null) }         ← conversionChemistry.ts ✅
//   SponsorEffectiveness { totalGuestsSponsored,
//     conversions, conversionRate, avgGuestSatisfaction } ← conversionChemistry.ts ✅
//   ConversionPrediction { guestId, probability,
//     confidenceInterval([number,number]), keyFactors,
//     recommendedAction, estimatedLTV, computedAt }      ← conversionChemistry.ts ✅
//   ConversionFactor { factor, impact("positive"|"neutral"|
//     "negative"), weight, description }                  ← conversionChemistry.ts ✅
// ═══════════════════════════════════════════════════════════

import { useMemo } from "react";

import type {
  ChemistryScore,
  ChemistryDimensions,
  SponsorMatch,
  ConversionPrediction,
  ConversionFactor,
} from "../types";

import "./ConversionChemistry.css";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

interface ConversionChemistryProps {
  /** Chemistry score for this guest. null → empty state. */
  readonly chemistry: ChemistryScore | null;
  /** Top sponsor matches (0-3). */
  readonly sponsors?: readonly SponsorMatch[];
  /** Conversion prediction. null if not computed. */
  readonly prediction?: ConversionPrediction | null;
  /** Called when user clicks a sponsor card. */
  readonly onSponsorClick?: (sponsor: SponsorMatch) => void;
}

interface DimensionDisplay {
  readonly key: keyof ChemistryDimensions;
  readonly label: string;
  readonly labelKey: string;
  readonly value: number;
}

// ═══════════════════════════════════════════════════════════
// §2 — CONSTANTS
// ═══════════════════════════════════════════════════════════

const DIMENSION_LABELS: readonly {
  readonly key: keyof ChemistryDimensions;
  readonly label: string;
  readonly labelKey: string;
}[] = [
  { key: "guestClubFit", label: "Afinidad con el club", labelKey: "guest.chemistry.guestClubFit" },
  { key: "guestSponsorFit", label: "Afinidad con sponsor", labelKey: "guest.chemistry.guestSponsorFit" },
  { key: "activityAlignment", label: "Alineación de actividades", labelKey: "guest.chemistry.activityAlignment" },
  { key: "socialResonance", label: "Resonancia social", labelKey: "guest.chemistry.socialResonance" },
  { key: "temporalFit", label: "Momento adecuado", labelKey: "guest.chemistry.temporalFit" },
] as const;

// ═══════════════════════════════════════════════════════════
// §3 — HELPERS
// ═══════════════════════════════════════════════════════════

/** Chemistry level from overall score. */
function chemistryLevel(score: number): string {
  if (score >= 80) return "exceptional";
  if (score >= 60) return "strong";
  if (score >= 40) return "moderate";
  if (score >= 20) return "weak";
  return "poor";
}

/** Chemistry level label in Spanish. */
function chemistryLevelLabel(score: number): string {
  if (score >= 80) return "Excepcional";
  if (score >= 60) return "Fuerte";
  if (score >= 40) return "Moderada";
  if (score >= 20) return "Débil";
  return "Baja";
}

/** Impact indicator for conversion factors. */
function impactSymbol(impact: ConversionFactor["impact"]): string {
  switch (impact) {
    case "positive": return "+";
    case "negative": return "-";
    case "neutral": return "=";
    default: {
      const _exhaustive: never = impact;
      return _exhaustive;
    }
  }
}

// ═══════════════════════════════════════════════════════════
// §4 — SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════

function DimensionBar({ dim }: { readonly dim: DimensionDisplay }) {
  return (
    <div className="gst-chem__dimension" data-testid={`chem-dim-${dim.key}`}>
      <div className="gst-chem__dimension-header">
        <span className="gst-chem__dimension-label">{dim.label}</span>
        <span className="gst-chem__dimension-value">{dim.value}</span>
      </div>
      <div className="gst-chem__dimension-track">
        <div
          className="gst-chem__dimension-fill"
          data-level={chemistryLevel(dim.value)}
          style={{ width: `${dim.value}%` }}
        />
      </div>
    </div>
  );
}

function SponsorCard({
  sponsor,
  onClick,
}: {
  readonly sponsor: SponsorMatch;
  readonly onClick?: (s: SponsorMatch) => void;
}) {
  return (
    <button
      className="gst-chem__sponsor"
      onClick={() => onClick?.(sponsor)}
      aria-label={`Sponsor: ${sponsor.memberName} — Compatibilidad: ${sponsor.compatibility}%`}
      data-testid={`chem-sponsor-${sponsor.memberId}`}
    >
      <div className="gst-chem__sponsor-header">
        <span className="gst-chem__sponsor-name">{sponsor.memberName}</span>
        <span
          className="gst-chem__sponsor-compat"
          data-level={chemistryLevel(sponsor.compatibility)}
        >
          {sponsor.compatibility}%
        </span>
      </div>
      <div className="gst-chem__sponsor-detail">
        <span className="gst-chem__sponsor-stat">
          Horario: {sponsor.scheduleAlignment}%
        </span>
        {sponsor.sharedInterests.length > 0 && (
          <span className="gst-chem__sponsor-interests">
            {sponsor.sharedInterests.join(", ")}
          </span>
        )}
      </div>
      {sponsor.effectiveness && (
        <div className="gst-chem__sponsor-effectiveness">
          <span>{sponsor.effectiveness.conversionRate}% conversión</span>
          <span>{sponsor.effectiveness.conversions}/{sponsor.effectiveness.totalGuestsSponsored} convertidos</span>
        </div>
      )}
    </button>
  );
}

function FactorRow({ factor }: { readonly factor: ConversionFactor }) {
  return (
    <div className="gst-chem__factor" data-impact={factor.impact}>
      <span className="gst-chem__factor-impact">{impactSymbol(factor.impact)}</span>
      <span className="gst-chem__factor-name">{factor.factor}</span>
      <span className="gst-chem__factor-desc">{factor.description}</span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §5 — COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * Conversion Chemistry — multi-dimensional compatibility analysis.
 * Shows 5 chemistry dimensions, sponsor matches, and conversion prediction.
 *
 * @example
 * <ConversionChemistry
 *   chemistry={chemistryResult}
 *   sponsors={sponsorMatches}
 *   prediction={conversionPrediction}
 * />
 */
export function ConversionChemistry({
  chemistry,
  sponsors = [],
  prediction = null,
  onSponsorClick,
}: ConversionChemistryProps) {
  const dimensions: readonly DimensionDisplay[] = useMemo(() => {
    if (!chemistry) return [];
    return DIMENSION_LABELS.map((d) => ({
      ...d,
      value: chemistry.dimensions[d.key],
    }));
  }, [chemistry]);

  // ── Empty state ──
  if (!chemistry) {
    return (
      <div
        className="gst-chem"
        data-state="empty"
        role="region"
        aria-label="Química de conversión"
        data-testid="conversion-chemistry"
      >
        <p className="gst-chem__empty-text">
          No hay datos de química disponibles.
        </p>
      </div>
    );
  }

  return (
    <div
      className="gst-chem"
      data-state="data"
      data-level={chemistryLevel(chemistry.overall)}
      role="region"
      aria-label={`Química de conversión: ${chemistry.overall}/100`}
      data-testid="conversion-chemistry"
    >
      {/* ── Overall Score ── */}
      <div className="gst-chem__header">
        <div className="gst-chem__overall">
          <span className="gst-chem__overall-score">{chemistry.overall}</span>
          <span className="gst-chem__overall-label">
            {chemistryLevelLabel(chemistry.overall)}
          </span>
        </div>
        <div className="gst-chem__header-meta">
          <span className="gst-chem__confidence">
            Confianza: {chemistry.confidence}%
          </span>
        </div>
      </div>

      {/* ── Dimension Bars ── */}
      <div className="gst-chem__dimensions" role="list" aria-label="Dimensiones de química">
        {dimensions.map((dim) => (
          <DimensionBar key={dim.key} dim={dim} />
        ))}
      </div>

      {/* ── Sponsor Matches ── */}
      {sponsors.length > 0 && (
        <div className="gst-chem__sponsors-section">
          <h4 className="gst-chem__section-title">Sponsors compatibles</h4>
          <div className="gst-chem__sponsors" role="list" aria-label="Sponsors compatibles">
            {sponsors.map((s) => (
              <SponsorCard key={s.memberId} sponsor={s} onClick={onSponsorClick} />
            ))}
          </div>
        </div>
      )}

      {/* ── Conversion Prediction ── */}
      {prediction && (
        <div className="gst-chem__prediction">
          <h4 className="gst-chem__section-title">Predicción de conversión</h4>

          <div className="gst-chem__prediction-header">
            <span
              className="gst-chem__prediction-probability"
              data-level={chemistryLevel(prediction.probability)}
            >
              {prediction.probability}%
            </span>
            <span className="gst-chem__prediction-interval">
              [{prediction.confidenceInterval[0]}% — {prediction.confidenceInterval[1]}%]
            </span>
          </div>

          <p className="gst-chem__prediction-action">
            {prediction.recommendedAction}
          </p>

          {prediction.estimatedLTV > 0 && (
            <p className="gst-chem__prediction-ltv">
              LTV estimado: ₡{(prediction.estimatedLTV / 1_000_000).toFixed(1)}M
            </p>
          )}

          {/* ── Factors ── */}
          {prediction.keyFactors.length > 0 && (
            <div className="gst-chem__factors" role="list" aria-label="Factores de conversión">
              {prediction.keyFactors.map((f, i) => (
                <FactorRow key={`factor-${i}`} factor={f} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}