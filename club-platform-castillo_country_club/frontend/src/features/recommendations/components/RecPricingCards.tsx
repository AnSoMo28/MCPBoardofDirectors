// ═══════════════════════════════════════════════════════════════════════
// Recommendations — Pricing Cards (2027 REWRITE)
//
// Replaces: PricingOptimizer.tsx
//
// "The Ledger" — CRUD for pricing optimizations.
//
// Auto-loads list via MCP query "optimize_pricing" { action: "list" }.
// Create via MCP mutation "optimize_pricing" { action: "create" }.
//
// Dual layout: desktop table + mobile cards (responsive).
// Price change indicators: data-trend attribute.
// Strategy from PRICING_STRATEGY_CONFIG.
// Status from SUGGESTION_STATUS_CONFIG.
// Risk from getRiskLevelConfig.
//
// Glass namespace: .glass-rpo
// ═══════════════════════════════════════════════════════════════════════

import { useState, useCallback, useMemo } from "react";
import {
  DollarSign,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus,
  Calendar,
} from "lucide-react";

import { useMCPQuery, useMCPMutation } from "@/shared/hooks/useMCPQuery";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { Button } from "@/shared/components/ui/Button";
import { EmptyState } from "@/shared/components/ui/EmptyState";
import { showToast } from "@/shared/components/ui/Toast";
import { formatCurrency } from "@/shared/lib/utils";

import {
  PricingStrategy,
  PRICING_STRATEGY_CONFIG,
  SUGGESTION_STATUS_CONFIG,
  calculatePriceChangePct,
  formatPriceChangePct,
  getRiskLevelConfig,
  type PricingOptimization,
  type PricingListResponse,
  type PricingCreateResponse,
} from "../types";

import "./RecPricingCards.css";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface PricingForm {
  service_name: string;
  current_price: string;
  suggested_price: string;
  strategy: PricingStrategy;
  expected_revenue_change: string;
  expected_demand_change: string;
  reasoning: string;
  risk_level: string;
}

const INITIAL_FORM: PricingForm = {
  service_name: "",
  current_price: "",
  suggested_price: "",
  strategy: PricingStrategy.DemandBased,
  expected_revenue_change: "",
  expected_demand_change: "",
  reasoning: "",
  risk_level: "medium",
};

// ═══════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════

function getTrend(
  current: number,
  suggested: number,
): "positive" | "negative" | "flat" {
  const pct = calculatePriceChangePct(current, suggested);
  if (pct > 0) return "positive";
  if (pct < 0) return "negative";
  return "flat";
}

function TrendIcon({ trend }: { trend: "positive" | "negative" | "flat" }) {
  switch (trend) {
    case "positive":
      return <TrendingUp size={14} aria-hidden="true" />;
    case "negative":
      return <TrendingDown size={14} aria-hidden="true" />;
    default:
      return <Minus size={14} aria-hidden="true" />;
  }
}

// ═══════════════════════════════════════════════════════════════════════
// FORM FIELD
// ═══════════════════════════════════════════════════════════════════════

