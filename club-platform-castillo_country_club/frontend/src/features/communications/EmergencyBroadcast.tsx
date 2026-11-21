// src/features/communications/EmergencyBroadcast.tsx
// ═══════════════════════════════════════════════════════════
// EmergencyBroadcast V2 — El Protocolo de Emergencia
// Namespace: glass-comm-emergency
//
// V2 Intelligence:
//   - Emergency templates (1-click pre-built alerts)
//   - Urgency gauge SVG (semicircle, real-time per type)
//   - Reach ring SVG (delivery estimation per channel)
//   - Response time indicators (per channel)
//   - Channel effectiveness bars (from analytics)
//   - Escalation ladder SVG (approval chain visualization)
//   - ALL_MEMBERS prominent banner
//
// Eliminated: framer-motion, shared UI (Card/CardHeader/Button),
//   PageContainer, cn, useReducedMotion, default export
// ═══════════════════════════════════════════════════════════

import { useState, useMemo } from "react";
import type { CSSProperties } from "react";
import {
  AlertTriangle, Shield, Send, MessageSquare, Smartphone,
  Mail, Phone, CheckCircle2, Clock, Zap, UserCheck,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMCPMutation, useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { showToast } from "@/shared/components/ui";
import type { HITLResponse } from "./types";
import "./EmergencyBroadcast.css";
import { Button } from "@/shared/components/ui/Button";

/* ══════════════════════════════════════════════════════════
   Backend Types (for analytics query)
   ══════════════════════════════════════════════════════════ */

interface ChannelBreakdown {
  channel: string;
  count: number;
  percentage: number;
}

interface CommunicationAnalytics {
  total_sent: number;
  delivery_rate_pct: number;
  channel_breakdown: ChannelBreakdown[];
}

interface AnalyticsResponse {
  analytics: CommunicationAnalytics;
}

/* ══════════════════════════════════════════════════════════
   Config Maps
   ══════════════════════════════════════════════════════════ */

const EMERGENCY_TYPE_CFG: Record<
  string,
  { label: string; description: string; icon: LucideIcon }
> = {
  evacuation: { label: "Evacuación", description: "Evacuación inmediata del predio", icon: AlertTriangle },
  security: { label: "Seguridad", description: "Amenaza a la seguridad del club", icon: Shield },
  health: { label: "Salud", description: "Emergencia médica o sanitaria", icon: AlertTriangle },
  weather: { label: "Clima", description: "Condiciones climáticas peligrosas", icon: AlertTriangle },
  infrastructure: { label: "Infraestructura", description: "Fallo en servicios o instalaciones", icon: AlertTriangle },
};

const CHANNEL_OPTS: Array<{
  value: string;
  label: string;
  icon: LucideIcon;
  recommended: boolean;
  responseTime: string;
}> = [
  { value: "push", label: "Push", icon: Smartphone, recommended: true, responseTime: "<1 min" },
  { value: "sms", label: "SMS", icon: MessageSquare, recommended: true, responseTime: "<2 min" },
  { value: "whatsapp", label: "WhatsApp", icon: Phone, recommended: true, responseTime: "<5 min" },
  { value: "email", label: "Email", icon: Mail, recommended: false, responseTime: "~15 min" },
];

const URGENCY_MAP: Record<string, { pct: number; level: "critical" | "high" | "medium"; label: string }> = {
  evacuation: { pct: 100, level: "critical", label: "Crítica" },
  security: { pct: 85, level: "critical", label: "Crítica" },
  health: { pct: 75, level: "high", label: "Alta" },
  weather: { pct: 65, level: "high", label: "Alta" },
  infrastructure: { pct: 45, level: "medium", label: "Media" },
};

interface EmergencyTemplate {
  id: string;
  label: string;
  icon: LucideIcon;
  type: string;
  title: string;
  body: string;
  channels: string[];
}

const EMERGENCY_TEMPLATES: EmergencyTemplate[] = [
  {
    id: "evac_storm",
    label: "Evacuación tormenta",
    icon: AlertTriangle,
    type: "evacuation",
    title: "Evacuación inmediata — Tormenta eléctrica",
    body: "Protocolo de evacuación activado por tormenta eléctrica. Diríjanse a la salida más cercana. No usen elevadores. El personal los guiará a las áreas seguras designadas.",
    channels: ["push", "sms", "whatsapp"],
  },
  {
    id: "power_outage",
    label: "Corte de energía",
    icon: Zap,
    type: "infrastructure",
    title: "Corte de energía en instalaciones",
    body: "Se ha detectado un corte de energía que afecta las instalaciones. Estamos trabajando en la restauración. Eviten áreas con poca iluminación.",
    channels: ["push", "sms"],
  },
  {
    id: "medical",
    label: "Emergencia médica",
    icon: AlertTriangle,
    type: "health",
    title: "Protocolo de emergencia médica activado",
    body: "Se ha activado el protocolo de emergencia médica. Si necesitan asistencia, contacten al personal de salud del club inmediatamente.",
    channels: ["push", "sms", "whatsapp"],
  },
  {
    id: "security_threat",
    label: "Amenaza seguridad",
    icon: Shield,
    type: "security",
    title: "Alerta de seguridad — Permanezcan en áreas seguras",
    body: "Se ha detectado una amenaza a la seguridad. Permanezcan en el área donde se encuentran hasta nuevo aviso. No intenten salir por cuenta propia.",
    channels: ["push", "sms", "whatsapp"],
  },
  {
    id: "weather_alert",
    label: "Alerta climática",
    icon: AlertTriangle,
    type: "weather",
    title: "Condiciones climáticas adversas — Precaución",
    body: "Se pronostican condiciones climáticas adversas. Recomendamos permanecer en áreas interiores. Las actividades al aire libre quedan suspendidas.",
    channels: ["push", "whatsapp"],
  },
];

const GAUGE_SEMICIRCLE = Math.PI * 80; // ~251.33
const RING_C = 2 * Math.PI * 28; // ~175.93

/* ══════════════════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════════════════ */

function gaugeOffset(pct: number): number {
  return GAUGE_SEMICIRCLE * (1 - Math.min(100, Math.max(0, pct)) / 100);
}

function ringOffset(pct: number): number {
  return RING_C * (1 - Math.min(100, Math.max(0, pct)) / 100);
}

function estimateReach(channels: string[], analytics: CommunicationAnalytics | null): number {
  if (analytics === null || analytics.total_sent === 0) return 100;
  const chPct = channels.reduce((s, ch) => {
    const found = analytics.channel_breakdown.find((c) => c.channel === ch);
    return s + (found?.percentage ?? 0);
  }, 0);
  return Math.round(Math.min(100, Math.max(85, chPct * 1.2)) * (analytics.delivery_rate_pct / 100));
}

function charLevel(count: number, max: number): "ok" | "warn" | "danger" {
  if (count > max) return "danger";
  if (count > max * 0.8) return "warn";
  return "ok";
}

/* ══════════════════════════════════════════════════════════
   Main Component
   ══════════════════════════════════════════════════════════ */

export function EmergencyBroadcast() {
  /* ── State ── */
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [emergencyType, setEmergencyType] = useState<string>("security");
  const [title, setTitle] = useState<string>("");
  const [body, setBody] = useState<string>("");
  const [channels, setChannels] = useState<string[]>(["push", "sms", "whatsapp"]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [hitlResponse, setHitlResponse] = useState<HITLResponse | null>(null);

  /* ── Analytics query (non-blocking, for effectiveness + reach) ── */
  const analyticsQ = useMCPQuery<AnalyticsResponse>(
    "communication",
    "get_communication_analytics",
    { period: "current_month" },
    { staleTime: 300_000 },
  );

  const analytics = analyticsQ.data?.analytics ?? null;

  /* ── Mutation ── */
  const sendMut = useMCPMutation<HITLResponse>(
    "communication",
    "manage_emergency_broadcast",
    {
      onSuccess: (data: HITLResponse) => {
        setHitlResponse(data);
        setStep(3);
        if (data.status === "pending_approval") {
          showToast({ type: "success", message: data.message ?? "Enviado a doble confirmación" });
        }
      },
      onError: (err: unknown) =>
        showToast({ type: "error", message: err instanceof Error ? err.message : "Error al enviar alerta" }),
    },
  );

  /* ── Derived ── */
  const urgency = URGENCY_MAP[emergencyType] ?? URGENCY_MAP.security;
  const typeCfg = EMERGENCY_TYPE_CFG[emergencyType] ?? EMERGENCY_TYPE_CFG.security;
  const TypeIcon = typeCfg.icon;

  const channelEff = useMemo<Record<string, number>>(() => {
    if (analytics === null) return {};
    const r: Record<string, number> = {};
    analytics.channel_breakdown.forEach((c) => { r[c.channel] = c.percentage; });
    return r;
  }, [analytics]);

  const reachPct = useMemo(() => estimateReach(channels, analytics), [channels, analytics]);

  /* ── Helpers ── */
  function toggleChannel(ch: string) {
    setChannels((prev) => {
      if (prev.includes(ch)) {
        if (prev.length <= 1) return prev;
        return prev.filter((c) => c !== ch);
      }
      return [...prev, ch];
    });
  }

  function applyTemplate(tmpl: EmergencyTemplate) {
    setEmergencyType(tmpl.type);
    setTitle(tmpl.title);
    setBody(tmpl.body);
    setChannels([...tmpl.channels]);
    setErrors({});
  }

  function validate(): boolean {
    const e: Record<string, string> = {};
    if (!title.trim()) e.title = "Título requerido";
    if (title.length > 100) e.title = "Máximo 100 caracteres";
    if (!body.trim()) e.body = "Mensaje requerido";
    if (body.length > 500) e.body = "Máximo 500 caracteres";
    if (channels.length === 0) e.channels = "Seleccioná al menos un canal";
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleReview() {
    if (!validate()) return;
    setStep(2);
  }

  function handleSend() {
    sendMut.mutate({
      title,
      body,
      emergency_type: emergencyType,
      channels: channels.join(","),
    });
  }

  function resetAll() {
    setEmergencyType("security");
    setTitle("");
    setBody("");
    setChannels(["push", "sms", "whatsapp"]);
    setErrors({});
    setStep(1);
    setHitlResponse(null);
  }

  /* ══════════════════════════════════════════════════════════
     Render
     ══════════════════════════════════════════════════════════ */

  return (
    <div className="glass-comm-emergency">
      <div className="glass-comm-emergency__container">
        {/* ── Header ── */}
        <header>
          <h1 className="glass-comm-emergency__header-title">Transmisión de Emergencia</h1>
          <p className="glass-comm-emergency__header-subtitle">
            Protocolo ALWAYS_HUMAN — Requiere doble confirmación
          </p>
        </header>

        {/* ── Protocol Banner ── */}
        <div className="glass-comm-emergency__protocol">
          <Shield size={20} className="glass-comm-emergency__protocol-icon" />
          <div>
            <p className="glass-comm-emergency__protocol-title">Protocolo ALWAYS_HUMAN activo</p>
            <p className="glass-comm-emergency__protocol-desc">
              Las alertas de emergencia nunca se envían automáticamente. Dos administradores deben confirmar antes de llegar a los socios.
            </p>
          </div>
        </div>

        {/* ══════════════════════════════════════════════════
           Step 3: Success
           ══════════════════════════════════════════════════ */}
        {step === 3 && hitlResponse !== null ? (
          <div className="glass-comm-emergency__success-section">
            <div className="glass-comm-emergency__success-icon-wrap">
              <Clock size={40} />
            </div>
            <h2 className="glass-comm-emergency__success-title">Pendiente de Doble Confirmación</h2>
            <p className="glass-comm-emergency__success-desc">{hitlResponse.message}</p>

            {hitlResponse.request_id !== undefined && hitlResponse.request_id !== "" && (
              <div className="glass-comm-emergency__request-id">
                <p className="glass-comm-emergency__request-id-label">ID de solicitud</p>
                <p className="glass-comm-emergency__request-id-value">{hitlResponse.request_id}</p>
              </div>
            )}

            {/* Escalation Ladder */}
            <div className="glass-comm-emergency__ladder">
              {[
                { label: "Solicitud enviada", icon: Send, active: true, done: false, i: 0 },
                { label: "Esperando Admin 1", icon: UserCheck, active: false, done: false, i: 1 },
                { label: "Esperando Admin 2", icon: UserCheck, active: false, done: false, i: 2 },
                { label: "Alerta enviada", icon: CheckCircle2, active: false, done: false, i: 3 },
              ].map((node, idx) => {
                const NodeIcon = node.icon;
                return (
                  <div key={node.label}>
                    {idx > 0 && (
                      <div
                        className="glass-comm-emergency__ladder-line"
                        style={{ "--stagger-i": idx - 1 } as CSSProperties}
                      />
                    )}
                    <div
                      className="glass-comm-emergency__ladder-node"
                      data-active={node.active ? "true" : undefined}
                      data-done={node.done ? "true" : undefined}
                      style={{ "--stagger-i": idx } as CSSProperties}
                    >
                      <div className="glass-comm-emergency__ladder-dot">
                        <NodeIcon size={16} />
                      </div>
                      <span className="glass-comm-emergency__ladder-label">{node.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Protocol note */}
            <div className="glass-comm-emergency__protocol-note">
              <p className="glass-comm-emergency__protocol-note-title">
                <Shield size={16} /> ALWAYS_HUMAN
              </p>
              <p className="glass-comm-emergency__protocol-note-desc">
                Dos administradores deben confirmar esta alerta antes de que se envíe a los socios. La solicitud aparece en la Cola de Aprobaciones.
              </p>
            </div>

            <Button
              variant="unstyled"
              className="glass-comm-emergency__btn glass-comm-emergency__btn--primary"
              onClick={resetAll}
            >
              <AlertTriangle size={16} /> Nueva Transmisión
            </Button>
          </div>
        ) : step === 1 ? (
          /* ══════════════════════════════════════════════════
             Step 1: Compose
             ══════════════════════════════════════════════════ */
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {/* Template Strip */}
            <div className="glass-comm-emergency__template-strip">
              {EMERGENCY_TEMPLATES.map((tmpl) => {
                const TmplIcon = tmpl.icon;
                return (
                  <Button
                    variant="unstyled"
                    key={tmpl.id}
                    type="button"
                    className="glass-comm-emergency__template-btn"
                    onClick={() => applyTemplate(tmpl)}
                  >
                    <TmplIcon size={14} />
                    {tmpl.label}
                  </Button>
                );
              })}
            </div>

            {/* Type + Urgency Row */}
            <div className="glass-comm-emergency__type-gauge-row">
              {/* Type Grid */}
              <div>
                <p className="glass-comm-emergency__label" style={{ marginBottom: "0.5rem" }}>
                  Tipo de Emergencia
                </p>
                <div className="glass-comm-emergency__type-grid">
                  {Object.entries(EMERGENCY_TYPE_CFG).map(([key, cfg]) => {
                    const Icon = cfg.icon;
                    const selected = emergencyType === key;
                    return (
                      <Button
                        variant="unstyled"
                        key={key}
                        type="button"
                        className="glass-comm-emergency__type-card"
                        data-selected={selected}
                        data-type={key}
                        onClick={() => setEmergencyType(key)}
                        aria-pressed={selected}
                      >
                        <div className="glass-comm-emergency__type-card-inner">
                          <Icon size={20} className="glass-comm-emergency__type-icon" />
                          <div>
                            <p className="glass-comm-emergency__type-label">{cfg.label}</p>
                            <p className="glass-comm-emergency__type-desc">{cfg.description}</p>
                          </div>
                        </div>
                      </Button>
                    );
                  })}
                </div>
              </div>

              {/* Urgency Gauge */}
              <div className="glass-comm-emergency__gauge-panel">
                <svg
                  className="glass-comm-emergency__gauge-svg"
                  viewBox="0 0 200 120"
                  role="img"
                  aria-label={`Nivel de urgencia: ${urgency.label} (${urgency.pct}%)`}
                >
                  <path
                    d="M 20 100 A 80 80 0 0 1 180 100"
                    className="glass-comm-emergency__gauge-track"
                  />
                  <path
                    d="M 20 100 A 80 80 0 0 1 180 100"
                    className="glass-comm-emergency__gauge-fill"
                    data-urgency={urgency.level}
                    strokeDashoffset={gaugeOffset(urgency.pct)}
                  />
                  <text className="glass-comm-emergency__gauge-text" x="100" y="85">
                    {urgency.pct}%
                  </text>
                </svg>
                <span className="glass-comm-emergency__gauge-label">Nivel de urgencia</span>
                <span
                  className="glass-comm-emergency__gauge-urgency"
                  data-urgency={urgency.level}
                >
                  {urgency.label}
                </span>
              </div>
            </div>

            {/* Form Section */}
            <div className="glass-comm-emergency__form-section">
              {/* Title */}
              <div className="glass-comm-emergency__form-group">
                <label className="glass-comm-emergency__label">Título de la alerta *</label>
                <input
                  type="text"
                  className="glass-comm-emergency__input"
                  data-invalid={!!errors.title}
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setErrors((p) => { const n = { ...p }; delete n.title; return n; });
                  }}
                  placeholder="Ej: Evacuación de piscina por tormenta"
                  maxLength={100}
                  aria-label="Título de la alerta de emergencia"
                />
                {errors.title && <p className="glass-comm-emergency__input-error">{errors.title}</p>}
              </div>

              {/* Body */}
              <div className="glass-comm-emergency__form-group">
                <div className="glass-comm-emergency__form-label-row">
                  <label className="glass-comm-emergency__label">Instrucciones *</label>
                  <span
                    className="glass-comm-emergency__char-count"
                    data-level={charLevel(body.length, 500)}
                  >
                    {body.length}/500
                  </span>
                </div>
                <textarea
                  className="glass-comm-emergency__textarea"
                  data-invalid={!!errors.body}
                  value={body}
                  onChange={(e) => {
                    setBody(e.target.value);
                    setErrors((p) => { const n = { ...p }; delete n.body; return n; });
                  }}
                  rows={5}
                  maxLength={500}
                  placeholder="Instrucciones claras y directas para los socios. Ej: Diríjanse a la salida más cercana."
                  aria-label="Instrucciones de emergencia"
                />
                {errors.body && <p className="glass-comm-emergency__input-error">{errors.body}</p>}
              </div>

              {/* Channels */}
              <div className="glass-comm-emergency__form-group">
                <div className="glass-comm-emergency__form-label-row">
                  <label className="glass-comm-emergency__label">Canales de Distribución</label>
                  <Button
                    variant="unstyled"
                    type="button"
                    className="glass-comm-emergency__btn glass-comm-emergency__btn--ghost"
                    style={{ minHeight: "32px", padding: "0.25rem 0.625rem", fontSize: "0.75rem" }}
                    onClick={() => setChannels(["push", "sms", "whatsapp"])}
                  >
                    Recomendados
                  </Button>
                </div>
                <div className="glass-comm-emergency__channel-grid">
                  {CHANNEL_OPTS.map((opt) => {
                    const selected = channels.includes(opt.value);
                    const Icon = opt.icon;
                    const eff = channelEff[opt.value] ?? 0;
                    return (
                      <Button
                        variant="unstyled"
                        key={opt.value}
                        type="button"
                        className="glass-comm-emergency__channel-card"
                        data-channel={opt.value}
                        data-selected={selected}
                        onClick={() => toggleChannel(opt.value)}
                        aria-pressed={selected}
                      >
                        {opt.recommended && (
                          <span className="glass-comm-emergency__ch-recommended">Recomendado</span>
                        )}
                        <Icon size={20} className="glass-comm-emergency__ch-icon" />
                        <span className="glass-comm-emergency__ch-name">{opt.label}</span>
                        <span className="glass-comm-emergency__ch-time">{opt.responseTime}</span>
                        {eff > 0 && (
                          <div className="glass-comm-emergency__ch-eff">
                            <div className="glass-comm-emergency__ch-eff-fill" style={{ width: `${eff}%` }} />
                          </div>
                        )}
                      </Button>
                    );
                  })}
                </div>
                {errors.channels && <p className="glass-comm-emergency__input-error">{errors.channels}</p>}
                <p style={{ fontFamily: "var(--font-ui)", fontSize: "0.6875rem", color: "var(--gce-dim)", marginTop: "0.375rem" }}>
                  Para emergencias se recomienda: Push + SMS + WhatsApp (máxima cobertura inmediata)
                </p>
              </div>
            </div>

            {/* Reach + Members Row */}
            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <div className="glass-comm-emergency__reach-row" style={{ flex: 1, minWidth: "200px" }}>
                <svg className="glass-comm-emergency__reach-svg" viewBox="0 0 80 80" role="img" aria-label={`Alcance estimado: ${reachPct}%`}>
                  <circle className="glass-comm-emergency__reach-track" cx="40" cy="40" r="28" />
                  <circle
                    className="glass-comm-emergency__reach-fill"
                    cx="40" cy="40" r="28"
                    strokeDashoffset={ringOffset(reachPct)}
                  />
                  <text className="glass-comm-emergency__reach-text" x="40" y="40">{reachPct}%</text>
                </svg>
                <div className="glass-comm-emergency__reach-info">
                  <span className="glass-comm-emergency__reach-label">Alcance estimado</span>
                  <span className="glass-comm-emergency__reach-detail">{reachPct}% de la membresía</span>
                </div>
              </div>

              <div className="glass-comm-emergency__members-banner" style={{ flex: 1, minWidth: "200px" }}>
                <div className="glass-comm-emergency__members-icon-wrap">
                  <Shield size={20} />
                </div>
                <div>
                  <p className="glass-comm-emergency__members-title">Destinatarios: 100% de la membresía</p>
                  <p className="glass-comm-emergency__members-desc">
                    Las alertas de emergencia se envían a todos los socios. No es posible seleccionar un subconjunto.
                  </p>
                </div>
              </div>
            </div>

            {/* Submit */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
              <Button
                variant="unstyled"
                className="glass-comm-emergency__btn glass-comm-emergency__btn--rose glass-comm-emergency__btn--wide"
                onClick={handleReview}
              >
                <AlertTriangle size={16} /> Revisar y Enviar
              </Button>
              <p className="glass-comm-emergency__submit-hint">
                Requiere doble confirmación de administradores
              </p>
            </div>
          </div>
        ) : (
          /* ══════════════════════════════════════════════════
             Step 2: Confirm
             ══════════════════════════════════════════════════ */
          <div className="glass-comm-emergency__confirm-section">
            <h2 className="glass-comm-emergency__confirm-heading">
              Confirmar Transmisión de Emergencia
            </h2>

            {/* Preview */}
            <div className="glass-comm-emergency__preview" data-type={emergencyType}>
              <div className="glass-comm-emergency__preview-type-badge">
                <TypeIcon size={14} />
                {typeCfg.label}
              </div>
              <h4 className="glass-comm-emergency__preview-title">{title}</h4>
              <p className="glass-comm-emergency__preview-body">{body}</p>
            </div>

            {/* Summary */}
            <div className="glass-comm-emergency__summary-grid">
              <div className="glass-comm-emergency__summary-cell">
                <p className="glass-comm-emergency__summary-label">Canales</p>
                <div className="glass-comm-emergency__summary-channels">
                  {channels.map((ch) => {
                    const cfg = CHANNEL_OPTS.find((c) => c.value === ch);
                    return (
                      <span key={ch} className="glass-comm-emergency__badge" data-channel={ch}>
                        {cfg?.label ?? ch}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="glass-comm-emergency__summary-cell">
                <p className="glass-comm-emergency__summary-label">Destinatarios</p>
                <p className="glass-comm-emergency__summary-value">Todos los socios</p>
              </div>
              <div className="glass-comm-emergency__summary-cell">
                <p className="glass-comm-emergency__summary-label">Confirmación</p>
                <p className="glass-comm-emergency__summary-value" style={{ color: "var(--gce-amber)" }}>
                  Doble requerida
                </p>
              </div>
            </div>

            {/* Escalation Preview */}
            <div className="glass-comm-emergency__ladder" style={{ alignItems: "flex-start" }}>
              {[
                { label: "Solicitud enviada", icon: Send, active: false, done: false, i: 0 },
                { label: "Esperando Admin 1", icon: UserCheck, active: false, done: false, i: 1 },
                { label: "Esperando Admin 2", icon: UserCheck, active: false, done: false, i: 2 },
                { label: "Alerta enviada", icon: CheckCircle2, active: false, done: false, i: 3 },
              ].map((node, idx) => {
                const NodeIcon = node.icon;
                return (
                  <div key={node.label}>
                    {idx > 0 && (
                      <div
                        className="glass-comm-emergency__ladder-line"
                        style={{ "--stagger-i": idx - 1 } as CSSProperties}
                      />
                    )}
                    <div
                      className="glass-comm-emergency__ladder-node"
                      style={{ "--stagger-i": idx } as CSSProperties}
                    >
                      <div className="glass-comm-emergency__ladder-dot">
                        <NodeIcon size={16} />
                      </div>
                      <span className="glass-comm-emergency__ladder-label">{node.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Warning */}
            <div className="glass-comm-emergency__warning">
              <AlertTriangle size={16} className="glass-comm-emergency__warning-icon" />
              <p className="glass-comm-emergency__warning-text">
                Esta alerta será enviada a TODOS los socios del club por {channels.length} canal(es).
                Se requiere que otro administrador confirme antes del envío. La solicitud quedará pendiente en la Cola de Aprobaciones.
              </p>
            </div>

            {/* Actions */}
            <div className="glass-comm-emergency__actions">
              <Button
                variant="unstyled"
                className="glass-comm-emergency__btn glass-comm-emergency__btn--ghost"
                onClick={() => setStep(1)}
              >
                Volver y Editar
              </Button>
              <Button
                variant="unstyled"
                className="glass-comm-emergency__btn glass-comm-emergency__btn--rose"
                onClick={handleSend}
                disabled={sendMut.isPending}
              >
                <Send size={16} /> {sendMut.isPending ? "Enviando…" : "Enviar a Doble Confirmación"}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}