// src/features/communications/components/PersonalizedCommunication.tsx
// ═══════════════════════════════════════════════════════════
// Personalized Communication — V2 Rewrite
// "El Compositor AI" — Glass UI Intelligence Composer
// Castillo Country Club — Phase 31
//
// V2: Hook extracted (usePersonalizedComposer). Constants to config.ts.
// Engine integration: §14 analyzeTextTone, computeTextToneMatch;
// §15 scoreCampaignVariant. Zero framer-motion, Zero Tailwind.
// Glass namespace: glass-comm-composer
// ═══════════════════════════════════════════════════════════

import {
  Wand2, Send, Copy, Mail, MessageSquare, Smartphone,
  Sparkles, Clock, BarChart3, User, AlertTriangle,
  Lightbulb, ArrowRight, Shield, TrendingDown,
  Radio, Eye,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type {
  CommunicationsGeneratePersonalizedData,
} from "@/shared/mocks/contracts";

import type { CampaignVariantScore } from "../lib/communicationIntelligence";

import {
  COMPOSER_FAMILY_OPTIONS,
  COMPOSER_CHANNEL_OPTIONS,
  COMPOSER_OCCASION_SUGGESTIONS,
  channelToLabel,
} from "../config";
import type { ComposerSendTimeSlot } from "../config";

import { usePersonalizedComposer } from "../hooks/usePersonalizedComposer";
import type {
  MemberIntelligence,
  ComposerToneMatch,
} from "../hooks/usePersonalizedComposer";

import "./PersonalizedCommunication.css";

// ═══════════════════════════════════════════════════════════
// ICON MAP
// ═══════════════════════════════════════════════════════════

const CHANNEL_ICONS: Record<string, LucideIcon> = {
  email: Mail,
  push: Eye,
  sms: Smartphone,
  whatsapp: MessageSquare,
  in_app: Radio,
};

// ═══════════════════════════════════════════════════════════
// SUB: ChannelSelector (Innovation 8)
// ═══════════════════════════════════════════════════════════

function ChannelSelector({
  selected,
  onSelect,
  channelPerf,
  clubBreakdown,
}: {
  selected: string;
  onSelect: (id: string) => void;
  channelPerf?: Record<string, { openRate: number; count: number }>;
  clubBreakdown?: Array<{ channel: string; percentage: number; count: number }>;
}) {
  return (
    <div className="composer__channels">
      <p className="composer__channels-label">Canal</p>
      <div className="composer__channel-grid">
        {COMPOSER_CHANNEL_OPTIONS.map((ch, idx) => {
          const ChIcon = CHANNEL_ICONS[ch.id] ?? MessageSquare;
          const isSelected = selected === ch.id;
          const memberPerf = channelPerf?.[ch.id];
          const clubPerf = clubBreakdown?.find(
            (c: { channel: string }) => c.channel === ch.id,
          );

          return (
            <button
              key={ch.id}
              className="composer__channel-btn"
              data-selected={isSelected}
              data-channel={ch.token}
              onClick={() => onSelect(ch.id)}
              aria-pressed={isSelected}
              style={{ "--stagger-i": idx } as React.CSSProperties}
            >
              <div className="composer__channel-icon" data-channel={ch.token}>
                <ChIcon size={16} />
              </div>
              <span className="composer__channel-name">{ch.label}</span>
              {memberPerf && memberPerf.count > 0 && (
                <span className="composer__channel-member-rate">
                  {memberPerf.openRate}% apertura
                </span>
              )}
              {clubPerf && clubPerf.count > 0 && (
                <span className="composer__channel-club-rate">
                  {clubPerf.percentage}% del club
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB: IntelligenceBriefing (Innovation 1 + 2)
// ═══════════════════════════════════════════════════════════

function IntelligenceBriefing({
  data,
  memberIntel,
  riskAction,
  fatigueToken,
}: {
  data: CommunicationsGeneratePersonalizedData;
  memberIntel: MemberIntelligence;
  riskAction: string;
  fatigueToken: string;
}) {
  const lastInteractions = data.past_communication_performance.slice(0, 3);

  return (
    <div className="composer__briefing">
      <div className="composer__briefing-header">
        <Shield size={14} />
        <span>Intelligence Briefing</span>
      </div>

      <div className="composer__briefing-badges">
        <span className="composer__intel-badge" data-risk={memberIntel.engagementRisk}>
          <Shield size={12} />
          {memberIntel.engagementRisk === "critical" ? "Crítico" :
           memberIntel.engagementRisk === "approaching" ? "Acercándose" :
           memberIntel.engagementRisk === "drifting" ? "A la deriva" : "Estable"}
        </span>
        <span className="composer__intel-badge" data-fatigue={fatigueToken}>
          <TrendingDown size={12} />
          Fatiga: {fatigueToken === "saturated" ? "Saturado" :
                   fatigueToken === "elevated" ? "Elevado" :
                   fatigueToken === "normal" ? "Normal" : "Sin contacto"}
        </span>
        {memberIntel.silenceDays > 7 && (
          <span
            className="composer__intel-badge"
            data-silence={memberIntel.silenceDays > 21 ? "critical" : "alert"}
          >
            <Clock size={12} />
            {memberIntel.silenceDays}d silencio
          </span>
        )}
      </div>

      {lastInteractions.length > 0 && (
        <div className="composer__continuity">
          <span className="composer__continuity-label">Últimas interacciones:</span>
          <div className="composer__continuity-list">
            {lastInteractions.map(
              (p: { campaign_name: string; channel: string; date: string; sentiment: string }, i: number) => (
                <div key={i} className="composer__continuity-item">
                  <span className="composer__continuity-campaign">{p.campaign_name}</span>
                  <span className="composer__continuity-meta">
                    {channelToLabel(p.channel)} ·{" "}
                    {new Date(p.date).toLocaleDateString("es-CR", { day: "numeric", month: "short" })}
                  </span>
                  <span
                    className="composer__continuity-sentiment"
                    data-sentiment={
                      p.sentiment === "positivo" || p.sentiment === "positive"
                        ? "positive"
                        : p.sentiment === "negativo" || p.sentiment === "negative"
                          ? "negative"
                          : "neutral"
                    }
                  >
                    {p.sentiment}
                  </span>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      <div className="composer__briefing-action">
        <ArrowRight size={12} />
        <span>{riskAction}</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB: ToneMatchMeter (Innovation 3 — V2: 4 axes from engine)
// ═══════════════════════════════════════════════════════════

function ToneMatchMeter({ match }: { match: ComposerToneMatch }) {
  const level = match.overallScore >= 70 ? "good" : match.overallScore >= 40 ? "fair" : "poor";

  const bars = [
    { label: "Formalidad", score: match.formalityMatch },
    { label: "Calidez", score: match.warmthMatch },
    { label: "Urgencia", score: match.urgencyMatch },
    { label: "Personalización", score: match.personalizationMatch },
  ];

  return (
    <div className="composer__tone-match">
      <div className="composer__tone-match-header">
        <Sparkles size={14} />
        <span>Tone Match</span>
        <span className="composer__tone-match-score" data-match={level}>
          {match.overallScore}%
        </span>
      </div>

      <div className="composer__tone-bars">
        {bars.map((bar) => {
          const barLevel = bar.score >= 70 ? "good" : bar.score >= 40 ? "fair" : "poor";
          return (
            <div key={bar.label} className="composer__tone-bar-row">
              <span className="composer__tone-bar-label">{bar.label}</span>
              <div className="composer__tone-bar-track">
                <div
                  className="composer__tone-bar-fill"
                  data-match={barLevel}
                  style={{ "--bar-width": `${bar.score}%` } as React.CSSProperties}
                />
              </div>
              <span className="composer__tone-bar-score">{bar.score}%</span>
            </div>
          );
        })}
      </div>

      {match.suggestions.length > 0 && (
        <div className="composer__tone-suggestions">
          {match.suggestions.map((s: string, i: number) => (
            <div key={i} className="composer__tone-suggestion">
              <Lightbulb size={12} />
              <span>{s}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB: EngagementRiskPreview (Innovation 10)
// ═══════════════════════════════════════════════════════════

function EngagementRiskPreview({
  riskCtx,
}: {
  riskCtx: { label: string; token: string; detail: string; action: string };
}) {
  if (riskCtx.token === "safe") return null;

  return (
    <div className="composer__risk-banner" data-risk={riskCtx.token}>
      <div className="composer__risk-header">
        <AlertTriangle size={16} />
        <span className="composer__risk-label">Riesgo de engagement: {riskCtx.label}</span>
      </div>
      <p className="composer__risk-detail">{riskCtx.detail}</p>
      <p className="composer__risk-action">
        <ArrowRight size={12} /> {riskCtx.action}
      </p>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB: FatigueGuard (Innovation 5)
// ═══════════════════════════════════════════════════════════

function FatigueGuard({
  memberIntel,
  fatigueCtx,
}: {
  memberIntel: MemberIntelligence;
  fatigueCtx: { label: string; token: string; detail: string };
}) {
  if (fatigueCtx.token !== "saturated" && fatigueCtx.token !== "elevated") return null;

  return (
    <div className="composer__fatigue-warning" data-fatigue={fatigueCtx.token}>
      <TrendingDown size={16} />
      <div>
        <span className="composer__fatigue-label">Fatiga: {fatigueCtx.label}</span>
        <p className="composer__fatigue-detail">
          {memberIntel.communicationCount14d} comunicaciones en 14 días. {fatigueCtx.detail}
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB: SendTimeOptimizer (Innovation 9)
// ═══════════════════════════════════════════════════════════

function SendTimeOptimizer({ slots }: { slots: ComposerSendTimeSlot[] }) {
  return (
    <div className="composer__send-times">
      <div className="composer__send-times-header">
        <Clock size={14} />
        <span>Horarios Óptimos</span>
      </div>
      <div className="composer__send-time-list">
        {slots.map((slot, idx) => (
          <div
            key={slot.time}
            className="composer__send-time-slot"
            data-best={idx === 0}
            style={{ "--stagger-i": idx } as React.CSSProperties}
          >
            <div className="composer__send-time-score">
              <span className="composer__send-time-score-value" data-best={idx === 0}>
                {slot.score}%
              </span>
            </div>
            <div className="composer__send-time-info">
              <span className="composer__send-time-value">{slot.time}</span>
              <span className="composer__send-time-label">{slot.label}</span>
            </div>
            <span className="composer__send-time-reason">{slot.reason}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB: AlternativeComparison (Innovation 7 — V2: +variant scores)
// ═══════════════════════════════════════════════════════════

function AlternativeComparison({
  alternatives,
  variantScores,
  selectedIdx,
  onSelect,
  onCopy,
}: {
  alternatives: CommunicationsGeneratePersonalizedData["alternative_versions"];
  variantScores: CampaignVariantScore[];
  selectedIdx: number;
  onSelect: (idx: number) => void;
  onCopy: (text: string) => void;
}) {
  if (alternatives.length === 0) return null;

  return (
    <div className="composer__alternatives">
      <h3 className="composer__section-title">Versiones Alternativas</h3>

      <div className="composer__alt-tabs">
        {alternatives.map(
          (alt: { channel: string; subject?: string; body: string; cta_text?: string }, i: number) => {
            const ChIcon = CHANNEL_ICONS[alt.channel] ?? MessageSquare;
            const score = variantScores[i];
            return (
              <button
                key={i}
                className="composer__alt-tab"
                data-selected={i === selectedIdx}
                data-channel={alt.channel}
                onClick={() => onSelect(i)}
              >
                <ChIcon size={12} />
                <span>{channelToLabel(alt.channel)}</span>
                {score && (
                  <span className="composer__variant-score">{score.composite}%</span>
                )}
              </button>
            );
          },
        )}
      </div>

      {alternatives[selectedIdx] && (
        <div className="composer__alt-preview">
          {alternatives[selectedIdx].subject && (
            <p className="composer__alt-subject">{alternatives[selectedIdx].subject}</p>
          )}
          <p className="composer__alt-body">{alternatives[selectedIdx].body}</p>
          {alternatives[selectedIdx].cta_text && (
            <div className="composer__alt-cta">
              <span>{alternatives[selectedIdx].cta_text}</span>
            </div>
          )}
          {variantScores[selectedIdx] && (
            <div className="composer__alt-scores">
              <span className="composer__alt-score-item">
                Tono: {variantScores[selectedIdx].toneMatch}%
              </span>
              <span className="composer__alt-score-item">
                Personalización: {variantScores[selectedIdx].personalization}%
              </span>
              <span className="composer__alt-score-item">
                Longitud: {variantScores[selectedIdx].lengthScore}%
              </span>
            </div>
          )}
          <div className="composer__alt-actions">
            <button
              className="composer__copy-btn"
              onClick={() => onCopy(alternatives[selectedIdx].body)}
            >
              <Copy size={12} />
              <span>Copiar</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB: PerformanceHistory
// ═══════════════════════════════════════════════════════════

function PerformanceHistory({
  perf,
}: {
  perf: CommunicationsGeneratePersonalizedData["past_communication_performance"];
}) {
  if (perf.length === 0) return null;

  return (
    <div className="composer__section-card">
      <div className="composer__section-header">
        <div>
          <h3 className="composer__section-title">
            <BarChart3 size={14} /> Historial de Comunicaciones
          </h3>
          <p className="composer__section-sub">{perf.length} comunicaciones previas</p>
        </div>
      </div>
      <div className="composer__perf-list">
        {perf.map(
          (
            pc: {
              campaign_name: string;
              date: string;
              channel: string;
              open_rate_pct: number | null;
              response_rate_pct: number | null;
              sentiment: string;
            },
            i: number,
          ) => (
            <div key={i} className="composer__perf-row">
              <div className="composer__perf-main">
                <span className="composer__perf-name">{pc.campaign_name}</span>
                <span className="composer__perf-meta">
                  {channelToLabel(pc.channel)} ·{" "}
                  {new Date(pc.date).toLocaleDateString("es-CR", { day: "numeric", month: "short" })}
                </span>
              </div>
              <div className="composer__perf-metrics">
                {pc.open_rate_pct != null && (
                  <span className="composer__perf-metric">Apertura: {pc.open_rate_pct}%</span>
                )}
                {pc.response_rate_pct != null && (
                  <span className="composer__perf-metric">Respuesta: {pc.response_rate_pct}%</span>
                )}
              </div>
              <span
                className="composer__perf-sentiment"
                data-sentiment={
                  pc.sentiment === "positivo" || pc.sentiment === "positive"
                    ? "positive"
                    : pc.sentiment === "negativo" || pc.sentiment === "negative"
                      ? "negative"
                      : "neutral"
                }
              >
                {pc.sentiment}
              </span>
            </div>
          ),
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function PersonalizedCommunication() {
  const composer = usePersonalizedComposer();

  // ════════════════════════════════════════════════
  // EMPTY STATE — Pre-Generation
  // ════════════════════════════════════════════════

  if (!composer.hasData && !composer.isLoading) {
    return (
      <div className="glass-comm-composer">
        <div className="composer__hero">
          <div className="composer__hero-icon">
            <Wand2 size={28} />
          </div>
          <h2 className="composer__hero-title">Comunicación Personalizada</h2>
          <p className="composer__hero-sub">
            Generá comunicaciones inteligentes basadas en el historial,
            preferencias y ocasión de cada familia.
          </p>
        </div>

        <div className="composer__section-card">
          {/* Family Selector */}
          <div className="composer__field">
            <label className="composer__label" htmlFor="pc-family">Familia</label>
            <select
              id="pc-family"
              value={composer.familyId}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                composer.setFamilyId(e.target.value)
              }
              className="composer__select"
            >
              <option value="">Seleccionar familia...</option>
              {COMPOSER_FAMILY_OPTIONS.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.tier})
                </option>
              ))}
            </select>
            {composer.tierCtx && (
              <p className="composer__tier-hint" data-tier={composer.tierCtx.token}>
                {composer.tierCtx.expectation}
              </p>
            )}
          </div>

          {/* Channel Selector */}
          <ChannelSelector
            selected={composer.channel}
            onSelect={composer.setChannel}
            channelPerf={undefined}
            clubBreakdown={composer.clubAnalytics?.channel_breakdown}
          />

          {/* Occasion Input */}
          <div className="composer__field">
            <label className="composer__label" htmlFor="pc-occasion">Ocasión</label>
            <input
              id="pc-occasion"
              type="text"
              value={composer.occasion}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                composer.setOccasion(e.target.value)
              }
              placeholder="Ej: Reconocimiento de antigüedad 15 años"
              className="composer__input"
            />
            <div className="composer__occasion-chips">
              {COMPOSER_OCCASION_SUGGESTIONS.map((s: string) => (
                <button
                  key={s}
                  className="composer__occasion-chip"
                  onClick={() => composer.setOccasion(s)}
                  data-selected={composer.occasion === s}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>

          <button
            className="composer__generate-btn"
            onClick={composer.handleGenerate}
            disabled={!composer.familyId || !composer.occasion.trim()}
          >
            <Sparkles size={16} />
            <span>Generar Comunicación</span>
          </button>
        </div>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────
  if (composer.isLoading && !composer.hasData) {
    return (
      <div className="glass-comm-composer">
        <div className="composer__loading">
          {Array.from({ length: 4 }).map((_, i: number) => (
            <div key={i} className="composer__skeleton composer__skeleton--card" />
          ))}
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────
  if (composer.isError || !composer.data) {
    return (
      <div className="glass-comm-composer">
        <div className="composer__section-card">
          <div className="composer__error">
            <AlertTriangle size={24} />
            <h3>No se pudo generar</h3>
            <p>Intentá con otros parámetros.</p>
            <button className="composer__retry-btn" onClick={composer.handleRegenerate}>
              Nueva comunicación
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ════════════════════════════════════════════════
  // RENDER — Results
  // ════════════════════════════════════════════════

  const data = composer.data;

  return (
    <div className="glass-comm-composer" data-loaded="true">
      {/* ── Compact Input Bar ───────────────────── */}
      <div className="composer__compact-bar">
        <select
          value={composer.familyId}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
            composer.setFamilyId(e.target.value)
          }
          className="composer__select composer__select--compact"
        >
          {COMPOSER_FAMILY_OPTIONS.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
        <input
          type="text"
          value={composer.occasion}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
            composer.setOccasion(e.target.value)
          }
          className="composer__input composer__input--compact"
        />
        <button
          className="composer__generate-btn composer__generate-btn--compact"
          onClick={composer.handleRegenerate}
        >
          <Sparkles size={14} />
          <span>Re-generar</span>
        </button>
      </div>

      {/* ── Risk Banner ─────────────────────────── */}
      {composer.riskCtx && (
        <EngagementRiskPreview riskCtx={composer.riskCtx} />
      )}

      {/* ── Fatigue Guard ───────────────────────── */}
      {composer.memberIntel && composer.fatigueCtx && (
        <FatigueGuard memberIntel={composer.memberIntel} fatigueCtx={composer.fatigueCtx} />
      )}

      {/* ── Intelligence Briefing ───────────────── */}
      {composer.memberIntel && composer.riskCtx && composer.fatigueCtx && (
        <IntelligenceBriefing
          data={data}
          memberIntel={composer.memberIntel}
          riskAction={composer.riskCtx.action}
          fatigueToken={composer.fatigueCtx.token}
        />
      )}

      {/* ── Generated Content ───────────────────── */}
      <div className="composer__section-card">
        <div className="composer__content-header">
          <div className="composer__content-title-row">
            <Mail size={14} />
            <h3 className="composer__section-title">Comunicación Generada</h3>
            <span className="composer__channel-badge" data-channel={composer.channel}>
              {channelToLabel(composer.channel)}
            </span>
          </div>
          <div className="composer__content-actions">
            <button
              className="composer__copy-btn"
              onClick={() => composer.handleCopy(data.content.body)}
            >
              <Copy size={14} />
              <span>Copiar</span>
            </button>
            <button
              className="composer__send-btn"
              onClick={() => {
                /* would trigger send action */
              }}
            >
              <Send size={14} />
              <span>Enviar</span>
            </button>
          </div>
        </div>

        <div className="composer__email-preview">
          <div className="composer__preview-subject">
            <span className="composer__preview-label">Asunto:</span>
            <p className="composer__preview-subject-text">{data.content.subject}</p>
          </div>
          <p className="composer__preview-preheader">{data.content.preview_text}</p>
          <div className="composer__preview-body">{data.content.body}</div>
          {data.content.cta_text && (
            <div className="composer__preview-cta">
              <span>{data.content.cta_text}</span>
            </div>
          )}
        </div>

        <div className="composer__send-time-inline">
          <Clock size={12} />
          <span>{data.suggested_send_time}</span>
        </div>
      </div>

      {/* ── Tone Match (V2: 4-axis engine analysis) */}
      {composer.toneMatch && <ToneMatchMeter match={composer.toneMatch} />}

      {/* ── Send Time Optimizer ──────────────────── */}
      {composer.sendTimeSlots.length > 0 && (
        <SendTimeOptimizer slots={composer.sendTimeSlots} />
      )}

      {/* ── Personalization Details ──────────────── */}
      {data.personalization_details.length > 0 && (
        <div className="composer__section-card">
          <div className="composer__section-header">
            <div>
              <h3 className="composer__section-title">
                <User size={14} /> Detalles de Personalización
              </h3>
            </div>
          </div>
          <div className="composer__personalization-list">
            {data.personalization_details.map(
              (pd: { field: string; value: string; impact_on_engagement: string }, i: number) => (
                <div key={i} className="composer__personalization-item">
                  <div className="composer__personalization-main">
                    <span className="composer__personalization-field">{pd.field}:</span>
                    <span className="composer__personalization-value">{pd.value}</span>
                  </div>
                  <span className="composer__personalization-impact">{pd.impact_on_engagement}</span>
                </div>
              ),
            )}
          </div>
        </div>
      )}

      {/* ── Alternatives (V2: +variant scores) ───── */}
      <AlternativeComparison
        alternatives={data.alternative_versions}
        variantScores={composer.variantScores}
        selectedIdx={composer.selectedAlt}
        onSelect={composer.setSelectedAlt}
        onCopy={composer.handleCopy}
      />

      {/* ── Performance History ──────────────────── */}
      <PerformanceHistory perf={data.past_communication_performance} />
    </div>
  );
}