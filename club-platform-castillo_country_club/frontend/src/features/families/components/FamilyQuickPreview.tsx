// src/features/families/components/FamilyQuickPreview.tsx
// ═══════════════════════════════════════════════════════════
// Phase 34+ Migration — Family Quick Preview Panel
// Level 6+ Agency · Production Grade
//
// Slide-in intelligence dialog with:
// - Intelligence Timeline (P1: narrative first)
// - Metric Cards with delta + benchmark (P5: shared atoms)
// - Predictive Insight card (P3: every insight has CTA)
// - Connection Radar SVG (P6: social intelligence)
// - Smart Action Suggestions (P4: progressive disclosure)
// - Open/close animations via CSS
//
// PRE-WRITE VERIFICATION:
//   Family         → ../types.ts §1 ✅
//   TIER_CONFIG    → ../config.ts §3 ✅ (NOT ../types)
//   STATUS_CONFIG  → ../config.ts §4 ✅ (NOT ../types)
//   CHURN_CONFIG   → ../config.ts §5 ✅ (NOT ../types)
//   formatCurrency → @/shared/lib/utils ✅
//   Badge          → @/shared/components/ui/Badge ✅
//   TrendIcon      → @/shared/components/ui/TrendIcon ✅
//   Link           → react-router ✅
//   familySignals  → ../lib/familySignals.ts ✅ (daysSince, deriveTrend,
//                    deriveInsight, getRowSignal, getSparklinePoints)
//
// ANTI-PATTERNS REMOVED:
//   - 5 cn() calls → data-* attributes
//   - ~60 Tailwind utilities → BEM .fm-quickPreview__*
//   - ~15 inline color styles → CSS var bridges
//   - glass-family-preview → fm-quickPreview
//   - TIER/STATUS/CHURN_CONFIG from ../types → from ../config
//   - 2 useReducedMotion → CSS handles
//   - IIFE in JSX → extracted InsightCard section
//   - Mutable interfaces → readonly
//   - no-underline Tailwind → BEM
//   - font-[ family-name:var(--font-*) ] → CSS font-family
//   - ConnectionRadar useReducedMotion → CSS pulse
//   - Inline sparkline bar colors → data-attribute driven
// ═══════════════════════════════════════════════════════════

import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import type { CSSProperties } from "react";
import {
  X, ExternalLink, TrendingUp, TrendingDown, AlertTriangle,
  Sparkles, Calendar, Phone, Users, Award, Clock, Link as LinkIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Link } from "react-router";

import { formatCurrency } from "@/shared/lib/utils";
import { Badge } from "@/shared/components/ui/Badge";
import { TrendIcon } from "@/shared/components/ui/TrendIcon";
import type { Family } from "../types";
import { TIER_CONFIG, STATUS_CONFIG, CHURN_CONFIG } from "../config";
import {
  daysSince, deriveTrend, deriveInsight, getRowSignal, getSparklinePoints,
} from "../lib/familySignals";

import "./FamilyQuickPreview.css";

// ═══════════════════════════════════════════════════════════
// §1  Local Types
// ═══════════════════════════════════════════════════════════

export interface FamilyConnection {
  readonly id: string;
  readonly name: string;
  readonly strength: number;
  readonly relationship: string;
  readonly trend: "up" | "down" | "stable";
}

export interface ClubBenchmarks {
  readonly avgEngagement: number;
  readonly avgBalance: number;
  readonly avgMemberCount: number;
}

interface TimelineEntry {
  readonly id: string;
  readonly text: string;
  readonly icon: LucideIcon;
  readonly color: string;
}

interface SmartAction {
  readonly id: string;
  readonly label: string;
  readonly reason: string;
  readonly priority: number;
  readonly icon: LucideIcon;
  readonly variant: "urgent" | "primary" | "secondary";
}

interface InsightStyle {
  readonly borderColor: string;
  readonly backgroundColor: string;
  readonly iconColor: string;
}

interface FamilyQuickPreviewProps {
  readonly family: Family | null;
  readonly onClose: () => void;
  readonly connections?: readonly FamilyConnection[];
  readonly clubBenchmarks?: ClubBenchmarks;
}

