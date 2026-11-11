/* ═══════════════════════════════════════════════════════════════
   features/wellness/components/WellnessRiskRadar.tsx
   v37 rewrite — Silver Tide Glass UI

   Castillo Country Club — Wellness Risk Radar
   Early warning system — on-demand anomaly detection.

   Proposals: P1 Watchtower · P2 Compliance · P3 CSS Stagger ·
     P4 Data Attributes · P5 Deep Scan · P6 Silence ·
     P7 Summary · P8 Glass CSS
   ═══════════════════════════════════════════════════════════════ */

import { useEffect, useState, useCallback } from "react";
import {
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle,
  TrendingDown,
  ArrowDown,
  RefreshCw,
  UserX,
  CalendarDays,
  UserMinus,
  Search,
  ChevronRight,
  ChevronDown,
  X,
  Activity,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { useMCPQuery } from "@/shared/hooks/useMCPQuery";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { Skeleton } from "@/shared/components/ui/Skeleton";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import type {
  WellnessAnomaliesResponse,
  WellnessAnomaly,
  WellnessAlert,
  AnomalySeverity,
  AnomalyType,
} from "../types";
import "./WellnessRiskRadar.css";

// ═══════════════════════════════════════════════════════════════
// §1  Configuration maps
// ═══════════════════════════════════════════════════════════════

const ANOMALY_TYPE_CONFIG: Record<
  AnomalyType,
  { label: string; icon: LucideIcon }
> = {
  sudden_drop: { label: "Caída súbita", icon: TrendingDown },
  gradual_decline: { label: "Caída gradual", icon: ArrowDown },
  monotony: { label: "Monotonía", icon: RefreshCw },
  post_event_abandon: { label: "Abandono post-evento", icon: UserX },
  seasonal_pattern: { label: "Patrón estacional", icon: CalendarDays },
  social_isolation: { label: "Aislamiento social", icon: UserMinus },
};

const BADGE_VARIANT_MAP: Record<
  AnomalySeverity,
  "danger" | "warning" | "default"
> = {
  critical: "danger",
  high: "danger",
  medium: "warning",
  low: "default",
};

const SEVERITY_LABELS: Record<AnomalySeverity, string> = {
  critical: "Crítico",
  high: "Alto",
  medium: "Medio",
  low: "Bajo",
};

// ═══════════════════════════════════════════════════════════════
// §2  Props
// ═══════════════════════════════════════════════════════════════

interface WellnessRiskRadarProps {
  familyId: string;
}

// ═══════════════════════════════════════════════════════════════
// §3  AlertBanner
// ═══════════════════════════════════════════════════════════════

function AlertBanner({
  alert,
  index,
  onDismiss,
}: {
  alert: WellnessAlert;
  index: number;
  onDismiss: () => void;
}) {
  const config = {
    critical: { icon: AlertTriangle as LucideIcon },
    warning: { icon: AlertTriangle as LucideIcon },
    info: { icon: Info as LucideIcon },
  }[alert.level] ?? { icon: Info as LucideIcon };

  const Icon = config.icon;

  return (
    <div
      className="wrr__alert wrr__stagger"
      data-level={alert.level}
      style={{ "--stagger-i": index } as React.CSSProperties}
      role="alert"
    >
      <span className="wrr__alert-icon">
        <Icon className="w-5 h-5" aria-hidden="true" />
      </span>
      <p className="wrr__alert-msg">{alert.message}</p>
      <Button
        variant="unstyled"
        className="wrr__alert-dismiss"
        onClick={onDismiss}
        type="button"
        aria-label="Descartar alerta"
      >
        <X size={14} />
      </Button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// §4  AnomalyCard
// ═══════════════════════════════════════════════════════════════

function AnomalyCard({
  anomaly,
  index,
  isExpanded,
  onToggle,
}: {
  anomaly: WellnessAnomaly;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const typeCfg = ANOMALY_TYPE_CONFIG[anomaly.type] ?? {
    label: anomaly.type,
    icon: Activity as LucideIcon,
  };
  const TypeIcon = typeCfg.icon;

  const changePercent =
    anomaly.expected_value > 0
      ? Math.round(
          ((anomaly.actual_value - anomaly.expected_value) /
            anomaly.expected_value) * 100,
        )
      : 0;

  return (
    <div
      className="wrr__anomaly wrr__stagger"
      data-severity={anomaly.severity}
      data-expanded={isExpanded ? "" : undefined}
      style={{ "--stagger-i": index } as React.CSSProperties}
    >
      {/* Severity bar */}
      <div className="wrr__severity-bar" aria-hidden="true" />

      <div className="wrr__anomaly-content">
        {/* Header (always visible, clickable) */}
        <Button
          variant="unstyled"
          className="wrr__anomaly-header"
          onClick={onToggle}
          type="button"
          aria-expanded={isExpanded}
        >
          <div className="wrr__anomaly-meta">
            <span className="wrr__type-icon">
              <TypeIcon className="w-3.5 h-3.5" aria-hidden="true" />
            </span>
            <span className="wrr__type-label">{typeCfg.label}</span>
            <Badge variant={BADGE_VARIANT_MAP[anomaly.severity]} size="sm">
              {SEVERITY_LABELS[anomaly.severity]}
            </Badge>
          </div>
          <ChevronDown className="wrr__expand-icon w-4 h-4" aria-hidden="true" />
        </Button>

        {/* Metric row (always visible) */}
        <div className="wrr__metric-row">
          <p className="wrr__metric-name">{anomaly.metric}</p>
          <div className="wrr__metric-values">
            <span className="wrr__metric-label">Esperado:</span>
            <span className="wrr__metric-expected">{anomaly.expected_value}</span>
            <span className="wrr__metric-label">Actual:</span>
            <span className="wrr__metric-actual">{anomaly.actual_value}</span>
            {changePercent !== 0 && (
              <span className="wrr__metric-change">
                {changePercent > 0 ? "+" : ""}
                {changePercent}%
              </span>
            )}
          </div>
        </div>

        {/* Expandable body (P5) */}
        <div className="wrr__anomaly-body">
          <p className="wrr__anomaly-desc">{anomaly.description}</p>

          <div className="wrr__suggested">
            <span className="wrr__suggested-icon">
              <ChevronRight className="w-4 h-4" aria-hidden="true" />
            </span>
            <p className="wrr__suggested-text">
              <span className="wrr__suggested-label">Acción sugerida: </span>
              {anomaly.suggested_action}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// §5  Component
// ═══════════════════════════════════════════════════════════════

export function WellnessRiskRadar({ familyId }: WellnessRiskRadarProps) {
  const prefersReducedMotion = useReducedMotion();
  const [shouldFetch, setShouldFetch] = useState(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [dismissedAlerts, setDismissedAlerts] = useState<Set<number>>(
    new Set(),
  );

  // ── On-demand query ──
  const {
    data: anomaliesResp,
    isLoading,
    error,
    refetch,
  } = useMCPQuery<WellnessAnomaliesResponse>(
    "wellness",
    "wellness_anomalies",
    { family_id: familyId },
    { enabled: shouldFetch, staleTime: 300_000 },
  );

  const anomalies = anomaliesResp?.data?.anomalies ?? [];
  const alerts = anomaliesResp?.data?.alerts ?? [];

  // ── Reveal after data loads ──
  useEffect(() => {
    if (isLoading || prefersReducedMotion) {
      setIsRevealed(!isLoading && shouldFetch);
      return;
    }
    if (shouldFetch && anomaliesResp) {
      const timer = setTimeout(() => setIsRevealed(true), 100);
      return () => clearTimeout(timer);
    }
  }, [isLoading, anomaliesResp, shouldFetch, prefersReducedMotion]);

  // ── Handlers ──
  const toggleExpand = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const dismissAlert = useCallback((index: number) => {
    setDismissedAlerts((prev) => new Set(prev).add(index));
  }, []);

  // ── Derived ──
  const visibleAlerts = alerts.filter((_, i) => !dismissedAlerts.has(i));

  const severityCounts = anomalies.reduce(
    (acc, a) => {
      acc[a.severity] = (acc[a.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  const hasCritical =
    (severityCounts.critical ?? 0) > 0 || (severityCounts.high ?? 0) > 0;

  // ── Initial trigger state ──
  if (!shouldFetch) {
    return (
      <div className="glass-wrr">
        <div className="wrr__trigger">
          <span className="wrr__trigger-icon">
            <ShieldAlert className="w-8 h-8" />
          </span>
          <h3 className="wrr__trigger-title">Radar de Bienestar</h3>
          <p className="wrr__trigger-desc">
            Ejecuta la detección de patrones para identificar anomalías,
            riesgos de abandono y oportunidades de mejora.
          </p>
          <Button
            variant="primary"
            onClick={() => setShouldFetch(true)}
            className="min-h-[44px]"
          >
            <Search className="w-4 h-4 mr-2" />
            Ejecutar Detección de Patrones
          </Button>
        </div>
      </div>
    );
  }

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="glass-wrr">
        <div className="wrr__loading">
          <Skeleton className="h-20 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>
    );
  }

  // ── Error ──
  if (error) {
    return (
      <div className="glass-wrr">
        <EmptyState
          icon={<AlertTriangle size={28} />}
          title="Error en la detección"
          description="No se pudo completar el análisis de patrones de bienestar."
          action={
            <Button
              variant="primary"
              onClick={() => refetch?.()}
              className="min-h-[44px]"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Reintentar
            </Button>
          }
        />
      </div>
    );
  }

  // ── No anomalies (happy path) ──
  if (anomalies.length === 0 && alerts.length === 0) {
    return (
      <div className="glass-wrr">
        <div className="wrr__happy">
          <span className="wrr__happy-icon">
            <CheckCircle className="w-12 h-12" />
          </span>
          <h3 className="wrr__happy-title">Sin Anomalías Detectadas</h3>
          <p className="wrr__happy-desc">
            El patrón de bienestar es saludable. No se detectaron riesgos
            ni anomalías en este momento.
          </p>
        </div>
      </div>
    );
  }

  // ═══ Results ═══
  return (
    <div
      className="glass-wrr"
      data-revealed={isRevealed ? "" : undefined}
      data-has-critical={hasCritical ? "" : undefined}
    >
      {/* Scan line for critical (P1) */}
      {hasCritical && <div className="wrr__scanline" aria-hidden="true" />}

      {/* ── Summary Header (P7) ── */}
      <div className="wrr__summary">
        <div className="wrr__summary-left">
          <span className="wrr__summary-icon">
            {hasCritical ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <CheckCircle className="w-5 h-5" />
            )}
          </span>
          <div>
            <h3 className="wrr__summary-title">
              {anomalies.length} anomalía{anomalies.length !== 1 && "s"}{" "}
              detectada{anomalies.length !== 1 && "s"}
            </h3>
            <p className="wrr__summary-sub">
              {visibleAlerts.length} alerta{visibleAlerts.length !== 1 && "s"}{" "}
              activa{visibleAlerts.length !== 1 && "s"}
            </p>
          </div>
        </div>
        <div className="wrr__summary-badges">
          {(["critical", "high", "medium", "low"] as const).map((sev) => {
            const count = severityCounts[sev];
            if (!count) return null;
            return (
              <Badge key={sev} variant={BADGE_VARIANT_MAP[sev]} size="sm">
                {count} {SEVERITY_LABELS[sev]}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* ── Alert Banners (P6: dismiss) ── */}
      {visibleAlerts.length > 0 && (
        <div className="wrr__alerts">
          {visibleAlerts.map((alert, i) => {
            const originalIdx = alerts.indexOf(alert);
            return (
              <AlertBanner
                key={originalIdx}
                alert={alert}
                index={i}
                onDismiss={() => dismissAlert(originalIdx)}
              />
            );
          })}
        </div>
      )}

      {/* ── Anomaly Cards (P4: data-severity, P5: expand) ── */}
      <div className="wrr__anomalies">
        {anomalies.map((anomaly, i) => (
          <AnomalyCard
            key={anomaly.id}
            anomaly={anomaly}
            index={i}
            isExpanded={expandedIds.has(anomaly.id)}
            onToggle={() => toggleExpand(anomaly.id)}
          />
        ))}
      </div>

      {/* ── Refresh ── */}
      <div className="wrr__refresh">
        <Button
          variant="ghost"
          onClick={() => {
            setIsRevealed(false);
            setDismissedAlerts(new Set());
            refetch?.();
          }}
          className="min-h-[44px]"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Actualizar detección
        </Button>
      </div>
    </div>
  );
}