// ═══════════════════════════════════════════════════════════════════════
// Recommendations — Revenue Simulator (2027 NEW)
//
// "The Calculator" — Interactive what-if pricing analysis.
//
// User selects a service, adjusts price via slider.
// SVG demand curve responds in real-time:
//   - Main demand curve (cubic bézier approximation)
//   - Monte Carlo confidence band (shaded optimistic/pessimistic range)
//   - Revenue projection (area under curve highlighted)
//   - Revenue delta: +$X.XK or -$X.XK with trend
//
// Price elasticity drives curve shape (if available from data).
// Fallback: standard demand curve with configurable steepness.
//
// Glass namespace: .glass-rrs
// ═══════════════════════════════════════════════════════════════════════

import { useState, useMemo, useCallback } from "react";
import {
  DollarSign,
  Calculator,
  TrendingUp,
  TrendingDown,
  ArrowRightLeft,
  BarChart3,
  AlertTriangle,
} from "lucide-react";

import type { PricingOptimization } from "../types";
import {
  PRICING_STRATEGY_CONFIG,
  RISK_LEVEL_CONFIG,
  calculatePriceChangePct,
  formatPriceChangePct,
  isBlockingRisk,
} from "../types";

import "./RecRevenueSimulator.css";

// ═══════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════

interface RecRevenueSimulatorProps {
  pricings: PricingOptimization[];
  reducedMotion: boolean;
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════
// SVG CONSTANTS
// ═══════════════════════════════════════════════════════════════════════

const SVG_W = 400;
const SVG_H = 200;
const PADDING = { top: 20, right: 30, bottom: 30, left: 40 };
const PLOT_W = SVG_W - PADDING.left - PADDING.right;
const PLOT_H = SVG_H - PADDING.top - PADDING.bottom;

// ═══════════════════════════════════════════════════════════════════════
// DEMAND MODEL — Simplified price-demand curve
// ═══════════════════════════════════════════════════════════════════════

/**
 * Demand at a given price, relative to base.
 * Uses elasticity if available, otherwise assumes standard -1.5 elasticity.
 * Returns normalized demand (0-1 scale relative to base demand).
 */
function demandAtPrice(
  price: number,
  basePrice: number,
  elasticity: number = -1.5,
): number {
  if (basePrice <= 0 || price <= 0) return 0;
  const ratio = price / basePrice;
  // Q = Q_base * (P/P_base)^elasticity
  return Math.pow(ratio, elasticity);
}

/** Generate demand curve points for SVG path */
function generateDemandCurve(
  basePrice: number,
  elasticity: number,
  priceMin: number,
  priceMax: number,
  steps: number = 50,
): Array<{ price: number; demand: number }> {
  const points: Array<{ price: number; demand: number }> = [];
  for (let i = 0; i <= steps; i++) {
    const price = priceMin + ((priceMax - priceMin) * i) / steps;
    const demand = demandAtPrice(price, basePrice, elasticity);
    points.push({ price, demand });
  }
  return points;
}

/** Monte Carlo band: optimistic (higher demand) and pessimistic (lower) */
function generateConfidenceBand(
  basePrice: number,
  elasticity: number,
  priceMin: number,
  priceMax: number,
  uncertainty: number = 0.2,
  steps: number = 50,
): {
  optimistic: Array<{ price: number; demand: number }>;
  pessimistic: Array<{ price: number; demand: number }>;
} {
  const optimistic: Array<{ price: number; demand: number }> = [];
  const pessimistic: Array<{ price: number; demand: number }> = [];

  for (let i = 0; i <= steps; i++) {
    const price = priceMin + ((priceMax - priceMin) * i) / steps;
    const baseDemand = demandAtPrice(price, basePrice, elasticity);

    // Wider uncertainty at extreme prices
    const distFromBase = Math.abs(price - basePrice) / basePrice;
    const uncertaintyFactor = uncertainty * (1 + distFromBase * 2);

    optimistic.push({
      price,
      demand: Math.min(1.5, baseDemand * (1 + uncertaintyFactor)),
    });
    pessimistic.push({
      price,
      demand: Math.max(0, baseDemand * (1 - uncertaintyFactor)),
    });
  }

  return { optimistic, pessimistic };
}

// ═══════════════════════════════════════════════════════════════════════
// SVG PATH BUILDERS
// ═══════════════════════════════════════════════════════════════════════

function priceToX(price: number, priceMin: number, priceMax: number): number {
  return PADDING.left + ((price - priceMin) / (priceMax - priceMin)) * PLOT_W;
}

function demandToY(demand: number, maxDemand: number): number {
  return PADDING.top + PLOT_H - (demand / maxDemand) * PLOT_H;
}

function pointsToPath(
  points: Array<{ price: number; demand: number }>,
  priceMin: number,
  priceMax: number,
  maxDemand: number,
): string {
  if (points.length === 0) return "";
  const first = points[0];
  let d = `M ${priceToX(first.price, priceMin, priceMax)} ${demandToY(first.demand, maxDemand)}`;
  for (let i = 1; i < points.length; i++) {
    const p = points[i];
    d += ` L ${priceToX(p.price, priceMin, priceMax)} ${demandToY(p.demand, maxDemand)}`;
  }
  return d;
}

// ═══════════════════════════════════════════════════════════════════════
// REVENUE CALCULATOR
// ═══════════════════════════════════════════════════════════════════════

function calculateRevenue(price: number, demand: number, baseVolume: number = 100): number {
  return price * demand * baseVolume;
}

// ═══════════════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════════════

export function RecRevenueSimulator({ pricings, className }: RecRevenueSimulatorProps) {
  // ── Selected service ────────────────────────────────────────────────
  const [selectedIndex, setSelectedIndex] = useState(0);
  const selectedPricing = pricings[selectedIndex] ?? pricings[0];

  // ── Slider state (price as ratio of current) ───────────────────────
  const [sliderValue, setSliderValue] = useState(1.0); // 1.0 = current price

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSliderValue(parseFloat(e.target.value));
    },
    [],
  );

  // ── Derived values ──────────────────────────────────────────────────
  const simulatedPrice = useMemo(() => {
    if (!selectedPricing) return 0;
    return Math.round(selectedPricing.current_price * sliderValue * 100) / 100;
  }, [selectedPricing, sliderValue]);

  const priceChangePct = useMemo(() => {
    if (!selectedPricing) return 0;
    return calculatePriceChangePct(
      selectedPricing.current_price,
      simulatedPrice,
    );
  }, [selectedPricing, simulatedPrice]);

  const elasticity = useMemo(
    () => selectedPricing?.demand_elasticity ?? -1.5,
    [selectedPricing],
  );

  // ── Demand at simulated price ───────────────────────────────────────
  const currentDemand = useMemo(() => {
    if (!selectedPricing) return 0;
    return demandAtPrice(
      simulatedPrice,
      selectedPricing.current_price,
      elasticity,
    );
  }, [selectedPricing, simulatedPrice, elasticity]);

  // ── Revenue projections ─────────────────────────────────────────────
  const revenue = useMemo(() => {
    if (!selectedPricing) return { current: 0, simulated: 0, delta: 0 };
    const baseVolume = 100;
    const currentRev = calculateRevenue(
      selectedPricing.current_price,
      1,
      baseVolume,
    );
    const simRev = calculateRevenue(simulatedPrice, currentDemand, baseVolume);
    return {
      current: currentRev,
      simulated: simRev,
      delta: simRev - currentRev,
    };
  }, [selectedPricing, simulatedPrice, currentDemand]);

  // ── SVG curve data ──────────────────────────────────────────────────
  const priceRange = useMemo(() => {
    if (!selectedPricing) return { min: 0, max: 100 };
    const current = selectedPricing.current_price;
    return {
      min: Math.max(1, current * 0.3),
      max: current * 2.5,
    };
  }, [selectedPricing]);

  const demandCurve = useMemo(() => {
    if (!selectedPricing) return [];
    return generateDemandCurve(
      selectedPricing.current_price,
      elasticity,
      priceRange.min,
      priceRange.max,
    );
  }, [selectedPricing, elasticity, priceRange]);

  const confidenceBand = useMemo(() => {
    if (!selectedPricing) return { optimistic: [], pessimistic: [] };
    return generateConfidenceBand(
      selectedPricing.current_price,
      elasticity,
      priceRange.min,
      priceRange.max,
    );
  }, [selectedPricing, elasticity, priceRange]);

  const maxDemand = useMemo(() => {
    const allDemands = [
      ...demandCurve.map((p) => p.demand),
      ...confidenceBand.optimistic.map((p) => p.demand),
    ];
    return Math.max(1, ...allDemands) * 1.1;
  }, [demandCurve, confidenceBand]);

  // ── SVG paths ───────────────────────────────────────────────────────
  const demandPath = useMemo(
    () => pointsToPath(demandCurve, priceRange.min, priceRange.max, maxDemand),
    [demandCurve, priceRange, maxDemand],
  );

  const bandPath = useMemo(() => {
    if (confidenceBand.optimistic.length === 0) return "";
    // Build area between optimistic (top) and pessimistic (bottom)
    const topPath = pointsToPath(
      confidenceBand.optimistic,
      priceRange.min,
      priceRange.max,
      maxDemand,
    );
    const bottomReversed = [...confidenceBand.pessimistic].reverse();
    pointsToPath(
            bottomReversed,
            priceRange.min,
            priceRange.max,
            maxDemand,
          );
    return `${topPath} L ${bottomReversed
      .map(
        (p) =>
          `${priceToX(p.price, priceRange.min, priceRange.max)} ${demandToY(p.demand, maxDemand)}`,
      )
      .join(" L ")} Z`;
  }, [confidenceBand, priceRange, maxDemand]);

  // ── Current price marker X ──────────────────────────────────────────
  const currentPriceX = useMemo(
    () =>
      selectedPricing
        ? priceToX(
            selectedPricing.current_price,
            priceRange.min,
            priceRange.max,
          )
        : 0,
    [selectedPricing, priceRange],
  );

  const simulatedPriceX = useMemo(
    () => priceToX(simulatedPrice, priceRange.min, priceRange.max),
    [simulatedPrice, priceRange],
  );

  const simulatedDemandY = useMemo(
    () => demandToY(currentDemand, maxDemand),
    [currentDemand, maxDemand],
  );

  // ── Demand shift label ──────────────────────────────────────────────
  const demandShift = useMemo(() => {
    const changePct = (currentDemand - 1) * 100;
    if (changePct > 15) return { label: "Alza fuerte", color: "var(--color-emerald-400)" };
    if (changePct > 5) return { label: "Alza moderada", color: "var(--color-emerald-400)" };
    if (changePct > -5) return { label: "Estable", color: "var(--color-silver-400)" };
    if (changePct > -15) return { label: "Baja moderada", color: "var(--color-amber-400)" };
    return { label: "Baja fuerte", color: "var(--color-rose-400)" };
  }, [currentDemand]);

  // ── Empty state ─────────────────────────────────────────────────────
  if (pricings.length === 0 || !selectedPricing) {
    return (
      <div className={`glass-rrs ${className ?? ""}`} data-empty>
        <div className="rrs-header">
          <Calculator size={16} aria-hidden="true" className="rrs-header-icon" />
          <span className="rrs-header-title">Simulador de Revenue</span>
        </div>
        <div className="rrs-empty">
          <DollarSign size={32} aria-hidden="true" className="rrs-empty-icon" />
          <p className="rrs-empty-text">
            Sin datos de pricing disponibles. Necesitás optimizaciones de
            precios cargadas para simular escenarios.
          </p>
        </div>
      </div>
    );
  }

  const riskConfig = RISK_LEVEL_CONFIG[selectedPricing.risk_level];
  const strategyConfig = PRICING_STRATEGY_CONFIG[selectedPricing.strategy];

  return (
    <div className={`glass-rrs ${className ?? ""}`}>
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="rrs-header">
        <Calculator size={16} aria-hidden="true" className="rrs-header-icon" />
        <span className="rrs-header-title">Simulador de Revenue</span>
        <span className="rrs-header-strategy">{strategyConfig?.label ?? selectedPricing.strategy}</span>
      </div>

      {/* ── Service selector ──────────────────────────────────────────── */}
      <div className="rrs-selector">
        {pricings.slice(0, 5).map((p, idx) => (
          <button
            key={p.id}
            type="button"
            className="rrs-selector-pill"
            data-active={idx === selectedIndex ? "" : undefined}
            onClick={() => {
              setSelectedIndex(idx);
              setSliderValue(1.0);
            }}
          >
            <span className="rrs-selector-name">{p.service_name}</span>
            <span className="rrs-selector-price">
              ${p.current_price.toFixed(0)}
            </span>
          </button>
        ))}
      </div>

      {/* ── SVG Demand Curve ──────────────────────────────────────────── */}
      <div className="rrs-chart-container">
        <svg
          className="rrs-chart-svg"
          viewBox={`0 0 ${SVG_W} ${SVG_H}`}
          role="img"
          aria-label={`Curva de demanda para ${selectedPricing.service_name}`}
        >
          {/* Y axis labels */}
          <text x={PADDING.left - 8} y={PADDING.top + 4} className="rrs-axis-label" textAnchor="end">
            Alta
          </text>
          <text x={PADDING.left - 8} y={PADDING.top + PLOT_H} className="rrs-axis-label" textAnchor="end">
            Baja
          </text>

          {/* X axis labels */}
          <text x={PADDING.left} y={SVG_H - 6} className="rrs-axis-label">
            ${Math.round(priceRange.min)}
          </text>
          <text x={PADDING.left + PLOT_W} y={SVG_H - 6} className="rrs-axis-label" textAnchor="end">
            ${Math.round(priceRange.max)}
          </text>

          {/* Confidence band */}
          {bandPath && (
            <path d={bandPath} className="rrs-band" />
          )}

          {/* Demand curve */}
          <path d={demandPath} className="rrs-curve" fill="none" />

          {/* Current price vertical line */}
          <line
            x1={currentPriceX}
            y1={PADDING.top}
            x2={currentPriceX}
            y2={PADDING.top + PLOT_H}
            className="rrs-current-line"
          />
          <text
            x={currentPriceX}
            y={PADDING.top - 6}
            className="rrs-marker-label"
            textAnchor="middle"
          >
            Actual
          </text>

          {/* Simulated price marker */}
          <line
            x1={simulatedPriceX}
            y1={PADDING.top}
            x2={simulatedPriceX}
            y2={PADDING.top + PLOT_H}
            className="rrs-sim-line"
          />

          {/* Demand point at simulated price */}
          <circle
            cx={simulatedPriceX}
            cy={simulatedDemandY}
            r={5}
            className="rrs-demand-point"
          />

          {/* Simulated price label */}
          <text
            x={simulatedPriceX}
            y={PADDING.top - 6}
            className="rrs-sim-label"
            textAnchor="middle"
          >
            ${Math.round(simulatedPrice)}
          </text>
        </svg>
      </div>

      {/* ── Price slider ──────────────────────────────────────────────── */}
      <div className="rrs-slider-section">
        <div className="rrs-slider-labels">
          <span className="rrs-slider-min">
            ${Math.round(selectedPricing.current_price * 0.3)}
          </span>
          <span className="rrs-slider-current">
            ${selectedPricing.current_price.toFixed(0)} (actual)
          </span>
          <span className="rrs-slider-max">
            ${Math.round(selectedPricing.current_price * 2.5)}
          </span>
        </div>
        <input
          type="range"
          className="rrs-slider"
          min={0.3}
          max={2.5}
          step={0.01}
          value={sliderValue}
          onChange={handleSliderChange}
          aria-label={`Precio simulado para ${selectedPricing.service_name}`}
        />
        <div className="rrs-slider-readout">
          <DollarSign size={14} aria-hidden="true" />
          <span className="rrs-readout-price">
            ${simulatedPrice.toFixed(2)}
          </span>
          <span
            className="rrs-readout-change"
            data-positive={priceChangePct >= 0 ? "" : undefined}
          >
            {priceChangePct >= 0 ? "+" : ""}
            {priceChangePct.toFixed(1)}%
          </span>
        </div>
      </div>

      {/* ── Projection cards ──────────────────────────────────────────── */}
      <div className="rrs-projections">
        <div className="rrs-proj-card">
          <div className="rrs-proj-icon-wrap">
            <ArrowRightLeft size={14} aria-hidden="true" />
          </div>
          <div className="rrs-proj-content">
            <span className="rrs-proj-label">Cambio de precio</span>
            <span className="rrs-proj-value">
              {formatPriceChangePct(selectedPricing.current_price, simulatedPrice)}
            </span>
          </div>
        </div>

        <div className="rrs-proj-card">
          <div className="rrs-proj-icon-wrap" data-shift={demandShift.label}>
            {currentDemand >= 1 ? (
              <TrendingUp size={14} aria-hidden="true" />
            ) : (
              <TrendingDown size={14} aria-hidden="true" />
            )}
          </div>
          <div className="rrs-proj-content">
            <span className="rrs-proj-label">Demanda estimada</span>
            <span className="rrs-proj-value" style={{ color: demandShift.color } as React.CSSProperties}>
              {(currentDemand * 100).toFixed(0)}% — {demandShift.label}
            </span>
          </div>
        </div>

        <div className="rrs-proj-card">
          <div className="rrs-proj-icon-wrap">
            <BarChart3 size={14} aria-hidden="true" />
          </div>
          <div className="rrs-proj-content">
            <span className="rrs-proj-label">Revenue Δ</span>
            <span
              className="rrs-proj-value rrs-proj-revenue"
              data-positive={revenue.delta >= 0 ? "" : undefined}
            >
              {revenue.delta >= 0 ? "+" : ""}${(Math.abs(revenue.delta) / 1000).toFixed(1)}K
            </span>
          </div>
        </div>

        {isBlockingRisk(selectedPricing.risk_level) && (
          <div className="rrs-proj-card rrs-proj-card--risk">
            <div className="rrs-proj-icon-wrap" data-risk={selectedPricing.risk_level}>
              <AlertTriangle size={14} aria-hidden="true" />
            </div>
            <div className="rrs-proj-content">
              <span className="rrs-proj-label">Riesgo</span>
              <span className="rrs-proj-value" style={{ color: riskConfig?.color } as React.CSSProperties}>
                {riskConfig?.label ?? selectedPricing.risk_level} — aprobación requerida
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}