// src/features/communications/CommunicationCenter.tsx
// ═══════════════════════════════════════════════════════════
// CommunicationCenter V2 — El Centro de Mando
// Namespace: glass-comm-center
//
// V2 Intelligence: Command Status Strip, Temporal Advisor,
//   Fatigue Guard, Channel Optimizer, Reach Predictor,
//   Cascade Risk, Audience Gap Detection
//
// Eliminated: framer-motion, recharts, shared UI (Card/Button/Skeleton/Modal/Badge),
//   CHART_PALETTE, cn, useBreakpoint, useReducedMotion, DetailTabs, SectionError,
//   StaleDataBanner, useDataFreshness, PageContainer
// ═══════════════════════════════════════════════════════════

import { useState, useMemo, useEffect, useCallback } from "react";
import type { CSSProperties, ReactNode } from "react";
import {
  Send, FileText, Search, Plus, Clock, RefreshCw, X,
  History, MessageSquare, AlertTriangle, ShieldAlert,
  Calendar, Bell, Mail, Smartphone, Phone, Trash2,
  Package, ChevronRight, Sparkles, CheckCircle2,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMCPQuery, useMCPMutation } from "@/shared/hooks/useMCPQuery";
import { timeAgo } from "@/shared/lib/utils";
import { showToast } from "@/shared/components/ui";
import { useCommunicationIntelligence } from "./hooks/useCommunicationIntelligence";
import type {
  HITLResponse,
  CommunicationTemplate as TemplateItem
} from "./types";
import { formatCommunicationDate } from "./types";
import "./CommunicationCenter.css";

/* ══════════════════════════════════════════════════════════
   Config Maps
   ══════════════════════════════════════════════════════════ */

const CHANNEL_CONFIG: Record<string, { label: string; icon: LucideIcon }> = {
  email: { label: "Email", icon: Mail },
  push: { label: "Push", icon: Bell },
  sms: { label: "SMS", icon: Smartphone },
  whatsapp: { label: "WhatsApp", icon: Phone },
  in_app: { label: "In-App", icon: MessageSquare },
};

const TYPE_CFG: Record<string, { label: string }> = {
  general: { label: "General" }, event: { label: "Evento" },
  maintenance: { label: "Mantenimiento" }, promotion: { label: "Promoción" },
  policy: { label: "Política" }, seasonal: { label: "Temporada" },
};

const EMERGENCY_CFG: Record<string, { label: string }> = {
  weather: { label: "Clima" }, security: { label: "Seguridad" },
  health: { label: "Salud" }, infrastructure: { label: "Infraestructura" },
  evacuation: { label: "Evacuación" },
};

const TEMPLATE_CAT_CFG: Record<string, { label: string }> = {
  welcome: { label: "Bienvenida" }, event_reminder: { label: "Recordatorio evento" },
  payment_reminder: { label: "Recordatorio pago" }, birthday: { label: "Cumpleaños" },
  anniversary: { label: "Aniversario" }, seasonal_greeting: { label: "Saludo temporada" },
  maintenance_notice: { label: "Aviso mantenimiento" }, promotion: { label: "Promoción" },
};

const STATUS_CFG: Record<string, { label: string }> = {
  pending: { label: "Pendiente" }, queued: { label: "En cola" },
  sent: { label: "Enviado" }, delivered: { label: "Entregado" },
  failed: { label: "Fallido" }, cancelled: { label: "Cancelado" },
  draft: { label: "Borrador" }, scheduled: { label: "Programado" },
};

const PRIORITY_OPTS = [
  { value: 1, label: "Normal" },
  { value: 2, label: "Importante" },
  { value: 3, label: "Urgente" },
] as const;

const AI_TOPICS = [
  { value: "event_invitation", label: "Invitación a evento" },
  { value: "activity_reminder", label: "Recordatorio" },
  { value: "loyalty_reward", label: "Recompensa" },
  { value: "membership_renewal", label: "Renovación" },
] as const;

const AI_TONES = [
  { value: "friendly", label: "Amigable" },
  { value: "formal", label: "Formal" },
  { value: "urgent", label: "Urgente" },
] as const;

const RING_R = 27;
const RING_C = 2 * Math.PI * RING_R;

/* ══════════════════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════════════════ */

function ringOffset(pct: number): number {
  return RING_C * (1 - Math.min(100, Math.max(0, pct)) / 100);
}

function healthLabel(rate: number): "strong" | "good" | "fair" | "poor" {
  if (rate >= 90) return "strong";
  if (rate >= 70) return "good";
  if (rate >= 50) return "fair";
  return "poor";
}

function buildChannelBarPaths<T extends { name: string; count: number; channel: string }>(data: Array<T>): Array<T & { barW: number }> {
  const max = Math.max(...data.map((d) => d.count), 1);
  return data.map((d) => ({ ...d, barW: (d.count / max) * 400 }));
}

/* ══════════════════════════════════════════════════════════
   GlassModal
   ══════════════════════════════════════════════════════════ */

