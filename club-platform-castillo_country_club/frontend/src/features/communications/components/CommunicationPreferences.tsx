// src/features/communications/components/CommunicationPreferences.tsx
// ═══════════════════════════════════════════════════════════
// Communication Preferences — V2 Rewrite
// "Los Ajustes" — Glass UI Intelligence Preference Manager
// Castillo Country Club — Phase 31
//
// V2: Hooks extracted (usePreferencesForm, usePreferenceIntelligence).
// Constants extracted to config.ts. Engine integration where data allows.
// Zero framer-motion, Zero Tailwind, Zero shared UI components.
// Glass namespace: glass-comm-preferences
// ═══════════════════════════════════════════════════════════

import { useState } from "react";
import {
  Search, Mail, Bell, Smartphone, Phone, MessageSquare, Save, UserCheck, UserPlus, Volume2, VolumeX,
  AlertTriangle, CheckCircle2, Settings, Lightbulb,
  ArrowRight, TrendingUp,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { FrequencyPreference } from "../types";
import { FREQUENCY_CONFIG } from "../types";

import {
  PREFS_CHANNEL_TOGGLE_CONFIG,
  PREFS_FREQUENCY_FIELDS,
  PREFS_FREQUENCY_VOLUME,
  PREFS_FREQUENCY_TOKENS,
  PREFS_FREQUENCY_RECOMMENDATIONS,
  PREFS_FREQUENCY_REC_REASONS,
  PREFS_FIELD_LABELS,
} from "../config";
import { usePreferencesForm } from "../hooks/usePreferencesForm";
import { usePreferenceIntelligence } from "../hooks/usePreferenceIntelligence";
import type { ChannelSuggestion } from "../hooks/usePreferenceIntelligence";

import "./CommunicationPreferences.css";

// ═══════════════════════════════════════════════════════════
// ICON MAP — token → Lucide component (runtime lookup)
// ═══════════════════════════════════════════════════════════

const CHANNEL_ICONS: Record<string, LucideIcon> = {
  email: Mail,
  push: Bell,
  sms: Smartphone,
  whatsapp: Phone,
  in_app: MessageSquare,
};

// ═══════════════════════════════════════════════════════════
// SUB: ToggleSwitch (CSS-only, inline — trivial)
// ═══════════════════════════════════════════════════════════

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className="prefs__toggle"
      data-checked={checked}
    >
      <span className="prefs__toggle-thumb" />
    </button>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB: QuietHoursTimeline (SVG)
// ═══════════════════════════════════════════════════════════

function QuietHoursTimeline({
  start,
  end,
  bestHour,
  hasConflict,
}: {
  start: string;
  end: string;
  bestHour: string;
  hasConflict: boolean;
}) {
  const W = 600;
  const H = 64;
  const BAR_Y = 10;
  const BAR_H = 14;
  const PL = 20;
  const PR = 20;
  const BAR_W = W - PL - PR;
  const totalMin = 24 * 60;

  const parseTime = (t: string): number => {
    const parts = t.split(":").map(Number);
    return parts[0] * 60 + (parts[1] || 0);
  };

  const qs = parseTime(start);
  const qe = parseTime(end);
  const isActive = qs !== 0 || qe !== 0;

  const quietSegments: Array<{ x: number; w: number }> = [];
  if (isActive) {
    if (qs < qe) {
      quietSegments.push({
        x: PL + (qs / totalMin) * BAR_W,
        w: ((qe - qs) / totalMin) * BAR_W,
      });
    } else {
      quietSegments.push({
        x: PL + (qs / totalMin) * BAR_W,
        w: ((totalMin - qs) / totalMin) * BAR_W,
      });
      quietSegments.push({
        x: PL,
        w: (qe / totalMin) * BAR_W,
      });
    }
  }

  const bestMinutes = parseTime(bestHour);
  const bestX = PL + (bestMinutes / totalMin) * BAR_W;
  const hourMarks = [0, 6, 12, 18, 24];

  return (
    <div className="prefs__quiet-timeline">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="prefs__quiet-svg"
        role="img"
        aria-label={`Horario silencioso: ${start} a ${end}. Mejor hora: ${bestHour}`}
      >
        <rect x={PL} y={BAR_Y} width={BAR_W} height={BAR_H} rx={7} className="prefs__quiet-track" />

        {isActive &&
          quietSegments.map((seg, i) => (
            <rect
              key={i}
              x={seg.x}
              y={BAR_Y}
              width={Math.max(seg.w, 2)}
              height={BAR_H}
              rx={7}
              className="prefs__quiet-fill"
            />
          ))}

        {bestHour && (
          <circle
            cx={bestX}
            cy={BAR_Y + BAR_H / 2}
            r={8}
            className="prefs__quiet-best"
            data-conflict={hasConflict}
          />
        )}
        {bestHour && (
          <text
            x={bestX}
            y={BAR_Y + BAR_H / 2 + 1}
            textAnchor="middle"
            dominantBaseline="central"
            className="prefs__quiet-best-label"
          >
            ★
          </text>
        )}

        {hourMarks.map((h) => {
          const x = PL + (h / 24) * BAR_W;
          return (
            <g key={h}>
              <line x1={x} y1={BAR_Y + BAR_H + 4} x2={x} y2={BAR_Y + BAR_H + 10} className="prefs__quiet-tick" />
              <text x={x} y={BAR_Y + BAR_H + 18} className="prefs__quiet-hour" textAnchor="middle">
                {String(h).padStart(2, "0")}
              </text>
            </g>
          );
        })}
      </svg>

      {hasConflict && (
        <div className="prefs__quiet-conflict" data-has-conflict="true">
          <AlertTriangle size={14} />
          <span>El mejor horario del club ({bestHour}) cae dentro del horario silencioso</span>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB: QualityGauge (SVG semicircle)
// ═══════════════════════════════════════════════════════════

function QualityGauge({ score }: { score: number }) {
  const W = 180;
  const H = 100;
  const cx = W / 2;
  const cy = H - 10;
  const r = 70;
  const angle = Math.PI - (score / 100) * Math.PI;
  const endX = cx + r * Math.cos(angle);
  const endY = cy - r * Math.sin(angle);
  const level = score >= 70 ? "good" : score >= 40 ? "fair" : "poor";

  return (
    <div className="prefs__quality-gauge">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="prefs__quality-svg"
        role="img"
        aria-label={`Calidad de preferencias: ${score} de 100`}
      >
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`}
          fill="none" className="prefs__quality-track" strokeWidth={10}
        />
        <path
          d={`M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${endX} ${endY}`}
          fill="none" className="prefs__quality-fill" data-quality={level}
          strokeWidth={10} strokeLinecap="round"
        />
        <text x={cx} y={cy - 26} textAnchor="middle" className="prefs__quality-number">
          {score}
        </text>
        <text x={cx} y={cy - 10} textAnchor="middle" className="prefs__quality-label">
          Calidad
        </text>
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB: ImpactPreview (delta panel)
// ═══════════════════════════════════════════════════════════

function ImpactPreview({
  changes,
  qualityDelta,
  channelCount,
  frequencyLevel,
  fatigueRisk,
}: {
  changes: Array<{ timestamp: number; field: string; from: string; to: string }>;
  qualityDelta: number;
  channelCount: number;
  frequencyLevel: string;
  fatigueRisk: string | null;
}) {
  if (changes.length === 0) return null;

  const recent = changes.slice(-5);

  return (
    <div className="prefs__impact-panel" data-has-changes="true">
      <div className="prefs__impact-header">
        <TrendingUp size={14} />
        <span>Impacto estimado</span>
      </div>
      <div className="prefs__impact-metrics">
        <div className="prefs__impact-metric">
          <span className="prefs__impact-metric-label">Canales activos</span>
          <span className="prefs__impact-metric-value">{channelCount}/5</span>
        </div>
        <div className="prefs__impact-metric">
          <span className="prefs__impact-metric-label">Volumen estimado</span>
          <span className="prefs__impact-metric-value">{frequencyLevel}</span>
        </div>
        <div className="prefs__impact-metric">
          <span className="prefs__impact-metric-label">Calidad</span>
          <span
            className="prefs__impact-metric-value"
            data-direction={qualityDelta > 0 ? "up" : qualityDelta < 0 ? "down" : "flat"}
          >
            {qualityDelta > 0 ? "+" : ""}{qualityDelta}pts
          </span>
        </div>
        {fatigueRisk && (
          <div className="prefs__impact-metric">
            <span className="prefs__impact-metric-label">Riesgo fatiga</span>
            <span className="prefs__impact-metric-value" data-risk={fatigueRisk.toLowerCase()}>
              {fatigueRisk}
            </span>
          </div>
        )}
      </div>
      <div className="prefs__impact-log">
        {recent.map((c, i) => (
          <div key={i} className="prefs__impact-log-entry">
            <span className="prefs__impact-log-field">{PREFS_FIELD_LABELS[c.field] ?? c.field}</span>
            <span className="prefs__impact-log-from">{c.from}</span>
            <ArrowRight size={10} />
            <span className="prefs__impact-log-to">{c.to}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB: ChannelSuggestions
// ═══════════════════════════════════════════════════════════

function ChannelSuggestions({
  suggestions,
  onApply,
}: {
  suggestions: ChannelSuggestion[];
  onApply?: (channelToken: string) => void;
}) {
  if (suggestions.length === 0) return null;

  return (
    <div className="prefs__suggestions">
      <div className="prefs__suggestions-header">
        <Lightbulb size={14} />
        <span>Canales sugeridos según actividad del club</span>
      </div>
      {suggestions.map((s, i) => (
        <div
          key={s.channel}
          className="prefs__suggestion-card"
          data-level={s.level}
          style={{ "--stagger-i": i } as React.CSSProperties}
        >
          <div className="prefs__suggestion-body">
            <span className="prefs__suggestion-channel">{s.label}</span>
            <p className="prefs__suggestion-reason">{s.reason}</p>
          </div>
          {onApply && (
            <button
              className="prefs__suggestion-apply"
              onClick={() => onApply(s.channel)}
              aria-label={`Activar canal ${s.label}`}
            >
              Activar
            </button>
          )}
        </div>
      ))}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// SUB: FatigueBadge (new — shows fatigue state)
// ═══════════════════════════════════════════════════════════

function FatigueBadge({
  fatigue,
}: {
  fatigue: { currentLevel: number; trend: string; risk: string; cooldownDays: number } | null;
}) {
  if (!fatigue) return null;

  const level =
    fatigue.currentLevel > 0.7 ? "saturated" :
    fatigue.currentLevel > 0.4 ? "elevated" :
    fatigue.currentLevel > 0.2 ? "normal" : "fresh";

  return (
    <div className="prefs__fatigue-badge" data-level={level}>
      <span className="prefs__fatigue-label">Fatiga</span>
      <span className="prefs__fatigue-value">
        {Math.round(fatigue.currentLevel * 100)}%
      </span>
      <span className="prefs__fatigue-trend" data-trend={fatigue.trend}>
        {fatigue.trend === "increasing" ? "↑" : fatigue.trend === "decreasing" ? "↓" : "→"}
      </span>
      {fatigue.cooldownDays > 0 && (
        <span className="prefs__fatigue-cooldown">
          Esperar {fatigue.cooldownDays}d
        </span>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function CommunicationPreferences() {
  // ── Hooks ────────────────────────────────────────
  const formState = usePreferencesForm();
  const intel = usePreferenceIntelligence(
    formState.form,
    formState.analytics,
    formState.history,
    formState.searchedMember,
    formState.originalQuality,
  );

  // ── Apply channel suggestion handler ────────────
  useState<string | null>(null);

  function handleApplySuggestion(channelToken: string) {
    const toggleKey = PREFS_CHANNEL_TOGGLE_CONFIG.find(
      (ch) => ch.token === channelToken,
    )?.key;
    if (toggleKey) {
      formState.updateField(toggleKey, true);
    }
  }

  // ── INITIAL STATE — no search yet ───────────────
  if (!formState.searchedMember && !formState.isLoading) {
    return (
      <div className="glass-comm-preferences">
        <div className="prefs__section-card">
          <div className="prefs__search-row">
            <div className="prefs__search-field">
              <label className="prefs__label" htmlFor="prefs-search-init">
                ID del Socio
              </label>
              <div className="prefs__input-wrap">
                <Search size={16} className="prefs__input-icon" />
                <input
                  id="prefs-search-init"
                  type="text"
                  value={formState.memberSearch}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    formState.setMemberSearch(e.target.value)
                  }
                  onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                    e.key === "Enter" && formState.handleSearch()
                  }
                  placeholder="Ej: member-001"
                  className="prefs__input"
                  aria-label="Buscar socio por ID"
                />
              </div>
            </div>
            <button className="prefs__search-btn" onClick={formState.handleSearch}>
              <Search size={16} />
              <span>Consultar</span>
            </button>
          </div>
        </div>

        <div className="prefs__initial-empty">
          <Settings size={32} className="prefs__empty-icon" />
          <h3>Preferencias de Comunicación</h3>
          <p>Buscá un socio por ID para gestionar sus preferencias con inteligencia contextual.</p>
        </div>
      </div>
    );
  }

  // ── RENDER — Active State ───────────────────────
  return (
    <div className="glass-comm-preferences" data-has-member={!!formState.searchedMember}>

      {/* ── Search Bar ───────────────────────────── */}
      <div className="prefs__section-card">
        <div className="prefs__search-row">
          <div className="prefs__search-field">
            <label className="prefs__label" htmlFor="prefs-search-active">
              ID del Socio
            </label>
            <div className="prefs__input-wrap">
              <Search size={16} className="prefs__input-icon" />
              <input
                id="prefs-search-active"
                type="text"
                value={formState.memberSearch}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  formState.setMemberSearch(e.target.value)
                }
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) =>
                  e.key === "Enter" && formState.handleSearch()
                }
                placeholder="Ej: member-001"
                className="prefs__input"
                aria-label="Buscar socio por ID"
              />
            </div>
          </div>
          <button
            className="prefs__search-btn"
            onClick={formState.handleSearch}
            disabled={formState.isLoading}
          >
            <Search size={16} />
            <span>{formState.isLoading ? "Buscando…" : "Consultar"}</span>
          </button>
        </div>
      </div>

      {/* ── Loading ──────────────────────────────── */}
      {formState.isLoading && (
        <div className="prefs__loading">
          <div className="prefs__skeleton prefs__skeleton--tall" />
          <div className="prefs__skeleton prefs__skeleton--medium" />
        </div>
      )}

      {/* ── Error ────────────────────────────────── */}
      {formState.isError && formState.searchedMember && !formState.isLoading && (
        <div className="prefs__section-card">
          <div className="prefs__not-found">
            <AlertTriangle size={28} className="prefs__not-found-icon" />
            <h3>Error al consultar</h3>
            <p>No se pudieron cargar las preferencias.</p>
            <button className="prefs__search-btn" onClick={formState.handleSearch}>
              <span>Reintentar</span>
            </button>
          </div>
        </div>
      )}

      {/* ── Not Found ────────────────────────────── */}
      {formState.isNotFound &&
        formState.searchedMember &&
        !formState.isLoading &&
        !formState.hasChanges && (
          <div className="prefs__section-card">
            <div className="prefs__not-found">
              <UserPlus size={28} className="prefs__not-found-icon" />
              <h3>Sin preferencias registradas</h3>
              <p>El socio {formState.searchedMember} aún no tiene preferencias configuradas.</p>
              <button
                className="prefs__create-btn"
                onClick={() => {
                  formState.setHasChanges(true);
                }}
              >
                <UserPlus size={16} />
                <span>Configurar Preferencias</span>
              </button>
            </div>
          </div>
        )}

      {/* ── Preferences Form ─────────────────────── */}
      {(formState.preferences || (formState.hasChanges && formState.searchedMember)) &&
        !formState.isLoading && (
          <div className="prefs__form" data-loaded="true">

            {/* ── Intelligence Strip ──────────────── */}
            {intel.fingerprint && (
              <div className="prefs__intelligence-strip">
                <span className="prefs__strip-badge" data-type="confidence">
                  Fingerprint {Math.round(intel.fingerprint.confidence * 100)}%
                </span>
                <span className="prefs__strip-badge" data-type="tone">
                  Tono: {intel.fingerprint.resonant_tone}
                </span>
                <span className="prefs__strip-badge" data-type="length">
                  Longitud: {intel.fingerprint.preferred_length}
                </span>
                <FatigueBadge fatigue={intel.fatigue} />
              </div>
            )}

            {/* ── Fingerprint Mini + Quality ──────── */}
            <div className="prefs__intelligence-row">
              <div className="prefs__fingerprint">
                <div className="prefs__fingerprint-header">
                  <Settings size={14} />
                  <span>Perfil de Comunicación</span>
                </div>
                <div className="prefs__fingerprint-badges">
                  <span className="prefs__fp-badge" data-type="style">
                    {intel.fingerprintMini.style}
                  </span>
                  <span className="prefs__fp-badge" data-type="engagement">
                    {intel.fingerprintMini.engagement}
                  </span>
                  <span className="prefs__fp-badge" data-type="schedule">
                    {intel.fingerprintMini.schedule}
                  </span>
                </div>
                <div className="prefs__fingerprint-channels">
                  {intel.fingerprintMini.activeLabels.length > 0 ? (
                    intel.fingerprintMini.activeLabels.map((ch) => (
                      <span key={ch} className="prefs__fp-channel">{ch}</span>
                    ))
                  ) : (
                    <span className="prefs__fp-channel prefs__fp-channel--empty">Sin canales</span>
                  )}
                </div>
              </div>
              <QualityGauge score={intel.qualityScore} />
            </div>

            {/* ── Member Header ───────────────────── */}
            {formState.preferences && (
              <div className="prefs__member-header">
                <div className="prefs__member-icon"><UserCheck size={18} /></div>
                <div className="prefs__member-info">
                  <span className="prefs__member-name">Socio: {formState.preferences.member_id}</span>
                  <span className="prefs__member-id">ID: {formState.preferences.id}</span>
                </div>
                {formState.hasChanges && (
                  <span className="prefs__unsaved-badge" data-pulse="true">Sin guardar</span>
                )}
              </div>
            )}

            {/* ── Channels ────────────────────────── */}
            <div className="prefs__section-card">
              <div className="prefs__section-header">
                <div>
                  <h3 className="prefs__section-title">Canales Habilitados</h3>
                  <p className="prefs__section-sub">
                    {intel.activeChannelCount} de {PREFS_CHANNEL_TOGGLE_CONFIG.length} canales activos
                  </p>
                </div>
                <span className="prefs__channel-count">
                  {intel.activeChannelCount}/{PREFS_CHANNEL_TOGGLE_CONFIG.length}
                </span>
              </div>

              <div className="prefs__channel-list">
                {PREFS_CHANNEL_TOGGLE_CONFIG.map((ch, idx) => {
                  const ChIcon = CHANNEL_ICONS[ch.token] ?? MessageSquare;
                  const score = intel.analyticsChannelScores[ch.token];
                  const memberScore = intel.memberChannelScores
                    ? deriveEffectivenessPreview(ch.token, intel.memberChannelScores)
                    : null;

                  return (
                    <div
                      key={ch.key}
                      className="prefs__channel-row"
                      data-channel={ch.token}
                      data-enabled={formState.form[ch.key]}
                      style={{ "--stagger-i": idx } as React.CSSProperties}
                    >
                      <div className="prefs__channel-main">
                        <div className="prefs__channel-icon" data-channel={ch.token}>
                          <ChIcon size={16} />
                        </div>
                        <div className="prefs__channel-info">
                          <span className="prefs__channel-label">{ch.label}</span>
                          {score && score.count > 0 && (
                            <span className="prefs__channel-club-note">
                              {score.pct}% del club · {score.count} envíos
                            </span>
                          )}
                          {memberScore !== null && (
                            <span className="prefs__channel-member-eff">
                              Effectiveness: {Math.round(memberScore * 100)}%
                            </span>
                          )}
                        </div>
                        <ToggleSwitch
                          checked={formState.form[ch.key]}
                          onChange={(val: boolean) => formState.updateField(ch.key, val)}
                          label={`${ch.label} toggle`}
                        />
                      </div>

                      {score && score.count > 0 && (
                        <div className="prefs__channel-effectiveness">
                          <div className="prefs__effectiveness-track">
                            <div
                              className="prefs__effectiveness-fill"
                              data-level={score.level}
                              style={{ "--eff-width": `${Math.max(score.pct, 3)}%` } as React.CSSProperties}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              <ChannelSuggestions
                suggestions={intel.channelSuggestions}
                onApply={handleApplySuggestion}
              />
            </div>

            {/* ── Frequency ───────────────────────── */}
            <div className="prefs__section-card">
              <div className="prefs__section-header">
                <div>
                  <h3 className="prefs__section-title">Frecuencia por Tipo</h3>
                  <p className="prefs__section-sub">Volumen estimado: {intel.frequencyLevel}</p>
                </div>
              </div>

              <div className="prefs__freq-list">
                {PREFS_FREQUENCY_FIELDS.map((field, idx) => {
                  const currentVal = formState.form[field.key];
                  const volume = PREFS_FREQUENCY_VOLUME[currentVal] ?? 0;
                  const impactToken = PREFS_FREQUENCY_TOKENS[currentVal] ?? "none";
                  const isRecommended = currentVal === PREFS_FREQUENCY_RECOMMENDATIONS[field.key];
                  const recLabel = isRecommended ? "Óptimo" : PREFS_FREQUENCY_REC_REASONS[field.key] ?? "";

                  return (
                    <div
                      key={field.key}
                      className="prefs__freq-card"
                      style={{ "--stagger-i": idx } as React.CSSProperties}
                    >
                      <div className="prefs__freq-header">
                        <div className="prefs__freq-title-row">
                          <label className="prefs__freq-label" htmlFor={`freq-${field.key}`}>
                            {field.label}
                          </label>
                          <span className="prefs__freq-rec" data-recommended={isRecommended}>
                            {isRecommended ? "✓ Óptimo" : `→ ${recLabel}`}
                          </span>
                        </div>
                        <p className="prefs__freq-desc">{field.description}</p>
                      </div>

                      <select
                        id={`freq-${field.key}`}
                        value={currentVal}
                        onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                          formState.updateField(field.key, e.target.value as FrequencyPreference)
                        }
                        className="prefs__freq-select"
                      >
                        {(Object.entries(FREQUENCY_CONFIG) as Array<[string, { label: string; description: string }]>)
                          .map(([key, cfg]) => (
                            <option key={key} value={key}>
                              {cfg.label} — {cfg.description}
                            </option>
                          ))
                        }
                      </select>

                      <div className="prefs__freq-gauge">
                        <div className="prefs__freq-gauge-track">
                          <div
                            className="prefs__freq-gauge-fill"
                            data-impact={impactToken}
                            style={{ "--gauge-width": `${(volume / 90) * 100}%` } as React.CSSProperties}
                          />
                        </div>
                        <span className="prefs__freq-gauge-label" data-impact={impactToken}>
                          ~{volume} msgs/mes
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* ── Quiet Hours ─────────────────────── */}
            <div className="prefs__section-card">
              <div className="prefs__section-header">
                <div>
                  <h3 className="prefs__section-title">Horario Silencioso</h3>
                  <p className="prefs__section-sub">Sin notificaciones en este rango</p>
                </div>
                <div className="prefs__quiet-icon">
                  {formState.form.quiet_hours_start === "00:00" &&
                  formState.form.quiet_hours_end === "00:00" ? (
                    <VolumeX size={18} />
                  ) : (
                    <Volume2 size={18} />
                  )}
                </div>
              </div>

              <QuietHoursTimeline
                start={formState.form.quiet_hours_start}
                end={formState.form.quiet_hours_end}
                bestHour={formState.analytics?.best_hour_to_send ?? ""}
                hasConflict={intel.quietConflict?.hasConflict ?? false}
              />

              <div className="prefs__quiet-inputs">
                <div className="prefs__quiet-field">
                  <label className="prefs__quiet-label" htmlFor="prefs-quiet-start">Inicio</label>
                  <input
                    id="prefs-quiet-start"
                    type="time"
                    value={formState.form.quiet_hours_start}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      formState.updateField("quiet_hours_start", e.target.value)
                    }
                    className="prefs__time-input"
                    aria-label="Inicio horario silencioso"
                  />
                </div>
                <div className="prefs__quiet-field">
                  <label className="prefs__quiet-label" htmlFor="prefs-quiet-end">Fin</label>
                  <input
                    id="prefs-quiet-end"
                    type="time"
                    value={formState.form.quiet_hours_end}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      formState.updateField("quiet_hours_end", e.target.value)
                    }
                    className="prefs__time-input"
                    aria-label="Fin horario silencioso"
                  />
                </div>
              </div>

              <p className="prefs__quiet-note">
                Las notificaciones programadas dentro de este rango se enviarán al inicio del próximo horario activo.
              </p>
            </div>

            {/* ── Impact Preview ───────────────────── */}
            {formState.hasChanges && (
              <ImpactPreview
                changes={formState.changeLog}
                qualityDelta={intel.qualityDelta}
                channelCount={intel.activeChannelCount}
                frequencyLevel={intel.frequencyLevel}
                fatigueRisk={intel.fatigue?.risk ?? null}
              />
            )}

            {/* ── Save Bar ─────────────────────────── */}
            <div className="prefs__save-bar">
              {formState.hasChanges ? (
                <span className="prefs__save-hint" data-unsaved="true">
                  <AlertTriangle size={14} />
                  Tenés cambios sin guardar
                  {formState.changeLog.length > 0 && (
                    <span className="prefs__save-count">({formState.changeLog.length})</span>
                  )}
                </span>
              ) : (
                <span className="prefs__save-hint" data-unsaved="false">
                  <CheckCircle2 size={14} />
                  Todo guardado
                </span>
              )}

              <button
                className="prefs__save-btn"
                onClick={formState.handleSave}
                disabled={!formState.hasChanges || formState.isSaving}
                data-saving={formState.isSaving}
              >
                <Save size={16} />
                <span>
                  {formState.isSaving
                    ? "Guardando…"
                    : formState.existingId
                      ? "Guardar Preferencias"
                      : "Crear Preferencias"}
                </span>
              </button>
            </div>
          </div>
        )}
    </div>
  );
}

// ── Helper: effectiveness preview for member-specific scores ──
function deriveEffectivenessPreview(
  channelToken: string,
  memberScores: Record<string, number>,
): number | null {
  const score = memberScores[channelToken];
  if (score === undefined) return null;
  const globalWeight = deriveChannelWeight(channelToken);
  return globalWeight * 0.4 + score * 0.6;
}

function deriveChannelWeight(token: string): number {
  const weights: Record<string, number> = {
    email: 0.7, push: 0.8, sms: 0.9, whatsapp: 0.85, in_app: 0.6,
  };
  return weights[token] ?? 0.5;
}