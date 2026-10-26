// src/features/communications/components/ScheduleComposer.tsx
// ═══════════════════════════════════════════════════════════
// Schedule Composer — V2 Refactored
// "El Programador" — Glass UI Intelligence Scheduler
// Castillo Country Club — Phase 31
//
// Business logic: lib/temporalRouter, lib/communicationIntelligence
// Configuration: config.ts
// This component: form state + hooks + JSX. Zero business logic.
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import {
  CalendarClock, FileText, Users, Clock,
  CheckCircle2, AlertTriangle,
  Zap, Eye, Mail, MessageSquare, Smartphone,
  Shield, ArrowRight, Target,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useMCPQuery, useMCPMutation } from "@/shared/hooks/useMCPQuery";
import { showToast } from "@/shared/components/ui";

import type {
  NotificationChannel,
  CommunicationAnalyticsResponse,
} from "../types";

import {
  SCHEDULE_TEMPLATE_CATEGORY_LABELS,
  SCHEDULE_CHANNEL_OPTIONS,
  SPANISH_DAY_NAMES,
  TEMPLATE_CATEGORY_TO_MESSAGE_TYPE,
  CLUB_QUIET_HOURS,
} from "../config";

import { analyzeTextTone } from "../lib/communicationIntelligence";
import type { TextToneProfile } from "../lib/communicationIntelligence";

import {
  computeAnalyticsTimeScore,
  extractSuggestedTimeSlots,
  computeRemainingImpact,
  computeFollowUpWindow,
} from "../lib/temporalRouter";
import type {
  AnalyticsTimeScore,
  SuggestedTimeSlot,
} from "../lib/temporalRouter";

import "./ScheduleComposer.css";

// ═══════════════════════════════════════════════════════════
// Types (MCP response shapes)
// ═══════════════════════════════════════════════════════════

interface TemplateItem {
  id: string;
  name: string;
  category: string;
  subject: string;
  body_template: string;
  channels: string[];
  variables: string[];
  is_active: boolean;
  created_at: string;
}

interface TemplateListResponse {
  templates: TemplateItem[];
}

interface ScheduleCreateResponse {
  status: string;
  message: string;
  scheduled: { id: string; scheduled_at: string; status: string };
}

// ═══════════════════════════════════════════════════════════
// Presentation helpers
// ═══════════════════════════════════════════════════════════

const CHANNEL_ICONS: Record<string, LucideIcon> = {
  email: Mail,
  push: Zap,
  sms: Smartphone,
  whatsapp: MessageSquare,
  in_app: Eye,
};

function inferMessageType(category: string): string {
  return TEMPLATE_CATEGORY_TO_MESSAGE_TYPE[category] ?? "announcement";
}

// ═══════════════════════════════════════════════════════════
// Sub-component: Template Preview (presentation only)
// ═══════════════════════════════════════════════════════════

