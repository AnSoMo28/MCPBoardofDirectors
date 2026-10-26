// ═══════════════════════════════════════════════════════════
// src/features/guests/components/GuestJourney.tsx
// Phase 34 "The Gateway" — Signature: Guest Journey
// Level 6+ Agency · Production Grade
//
// Complete guest profile view combining:
//   - Profile (segment, temperature, visit pattern)
//   - VIP score with visual indicator
//   - Interest map across club domains
//   - Narrative (AI-generated staff context)
//
// This is the "full picture" when you drill into a guest.
//
// Depends on: GuestProfile (guestIntelligence.ts §8)
// Checklist: TSX-1-39, CSS-1-40
//
// PRE-WRITURE VERIFICATION:
//   GuestProfile { raw(Guest), segment(GuestSegment),
//     temperature(GuestTemperature), visitPattern(VisitPattern),
//     interestMap(InterestMap), vipScore(number),
//     daysSinceLastVisit(number), narrative(string),
//     computedAt(string) }                                ← guestIntelligence.ts §8 ✅
//   GuestTemperature { value(number), label(GuestTemperatureLabel),
//     color(string) }                                     ← guestIntelligence.ts §2 ✅
//   GuestSegment = "vip"|"high_potential"|"active_trial"|
//     "warm"|"cold"|"dormant"|"converted"                 ← types.ts §6 ✅
//   VisitPattern = "regular"|"exploratory"|"sporadic"|
//     "first_time"|"returning"|"escalating"               ← types.ts §6 ✅
//   DomainInterestScore { domain(GuestInterestDomain),
//     score(number), activities(string[]) }               ← types.ts §6 ✅
//   GuestInterestDomain = "sports"|"dining"|"wellness"|
//     "cultural"|"social"|"pool"|"events"                 ← types.ts §6 ✅
//   Guest { id, first_name, last_name, id_number, phone,
//     email, photo_url, relationship, relationship_label,
//     host_family_id, host_family_name, host_member_name,
//     visits_count, last_visit_date, is_blacklisted,
//     blacklist_reason, notes, created_at }               ← types.ts §1 ✅
// ═══════════════════════════════════════════════════════════

import type {
  GuestProfile,
  GuestSegment,
  VisitPattern,
  GuestInterestDomain,
} from "../types";

import "./GuestJourney.css";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

interface GuestJourneyProps {
  /** Enriched guest profile from the engine. null → empty state. */
  readonly profile: GuestProfile | null;
}

// ═══════════════════════════════════════════════════════════
// §2 — CONSTANTS
// ═══════════════════════════════════════════════════════════

const SEGMENT_LABELS: Record<GuestSegment, string> = {
  vip: "VIP",
  high_potential: "Alto potencial",
  active_trial: "Trial activo",
  warm: "Cálido",
  cold: "Frío",
  dormant: "Dormiente",
  converted: "Convertido",
};

const SEGMENT_LEVELS: Record<GuestSegment, string> = {
  vip: "exceptional",
  high_potential: "strong",
  active_trial: "moderate",
  warm: "moderate",
  cold: "weak",
  dormant: "critical",
  converted: "exceptional",
};

const PATTERN_LABELS: Record<VisitPattern, string> = {
  regular: "Regular",
  exploratory: "Exploratorio",
  sporadic: "Esporádico",
  first_time: "Primera vez",
  returning: "Retornando",
  escalating: "En ascenso",
};

const DOMAIN_LABELS: Record<GuestInterestDomain, string> = {
  sports: "Deportes",
  dining: "Gastronomía",
  wellness: "Bienestar",
  cultural: "Cultural",
  social: "Social",
  pool: "Piscina",
  events: "Eventos",
};

// ═══════════════════════════════════════════════════════════
// §3 — HELPERS
// ═══════════════════════════════════════════════════════════

function vipLevel(score: number): string {
  if (score >= 80) return "exceptional";
  if (score >= 60) return "strong";
  if (score >= 40) return "moderate";
  return "weak";
}