function FormField({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="rpo-field">
      <label htmlFor={htmlFor} className="rpo-field-label">
        {label}
        {required && <span className="rpo-field-required"> *</span>}
      </label>
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// PRICE CHANGE INDICATOR
// ═══════════════════════════════════════════════════════════════════════

function PriceChangeIndicator({
  current,
  suggested,
}: {
  current: number;
  suggested: number;
}) {
  const trend = getTrend(current, suggested);

  return (
    <div className="rpo-price-change" data-trend={trend}>
      <TrendIcon trend={trend} />
      <span className="rpo-price-change-pct">
        {formatPriceChangePct(current, suggested)}
      </span>
      <span className="rpo-price-change-range">
        ({formatCurrency(current)} → {formatCurrency(suggested)})
      </span>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MOBILE CARD
// ═══════════════════════════════════════════════════════════════════════

function PricingCard({
  pricing: p,
  isExpanded,
  onToggle,
}: {
  pricing: PricingOptimization;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  calculatePriceChangePct(p.current_price, p.suggested_price);
  const trend = getTrend(p.current_price, p.suggested_price);
  const statusConfig = SUGGESTION_STATUS_CONFIG[p.status];
  const strategyConfig = PRICING_STRATEGY_CONFIG[p.strategy];
  const riskCfg = getRiskLevelConfig(p.risk_level);

  return (
    <div
      className="rpo-card"
      data-status={p.status}
      data-trend={trend}
    >
      {/* Header */}
      <Button
        variant="unstyled"
        type="button"
        className="rpo-card-header"
        onClick={onToggle}
        aria-expanded={isExpanded}
      >
        <div className="rpo-card-header-left">
          <h4 className="rpo-card-title">{p.service_name}</h4>
          <div className="rpo-card-badges">
            <span className="rpo-badge rpo-badge--status" data-status={p.status}>
              {statusConfig?.label ?? p.status}
            </span>
            <span className="rpo-badge rpo-badge--strategy">
              {strategyConfig?.label ?? p.strategy}
            </span>
          </div>
        </div>
        <div className="rpo-card-header-right">
          <span className="rpo-card-change" data-trend={trend}>
            {formatPriceChangePct(p.current_price, p.suggested_price)}
          </span>
          {isExpanded ? (
            <ChevronUp size={16} aria-hidden="true" />
          ) : (
            <ChevronDown size={16} aria-hidden="true" />
          )}
        </div>
      </Button>

      {/* Price row */}
      <div className="rpo-card-prices">
        <div className="rpo-card-price">
          <span className="rpo-card-price-label">Actual</span>
          <span className="rpo-card-price-value">
            {formatCurrency(p.current_price)}
          </span>
        </div>
        <div className="rpo-card-price-arrow">
          <TrendIcon trend={trend} />
        </div>
        <div className="rpo-card-price rpo-card-price--right">
          <span className="rpo-card-price-label">Sugerido</span>
          <span className="rpo-card-price-value">
            {formatCurrency(p.suggested_price)}
          </span>
        </div>
      </div>

      {/* Meta */}
      <div className="rpo-card-meta">
        <span
          className="rpo-badge rpo-badge--risk"
          data-risk={p.risk_level}
        >
          Riesgo: {riskCfg.label}
        </span>
      </div>

      {/* Expanded */}
      {isExpanded && (
        <div className="rpo-card-detail">
          {p.reasoning && (
            <p className="rpo-card-reasoning">{p.reasoning}</p>
          )}
          <div className="rpo-card-stats">
            <div className="rpo-stat-cell">
              <span className="rpo-stat-label">Δ Revenue</span>
              <span className="rpo-stat-value">
                {formatCurrency(p.expected_revenue_change)}
              </span>
            </div>
            <div className="rpo-stat-cell">
              <span className="rpo-stat-label">Δ Demanda</span>
              <span className="rpo-stat-value">
                {p.expected_demand_change >= 0 ? "+" : ""}
                {p.expected_demand_change.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// DETAIL PANEL
// ═══════════════════════════════════════════════════════════════════════

function PricingDetailPanel({ pricing }: { pricing: PricingOptimization }) {
  const trend = getTrend(pricing.current_price, pricing.suggested_price);
  const statusConfig = SUGGESTION_STATUS_CONFIG[pricing.status];
  const strategyConfig = PRICING_STRATEGY_CONFIG[pricing.strategy];
  const riskCfg = getRiskLevelConfig(pricing.risk_level);

  return (
    <div className="rpo-detail-panel" data-status={pricing.status}>
      {/* Header */}
      <div className="rpo-detail-header">
        <h3 className="rpo-detail-title">{pricing.service_name}</h3>
        <span className="rpo-badge rpo-badge--status" data-status={pricing.status}>
          {statusConfig?.label ?? pricing.status}
        </span>
      </div>

      {/* Price comparison */}
      <div className="rpo-detail-prices">
        <div className="rpo-detail-price-cell">
          <span className="rpo-detail-price-label">Precio Actual</span>
          <span className="rpo-detail-price-value">
            {formatCurrency(pricing.current_price)}
          </span>
        </div>
        <div className="rpo-detail-price-cell" data-trend={trend}>
          <span className="rpo-detail-price-label">Cambio</span>
          <span className="rpo-detail-price-value rpo-detail-price-change" data-trend={trend}>
            {formatPriceChangePct(pricing.current_price, pricing.suggested_price)}
          </span>
        </div>
        <div className="rpo-detail-price-cell">
          <span className="rpo-detail-price-label">Precio Sugerido</span>
          <span className="rpo-detail-price-value">
            {formatCurrency(pricing.suggested_price)}
          </span>
        </div>
      </div>

      {/* Meta grid */}
      <div className="rpo-detail-meta-grid">
        <div className="rpo-meta-cell">
          <span className="rpo-meta-label">Estrategia</span>
          <span className="rpo-meta-value">
            {strategyConfig?.label ?? pricing.strategy}
          </span>
        </div>
        <div className="rpo-meta-cell">
          <span className="rpo-meta-label">Riesgo</span>
          <span className="rpo-meta-value" data-risk={pricing.risk_level}>
            {riskCfg.label}
          </span>
        </div>
        <div className="rpo-meta-cell">
          <span className="rpo-meta-label">Δ Revenue</span>
          <span className="rpo-meta-value">
            {formatCurrency(pricing.expected_revenue_change)}
          </span>
        </div>
        <div className="rpo-meta-cell">
          <span className="rpo-meta-label">Δ Demanda</span>
          <span className="rpo-meta-value">
            {pricing.expected_demand_change >= 0 ? "+" : ""}
            {pricing.expected_demand_change.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* Reasoning */}
      {pricing.reasoning && (
        <div className="rpo-detail-reasoning">
          <span className="rpo-detail-reasoning-title">Justificación</span>
          <p className="rpo-detail-reasoning-text">{pricing.reasoning}</p>
        </div>
      )}

      {/* Timestamps */}
      <div className="rpo-detail-timestamps">
        <span>
          <Calendar size={10} aria-hidden="true" />
          Creado: {new Date(pricing.created_at).toLocaleDateString("es-CR")}
        </span>
        {pricing.updated_at && (
          <span>
            Actualizado: {new Date(pricing.updated_at).toLocaleDateString("es-CR")}
          </span>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function PricingOptimizer() {
  useReducedMotion();

  // ── State ─────────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [form, setForm] = useState<PricingForm>({ ...INITIAL_FORM });

  // ── List query (auto-load) ────────────────────────────────────────
  const { data: listData, isLoading } = useMCPQuery<PricingListResponse>(
    "proactive_recommendation",
    "optimize_pricing",
    { action: "list" },
    { staleTime: 60_000 },
  );

  // ── Create mutation ───────────────────────────────────────────────
  const createMutation = useMCPMutation<PricingCreateResponse>(
    "proactive_recommendation",
    "optimize_pricing",
    {
      onSuccess: (data) => {
        showToast({
          type: "success",
          message:
            data?.message ??
            "Optimización de precio registrada. Esperando aprobación.",
        });
        resetForm();
      },
    },
  );

  // ── Handlers ──────────────────────────────────────────────────────
  const resetForm = useCallback(() => {
    setForm({ ...INITIAL_FORM });
    setShowForm(false);
  }, []);

  const updateField = useCallback(
    (field: keyof PricingForm, value: string) => {
      setForm((prev) => ({ ...prev, [field]: value }));
    },
    [],
  );

  const isFormValid =
    form.service_name.trim().length > 0 &&
    Number(form.current_price) > 0 &&
    Number(form.suggested_price) > 0;

  const handleSubmit = useCallback(() => {
    if (!isFormValid) return;
    createMutation.mutate({
      action: "create",
      service_name: form.service_name,
      current_price: Number(form.current_price),
      suggested_price: Number(form.suggested_price),
      strategy: form.strategy,
      expected_revenue_change: Number(form.expected_revenue_change) || 0,
      expected_demand_change: Number(form.expected_demand_change) || 0,
      reasoning: form.reasoning,
      risk_level: form.risk_level,
    });
  }, [form, isFormValid, createMutation]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  }, []);

  const pricings = listData?.pricings ?? [];

  // ── Expanded pricing ──────────────────────────────────────────────
  const expandedPricing = useMemo(
    () => pricings.find((p) => p.id === expandedId) ?? null,
    [pricings, expandedId],
  );

  // ── Loading ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="glass-rpo">
        <div className="rpo-loading">
          <div className="rpo-skeleton rpo-skeleton--header" />
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="rpo-skeleton rpo-skeleton--row"
              style={
                {
                  "--skeleton-delay": `${i * 100}ms`,
                } as React.CSSProperties
              }
            />
          ))}
        </div>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────
  return (
    <div className="glass-rpo" role="region" aria-label="Optimización de precios">
      {/* ── Header strip ────────────────────────────────────────────── */}
      <div className="rpo-header-strip">
        <span className="rpo-header-count">
          {pricings.length} optimizaci{pricings.length !== 1 ? "ones" : "ón"} registrada
          {pricings.length !== 1 ? "s" : ""}
        </span>
        <Button
          variant="primary"
          onClick={() => setShowForm((prev) => !prev)}
        >
          {showForm ? "Cancelar" : "Nueva Optimización"}
        </Button>
      </div>

      {/* ── Create form ─────────────────────────────────────────────── */}
      {showForm && (
        <div className="rpo-create-form">
          <div className="rpo-form-grid">
            <FormField label="Servicio" htmlFor="rpo-service" required>
              <input
                id="rpo-service"
                className="rpo-input"
                placeholder="Clases de Yoga"
                value={form.service_name}
                onChange={(e) => updateField("service_name", e.target.value)}
              />
            </FormField>

            <FormField label="Estrategia">
              <select
                className="rpo-select"
                value={form.strategy}
                onChange={(e) => updateField("strategy", e.target.value)}
              >
                {Object.values(PricingStrategy).map((s) => (
                  <option key={s} value={s}>
                    {PRICING_STRATEGY_CONFIG[s].label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Precio Actual (₡)" htmlFor="rpo-current" required>
              <input
                id="rpo-current"
                className="rpo-input"
                type="number"
                min={0}
                placeholder="18000"
                value={form.current_price}
                onChange={(e) => updateField("current_price", e.target.value)}
              />
            </FormField>

            <FormField label="Precio Sugerido (₡)" htmlFor="rpo-suggested" required>
              <input
                id="rpo-suggested"
                className="rpo-input"
                type="number"
                min={0}
                placeholder="22500"
                value={form.suggested_price}
                onChange={(e) => updateField("suggested_price", e.target.value)}
              />
            </FormField>

            <FormField label="Cambio Revenue Esperado (₡)" htmlFor="rpo-revenue">
              <input
                id="rpo-revenue"
                className="rpo-input"
                type="number"
                placeholder="45000"
                value={form.expected_revenue_change}
                onChange={(e) =>
                  updateField("expected_revenue_change", e.target.value)
                }
              />
            </FormField>

            <FormField label="Cambio Demanda Esperado (%)" htmlFor="rpo-demand">
              <input
                id="rpo-demand"
                className="rpo-input"
                type="number"
                placeholder="15"
                value={form.expected_demand_change}
                onChange={(e) =>
                  updateField("expected_demand_change", e.target.value)
                }
              />
            </FormField>

            <FormField label="Nivel de Riesgo">
              <select
                className="rpo-select"
                value={form.risk_level}
                onChange={(e) => updateField("risk_level", e.target.value)}
              >
                <option value="low">Bajo</option>
                <option value="medium">Medio</option>
                <option value="high">Alto</option>
              </select>
            </FormField>

            {/* Price change preview */}
            {Number(form.current_price) > 0 &&
              Number(form.suggested_price) > 0 && (
                <div className="rpo-form-preview">
                  <PriceChangeIndicator
                    current={Number(form.current_price)}
                    suggested={Number(form.suggested_price)}
                  />
                </div>
              )}
          </div>

          {/* Reasoning */}
          <FormField label="Justificación">
            <textarea
              className="rpo-textarea"
              placeholder="Describa la razón de la optimización de precio..."
              value={form.reasoning}
              onChange={(e) => updateField("reasoning", e.target.value)}
              rows={3}
            />
          </FormField>

          {/* Actions */}
          <div className="rpo-form-actions">
            <Button variant="ghost" onClick={resetForm}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              onClick={handleSubmit}
              disabled={!isFormValid || createMutation.isPending}
            >
              {createMutation.isPending
                ? "Registrando..."
                : "Registrar Optimización"}
            </Button>
          </div>
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────────── */}
      {pricings.length === 0 && !showForm && (
        <div className="rpo-empty-wrap">
          <EmptyState
            icon={<DollarSign size={32} className="rpo-empty-icon" />}
            title="Sin optimizaciones de precio"
            description="Cree su primera optimización de precio para enviarla a aprobación."
            action={
              <Button variant="primary" onClick={() => setShowForm(true)}>
                Nueva Optimización
              </Button>
            }
          />
        </div>
      )}

      {/* ── Desktop table ────────────────────────────────────────────── */}
      {pricings.length > 0 && (
        <>
          <div className="rpo-table-wrap">
            <table className="rpo-table" role="table">
              <thead>
                <tr className="rpo-table-header-row">
                  <th className="rpo-th">Servicio</th>
                  <th className="rpo-th">Estrategia</th>
                  <th className="rpo-th rpo-th--right">Actual</th>
                  <th className="rpo-th rpo-th--right">Sugerido</th>
                  <th className="rpo-th rpo-th--right">Δ</th>
                  <th className="rpo-th">Estado</th>
                  <th className="rpo-th rpo-th--narrow" />
                </tr>
              </thead>
              <tbody>
                {pricings.map((p, idx) => {
                  const isExpanded = expandedId === p.id;
                  calculatePriceChangePct(
                                        p.current_price,
                                        p.suggested_price,
                                      );
                  const trend = getTrend(p.current_price, p.suggested_price);
                  const statusConfig = SUGGESTION_STATUS_CONFIG[p.status];

                  return (
                    <tr
                      key={p.id}
                      className="rpo-table-row"
                      data-expanded={isExpanded ? "" : undefined}
                      onClick={() => toggleExpand(p.id)}
                      role="row"
                      aria-expanded={isExpanded}
                      style={
                        {
                          "--stagger-i": idx,
                        } as React.CSSProperties
                      }
                    >
                      <td className="rpo-td rpo-td--service">
                        {p.service_name}
                      </td>
                      <td className="rpo-td">
                        <span className="rpo-badge rpo-badge--strategy">
                          {PRICING_STRATEGY_CONFIG[p.strategy]?.label ?? p.strategy}
                        </span>
                      </td>
                      <td className="rpo-td rpo-td--right rpo-td--mono">
                        {formatCurrency(p.current_price)}
                      </td>
                      <td className="rpo-td rpo-td--right rpo-td--mono">
                        {formatCurrency(p.suggested_price)}
                      </td>
                      <td className="rpo-td rpo-td--right">
                        <span className="rpo-table-change" data-trend={trend}>
                          {formatPriceChangePct(p.current_price, p.suggested_price)}
                        </span>
                      </td>
                      <td className="rpo-td">
                        <span className="rpo-badge rpo-badge--status" data-status={p.status}>
                          {statusConfig?.label ?? p.status}
                        </span>
                      </td>
                      <td className="rpo-td rpo-td--center">
                        {isExpanded ? (
                          <ChevronUp size={14} aria-hidden="true" className="rpo-expand-icon" />
                        ) : (
                          <ChevronDown size={14} aria-hidden="true" className="rpo-expand-icon" />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* ── Mobile cards ──────────────────────────────────────────── */}
          <div className="rpo-mobile-cards">
            {pricings.map((p) => (
              <PricingCard
                key={p.id}
                pricing={p}
                isExpanded={expandedId === p.id}
                onToggle={() => toggleExpand(p.id)}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Expanded detail panel ───────────────────────────────────── */}
      {expandedPricing && (
        <PricingDetailPanel pricing={expandedPricing} />
      )}
    </div>
  );
}