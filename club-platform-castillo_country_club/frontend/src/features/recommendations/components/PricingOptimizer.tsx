// src/features/recommendations/components/PricingOptimizer.tsx
// Fase 10, B4 — CRUD pricing optimizations + create HITL

import { useState, useCallback } from "react";
import {
  DollarSign,
  Plus,
  X,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  TrendingDown,
  Minus
} from "lucide-react";

import { useMCPQuery, useMCPMutation } from "@/shared/hooks/useMCPQuery";
import { useReducedMotion } from "@/shared/hooks/useReducedMotion";
import { useBreakpoint } from "@/shared/hooks/useBreakpoint";
import { Card } from "@/shared/components/ui/Card";
import { Button } from "@/shared/components/ui/Button";
import { Badge } from "@/shared/components/ui/Badge";
import { Input } from "@/shared/components/ui/Input";
import { FormField } from "@/shared/components/ui/FormField";
import { Skeleton } from "@/shared/components/ui/Skeleton";
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

// ── Main Component ─────────────────────────────────────────

export function PricingOptimizer() {
  const prefersReduced = useReducedMotion();
  useBreakpoint();

  // ── State ──
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // ── Form state ──
  const [form, setForm] = useState({
    service_name: "",
    current_price: "",
    suggested_price: "",
    strategy: PricingStrategy.DemandBased,
    expected_revenue_change: "",
    expected_demand_change: "",
    reasoning: "",
    risk_level: "medium",
  });

  // ── Level 1: List auto-load ──
  const {
    data: listData,
    isLoading,
  } = useMCPQuery<PricingListResponse>(
    "proactive_recommendation",
    "optimize_pricing",
    { action: "list" },
    { staleTime: 60_000 },
  );

  // ── Create mutation ──
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

  // ── Handlers ──
  const resetForm = useCallback(() => {
    setForm({
      service_name: "",
      current_price: "",
      suggested_price: "",
      strategy: PricingStrategy.DemandBased,
      expected_revenue_change: "",
      expected_demand_change: "",
      reasoning: "",
      risk_level: "medium",
    });
    setShowForm(false);
  }, []);

  const updateField = useCallback(
    (field: string, value: string) => {
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

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-48 rounded-[var(--radius-md)]" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 rounded-[var(--radius-md)]" />
        ))}
      </div>
    );
  }

  // ── Render ──
  return (
    <div
      className="space-y-5"
      role="region"
      aria-label="Optimización de precios"
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-[var(--color-silver-400)]">
          {pricings.length} optimizaci
          {pricings.length !== 1 ? "ones" : "ón"} registrada
          {pricings.length !== 1 ? "s" : ""}
        </p>
        <Button
          variant="primary"
          size="sm"
          icon={showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
          onClick={() => setShowForm((prev) => !prev)}
        >
          {showForm ? "Cancelar" : "Nueva Optimización"}
        </Button>
      </div>

      {/* ── Create Form ── */}
      {showForm && (
        <Card
          className={`p-5 space-y-4 ${
            prefersReduced
              ? ""
              : "opacity-0 animate-[slideDown_0.3s_ease_forwards]"
          }`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Servicio" required>
              <Input
                placeholder="Clases de Yoga"
                value={form.service_name}
                onChange={(e) => updateField("service_name", e.target.value)}
              />
            </FormField>

            <FormField label="Estrategia">
              <select
                value={form.strategy}
                onChange={(e) => updateField("strategy", e.target.value)}
                className="w-full h-10 px-3 rounded-[var(--radius-md)]
                           bg-[var(--color-surface-1)] border border-white/[0.08]
                           text-sm font-ui text-[var(--color-silver-200)]
                           focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]"
              >
                {Object.values(PricingStrategy).map((s) => (
                  <option key={s} value={s}>
                    {PRICING_STRATEGY_CONFIG[s].label}
                  </option>
                ))}
              </select>
            </FormField>

            <FormField label="Precio Actual (₡)" required>
              <Input
                type="number"
                min={0}
                placeholder="18000"
                value={form.current_price}
                onChange={(e) => updateField("current_price", e.target.value)}
              />
            </FormField>

            <FormField label="Precio Sugerido (₡)" required>
              <Input
                type="number"
                min={0}
                placeholder="22500"
                value={form.suggested_price}
                onChange={(e) =>
                  updateField("suggested_price", e.target.value)
                }
              />
            </FormField>

            <FormField label="Cambio Revenue Esperado (₡)">
              <Input
                type="number"
                placeholder="45000"
                value={form.expected_revenue_change}
                onChange={(e) =>
                  updateField("expected_revenue_change", e.target.value)
                }
              />
            </FormField>

            <FormField label="Cambio Demanda Esperado (%)">
              <Input
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
                value={form.risk_level}
                onChange={(e) => updateField("risk_level", e.target.value)}
                className="w-full h-10 px-3 rounded-[var(--radius-md)]
                           bg-[var(--color-surface-1)] border border-white/[0.08]
                           text-sm font-ui text-[var(--color-silver-200)]
                           focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]"
              >
                <option value="low">Bajo</option>
                <option value="medium">Medio</option>
                <option value="high">Alto</option>
              </select>
            </FormField>

            {/* Price change preview */}
            {Number(form.current_price) > 0 &&
              Number(form.suggested_price) > 0 && (
                <div className="flex items-center gap-3 p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-0)] border border-white/[0.06]">
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
              placeholder="Describa la razón de la optimización de precio..."
              value={form.reasoning}
              onChange={(e) => updateField("reasoning", e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 rounded-[var(--radius-md)]
                         bg-[var(--color-surface-1)] border border-white/[0.08]
                         text-sm font-ui text-[var(--color-silver-200)] placeholder:text-[var(--color-silver-500)]
                         resize-y min-h-[80px]
                         focus-visible:outline-2 focus-visible:outline-[var(--color-gold-400)]"
            />
          </FormField>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={resetForm}>
              Cancelar
            </Button>
            <Button
              variant="primary"
              icon={<DollarSign className="w-4 h-4" />}
              onClick={handleSubmit}
              disabled={!isFormValid || createMutation.isPending}
            >
              {createMutation.isPending
                ? "Registrando..."
                : "Registrar Optimización"}
            </Button>
          </div>
        </Card>
      )}

      {/* ── Empty ── */}
      {pricings.length === 0 && !showForm && (
        <EmptyState
          icon={
            <DollarSign className="w-8 h-8 text-[var(--color-silver-500)]" />
          }
          title="Sin optimizaciones de precio"
          description="Cree su primera optimización de precio para enviarla a aprobación."
          action={{
            label: "Nueva Optimización",
            onClick: () => setShowForm(true),
          }}
        />
      )}

      {/* ── Desktop table ── */}
      {pricings.length > 0 && (
        <>
          <div className="hidden sm:block">
            <div className="rounded-[var(--radius-lg)] border border-white/[0.08] overflow-hidden">
              <table className="w-full text-sm" role="table">
                <thead>
                  <tr className="bg-[var(--color-surface-1)]">
                    <th className="px-4 py-3 text-left font-ui font-medium text-[var(--color-silver-400)] text-xs">
                      Servicio
                    </th>
                    <th className="px-4 py-3 text-left font-ui font-medium text-[var(--color-silver-400)] text-xs">
                      Estrategia
                    </th>
                    <th className="px-4 py-3 text-right font-ui font-medium text-[var(--color-silver-400)] text-xs">
                      Actual
                    </th>
                    <th className="px-4 py-3 text-right font-ui font-medium text-[var(--color-silver-400)] text-xs">
                      Sugerido
                    </th>
                    <th className="px-4 py-3 text-right font-ui font-medium text-[var(--color-silver-400)] text-xs">
                      Δ
                    </th>
                    <th className="px-4 py-3 text-left font-ui font-medium text-[var(--color-silver-400)] text-xs">
                      Estado
                    </th>
                    <th className="px-4 py-3 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {pricings.map((p) => {
                    const isExpanded = expandedId === p.id;
                    const changePct = calculatePriceChangePct(
                      p.current_price,
                      p.suggested_price,
                    );

                    return (
                      <tr
                        key={p.id}
                        className={`border-t border-white/[0.06] cursor-pointer
                                    hover:bg-[var(--color-surface-1)] transition-colors
                                    ${isExpanded ? "bg-[var(--color-surface-1)]" : ""}`}
                        onClick={() => toggleExpand(p.id)}
                        role="row"
                        aria-expanded={isExpanded}
                      >
                        <td className="px-4 py-3 font-ui font-semibold text-[var(--color-silver-100)]">
                          {p.service_name}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant="default" size="sm">
                            {PRICING_STRATEGY_CONFIG[p.strategy]?.label ??
                              p.strategy}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[var(--color-silver-300)]">
                          {formatCurrency(p.current_price)}
                        </td>
                        <td className="px-4 py-3 text-right font-mono text-[var(--color-silver-300)]">
                          {formatCurrency(p.suggested_price)}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span
                            className="font-mono font-medium text-xs"
                            style={{
                              color:
                                changePct >= 0
                                  ? "var(--color-emerald-400)"
                                  : "var(--color-rose-400)",
                            }}
                          >
                            {formatPriceChangePct(
                              p.current_price,
                              p.suggested_price,
                            )}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              SUGGESTION_STATUS_CONFIG[p.status]?.variant ??
                              "default"
                            }
                            size="sm"
                          >
                            {SUGGESTION_STATUS_CONFIG[p.status]?.label ??
                              p.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {isExpanded ? (
                            <ChevronUp className="w-4 h-4 text-[var(--color-silver-500)]" />
                          ) : (
                            <ChevronDown className="w-4 h-4 text-[var(--color-silver-500)]" />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── Mobile cards ── */}
          <div className="sm:hidden space-y-3">
            {pricings.map((p) => (
              <PricingCard
                key={p.id}
                pricing={p}
                isExpanded={expandedId === p.id}
                onToggle={() => toggleExpand(p.id)}
                prefersReduced={prefersReduced}
              />
            ))}
          </div>
        </>
      )}

      {/* ── Expanded detail ── */}
      {expandedId && (
        <PricingDetailPanel
          pricing={pricings.find((p) => p.id === expandedId) ?? null}
          prefersReduced={prefersReduced}
        />
      )}

      {/* Keyframes */}
      {!prefersReduced && (
        <style>{`
          @keyframes slideDown {
            from { opacity: 0; transform: translateY(-8px); }
            to   { opacity: 1; transform: translateY(0); }
          }
          @keyframes fadeUp {
            from { opacity: 0; transform: translateY(16px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      )}
    </div>
  );
}

// ── Price Change Indicator ─────────────────────────────────

function PriceChangeIndicator({
  current,
  suggested,
}: {
  current: number;
  suggested: number;
}) {
  const pct = calculatePriceChangePct(current, suggested);
  const isUp = pct > 0;
  const isFlat = pct === 0;
  const Icon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;
  const color = isFlat
    ? "var(--color-silver-400)"
    : isUp
      ? "var(--color-emerald-400)"
      : "var(--color-rose-400)";

  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4" style={{ color }} />
      <span className="text-sm font-mono font-semibold" style={{ color }}>
        {formatPriceChangePct(current, suggested)}
      </span>
      <span className="text-xs text-[var(--color-silver-500)]">
        ({formatCurrency(current)} → {formatCurrency(suggested)})
      </span>
    </div>
  );
}

// ── Mobile Card ────────────────────────────────────────────

function PricingCard({ pricing: p, isExpanded, onToggle }: {
  pricing: PricingOptimization;
  isExpanded: boolean;
  onToggle: () => void;
  prefersReduced: boolean;
}) {
  const changePct = calculatePriceChangePct(p.current_price, p.suggested_price);
  const riskCfg = getRiskLevelConfig(p.risk_level);

  return (
    <Card className="p-4 space-y-3" onClick={onToggle}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <h4 className="font-ui font-semibold text-[var(--color-silver-100)] text-sm">
          {p.service_name}
        </h4>
        <Badge
          variant={SUGGESTION_STATUS_CONFIG[p.status]?.variant ?? "default"}
          size="sm"
        >
          {SUGGESTION_STATUS_CONFIG[p.status]?.label ?? p.status}
        </Badge>
      </div>

      {/* Prices */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] text-[var(--color-silver-500)]">Actual</p>
          <p className="text-sm font-mono text-[var(--color-silver-300)]">
            {formatCurrency(p.current_price)}
          </p>
        </div>
        <div className="text-center">
          <span
            className="font-mono font-semibold text-sm"
            style={{
              color:
                changePct >= 0
                  ? "var(--color-emerald-400)"
                  : "var(--color-rose-400)",
            }}
          >
            {formatPriceChangePct(p.current_price, p.suggested_price)}
          </span>
        </div>
        <div className="text-right">
          <p className="text-[10px] text-[var(--color-silver-500)]">Sugerido</p>
          <p className="text-sm font-mono text-[var(--color-silver-300)]">
            {formatCurrency(p.suggested_price)}
          </p>
        </div>
      </div>

      {/* Meta row */}
      <div className="flex items-center gap-2">
        <Badge variant="default" size="sm">
          {PRICING_STRATEGY_CONFIG[p.strategy]?.label ?? p.strategy}
        </Badge>
        <Badge variant={riskCfg.variant} size="sm">
          Riesgo: {riskCfg.label}
        </Badge>
      </div>

      {/* Expand */}
      {isExpanded && (
        <div className="pt-3 border-t border-white/[0.06] space-y-2">
          {p.reasoning && (
            <p className="text-xs text-[var(--color-silver-400)]">
              {p.reasoning}
            </p>
          )}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <span className="text-[var(--color-silver-500)]">Δ Revenue: </span>
              <span className="font-mono text-[var(--color-silver-300)]">
                {formatCurrency(p.expected_revenue_change)}
              </span>
            </div>
            <div>
              <span className="text-[var(--color-silver-500)]">Δ Demanda: </span>
              <span className="font-mono text-[var(--color-silver-300)]">
                {p.expected_demand_change >= 0 ? "+" : ""}
                {p.expected_demand_change.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-center">
        {isExpanded ? (
          <ChevronUp className="w-4 h-4 text-[var(--color-silver-500)]" />
        ) : (
          <ChevronDown className="w-4 h-4 text-[var(--color-silver-500)]" />
        )}
      </div>
    </Card>
  );
}

// ── Detail Panel ───────────────────────────────────────────

function PricingDetailPanel({
  pricing,
  prefersReduced,
}: {
  pricing: PricingOptimization | null;
  prefersReduced: boolean;
}) {
  if (!pricing) return null;

  const changePct = calculatePriceChangePct(
    pricing.current_price,
    pricing.suggested_price,
  );
  const riskCfg = getRiskLevelConfig(pricing.risk_level);

  return (
    <Card
      className={`p-5 space-y-4 ${
        prefersReduced
          ? ""
          : "opacity-0 animate-[slideDown_0.3s_ease_forwards]"
      }`}
      role="region"
      aria-label={`Detalle de ${pricing.service_name}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-ui font-semibold text-[var(--color-silver-100)]">
          {pricing.service_name}
        </h3>
        <Badge
          variant={
            SUGGESTION_STATUS_CONFIG[pricing.status]?.variant ?? "default"
          }
        >
          {SUGGESTION_STATUS_CONFIG[pricing.status]?.label ?? pricing.status}
        </Badge>
      </div>

      {/* Price comparison */}
      <div className="grid grid-cols-3 gap-4">
        <div className="text-center p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-0)] border border-white/[0.06]">
          <p className="text-[10px] text-[var(--color-silver-500)] mb-1">
            Precio Actual
          </p>
          <p className="text-lg font-mono font-bold text-[var(--color-silver-200)]">
            {formatCurrency(pricing.current_price)}
          </p>
        </div>
        <div className="text-center p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-0)] border border-white/[0.06]">
          <p className="text-[10px] text-[var(--color-silver-500)] mb-1">
            Cambio
          </p>
          <p
            className="text-lg font-mono font-bold"
            style={{
              color:
                changePct >= 0
                  ? "var(--color-emerald-400)"
                  : "var(--color-rose-400)",
            }}
          >
            {formatPriceChangePct(pricing.current_price, pricing.suggested_price)}
          </p>
        </div>
        <div className="text-center p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-0)] border border-white/[0.06]">
          <p className="text-[10px] text-[var(--color-silver-500)] mb-1">
            Precio Sugerido
          </p>
          <p className="text-lg font-mono font-bold text-[var(--color-silver-200)]">
            {formatCurrency(pricing.suggested_price)}
          </p>
        </div>
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <MetaCell
          label="Estrategia"
          value={
            PRICING_STRATEGY_CONFIG[pricing.strategy]?.label ??
            pricing.strategy
          }
        />
        <MetaCell
          label="Riesgo"
          value={riskCfg.label}
          color={riskCfg.color}
        />
        <MetaCell
          label="Δ Revenue"
          value={formatCurrency(pricing.expected_revenue_change)}
        />
        <MetaCell
          label="Δ Demanda"
          value={`${pricing.expected_demand_change >= 0 ? "+" : ""}${pricing.expected_demand_change.toFixed(1)}%`}
        />
      </div>

      {/* Reasoning */}
      {pricing.reasoning && (
        <div className="p-3 rounded-[var(--radius-md)] bg-[var(--color-surface-0)] border border-white/[0.06]">
          <p className="text-xs font-ui font-medium text-[var(--color-silver-400)] uppercase tracking-wider mb-1">
            Justificación
          </p>
          <p className="text-sm text-[var(--color-silver-300)]">
            {pricing.reasoning}
          </p>
        </div>
      )}

      {/* Dates */}
      <div className="flex justify-between text-[10px] text-[var(--color-silver-600)]">
        <span>
          Creado: {new Date(pricing.created_at).toLocaleDateString("es-CR")}
        </span>
        {pricing.updated_at && (
          <span>
            Actualizado:{" "}
            {new Date(pricing.updated_at).toLocaleDateString("es-CR")}
          </span>
        )}
      </div>
    </Card>
  );
}

// ── Meta Cell ──────────────────────────────────────────────

function MetaCell({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="p-2.5 rounded-[var(--radius-md)] bg-[var(--color-surface-1)] border border-white/[0.06]">
      <p className="text-[10px] text-[var(--color-silver-500)] mb-0.5">
        {label}
      </p>
      <p
        className="text-sm font-ui font-semibold truncate"
        style={{ color: color ?? "var(--color-silver-100)" }}
      >
        {value}
      </p>
    </div>
  );
}