function GlassModal({
  isOpen,
  onClose,
  title,
  children,
  wide = false,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  const handleEscape = useCallback(
    (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); },
    [onClose],
  );

  useEffect(() => {
    if (!isOpen) return;
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleEscape]);

  if (!isOpen) return null;

  return (
    <div
      className="glass-comm-center__modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div
        className={`glass-comm-center__modal-content${wide ? " glass-comm-center__modal-content--wide" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="glass-comm-center__modal-header">
          <h3 className="glass-comm-center__modal-title">{title}</h3>
          <button className="glass-comm-center__modal-close" onClick={onClose} aria-label="Cerrar">
            <X size={20} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   CommandStatusStrip
   ══════════════════════════════════════════════════════════ */

function CommandStatusStrip({
  status,
}: {
  status: {
    totalSent: number;
    successRate: number;
    activeChannels: number;
    fatigueScore: number;
    fatigueLevel: "fresh" | "normal" | "elevated" | "saturated" | "overloaded";
    pendingScheduled: number;
    nextScheduledAt: string | null;
  };
}) {
  const health = healthLabel(status.successRate);
  const fatiguePct = status.fatigueScore;

  return (
    <div className="glass-comm-center__status-strip">
      {/* Health Ring */}
      <div className="glass-comm-center__status-card" style={{ "--stagger-i": 0 } as CSSProperties}>
        <svg className="glass-comm-center__ring-svg" viewBox="0 0 80 80" role="img" aria-label={`Tasa de éxito: ${Math.round(status.successRate)}%`}>
          <circle className="glass-comm-center__ring-track" cx="40" cy="40" r={RING_R} />
          <circle
            className="glass-comm-center__ring-fill"
            data-health={health}
            cx="40" cy="40" r={RING_R}
            style={{ "--ring-offset": ringOffset(status.successRate) } as CSSProperties}
          />
          <text className="glass-comm-center__ring-text" x="40" y="40">
            {Math.round(status.successRate)}%
          </text>
        </svg>
        <div className="glass-comm-center__stat-info">
          <span className="glass-comm-center__stat-label">Salud comunicaciones</span>
          <span className="glass-comm-center__stat-value">{status.totalSent} enviados</span>
          <span className="glass-comm-center__stat-sub">{status.activeChannels} canales activos</span>
        </div>
      </div>

      {/* Fatigue Gauge */}
      <div className="glass-comm-center__status-card" style={{ "--stagger-i": 1 } as CSSProperties}>
        <div className="glass-comm-center__fatigue-gauge">
          <div className="glass-comm-center__fatigue-header">
            <span className="glass-comm-center__stat-label">Fatiga de audiencia</span>
            <span className="glass-comm-center__stat-sub">{fatiguePct}%</span>
          </div>
          <div className="glass-comm-center__fatigue-track">
            <div
              className="glass-comm-center__fatigue-fill"
              data-level={status.fatigueLevel}
              style={{ width: `${fatiguePct}%`, "--fatigue-pct": `${fatiguePct}%` } as CSSProperties}
            />
          </div>
          <span className="glass-comm-center__stat-sub" style={{ textTransform: "capitalize" }}>
            {status.fatigueLevel === "fresh" ? "Sin carga" : status.fatigueLevel === "normal" ? "Saludable" : status.fatigueLevel === "elevated" ? "Elevada" : status.fatigueLevel === "saturated" ? "Saturada" : "Sobrecarga"}
          </span>
        </div>
      </div>

      {/* Pending Scheduled */}
      <div className="glass-comm-center__status-card" style={{ "--stagger-i": 2 } as CSSProperties}>
        <div className="glass-comm-center__pending-info">
          <span className="glass-comm-center__stat-label">Programados</span>
          <span className="glass-comm-center__pending-count">{status.pendingScheduled}</span>
          <span className="glass-comm-center__pending-next">
            {status.nextScheduledAt
              ? `Próximo: ${new Date(status.nextScheduledAt).toLocaleDateString("es-CR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`
              : "Sin programados"}
          </span>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ComunicarPanel
   ══════════════════════════════════════════════════════════ */

function ComunicarPanel({
  intel,
  onOpenEmergency,
  onOpenPersonalized,
  onOpenBoardPackage,
  onOpenAICompose,
  onOpenTemplatePicker,
  selectedTemplate,
  clearTemplate,
}: {
  intel: ReturnType<typeof useCommunicationIntelligence>;
  onOpenEmergency: () => void;
  onOpenPersonalized: () => void;
  onOpenBoardPackage: () => void;
  onOpenAICompose: () => void;
  onOpenTemplatePicker: () => void;
  selectedTemplate: TemplateItem | null;
  clearTemplate: () => void;
}) {
  const { temporalAdvice, fatigueWarning, cascadeRisk, channelEffectiveness, channelRecommendation, getReachEstimate } = intel;

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [announcementType, setAnnouncementType] = useState("general");
  const [channels, setChannels] = useState<string[]>(["email"]);
  const [targetAudience, setTargetAudience] = useState("all");
  const [priority, setPriority] = useState<number>(1);
  const [requiresAck, setRequiresAck] = useState(false);
  const [scheduledAt, setScheduledAt] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  /* Apply selected template */
  if (selectedTemplate !== null) {
    if (title === "" && body === "") {
      setTitle(selectedTemplate.subject);
      setBody(selectedTemplate.body_template);
      if (selectedTemplate.channels.length > 0) setChannels(selectedTemplate.channels);
      clearTemplate();
    }
  }

  const broadcastMut = useMCPMutation<HITLResponse>("communication", "broadcast_club_announcement", {
    onSuccess: (data: HITLResponse) => {
      showToast({ type: "success", message: data.message ?? (data.status === "pending_approval" ? "Enviado a aprobación" : "Anuncio enviado") });
      resetForm();
    },
    onError: (err: unknown) => showToast({ type: "error", message: err instanceof Error ? err.message : "Error al enviar" }),
  });

  function resetForm() { setTitle(""); setBody(""); setAnnouncementType("general"); setChannels(["email"]); setTargetAudience("all"); setPriority(1); setRequiresAck(false); setScheduledAt(""); setFormErrors({}); }
  function toggleChannel(ch: string) { setChannels((p) => p.includes(ch) ? p.filter((c) => c !== ch) : [...p, ch]); }
  function validate(): boolean { const e: Record<string, string> = {}; if (!title.trim()) e.title = "Título requerido"; if (!body.trim()) e.body = "Contenido requerido"; if (channels.length === 0) e.channels = "Seleccioná al menos un canal"; setFormErrors(e); return Object.keys(e).length === 0; }
  function handleSubmit() { if (!validate()) return; broadcastMut.mutate({ title, body, announcement_type: announcementType, channels: channels.join(","), target_audience: targetAudience, priority, requires_acknowledgment: requiresAck, scheduled_at: scheduledAt || undefined }); }

  const reachPct = channels.length > 0 ? getReachEstimate(channels) : 0;
  const showFatigue = fatigueWarning.level !== "normal";
  const showCascade = cascadeRisk.risk !== "low";

  return (
    <div className="glass-comm-center__section" style={{ marginTop: "1rem" }}>
      {/* Quick Actions */}
      <div className="glass-comm-center__quick-actions">
        {[
          { label: "Emergencia", sub: "Alerta masiva", icon: ShieldAlert, action: "emergency" as const, onClick: onOpenEmergency },
          { label: "Personalizada", sub: "Destinatarios específicos", icon: Send, action: "personalized" as const, onClick: onOpenPersonalized },
          { label: "Board Package", sub: "Paquete para junta", icon: Package, action: "board" as const, onClick: onOpenBoardPackage },
        ].map((a) => (
          <button key={a.label} className="glass-comm-center__quick-action" onClick={a.onClick}>
            <div className="glass-comm-center__quick-action-icon" data-action={a.action}><a.icon size={20} /></div>
            <div className="glass-comm-center__quick-action-info">
              <p className="glass-comm-center__quick-action-label">{a.label}</p>
              <p className="glass-comm-center__quick-action-sub">{a.sub}</p>
            </div>
            <ChevronRight size={16} className="glass-comm-center__quick-action-arrow" />
          </button>
        ))}
      </div>

      {/* Intelligence Strip */}
      <div className="glass-comm-center__intel-strip">
        <div className="glass-comm-center__intel-card" data-type="temporal" style={{ "--stagger-i": 0 } as CSSProperties}>
          <Clock size={14} className="glass-comm-center__intel-icon" />
          <span className="glass-comm-center__intel-label">Enviar {temporalAdvice.label}</span>
          <span className="glass-comm-center__intel-badge" data-confidence={temporalAdvice.confidence}>
            {temporalAdvice.confidence === "high" ? "Óptimo" : temporalAdvice.confidence === "medium" ? "Bueno" : "Estimado"}
          </span>
        </div>
        {showFatigue && (
          <div className="glass-comm-center__intel-card" data-type="fatigue" data-level={fatigueWarning.level} style={{ "--stagger-i": 1 } as CSSProperties}>
            <AlertTriangle size={14} className="glass-comm-center__intel-icon" />
            <span className="glass-comm-center__intel-label">{fatigueWarning.message}</span>
          </div>
        )}
        {showCascade && (
          <div className="glass-comm-center__intel-card" data-type="cascade" data-risk={cascadeRisk.risk} style={{ "--stagger-i": 2 } as CSSProperties}>
            <AlertTriangle size={14} className="glass-comm-center__intel-icon" />
            <span className="glass-comm-center__intel-label">{cascadeRisk.message}</span>
          </div>
        )}
      </div>

      {/* Compose Form */}
      <div style={{ background: "var(--gcn-surface)", border: "1px solid var(--gcn-border)", borderRadius: "0.75rem", padding: "1.5rem" }}>
        <div className="glass-comm-center__compose-header">
          <div>
            <h3 className="glass-comm-center__compose-title">Nuevo Comunicado</h3>
            <p className="glass-comm-center__compose-subtitle">Requiere aprobación del administrador antes de enviarse</p>
          </div>
          <div className="glass-comm-center__compose-actions">
            <button className="glass-comm-center__btn glass-comm-center__btn--ghost" onClick={onOpenAICompose} style={{ color: "var(--gcn-gold)" }}>
              <Sparkles size={16} /> Generar con AI
            </button>
            <button className="glass-comm-center__btn glass-comm-center__btn--ghost" onClick={onOpenTemplatePicker}>
              <FileText size={16} /> Plantillas
            </button>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {/* Title */}
          <div className="glass-comm-center__form-group">
            <label className="glass-comm-center__label">Título *</label>
            <input type="text" className="glass-comm-center__input" data-invalid={!!formErrors.title} value={title} onChange={(e) => { setTitle(e.target.value); setFormErrors((p) => { const n = { ...p }; delete n.title; return n; }); }} placeholder="Ej: Mantenimiento programado de piscina" />
            {formErrors.title && <p className="glass-comm-center__input-error">{formErrors.title}</p>}
          </div>

          {/* Type + Priority */}
          <div className="glass-comm-center__form-row">
            <div className="glass-comm-center__form-group">
              <label className="glass-comm-center__label">Tipo</label>
              <select className="glass-comm-center__select" value={announcementType} onChange={(e) => setAnnouncementType(e.target.value)}>
                {Object.entries(TYPE_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="glass-comm-center__form-group">
              <label className="glass-comm-center__label">Prioridad</label>
              <div className="glass-comm-center__priority-row">
                {PRIORITY_OPTS.map((p) => (
                  <button key={p.value} type="button" className="glass-comm-center__priority-btn" data-selected={priority === p.value} data-priority={p.value} onClick={() => setPriority(p.value)}>
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Channels */}
          <div className="glass-comm-center__form-group">
            <label className="glass-comm-center__label">Canales de envío *</label>
            <div className="glass-comm-center__channel-grid">
              {Object.entries(CHANNEL_CONFIG).map(([key, cfg]) => {
                const selected = channels.includes(key);
                const Icon = cfg.icon;
                const eff = channelEffectiveness[key] ?? 0;
                return (
                  <button key={key} type="button" className="glass-comm-center__channel-btn" data-channel={key} data-selected={selected} onClick={() => toggleChannel(key)}>
                    <Icon size={16} />
                    <span>{cfg.label}</span>
                    {eff > 0 && (
                      <div className="glass-comm-center__ch-bar">
                        <div className="glass-comm-center__ch-bar-fill" style={{ width: `${eff}%` }} />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
            {formErrors.channels && <p className="glass-comm-center__input-error">{formErrors.channels}</p>}
            {/* Channel recommendation */}
            <div className="glass-comm-center__intel-card" data-type="temporal" style={{ "--stagger-i": 0 } as CSSProperties}>
              <Send size={14} className="glass-comm-center__intel-icon" />
              <span className="glass-comm-center__intel-label">Canal recomendado: {channelRecommendation.label}</span>
            </div>
          </div>

          {/* Reach predictor */}
          {channels.length > 0 && reachPct > 0 && (
            <div className="glass-comm-center__reach">
              <span className="glass-comm-center__reach-label">Alcance estimado</span>
              <div className="glass-comm-center__reach-track">
                <div className="glass-comm-center__reach-fill" data-score={reachPct >= 70 ? "high" : reachPct >= 40 ? "medium" : "low"} style={{ width: `${reachPct}%` } as CSSProperties} />
              </div>
              <span className="glass-comm-center__reach-value">{reachPct}%</span>
            </div>
          )}

          {/* Audience */}
          <div className="glass-comm-center__form-group">
            <label className="glass-comm-center__label">Destinatarios</label>
            <select className="glass-comm-center__select" value={targetAudience} onChange={(e) => setTargetAudience(e.target.value)}>
              <option value="all">Todos los socios</option>
              <option value="tier:platino">Platino</option>
              <option value="tier:oro">Oro</option>
              <option value="tier:plata">Plata</option>
              <option value="tier:bronce">Bronce</option>
            </select>
          </div>

          {/* Schedule + ACK */}
          <div className="glass-comm-center__form-row">
            <div className="glass-comm-center__form-group">
              <label className="glass-comm-center__label">Programar (opcional)</label>
              <input type="datetime-local" className="glass-comm-center__input" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            </div>
            <div className="glass-comm-center__form-group" style={{ justifyContent: "flex-end" }}>
              <label className="glass-comm-center__checkbox-row">
                <input type="checkbox" checked={requiresAck} onChange={(e) => setRequiresAck(e.target.checked)} />
                <span className="glass-comm-center__label">Requiere confirmación de lectura</span>
              </label>
            </div>
          </div>

          {/* Body */}
          <div className="glass-comm-center__form-group">
            <label className="glass-comm-center__label">Contenido *</label>
            <textarea className="glass-comm-center__textarea" data-invalid={!!formErrors.body} value={body} onChange={(e) => { setBody(e.target.value); setFormErrors((p) => { const n = { ...p }; delete n.body; return n; }); }} rows={7} placeholder="Escribí el contenido del comunicado..." />
            {formErrors.body && <p className="glass-comm-center__input-error">{formErrors.body}</p>}
          </div>

          {/* Footer */}
          <div className="glass-comm-center__compose-footer">
            <button className="glass-comm-center__btn" onClick={handleSubmit} disabled={broadcastMut.isPending}>
              <FileText size={16} /> Guardar Borrador
            </button>
            <button className="glass-comm-center__btn glass-comm-center__btn--primary" onClick={handleSubmit} disabled={broadcastMut.isPending}>
              <Send size={16} /> {broadcastMut.isPending ? "Enviando…" : "Enviar a Aprobación"}
            </button>
          </div>

          <div className="glass-comm-center__hitl-notice">
            Los comunicados masivos requieren aprobación del administrador antes de enviarse. Tu solicitud aparecerá en la Cola de Aprobaciones.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   HistorialPanel
   ══════════════════════════════════════════════════════════ */

function HistorialPanel({ intel }: { intel: ReturnType<typeof useCommunicationIntelligence> }) {
  const { history, dataFreshness, refetchAll } = intel;
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [channelFilter, setChannelFilter] = useState("");

  const filtered = useMemo(() => {
    let r = history;
    if (search) { const q = search.toLowerCase(); r = r.filter((h) => h.title.toLowerCase().includes(q)); }
    if (typeFilter) r = r.filter((h) => h.notification_type === typeFilter);
    if (channelFilter) r = r.filter((h) => h.channel === channelFilter);
    return r;
  }, [history, search, typeFilter, channelFilter]);

  const stats = useMemo(() => {
    const total = history.length;
    const byChannel: Record<string, number> = {};
    let success = 0;
    history.forEach((h) => { byChannel[h.channel] = (byChannel[h.channel] || 0) + 1; if (h.status === "sent" || h.status === "delivered") success++; });
    return { total, byChannel, successRate: total > 0 ? (success / total) * 100 : 0 };
  }, [history]);

  const chartData = useMemo(() => Object.entries(stats.byChannel).map(([ch, count]) => ({ name: (CHANNEL_CONFIG[ch] as { label: string } | undefined)?.label ?? ch, count, channel: ch })), [stats.byChannel]);
  const bars = useMemo(() => buildChannelBarPaths(chartData), [chartData]);
  const uniqueTypes = useMemo(() => [...new Set(history.map((h) => h.notification_type))], [history]);
  
  return (
    <div className="glass-comm-center__section" style={{ marginTop: "1rem" }}>
      {/* Stats */}
      <div className="glass-comm-center__stats-row">
        {[
          { label: "Total enviados", value: stats.total.toString(), i: 0 },
          { label: "Tasa de éxito", value: `${Math.round(stats.successRate)}%`, i: 1 },
          { label: "Canal más usado", value: chartData[0]?.name ?? "-", i: 2 },
          { label: "Tipos únicos", value: uniqueTypes.length.toString(), i: 3 },
        ].map((k) => (
          <div key={k.label} className="glass-comm-center__kpi-card" style={{ "--stagger-i": k.i } as CSSProperties}>
            <p className="glass-comm-center__stat-label">{k.label}</p>
            <p className="glass-comm-center__stat-value" style={{ fontSize: "1.25rem", marginTop: "0.25rem" }}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Stale banner */}
      {dataFreshness.isStale && (
        <div className="glass-comm-center__stale-banner">
          <RefreshCw size={14} />
          <span>Datos desactualizados ({dataFreshness.label})</span>
          <button className="glass-comm-center__btn glass-comm-center__btn--ghost" style={{ marginLeft: "auto", fontSize: "0.75rem", minHeight: "32px" }} onClick={refetchAll}>Actualizar</button>
        </div>
      )}

      {/* Channel chart */}
      {bars.length > 0 && (
        <div className="glass-comm-center__chart-panel" style={{ "--stagger-i": 0 } as CSSProperties}>
          <h3 className="glass-comm-center__chart-title">Envíos por Canal</h3>
          <svg className="glass-comm-center__chart-svg" viewBox={`0 0 560 ${bars.length * 36 + 16}`} style={{ height: bars.length * 36 + 16 }} role="img" aria-label="Distribución por canal">
            {bars.map((b, i) => {
              const y = i * 36 + 8;
              return (
                <g key={b.name}>
                  <text x="0" y={y + 16} className="glass-comm-center__axis-label">{b.name}</text>
                  <rect x="80" y={y + 2} width={b.barW} height="24" rx="4" className="glass-comm-center__bar-rect" fill={`var(--gcn-${b.channel === "email" ? "teal" : b.channel === "push" ? "gold" : b.channel === "sms" ? "emerald" : b.channel === "whatsapp" ? "sage" : "muted"})`} style={{ "--stagger-i": i } as CSSProperties} />
                  <text x={80 + b.barW + 8} y={y + 16} className="glass-comm-center__axis-label">{b.count}</text>
                </g>
              );
            })}
          </svg>
        </div>
      )}

      {/* Filters */}
      <div className="glass-comm-center__filter-row">
        <div className="glass-comm-center__search">
          <Search size={16} className="glass-comm-center__search-icon" />
          <input type="text" className="glass-comm-center__search-input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar en historial…" />
        </div>
        <select className="glass-comm-center__select" style={{ width: "auto", minWidth: "140px" }} value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
          <option value="">Todos los tipos</option>
          {uniqueTypes.map((t) => <option key={t} value={t}>{(TYPE_CFG[t] as { label: string } | undefined)?.label ?? t}</option>)}
        </select>
        <select className="glass-comm-center__select" style={{ width: "auto", minWidth: "140px" }} value={channelFilter} onChange={(e) => setChannelFilter(e.target.value)}>
          <option value="">Todos los canales</option>
          {Object.entries(CHANNEL_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="glass-comm-center__empty">
          <History size={32} className="glass-comm-center__empty-icon" />
          <h3 className="glass-comm-center__empty-title">Sin historial</h3>
          <p className="glass-comm-center__empty-desc">No se encontraron notificaciones.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
          {filtered.map((item, i) => {
            const chCfg = (CHANNEL_CONFIG[item.channel] as { label: string; icon: LucideIcon } | undefined) ?? CHANNEL_CONFIG.email;
            const ChIcon = chCfg.icon;
            return (
              <div key={item.id} className="glass-comm-center__history-item" style={{ "--stagger-i": i } as CSSProperties}>
                <div className="glass-comm-center__history-icon-wrap" data-channel={item.channel}><ChIcon size={16} /></div>
                <div className="glass-comm-center__history-info">
                  <p className="glass-comm-center__history-title">{item.title}</p>
                  <div className="glass-comm-center__history-meta">
                    <span className="glass-comm-center__badge glass-comm-center__badge--sm" data-status={item.status}>{(STATUS_CFG[item.status] as { label: string } | undefined)?.label ?? item.status}</span>
                    <span className="glass-comm-center__stat-sub">{chCfg.label} · {item.recipient_count} dest.</span>
                  </div>
                </div>
                <span className="glass-comm-center__history-time">{item.sent_at ? timeAgo(item.sent_at) : "—"}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   PlantillasPanel
   ══════════════════════════════════════════════════════════ */

function PlantillasPanel({ intel }: { intel: ReturnType<typeof useCommunicationIntelligence> }) {
  const { templates } = intel;

  const createMut = useMCPMutation<{ template: TemplateItem }>("communication", "manage_notification_templates", {
    onSuccess: (data: { template: TemplateItem }) => { showToast({ type: "success", message: `Plantilla '${data.template?.name ?? "nueva"}' creada` }); intel.refetchAll(); },
    onError: (err: unknown) => showToast({ type: "error", message: err instanceof Error ? err.message : "Error" }),
  });

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: "", category: "welcome", subject: "", body_template: "", channels: "email", variables: "" });

  function handleCreate() {
    if (!form.name || !form.subject || !form.body_template) { showToast({ type: "error", message: "Nombre, asunto y contenido requeridos" }); return; }
    createMut.mutate({ action: "create", ...form });
  }

  return (
    <div className="glass-comm-center__section" style={{ marginTop: "1rem" }}>
      <div className="glass-comm-center__section-header">
        <p className="glass-comm-center__stat-label">{templates.length} plantillas disponibles</p>
        <button className="glass-comm-center__btn glass-comm-center__btn--primary" onClick={() => setShowCreate(true)}><Plus size={16} /> Nueva Plantilla</button>
      </div>

      {templates.length === 0 ? (
        <div className="glass-comm-center__empty">
          <FileText size={32} className="glass-comm-center__empty-icon" />
          <h3 className="glass-comm-center__empty-title">Sin plantillas</h3>
          <p className="glass-comm-center__empty-desc">Creá tu primera plantilla.</p>
        </div>
      ) : (
        <div className="glass-comm-center__template-grid">
          {templates.map((t, i) => (
            <div key={t.id} className="glass-comm-center__template-card" style={{ "--stagger-i": i } as CSSProperties}>
              <div className="glass-comm-center__template-header">
                <p className="glass-comm-center__template-name">{t.name}</p>
                <span className="glass-comm-center__template-active" data-active={t.is_active}>{t.is_active ? "Activa" : "Inactiva"}</span>
              </div>
              <span className="glass-comm-center__badge glass-comm-center__badge--sm" style={{ marginBottom: "0.375rem" }}>{(TEMPLATE_CAT_CFG[t.category] as { label: string } | undefined)?.label ?? t.category}</span>
              <p className="glass-comm-center__template-subject">{t.subject}</p>
              {t.channels.length > 0 && (
                <div className="glass-comm-center__template-channels">
                  {t.channels.map((ch) => <span key={ch} className="glass-comm-center__badge glass-comm-center__badge--sm" data-channel={ch}>{(CHANNEL_CONFIG[ch] as { label: string } | undefined)?.label ?? ch}</span>)}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <GlassModal isOpen={showCreate} onClose={() => setShowCreate(false)} title="Nueva Plantilla">
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div className="glass-comm-center__form-group">
            <label className="glass-comm-center__label">Nombre *</label>
            <input className="glass-comm-center__input" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="Ej: Bienvenida nuevos socios" />
          </div>
          <div className="glass-comm-center__form-group">
            <label className="glass-comm-center__label">Categoría</label>
            <select className="glass-comm-center__select" value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))}>
              {Object.entries(TEMPLATE_CAT_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          <div className="glass-comm-center__form-group">
            <label className="glass-comm-center__label">Asunto *</label>
            <input className="glass-comm-center__input" value={form.subject} onChange={(e) => setForm((p) => ({ ...p, subject: e.target.value }))} placeholder="Asunto / título" />
          </div>
          <div className="glass-comm-center__form-group">
            <label className="glass-comm-center__label">Contenido *</label>
            <textarea className="glass-comm-center__textarea" value={form.body_template} onChange={(e) => setForm((p) => ({ ...p, body_template: e.target.value }))} rows={5} placeholder="Usá {nombre}, {fecha} como variables..." />
          </div>
          <div className="glass-comm-center__form-group">
            <label className="glass-comm-center__label">Variables (coma-separadas)</label>
            <input className="glass-comm-center__input" value={form.variables} onChange={(e) => setForm((p) => ({ ...p, variables: e.target.value }))} placeholder="nombre, fecha, evento" />
          </div>
          <div className="glass-comm-center__compose-footer">
            <button className="glass-comm-center__btn glass-comm-center__btn--ghost" onClick={() => setShowCreate(false)}>Cancelar</button>
            <button className="glass-comm-center__btn glass-comm-center__btn--primary" onClick={handleCreate} disabled={createMut.isPending}>
              <FileText size={16} /> {createMut.isPending ? "Creando…" : "Crear Plantilla"}
            </button>
          </div>
        </div>
      </GlassModal>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   ProgramadosPanel
   ══════════════════════════════════════════════════════════ */

function ProgramadosPanel({ intel }: { intel: ReturnType<typeof useCommunicationIntelligence> }) {
  const { scheduled, cascadeRisk } = intel;

  const cancelMut = useMCPMutation("communication", "schedule_notification", {
    onSuccess: () => { showToast({ type: "success", message: "Cancelada" }); intel.refetchAll(); },
    onError: (err: unknown) => showToast({ type: "error", message: err instanceof Error ? err.message : "Error" }),
  });

  return (
    <div className="glass-comm-center__section" style={{ marginTop: "1rem" }}>
      {/* Cascade warning */}
      {cascadeRisk.risk !== "low" && (
        <div className="glass-comm-center__cascade-banner" data-risk={cascadeRisk.risk}>
          <AlertTriangle size={14} />
          <span>{cascadeRisk.message}</span>
        </div>
      )}

      {scheduled.length === 0 ? (
        <div className="glass-comm-center__empty">
          <Calendar size={32} className="glass-comm-center__empty-icon" />
          <h3 className="glass-comm-center__empty-title">Sin programados</h3>
          <p className="glass-comm-center__empty-desc">Las notificaciones programadas aparecerán aquí.</p>
        </div>
      ) : (
        scheduled.map((item, i) => {
          const chCfg = (CHANNEL_CONFIG[item.channel] as { label: string; icon: LucideIcon } | undefined) ?? CHANNEL_CONFIG.email;
          const ChIcon = chCfg.icon;
          return (
            <div key={item.id} className="glass-comm-center__scheduled-item" style={{ "--stagger-i": i } as CSSProperties}>
              <div className="glass-comm-center__history-icon-wrap" data-channel={item.channel}><ChIcon size={16} /></div>
              <div className="glass-comm-center__scheduled-info">
                <p className="glass-comm-center__scheduled-title">Plantilla: {item.template_id}</p>
                <div className="glass-comm-center__scheduled-meta">
                  <span className="glass-comm-center__badge glass-comm-center__badge--sm" data-status={item.status}>{(STATUS_CFG[item.status] as { label: string } | undefined)?.label ?? item.status}</span>
                  <span className="glass-comm-center__stat-sub">{item.recipient_ids.length} dest. · {chCfg.label}</span>
                </div>
              </div>
              <div className="glass-comm-center__scheduled-time">
                <p className="glass-comm-center__scheduled-time-value">{formatCommunicationDate(item.scheduled_at)}</p>
              </div>
              {item.status === "queued" && (
                <button className="glass-comm-center__btn glass-comm-center__btn--ghost glass-comm-center__btn--danger" onClick={() => cancelMut.mutate({ action: "cancel", schedule_id: item.id })} disabled={cancelMut.isPending}>
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   AIComposeModal V2
   ══════════════════════════════════════════════════════════ */

function AIComposeModal({
  isOpen,
  onClose,
  onApply,
  intel,
}: {
  isOpen: boolean;
  onClose: () => void;
  onApply: (title: string, body: string) => void;
  intel: ReturnType<typeof useCommunicationIntelligence>;
}) {
  const { temporalAdvice, channelRecommendation, fatigueWarning } = intel;
  const [topic, setTopic] = useState("event_invitation");
  const [tone, setTone] = useState("friendly");
  const [shouldGenerate, setShouldGenerate] = useState(false);

  const personalizeQ = useMCPQuery<{ draft: { subject: string; body: string; tone: string; personalization_data: { topic: string }; [key: string]: unknown } }>(
    "proactive_recommendation", "personalize_communication",
    { topic, tone, family_id: "global", family_name: "Socio del Castillo" },
    { enabled: shouldGenerate, staleTime: 0 },
  );

  const draft = personalizeQ.data?.draft;

  function handleGenerate() { if (!shouldGenerate) setShouldGenerate(true); else personalizeQ.refetch(); }
  function handleApply() { if (draft) onApply(draft.subject, draft.body); }
  function handleClose() { setShouldGenerate(false); onClose(); }

  return (
    <GlassModal isOpen={isOpen} onClose={handleClose} title="Generar Borrador con AI">
      <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        <div className="glass-comm-center__ai-banner">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <Sparkles size={16} style={{ color: "var(--gcn-gold)" }} />
            <p className="glass-comm-center__ai-banner-title">Composición inteligente</p>
          </div>
          <p className="glass-comm-center__ai-banner-desc">Generá un borrador personalizado. Podés editarlo antes de usarlo.</p>
        </div>

        <div className="glass-comm-center__form-group">
          <label className="glass-comm-center__label">Tipo de comunicación</label>
          <div className="glass-comm-center__ai-selector-grid">
            {AI_TOPICS.map((t) => <button key={t.value} type="button" className="glass-comm-center__ai-option" data-selected={topic === t.value} data-selector="topic" onClick={() => setTopic(t.value)}>{t.label}</button>)}
          </div>
        </div>

        <div className="glass-comm-center__form-group">
          <label className="glass-comm-center__label">Tono</label>
          <div className="glass-comm-center__ai-selector-row">
            {AI_TONES.map((t) => <button key={t.value} type="button" className="glass-comm-center__ai-option glass-comm-center__ai-option--flex" data-selected={tone === t.value} data-selector="tone" onClick={() => setTone(t.value)}>{t.label}</button>)}
          </div>
        </div>

        <button className="glass-comm-center__btn glass-comm-center__btn--primary" style={{ width: "100%", background: "var(--gcn-gold)", color: "#000" }} onClick={handleGenerate} disabled={personalizeQ.isLoading}>
          <Sparkles size={16} /> {personalizeQ.isLoading ? "Generando…" : "Generar borrador con AI"}
        </button>

        {personalizeQ.isLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <div className="glass-comm-center__skeleton glass-comm-center__skeleton--sm" />
            <div className="glass-comm-center__skeleton glass-comm-center__skeleton--lg" />
          </div>
        )}

        {personalizeQ.isError && (
          <div className="glass-comm-center__error" style={{ padding: "1rem" }}>
            <p style={{ fontSize: "0.8125rem", color: "var(--gcn-rose)" }}>Error al generar. Intentá de nuevo.</p>
          </div>
        )}

        {draft !== undefined && !personalizeQ.isLoading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem", animation: "gcc-fade-up 0.3s ease forwards" }}>
            <div className="glass-comm-center__ai-preview-box">
              <p className="glass-comm-center__ai-preview-label">Asunto</p>
              <p className="glass-comm-center__ai-preview-subject">{draft.subject}</p>
              <div style={{ borderTop: "1px solid var(--gcn-border)", paddingTop: "0.75rem", marginTop: "0.75rem" }}>
                <p className="glass-comm-center__ai-preview-label">Contenido</p>
                <p className="glass-comm-center__ai-preview-body">{draft.body}</p>
              </div>
              <div className="glass-comm-center__ai-preview-meta">
                <span className="glass-comm-center__badge glass-comm-center__badge--sm">Tono: {(AI_TONES.find((t) => t.value === draft.tone))?.label ?? draft.tone}</span>
                <span className="glass-comm-center__badge glass-comm-center__badge--sm">{(AI_TOPICS.find((t) => t.value === draft.personalization_data.topic))?.label ?? draft.personalization_data.topic}</span>
              </div>
            </div>

            {/* Intelligence context */}
            <div className="glass-comm-center__ai-intel">
              <div className="glass-comm-center__intel-card" data-type="temporal">
                <Clock size={12} className="glass-comm-center__intel-icon" />
                <span className="glass-comm-center__intel-label">Enviar {temporalAdvice.label}</span>
              </div>
              <div className="glass-comm-center__intel-card" data-type="temporal">
                <Send size={12} className="glass-comm-center__intel-icon" />
                <span className="glass-comm-center__intel-label">Canal: {channelRecommendation.label}</span>
              </div>
              {fatigueWarning.level !== "normal" && (
                <div className="glass-comm-center__intel-card" data-type="fatigue" data-level={fatigueWarning.level}>
                  <AlertTriangle size={12} className="glass-comm-center__intel-icon" />
                  <span className="glass-comm-center__intel-label">{fatigueWarning.message}</span>
                </div>
              )}
            </div>

            <div className="glass-comm-center__compose-footer">
              <button className="glass-comm-center__btn glass-comm-center__btn--ghost" onClick={handleClose}>Cancelar</button>
              <button className="glass-comm-center__btn glass-comm-center__btn--primary" onClick={handleApply}><CheckCircle2 size={16} /> Usar borrador</button>
            </div>
          </div>
        )}
      </div>
    </GlassModal>
  );
}

/* ══════════════════════════════════════════════════════════
   EmergencyModal V2
   ══════════════════════════════════════════════════════════ */

function EmergencyModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [emergencyType, setEmergencyType] = useState("security");
  const [step, setStep] = useState<1 | 2>(1);

  const emergMut = useMCPMutation<HITLResponse>("communication", "manage_emergency_broadcast", {
    onSuccess: (data: HITLResponse) => { showToast({ type: "success", message: data.message ?? "Alerta enviada a aprobación" }); onClose(); setTitle(""); setBody(""); setStep(1); },
    onError: (err: unknown) => showToast({ type: "error", message: err instanceof Error ? err.message : "Error" }),
  });

  function handleSend() { if (!title.trim() || !body.trim()) { showToast({ type: "error", message: "Título y mensaje requeridos" }); return; } emergMut.mutate({ title, body, emergency_type: emergencyType, channels: "push,sms,whatsapp" }); }

  return (
    <GlassModal isOpen={isOpen} onClose={() => { onClose(); setStep(1); }} title="Alerta de Emergencia">
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div className="glass-comm-center__emergency-warning">
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
            <AlertTriangle size={16} style={{ color: "var(--gcn-rose)" }} />
            <p className="glass-comm-center__emergency-warning-title">Requiere doble confirmación</p>
          </div>
          <p className="glass-comm-center__emergency-warning-desc">Se enviará a TODOS los socios por push, SMS y WhatsApp. Requiere aprobación de dos administradores.</p>
        </div>

        {step === 1 ? (
          <>
            <div className="glass-comm-center__form-group">
              <label className="glass-comm-center__label">Título *</label>
              <input className="glass-comm-center__input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ej: Evacuación por tormenta" />
            </div>
            <div className="glass-comm-center__form-group">
              <label className="glass-comm-center__label">Tipo</label>
              <select className="glass-comm-center__select" value={emergencyType} onChange={(e) => setEmergencyType(e.target.value)}>
                {Object.entries(EMERGENCY_CFG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
            <div className="glass-comm-center__form-group">
              <label className="glass-comm-center__label">Mensaje *</label>
              <textarea className="glass-comm-center__textarea" value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Instrucciones claras y directas…" />
            </div>
            {/* Reach estimation */}
            <div className="glass-comm-center__reach">
              <span className="glass-comm-center__reach-label">Alcance</span>
              <div className="glass-comm-center__reach-track">
                <div className="glass-comm-center__reach-fill" data-score="high" style={{ width: "100%" }} />
              </div>
              <span className="glass-comm-center__reach-value">100%</span>
            </div>
            <div className="glass-comm-center__compose-footer">
              <button className="glass-comm-center__btn glass-comm-center__btn--ghost" onClick={onClose}>Cancelar</button>
              <button className="glass-comm-center__btn" onClick={() => { if (!title.trim() || !body.trim()) { showToast({ type: "error", message: "Completá título y mensaje" }); return; } setStep(2); }}><ShieldAlert size={16} /> Revisar</button>
            </div>
          </>
        ) : (
          <>
            <div className="glass-comm-center__emergency-review">
              <p className="glass-comm-center__emergency-review-row"><span className="glass-comm-center__emergency-review-label">Título: </span>{title}</p>
              <p className="glass-comm-center__emergency-review-row" style={{ marginTop: "0.25rem" }}><span className="glass-comm-center__emergency-review-label">Tipo: </span>{(EMERGENCY_CFG[emergencyType] as { label: string } | undefined)?.label ?? emergencyType}</p>
              <p className="glass-comm-center__emergency-review-row" style={{ marginTop: "0.75rem", color: "var(--gcn-muted)" }}>{body}</p>
            </div>
            <div className="glass-comm-center__compose-footer">
              <button className="glass-comm-center__btn glass-comm-center__btn--ghost" onClick={() => setStep(1)}>Volver</button>
              <button className="glass-comm-center__btn glass-comm-center__btn--rose" onClick={handleSend} disabled={emergMut.isPending}><ShieldAlert size={16} /> {emergMut.isPending ? "Enviando…" : "Confirmar Emergencia"}</button>
            </div>
          </>
        )}
      </div>
    </GlassModal>
  );
}

/* ══════════════════════════════════════════════════════════
   PersonalizedModal V2
   ══════════════════════════════════════════════════════════ */

function PersonalizedModal({ isOpen, onClose, intel }: { isOpen: boolean; onClose: () => void; intel: ReturnType<typeof useCommunicationIntelligence> }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [channel, setChannel] = useState("email");
  const [recipientIds, setRecipientIds] = useState("");

  const sendMut = useMCPMutation<HITLResponse>("communication", "send_personalized_notification", {
    onSuccess: (data: HITLResponse) => { showToast({ type: "success", message: data.message ?? "Enviada" }); onClose(); setTitle(""); setBody(""); setRecipientIds(""); },
    onError: (err: unknown) => showToast({ type: "error", message: err instanceof Error ? err.message : "Error" }),
  });

  function handleSend() { if (!title.trim() || !body.trim() || !recipientIds.trim()) { showToast({ type: "error", message: "Campos requeridos" }); return; } sendMut.mutate({ title, body, channel, recipient_ids: recipientIds }); }

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title="Notificación Personalizada">
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        {/* Channel recommendation */}
        <div className="glass-comm-center__intel-card" data-type="temporal">
          <Send size={14} className="glass-comm-center__intel-icon" />
          <span className="glass-comm-center__intel-label">Canal recomendado: {intel.channelRecommendation.label}</span>
        </div>

        <div className="glass-comm-center__form-group">
          <label className="glass-comm-center__label">Título *</label>
          <input className="glass-comm-center__input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Título" />
        </div>
        <div className="glass-comm-center__form-group">
          <label className="glass-comm-center__label">Canal</label>
          <select className="glass-comm-center__select" value={channel} onChange={(e) => setChannel(e.target.value)}>
            {Object.entries(CHANNEL_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="glass-comm-center__form-group">
          <label className="glass-comm-center__label">Destinatarios (IDs, coma-separados) *</label>
          <input className="glass-comm-center__input" value={recipientIds} onChange={(e) => setRecipientIds(e.target.value)} placeholder="id1, id2, id3..." />
          <p className="glass-comm-center__stat-sub" style={{ marginTop: "0.25rem" }}>Más de 100 destinatarios requiere aprobación</p>
        </div>
        <div className="glass-comm-center__form-group">
          <label className="glass-comm-center__label">Mensaje *</label>
          <textarea className="glass-comm-center__textarea" value={body} onChange={(e) => setBody(e.target.value)} rows={4} placeholder="Contenido…" />
        </div>
        <div className="glass-comm-center__compose-footer">
          <button className="glass-comm-center__btn glass-comm-center__btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="glass-comm-center__btn glass-comm-center__btn--primary" onClick={handleSend} disabled={sendMut.isPending}><Send size={16} /> {sendMut.isPending ? "Enviando…" : "Enviar"}</button>
        </div>
      </div>
    </GlassModal>
  );
}

/* ══════════════════════════════════════════════════════════
   BoardPackageModal
   ══════════════════════════════════════════════════════════ */

function BoardPackageModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const now = new Date();
  const [quarter, setQuarter] = useState(`Q${Math.floor(now.getMonth() / 3) + 1}`);
  const [year, setYear] = useState(now.getFullYear());
  const [recipients, setRecipients] = useState("full_board");

  const boardMut = useMCPMutation<{ message?: string }>("communication", "send_board_package", {
    onSuccess: (data: { message?: string }) => { showToast({ type: "success", message: data.message ?? "Board Package enviado" }); onClose(); },
    onError: (err: unknown) => showToast({ type: "error", message: err instanceof Error ? err.message : "Error" }),
  });

  function handleSend() { boardMut.mutate({ quarter, year, recipients }); }

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title="Enviar Board Package">
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
        <div className="glass-comm-center__hitl-notice">
          Incluye: Resumen Ejecutivo, Reporte Financiero, Estado de Membresía, Pulso Operativo, Satisfacción, Anomalías y Recomendaciones Estratégicas.
        </div>
        <div className="glass-comm-center__form-row">
          <div className="glass-comm-center__form-group">
            <label className="glass-comm-center__label">Trimestre</label>
            <select className="glass-comm-center__select" value={quarter} onChange={(e) => setQuarter(e.target.value)}>
              {["Q1", "Q2", "Q3", "Q4"].map((q) => <option key={q} value={q}>{q}</option>)}
            </select>
          </div>
          <div className="glass-comm-center__form-group">
            <label className="glass-comm-center__label">Año</label>
            <select className="glass-comm-center__select" value={year} onChange={(e) => setYear(Number(e.target.value))}>
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <div className="glass-comm-center__form-group">
          <label className="glass-comm-center__label">Destinatarios</label>
          <select className="glass-comm-center__select" value={recipients} onChange={(e) => setRecipients(e.target.value)}>
            <option value="full_board">Junta completa</option>
            <option value="director_only">Solo Director</option>
          </select>
        </div>
        <div className="glass-comm-center__compose-footer">
          <button className="glass-comm-center__btn glass-comm-center__btn--ghost" onClick={onClose}>Cancelar</button>
          <button className="glass-comm-center__btn glass-comm-center__btn--primary" onClick={handleSend} disabled={boardMut.isPending}>
            <Package size={16} /> {boardMut.isPending ? "Enviando…" : "Enviar Board Package"}
          </button>
        </div>
      </div>
    </GlassModal>
  );
}

/* ══════════════════════════════════════════════════════════
   TemplatePickerModal
   ══════════════════════════════════════════════════════════ */

function TemplatePickerModal({
  isOpen,
  onClose,
  onSelect,
  templates,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (tmpl: TemplateItem) => void;
  templates: TemplateItem[];
}) {
  const active = templates.filter((t) => t.is_active);

  return (
    <GlassModal isOpen={isOpen} onClose={onClose} title="Seleccionar Plantilla">
      {active.length === 0 ? (
        <div className="glass-comm-center__empty" style={{ padding: "1.5rem" }}>
          <FileText size={24} className="glass-comm-center__empty-icon" />
          <h3 className="glass-comm-center__empty-title" style={{ fontSize: "0.875rem" }}>Sin plantillas</h3>
          <p className="glass-comm-center__empty-desc" style={{ marginBottom: 0 }}>No hay plantillas activas disponibles.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {active.map((tmpl) => (
            <button
              key={tmpl.id}
              onClick={() => { onSelect(tmpl); onClose(); }}
              style={{
                width: "100%",
                textAlign: "left",
                padding: "1rem",
                borderRadius: "0.75rem",
                border: "2px solid var(--gcn-border)",
                background: "transparent",
                cursor: "pointer",
                transition: "border-color 0.2s ease",
                color: "var(--gcn-text)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--gcn-gold)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.borderColor = "var(--gcn-border)"; }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.25rem" }}>
                <p style={{ fontFamily: "var(--font-ui)", fontSize: "0.875rem", fontWeight: 600, color: "var(--gcn-text-100)" }}>{tmpl.name}</p>
                <span className="glass-comm-center__badge glass-comm-center__badge--sm">
                  {(TEMPLATE_CAT_CFG[tmpl.category] as { label: string } | undefined)?.label ?? tmpl.category}
                </span>
              </div>
              <p style={{ fontFamily: "var(--font-ui)", fontSize: "0.8125rem", color: "var(--gcn-dim)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {tmpl.subject}
              </p>
              {tmpl.channels.length > 0 && (
                <div style={{ display: "flex", gap: "0.25rem", marginTop: "0.5rem" }}>
                  {tmpl.channels.map((ch) => (
                    <span key={ch} className="glass-comm-center__badge glass-comm-center__badge--sm" data-channel={ch}>
                      {(CHANNEL_CONFIG[ch] as { label: string } | undefined)?.label ?? ch}
                    </span>
                  ))}
                </div>
              )}
            </button>
          ))}
        </div>
      )}
    </GlassModal>
  );
}

/* ══════════════════════════════════════════════════════════
   AudienceGapsPanel
   ══════════════════════════════════════════════════════════ */

function AudienceGapsPanel({ intel }: { intel: ReturnType<typeof useCommunicationIntelligence> }) {
  const { audienceGaps } = intel;

  if (audienceGaps.length === 0) return null;

  return (
    <div className="glass-comm-center__section">
      <div className="glass-comm-center__section-header">
        <h3 className="glass-comm-center__section-title">Inteligencia de Audiencia</h3>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem" }}>
        {audienceGaps.map((gap, i) => (
          <div key={gap.channel} className="glass-comm-center__gap-card" data-severity={gap.severity} style={{ "--stagger-i": i } as CSSProperties}>
            <span className="glass-comm-center__gap-channel">{(CHANNEL_CONFIG[gap.channel] as { label: string } | undefined)?.label ?? gap.channel}</span>
            <span className="glass-comm-center__gap-issue">{gap.issue}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════
   Main Component — CommunicationCenter V2
   ══════════════════════════════════════════════════════════ */

export function CommunicationCenter() {
  const intel = useCommunicationIntelligence();
  const { commandStatus, isLoading, isError, refetchAll } = intel;

  const [activeTab, setActiveTab] = useState("comunicar");
  const [showEmergency, setShowEmergency] = useState(false);
  const [showPersonalized, setShowPersonalized] = useState(false);
  const [showBoardPackage, setShowBoardPackage] = useState(false);
  const [showAICompose, setShowAICompose] = useState(false);
  const [showTemplatePicker, setShowTemplatePicker] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateItem | null>(null);

  const tabs = [
    { id: "comunicar", label: "Comunicar", icon: Send },
    { id: "historial", label: "Historial", icon: History },
    { id: "plantillas", label: "Plantillas", icon: FileText },
    { id: "programados", label: "Programados", icon: Calendar },
  ] as const;

  /* ── Loading state ── */
  if (isLoading) {
    return (
      <div className="glass-comm-center">
        <div className="glass-comm-center__container">
          <header>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--gcn-text)" }}>Centro de Comunicaciones</h1>
            <p style={{ fontFamily: "var(--font-ui)", fontSize: "0.8125rem", color: "var(--gcn-dim)", marginTop: "0.25rem" }}>Cargando inteligencia de comunicaciones…</p>
          </header>
          <div className="glass-comm-center__status-strip">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="glass-comm-center__skeleton glass-comm-center__skeleton--md" style={{ flex: 1 }} />
            ))}
          </div>
          <div className="glass-comm-center__skeleton glass-comm-center__skeleton--lg" />
        </div>
      </div>
    );
  }

  /* ── Error state ── */
  if (isError) {
    return (
      <div className="glass-comm-center">
        <div className="glass-comm-center__container">
          <header>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--gcn-text)" }}>Centro de Comunicaciones</h1>
          </header>
          <div className="glass-comm-center__error">
            <AlertTriangle size={32} className="glass-comm-center__error-icon" />
            <h3 className="glass-comm-center__error-title">Error al cargar datos</h3>
            <p className="glass-comm-center__error-desc">No pudimos obtener los datos del centro de comunicaciones.</p>
            <button className="glass-comm-center__btn" onClick={refetchAll}><RefreshCw size={16} /> Reintentar</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-comm-center">
      <div className="glass-comm-center__container">
        {/* ── Header ── */}
        <header>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: "1.5rem", fontWeight: 700, color: "var(--gcn-text)" }}>
            Centro de Comunicaciones
          </h1>
          <p style={{ fontFamily: "var(--font-ui)", fontSize: "0.8125rem", color: "var(--gcn-dim)", marginTop: "0.25rem" }}>
            Centro de mando — inteligencia de comunicaciones en tiempo real
          </p>
        </header>

        {/* ── Command Status Strip ── */}
        <CommandStatusStrip status={commandStatus} />

        {/* ── Audience Intelligence (global) ── */}
        {activeTab !== "comunicar" && <AudienceGapsPanel intel={intel} />}

        {/* ── Tabs ── */}
        <nav className="glass-comm-center__tabs" role="tablist" aria-label="Secciones de comunicaciones">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={activeTab === tab.id}
                className="glass-comm-center__tab"
                data-active={activeTab === tab.id}
                onClick={() => setActiveTab(tab.id)}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </nav>

        {/* ── Tab Panels ── */}
        <div role="tabpanel">
          {activeTab === "comunicar" && (
            <ComunicarPanel
              intel={intel}
              onOpenEmergency={() => setShowEmergency(true)}
              onOpenPersonalized={() => setShowPersonalized(true)}
              onOpenBoardPackage={() => setShowBoardPackage(true)}
              onOpenAICompose={() => setShowAICompose(true)}
              onOpenTemplatePicker={() => setShowTemplatePicker(true)}
              selectedTemplate={selectedTemplate}
              clearTemplate={() => setSelectedTemplate(null)}
            />
          )}
          {activeTab === "historial" && <HistorialPanel intel={intel} />}
          {activeTab === "plantillas" && <PlantillasPanel intel={intel} />}
          {activeTab === "programados" && <ProgramadosPanel intel={intel} />}
        </div>
      </div>

      {/* ── Modals ── */}
      <EmergencyModal isOpen={showEmergency} onClose={() => setShowEmergency(false)} />
      <PersonalizedModal isOpen={showPersonalized} onClose={() => setShowPersonalized(false)} intel={intel} />
      <BoardPackageModal isOpen={showBoardPackage} onClose={() => setShowBoardPackage(false)} />
      <AIComposeModal
        isOpen={showAICompose}
        onClose={() => setShowAICompose(false)}
        onApply={(aiTitle, aiBody) => {
          setSelectedTemplate({ id: "ai", name: "AI Draft", subject: aiTitle, body_template: aiBody, category: "general", channels: [], is_active: true, variables: [], created_at: new Date().toISOString() } as TemplateItem);
          setShowAICompose(false);
          setActiveTab("comunicar");
          showToast({ type: "success", message: "Borrador aplicado — revisalo antes de enviar" });
        }}
        intel={intel}
      />
      <TemplatePickerModal
        isOpen={showTemplatePicker}
        onClose={() => setShowTemplatePicker(false)}
        onSelect={(tmpl) => {
          setSelectedTemplate(tmpl);
          showToast({ type: "success", message: `Plantilla "${tmpl.name}" seleccionada` });
        }}
        templates={intel.templates}
      />
    </div>
  );
}