// ═══════════════════════════════════════════════════════════
// §2  Intelligence: Timeline Generator (P1)
// ═══════════════════════════════════════════════════════════

function generateTimeline(
  family: Family,
  connections?: readonly FamilyConnection[],
): readonly TimelineEntry[] {
  const entries: TimelineEntry[] = [];
  const trend = deriveTrend(family);

  if (trend === "down") {
    entries.push({
      id: "trend-down",
      text: `Engagement en descenso — ${family.engagementScore}/100`,
      icon: TrendingDown,
      color: "var(--color-rose-400)",
    });
  } else if (trend === "up" && family.engagementScore >= 55) {
    entries.push({
      id: "trend-up",
      text: `Engagement creciendo — ${family.engagementScore}/100`,
      icon: TrendingUp,
      color: "var(--color-emerald-400)",
    });
  }

  if (family.lastActivity) {
    const days = daysSince(family.lastActivity);
    if (days > 21) {
      entries.push({
        id: "inactive",
        text: `${days} días sin actividad registrada`,
        icon: Clock,
        color: days > 60 ? "var(--color-rose-400)" : "var(--color-amber-400)",
      });
    }
  }

  if (family.churnRisk === "high" || family.churnRisk === "critical") {
    entries.push({
      id: "churn",
      text: `Riesgo de churn: ${CHURN_CONFIG[family.churnRisk]?.label ?? family.churnRisk}`,
      icon: AlertTriangle,
      color: CHURN_CONFIG[family.churnRisk]?.color ?? "var(--color-rose-400)",
    });
  }

  if (connections) {
    const decaying = connections.filter((c) => c.trend === "down");
    if (decaying.length > 0) {
      entries.push({
        id: "conn-decay",
        text: `${decaying.length} conexión${decaying.length > 1 ? "es" : ""} debilitándose`,
        icon: LinkIcon,
        color: "var(--color-amber-400)",
      });
    }
  }

  if (entries.length < 2 && family.engagementScore >= 70) {
    entries.push({
      id: "positive",
      text: `Familia activa — ${family.engagementScore}/100 engagement`,
      icon: Sparkles,
      color: "var(--color-emerald-400)",
    });
  }

  return entries.slice(0, 4);
}

// ═══════════════════════════════════════════════════════════
// §3  Intelligence: Smart Actions (P4)
// ═══════════════════════════════════════════════════════════

function generateSmartActions(
  family: Family,
  connections?: readonly FamilyConnection[],
): readonly SmartAction[] {
  const actions: SmartAction[] = [];

  if (family.churnRisk === "high" || family.churnRisk === "critical") {
    actions.push({
      id: "call",
      label: "Llamada proactiva",
      reason: `Riesgo de churn ${family.churnRisk === "critical" ? "crítico" : "alto"}`,
      priority: 10,
      icon: Phone,
      variant: "urgent",
    });
  }

  if (family.engagementScore < 50) {
    actions.push({
      id: "activity",
      label: "Actividad personalizada",
      reason: `Engagement en ${family.engagementScore}/100`,
      priority: 8,
      icon: Calendar,
      variant: "primary",
    });
  }

  const strongCount = connections?.filter((c) => c.strength > 0.4).length ?? -1;
  if (connections && strongCount >= 0 && strongCount < 2) {
    actions.push({
      id: "introduce",
      label: "Presentar familia compatible",
      reason: "Pocas conexiones sociales fuertes",
      priority: 7,
      icon: Users,
      variant: "primary",
    });
  }

  if (family.engagementScore >= 80 && family.churnRisk === "low") {
    actions.push({
      id: "recognize",
      label: "Enviar reconocimiento",
      reason: "Alto engagement — reforzar comportamiento",
      priority: 5,
      icon: Award,
      variant: "secondary",
    });
  }

  actions.push({
    id: "profile",
    label: "Ver perfil completo",
    reason: `${family.memberCount} miembro${family.memberCount !== 1 ? "s" : ""} · ${TIER_CONFIG[family.tier]?.label ?? family.tier}`,
    priority: 1,
    icon: ExternalLink,
    variant: "secondary",
  });

  return [...actions].sort((a, b) => b.priority - a.priority).slice(0, 3);
}

