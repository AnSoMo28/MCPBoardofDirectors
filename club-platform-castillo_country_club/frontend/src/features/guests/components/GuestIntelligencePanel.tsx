// ═══════════════════════════════════════════════════════════
// src/features/guests/components/GuestIntelligencePanel.tsx
// Phase 34 "The Gateway" — Guest Intelligence Panel (Rewrite)
// Level 6+ Agency · Production Grade
//
// Intelligence tab content: demand forecast, engagement proposals,
// enhanced analytics insights (referrers, event-guest correlation).
//
// Original: cn() + Tailwind + inline colors → BEM + data-*
// Checklist: TSX-1-39, CSS-1-40
//
// PRE-WRITURE VERIFICATION:
//   GuestDemandForecast { forecast_horizon_months(number),
//     forecasts(ForecastItem[]), seasonal_multiplier(number),
//     peak_months(string[]) }                               ← mocks/contracts ✅
//   ForecastItem { metric(string), change_pct(number),
//     factors(string[]) }                                    ← mocks/contracts (by usage) ✅
//   GuestEngagementProposalList { proposals(Proposal[]),
//     total(number), high_priority_count(number) }           ← mocks/contracts ✅
//   Proposal { proposal_id, title, description, priority,
//     proposal_type, impact, confidence(number),
//     cross_domain_signals(string[]) }                       ← mocks/contracts (by usage) ✅
//   GuestAnalyticsEnhanced { top_referrers(Array<{family_id,
//     referral_count, converted_count}>),
//     event_guest_correlation(Array<{event_type, total_events,
//     avg_guests_generated}>) }                              ← mocks/contracts (by usage) ✅
//
// ANTI-PATTERNS REMOVED: cn(), Tailwind, inline colors,
//   className prop, broken @keyframes in JSX
// ═══════════════════════════════════════════════════════════

import { useState } from "react";

import {
  Zap, ChevronDown, ChevronUp, TrendingUp, BarChart3, Calendar,
} from "lucide-react";

import { Button } from "@/shared/components/ui/Button";

import type {
  GuestDemandForecast,
  GuestEngagementProposalList,
  GuestAnalyticsEnhanced,
} from "@/shared/mocks/contracts";

import "./GuestIntelligencePanel.css";

// ═══════════════════════════════════════════════════════════
// §1 — TYPES
// ═══════════════════════════════════════════════════════════

interface GuestIntelligencePanelProps {
  readonly forecast: GuestDemandForecast | null;
  readonly proposals: GuestEngagementProposalList | null;
  readonly analytics: GuestAnalyticsEnhanced | null;
}

// ═══════════════════════════════════════════════════════════
// §2 — CONSTANTS
// ═══════════════════════════════════════════════════════════

const PROPOSAL_TYPE_LABELS: Record<string, string> = {
  trial_invitation: "Invitación Trial",
  follow_up_campaign: "Campaña de Seguimiento",
  referral_activation: "Activación de Referidos",
  conversion_nudge: "Nudge de Conversión",
  event_invitation: "Invitación a Evento",
};

// ═══════════════════════════════════════════════════════════
// §3 — HELPERS
// ═══════════════════════════════════════════════════════════

/** Derive change level for visual styling. */
function changeLevel(pct: number): string {
  if (pct >= 0) return "positive";
  return "negative";
}

// ═══════════════════════════════════════════════════════════
// §4 — COMPONENT
// ═══════════════════════════════════════════════════════════

/**
 * Guest Intelligence Panel — demand forecast, proposals, analytics.
 *
 * @example
 * <GuestIntelligencePanel
 *   forecast={forecastData}
 *   proposals={proposalData}
 *   analytics={enhancedAnalytics}
 * />
 */