function TemplatePreview({ template }: { template: TemplateItem }) {
  return (
    <div className="schedule__template-preview">
      <div className="schedule__template-meta">
        <span className="schedule__template-category">
          {SCHEDULE_TEMPLATE_CATEGORY_LABELS[template.category] ?? template.category}
        </span>
        {template.channels.length > 0 && (
          <div className="schedule__template-channels">
            {template.channels.map((ch: string) => (
              <span key={ch} className="schedule__template-channel-tag">{ch}</span>
            ))}
          </div>
        )}
      </div>
      <p className="schedule__template-subject">{template.subject}</p>
      <p className="schedule__template-body">{template.body_template}</p>
      {template.variables.length > 0 && (
        <div className="schedule__template-variables">
          {template.variables.map((v: string) => (
            <span key={v} className="schedule__template-variable">{`{{${v}}}`}</span>
          ))}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════

export function ScheduleComposer() {
  // ── Form state ───────────────────────────────────────
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [channel, setChannel] = useState("email");
  const [recipientIds, setRecipientIds] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [notes, setNotes] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // ── Queries + Mutation ───────────────────────────────
  const templatesQ = useMCPQuery<TemplateListResponse>(
    "communication", "manage_notification_templates",
    { action: "list" },
    { staleTime: 120_000 },
  );
  const analyticsQ = useMCPQuery<CommunicationAnalyticsResponse>(
    "communication", "get_communication_analytics",
    { period: "current_month" },
    { staleTime: 300_000 },
  );
  const scheduleMut = useMCPMutation<ScheduleCreateResponse>(
    "communication", "schedule_notification",
    {
      onSuccess: (data) => {
        showToast({ type: "success", message: data.message ?? "Notificación programada" });
        resetForm();
      },
      onError: (err) =>
        showToast({ type: "error", message: err instanceof Error ? err.message : "Error al programar" }),
    },
  );

  // ── Data ─────────────────────────────────────────────
  const templates = useMemo(
    () => (templatesQ.data?.templates ?? []).filter((t: TemplateItem) => t.is_active),
    [templatesQ.data],
  );
  const selectedTemplate = useMemo(
    () => templates.find((t: TemplateItem) => t.id === selectedTemplateId) ?? null,
    [templates, selectedTemplateId],
  );
  const analytics = analyticsQ.data?.analytics;

  const recipientCount = useMemo(() => {
    if (!recipientIds.trim()) return 0;
    return recipientIds.split(",").map((r) => r.trim()).filter(Boolean).length;
  }, [recipientIds]);

  // ── Intelligence computations ────────────────────────
  const timeScore = useMemo((): AnalyticsTimeScore | null => {
    if (!analytics) return null;
    return computeAnalyticsTimeScore(
      date, time, analytics.hourly_distribution,
      analytics.best_day_to_send, analytics.best_hour_to_send,
    );
  }, [date, time, analytics]);

  const suggestedSlots = useMemo((): SuggestedTimeSlot[] => {
    if (!analytics) return [];
    return extractSuggestedTimeSlots(
      analytics.hourly_distribution, analytics.best_day_to_send, analytics.best_hour_to_send,
    );
  }, [analytics]);

  const templateTone = useMemo((): TextToneProfile | null => {
    if (!selectedTemplate) return null;
    return analyzeTextTone(selectedTemplate.body_template);
  }, [selectedTemplate]);

  const channelClubPct = useMemo((): Record<string, number> => {
    if (!analytics) return {};
    const m: Record<string, number> = {};
    analytics.channel_breakdown.forEach((c: { channel: string; percentage: number }) => {
      m[c.channel] = c.percentage;
    });
    return m;
  }, [analytics]);

  const channelFit = useMemo((): number | null => {
    if (!analytics) return null;
    const ch = analytics.channel_breakdown.find(
      (c: { channel: string }) => c.channel === channel,
    );
    return ch ? Math.min(100, Math.round(ch.percentage * 1.5 + 30)) : 50;
  }, [analytics, channel]);

  const quietConflict = useMemo((): boolean => {
    if (!time) return false;
    const h = parseInt(time.split(":")[0], 10);
    return h >= CLUB_QUIET_HOURS.start || h < CLUB_QUIET_HOURS.end;
  }, [time]);

  const impactPreviews = useMemo(() => {
    if (!selectedTemplate) return null;
    const mt = inferMessageType(selectedTemplate.category);
    const nc = channel as NotificationChannel;
    return [1, 3, 7, 14].map((d) => ({
      days: d,
      impact: computeRemainingImpact(nc, mt, d),
    }));
  }, [selectedTemplate, channel]);

  const followUpWindow = useMemo(() => {
    if (!selectedTemplate) return null;
    return computeFollowUpWindow(inferMessageType(selectedTemplate.category));
  }, [selectedTemplate]);

  const summaryWarnings = useMemo((): string[] => {
    const w: string[] = [];
    if (quietConflict) w.push("Horario en zona silenciosa");
    if (timeScore && timeScore.score < 40) w.push("Horario subóptimo");
    if (recipientCount > 100) w.push("Requiere aprobación HITL");
    if (channelFit !== null && channelFit < 50) w.push("Canal poco usado por el club");
    return w;
  }, [quietConflict, timeScore, recipientCount, channelFit]);

  // ── Handlers ─────────────────────────────────────────

  function resetForm() {
    setSelectedTemplateId("");
    setChannel("email");
    setRecipientIds("");
    setDate("");
    setTime("");
    setNotes("");
    setFormErrors({});
  }

  function clearError(field: string) {
    setFormErrors((p) => {
      const n = { ...p };
      delete n[field];
      return n;
    });
  }

  function validate(): boolean {
    const errors: Record<string, string> = {};
    if (!selectedTemplateId) errors.template = "Seleccioná una plantilla";
    if (!recipientIds.trim()) errors.recipients = "Ingresá al menos un destinatario";
    if (!date) errors.date = "Seleccioná una fecha";
    if (!time) errors.time = "Seleccioná una hora";
    if (date && time) {
      const scheduled = new Date(`${date}T${time}:00`);
      if (scheduled.getTime() <= Date.now()) errors.date = "La fecha debe ser futura";
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    scheduleMut.mutate({
      action: "create",
      template_id: selectedTemplateId,
      recipient_ids: recipientIds,
      channel,
      scheduled_at: `${date}T${time}:00`,
      notes: notes || undefined,
    });
  }

  function applySlot(day: string, hour: string) {
    const dayIndex = SPANISH_DAY_NAMES.indexOf(day as typeof SPANISH_DAY_NAMES[number]);
    const now = new Date();
    let daysUntil = dayIndex - now.getDay();
    if (daysUntil <= 0) daysUntil += 7;
    const target = new Date(now);
    target.setDate(target.getDate() + daysUntil);
    setDate(target.toISOString().split("T")[0]);
    setTime(hour);
  }

  const handleAutoOptimize = useCallback(() => {
    if (!analytics) return;
    const dayIndex = SPANISH_DAY_NAMES.indexOf(
      analytics.best_day_to_send as typeof SPANISH_DAY_NAMES[number],
    );
    const now = new Date();
    let daysUntil = dayIndex - now.getDay();
    if (daysUntil <= 0) daysUntil += 7;
    const target = new Date(now);
    target.setDate(target.getDate() + daysUntil);
    setDate(target.toISOString().split("T")[0]);
    setTime(analytics.best_hour_to_send);
    showToast({ type: "success", message: "Horario optimizado automáticamente" });
  }, [analytics]);

  // ═════════════════════════════════════════════════════
  // ERROR
  // ═════════════════════════════════════════════════════

  if (templatesQ.isError) {
    return (
      <div className="glass-comm-schedule">
        <div className="schedule__section-card">
          <div className="schedule__error">
            <FileText size={32} />
            <h3>Error al cargar plantillas</h3>
            <p>No pudimos obtener las plantillas de notificación.</p>
            <button className="schedule__retry-btn" onClick={() => templatesQ.refetch()}>
              Reintentar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Loading ──────────────────────────────────────────

  if (templatesQ.isLoading || analyticsQ.isLoading) {
    return (
      <div className="glass-comm-schedule">
        <div className="schedule__loading">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="schedule__skeleton schedule__skeleton--card" />
          ))}
        </div>
      </div>
    );
  }

  // ── Empty ────────────────────────────────────────────

  if (templates.length === 0) {
    return (
      <div className="glass-comm-schedule">
        <div className="schedule__section-card">
          <div className="schedule__empty">
            <FileText size={32} />
            <h3>Sin plantillas disponibles</h3>
            <p>Creá al menos una plantilla antes de programar envíos.</p>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════
  // RENDER — Form
  // ═════════════════════════════════════════════════════

  const allFieldsFilled = selectedTemplateId && recipientIds.trim() && date && time;

  return (
    <div className="glass-comm-schedule" data-loaded="true">
      {/* ── Template Selector ─────────────────────────── */}
      <div className="schedule__section-card">
        <h3 className="schedule__section-title">
          <FileText size={14} /> Plantilla
        </h3>
        <p className="schedule__section-sub">
          Elegí la plantilla para esta notificación
        </p>
        <select
          value={selectedTemplateId}
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
            setSelectedTemplateId(e.target.value);
            clearError("template");
          }}
          className="schedule__select"
          aria-label="Seleccionar plantilla"
          aria-invalid={!!formErrors.template}
        >
          <option value="">Seleccioná una plantilla…</option>
          {templates.map((t: TemplateItem) => (
            <option key={t.id} value={t.id}>
              {t.name} — {SCHEDULE_TEMPLATE_CATEGORY_LABELS[t.category] ?? t.category}
            </option>
          ))}
        </select>
        {formErrors.template && (
          <p className="schedule__field-error">{formErrors.template}</p>
        )}

        {selectedTemplate && <TemplatePreview template={selectedTemplate} />}

        {/* Innovation 5: Template Tone Analysis */}
        {templateTone && (
          <div className="schedule__tone-bars">
            {([
              { label: "Form.", value: templateTone.formality },
              { label: "Calidez", value: templateTone.warmth },
              { label: "Urg.", value: templateTone.urgency },
              { label: "Pers.", value: templateTone.personalization },
            ] as const).map(
              (bar: { label: string; value: number }) => (
                <div key={bar.label} className="schedule__tone-bar">
                  <span className="schedule__tone-bar-label">{bar.label}</span>
                  <div className="schedule__tone-bar-track">
                    <div
                      className="schedule__tone-bar-fill"
                      data-level={bar.value >= 60 ? "good" : bar.value >= 30 ? "fair" : "low"}
                      style={{ "--bar-width": `${bar.value}%` } as React.CSSProperties}
                    />
                  </div>
                </div>
              ),
            )}
          </div>
        )}
      </div>

      {/* ── Recipients & Channel ──────────────────────── */}
      <div className="schedule__section-card">
        <h3 className="schedule__section-title">
          <Users size={14} /> Destinatarios y Canal
        </h3>

        {/* Innovation 4: Channel Intelligence Badges */}
        <label className="schedule__label">Canal de envío</label>
        <div className="schedule__channel-grid">
          {SCHEDULE_CHANNEL_OPTIONS.map(
            (
              ch: { id: string; label: string; token: string },
              i: number,
            ) => {
              const ChIcon = CHANNEL_ICONS[ch.id] ?? Mail;
              const isSelected = channel === ch.id;
              const pct = channelClubPct[ch.id];
              return (
                <button
                  key={ch.id}
                  className="schedule__channel-btn"
                  data-selected={isSelected}
                  data-channel={ch.token}
                  onClick={() => setChannel(ch.id)}
                  aria-pressed={isSelected}
                  style={{ "--stagger-i": i } as React.CSSProperties}
                >
                  <ChIcon size={16} />
                  <span>{ch.label}</span>
                  {pct !== undefined && (
                    <span className="schedule__channel-pct">{pct}% club</span>
                  )}
                </button>
              );
            },
          )}
        </div>
        {channelFit !== null && (
          <span
            className="schedule__channel-fit"
            data-level={channelFit >= 70 ? "good" : channelFit >= 40 ? "fair" : "poor"}
          >
            Fit: {channelFit}%
          </span>
        )}

        {/* Recipients */}
        <label className="schedule__label" style={{ marginTop: "var(--space-4, 1rem)" }}>
          Destinatarios (IDs separados por coma) *
        </label>
        <input
          type="text"
          value={recipientIds}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
            setRecipientIds(e.target.value);
            clearError("recipients");
          }}
          placeholder="member-001, member-002, member-003"
          className="schedule__input"
          aria-label="IDs de destinatarios"
          aria-invalid={!!formErrors.recipients}
        />
        {formErrors.recipients && (
          <p className="schedule__field-error">{formErrors.recipients}</p>
        )}

        {/* Innovation 6: Recipient Count Intelligence */}
        {recipientCount > 0 && (
          <div className="schedule__recipient-intel">
            <span className="schedule__recipient-count">
              {recipientCount} destinatario{recipientCount !== 1 ? "s" : ""}
            </span>
            <span
              className="schedule__recipient-level"
              data-level={
                recipientCount > 100
                  ? "critical"
                  : recipientCount > 50
                    ? "warning"
                    : recipientCount > 10
                      ? "normal"
                      : "individual"
              }
            >
              {recipientCount > 100
                ? "Requiere aprobación HITL"
                : recipientCount > 50
                  ? "Grupo mediano"
                  : recipientCount > 10
                    ? "Grupo pequeño"
                    : "Envío individual"}
            </span>
          </div>
        )}
      </div>

      {/* ── Smart Time Picker ─────────────────────────── */}
      <div className="schedule__section-card">
        <div className="schedule__time-header">
          <h3 className="schedule__section-title">
            <Clock size={14} /> Fecha y Hora
          </h3>
          {/* Innovation 8: Auto-Optimize */}
          <button
            className="schedule__auto-optimize-btn"
            onClick={handleAutoOptimize}
            disabled={!analytics}
          >
            <Target size={14} />
            <span>Auto-optimizar</span>
          </button>
        </div>

        <div className="schedule__time-inputs">
          <div className="schedule__field">
            <label className="schedule__label" htmlFor="sc-date">Fecha *</label>
            <input
              id="sc-date"
              type="date"
              value={date}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setDate(e.target.value);
                clearError("date");
              }}
              className="schedule__input schedule__input--date"
              aria-invalid={!!formErrors.date}
            />
            {formErrors.date && <p className="schedule__field-error">{formErrors.date}</p>}
          </div>
          <div className="schedule__field">
            <label className="schedule__label" htmlFor="sc-time">Hora *</label>
            <input
              id="sc-time"
              type="time"
              value={time}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setTime(e.target.value);
                clearError("time");
              }}
              className="schedule__input schedule__input--time"
              aria-invalid={!!formErrors.time}
            />
            {formErrors.time && <p className="schedule__field-error">{formErrors.time}</p>}
          </div>
        </div>

        {/* Innovation 1: Time Score Ring */}
        {timeScore && date && time && (
          <div className="schedule__time-indicator" data-level={timeScore.level}>
            <div className="schedule__time-indicator-content">
              <Clock size={20} />
              <div className="schedule__time-indicator-text">
                <p className="schedule__time-indicator-label">{timeScore.label}</p>
                <div className="schedule__time-indicator-details">
                  <span>
                    Día: {timeScore.selectedDay}
                    {timeScore.matchesDay && <CheckCircle2 size={12} />}
                  </span>
                  <span>
                    Hora: {time}
                    {timeScore.matchesHour && <CheckCircle2 size={12} />}
                  </span>
                </div>
              </div>
              <svg viewBox="0 0 48 48" className="schedule__time-ring">
                <circle cx="24" cy="24" r="20" fill="none" className="schedule__time-ring-bg" strokeWidth="4" />
                <circle
                  cx="24" cy="24" r="20" fill="none"
                  className="schedule__time-ring-fill"
                  data-level={timeScore.level}
                  strokeWidth="4"
                  strokeDasharray={`${2 * Math.PI * 20}`}
                  style={{ "--ring-offset": `${2 * Math.PI * 20 * (1 - timeScore.score / 100)}` } as React.CSSProperties}
                  strokeLinecap="round"
                  transform="rotate(-90 24 24)"
                />
                <text x="24" y="24" textAnchor="middle" dominantBaseline="middle" className="schedule__time-ring-text">
                  {timeScore.score}
                </text>
              </svg>
            </div>
          </div>
        )}

        {/* Innovation 2: Quiet Hours Warning */}
        {quietConflict && (
          <div className="schedule__quiet-warning">
            <Shield size={16} />
            <span>Horario en zona silenciosa (22:00–07:00) — considerá enviar después de las 07:00</span>
          </div>
        )}

        {/* Innovation 3: Impact Decay Preview */}
        {impactPreviews && (
          <div className="schedule__impact-preview">
            <span className="schedule__impact-label">Impacto estimado:</span>
            {impactPreviews.map(
              (p: { days: number; impact: number }) => (
                <span
                  key={p.days}
                  className="schedule__impact-item"
                  data-level={p.impact >= 0.7 ? "good" : p.impact >= 0.3 ? "fair" : "poor"}
                >
                  {p.days}d: {Math.round(p.impact * 100)}%
                </span>
              ),
            )}
          </div>
        )}

        {/* Innovation 7: Cascade / Follow-up Preview */}
        {followUpWindow && (
          <div className="schedule__cascade-preview">
            <ArrowRight size={12} />
            <span>
              Follow-up recomendado: día {followUpWindow.optimalDays}
              {" "}({followUpWindow.minDays}–{followUpWindow.maxDays} días)
            </span>
          </div>
        )}

        {/* Innovation 10: Enhanced Suggested Slots */}
        {suggestedSlots.length > 0 && (
          <div className="schedule__suggested-slots">
            <p className="schedule__suggested-label">Horarios sugeridos según historial</p>
            {suggestedSlots.map((slot: SuggestedTimeSlot, i: number) => (
              <button
                key={i}
                className="schedule__suggested-slot"
                data-best={slot.isOptimal}
                onClick={() => applySlot(slot.day, slot.hour)}
              >
                {slot.isOptimal && <CheckCircle2 size={14} />}
                <span className="schedule__slot-score" data-best={slot.isOptimal}>{slot.score}%</span>
                <span className="schedule__slot-day">{slot.day} {slot.hour}</span>
                <span className="schedule__slot-reason">{slot.reason}</span>
              </button>
            ))}
            {analytics && (
              <p className="schedule__suggested-basis">
                Basado en tu mejor día ({analytics.best_day_to_send}) y horarios de mayor actividad.
              </p>
            )}
          </div>
        )}
      </div>

      {/* ── Notes ──────────────────────────────────────── */}
      <div className="schedule__section-card">
        <label className="schedule__label" htmlFor="sc-notes">Notas (opcional)</label>
        <textarea
          id="sc-notes"
          value={notes}
          onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
          rows={3}
          placeholder="Notas internas sobre esta programación..."
          className="schedule__textarea"
        />
      </div>

      {/* ── Innovation 9: Schedule Intelligence Summary ── */}
      {allFieldsFilled && (
        <div
          className="schedule__summary"
          data-level={summaryWarnings.length === 0 ? "ready" : summaryWarnings.length <= 1 ? "caution" : "warning"}
        >
          <div className="schedule__summary-header">
            <Target size={14} />
            <span>Resumen de inteligencia</span>
          </div>
          <div className="schedule__summary-items">
            <span>Tiempo: {timeScore?.score ?? 0}%</span>
            <span>Canal: {channelFit ?? 0}%</span>
            <span>Destinatarios: {recipientCount}</span>
          </div>
          {summaryWarnings.length > 0 && (
            <div className="schedule__summary-warnings">
              {summaryWarnings.map((w: string, i: number) => (
                <span key={i}>
                  <AlertTriangle size={10} /> {w}
                </span>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Actions ───────────────────────────────────── */}
      <div className="schedule__actions">
        <button className="schedule__reset-btn" onClick={resetForm}>
          Limpiar
        </button>
        <button
          className="schedule__submit-btn"
          onClick={handleSubmit}
          disabled={scheduleMut.isPending}
        >
          <CalendarClock size={14} />
          <span>{scheduleMut.isPending ? "Programando…" : "Programar Notificación"}</span>
        </button>
      </div>

      {/* ── HITL Notice ───────────────────────────────── */}
      {recipientCount > 100 && (
        <div className="schedule__hitl-notice">
          <AlertTriangle size={16} />
          <span>
            Con {recipientCount} destinatarios, esta notificación requiere aprobación del administrador.
          </span>
        </div>
      )}
    </div>
  );
}