// ═══════════════════════════════════════════════════════════
// §4  Insight Style Resolver
// ═══════════════════════════════════════════════════════════

function getInsightStyle(type: "positive" | "warning" | "alert"): InsightStyle {
  const map: Record<string, InsightStyle> = {
    positive: {
      borderColor: "color-mix(in srgb, var(--color-emerald-400) 25%, transparent)",
      backgroundColor: "color-mix(in srgb, var(--color-emerald-400) 4%, transparent)",
      iconColor: "var(--color-emerald-400)",
    },
    warning: {
      borderColor: "color-mix(in srgb, var(--color-amber-400) 25%, transparent)",
      backgroundColor: "color-mix(in srgb, var(--color-amber-400) 4%, transparent)",
      iconColor: "var(--color-amber-400)",
    },
    alert: {
      borderColor: "color-mix(in srgb, var(--color-rose-400) 25%, transparent)",
      backgroundColor: "color-mix(in srgb, var(--color-rose-400) 4%, transparent)",
      iconColor: "var(--color-rose-400)",
    },
  };
  return map[type] ?? map.warning;
}

// ═══════════════════════════════════════════════════════════
// §5  ConnectionRadar — SVG sub-component
// ═══════════════════════════════════════════════════════════

function ConnectionRadar({
  connections,
}: {
  readonly connections: readonly FamilyConnection[];
}) {
  const size = 72;
  const center = size / 2;
  const ringRadius = 24;
  const max = Math.min(connections.length, 5);

  return (
    <div className="fm-quickPreview__radar" aria-hidden="true">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={center}
          cy={center}
          r={ringRadius}
          fill="none"
          stroke="rgba(255,255,255,0.04)"
          strokeWidth="1"
        />
        {connections.slice(0, max).map((conn, i) => {
          const angle = (2 * Math.PI * i) / max - Math.PI / 2;
          const x = center + Math.cos(angle) * ringRadius;
          const y = center + Math.sin(angle) * ringRadius;
          const strengthLevel =
            conn.strength >= 0.7 ? "strong" : conn.strength >= 0.4 ? "medium" : "weak";
          return (
            <g key={conn.id}>
              <line
                x1={center}
                y1={center}
                x2={x}
                y2={y}
                className="fm-quickPreview__radar-line"
                data-strength={strengthLevel}
                strokeWidth="1"
                opacity={0.15 + conn.strength * 0.5}
              />
              <circle
                cx={x}
                cy={y}
                r={3}
                className="fm-quickPreview__radar-dot"
                data-strength={strengthLevel}
                opacity={0.9}
              />
              {conn.trend === "down" && (
                <circle
                  cx={x}
                  cy={y}
                  r={5}
                  fill="none"
                  className="fm-quickPreview__radar-pulse"
                  strokeWidth="1"
                  opacity="0.5"
                />
              )}
            </g>
          );
        })}
        <circle cx={center} cy={center} r={4} className="fm-quickPreview__radar-center" />
        <circle
          cx={center}
          cy={center}
          r={6}
          fill="none"
          className="fm-quickPreview__radar-center-ring"
          strokeWidth="0.75"
          opacity="0.25"
        />
      </svg>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// §6  Tenure Formatter
// ═══════════════════════════════════════════════════════════

function formatTenure(since: string): string {
  const days = daysSince(since);
  if (days < 30) return `${days} días`;
  if (days < 365) return `${Math.floor(days / 30)} meses`;
  return `${Math.floor(days / 365)} años`;
}

// ═══════════════════════════════════════════════════════════
// §7  FamilyQuickPreview — Main Component
// ═══════════════════════════════════════════════════════════

/**
 * FamilyQuickPreview — slide-in intelligence dialog.
 *
 * Displays a compact, intelligence-rich preview of a family
 * when the user hovers or clicks a row in the family list.
 *
 * Sections:
 *   1. Header: name, tier badge, status
 *   2. Intelligence Timeline: up to 4 contextual entries (P1)
 *   3. Metric Cards: engagement, balance, churn, tenure (P5)
 *   4. Cohort Tag: signal-based badge
 *   5. Predictive Insight: narrative-first card (P3)
 *   6. Social Position: connection stats + radar (P2, P6)
 *   7. Smart Actions: prioritized CTAs (P4)
 *
 * @example
 * <FamilyQuickPreview
 *   family={selectedFamily}
 *   onClose={() => setSelected(null)}
 *   connections={socialConnections}
 *   clubBenchmarks={benchmarks}
 * />
 */
export function FamilyQuickPreview({
  family,
  onClose,
  connections,
  clubBenchmarks,
}: FamilyQuickPreviewProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  // ── Animation state ──
  const [isVisible, setIsVisible] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (family) {
      setIsVisible(true);
      setIsClosing(false);
    }
  }, [family]);

  // ── Close handler with exit animation ──
  const handleClose = useCallback(() => {
    setIsClosing(true);
  }, []);

  useEffect(() => {
    if (!isClosing) return;
    const timer = setTimeout(() => {
      setIsVisible(false);
      setIsClosing(false);
      onClose();
    }, 280);
    return () => clearTimeout(timer);
  }, [isClosing, onClose]);

  // ── Escape key ──
  useEffect(() => {
    if (!family) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [family, handleClose]);

  // ── Focus trap ──
  useEffect(() => {
    if (family && !isClosing && panelRef.current) {
      panelRef.current.focus();
    }
  }, [family, isClosing]);

  // ── Intelligence computations (B-07) ──
  const timeline = useMemo(
    () => (family ? generateTimeline(family, connections) : []),
    [family, connections],
  );

  const actions = useMemo(
    () => (family ? generateSmartActions(family, connections) : []),
    [family, connections],
  );

  const trend = useMemo(
    () => (family ? deriveTrend(family) : "stable"),
    [family],
  );

  const insight = useMemo(
    () => (family ? deriveInsight(family) : null),
    [family],
  );

  const insightStyle = useMemo(
    () => (insight ? getInsightStyle(insight.type) : null),
    [insight],
  );

  const cohortTag = useMemo(
    () => (family ? getRowSignal(family) : null),
    [family],
  );

  const sparklinePoints = useMemo(
    () => (family ? getSparklinePoints(family) : []),
    [family],
  );

  const tenure = useMemo(
    () => (family ? formatTenure(family.since) : ""),
    [family],
  );

  // ── Social stats (P2) ──
  const connectionStats = useMemo(() => {
    if (!connections || connections.length === 0) return null;
    const strong = connections.filter((c) => c.strength >= 0.7).length;
    const atRisk = connections.filter((c) => c.trend === "down").length;
    return { total: connections.length, strong, atRisk };
  }, [connections]);

  // ── Guard ──
  if (!isVisible || !family) return null;

  // ── Config (safe access) ──
  const tierCfg = TIER_CONFIG[family.tier];
  const statusCfg = STATUS_CONFIG[family.status];
  const churnCfg = CHURN_CONFIG[family.churnRisk];

  const tierBadgeVariant =
    family.tier === "platino" ? "neutral" as const :
    family.tier === "oro" ? "gold" as const :
    family.tier === "plata" ? "info" as const :
    "warning" as const;

  const socialPosition =
    connectionStats
      ? connectionStats.strong >= 3 ? "Bien integrada en la red social"
        : connectionStats.strong >= 1 ? "Conexiones moderadas"
        : "Riesgo de aislamiento social"
      : null;

  return (
    <>
      {/* ══════ Backdrop ══════ */}
      <div
        className="fm-quickPreview__backdrop"
        data-closing={isClosing || undefined}
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* ══════ Panel ══════ */}
      <div
        ref={panelRef}
        className="fm-quickPreview"
        data-testid="family-quick-preview"
        data-closing={isClosing || undefined}
        role="dialog"
        aria-label={`Vista previa de ${family.familyName}`}
        aria-modal="true"
        tabIndex={-1}
      >
        <div className="fm-quickPreview__content">

          {/* ─── Header ─── */}
          <div className="fm-quickPreview__header">
            <div className="fm-quickPreview__header-info">
              <h2 className="fm-quickPreview__title">
                {family.familyName}
              </h2>
              <p className="fm-quickPreview__subtitle">
                {family.primaryContact.firstName}{" "}
                {family.primaryContact.lastName} · {family.memberCount}{" "}
                miembro{family.memberCount !== 1 ? "s" : ""}
              </p>
              <div className="fm-quickPreview__header-badges">
                <Badge variant={tierBadgeVariant} size="sm">
                  {tierCfg?.label ?? family.tier}
                </Badge>
                <span
                  className="fm-quickPreview__status-label"
                  style={{ "--qp-status-color": statusCfg?.color } as CSSProperties}
                >
                  <span className="fm-quickPreview__status-dot" />
                  {statusCfg?.label}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="fm-quickPreview__close-btn"
              onClick={handleClose}
              aria-label="Cerrar vista previa"
            >
              <X size={16} aria-hidden="true" />
            </button>
          </div>

          {/* ─── Intelligence Timeline (P1) ─── */}
          {timeline.length > 0 && (
            <section className="fm-quickPreview__section">
              <p className="fm-quickPreview__section-label">Inteligencia</p>
              <div className="fm-quickPreview__timeline">
                {timeline.map((entry) => {
                  const Icon = entry.icon;
                  return (
                    <div key={entry.id} className="fm-quickPreview__timeline-entry">
                      <Icon
                        size={12}
                        className="fm-quickPreview__timeline-icon"
                        style={{ "--qp-tl-color": entry.color } as CSSProperties}
                        aria-hidden="true"
                      />
                      <span className="fm-quickPreview__timeline-text">
                        {entry.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}

          {/* ─── Metric Cards (P5) ─── */}
          <section className="fm-quickPreview__section">
            <p className="fm-quickPreview__section-label">Métricas</p>
            <div className="fm-quickPreview__metrics">

              {/* Engagement */}
              <div className="fm-quickPreview__metric">
                <p className="fm-quickPreview__metric-label">Engagement</p>
                <div className="fm-quickPreview__metric-value">
                  <span className="fm-quickPreview__metric-number">
                    {family.engagementScore}
                  </span>
                  <TrendIcon trend={trend} size={13} />
                  {clubBenchmarks && (
                    <span
                      className="fm-quickPreview__metric-delta"
                      data-positive={family.engagementScore >= clubBenchmarks.avgEngagement || undefined}
                      data-negative={family.engagementScore < clubBenchmarks.avgEngagement || undefined}
                    >
                      {family.engagementScore >= clubBenchmarks.avgEngagement ? "+" : ""}
                      {family.engagementScore - clubBenchmarks.avgEngagement}
                    </span>
                  )}
                </div>
                <div className="fm-quickPreview__sparkline">
                  {sparklinePoints.map((h, i) => (
                    <div
                      key={i}
                      className="fm-quickPreview__sparkline-bar"
                      data-zone={family.engagementScore >= 70 ? "hot" : family.engagementScore >= 40 ? "warm" : "cold"}
                      style={
                                {
                                  "--qp-bar-height": `${Math.max(2, h * 14)}px`,
                                  "--qp-bar-opacity": 0.25 + (i / 6) * 0.75,
                                } as CSSProperties
                              }
                    />
                  ))}
                </div>
                {clubBenchmarks && (
                  <p className="fm-quickPreview__metric-benchmark">
                    vs {clubBenchmarks.avgEngagement} promedio
                  </p>
                )}
              </div>

              {/* Balance */}
              <div className="fm-quickPreview__metric">
                <p className="fm-quickPreview__metric-label">Saldo</p>
                <div className="fm-quickPreview__metric-value">
                  <span
                    className="fm-quickPreview__metric-number"
                    data-negative={family.totalBalance < 0 || undefined}
                    data-lg={family.totalBalance >= 100000 || undefined}
                  >
                    {formatCurrency(family.totalBalance)}
                  </span>
                </div>
                {clubBenchmarks && (
                  <p className="fm-quickPreview__metric-benchmark">
                    vs {formatCurrency(clubBenchmarks.avgBalance)} promedio
                  </p>
                )}
              </div>

              {/* Churn Risk */}
              <div className="fm-quickPreview__metric">
                <p className="fm-quickPreview__metric-label">Riesgo</p>
                <div className="fm-quickPreview__metric-value">
                  {family.churnRisk !== "low" && (
                    <AlertTriangle
                      size={13}
                      style={{ "--qp-churn-color": churnCfg?.color } as CSSProperties}
                      className="fm-quickPreview__churn-icon"
                      aria-hidden="true"
                    />
                  )}
                  <span
                    className="fm-quickPreview__churn-label"
                    style={{ "--qp-churn-color": churnCfg?.color } as CSSProperties}
                  >
                    {churnCfg?.label ?? family.churnRisk}
                  </span>
                </div>
              </div>

              {/* Tenure */}
              <div className="fm-quickPreview__metric">
                <p className="fm-quickPreview__metric-label">Antigüedad</p>
                <div className="fm-quickPreview__metric-value">
                  <Calendar size={13} className="fm-quickPreview__tenure-icon" aria-hidden="true" />
                  <span className="fm-quickPreview__tenure-value">
                    {tenure}
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* ─── Cohort Tag ─── */}
          {cohortTag && cohortTag.signal !== "none" && (
            <span
              className="fm-quickPreview__cohort-tag"
              style={
                        {
                          "--qp-cohort-color": cohortTag.color,
                          "--qp-cohort-bg": cohortTag.bgColor,
                        } as CSSProperties
                      }
            >
              <Sparkles size={10} aria-hidden="true" />
              {cohortTag.label}
            </span>
          )}

          {/* ─── Predictive Insight (P3) ─── */}
          {insight && insightStyle && (
            <section
              className="fm-quickPreview__insight"
              style={
                        {
                          "--qp-insight-border": insightStyle.borderColor,
                          "--qp-insight-bg": insightStyle.backgroundColor,
                          "--qp-insight-icon": insightStyle.iconColor,
                        } as CSSProperties
                      }
            >
              <div className="fm-quickPreview__insight-inner">
                <Sparkles
                  size={13}
                  className="fm-quickPreview__insight-icon"
                  aria-hidden="true"
                />
                <div>
                  <p className="fm-quickPreview__insight-badge">
                    Advisor Insight
                  </p>
                  <p className="fm-quickPreview__insight-text">
                    {insight.text}
                  </p>
                </div>
              </div>
            </section>
          )}

          {/* ─── Social Position + Connection Radar (P2, P6) ─── */}
          {connectionStats && connections && (
            <section className="fm-quickPreview__section">
              <p className="fm-quickPreview__section-label">Posición Social</p>
              <div className="fm-quickPreview__social">
                <div className="fm-quickPreview__social-info">
                  <p className="fm-quickPreview__social-stat">
                    {connectionStats.total} conexión{connectionStats.total !== 1 ? "es" : ""}
                    {" · "}
                    {connectionStats.strong} fuerte{connectionStats.strong !== 1 ? "s" : ""}
                    {connectionStats.atRisk > 0 && (
                      <span className="fm-quickPreview__social-atrisk">
                        {" · "}{connectionStats.atRisk} en riesgo
                      </span>
                    )}
                  </p>
                  <p className="fm-quickPreview__social-position">
                    {socialPosition}
                  </p>
                </div>
                <ConnectionRadar connections={connections} />
              </div>
            </section>
          )}

          {/* ─── Smart Actions (P4) ─── */}
          <section className="fm-quickPreview__actions" aria-label="Acciones sugeridas">
            {actions.map((action) => {
              const ActionIcon = action.icon;
              return (
                <button
                  key={action.id}
                  type="button"
                  className="fm-quickPreview__action"
                  data-variant={action.variant}
                >
                  <ActionIcon size={14} className="fm-quickPreview__action-icon" aria-hidden="true" />
                  <div className="fm-quickPreview__action-text">
                    <p className="fm-quickPreview__action-label">{action.label}</p>
                    <p className="fm-quickPreview__action-reason">{action.reason}</p>
                  </div>
                </button>
              );
            })}
            <Link
              to={`/admin/families/${family.id}`}
              className="fm-quickPreview__action"
              data-variant="secondary"
            >
              <ExternalLink size={14} className="fm-quickPreview__action-icon" aria-hidden="true" />
              <div className="fm-quickPreview__action-text">
                <p className="fm-quickPreview__action-label">Ver perfil completo</p>
                <p className="fm-quickPreview__action-reason">Análisis detallado y gestión</p>
              </div>
            </Link>
          </section>
        </div>
      </div>
    </>
  );
}