export function GuestIntelligencePanel({
  forecast,
  proposals,
  analytics,
}: GuestIntelligencePanelProps) {
  const [showAllProps, setShowAllProps] = useState(false);

  const visibleProps = showAllProps
    ? (proposals?.proposals ?? [])
    : (proposals?.proposals ?? []).slice(0, 5);

  const hasNoData = !forecast && !proposals && !analytics;

  if (hasNoData) {
    return (
      <div
        className="gst-intel"
        data-state="empty"
        role="region"
        aria-label="Panel de inteligencia de invitados"
        data-testid="guest-intelligence-panel"
      >
        <p className="gst-intel__empty-text">
          No hay datos de inteligencia disponibles.
        </p>
      </div>
    );
  }

  return (
    <div
      className="gst-intel"
      data-state="data"
      role="region"
      aria-label="Panel de inteligencia de invitados"
      data-testid="guest-intelligence-panel"
    >
      {/* ── Forecast ── */}
      {forecast && (
        <div className="gst-intel__section">
          <div className="gst-intel__section-header">
            <TrendingUp className="gst-intel__section-icon" data-section="forecast" />
            <h3 className="gst-intel__section-title">Demanda Forecast</h3>
            <span className="gst-intel__section-meta">
              {forecast.forecast_horizon_months} meses
            </span>
          </div>

          <div className="gst-intel__forecast-list">
            {forecast.forecasts.map((item) => (
              <div
                key={item.metric}
                className="gst-intel__forecast-item"
                data-change={changeLevel(item.change_pct)}
              >
                <div className="gst-intel__forecast-header">
                  <span className="gst-intel__forecast-metric">{item.metric}</span>
                  <div className="gst-intel__forecast-change" data-change={changeLevel(item.change_pct)}>
                    <TrendingUp className="gst-intel__forecast-trend-icon" />
                    <span className="gst-intel__forecast-pct">
                      {item.change_pct >= 0 ? "+" : ""}{item.change_pct.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <p className="gst-intel__forecast-factors">
                  {item.factors.join(", ")}
                </p>

                {item.factors.length > 0 && (
                  <div className="gst-intel__forecast-tags">
                    {item.factors.map((f) => (
                      <span key={f} className="gst-intel__tag">{f}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {forecast.seasonal_multiplier !== 1.0 && (
              <div className="gst-intel__seasonal">
                <Calendar className="gst-intel__seasonal-icon" />
                <span className="gst-intel__seasonal-text">
                  Multiplicador estacional:{" "}
                  <span className="gst-intel__seasonal-value">
                    {forecast.seasonal_multiplier}x
                  </span>
                </span>
                {forecast.peak_months.length > 0 && (
                  <span className="gst-intel__seasonal-peaks">
                    · Picos: {forecast.peak_months.join(", ")}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Enhanced Analytics ── */}
      {analytics && (
        <div className="gst-intel__section">
          <div className="gst-intel__section-header">
            <BarChart3 className="gst-intel__section-icon" data-section="analytics" />
            <h3 className="gst-intel__section-title">Insights de Analytics</h3>
          </div>

          <div className="gst-intel__analytics-content">
            {analytics.top_referrers.length > 0 && (
              <div className="gst-intel__subsection">
                <p className="gst-intel__subsection-title">Top Referidores</p>
                {analytics.top_referrers.slice(0, 3).map((ref) => (
                  <div key={ref.family_id} className="gst-intel__referrer-row">
                    <span className="gst-intel__referrer-name">{ref.family_id}</span>
                    <div className="gst-intel__referrer-stats">
                      <span className="gst-intel__referrer-referrals">
                        {ref.referral_count} referidos
                      </span>
                      <span className="gst-intel__referrer-conversion">
                        {ref.referral_count > 0
                          ? ((ref.converted_count / ref.referral_count) * 100).toFixed(0)
                          : 0}% conversión
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {analytics.event_guest_correlation.length > 0 && (
              <div className="gst-intel__subsection" data-bordered="true">
                <p className="gst-intel__subsection-title">Eventos → Invitados</p>
                {analytics.event_guest_correlation.slice(0, 3).map((corr) => (
                  <div key={corr.event_type} className="gst-intel__correlation-row">
                    <span className="gst-intel__correlation-type">{corr.event_type}</span>
                    <div className="gst-intel__correlation-stats">
                      <span className="gst-intel__correlation-events">
                        {corr.total_events} eventos
                      </span>
                      <span className="gst-intel__correlation-guests">
                        {corr.avg_guests_generated} guests/evento
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Proposals ── */}
      {proposals && (
        <div className="gst-intel__section">
          <div className="gst-intel__section-header">
            <Zap className="gst-intel__section-icon" data-section="proposals" />
            <h3 className="gst-intel__section-title">Propuestas de Engagement</h3>
            <span className="gst-intel__badge">{proposals.total}</span>
            {proposals.high_priority_count > 0 && (
              <span className="gst-intel__badge" data-type="danger">
                {proposals.high_priority_count} alta prioridad
              </span>
            )}
          </div>

          <div className="gst-intel__proposals-list">
            {visibleProps.map((prop, idx) => {
              const typeLabel = PROPOSAL_TYPE_LABELS[prop.proposal_type] ?? prop.proposal_type;
              return (
                <div
                  key={prop.proposal_id}
                  className="gst-intel__proposal"
                  data-priority={prop.priority}
                  style={{ "--stagger-i": idx } as React.CSSProperties}
                >
                  <div className="gst-intel__proposal-header">
                    <div className="gst-intel__proposal-info">
                      <h4 className="gst-intel__proposal-title">{prop.title}</h4>
                      <span className="gst-intel__proposal-type">{typeLabel}</span>
                    </div>
                    <span className="gst-intel__proposal-pri" data-priority={prop.priority}>
                      {prop.priority}
                    </span>
                  </div>

                  <p className="gst-intel__proposal-desc">{prop.description}</p>

                  <div className="gst-intel__proposal-meta">
                    <span>Impacto: {prop.impact}</span>
                    <span>Tipo: {prop.proposal_type.replace(/_/g, " ")}</span>
                    <span className="gst-intel__proposal-confidence">
                      Confianza: {prop.confidence}%
                    </span>
                  </div>

                  {prop.cross_domain_signals.length > 0 && (
                    <div className="gst-intel__proposal-signals">
                      {prop.cross_domain_signals.map((signal) => (
                        <span key={signal} className="gst-intel__signal-tag">
                          {signal}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}

            {proposals.proposals.length > 5 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowAllProps(!showAllProps)}
              >
                {showAllProps ? (
                  <>
                    <ChevronUp className="w-3 h-3" />
                    Ver menos
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3 h-3" />
                    Ver {proposals.proposals.length - 5} más
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}