// ═══════════════════════════════════════════════════════════
// §4 — COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * Guest Journey — complete profile view.
 * Combines segment, temperature, visit pattern, VIP score,
 * interest map, and AI-generated narrative.
 *
 * @example
 * <GuestJourney profile={guestProfile} />
 */
export function GuestJourney({ profile }: GuestJourneyProps) {
  // ── Empty state ──
  if (!profile) {
    return (
      <div
        className="gst-journey"
        data-state="empty"
        role="region"
        aria-label="Perfil del invitado"
        data-testid="guest-journey"
      >
        <p className="gst-journey__empty-text">
          No hay datos de perfil disponibles.
        </p>
      </div>
    );
  }

  const { raw, segment, temperature, visitPattern, interestMap, vipScore, daysSinceLastVisit, narrative } = profile;

  return (
    <div
      className="gst-journey"
      data-state="data"
      data-segment={segment}
      data-temperature={temperature.label}
      role="region"
      aria-label={`Perfil de ${raw.first_name} ${raw.last_name}`}
      data-testid="guest-journey"
    >
      {/* ── Guest Identity ── */}
      <div className="gst-journey__identity">
        <div className="gst-journey__name-block">
          <h3 className="gst-journey__name">
            {raw.first_name} {raw.last_name}
          </h3>
          <span className="gst-journey__family">
            {raw.host_family_name} — {raw.relationship_label}
          </span>
        </div>
        <div className="gst-journey__badges">
          <span className="gst-journey__badge" data-type="segment" data-level={SEGMENT_LEVELS[segment]}>
            {SEGMENT_LABELS[segment]}
          </span>
          <span className="gst-journey__badge" data-type="temperature" data-temperature={temperature.label}>
            {temperature.label}
          </span>
        </div>
      </div>

      {/* ── Key Metrics ── */}
      <div className="gst-journey__metrics">
        <div className="gst-journey__metric">
          <span className="gst-journey__metric-value">{raw.visits_count}</span>
          <span className="gst-journey__metric-label">Visitas</span>
        </div>
        <div className="gst-journey__metric">
          <span className="gst-journey__metric-value">
            {daysSinceLastVisit < 999 ? daysSinceLastVisit : "N/A"}
          </span>
          <span className="gst-journey__metric-label">Días desde última</span>
        </div>
        <div className="gst-journey__metric">
          <span className="gst-journey__metric-value">{PATTERN_LABELS[visitPattern]}</span>
          <span className="gst-journey__metric-label">Patrón</span>
        </div>
        <div className="gst-journey__metric">
          <span className="gst-journey__metric-value" data-level={vipLevel(vipScore)}>
            {vipScore}
          </span>
          <span className="gst-journey__metric-label">VIP Score</span>
        </div>
      </div>

      {/* ── Interest Map ── */}
      {interestMap.length > 0 && (
        <div className="gst-journey__interests">
          <h4 className="gst-journey__section-title">Intereses</h4>
          <div className="gst-journey__interest-bars">
            {interestMap.map((interest) => (
              <div key={interest.domain} className="gst-journey__interest">
                <div className="gst-journey__interest-header">
                  <span className="gst-journey__interest-label">
                    {DOMAIN_LABELS[interest.domain]}
                  </span>
                  <span className="gst-journey__interest-score">{interest.score}</span>
                </div>
                <div className="gst-journey__interest-track">
                  <div
                    className="gst-journey__interest-fill"
                    style={{ width: `${interest.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Narrative ── */}
      <div className="gst-journey__narrative">
        <p className="gst-journey__narrative-text">{narrative}</p>
      </div>

      {/* ── Blacklist Warning ── */}
      {raw.is_blacklisted && (
        <div className="gst-journey__blacklist" role="alert">
          <p className="gst-journey__blacklist-text">
            En lista negra: {raw.blacklist_reason ?? "Sin razón especificada"}
          </p>
        </div>
      )}
    </div>
  );
}